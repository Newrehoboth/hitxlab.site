import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Package, Play, Pause, Download, ShoppingCart, ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";
import { fmtNaira } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/sample-pack/$id")({
  component: SamplePackDetail,
});

interface SamplePack {
  id: string;
  producer_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  preview_url: string | null;
  zip_url: string;
  price: number;
  is_published: boolean;
  created_at: string;
  producer_name?: string;
  producer_username?: string;
  producer_verified?: boolean;
}

function SamplePackDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [pack, setPack] = useState<SamplePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadPack();
  }, [id]);

  const loadPack = async () => {
    setLoading(true);
    try {
      const { data: packData, error } = await (supabase as any)
        .from("sample_packs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (packData) {
        // Get producer info
        const { data: profile } = await supabase
          .from("producer_profiles")
          .select("producer_name, username, user_id")
          .eq("user_id", packData.producer_id)
          .single();

        const enrichedPack = {
          ...packData,
          producer_name: profile?.producer_name || "Producer",
          producer_username: profile?.username || "",
          producer_verified: true,
        };

        setPack(enrichedPack);

        // Load cover image
        if (packData.cover_url) {
          if (packData.cover_url.startsWith("http")) {
            setCoverUrl(packData.cover_url);
          } else {
            const { data } = await supabase.storage
              .from("sample-pack-covers")
              .createSignedUrl(packData.cover_url, 3600);
            if (data?.signedUrl) setCoverUrl(data.signedUrl);
          }
        }
      }
    } catch (err) {
      console.error("Error loading sample pack:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = async () => {
    if (!pack?.preview_url) return;

    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (audio) {
      audio.pause();
    }

    try {
      const { data } = await supabase.storage
        .from("sample-pack-previews")
        .createSignedUrl(pack.preview_url, 3600);

      if (data?.signedUrl) {
        const newAudio = new Audio(data.signedUrl);
        newAudio.onended = () => setIsPlaying(false);
        newAudio.play();
        setAudio(newAudio);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Error playing preview:", err);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      nav({ to: "/auth", search: { mode: "signin" } });
      return;
    }

    if (!pack) return;

    setPurchasing(true);

    try {
      // Load Paystack script
      const loadPaystackScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
          if ((window as any).PaystackPop) return resolve(true);
          const script = document.createElement("script");
          script.src = "https://js.paystack.co/v1/inline.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const loaded = await loadPaystackScript();
      if (!loaded) {
        alert("Payment system could not be loaded. Please try again.");
        setPurchasing(false);
        return;
      }

      // Get producer's subaccount for split payment
      let subaccountCode: string | null = null;
      try {
        const { data: subaccountData } = await (supabase as any)
          .rpc("get_subaccount_for_sample_pack", { pack_id: pack.id });
        subaccountCode = subaccountData;
      } catch (err) {
        console.warn("Could not fetch subaccount:", err);
      }

      const paystackKey = "pk_live_e9bf7cfed2bff11590869169b377d641f6932a5a";

      const config: any = {
        key: paystackKey,
        email: user.email || "buyer@octave.com",
        amount: Math.round(pack.price * 100), // Convert to kobo
        currency: "NGN",
        ref: `spack_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        metadata: {
          custom_fields: [
            {
              display_name: "Sample Pack",
              variable_name: "sample_pack_title",
              value: pack.title,
            },
            {
              display_name: "Pack ID",
              variable_name: "sample_pack_id",
              value: pack.id,
            },
          ],
        },
        onClose: function () {
          console.log("Payment popup closed");
          setPurchasing(false);
        },
        callback: function (response: any) {
          console.log("Payment successful:", response);
          
          // Handle async operations without making callback async
          const recordPurchase = async () => {
            try {
              // Record purchase in database
              const platformCommission = pack.price * 0.1;
              const producerEarnings = pack.price * 0.9;

              const { error: purchaseError } = await (supabase as any)
                .from("sample_pack_purchases")
                .insert({
                  sample_pack_id: pack.id,
                  buyer_id: user.id,
                  producer_id: pack.producer_id,
                  gross_amount: pack.price,
                  platform_commission: platformCommission,
                  producer_earnings: producerEarnings,
                  payment_reference: response.reference,
                  payment_status: "completed",
                });

              if (purchaseError) throw purchaseError;

              alert(`Purchase successful! You can now download "${pack.title}"`);
              setPurchasing(false);
              // Optionally redirect to download page
              // nav({ to: "/dashboard/library" });
            } catch (err: any) {
              console.error("Error recording purchase:", err);
              alert("Payment successful but there was an error. Please contact support with reference: " + response.reference);
              setPurchasing(false);
            }
          };
          
          recordPurchase();
        },
      };

      // Add subaccount for 10%/90% split
      if (subaccountCode) {
        config.subaccount = subaccountCode;
        console.log("[Sample Pack] Applying 10%/90% split with subaccount:", subaccountCode);
      } else {
        console.warn("[Sample Pack] No subaccount found - payment will NOT be split automatically");
      }

      const handler = (window as any).PaystackPop.setup(config);
      handler.openIframe();
    } catch (err: any) {
      console.error("Purchase error:", err);
      alert("Purchase failed: " + (err.message || "Unknown error"));
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <CartDrawer />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </main>
      </>
    );
  }

  if (!pack) {
    return (
      <>
        <Navbar />
        <CartDrawer />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-bold">Sample pack not found</h2>
            <button
              onClick={() => nav({ to: "/sample-packs" })}
              className="mt-4 text-sm text-red-500 hover:underline"
            >
              Browse all sample packs
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <CartDrawer />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => nav({ to: "/sample-packs" })}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sample Packs
          </button>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left: Cover Image */}
            <div className="relative">
              <div className="sticky top-24">
                <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={pack.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-20 w-20 text-muted-foreground" />
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  {pack.preview_url && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100"
                    >
                      <span className="grid h-20 w-20 place-items-center rounded-full bg-red-500 shadow-xl transition hover:scale-110">
                        {isPlaying ? (
                          <Pause className="h-8 w-8 text-black" fill="black" />
                        ) : (
                          <Play className="h-8 w-8 text-black" fill="black" />
                        )}
                      </span>
                    </button>
                  )}
                </div>

                {pack.preview_url && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Click to preview audio
                  </p>
                )}
              </div>
            </div>

            {/* Right: Details */}
            <div className="flex flex-col">
              {/* Header */}
              <div className="mb-6">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal">
                  <Package className="h-3.5 w-3.5" />
                  Sample Pack
                </div>

                <h1 className="font-display text-4xl font-bold leading-tight">
                  {pack.title}
                </h1>

                <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                  <span>by</span>
                  <button
                    onClick={() =>
                      pack.producer_username &&
                      nav({
                        to: "/producer/$username",
                        params: { username: pack.producer_username },
                      })
                    }
                    className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-red-500"
                  >
                    {pack.producer_name}
                    {pack.producer_verified && (
                      <BadgeCheck className="h-4 w-4 text-teal" />
                    )}
                  </button>
                </div>
              </div>

              {/* Description */}
              {pack.description && (
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    About this pack
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {pack.description}
                  </p>
                </div>
              )}

              {/* Price & Purchase */}
              <div className="mt-auto rounded-2xl border border-white/10 bg-surface/50 p-6">
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Price
                  </div>
                  <div className="font-display text-4xl font-bold text-red-500">
                    {fmtNaira(pack.price)}
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                  {purchasing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      Buy Now
                    </>
                  )}
                </button>

                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Instant download</span>
                    <Download className="h-4 w-4 text-teal" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>High-quality samples</span>
                    <Package className="h-4 w-4 text-teal" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Commercial use allowed</span>
                    <BadgeCheck className="h-4 w-4 text-teal" />
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-xs text-red-500">
                  <strong>What's included:</strong> All samples in high-quality WAV
                  format. Perfect for your next production.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

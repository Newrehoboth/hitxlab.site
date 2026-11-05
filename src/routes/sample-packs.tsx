import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Package, Play, Pause, Download, ShoppingCart, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";
import { fmtNaira } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/sample-packs")({
  head: () => ({
    meta: [
      { title: "Sample Packs · HITXLAB" },
      { name: "description", content: "Browse and buy premium sample packs from top producers." },
    ],
  }),
  component: SamplePacksPage,
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
}

function SamplePacksPage() {
  const { user } = useAuth();
  const [packs, setPacks] = useState<SamplePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    setLoading(true);
    try {
      // Get all published sample packs
      const { data: packsData, error: packsError } = await supabase
        .from("sample_packs")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (packsError) throw packsError;

      if (packsData && packsData.length > 0) {
        // Get producer names
        const producerIds = [...new Set(packsData.map((p: any) => p.producer_id))];
        const { data: profiles } = await supabase
          .from("producer_profiles")
          .select("user_id, producer_name")
          .in("user_id", producerIds);

        const profileMap = new Map(
          profiles?.map((p: any) => [p.user_id, p.producer_name]) || []
        );

        const enrichedPacks = packsData.map((pack: any) => ({
          ...pack,
          producer_name: profileMap.get(pack.producer_id) || "Producer",
        }));

        setPacks(enrichedPacks);
      }
    } catch (err) {
      console.error("Error loading sample packs:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = async (pack: SamplePack) => {
    if (!pack.preview_url) return;

    if (playingId === pack.id && audio) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    if (audio) {
      audio.pause();
    }

    try {
      // Get signed URL for preview
      const { data } = await supabase.storage
        .from("sample-pack-previews")
        .createSignedUrl(pack.preview_url, 3600);

      if (data?.signedUrl) {
        const newAudio = new Audio(data.signedUrl);
        newAudio.onended = () => setPlayingId(null);
        newAudio.play();
        setAudio(newAudio);
        setPlayingId(pack.id);
      }
    } catch (err) {
      console.error("Error playing preview:", err);
    }
  };

  const purchasePack = async (pack: SamplePack) => {
    if (!user) {
      alert("Please sign in to purchase sample packs");
      return;
    }

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
              // Optionally redirect to library or download page
              // nav({ to: "/dashboard/library" });
            } catch (err: any) {
              console.error("Error recording purchase:", err);
              alert("Payment successful but there was an error. Please contact support with reference: " + response.reference);
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
    }
  };

  return (
    <>
      <Navbar />
      <CartDrawer />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-red-500">
              <Package className="h-6 w-6" />
              <span className="text-sm font-bold uppercase tracking-wider">Sample Packs</span>
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
              Premium Sound Collections
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              High-quality drums, loops, and one-shots from top producers
            </p>
          </div>

          {/* Packs Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            </div>
          ) : packs.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-surface/50 p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-display text-xl font-bold">No sample packs yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back soon for premium sound collections
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {packs.map((pack) => (
                <SamplePackCard
                  key={pack.id}
                  pack={pack}
                  isPlaying={playingId === pack.id}
                  onTogglePlay={() => togglePlay(pack)}
                  onPurchase={() => purchasePack(pack)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function SamplePackCard({
  pack,
  isPlaying,
  onTogglePlay,
  onPurchase,
}: {
  pack: SamplePack;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPurchase: () => void;
}) {
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (pack.cover_url) {
      if (pack.cover_url.startsWith("http")) {
        setCoverUrl(pack.cover_url);
      } else {
        supabase.storage
          .from("sample-pack-covers")
          .createSignedUrl(pack.cover_url, 3600)
          .then(({ data }) => {
            if (data?.signedUrl) {
              setCoverUrl(data.signedUrl);
            }
          });
      }
    }
  }, [pack.cover_url]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-surface/50 transition hover:border-red-500/40">
      {/* Cover Image */}
      <Link
        to="/sample-pack/$id"
        params={{ id: pack.id }}
        className="block"
      >
        <div className="relative aspect-square overflow-hidden bg-white/5">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={pack.title}
              className={`h-full w-full object-cover transition group-hover:scale-105 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Play Button Overlay */}
          {pack.preview_url && coverUrl && imageLoaded && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onTogglePlay();
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-red-500/90 shadow-xl transition hover:scale-110">
                {isPlaying ? (
                  <Pause className="h-6 w-6 text-black" fill="black" />
                ) : (
                  <Play className="h-6 w-6 text-black" fill="black" />
                )}
              </span>
            </button>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link
          to="/sample-pack/$id"
          params={{ id: pack.id }}
          className="block"
        >
          <h3 className="font-semibold line-clamp-1 hover:text-red-500 transition">
            {pack.title}
          </h3>
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">by {pack.producer_name}</p>
        
        {pack.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {pack.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="font-display text-xl font-bold text-red-500">
            {fmtNaira(pack.price)}
          </span>
          <button
            onClick={onPurchase}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-sm font-semibold text-black transition hover:brightness-110"
          >
            <ShoppingCart className="h-4 w-4" />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

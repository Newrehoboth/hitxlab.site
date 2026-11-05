import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Music4,
  BookOpen,
  ChevronRight,
  FileText,
  Headphones,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";
import {
  getIncludedAssets,
  assetLabel,
  assetIcon,
  downloadLicenseAgreement,
  triggerFileDownload,
  validateOwnershipAndGetDownloadUrl,
} from "@/lib/purchase-service";
import { fmtNaira } from "@/lib/currency";

const searchSchema = z.object({
  purchaseId: z.string().optional(),
  beatId: z.string().optional(),
  beatTitle: z.string().optional(),
  producerName: z.string().optional(),
  licenseName: z.string().optional(),
  licenseType: z.string().optional(),
  price: z.string().optional(),
});

export const Route = createFileRoute("/purchase/success")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Purchase Successful – HITXLAB" },
      { name: "description", content: "Your beat purchase was successful. Download your files now." },
    ],
  }),
  component: PurchaseSuccessPage,
});

function assetButtonStyle(type: string) {
  const styles: Record<string, string> = {
    mp3: "bg-teal/15 border-teal/30 text-teal hover:bg-teal/25",
    wav: "bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/25",
    stems: "bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25",
    pdf: "bg-white/10 border-white/20 text-white hover:bg-white/15",
  };
  return styles[type] ?? "bg-white/10 border-white/20 text-white hover:bg-white/15";
}

function PurchaseSuccessPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const nav = useNavigate();

  const [purchaseData, setPurchaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const purchaseId = search.purchaseId;
  const beatTitle = search.beatTitle ?? "Beat";
  const producerName = search.producerName ?? "Producer";
  const licenseName = search.licenseName ?? "License";
  const licenseType = search.licenseType ?? "basic";
  const price = parseFloat(search.price ?? "0");

  const includedAssets = getIncludedAssets(licenseType);

  useEffect(() => {
    if (!user) {
      nav({ to: "/auth", search: { mode: "signin" } });
      return;
    }

    const load = async () => {
      let foundId = purchaseId;

      if (foundId) {
        // 1. Try purchases table
        const { data: pData } = await (supabase as any)
          .from("purchases")
          .select("*, purchase_items(*)")
          .eq("id", foundId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (pData) {
          setPurchaseData(pData);
          setLoading(false);
          return;
        }

        // 2. Try orders table
        const { data: oData } = await (supabase as any)
          .from("orders")
          .select("*, beats(title, cover_url, producer_id)")
          .eq("id", foundId)
          .eq("buyer_id", user.id)
          .maybeSingle();

        if (oData) {
          // Fetch producer profile name
          let pName = producerName;
          if (oData.producer_id) {
            const { data: prof } = await (supabase as any)
              .from("producer_profiles")
              .select("producer_name")
              .eq("user_id", oData.producer_id)
              .maybeSingle();
            if (prof?.producer_name) pName = prof.producer_name;
          }

          setPurchaseData({
            id: oData.id,
            user_id: oData.buyer_id,
            license_name: oData.license_name,
            amount: oData.price,
            purchase_date: oData.created_at,
            purchase_items: [
              {
                beat_title: oData.beats?.title || beatTitle,
                producer_name: pName,
                license_type: oData.license_type,
                license_name: oData.license_name,
                price: oData.price,
                contract_snapshot: oData.contract_snapshot,
              },
            ],
          });
          setLoading(false);
          return;
        }
      }

      // 3. If purchaseId was missing or not found, try user's latest order
      const { data: latestOrder } = await (supabase as any)
        .from("orders")
        .select("*, beats(title, cover_url, producer_id)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOrder) {
        let pName = producerName;
        if (latestOrder.producer_id) {
          const { data: prof } = await (supabase as any)
            .from("producer_profiles")
            .select("producer_name")
            .eq("user_id", latestOrder.producer_id)
            .maybeSingle();
          if (prof?.producer_name) pName = prof.producer_name;
        }

        setPurchaseData({
          id: latestOrder.id,
          user_id: latestOrder.buyer_id,
          license_name: latestOrder.license_name,
          amount: latestOrder.price,
          purchase_date: latestOrder.created_at,
          purchase_items: [
            {
              beat_title: latestOrder.beats?.title || beatTitle,
              producer_name: pName,
              license_type: latestOrder.license_type,
              license_name: latestOrder.license_name,
              price: latestOrder.price,
              contract_snapshot: latestOrder.contract_snapshot,
            },
          ],
        });
      }
      setLoading(false);
    };
    load();
  }, [user, purchaseId]);

  const handleDownload = async (assetType: string) => {
    if (!user) return;
    const targetId = purchaseData?.id || purchaseId || "";
    setDownloading(assetType);

    try {
      if (assetType === "pdf") {
        downloadLicenseAgreement({
          buyerName: user.name,
          beatTitle: purchaseData?.purchase_items?.[0]?.beat_title ?? beatTitle,
          producerName: purchaseData?.purchase_items?.[0]?.producer_name ?? producerName,
          licenseName: purchaseData?.license_name ?? licenseName,
          price: purchaseData?.amount ?? price,
          purchaseDate: new Date(purchaseData?.purchase_date ?? Date.now()).toLocaleDateString(),
          contract: purchaseData?.purchase_items?.[0]?.contract_snapshot ?? "",
        });
      } else {
        const { url, error } = await validateOwnershipAndGetDownloadUrl(user.id, targetId, assetType);
        if (error) {
          alert(error);
          return;
        }
        if (url) {
          const ext = assetType === "stems" ? "zip" : assetType;
          await triggerFileDownload(url, actualBeatTitle, ext);
        }
      }
    } finally {
      setDownloading(null);
    }
  };

  const actualBeatTitle = purchaseData?.purchase_items?.[0]?.beat_title ?? beatTitle;
  const actualProducer = purchaseData?.purchase_items?.[0]?.producer_name ?? producerName;
  const actualLicense = purchaseData?.license_name ?? licenseName;
  const actualAmount = purchaseData?.amount ?? price;
  const purchaseDate = purchaseData?.purchase_date
    ? new Date(purchaseData.purchase_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16 pb-32">
      {/* Confetti-like animated glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal/8 blur-[120px]" />
        <div className="absolute right-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-red-500/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Success icon */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-teal/15 ring-1 ring-teal/30 animate-[pulse_2s_ease-in-out_infinite]">
            <CheckCircle2 className="h-10 w-10 text-teal" />
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground">Purchase Successful 🎉</h1>
          <p className="mt-2 text-muted-foreground">Your files are ready to download.</p>
        </div>

        {/* Beat details card */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-surface/60 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Music4 className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="truncate font-display text-xl font-bold">{actualBeatTitle}</h2>
              <div className="mt-0.5 text-sm text-muted-foreground">Produced by {actualProducer}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-500">
                  {actualLicense}
                </span>
                <span className="text-xs text-muted-foreground">{purchaseDate}</span>
                {purchaseId && (
                  <span className="text-[10px] text-muted-foreground/60 font-mono">#{purchaseId.split("-")[0]}</span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-xl font-bold text-red-500">{fmtNaira(actualAmount)}</div>
              <div className="text-xs text-teal flex items-center gap-1 justify-end mt-0.5">
                <CheckCircle2 className="h-3 w-3" /> Paid
              </div>
            </div>
          </div>
        </div>

        {/* Download buttons */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-surface/60 p-5 backdrop-blur-sm">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">
            Your Files — {includedAssets.length} format{includedAssets.length !== 1 ? "s" : ""} included
          </h3>
          <div className="grid gap-2.5">
            {includedAssets.map((assetType) => (
              <button
                key={assetType}
                onClick={() => handleDownload(assetType)}
                disabled={downloading === assetType}
                className={`flex h-12 items-center gap-3 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-50 ${assetButtonStyle(assetType)}`}
              >
                <span className="text-base">{assetIcon(assetType)}</span>
                <span className="flex-1 text-left">
                  {downloading === assetType ? "Downloading…" : assetLabel(assetType)}
                </span>
                <Download className="h-4 w-4 opacity-70" />
              </button>
            ))}

            {/* Show locked assets */}
            {["mp3", "wav", "stems", "pdf"]
              .filter((a) => !includedAssets.includes(a))
              .map((assetType) => (
                <div
                  key={assetType}
                  className="flex h-12 items-center gap-3 rounded-xl border border-white/5 px-4 opacity-30 cursor-not-allowed"
                >
                  <span className="text-base">{assetIcon(assetType)}</span>
                  <span className="flex-1 text-left text-sm font-semibold text-muted-foreground">
                    {assetLabel(assetType)} <span className="text-[10px]">(not included in {actualLicense})</span>
                  </span>
                </div>
              ))}
          </div>

          {!purchaseId && (
            <p className="mt-3 text-xs text-muted-foreground text-center">
              Purchase ID not found. Access your files from your Library.
            </p>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard/library"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] font-semibold text-black shadow-[0_8px_24px_-8px_oklch(0.7_0.17_55/0.5)] transition hover:brightness-105"
          >
            <BookOpen className="h-4 w-4" />
            Go to My Library
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/browse"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-foreground transition hover:bg-white/10"
          >
            <Headphones className="h-4 w-4" />
            Continue Browsing Beats
          </Link>
        </div>

        {/* License included summary */}
        <div className="mt-6 rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            {actualLicense} Includes
          </div>
          <div className="flex flex-wrap gap-2">
            {includedAssets.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-md bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal">
                {assetIcon(a)} {a.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

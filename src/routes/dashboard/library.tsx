import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Download,
  Music4,
  FileText,
  Search,
  SlidersHorizontal,
  Play,
  Pause,
  CheckCircle2,
  ShoppingBag,
  Headphones,
  Layers,
} from "lucide-react";
import { useAuth, usePlayer } from "@/lib/store";
import { fmtNaira } from "@/lib/currency";
import {
  fetchUserLibrary,
  getIncludedAssets,
  assetLabel,
  assetIcon,
  downloadLicenseAgreement,
  triggerFileDownload,
  validateOwnershipAndGetDownloadUrl,
  type LibraryItem,
} from "@/lib/purchase-service";
import { Navbar } from "@/components/Navbar";
import { CartDrawer } from "@/components/CartDrawer";
import type { Beat } from "@/data/beats";

export const Route = createFileRoute("/dashboard/library")({
  head: () => ({
    meta: [
      { title: "My Library – HITXLAB" },
      { name: "description", content: "Download and manage all your purchased beats and licenses." },
    ],
  }),
  component: LibraryPage,
});

type SortKey = "newest" | "oldest" | "az" | "za" | "price_high" | "price_low";

function badgeStyle(licenseType: string) {
  const map: Record<string, string> = {
    basic: "bg-white/10 text-white/60",
    professional: "bg-teal/15 text-teal",
    premium: "bg-teal/15 text-teal",
    unlimited: "bg-red-500/15 text-red-500",
    exclusive: "bg-crimson/15 text-crimson",
  };
  return map[licenseType?.toLowerCase()] ?? "bg-white/10 text-white/60";
}

function assetButtonColor(type: string) {
  const map: Record<string, string> = {
    mp3: "bg-teal/10 border-teal/30 text-teal hover:bg-teal/20",
    wav: "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20",
    stems: "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20",
    pdf: "bg-white/8 border-white/15 text-white/70 hover:bg-white/12",
  };
  return map[type] ?? "bg-white/8 border-white/15 text-white/70 hover:bg-white/12";
}

function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const player = usePlayer();

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      nav({ to: "/auth", search: { mode: "signin" } });
      return;
    }
    fetchUserLibrary(user.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const filtered = items
    .filter((it) =>
      query
        ? it.beatTitle.toLowerCase().includes(query.toLowerCase()) ||
          it.producerName.toLowerCase().includes(query.toLowerCase()) ||
          it.licenseName.toLowerCase().includes(query.toLowerCase())
        : true
    )
    .sort((a, b) => {
      switch (sort) {
        case "oldest": return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        case "az": return a.beatTitle.localeCompare(b.beatTitle);
        case "za": return b.beatTitle.localeCompare(a.beatTitle);
        case "price_high": return b.price - a.price;
        case "price_low": return a.price - b.price;
        default: return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      }
    });

  const handleDownload = async (item: LibraryItem, assetType: string) => {
    if (!user) return;
    const key = `${item.purchaseId}-${assetType}`;
    setDownloading(key);

    try {
      if (assetType === "pdf") {
        downloadLicenseAgreement({
          buyerName: user.name,
          beatTitle: item.beatTitle,
          producerName: item.producerName,
          licenseName: item.licenseName,
          price: item.price,
          purchaseDate: new Date(item.purchaseDate).toLocaleDateString(),
          contract: item.contractSnapshot,
        });
      } else {
        const { url, error } = await validateOwnershipAndGetDownloadUrl(
          user.id,
          item.purchaseId,
          assetType
        );
        if (error) {
          alert(error);
          return;
        }
        if (url) {
          const ext = assetType === "stems" ? "zip" : assetType;
          await triggerFileDownload(url, item.beatTitle, ext);
        }
      }
    } finally {
      setDownloading(null);
    }
  };

  const handlePlay = (item: LibraryItem) => {
    const fakeBeat: Beat = {
      id: item.beatId,
      title: item.beatTitle,
      producer: item.producerName,
      producerId: "",
      bpm: 0,
      key: "",
      genre: "",
      mood: "",
      tags: [],
      price: item.price,
      plays: 0,
      duration: 180,
      licenses: [],
      audio: "",
      cover: item.coverUrl ?? "",
    };
    player.play(fakeBeat);
  };

  const totalSpent = items.reduce((s, i) => s + i.price, 0);

  return (
    <div className="min-h-screen bg-background pb-36">
      <Navbar />
      <CartDrawer />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-red-500/5 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-teal/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 pt-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              My Library
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Your Beats
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} beat{items.length !== 1 ? "s" : ""} owned
              {totalSpent > 0 && (
                <> · <span className="text-red-500 font-semibold">{fmtNaira(totalSpent)} total spent</span></>
              )}
            </p>
          </div>
          <Link
            to="/browse"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium transition hover:bg-white/10"
          >
            <Headphones className="h-4 w-4" />
            Browse More Beats
          </Link>
        </div>

        {/* Search + Sort */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library…"
              className="h-10 w-full rounded-xl border border-white/8 bg-surface/60 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-xl border border-white/8 bg-surface/60 px-3 text-sm text-foreground outline-none focus:border-red-500/40"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="price_high">Highest price</option>
              <option value="price_low">Lowest price</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-surface/60 text-muted-foreground">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {query ? "No beats match your search" : "Your library is empty"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {query ? "Try a different search term." : "Purchase a beat to see it here."}
            </p>
            {!query && (
              <Link
                to="/browse"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-5 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_oklch(0.7_0.17_55/0.5)] transition hover:brightness-105"
              >
                <Headphones className="h-4 w-4" />
                Browse Beats
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((item) => {
              const isExpanded = expandedId === item.purchaseId;
              const assets = getIncludedAssets(item.licenseType);
              const isPlaying =
                player.current?.id === item.beatId && player.isPlaying;

              return (
                <div
                  key={item.purchaseId}
                  className="rounded-2xl border border-white/8 bg-surface/50 backdrop-blur-sm transition hover:border-white/15 hover:bg-surface/70"
                >
                  {/* Row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Cover / play */}
                    <div className="relative h-16 w-16 shrink-0">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.beatTitle}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="absolute inset-0 -z-10 h-full w-full rounded-xl bg-red-500/10 grid place-items-center">
                        <Music4 className="h-7 w-7 text-red-500/50" />
                      </div>
                      <button
                        onClick={() => handlePlay(item)}
                        className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition hover:opacity-100"
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6 text-white" />
                        ) : (
                          <Play className="h-6 w-6 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold truncate">{item.beatTitle}</h3>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeStyle(item.licenseType)}`}>
                          {item.licenseName}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        by {item.producerName}
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.purchaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="text-xs text-red-500 font-semibold">{fmtNaira(item.price)}</span>
                        <div className="flex items-center gap-1 text-[10px] text-teal">
                          <CheckCircle2 className="h-3 w-3" /> Owned
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1.5">
                        {assets.map((assetType) => {
                          const key = `${item.purchaseId}-${assetType}`;
                          return (
                            <button
                              key={assetType}
                              onClick={() => handleDownload(item, assetType)}
                              disabled={downloading === key}
                              title={assetLabel(assetType)}
                              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold transition disabled:opacity-50 ${assetButtonColor(assetType)}`}
                            >
                              {downloading === key ? (
                                <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                              ) : (
                                <span>{assetIcon(assetType)}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.purchaseId)}
                        className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground transition hover:bg-white/10"
                        title="Details"
                      >
                        <Layers className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded downloads */}
                  {isExpanded && (
                    <div className="border-t border-white/5 px-4 pb-4 pt-3">
                      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Downloads — {item.licenseName} License
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {assets.map((assetType) => {
                          const key = `${item.purchaseId}-${assetType}`;
                          return (
                            <button
                              key={assetType}
                              onClick={() => handleDownload(item, assetType)}
                              disabled={downloading === key}
                              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-center text-xs font-semibold transition disabled:opacity-50 ${assetButtonColor(assetType)}`}
                            >
                              <span className="text-xl">{assetIcon(assetType)}</span>
                              {downloading === key ? "…" : assetType.toUpperCase()}
                              <Download className="h-3 w-3 opacity-60" />
                            </button>
                          );
                        })}
                        {["mp3", "wav", "stems", "pdf"]
                          .filter((a) => !assets.includes(a))
                          .map((assetType) => (
                            <div
                              key={assetType}
                              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 py-3 px-2 opacity-30 cursor-not-allowed text-center text-xs"
                            >
                              <span className="text-xl">{assetIcon(assetType)}</span>
                              {assetType.toUpperCase()}
                              <span className="text-[9px]">Not included</span>
                            </div>
                          ))}
                      </div>
                      <div className="mt-3 text-[10px] text-muted-foreground/60 text-center">
                        Purchase ID: {item.purchaseId}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

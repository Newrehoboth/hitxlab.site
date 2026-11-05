import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  Search,
  Music4,
  RefreshCw,
  Grid3x3,
  List,
  Heart,
  ChevronUp,
  ChevronDown,
  Megaphone,
  BarChart3,
  Music,
  Tag,
  FileMusic,
  Disc,
  ChevronRight,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Player } from "@/components/Player";
import { CartDrawer } from "@/components/CartDrawer";
import { BeatCard } from "@/components/BeatCard";
import { BeatListRow } from "@/components/BeatListRow";
import { GENRES, type Beat } from "@/data/beats";
import { fetchPublishedBeats } from "@/lib/beats-api";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse All Beats — HITXLAB" },
      {
        name: "description",
        content:
          "Explore every beat on HITXLAB. Filter by genre, mood, BPM and price to find your next hit.",
      },
      { property: "og:title", content: "Browse All Beats — HITXLAB" },
      {
        property: "og:description",
        content: "Explore every beat on HITXLAB — trap, drill, R&B, phonk, boom bap and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Browse,
});

const SORTS = ["Newest", "Most played", "Price: Low", "Price: High"] as const;
type Sort = (typeof SORTS)[number];

const MOODS = [
  "Dark",
  "Sad",
  "Aggressive",
  "Chill",
  "Ethereal",
  "Uplifting",
  "Romantic",
  "Cinematic",
];

const KEYS = [
  "C maj",
  "C min",
  "D maj",
  "D min",
  "E maj",
  "E min",
  "F maj",
  "F min",
  "G maj",
  "G min",
  "A maj",
  "A min",
];

const TOP_CATEGORIES = [
  {
    id: "new",
    label: "New & Notable",
    icon: Megaphone,
    bgImage:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=120&auto=format&fit=crop",
  },
  {
    id: "foryou",
    label: "For You",
    icon: Heart,
    bgImage:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=120&auto=format&fit=crop",
  },
  {
    id: "charts",
    label: "Top Charts",
    icon: BarChart3,
    bgImage:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=120&auto=format&fit=crop",
  },
  {
    id: "exclusive",
    label: "Exclusive Only",
    icon: Music,
    bgImage:
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=120&auto=format&fit=crop",
  },
  {
    id: "under20",
    label: "Under $20",
    icon: Tag,
    bgImage:
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=120&auto=format&fit=crop",
  },
  {
    id: "free",
    label: "Free Beats",
    icon: FileMusic,
    bgImage:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=120&auto=format&fit=crop",
  },
  {
    id: "beats",
    label: "Beats",
    icon: Disc,
    bgImage:
      "https://images.unsplash.com/photo-1539625319302-79c11b83de5c?q=80&w=120&auto=format&fit=crop",
  },
];

const POPULAR_TAGS = [
  "Trap",
  "drake",
  "guitar",
  "rnb",
  "type beat",
  "lil baby",
  "gunna",
  "future",
  "juice wrld",
  "travis scott",
  "hip hop",
  "boom bap",
];

function Browse() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string>("All");
  const [sort, setSort] = useState<Sort>("Newest");
  const [mood, setMood] = useState<string>("All");
  const [trackType, setTrackType] = useState<string>("All");
  const [priceRange, setPriceRange] = useState<string>("All");
  const [keyFilter, setKeyFilter] = useState<string>("All");
  const [minBpm, setMinBpm] = useState<number | "">("");
  const [maxBpm, setMaxBpm] = useState<number | "">("");
  const [selectedCategory, setSelectedCategory] = useState<string>("charts");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showTopCharts, setShowTopCharts] = useState(true);
  const [tagsList, setTagsList] = useState<string[]>(POPULAR_TAGS);
  const [isRefreshingTags, setIsRefreshingTags] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleRefreshTags = () => {
    setIsRefreshingTags(true);
    setSelectedTag("");
    setTimeout(() => {
      setTagsList((prev) => [...prev].sort(() => Math.random() - 0.5));
      setIsRefreshingTags(false);
    }, 250);
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 240, behavior: "smooth" });
    }
  };

  const loadBeats = async () => {
    setLoading(true);
    const b = await fetchPublishedBeats(200);
    setBeats(b);
    setLoading(false);
  };

  useEffect(() => {
    loadBeats();
  }, []);

  const filtered = useMemo(() => {
    let out = beats;

    // Apply selectedCategory filter
    if (selectedCategory === "foryou") {
      out = out.filter((b) => b.producerVerified);
    } else if (selectedCategory === "charts") {
      out = [...out].sort((a, b) => b.plays - a.plays);
    } else if (selectedCategory === "exclusive") {
      out = out.filter((b) => b.price >= 50000);
    } else if (selectedCategory === "under20") {
      out = out.filter((b) => (b.licenses[0]?.price ?? b.price) < 30000);
    } else if (selectedCategory === "free") {
      out = out.filter((b) => (b.licenses[0]?.price ?? b.price) === 0 || b.price < 10000);
    }

    if (genre !== "All")
      out = out.filter((b) => b.genre.toLowerCase().includes(genre.toLowerCase()));
    if (mood !== "All") out = out.filter((b) => b.mood?.toLowerCase() === mood.toLowerCase());
    if (selectedTag) {
      const s = selectedTag.toLowerCase();
      out = out.filter(
        (b) => b.title.toLowerCase().includes(s) || b.tags.some((t) => t.toLowerCase().includes(s)),
      );
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          b.producer.toLowerCase().includes(s) ||
          b.tags.some((t) => t.toLowerCase().includes(s)),
      );
    }
    if (minBpm !== "") out = out.filter((b) => b.bpm >= Number(minBpm));
    if (maxBpm !== "") out = out.filter((b) => b.bpm <= Number(maxBpm));
    if (priceRange === "Free") out = out.filter((b) => (b.licenses[0]?.price ?? 0) === 0);
    if (priceRange === "Under ₦20,000") out = out.filter((b) => (b.licenses[0]?.price ?? 0) < 20000);
    if (priceRange === "Under ₦50,000") out = out.filter((b) => (b.licenses[0]?.price ?? 0) < 50000);

    switch (sort) {
      case "Most played":
        out = [...out].sort((a, b) => b.plays - a.plays);
        break;
      case "Price: Low":
        out = [...out].sort((a, b) => (a.licenses[0]?.price ?? 0) - (b.licenses[0]?.price ?? 0));
        break;
      case "Price: High":
        out = [...out].sort((a, b) => (b.licenses[0]?.price ?? 0) - (a.licenses[0]?.price ?? 0));
        break;
    }
    return out;
  }, [beats, genre, q, minBpm, maxBpm, sort, mood, priceRange, selectedTag, selectedCategory]);

  return (
    <div className="flex min-h-screen flex-col pb-32">
      <Navbar />
      <CartDrawer />

      {/* ── Explore Tracks ── */}
      <section className="border-b border-white/8 bg-background relative z-10">
        <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-12 sm:px-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold">Explore Tracks</h2>
            <button
              onClick={() => setShowTopCharts(!showTopCharts)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 active:scale-95 transition"
            >
              {showTopCharts ? (
                <>
                  Hide <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Collapsible slider panel */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showTopCharts ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            }`}
          >
            {/* Relative wrapper so the right-fade + button can sit absolute over the scroll area */}
            <div className="relative">
              {/* Scrollable row — pl-2 gives the first card's blue ring room to show */}
              <div
                ref={sliderRef}
                className="flex gap-6 sm:gap-8 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-6 pl-2 pr-24 w-full"
              >
                {TOP_CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex flex-col items-center gap-4 shrink-0 transition-all duration-300 ${
                        isActive
                          ? "border border-blue-500/70 bg-blue-950/25 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_0_25px_-5px_rgba(59,130,246,0.45)] min-w-[156px] scale-[1.02]"
                          : "border border-transparent hover:bg-white/5 rounded-2xl p-6 min-w-[156px] opacity-75 hover:opacity-100"
                      }`}
                    >
                      {/* Circle with background image */}
                      <div
                        className={`relative h-24 w-24 rounded-full overflow-hidden transition-all duration-300 ${
                          isActive
                            ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-black/30"
                            : "border border-white/10 hover:border-white/20"
                        }`}
                      >
                        {/* Background photo */}
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 hover:scale-110"
                          style={{
                            backgroundImage: `url(${cat.bgImage})`,
                            backgroundColor: "rgba(10,10,10,0.9)",
                          }}
                        />
                        {/* Dark overlay so icon pops */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
                        {/* Icon */}
                        <div className="absolute inset-0 grid place-items-center">
                          <cat.icon
                            className={`h-8 w-8 transition-all duration-300 ${
                              cat.id === "foryou"
                                ? "text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                                : isActive
                                  ? "text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                                  : "text-white/90"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Label */}
                      <span
                        className={`text-sm sm:text-base font-extrabold text-center tracking-tight transition-all duration-300 max-w-[120px] ${
                          isActive ? "text-white" : "text-white/70"
                        }`}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right-side gradient fade + scroll button */}
              <div className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none bg-gradient-to-l from-background via-background/90 to-transparent flex items-center justify-end z-20">
                <button
                  onClick={scrollRight}
                  className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 text-white transition-all duration-200 shadow-xl mr-2"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search & Filters ── */}
      <section className="border-b border-white/8 bg-[#0a0a0a]">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
          {/* ── Row 1: Fixed Search Input | Scrollable Tag Pills | Fixed Refresh ── */}
          <div className="relative flex items-center w-full gap-2 py-1">
            {/* Left static search pill + vertical divider */}
            <div className="flex shrink-0 items-center gap-2.5 bg-[#0a0a0a] z-10 pr-1">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 h-9 w-60 sm:w-72">
                <Search className="h-3.5 w-3.5 shrink-0 text-white/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search for tags"
                  className="bg-transparent text-xs text-white/80 placeholder:text-white/30 outline-none w-full"
                />
              </div>
              <div className="h-5 w-px bg-white/15 shrink-0" />
            </div>

            {/* Middle scrollable tags container */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden scroll-smooth py-1">
              {tagsList.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                  className={`shrink-0 h-9 rounded-full border px-3 text-xs font-medium transition-all duration-200 ${
                    selectedTag === tag
                      ? "border-blue-400/70 bg-blue-500/10 text-blue-300 shadow-[0_0_10px_-3px_rgba(96,165,250,0.5)]"
                      : "border-white/12 bg-white/5 text-white/70 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Right static refresh button (refreshes tags) */}
            <div className="shrink-0 bg-[#0a0a0a] z-10 pl-1">
              <button
                onClick={handleRefreshTags}
                className="inline-flex items-center gap-1.5 h-9 rounded-full border border-white/12 bg-white/5 px-3.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 active:scale-95"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshingTags ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* ── Row 2: Compact Dropdown pill buttons + heart + view toggle ── */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {/* All time */}
            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition"
              >
                <option value="Newest">All time</option>
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* Saved Filters */}
            <div className="relative shrink-0">
              <select className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition">
                <option>Saved Filters</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* Genre */}
            <div className="relative shrink-0">
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition"
              >
                <option value="All">Genre</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* Track Type */}
            <div className="relative shrink-0">
              <select
                value={trackType}
                onChange={(e) => setTrackType(e.target.value)}
                className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition"
              >
                <option value="All">Track Type</option>
                <option value="Beat">Beat</option>
                <option value="Loop">Loop</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* Price */}
            <div className="relative shrink-0">
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition"
              >
                <option value="All">Price</option>
                <option value="Free">Free</option>
                <option value="Under ₦20,000">Under ₦20,000</option>
                <option value="Under ₦50,000">Under ₦50,000</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* Mood */}
            <div className="relative shrink-0">
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition"
              >
                <option value="All">Mood</option>
                {MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* BPM */}
            <div className="relative shrink-0">
              <select className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition">
                <option>BPM</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* Instruments */}
            <div className="relative shrink-0">
              <select className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition">
                <option>Instruments</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* Key */}
            <div className="relative shrink-0">
              <select
                value={keyFilter}
                onChange={(e) => setKeyFilter(e.target.value)}
                className="appearance-none h-8 rounded-full border border-white/12 bg-white/5 pl-3 pr-7 text-[11px] font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition"
              >
                <option value="All">Key</option>
                {KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40" />
            </div>

            {/* Duration */}
            <div className="relative shrink-0">
              <select className="appearance-none h-9 rounded-full border border-white/12 bg-white/5 pl-3.5 pr-8 text-xs font-medium text-white/80 outline-none cursor-pointer hover:bg-white/10 transition">
                <option>Duration</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Heart button */}
            <button className="shrink-0 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/5 hover:bg-white/10 transition text-white/50 hover:text-red-400">
              <Heart className="h-4 w-4" />
            </button>

            {/* List / Grid toggle */}
            <div className="flex shrink-0 rounded-full border border-white/12 bg-white/5 overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`grid h-9 w-9 place-items-center border-r border-white/10 transition ${
                  viewMode === "list"
                    ? "text-white bg-white/10"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`grid h-9 w-9 place-items-center transition ${
                  viewMode === "grid"
                    ? "text-white bg-white/10"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Row 3: Active filter chips ── */}
          {selectedTag && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                Tags: {selectedTag}
                <button
                  onClick={() => setSelectedTag("")}
                  className="text-white/40 hover:text-white transition ml-0.5"
                >
                  ×
                </button>
              </span>
              <button
                onClick={() => {
                  setSelectedTag("");
                  setGenre("All");
                  setMood("All");
                  setPriceRange("All");
                }}
                className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Beats Grid / List ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {loading ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                : "flex flex-col gap-2"
            }
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={
                  viewMode === "grid"
                    ? "aspect-square animate-pulse rounded-2xl bg-white/5"
                    : "h-[60px] animate-pulse rounded-xl bg-white/5"
                }
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-surface/30 p-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5">
              <Music4 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">No beats match your filters</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try clearing filters or exploring another genre.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((b) => (
              <BeatCard key={b.id} beat={b} />
            ))}
          </div>
        ) : (
          /* ── List mode ── */
          <div className="flex flex-col">
            {/* Column header row */}
            <div className="mb-1 flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 select-none border-b border-white/[0.05]">
              <span className="w-6 shrink-0 text-center">#</span>
              <span className="w-11 sm:w-12 shrink-0" />{/* cover placeholder */}
              <span className="flex-1">Title</span>
              <span className="hidden sm:block shrink-0 w-14 text-center">BPM</span>
              <span className="hidden lg:block shrink-0 w-40">Tags</span>
              <span className="hidden md:block shrink-0 w-20 text-right">Plays</span>
              <span className="shrink-0 pr-1">Price</span>
            </div>

            {/* Beat rows */}
            <div className="flex flex-col gap-0.5">
              {filtered.map((b, i) => (
                <BeatListRow key={b.id} beat={b} index={i} />
              ))}
            </div>
          </div>
        )}
      </section>

      <Player />
    </div>
  );
}

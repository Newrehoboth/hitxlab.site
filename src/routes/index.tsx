import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Play, BadgeCheck, ArrowUpRight, Music2, Pause, Music4, User, Check, Package } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Player } from "@/components/Player";
import { CartDrawer } from "@/components/CartDrawer";
import { BeatCard } from "@/components/BeatCard";
import { GENRES, type Beat } from "@/data/beats";
import { usePlayer } from "@/lib/store";
import { fetchPublishedBeats } from "@/lib/beats-api";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import cover4 from "@/assets/cover-4.jpg";
import kickstartStudioImg from "@/assets/kickstart_studio.png";
import hitxlabLogo from "@/assets/hitxlabLogo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HITXLAB — Premium Beats Marketplace for Artists & Producers" },
      { name: "description", content: "Discover, license and sell premium beats. A modern marketplace for producers and artists — trap, drill, R&B, boom bap, phonk and more." },
      { property: "og:title", content: "HITXLAB — Premium Beats Marketplace" },
      { property: "og:description", content: "Discover, license and sell premium beats from world-class producers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { play, current, isPlaying, toggle } = usePlayer();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeGenre, setActiveGenre] = useState<string>("All");
  const [dbProducers, setDbProducers] = useState<any[]>([]);

  useEffect(() => {
    fetchPublishedBeats(40).then((b) => { setBeats(b); setLoading(false); });
    
    // Fetch registered producer profiles from DB
    supabase
      .from("producer_profiles")
      .select("*")
      .then(({ data }) => {
        if (data) setDbProducers(data);
      });
  }, []);

  const HERO_TITLES = [
    "Your first hit starts here",
    "Buy & license your beats here",
    "Discover top producers & sounds",
    "Elevate your music career today",
  ];
  const [titleIndex, setTitleIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTitleIndex((i) => (i + 1) % HERO_TITLES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (beats.length < 2) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % beats.length), 5000);
    return () => clearInterval(t);
  }, [beats.length]);

  const heroBeat = beats[heroIndex];
  const isHeroPlaying = heroBeat && current?.id === heroBeat.id && isPlaying;

  const filtered = activeGenre === "All" ? beats : beats.filter((b) => b.genre.toLowerCase().includes(activeGenre.toLowerCase()));
  const trending = filtered.slice(0, 4);

  // Only show real DB producers (NO demo data)
  const allCreators = dbProducers.map((p) => ({
    id: p.user_id,
    name: p.producer_name || p.username || "Producer",
    username: p.username || (p.producer_name || "").toLowerCase().replace(/\s+/g, ""),
    verified: true,
    location: [p.city, p.country].filter(Boolean).join(", ") || "@" + p.username,
    promoted: false,
    avatarUrl: p.avatar_url || p.logo_url || null,
  }));

  return (
    <div className="flex min-h-screen flex-col pb-32">
      <Navbar />
      <CartDrawer />

      <section className="relative overflow-hidden min-h-[550px] sm:min-h-[600px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img key={heroBeat?.id ?? "fallback"} src={heroBeat?.cover ?? heroImg} alt={heroBeat?.title ?? "HITXLAB"} className="h-full w-full object-cover animate-fade-in" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 relative z-10 h-full">
          <div className="flex flex-col h-full pt-24 sm:pt-32">
            <div className="max-w-xl">
              <h1 key={titleIndex} className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl text-white uppercase mb-6 animate-fade-in transition-all duration-500">
                {HERO_TITLES[titleIndex]}
              </h1>
              <div className="max-w-xl">
                <div className="group relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  <input placeholder="Explore new sounds — search for anything" className="h-12 sm:h-14 w-full rounded-full border-0 bg-white pl-12 pr-24 sm:pr-28 text-sm sm:text-[15px] text-black placeholder:text-gray-500 outline-none transition focus:ring-2 focus:ring-white/50" />
                  <button className="absolute right-2 top-1/2 h-8 sm:h-10 -translate-y-1/2 rounded-full bg-black px-4 sm:px-6 text-xs sm:text-sm font-semibold text-white transition hover:bg-gray-900 active:scale-[0.98]">Search</button>
                </div>
              </div>
            </div>

            {heroBeat && (
              <div className="hidden lg:block absolute bottom-6 right-6">
                <div className="text-right">
                  <h2 className="font-display text-3xl xl:text-4xl font-bold text-white uppercase tracking-tight leading-tight mb-1">{heroBeat.title}</h2>
                  <div className="flex items-center justify-end gap-2 text-white/90 text-base mb-3">
                    <span>@{heroBeat.producer}</span>
                    {heroBeat.producerVerified && <BadgeCheck className="h-4 w-4 text-teal" />}
                  </div>
                  <button onClick={() => (isHeroPlaying ? toggle() : play(heroBeat, beats.filter((b) => b.id !== heroBeat.id)))} className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/95 text-black shadow-lg transition hover:bg-white hover:scale-105 active:scale-95">
                    {isHeroPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {heroBeat && (
          <div className="lg:hidden absolute bottom-6 right-4 left-4 text-right z-10">
            <h2 className="font-display text-2xl font-bold text-white uppercase tracking-tight mb-1">{heroBeat.title}</h2>
            <div className="flex items-center justify-end gap-2 text-white/90 text-sm mb-3">
              <span>@{heroBeat.producer}</span>
              {heroBeat.producerVerified && <BadgeCheck className="h-4 w-4 text-teal" />}
            </div>
            <div className="flex justify-end">
              <button onClick={() => (isHeroPlaying ? toggle() : play(heroBeat, beats.filter((b) => b.id !== heroBeat.id)))} className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/95 text-black shadow-lg transition hover:bg-white hover:scale-105 active:scale-95">
                {isHeroPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="border-y border-white/5 bg-surface/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-3 gap-6">
            <Stat k="Beats" v={String(beats.length)} />
            <Stat k="Producers" v={String(dbProducers.length)} />
            <Stat k="Genres" v={String(GENRES.length)} />
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-surface/30">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-4 sm:px-6">
          {["All", ...GENRES].map((g) => (
            <button key={g} onClick={() => setActiveGenre(g)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${activeGenre === g ? "border-red-500/50 bg-red-500/10 text-red-500" : "border-white/8 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground"}`}>
              {g}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-red-500">Trending tracks</div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">What the industry is&nbsp;playing</h2>
          </div>
          <Link to="/browse" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-red-500 whitespace-nowrap">
            See all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-surface/30 p-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5"><Music4 className="h-6 w-6 text-muted-foreground" /></div>
            <h3 className="mt-4 font-display text-xl font-bold">The stage is empty</h3>
            <p className="mt-1 text-sm text-muted-foreground">No beats yet in this category. Be the first producer to publish.</p>
            <Link to="/auth" search={{ mode: "signup" }} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-5 text-sm font-semibold text-black">Start selling</Link>
          </div>
        ) : (
          <>
            <div className="sm:hidden">
              <Carousel opts={{ align: "start", loop: true }} className="w-full">
                <CarouselContent className="-ml-2">
                  {trending.map((b) => (
                    <CarouselItem key={b.id} className="pl-2 basis-[85%]"><BeatCard beat={b} /></CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
            <div className="hidden sm:grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {trending.map((b) => <BeatCard key={b.id} beat={b} />)}
            </div>
          </>
        )}
      </section>

      {/* ── Sample Packs Section ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-teal">Premium Sound Kits</div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
              Explore Sample Packs
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              High-quality drums, loops, and one-shots from top producers
            </p>
          </div>
          <Link
            to="/sample-packs"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-red-500 whitespace-nowrap"
          >
            Browse all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <SamplePacksPreview />
      </section>

      {/* ── Sell Beats Section ── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_50%,oklch(0.65_0.2_35/0.4),transparent_55%),radial-gradient(circle_at_85%_50%,oklch(0.6_0.15_200/0.35),transparent_55%),linear-gradient(180deg,oklch(0.2_0.02_265),oklch(0.15_0.015_265))]" />
          <div className="grid gap-8 p-8 sm:p-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal">
                <Music2 className="h-3.5 w-3.5" /> For producers
              </div>
              <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
                Sell beats to <span className="text-gradient-red">artists everywhere</span>.
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Zero listing fees. Instant delivery. Custom licenses, stems and contracts — you keep <span className="font-semibold text-foreground">90%</span>.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/auth" search={{ mode: "signup" }} className="inline-flex h-12 items-center rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-6 font-semibold text-black shadow-[0_15px_35px_-10px_oklch(0.7_0.17_55/0.6)] transition hover:brightness-105 active:scale-[0.98]">
                  Start selling — free
                </Link>
                <Link to="/payouts" className="inline-flex h-12 items-center rounded-xl border border-white/15 px-6 font-medium hover:bg-white/5">How payouts work</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {beats.slice(2, 8).map((b, i) => (
                <button key={b.id} onClick={() => play(b, beats.filter((x) => x.id !== b.id))} className={`group relative overflow-hidden rounded-xl ${i % 3 === 1 ? "row-span-2 aspect-[1/2]" : "aspect-square"}`}>
                  <img src={b.cover} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute inset-0 grid place-items-center"><Play className="h-8 w-8 fill-white text-white" /></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Creators You'll Love Section (Below Sell Beats Card) ── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Creators you&apos;ll love
          </h2>
          <Link
            to="/creators-for-you"
            className="text-sm font-semibold text-muted-foreground hover:text-white transition"
          >
            Show all
          </Link>
        </div>

        <div className="flex items-start gap-6 sm:gap-8 overflow-x-auto pb-4 pt-1 [&::-webkit-scrollbar]:hidden scroll-smooth">
          {allCreators.map((creator) => (
            <Link
              key={creator.id}
              to="/producer/$username"
              params={{ username: creator.username }}
              className="group flex flex-col items-center shrink-0 w-36 sm:w-44 text-center transition-all"
            >
              {/* Circular Avatar */}
              <div className="relative mb-3.5 h-32 w-32 sm:h-40 sm:w-40 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl group-hover:scale-105 group-hover:border-red-500/60 transition-all duration-300 bg-surface flex items-center justify-center">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-800 to-zinc-950 text-white">
                    <User className="h-14 w-14 sm:h-16 sm:w-16 text-white/30" />
                  </div>
                )}
              </div>

              {/* Producer Name & Verified Badge */}
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm sm:text-base text-white group-hover:text-red-500 transition truncate max-w-full px-1">
                <span className="truncate">{creator.name}</span>
                {creator.verified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-blue-400 fill-blue-400/20" />
                )}
              </div>

              {/* Location / Subtitle */}
              <div className="mt-0.5 text-xs text-muted-foreground truncate w-full px-2">
                {creator.location}
              </div>

              {/* Promoted Pill Badge */}
              {creator.promoted && (
                <span className="mt-2.5 rounded-full bg-white/10 px-3 py-0.5 text-[10px] font-bold text-white/70 uppercase tracking-wider border border-white/10">
                  Promoted
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Kickstart Your Music Career Today Section (Below Creators You'll Love) ── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-900/40 bg-gradient-to-br from-[#0f241a] via-[#0b1c13] to-[#06110b] p-6 sm:p-10 lg:p-12 shadow-2xl">
          {/* Subtle background ambient glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl mb-8">
                Kickstart your music career today
              </h2>

              <div className="space-y-6">
                {/* Feature 1 */}
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">
                      The largest marketplace for high quality beats
                    </h3>
                    <p className="mt-1 text-sm text-neutral-300/80 leading-relaxed">
                      Access over 8 million beats from our growing community of producers around the world.
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">
                      Seamless purchasing experience
                    </h3>
                    <p className="mt-1 text-sm text-neutral-300/80 leading-relaxed">
                      We keep it effortless. Browse your favorite genres and purchase with ease - all within one platform.
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">
                      Simple licensing options
                    </h3>
                    <p className="mt-1 text-sm text-neutral-300/80 leading-relaxed">
                      Contracts don&apos;t have to be confusing. Spend less time scratching your head and more time recording your next hit.
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">
                      A community that understands you
                    </h3>
                    <p className="mt-1 text-sm text-neutral-300/80 leading-relaxed">
                      We&apos;re creators just like you. Whether you need our support team or want to collaborate with like-minded creatives, there&apos;s a home for you.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-8">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-7 font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 active:scale-95"
                >
                  Get started
                </Link>
              </div>
            </div>

            {/* Right Media Image Column */}
            <div className="lg:col-span-6 relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl aspect-[16/10] sm:aspect-[4/3] lg:aspect-[16/10]">
                <img
                  src={kickstartStudioImg}
                  alt="Music producer at studio workstation console"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 bg-surface/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-4 sm:px-6">
          <div>
            <Link to="/" className="flex items-center">
              <img src={hitxlabLogo} alt="HITXLAB" className="h-8 w-auto object-contain" />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">The marketplace where beats become hits.</p>
          </div>
          {[{ t: "Marketplace", i: ["Trending", "New Releases", "Genres", "Producers"] }, { t: "For Producers", i: ["Sell Beats", "Payouts", "Analytics", "Licensing"] }, { t: "Company", i: ["About", "Careers", "Support", "Legal"] }].map((c) => (
            <div key={c.t}>
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.t}</div>
              <ul className="space-y-2">
                {c.i.map((x) => (<li key={x}><a className="text-sm text-foreground/80 hover:text-red-500">{x}</a></li>))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 py-5 text-center text-xs text-muted-foreground">© 2026 HITXLAB, Inc. All beats belong to their respective producers.</div>
      </footer>

      <Player />
    </div>
  );
}

function SamplePacksPreview() {
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadPacks();
    
    // Cleanup audio on unmount
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  const loadPacks = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("sample_packs")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(4);

      if (!error && data) {
        // Get producer names
        const producerIds = [...new Set(data.map((p: any) => String(p.producer_id)))] as string[];
        const { data: profiles } = await supabase
          .from("producer_profiles")
          .select("user_id, producer_name")
          .in("user_id", producerIds);

        const profileMap = new Map(
          profiles?.map((p: any) => [p.user_id, p.producer_name]) || []
        );

        const enrichedPacks = data.map((pack: any) => ({
          ...pack,
          producer_name: profileMap.get(pack.producer_id) || "Producer",
        }));

        setPacks(enrichedPacks);

        // Preload preview URLs for faster playback
        const urlMap = new Map<string, string>();
        for (const pack of enrichedPacks) {
          if (pack.preview_url) {
            try {
              const { data: urlData } = await supabase.storage
                .from("sample-pack-previews")
                .createSignedUrl(pack.preview_url, 3600);
              if (urlData?.signedUrl) {
                urlMap.set(pack.id, urlData.signedUrl);
              }
            } catch (err) {
              console.error("Error preloading preview URL:", err);
            }
          }
        }
        setPreviewUrls(urlMap);
      }
    } catch (err) {
      console.error("Error loading sample packs:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = async (pack: any) => {
    if (!pack.preview_url) return;

    // If clicking the same pack that's playing, pause it
    if (playingId === pack.id && audio) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    // Stop any currently playing audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    try {
      // Get the preloaded URL or fetch it
      let audioUrl = previewUrls.get(pack.id);
      
      if (!audioUrl) {
        const { data } = await supabase.storage
          .from("sample-pack-previews")
          .createSignedUrl(pack.preview_url, 3600);
        audioUrl = data?.signedUrl;
      }

      if (audioUrl) {
        const newAudio = new Audio(audioUrl);
        newAudio.preload = 'auto';
        
        newAudio.onended = () => {
          setPlayingId(null);
        };
        
        newAudio.onerror = () => {
          console.error("Error playing audio");
          setPlayingId(null);
        };

        // Set playing state immediately for instant feedback
        setPlayingId(pack.id);
        setAudio(newAudio);
        
        // Play and handle any errors
        newAudio.play().catch((err) => {
          console.error("Play error:", err);
          setPlayingId(null);
        });
      }
    } catch (err) {
      console.error("Error playing preview:", err);
      setPlayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (packs.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-surface/30 p-14 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-display text-xl font-bold">No sample packs yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Be the first producer to publish a sample pack
        </p>
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-5 text-sm font-semibold text-black"
        >
          Start selling
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {packs.map((pack) => (
        <SamplePackCard
          key={pack.id}
          pack={pack}
          isPlaying={playingId === pack.id}
          onTogglePlay={() => togglePlay(pack)}
        />
      ))}
    </div>
  );
}

function SamplePackCard({ pack, isPlaying, onTogglePlay }: { pack: any; isPlaying: boolean; onTogglePlay: () => void }) {
  const [coverUrl, setCoverUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const loadCover = async () => {
      if (pack.cover_url) {
        if (pack.cover_url.startsWith("http")) {
          if (mounted) setCoverUrl(pack.cover_url);
        } else {
          try {
            const { data } = await supabase.storage
              .from("sample-pack-covers")
              .createSignedUrl(pack.cover_url, 7200); // 2 hour cache
            if (mounted && data?.signedUrl) {
              setCoverUrl(data.signedUrl);
            }
          } catch (err) {
            console.error("Error loading cover:", err);
          }
        }
      }
    };

    loadCover();

    return () => {
      mounted = false;
    };
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
              loading="eager"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/30 animate-pulse" />
            </div>
          )}

          {/* Play Button - Bottom Right */}
          {pack.preview_url && coverUrl && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePlay();
              }}
              className={`absolute bottom-2 right-2 z-10 grid h-10 w-10 place-items-center rounded-full shadow-lg transition hover:scale-110 ${
                isPlaying
                  ? "bg-red-500 text-black"
                  : "bg-black/70 text-white backdrop-blur-sm hover:bg-black/90"
              }`}
              title={isPlaying ? "Pause preview" : "Play preview"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </button>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-3">
        <Link
          to="/sample-pack/$id"
          params={{ id: pack.id }}
          className="block"
        >
          <h3 className="truncate font-semibold text-sm hover:text-red-500 transition">
            {pack.title}
          </h3>
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {pack.producer_name}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-sm font-bold text-red-500">
            ₦{pack.price.toLocaleString()}
          </span>
          <div className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal">
            <Package className="h-3 w-3" />
            Pack
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="font-display text-2xl font-bold sm:text-3xl">{v}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
    </div>
  );
}

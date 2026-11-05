import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Music4, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Player } from "@/components/Player";
import { CartDrawer } from "@/components/CartDrawer";
import { fetchAllCreators, type Creator } from "@/data/creators";

export const Route = createFileRoute("/creators-for-you")({
  head: () => ({
    meta: [
      { title: "Creators You'll Love — HITXLAB" },
      {
        name: "description",
        content: "Discover world-class producers and beatmakers on HITXLAB.",
      },
      { property: "og:title", content: "Creators You'll Love — HITXLAB" },
      {
        property: "og:description",
        content: "Explore top producers including RagoArt, Trunxks, and more.",
      },
    ],
  }),
  component: CreatorsForYou,
});

function CreatorsForYou() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllCreators().then((res) => {
      setCreators(res);
      setLoading(false);
    });
  }, []);

  const firstCreator = creators[0];
  const topNames = creators.slice(0, 4).map((c) => c.name).join(", ");

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      <Navbar />
      <CartDrawer />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {/* ── Top Banner Card ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.07] via-white/[0.04] to-surface shadow-2xl p-6 sm:p-10 mb-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(0.65_0.18_55/0.15),transparent_60%)] pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            {/* Square avatar card of first creator */}
            <div className="h-28 w-28 sm:h-36 sm:w-36 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-surface shadow-2xl">
              {firstCreator?.avatarUrl ? (
                <img
                  src={firstCreator.avatarUrl}
                  alt={firstCreator.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-red-500/15 text-red-500">
                  <Music4 className="h-12 w-12" />
                </div>
              )}
            </div>

            {/* Banner text */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-500">
                <span className="grid h-5 w-5 place-items-center rounded bg-red-500 text-black">
                  <Music4 className="h-3 w-3" strokeWidth={3} />
                </span>
                <span>HITXLAB</span>
              </div>

              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl text-white">
                Creators you&apos;ll love
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl font-medium">
                {loading
                  ? "Loading top producers..."
                  : `Creators including ${topNames}, and more.`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Creators Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8">
          {creators.map((creator) => (
            <Link
              key={creator.id}
              to="/producer/$username"
              params={{ username: creator.username }}
              className="group flex flex-col items-center text-center transition-all"
            >
              {/* Circular Avatar */}
              <div className="relative mb-3.5 h-32 w-32 sm:h-40 sm:w-40 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl group-hover:scale-105 group-hover:border-red-500/60 transition-all duration-300 bg-surface flex items-center justify-center">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:brightness-110"
                  />
                ) : (
                  <span className="font-display text-2xl font-bold text-red-500">
                    {creator.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Creator Name + Verified Badge */}
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm sm:text-base text-white group-hover:text-red-500 transition">
                <span className="truncate max-w-[130px]">{creator.name}</span>
                {creator.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-teal fill-teal/20" />}
              </div>

              {/* Location or Tagline */}
              <div className="mt-0.5 text-xs text-muted-foreground/80 truncate max-w-[140px]">
                {creator.tagline || creator.location}
              </div>

              {/* Promoted Tag */}
              {creator.promoted && (
                <span className="mt-2 inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:bg-red-500/20 group-hover:text-red-500 transition">
                  Promoted
                </span>
              )}
            </Link>
          ))}
        </div>
      </main>

      <Player />
    </div>
  );
}

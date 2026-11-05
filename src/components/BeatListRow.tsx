import { Link } from "@tanstack/react-router";
import { Play, Pause, BadgeCheck, ShoppingCart } from "lucide-react";
import { usePlayer, fmtPlays } from "@/lib/store";
import { useBeatPlays } from "@/lib/plays-store";
import { fmtNaira } from "@/lib/currency";
import type { Beat } from "@/data/beats";

interface BeatListRowProps {
  beat: Beat;
  index: number;
}

export function BeatListRow({ beat, index }: BeatListRowProps) {
  const { play, current, isPlaying, toggle } = usePlayer();
  const livePlays = useBeatPlays(beat.id, beat.plays);
  const isCurrent = current?.id === beat.id;
  const showPause = isCurrent && isPlaying;
  const startPrice = beat.licenses[0]?.price ?? beat.price;
  const isNegotiable = beat.licenses[0]?.isNegotiable;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    isCurrent ? toggle() : play(beat);
  };

  return (
    <div
      className={`group relative flex items-center gap-3 sm:gap-4 rounded-xl border px-3 sm:px-4 py-2.5 transition-all duration-200 hover:bg-white/[0.04] active:scale-[0.995] ${
        isCurrent
          ? "border-red-500/30 bg-red-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.015] hover:border-white/10"
      }`}
    >
      {/* ── Row number / play toggle ── */}
      <div className="relative flex h-8 w-6 shrink-0 items-center justify-center text-center select-none">
        {/* Index number — hidden on hover / when playing */}
        <span
          className={`absolute text-[13px] font-bold tabular-nums transition-opacity duration-150 ${
            isCurrent ? "opacity-0" : "opacity-60 group-hover:opacity-0"
          } text-muted-foreground`}
        >
          {index + 1}
        </span>

        {/* Play/Pause button — shown on hover or when current */}
        <button
          onClick={handlePlayPause}
          aria-label={showPause ? "Pause" : "Play"}
          className={`absolute grid h-7 w-7 place-items-center rounded-full transition-all duration-150 ${
            isCurrent
              ? "opacity-100 bg-red-500 text-black"
              : "opacity-0 group-hover:opacity-100 bg-white/15 hover:bg-white/25 text-white"
          }`}
        >
          {showPause ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
          )}
        </button>
      </div>

      {/* ── Cover art ── */}
      <Link
        to="/beat/$id"
        params={{ id: beat.id }}
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:h-12 sm:w-12"
      >
        <img
          src={beat.cover}
          alt={beat.title}
          width={96}
          height={96}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* EQ animation when playing */}
        {isCurrent && (
          <div className="absolute inset-0 flex items-end justify-center gap-0.5 bg-black/40 pb-1.5">
            <span className="eq-bar block h-2.5 w-0.5 rounded-full bg-red-500" style={{ animationDelay: "0ms" }} />
            <span className="eq-bar block h-2.5 w-0.5 rounded-full bg-red-500" style={{ animationDelay: "150ms" }} />
            <span className="eq-bar block h-2.5 w-0.5 rounded-full bg-red-500" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </Link>

      {/* ── Title + Producer (takes remaining space) ── */}
      <div className="min-w-0 flex-1">
        <Link
          to="/beat/$id"
          params={{ id: beat.id }}
          className={`block truncate text-[13px] font-semibold leading-tight sm:text-sm hover:underline ${
            isCurrent ? "text-red-500" : "text-white"
          }`}
        >
          {beat.title}
        </Link>
        <Link
          to="/producer/$username"
          params={{ username: beat.producer.toLowerCase().replace(/[^a-z0-9]/g, "") }}
          className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white transition"
        >
          <span className="truncate">{beat.producer}</span>
          {beat.producerVerified && <BadgeCheck className="h-3 w-3 shrink-0 text-teal" />}
        </Link>
      </div>

      {/* ── BPM pill ── (hidden on small screens) */}
      <div className="hidden sm:flex shrink-0 items-center gap-1.5">
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/60 tabular-nums">
          {beat.bpm} BPM
        </span>
      </div>

      {/* ── Tags ── (hidden on small + medium screens) */}
      <div className="hidden lg:flex shrink-0 items-center gap-1.5">
        {beat.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-white/50"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* ── Plays ── (hidden on small screens) */}
      <div className="hidden md:flex shrink-0 w-20 justify-end">
        <span className="text-[11px] tabular-nums text-muted-foreground/60">
          {fmtPlays(livePlays)}
        </span>
      </div>

      {/* ── Price / Cart button ── */}
      <div className="shrink-0">
        <Link
          to="/beat/$id"
          params={{ id: beat.id }}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:scale-105 active:scale-95 ${
            isNegotiable
              ? "border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
              : "border border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black"
          }`}
        >
          <ShoppingCart className="h-3 w-3" />
          <span className="hidden sm:inline">
            {isNegotiable ? "Negotiate" : fmtNaira(startPrice)}
          </span>
        </Link>
      </div>
    </div>
  );
}

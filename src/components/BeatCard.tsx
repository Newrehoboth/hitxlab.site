import { Link } from "@tanstack/react-router";
import { Play, Pause, BadgeCheck, ArrowRight } from "lucide-react";
import { usePlayer, fmtPlays } from "@/lib/store";
import { useBeatPlays } from "@/lib/plays-store";
import { fmtNaira } from "@/lib/currency";
import { LikeButton } from "@/components/LikeButton";
import type { Beat } from "@/data/beats";

export function BeatCard({ beat }: { beat: Beat }) {
  const { play, current, isPlaying, toggle, addToQueue } = usePlayer();
  const livePlays = useBeatPlays(beat.id, beat.plays);
  const isCurrent = current?.id === beat.id;
  const showPause = isCurrent && isPlaying;
  const startPrice = beat.licenses[0]?.price ?? beat.price;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-surface/60 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-surface hover:shadow-[0_20px_50px_-20px_oklch(0.7_0.17_55/0.35)]">
      <Link
        to="/beat/$id"
        params={{ id: beat.id }}
        className="relative block aspect-square overflow-hidden rounded-xl"
      >
        <img
          src={beat.cover}
          alt={beat.title}
          width={512}
          height={512}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur">
            {beat.bpm} BPM
          </span>
          <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur">
            {beat.key}
          </span>
        </div>
        {isCurrent && (
          <div className="absolute right-3 top-3 flex items-end gap-0.5 rounded-md bg-red-500/20 px-1.5 py-1 backdrop-blur">
            <span className="eq-bar block h-3 w-0.5 bg-red-500" style={{ animationDelay: "0ms" }} />
            <span className="eq-bar block h-3 w-0.5 bg-red-500" style={{ animationDelay: "150ms" }} />
            <span className="eq-bar block h-3 w-0.5 bg-red-500" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          isCurrent ? toggle() : play(beat);
        }}
        className="absolute right-5 top-[55%] -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-red-500 text-red-500-foreground opacity-0 shadow-[0_10px_30px_-8px_oklch(0.75_0.16_65/0.7)] transition-all duration-300 group-hover:opacity-100 hover:scale-105 active:scale-95"
        aria-label={showPause ? "Pause" : "Play"}
      >
        {showPause ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
      </button>

      <div className="flex flex-col gap-3 p-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to="/beat/$id"
              params={{ id: beat.id }}
              className="block truncate text-base font-semibold leading-snug hover:text-red-500"
            >
              {beat.title}
            </Link>
            <Link
              to="/producer/$username"
              params={{ username: beat.producer.toLowerCase().replace(/[^a-z0-9]/g, "") }}
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition"
            >
              <span className="truncate">{beat.producer}</span>
              {beat.producerVerified && <BadgeCheck className="h-3.5 w-3.5 text-teal" />}
            </Link>
          </div>
          <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {beat.genre}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {fmtPlays(livePlays)} {livePlays === 1 ? "play" : "plays"}
            </span>
            <LikeButton beatId={beat.id} />
          </div>
          <Link
            to="/beat/$id"
            params={{ id: beat.id }}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500 hover:text-white"
          >
            {beat.licenses[0]?.isNegotiable ? "Negotiable" : `From ${fmtNaira(startPrice)}`}{" "}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

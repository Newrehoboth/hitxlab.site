import { Link } from "@tanstack/react-router";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  ListMusic,
  ShoppingBag,
  Heart,
  X,
  Trash2,
} from "lucide-react";
import { useMemo, useRef } from "react";
import { usePlayer, useCart, fmtTime } from "@/lib/store";
import { fmtNaira } from "@/lib/currency";

// Static waveform bars – deterministic per URL
const bars = (seed: string, n = 96) => {
  const out: number[] = [];
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out.push(0.2 + ((s % 1000) / 1000) * 0.8);
  }
  return out;
};

export function Player() {
  const {
    current,
    isPlaying,
    toggle,
    next,
    prev,
    progress,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    queue,
    queueOpen,
    setQueueOpen,
    removeFromQueue,
    play,
  } = usePlayer();
  
  const trackRef = useRef<HTMLDivElement>(null);

  const wave = useMemo(() => (current ? bars(current.audio) : []), [current]);

  if (!current) return null;

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current!.getBoundingClientRect();
    seek((e.clientX - rect.left) / rect.width);
  };

  return (
    <>
      {/* Queue side panel */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm border-l border-white/8 bg-background/95 backdrop-blur-xl transition-transform duration-300 ${
          queueOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/8 px-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Playing next
            </div>
            <div className="text-sm font-semibold">Your Queue · {queue.length}</div>
          </div>
          <button
            onClick={() => setQueueOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/5"
            aria-label="Close queue"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex h-[calc(100%-4rem-6rem)] flex-col overflow-y-auto p-3">
          {queue.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-2 px-6 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-white/5">
                <ListMusic className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-sm font-semibold">Queue is empty</div>
              <p className="text-xs text-muted-foreground">
                Hit the <span className="text-red-500">+</span> on any beat to line it up next.
              </p>
            </div>
          )}
          {queue.map((b, i) => (
            <div
              key={b.id}
              className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
            >
              <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
              <button onClick={() => play(b, queue.filter((x) => x.id !== b.id))} className="relative shrink-0">
                <img
                  src={b.cover}
                  alt=""
                  width={44}
                  height={44}
                  loading="lazy"
                  className="h-11 w-11 rounded-lg object-cover"
                />
                <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/50 opacity-0 group-hover:opacity-100">
                  <Play className="h-4 w-4 fill-white text-white" />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{b.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {b.producer} · {b.bpm} BPM
                </div>
              </div>
              <button
                onClick={() => removeFromQueue(b.id)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-0 hover:bg-white/5 hover:text-crimson group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Bottom player */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-background/85 backdrop-blur-xl">
        {/* Waveform */}
        <div
          ref={trackRef}
          onClick={onSeek}
          className="relative h-10 w-full cursor-pointer select-none px-4 sm:px-6"
        >
          <div className="flex h-full items-center gap-[2px]">
            {wave.map((v, i) => {
              const played = i / wave.length < progress;
              return (
                <div
                  key={i}
                  className="w-[3px] flex-1 rounded-full transition-colors"
                  style={{
                    height: `${v * 100}%`,
                    backgroundColor: played
                      ? "oklch(0.8 0.155 72)"
                      : "oklch(1 0 0 / 18%)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Mobile compact row */}
        <div className="flex items-center gap-3 px-4 py-3 sm:hidden">
          <img
            src={current.cover}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-tight">{current.title}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {current.producer} · {current.bpm} BPM
            </div>
          </div>
          <button
            onClick={() => setQueueOpen(!queueOpen)}
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-white/5"
            aria-label="Queue"
          >
            <ListMusic className="h-4 w-4" />
            {queue.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-teal px-1 text-[9px] font-bold text-black">
                {queue.length}
              </span>
            )}
          </button>
          <button
            onClick={toggle}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground text-background shadow-[0_10px_24px_-8px_rgba(255,255,255,0.35)] active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            )}
          </button>
        </div>

        {/* Desktop / tablet row */}
        <div className="mx-auto hidden h-24 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 sm:grid">
          {/* Track meta */}
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={current.cover}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{current.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {current.producer} · {current.bpm} BPM · {current.key}
              </div>
            </div>
            <button className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-crimson">
              <Heart className="h-4 w-4" />
            </button>
          </div>

          {/* Transport */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={prev}
              className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Previous"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={toggle}
              className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-background shadow-[0_10px_24px_-8px_rgba(255,255,255,0.35)] transition hover:scale-105 active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              )}
            </button>
            <button
              onClick={next}
              className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Next"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Right cluster */}
          <div className="flex items-center justify-end gap-3">
            <span className="hidden text-xs tabular-nums text-muted-foreground md:inline">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
            <div className="hidden items-center gap-2 md:flex">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1 w-20 cursor-pointer accent-[oklch(0.8_0.155_72)]"
              />
            </div>
            <button
              onClick={() => setQueueOpen(!queueOpen)}
              className={`relative grid h-10 w-10 place-items-center rounded-lg border border-white/8 transition ${
                queueOpen ? "bg-red-500/15 text-red-500" : "bg-surface/60 hover:bg-surface"
              }`}
              aria-label="Queue"
            >
              <ListMusic className="h-4.5 w-4.5" />
              {queue.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-teal px-1 text-[9px] font-bold text-black">
                  {queue.length}
                </span>
              )}
            </button>
            <Link
              to="/beat/$id"
              params={{ id: current.id }}
              className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-3 text-sm font-bold text-red-500-foreground shadow-[0_10px_20px_-8px_oklch(0.75_0.16_65/0.55)] transition hover:brightness-105 active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4" />From {current.licenses[0]?.isNegotiable ? "Negotiable" : fmtNaira(current.licenses[0].price)}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

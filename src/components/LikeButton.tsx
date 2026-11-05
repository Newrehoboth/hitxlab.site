import { Heart } from "lucide-react";
import { useBeatLike } from "@/lib/engagement";

export function LikeButton({
  beatId,
  size = "sm",
  showCount = true,
  className = "",
}: {
  beatId: string;
  size?: "sm" | "lg";
  showCount?: boolean;
  className?: string;
}) {
  const { count, liked, toggle, busy } = useBeatLike(beatId);
  const big = size === "lg";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) toggle();
      }}
      aria-pressed={liked}
      aria-label={liked ? "Unlike beat" : "Like beat"}
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all active:scale-95 ${
        big ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-[11px]"
      } ${
        liked
          ? "border-red-500/50 bg-red-500/15 text-red-400"
          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
      } ${className}`}
    >
      <Heart className={`${big ? "h-4 w-4" : "h-3.5 w-3.5"} ${liked ? "fill-current" : ""}`} />
      {showCount && <span className="font-semibold tabular-nums">{count}</span>}
    </button>
  );
}

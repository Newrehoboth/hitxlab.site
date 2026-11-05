import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Beat } from "@/data/beats";

const STORAGE_KEY = "octave_beat_play_increments";
const EVENT_NAME = "octave:beat-played";

function getIncrementsMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getBeatPlays(beatId: string, initialPlays: number): number {
  const map = getIncrementsMap();
  const extra = map[beatId] || 0;
  return (initialPlays || 0) + extra;
}

export async function recordBeatPlay(beat: Beat): Promise<number> {
  if (!beat || !beat.id) return beat?.plays || 0;

  // 1. Update local storage increment
  const map = getIncrementsMap();
  const currentExtra = map[beat.id] || 0;
  const newExtra = currentExtra + 1;
  map[beat.id] = newExtra;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn("Failed to persist play count to localStorage", err);
  }

  const calculatedTotal = (beat.plays || 0) + newExtra;

  // 2. Broadcast custom window event so UI elements update live everywhere
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: {
          beatId: beat.id,
          extraPlays: newExtra,
          totalPlays: calculatedTotal,
        },
      })
    );
  }

  // 3. Persist increment to Supabase database if it's a real beat row
  if (beat.id && !beat.id.startsWith("mock-") && !beat.id.startsWith("b-")) {
    try {
      // Log the play event with timestamp for daily tracking
      await supabase
        .from("beat_plays_log")
        .insert({ beat_id: beat.id });

      // Update total play count on the beat
      const { data } = await supabase
        .from("beats")
        .select("plays")
        .eq("id", beat.id)
        .maybeSingle();

      const currentDbPlays = data?.plays ?? beat.plays ?? 0;
      await supabase
        .from("beats")
        .update({ plays: currentDbPlays + 1 })
        .eq("id", beat.id);
    } catch (err) {
      console.warn("Failed to update Supabase beat play count", err);
    }
  }

  return calculatedTotal;
}

export function useBeatPlays(beatId: string, initialPlays: number): number {
  const [plays, setPlays] = useState<number>(() =>
    getBeatPlays(beatId, initialPlays)
  );

  useEffect(() => {
    // Keep initial state synced if initialPlays prop changes
    setPlays(getBeatPlays(beatId, initialPlays));
  }, [beatId, initialPlays]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeatPlay = (e: Event) => {
      const customEv = e as CustomEvent<{ beatId: string; totalPlays: number }>;
      if (customEv.detail && customEv.detail.beatId === beatId) {
        setPlays(customEv.detail.totalPlays);
      }
    };

    window.addEventListener(EVENT_NAME, handleBeatPlay);
    return () => window.removeEventListener(EVENT_NAME, handleBeatPlay);
  }, [beatId]);

  return plays;
}

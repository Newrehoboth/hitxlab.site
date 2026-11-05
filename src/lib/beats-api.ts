import { supabase } from "@/integrations/supabase/client";
import type { Beat } from "@/data/beats";
import type { License } from "@/lib/licenses";
import cover1 from "@/assets/cover-1.jpg";

const FALLBACK_COVER = cover1;

async function signedUrl(bucket: string, path: string | null | undefined): Promise<string> {
  if (!path) return "";
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? "";
}

export type DbBeat = {
  id: string;
  producer_id: string;
  title: string;
  description: string | null;
  genre: string;
  mood: string | null;
  bpm: number;
  key: string;
  tags: string[];
  cover_url: string | null;
  audio_url: string | null;
  duration: number;
  plays: number;
  licenses: unknown;
  published: boolean;
  created_at: string;
  producer_profiles?: { producer_name: string; username: string } | null;
};

export async function toBeat(row: DbBeat): Promise<Beat> {
  const [cover, audio] = await Promise.all([
    row.cover_url ? signedUrl("beat-covers", row.cover_url) : Promise.resolve(""),
    row.audio_url ? signedUrl("beat-audio", row.audio_url) : Promise.resolve(""),
  ]);
  const licenses = (row.licenses as unknown as License[]) ?? [];
  return {
    id: row.id,
    title: row.title,
    producer: row.producer_profiles?.producer_name ?? "Unknown",
    producerId: row.producer_id,
    producerVerified: true,
    cover: cover || FALLBACK_COVER,
    audio,
    bpm: row.bpm,
    key: row.key,
    genre: row.genre,
    mood: row.mood ?? "",
    tags: row.tags ?? [],
    price: licenses[0]?.price ?? 0,
    plays: row.plays,
    duration: row.duration,
    description: row.description ?? "",
    licenses,
    audioPath: row.audio_url ?? undefined,
    coverPath: row.cover_url ?? undefined,
    wavPath: (row as any).wav_url ?? undefined,
    stemsPath: (row as any).stems_url ?? undefined,
  };
}

export async function fetchPublishedBeats(limit = 40): Promise<Beat[]> {
  const { data, error } = await supabase
    .from("beats")
    .select("*, producer_profiles!beats_producer_id_fkey(producer_name, username)")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    // producer_profiles is not a real FK, retry with manual join
    const { data: b } = await supabase
      .from("beats")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!b) return [];
    const ids = Array.from(new Set(b.map((r) => r.producer_id)));
    const { data: profs } = await supabase
      .from("producer_profiles")
      .select("user_id, producer_name, username")
      .in("user_id", ids);
    const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
    return Promise.all(
      b.map((r) =>
        toBeat({
          ...(r as any),
          producer_profiles: map.get(r.producer_id)
            ? { producer_name: map.get(r.producer_id)!.producer_name, username: map.get(r.producer_id)!.username }
            : null,
        }),
      ),
    );
  }
  return Promise.all((data ?? []).map((r) => toBeat(r as any)));
}

export async function fetchBeatById(id: string): Promise<Beat | null> {
  const { data } = await supabase.from("beats").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: prof } = await supabase
    .from("producer_profiles")
    .select("producer_name, username")
    .eq("user_id", data.producer_id)
    .maybeSingle();
  return toBeat({ ...(data as any), producer_profiles: prof ?? null });
}

export async function fetchMyBeats(userId: string): Promise<Beat[]> {
  const { data } = await supabase
    .from("beats")
    .select("*")
    .eq("producer_id", userId)
    .order("created_at", { ascending: false });
  if (!data) return [];
  const { data: prof } = await supabase
    .from("producer_profiles")
    .select("producer_name, username")
    .eq("user_id", userId)
    .maybeSingle();
  return Promise.all(
    data.map((r) => toBeat({ ...(r as any), producer_profiles: prof ?? null })),
  );
}

import { supabase } from "@/integrations/supabase/client";

export interface Creator {
  id: string;
  name: string;
  username: string;
  verified: boolean;
  location: string;
  promoted: boolean;
  avatarUrl: string | null;
  tagline?: string;
}

// ── DEMO DATA REMOVED ──
// All creators now come from database only
// No mock/demo creators are displayed

export async function fetchAllCreators(): Promise<Creator[]> {
  try {
    const { data } = await supabase.from("producer_profiles").select("*");
    const realCreators: Creator[] = (data ?? []).map((p) => ({
      id: p.user_id,
      name: p.producer_name || p.username || "Producer",
      username: p.username || (p.producer_name || "").toLowerCase().replace(/\s+/g, ""),
      verified: true,
      location: [p.city, p.country].filter(Boolean).join(", ") || "@" + p.username,
      promoted: false,
      avatarUrl: p.avatar_url || p.logo_url || null,
    }));

    return realCreators;
  } catch {
    return [];
  }
}

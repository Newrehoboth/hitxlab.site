import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";

const db = supabase as any;

/* ── Beat likes ── */
export function useBeatLike(beatId: string | undefined) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!beatId) return;
    const { count: total } = await db
      .from("beat_likes")
      .select("*", { count: "exact", head: true })
      .eq("beat_id", beatId);
    setCount(total ?? 0);

    if (user) {
      const { data } = await db
        .from("beat_likes")
        .select("id")
        .eq("beat_id", beatId)
        .eq("user_id", user.id)
        .maybeSingle();
      setLiked(!!data);
    } else {
      setLiked(false);
    }
  }, [beatId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async () => {
    if (!beatId) return;
    if (!user) {
      window.location.href = "/auth?mode=signin";
      return;
    }
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      if (next) {
        const { error } = await db.from("beat_likes").insert({ beat_id: beatId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await db
          .from("beat_likes")
          .delete()
          .eq("beat_id", beatId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Like error:", err);
      await load();
    } finally {
      setBusy(false);
    }
  }, [beatId, liked, user?.id, load]);

  return { count, liked, toggle, busy };
}

/* ── Notifications ── */
export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function useNotifications(limit = 50) {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: qErr } = await db
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (qErr) throw qErr;
      setItems((data as AppNotification[]) ?? []);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live updates
  useEffect(() => {
    if (!user) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload: any) => setItems((prev) => [payload.new as AppNotification, ...prev])
        )
        .subscribe((status: string, err?: Error) => {
          if (err) console.error("Notifications realtime error:", err);
        });
    } catch (err) {
      console.error("Failed to subscribe to notifications channel:", err);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await db.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  }, [user?.id]);

  const markRead = useCallback(
    async (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      await db.from("notifications").update({ is_read: true }).eq("id", id);
    },
    []
  );

  return { items, loading, error, unread, refresh, markAllRead, markRead };
}


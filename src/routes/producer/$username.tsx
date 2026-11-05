import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  BadgeCheck,
  Plus,
  Check,
  MessageSquare,
  Globe,
  Instagram,
  Youtube,
  Music,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Crown,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Player } from "@/components/Player";
import { CartDrawer } from "@/components/CartDrawer";
import { BeatCard } from "@/components/BeatCard";
import { fetchPublishedBeats } from "@/lib/beats-api";
import { supabase } from "@/integrations/supabase/client";
import { fmtPlays, useAuth } from "@/lib/store";
import { getBeatPlays } from "@/lib/plays-store";
import type { Beat } from "@/data/beats";

export const Route = createFileRoute("/producer/$username")({
  component: ProducerProfilePage,
});

// NO MOCK DATA - All data comes from database only

function ProducerProfilePage() {
  const { username } = useParams({ from: "/producer/$username" });
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [expandedBio, setExpandedBio] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // 1. Fetch profile from Supabase DB ONLY
      const { data: dbProfile } = await supabase
        .from("producer_profiles")
        .select("*")
        .or(`username.ilike.${username},producer_name.ilike.${username}`)
        .maybeSingle();

      let pData: any = null;

      if (dbProfile) {
        // Fetch real follower count from DB
        let followerCount = 0;
        try {
          const { count } = await (supabase as any)
            .from("producer_followers")
            .select("*", { count: "exact", head: true })
            .eq("producer_id", dbProfile.user_id);
          followerCount = count ?? 0;
        } catch (_) {}

        pData = {
          producerId: dbProfile.user_id,
          producerName: dbProfile.producer_name,
          username: dbProfile.username,
          verified: true,
          location: [dbProfile.city, dbProfile.country].filter(Boolean).join(", ") || "Global",
          bio: dbProfile.bio || "No biography provided yet.",
          followers: followerCount.toLocaleString(),
          plays: "0",
          tracksCount: 0,
          collectionsCount: 0,
          avatarUrl: dbProfile.avatar_url || dbProfile.logo_url || null,
          instagram: dbProfile.instagram,
          tiktok: dbProfile.tiktok,
          youtube: dbProfile.youtube,
          spotify: dbProfile.spotify,
          website: dbProfile.website,
        };
      } else {
        // Producer not found - show 404
        pData = null;
      }

      if (!pData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(pData);

      // 2. Fetch real beats from database
      const { data: dbBeats } = await supabase
        .from("beats")
        .select("*")
        .eq("producer_id", dbProfile?.user_id ?? "")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (dbBeats && dbBeats.length > 0) {
        const beats = await Promise.all(
          dbBeats.map(async (b: any) => {
            const [cover, audio] = await Promise.all([
              b.cover_url
                ? supabase.storage.from("beat-covers").createSignedUrl(b.cover_url, 60 * 60 * 24 * 365)
                : null,
              b.audio_url
                ? supabase.storage.from("beat-audio").createSignedUrl(b.audio_url, 60 * 60 * 24 * 365)
                : null,
            ]);
            return {
              id: b.id,
              title: b.title,
              producer: pData.producerName,
              producerId: b.producer_id,
              producerVerified: true,
              cover: cover?.data?.signedUrl || "",
              audio: audio?.data?.signedUrl || "",
              bpm: b.bpm,
              key: b.key,
              genre: b.genre,
              mood: b.mood || "",
              tags: b.tags || [],
              price: (b.licenses as any)?.[0]?.price || 0,
              plays: b.plays,
              duration: b.duration,
              description: b.description || "",
              licenses: (b.licenses as any) || [],
            };
          })
        );
        setBeats(beats);
        pData.tracksCount = beats.length;
      }

      setProfile(pData);
      setLoading(false);
    }
    loadData();
  }, [username]);

  // Check if current user is following this producer
  useEffect(() => {
    async function checkFollowing() {
      if (!user || !profile?.producerId) return;
      
      const { data } = await (supabase as any)
        .from("producer_followers")
        .select("*")
        .eq("producer_id", profile.producerId)
        .eq("follower_id", user.id)
        .maybeSingle();
      
      setFollowing(!!data);
    }
    checkFollowing();
  }, [user, profile?.producerId]);

  // Toggle follow/unfollow
  const toggleFollow = async () => {
    if (!user) {
      alert("Please sign in to follow producers");
      return;
    }
    if (!profile?.producerId) return;

    setFollowLoading(true);
    try {
      if (following) {
        // Unfollow
        await (supabase as any)
          .from("producer_followers")
          .delete()
          .eq("producer_id", profile.producerId)
          .eq("follower_id", user.id);
        setFollowing(false);
        setProfile((prev: any) =>
          prev ? { ...prev, followers: Math.max(0, Number(String(prev.followers).replace(/,/g, "")) - 1).toLocaleString() } : prev
        );
      } else {
        // Follow
        await (supabase as any)
          .from("producer_followers")
          .insert({
            producer_id: profile.producerId,
            follower_id: user.id,
          });
        setFollowing(true);
        setProfile((prev: any) =>
          prev ? { ...prev, followers: (Number(String(prev.followers).replace(/,/g, "")) + 1).toLocaleString() } : prev
        );
      }
    } catch (error) {
      console.error("Follow error:", error);
      alert("Could not update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading producer profile...</div>
      </div>
    );
  }

  const popularBeats = [...beats].sort((a, b) => b.plays - a.plays).slice(0, 4);

  const isLongBio = (profile?.bio || "").length > 120;

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-32">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading producer profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-32">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Producer Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">The producer "{username}" does not exist.</p>
          <Link to="/" className="mt-4 inline-block text-red-500 hover:underline">Go back to homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <Navbar />
      <CartDrawer />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-white transition"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Marketplace
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── LEFT COLUMN: Producer Card Sidebar ── */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="rounded-3xl border border-white/10 bg-surface/50 p-6 shadow-2xl relative">
              {/* Options Menu Button */}
              <button className="absolute top-5 right-5 text-muted-foreground hover:text-white transition">
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {/* Circular Avatar */}
              <div className="relative mx-auto mb-4 h-32 w-32 rounded-full overflow-hidden border-4 border-black bg-surface shadow-2xl flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.producerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-600 to-indigo-900 text-3xl font-bold text-white uppercase">
                    {profile.producerName.slice(0, 2)}
                  </div>
                )}
              </div>

              {/* Producer Name & Verification Badge */}
              <div className="flex items-center justify-center gap-1.5 font-display text-2xl font-bold text-white text-center">
                <span>{profile.producerName}</span>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-crimson text-white">
                  <Sparkles className="h-3 w-3 fill-current" />
                </span>
                {profile.verified && (
                  <BadgeCheck className="h-5 w-5 text-blue-400 fill-blue-400/20" />
                )}
              </div>

              {/* Location */}
              <p className="text-xs text-muted-foreground text-center mt-1 mb-6 font-medium">
                {profile.location}
              </p>

              {/* Action Buttons: Follow & Message */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition active:scale-95 shadow-lg disabled:opacity-50 ${following
                      ? "bg-white/10 text-white border border-white/20"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                >
                  {followLoading ? (
                    "..."
                  ) : following ? (
                    <>
                      <Check className="h-4 w-4 text-teal" /> Following
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Follow
                    </>
                  )}
                </button>

                <button className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white font-semibold py-2.5 rounded-xl text-sm transition active:scale-95 border border-white/5">
                  <MessageSquare className="h-4 w-4 text-red-500" /> Message
                </button>
              </div>

              <div className="pt-2">
                {/* Stats */}
                <div className="pb-7 border-b border-white/10">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Stats
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Followers</span>
                      <span className="font-bold text-white">{profile.followers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Plays</span>
                      <span className="font-bold text-white">
                        {beats.length > 0
                          ? fmtPlays(beats.reduce((s, b) => s + getBeatPlays(b.id, b.plays), 0))
                          : profile.plays}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Tracks</span>
                      <span className="font-bold text-white">{profile.tracksCount}</span>
                    </div>
                  </div>
                </div>

                {/* Achievements — single premium badge */}
                <div className="py-7 border-b border-white/10">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Achievements
                  </h4>

                  {/* Beats Publishing Member Badge */}
                  <div className="group relative inline-flex cursor-default select-none">
                    {/* Outer glow ring — pulses */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-[-6px] rounded-full opacity-60"
                      style={{
                        background:
                          "radial-gradient(circle, oklch(0.82 0.18 78 / 0.55) 0%, transparent 70%)",
                        animation: "pulse 2.4s ease-in-out infinite",
                      }}
                    />

                    {/* Spinning gradient border ring */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-[-2px] rounded-full"
                      style={{
                        background:
                          "conic-gradient(from 0deg, oklch(0.88 0.16 78), oklch(0.6 0.18 35), oklch(0.88 0.16 78))",
                        animation: "spin 3s linear infinite",
                      }}
                    />

                    {/* Badge body */}
                    <div
                      className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-black"
                      style={{
                        background:
                          "linear-gradient(145deg, oklch(0.25 0.04 78), oklch(0.18 0.03 78))",
                        boxShadow:
                          "0 0 0 2px oklch(0.82 0.18 78 / 0.35), inset 0 1px 0 oklch(0.95 0.05 78 / 0.15)",
                      }}
                    >
                      {/* Crown icon */}
                      <Crown
                        className="h-6 w-6 drop-shadow-sm"
                        style={{
                          color: "oklch(0.88 0.16 78)",
                          filter: "drop-shadow(0 0 6px oklch(0.88 0.16 78 / 0.8))",
                        }}
                        strokeWidth={1.8}
                      />
                    </div>

                    {/* Tooltip — appears on hover */}
                    <div
                      className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 opacity-0 scale-90 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0"
                      style={{ zIndex: 50 }}
                    >
                      {/* Tooltip card */}
                      <div
                        className="relative whitespace-nowrap rounded-xl px-4 py-2.5 shadow-2xl"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.22 0.04 78) 0%, oklch(0.16 0.03 265) 100%)",
                          border: "1px solid oklch(0.82 0.18 78 / 0.4)",
                          boxShadow:
                            "0 8px 32px -8px oklch(0.82 0.18 78 / 0.6), 0 2px 8px -2px black/60",
                        }}
                      >
                        {/* Label */}
                        <p
                          className="text-center text-[11px] font-black uppercase tracking-[0.15em]"
                          style={{ color: "oklch(0.88 0.16 78)" }}
                        >
                          Beats Publishing
                        </p>
                        <p
                          className="text-center text-[10px] font-semibold uppercase tracking-[0.1em] mt-0.5"
                          style={{ color: "oklch(0.70 0.08 78)" }}
                        >
                          Member
                        </p>

                        {/* Downward arrow */}
                        <div
                          className="absolute left-1/2 top-full -translate-x-1/2 h-0 w-0"
                          style={{
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderTop: "6px solid oklch(0.82 0.18 78 / 0.5)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="py-7 border-b border-white/10">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Products
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/8 border border-white/10 px-3.5 py-1 text-xs font-semibold text-white">
                      {profile.collectionsCount || 10} Collections
                    </span>
                    <span className="rounded-full bg-white/8 border border-white/10 px-3.5 py-1 text-xs font-semibold text-white">
                      {profile.tracksCount} Tracks
                    </span>
                  </div>
                </div>

                {/* About Me — smooth expand/collapse via max-height */}
                <div className="py-7 border-b border-white/10">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    About Me
                  </h4>
                  <div
                    style={{
                      maxHeight: expandedBio
                        ? bioRef.current
                          ? bioRef.current.scrollHeight + "px"
                          : "500px"
                        : "4.5rem",
                      overflow: "hidden",
                      transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <p
                      ref={bioRef}
                      className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line"
                    >
                      {profile?.bio}
                    </p>
                  </div>
                  {isLongBio && (
                    <button
                      onClick={() => setExpandedBio((v) => !v)}
                      className="mt-2 text-xs font-bold text-red-500 hover:opacity-70 transition-opacity focus:outline-none"
                    >
                      {expandedBio ? "View Less ↑" : "View More ↓"}
                    </button>
                  )}
                </div>

                {/* Find Me On (Social links) */}
                <div className="pt-7">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Find Me On
                  </h4>
                  <div className="flex items-center gap-3">
                    {profile.instagram && (
                      <a
                        href={profile.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition border border-white/5"
                      >
                        <Instagram className="h-4.5 w-4.5" />
                      </a>
                    )}
                    {profile.youtube && (
                      <a
                        href={profile.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition border border-white/5"
                      >
                        <Youtube className="h-4.5 w-4.5" />
                      </a>
                    )}
                    {profile.tiktok && (
                      <a
                        href={profile.tiktok}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition border border-white/5"
                      >
                        <Music className="h-4.5 w-4.5" />
                      </a>
                    )}
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition border border-white/5"
                      >
                        <Globe className="h-4.5 w-4.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Popular & Tracks ── */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-12">
            {/* 1. POPULAR SECTION */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-display text-2xl font-bold tracking-tight text-white">
                  Popular
                </h3>
                <div className="flex items-center gap-3">
                  <button className="text-xs font-semibold text-muted-foreground hover:text-white transition">
                    Show all
                  </button>
                  <div className="flex items-center gap-1">
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10 text-white transition">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10 text-white transition">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularBeats.map((beat) => (
                  <BeatCard key={"pop_" + beat.id} beat={beat} />
                ))}
              </div>
            </div>

            {/* 2. TRACKS SECTION */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-display text-2xl font-bold tracking-tight text-white">
                  Tracks
                </h3>
                <div className="flex items-center gap-3">
                  <button className="text-xs font-semibold text-muted-foreground hover:text-white transition">
                    Show all
                  </button>
                  <div className="flex items-center gap-1">
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10 text-white transition">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10 text-white transition">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {beats.map((beat) => (
                  <BeatCard key={"track_" + beat.id} beat={beat} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Player />
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";

export type ProducerProfile = {
  userId: string;
  producerName: string;
  username: string;
  bio: string;
  country: string;
  city: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  spotify?: string | null;
  website?: string | null;
  brandColor: string;
  producerTag: string;
  logoUrl?: string | null;
};

function fromRow(r: any): ProducerProfile {
  return {
    userId: r.user_id,
    producerName: r.producer_name,
    username: r.username,
    bio: r.bio ?? "",
    country: r.country ?? "",
    city: r.city ?? "",
    avatarUrl: r.avatar_url,
    bannerUrl: r.banner_url,
    instagram: r.instagram,
    tiktok: r.tiktok,
    youtube: r.youtube,
    spotify: r.spotify,
    website: r.website,
    brandColor: r.brand_color,
    producerTag: r.producer_tag,
    logoUrl: r.logo_url,
  };
}

export function toRow(p: ProducerProfile) {
  return {
    user_id: p.userId,
    producer_name: p.producerName,
    username: p.username,
    bio: p.bio,
    country: p.country,
    city: p.city,
    avatar_url: p.avatarUrl,
    banner_url: p.bannerUrl,
    instagram: p.instagram,
    tiktok: p.tiktok,
    youtube: p.youtube,
    spotify: p.spotify,
    website: p.website,
    brand_color: p.brandColor,
    producer_tag: p.producerTag,
    logo_url: p.logoUrl,
  };
}

export function useProducerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("producer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile(data ? fromRow(data) : null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}

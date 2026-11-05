
-- account type enum
CREATE TYPE public.account_type AS ENUM ('artist', 'producer');

-- profiles table (one row per auth user)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text NOT NULL DEFAULT '',
  account_type public.account_type NOT NULL DEFAULT 'artist',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- producer profiles
CREATE TABLE public.producer_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_name text NOT NULL,
  username text NOT NULL UNIQUE,
  bio text DEFAULT '',
  country text DEFAULT '',
  city text DEFAULT '',
  avatar_url text,
  banner_url text,
  instagram text,
  tiktok text,
  youtube text,
  spotify text,
  website text,
  brand_color text NOT NULL DEFAULT 'oklch(0.8 0.155 72)',
  producer_tag text NOT NULL DEFAULT '',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.producer_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producer_profiles TO authenticated;
GRANT ALL ON public.producer_profiles TO service_role;
ALTER TABLE public.producer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Producer profiles are public" ON public.producer_profiles FOR SELECT USING (true);
CREATE POLICY "Producer can insert own" ON public.producer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Producer can update own" ON public.producer_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- beats
CREATE TABLE public.beats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  genre text NOT NULL,
  mood text,
  bpm int NOT NULL DEFAULT 120,
  key text NOT NULL DEFAULT 'C maj',
  tags text[] NOT NULL DEFAULT '{}',
  cover_url text,
  audio_url text,
  duration int NOT NULL DEFAULT 0,
  plays int NOT NULL DEFAULT 0,
  licenses jsonb NOT NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.beats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beats TO authenticated;
GRANT ALL ON public.beats TO service_role;
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published beats are public" ON public.beats FOR SELECT USING (published = true OR auth.uid() = producer_id);
CREATE POLICY "Producers can insert own beats" ON public.beats FOR INSERT WITH CHECK (auth.uid() = producer_id);
CREATE POLICY "Producers can update own beats" ON public.beats FOR UPDATE USING (auth.uid() = producer_id) WITH CHECK (auth.uid() = producer_id);
CREATE POLICY "Producers can delete own beats" ON public.beats FOR DELETE USING (auth.uid() = producer_id);
CREATE INDEX beats_producer_idx ON public.beats(producer_id);
CREATE INDEX beats_created_idx ON public.beats(created_at DESC);

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  producer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_type text NOT NULL,
  license_name text NOT NULL,
  price numeric(10,2) NOT NULL,
  contract_snapshot text NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers see their orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Producers see their sales" ON public.orders FOR SELECT USING (auth.uid() = producer_id);
CREATE POLICY "Buyers create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER producer_profiles_updated BEFORE UPDATE ON public.producer_profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER beats_updated BEFORE UPDATE ON public.beats FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'artist')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage RLS: public read for our three buckets; owner-only writes.
CREATE POLICY "Public read beat-covers" ON storage.objects FOR SELECT USING (bucket_id = 'beat-covers');
CREATE POLICY "Auth can upload beat-covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'beat-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner update beat-covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'beat-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner delete beat-covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'beat-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read beat-audio" ON storage.objects FOR SELECT USING (bucket_id = 'beat-audio');
CREATE POLICY "Auth can upload beat-audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'beat-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner update beat-audio" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'beat-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner delete beat-audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'beat-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

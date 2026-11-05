CREATE TABLE IF NOT EXISTS public.producer_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (producer_id, follower_id)
);
GRANT SELECT ON public.producer_followers TO anon;
GRANT SELECT, INSERT, DELETE ON public.producer_followers TO authenticated;
GRANT ALL ON public.producer_followers TO service_role;
ALTER TABLE public.producer_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followers_public_read" ON public.producer_followers FOR SELECT USING (true);
CREATE POLICY "followers_insert_own" ON public.producer_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "followers_delete_own" ON public.producer_followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS public.beat_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (beat_id, user_id)
);
GRANT SELECT ON public.beat_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.beat_likes TO authenticated;
GRANT ALL ON public.beat_likes TO service_role;
ALTER TABLE public.beat_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beat_likes_public_read" ON public.beat_likes FOR SELECT USING (true);
CREATE POLICY "beat_likes_insert_own" ON public.beat_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "beat_likes_delete_own" ON public.beat_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
BEGIN
  SELECT COALESCE(p.name, 'Someone') INTO actor_name FROM public.profiles p WHERE p.id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
  VALUES (NEW.producer_id, NEW.follower_id, 'follow', 'New follower',
          COALESCE(actor_name, 'Someone') || ' followed you', '/producer/dashboard');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.producer_followers;
CREATE TRIGGER trg_notify_on_follow AFTER INSERT ON public.producer_followers
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

CREATE OR REPLACE FUNCTION public.notify_on_beat_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
  b RECORD;
BEGIN
  SELECT producer_id, title INTO b FROM public.beats WHERE id = NEW.beat_id;
  IF b.producer_id IS NULL OR b.producer_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(p.name, 'Someone') INTO actor_name FROM public.profiles p WHERE p.id = NEW.user_id;
  INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
  VALUES (b.producer_id, NEW.user_id, 'like', 'New like',
          COALESCE(actor_name, 'Someone') || ' liked your beat "' || b.title || '"',
          '/beat/' || NEW.beat_id::text);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_on_beat_like ON public.beat_likes;
CREATE TRIGGER trg_notify_on_beat_like AFTER INSERT ON public.beat_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_beat_like();
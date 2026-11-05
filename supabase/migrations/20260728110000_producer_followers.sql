-- Producer followers table
-- Artists can follow producers to get notified of new beats and updates.

CREATE TABLE IF NOT EXISTS public.producer_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(producer_id, follower_id)
);

GRANT SELECT ON public.producer_followers TO anon;
GRANT SELECT, INSERT, DELETE ON public.producer_followers TO authenticated;
GRANT ALL ON public.producer_followers TO service_role;

ALTER TABLE public.producer_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follower counts" ON public.producer_followers
  FOR SELECT USING (true);

CREATE POLICY "Users can follow producers" ON public.producer_followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow producers" ON public.producer_followers
  FOR DELETE USING (auth.uid() = follower_id);

CREATE INDEX producer_followers_producer_idx ON public.producer_followers(producer_id);
CREATE INDEX producer_followers_follower_idx ON public.producer_followers(follower_id);

-- Also map orders status 'paid' to equivalent of 'completed' for clarity
-- We leave 'paid' as a valid status but add a view that normalizes it.
CREATE OR REPLACE VIEW public.orders_with_status AS
  SELECT *,
    CASE
      WHEN status IN ('paid', 'completed', 'delivered') THEN 'completed'
      ELSE 'pending'
    END AS display_status
  FROM public.orders;

GRANT SELECT ON public.orders_with_status TO authenticated;
GRANT ALL ON public.orders_with_status TO service_role;

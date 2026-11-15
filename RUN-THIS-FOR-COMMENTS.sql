-- =====================================================
-- BEAT COMMENTS TABLE SETUP
-- Run this in Lovable / Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS public.beat_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id     uuid NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 1000),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beat_comments_beat ON public.beat_comments(beat_id);
CREATE INDEX IF NOT EXISTS idx_beat_comments_user ON public.beat_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_beat_comments_created ON public.beat_comments(created_at DESC);

ALTER TABLE public.beat_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.beat_comments;
CREATE POLICY "Anyone can view comments"
  ON public.beat_comments FOR SELECT USING (true);

-- Only signed-in users can post
DROP POLICY IF EXISTS "Authenticated users can post comments" ON public.beat_comments;
CREATE POLICY "Authenticated users can post comments"
  ON public.beat_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON public.beat_comments;
CREATE POLICY "Users can delete own comments"
  ON public.beat_comments FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.beat_comments TO authenticated;
GRANT SELECT ON public.beat_comments TO anon;

SELECT 'Beat comments table created successfully!' as status;

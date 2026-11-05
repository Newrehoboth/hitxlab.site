-- ============================================================================
-- MIGRATION: Add Daily Beat Plays Tracking
-- Date: July 29, 2026
-- Purpose: Track every beat play with timestamp for accurate daily analytics
-- ============================================================================

-- Create beat_plays_log table for daily play tracking
CREATE TABLE IF NOT EXISTS public.beat_plays_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT ON public.beat_plays_log TO anon;
GRANT SELECT, INSERT, DELETE ON public.beat_plays_log TO authenticated;
GRANT ALL ON public.beat_plays_log TO service_role;

-- Enable RLS (Row Level Security)
ALTER TABLE public.beat_plays_log ENABLE ROW LEVEL SECURITY;

-- Anyone can log a play (anon or authenticated)
CREATE POLICY "Anyone can log plays" ON public.beat_plays_log 
  FOR INSERT 
  WITH CHECK (true);

-- Only authenticated users can view play logs (for analytics)
CREATE POLICY "Authenticated can view plays" ON public.beat_plays_log 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS beat_plays_log_beat_id_idx ON public.beat_plays_log(beat_id);
CREATE INDEX IF NOT EXISTS beat_plays_log_played_at_idx ON public.beat_plays_log(played_at DESC);
CREATE INDEX IF NOT EXISTS beat_plays_log_beat_date_idx ON public.beat_plays_log(beat_id, played_at DESC);

-- ============================================================================
-- VERIFICATION QUERY
-- Run this after migration to verify it worked:
-- ============================================================================
-- SELECT COUNT(*) as table_exists FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'beat_plays_log';
-- 
-- Expected result: table_exists = 1
-- ============================================================================

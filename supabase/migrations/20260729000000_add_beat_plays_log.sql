-- beat_plays_log table for daily play tracking
CREATE TABLE public.beat_plays_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT ON public.beat_plays_log TO anon;
GRANT SELECT, INSERT, DELETE ON public.beat_plays_log TO authenticated;
GRANT ALL ON public.beat_plays_log TO service_role;

-- Enable RLS
ALTER TABLE public.beat_plays_log ENABLE ROW LEVEL SECURITY;

-- Anyone can log a play (anon or authenticated)
CREATE POLICY "Anyone can log plays" ON public.beat_plays_log FOR INSERT WITH CHECK (true);

-- Only authenticated users can view play logs (for analytics)
CREATE POLICY "Authenticated can view plays" ON public.beat_plays_log FOR SELECT TO authenticated USING (true);

-- Index for faster queries
CREATE INDEX beat_plays_log_beat_id_idx ON public.beat_plays_log(beat_id);
CREATE INDEX beat_plays_log_played_at_idx ON public.beat_plays_log(played_at DESC);
CREATE INDEX beat_plays_log_beat_date_idx ON public.beat_plays_log(beat_id, played_at DESC);

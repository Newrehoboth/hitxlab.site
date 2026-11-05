CREATE TABLE IF NOT EXISTS public.beat_plays_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.beat_plays_log TO anon, authenticated;
GRANT ALL ON public.beat_plays_log TO service_role;
ALTER TABLE public.beat_plays_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can log a play" ON public.beat_plays_log FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "producers read own beat plays" ON public.beat_plays_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.beats b WHERE b.id = beat_plays_log.beat_id AND b.producer_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS beat_plays_log_beat_idx ON public.beat_plays_log(beat_id, played_at DESC);
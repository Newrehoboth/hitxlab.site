
ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS wav_url text,
  ADD COLUMN IF NOT EXISTS stems_url text;

DROP POLICY IF EXISTS "Producers upload their beat files" ON storage.objects;
DROP POLICY IF EXISTS "Producers read their beat files" ON storage.objects;
DROP POLICY IF EXISTS "Producers update their beat files" ON storage.objects;
DROP POLICY IF EXISTS "Producers delete their beat files" ON storage.objects;

CREATE POLICY "Producers upload their beat files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'beat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Producers read their beat files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'beat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Producers update their beat files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'beat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Producers delete their beat files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'beat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

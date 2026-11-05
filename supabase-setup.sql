-- Run this in your Supabase SQL Editor to set up storage

-- ============================================
-- PRODUCER ASSETS BUCKET (Profile & Cover Images)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('producer-assets', 'producer-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for producer assets
CREATE POLICY "Allow authenticated users to upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'producer-assets' AND (storage.foldername(name))[1] = 'profile-pictures');

CREATE POLICY "Allow authenticated users to upload cover banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'producer-assets' AND (storage.foldername(name))[1] = 'cover-banners');

CREATE POLICY "Allow public read access to producer assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'producer-assets');

CREATE POLICY "Allow users to update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'producer-assets' AND owner = auth.uid());

CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'producer-assets' AND owner = auth.uid());

-- ============================================
-- BEAT FILES BUCKET (WAV & STEMS Downloads)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('beat-files', 'beat-files', false, 1610612736)
ON CONFLICT (id) DO NOTHING;

-- Policies for beat files (downloadable files for buyers)
CREATE POLICY "Allow authenticated producers to upload beat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'beat-files');

CREATE POLICY "Allow authenticated users to download beat files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'beat-files');

CREATE POLICY "Allow producers to update their own beat files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'beat-files' AND owner = auth.uid());

CREATE POLICY "Allow producers to delete their own beat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'beat-files' AND owner = auth.uid());

-- ============================================
-- BEAT COVERS BUCKET (Cover Images for Beats)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('beat-covers', 'beat-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for beat covers
CREATE POLICY "Allow authenticated producers to upload beat covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'beat-covers');

CREATE POLICY "Allow public read access to beat covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'beat-covers');

CREATE POLICY "Allow producers to update their own beat covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'beat-covers' AND owner = auth.uid());

CREATE POLICY "Allow producers to delete their own beat covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'beat-covers' AND owner = auth.uid());

-- ============================================
-- BEAT AUDIO BUCKET (Preview MP3 files)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('beat-audio', 'beat-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for beat audio (public preview files)
CREATE POLICY "Allow authenticated producers to upload beat audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'beat-audio');

CREATE POLICY "Allow public read access to beat audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'beat-audio');

CREATE POLICY "Allow producers to update their own beat audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'beat-audio' AND owner = auth.uid());

CREATE POLICY "Allow producers to delete their own beat audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'beat-audio' AND owner = auth.uid());

-- ============================================
-- DATABASE SCHEMA UPDATES
-- ============================================

-- Add WAV and STEMS columns to beats table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'beats' AND column_name = 'wav_url') THEN
        ALTER TABLE beats ADD COLUMN wav_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'beats' AND column_name = 'stems_url') THEN
        ALTER TABLE beats ADD COLUMN stems_url TEXT;
    END IF;
END $$;

-- ============================================================================
-- UPDATE SUPABASE STORAGE FILE SIZE LIMITS
-- Run this in your Supabase SQL Editor after the main setup
-- ============================================================================

-- Update beat-files bucket to allow 1.5GB uploads and sample-pack-files to allow 1GB uploads
UPDATE storage.buckets 
SET file_size_limit = 1610612736  -- 1.5GB = 1610612736 bytes
WHERE id = 'beat-files';

UPDATE storage.buckets 
SET file_size_limit = 1073741824  -- 1GB = 1073741824 bytes
WHERE id = 'sample-pack-files';

-- Verify the changes
SELECT 
  id, 
  name, 
  file_size_limit,
  ROUND(file_size_limit / 1024.0 / 1024.0, 2) as limit_mb,
  ROUND(file_size_limit / 1024.0 / 1024.0 / 1024.0, 2) as limit_gb
FROM storage.buckets 
WHERE id IN ('sample-pack-files', 'beat-files', 'sample-pack-covers', 'sample-pack-previews', 'beat-audio')
ORDER BY name;

-- Expected output after running:
-- sample-pack-files:     1024 MB (1 GB)
-- beat-files:           500 MB
-- sample-pack-covers:   (default, usually 50MB)
-- sample-pack-previews: (default, usually 50MB)
-- beat-audio:           (default, usually 50MB)

-- ============================================================================
-- DONE! Your storage buckets now support larger files
-- ============================================================================

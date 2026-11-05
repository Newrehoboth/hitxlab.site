-- Increase beat-files storage bucket file size limit to 1.5GB (1610612736 bytes)
UPDATE storage.buckets
SET file_size_limit = 1610612736
WHERE id = 'beat-files';

# How to Increase Supabase Storage Upload Limits

## Current Status
✅ **Code updated** - ZIP files can now be up to **1GB** (was 100MB)

## Supabase Storage Settings Required

### Step 1: Increase Storage Bucket File Size Limit
Supabase has a default file size limit that you need to increase in the dashboard.

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `jcnritxaulgwdeardfss`
3. Go to **Storage** → **Policies** 
4. Or go to **Storage** → **Configuration**

### Step 2: Update Storage Configuration

You have two options:

#### Option A: Via SQL (Recommended)
Run this SQL in your Supabase SQL Editor:

```sql
-- Update storage bucket file size limit (in bytes)
-- 1GB = 1073741824 bytes

-- For sample-pack-files bucket
UPDATE storage.buckets 
SET file_size_limit = 1073741824 
WHERE id = 'sample-pack-files';

-- Verify the change
SELECT id, name, file_size_limit, file_size_limit / 1024 / 1024 as "limit_in_MB"
FROM storage.buckets 
WHERE id IN ('sample-pack-files', 'beat-files');
```

#### Option B: Via Supabase Dashboard
1. Go to **Storage** in the left sidebar
2. Click on **sample-pack-files** bucket
3. Click **Settings** or **Configuration**
4. Find **File size limit** setting
5. Change from default (usually 50MB) to **1024 MB** (1GB)
6. Save changes

### Step 3: Also Update Beat Files Bucket (Optional)
If you want to allow larger beat files (stems, etc.), update the `beat-files` bucket too:

```sql
UPDATE storage.buckets 
SET file_size_limit = 524288000  -- 500MB
WHERE id = 'beat-files';
```

## Network/Server Limits

### Important Notes:
1. **Browser Upload Limits**: Large files (1GB) may take several minutes to upload depending on internet speed
2. **Timeout Settings**: You may need to adjust Supabase function timeouts if uploads take too long
3. **Bandwidth**: Large uploads will consume more bandwidth

### If Uploads Still Fail:
If you get timeout errors with large files, you might need to:
1. Use chunked uploads (advanced feature)
2. Or contact Supabase support to increase timeout limits
3. Or implement resumable uploads

## Current File Size Limits (After Update)

| File Type | Limit | Bucket | Used For |
|-----------|-------|--------|----------|
| Cover Image | 5MB | sample-pack-covers | Display |
| Preview MP3 | 10MB | sample-pack-previews | Audio preview |
| ZIP File | **1GB** | sample-pack-files | Main product |
| Beat MP3 | 50MB | beat-audio | Preview |
| Beat WAV | 200MB | beat-files | Download |
| Beat Stems | 500MB | beat-files | Download |

## Testing Large Uploads

After making the changes:
1. Test with a small ZIP first (10MB)
2. Test with a medium ZIP (100MB)
3. Test with a large ZIP (500MB)
4. Finally test with near-max ZIP (900MB)

If any test fails, check:
- Browser console for errors
- Supabase dashboard → Storage → Logs
- Network tab in browser dev tools

## Pro Tips

### For Better User Experience:
1. Show upload progress bar (can be added to the upload form)
2. Add file compression tips for producers
3. Recommend optimal ZIP size (300-500MB is good balance)

### Recommended ZIP Contents:
- **Small Pack** (50-100MB): 20-50 samples
- **Medium Pack** (200-400MB): 100-200 samples
- **Large Pack** (500-800MB): 300-500 samples
- **Mega Pack** (1GB): 500+ samples

---

## Quick Check SQL
Run this to see your current storage limits:

```sql
SELECT 
  id, 
  name, 
  file_size_limit,
  file_size_limit / 1024 / 1024 as limit_mb,
  file_size_limit / 1024 / 1024 / 1024 as limit_gb
FROM storage.buckets 
ORDER BY name;
```

---

**Status**: ✅ Code ready for 1GB uploads
**Action Required**: Update Supabase storage bucket settings (see Step 2 above)

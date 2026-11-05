# Troubleshooting Guide

## 🔥 URGENT: Artist Redirect Issue

**Problem**: Artists are being redirected to `/producer/onboarding` instead of `/artist/dashboard` when logging in.

**Test User**: `mainsitemail09@gmail.com` / `Tochi123!!!`

### Quick Fix Steps:

1. **Open your browser console** (F12 or Cmd+Option+I on Mac)
2. **Clear your session**:
   - Sign out if logged in
   - Clear browser cache
   - Or use incognito/private window
3. **Go to** `/auth` and sign in with the test credentials
4. **Watch the console** - look for messages starting with 🔍

### What the console will tell you:

```
🔍 loadUser - DB data: { account_type: "artist" or "producer" }
🔍 User role: artist or producer
🔍 Routing to: /artist/dashboard or /producer/onboarding
```

### If role shows "producer" instead of "artist":

1. Open your **Supabase SQL Editor**
2. Run this script: `fix-artist-role.sql` (in the project root)
3. The script will:
   - Show you the current role
   - Update it to "artist"
   - Verify the change
4. **Sign out and sign in again**
5. The issue should be fixed

### If console shows "artist" but still redirects wrong:

Send me a screenshot of the full console output - there may be a different issue.

---

# Troubleshooting Guide - Beat Upload & Edit System

## 🔍 Common Issues & Solutions

### Upload Issues

#### Issue: "Failed to upload" error
**Possible Causes:**
1. Storage buckets not created
2. Storage policies missing
3. Network connection issue
4. File format not supported

**Solutions:**
```
1. Check Supabase Dashboard → Storage
   - Verify beat-audio bucket exists
   - Verify beat-covers bucket exists
   - Verify beat-files bucket exists

2. Re-run SQL setup script:
   - Copy entire supabase-setup.sql
   - Run in Supabase SQL Editor
   - Check for error messages

3. Check file formats:
   - Cover: JPG or PNG only
   - Audio: MP3 only
   - WAV: WAV format only
   - STEMS: ZIP format only

4. Check browser console:
   - Press F12 → Console tab
   - Look for red error messages
   - Share error message for help
```

#### Issue: "File too large" error
**Cause:** File exceeds size limits

**Solutions:**
```
Current Limits:
- Cover: 10MB max
- MP3: 50MB max
- WAV: 200MB max
- STEMS ZIP: 500MB max

For Cover Images:
1. Resize image to 2000x2000px or smaller
2. Convert PNG to JPG
3. Reduce JPG quality to 85-90%
4. Use image compression tools

For MP3 Files:
1. Check bitrate (320kbps max recommended)
2. Trim silence from start/end
3. Check file length (should be <7 minutes)
4. Re-export from DAW with lower bitrate

For WAV Files:
1. Use 44.1kHz sample rate (not 96kHz)
2. Use 16-bit depth (not 24-bit)
3. Trim silence
4. Check file length

For STEMS ZIP:
1. Remove unnecessary stems
2. Use lower sample rate for stems (44.1kHz)
3. Consolidate similar tracks
4. Trim silence from all stems
5. Re-compress ZIP file
```

#### Issue: "Authentication required" error
**Cause:** Not logged in or session expired

**Solutions:**
```
1. Check if you're logged in:
   - Look for username in navbar
   - Try refreshing page

2. Log out and log back in:
   - Click profile → Logout
   - Login again
   - Try upload again

3. Clear browser cookies:
   - Clear site data
   - Login again
   - Retry upload
```

### Edit Issues

#### Issue: Can't find edit button
**Cause:** Looking in wrong place or not viewing your own beats

**Solutions:**
```
1. Navigate to /producer/dashboard
2. Click "Beats" tab (not Overview)
3. Look in the table for pencil icon
4. Make sure beats table is not empty
```

#### Issue: "Beat not found" when editing
**Cause:** Beat deleted or ID incorrect

**Solutions:**
```
1. Go back to dashboard
2. Verify beat exists in table
3. Click edit button directly from table
4. Don't modify URL manually
```

#### Issue: "Permission denied" when editing
**Cause:** Trying to edit someone else's beat

**Solutions:**
```
1. Check you're logged in as correct user
2. Verify beat belongs to you
3. producer_id in database must match your user ID

To verify in Supabase:
1. Go to Table Editor → beats
2. Find the beat
3. Check producer_id matches your auth.users.id
```

#### Issue: Changes not saving
**Cause:** Network issue or validation error

**Solutions:**
```
1. Check browser console for errors
2. Verify all required fields filled
3. Check network connection
4. Try again with different browser
5. Check Supabase dashboard for errors
```

### File Management Issues

#### Issue: Old files not deleted after edit
**Cause:** This should be automatic - check storage

**Verification:**
```
1. Note file path before edit
2. Upload new file
3. Check Supabase Storage
4. Old file should be gone
5. New file should be present

If old file remains:
- This is a bug
- Manual cleanup: Go to Storage → delete old file
- Report issue for investigation
```

#### Issue: Can't download uploaded files
**Cause:** Storage policies or file doesn't exist

**Solutions:**
```
1. Check file exists in Storage:
   - Supabase Dashboard → Storage
   - Navigate to appropriate bucket
   - Verify file is present

2. Check storage policies:
   - Re-run SQL setup script
   - Verify policies created

3. For private files (WAV, STEMS):
   - Must be authenticated
   - Download links need signed URLs
```

### STEMS ZIP Issues

#### Issue: "Invalid file type" for STEMS
**Cause:** Not uploading a ZIP file

**Solutions:**
```
1. Make sure file is actually .zip
2. Don't upload folder or RAR file
3. Don't upload individual WAV files

How to create ZIP:
- Mac: Select files → Right-click → Compress
- Windows: Select files → Send to → Compressed folder
- Make sure resulting file ends in .zip
```

#### Issue: ZIP file too large (>500MB)
**Solutions:**
```
1. Remove unnecessary stems
2. Use 44.1kHz/16-bit for stems (not 96kHz/24-bit)
3. Consolidate similar tracks
4. Trim silence from all stems
5. Consider splitting into multiple beats if too many stems
```

#### Issue: Buyers can't extract ZIP
**Cause:** Corrupted or improperly created ZIP

**Solutions:**
```
1. Test ZIP yourself before upload:
   - Download the ZIP
   - Extract it
   - Verify all files present

2. Use standard ZIP compression:
   - No password protection
   - No special compression algorithms
   - Standard ZIP format

3. Include README.txt in ZIP:
   - List all stems included
   - Provide usage instructions
   - Note sample rate and bit depth
```

### Database Issues

#### Issue: wav_url or stems_url columns missing
**Cause:** SQL setup not run or failed

**Solutions:**
```
1. Go to Supabase → Table Editor → beats
2. Check if wav_url and stems_url columns exist
3. If missing, run SQL setup script:
   - Copy supabase-setup.sql
   - Run in SQL Editor
   - Verify success message

4. Check for errors in script execution:
   - Read error message carefully
   - Fix any syntax issues
   - Re-run script
```

#### Issue: TypeScript errors about wav_url/stems_url
**Cause:** Database types not regenerated

**This is expected** - we're using type assertions to bypass this temporarily.

**Not an issue** - runtime works correctly even with TypeScript warnings.

**To fix properly (optional):**
```
1. Regenerate Supabase types:
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts

2. Restart dev server
3. TypeScript errors should resolve
```

### Storage Issues

#### Issue: Storage quota exceeded
**Cause:** Too many files uploaded

**Solutions:**
```
1. Check storage usage:
   - Supabase Dashboard → Settings → Billing
   - View storage usage

2. Delete old/unused beats:
   - Dashboard → Beats → Delete button
   - This also deletes associated files

3. Clean up orphaned files:
   - Go to Storage
   - Manually delete files not in database
   - Check for duplicate files

4. Upgrade plan if needed:
   - Supabase has storage limits
   - Consider paid plan for more storage
```

#### Issue: Slow upload speeds
**Cause:** Large files or slow connection

**Solutions:**
```
1. Check internet connection
2. Compress files before upload
3. Upload during off-peak hours
4. Try different network
5. Use wired connection instead of WiFi

For large STEMS:
- Consider splitting into multiple smaller ZIPs
- Use lower sample rates (44.1kHz sufficient)
- Compress stems individually before ZIP
```

### UI/UX Issues

#### Issue: File upload button not working
**Cause:** JavaScript error or browser issue

**Solutions:**
```
1. Check browser console for errors
2. Try different browser
3. Disable browser extensions
4. Clear browser cache
5. Try incognito/private mode
```

#### Issue: Preview image not showing
**Cause:** Image format or display issue

**Solutions:**
```
1. Check image format (JPG or PNG)
2. Verify image is not corrupted
3. Try different image
4. Check browser console for errors
5. Refresh page
```

#### Issue: Step navigation not working
**Cause:** Validation or JavaScript error

**Solutions:**
```
1. Fill all required fields
2. Check for validation errors
3. Look for red error messages
4. Check browser console
5. Try refreshing page
```

### Performance Issues

#### Issue: Page loads slowly
**Cause:** Large files or slow query

**Solutions:**
```
1. Check number of beats in database
2. Consider pagination for large catalogs
3. Optimize images before upload
4. Check Supabase query performance
5. Enable caching if available
```

#### Issue: Save takes long time
**Cause:** Large files uploading

**This is normal** for large files (200-500MB).

**Expected times:**
- Cover (10MB): 2-5 seconds
- MP3 (50MB): 5-15 seconds
- WAV (200MB): 20-60 seconds
- STEMS ZIP (500MB): 60-180 seconds

**Tips:**
- Don't close browser while uploading
- Watch loading spinner
- Wait for success message
- Don't click save multiple times

## 🔧 Debugging Tools

### Browser Console
```
1. Press F12 (or Cmd+Option+I on Mac)
2. Click "Console" tab
3. Look for red error messages
4. Take screenshot of errors
5. Share for troubleshooting
```

### Network Tab
```
1. Press F12
2. Click "Network" tab
3. Try upload/save action
4. Look for failed requests (red)
5. Click failed request
6. Check "Response" tab for error details
```

### Supabase Logs
```
1. Go to Supabase Dashboard
2. Click "Logs" in sidebar
3. Filter by:
   - Storage logs (for upload issues)
   - Database logs (for save issues)
   - API logs (for general errors)
4. Look for errors around time of issue
```

## 📋 Diagnostic Checklist

When troubleshooting, check:

### Setup Verification:
- [ ] SQL setup script ran successfully
- [ ] All 4 storage buckets exist
- [ ] Storage policies created
- [ ] Database columns added (wav_url, stems_url)
- [ ] User is authenticated
- [ ] User has producer role

### File Verification:
- [ ] File format is correct
- [ ] File size is under limit
- [ ] File is not corrupted
- [ ] File name has no special characters

### Code Verification:
- [ ] No TypeScript errors (except known wav_url/stems_url)
- [ ] Dev server running
- [ ] No browser console errors
- [ ] Network requests succeeding

### Storage Verification:
- [ ] Files appear in correct bucket
- [ ] File paths in database correct
- [ ] No duplicate files
- [ ] Storage quota not exceeded

## 🆘 Still Having Issues?

### Information to Provide:
1. **Error message** (exact text or screenshot)
2. **Browser console log** (screenshot)
3. **Steps to reproduce** (what you did)
4. **Expected vs actual behavior**
5. **File types and sizes** you're uploading
6. **Browser and version** you're using

### Quick Fixes to Try:
1. ✅ Refresh the page
2. ✅ Clear browser cache
3. ✅ Try different browser
4. ✅ Log out and log back in
5. ✅ Re-run SQL setup script
6. ✅ Check Supabase dashboard for errors
7. ✅ Verify file formats and sizes
8. ✅ Check internet connection

### Last Resort:
```sql
-- Reset beats table (WARNING: Deletes all beats!)
DELETE FROM beats WHERE producer_id = 'YOUR_USER_ID';

-- Clean up storage (manual)
-- Go to Supabase Storage → Delete all files in each bucket

-- Re-run SQL setup
-- Copy supabase-setup.sql → Run in SQL Editor

-- Try upload fresh beat
```

## 📚 Additional Resources

- **QUICK-START.md** - Basic setup guide
- **SETUP-INSTRUCTIONS.md** - Detailed setup
- **UPLOAD-GUIDE.md** - Upload system details
- **EDIT-BEATS-GUIDE.md** - Edit functionality
- **FILE-SIZE-LIMITS.md** - File size reference

---

**Most issues are resolved by re-running the SQL setup script and verifying authentication!** 🔧

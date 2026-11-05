# Edit Beats Guide

## Overview
Producers can now edit their uploaded beats to update information, replace files, and modify licensing terms.

## How to Access Edit Page

### From Producer Dashboard:
1. Navigate to `/producer/dashboard`
2. Go to the "Beats" tab
3. Find the beat you want to edit in the table
4. Click the **pencil icon** (edit button) in the actions column
5. You'll be redirected to `/producer/edit/{beat-id}`

## What Can Be Edited

### Step 1: Beat Information
- Title
- Description
- Genre
- Mood
- Key
- Tempo (BPM)
- Tags (comma-separated)

### Step 2: Update Files (Optional)
All file uploads are **optional** in edit mode:
- **Leave empty** to keep existing files
- **Upload new file** to replace the old one

**Files You Can Replace:**
- Cover artwork (existing cover shown as preview)
- Preview MP3 audio
- WAV file (downloadable)
- STEMS ZIP file (downloadable - must be a ZIP containing track stems)

**Important Notes:**
- When you upload a new file, the old file is automatically deleted from storage
- File size limits: Cover (10MB), MP3 (50MB), WAV (200MB), STEMS ZIP (500MB)
- You can replace individual files without touching others
- STEMS must be uploaded as a ZIP file containing individual track stems

### Step 3: Licensing
- Edit license prices
- Update streaming/distribution limits
- Modify license agreement text
- All three license tiers can be edited

## Security & Permissions

### Ownership Check:
- Only the producer who owns the beat can edit it
- If you try to edit someone else's beat, you'll see an error
- Beat ownership is verified using `producer_id` from database

### File Management:
- Old files are deleted when new ones are uploaded
- This prevents storage bloat
- Deletion happens automatically in the save process

## Edit Flow Example

### Scenario 1: Update Just the Title and BPM
1. Click edit on a beat
2. Step 1: Change title from "Dark Trap" to "Midnight Trap"
3. Change BPM from 140 to 145
4. Step 2: Don't upload any files (skip)
5. Step 3: Keep licenses as-is
6. Click "Save changes"
7. ✅ Only title and BPM updated, all files remain unchanged

### Scenario 2: Replace the Cover Image
1. Click edit on a beat
2. Step 1: Keep info as-is
3. Step 2: Upload new cover image (old one shows as preview)
4. Other files: leave empty
5. Step 3: Skip
6. Click "Save changes"
7. ✅ Old cover deleted, new cover uploaded, everything else unchanged

### Scenario 3: Add WAV File to Existing Beat
1. Click edit on a beat that has no WAV file
2. Step 1: Skip
3. Step 2: Upload WAV file
4. Don't touch MP3 or cover
5. Step 3: Skip
6. Click "Save changes"
7. ✅ WAV file now available for download, existing files untouched

### Scenario 4: Full Update
1. Click edit
2. Step 1: Update title, genre, tags
3. Step 2: Replace cover and add STEMS
4. Step 3: Increase Premium license price
5. Click "Save changes"
7. ✅ All changes applied, old files cleaned up

## Technical Details

### File Handling:
```typescript
// Files are only updated if new ones are uploaded
if (audioFile) {
  // Upload new file
  const newPath = uploadToStorage(audioFile);
  // Delete old file
  await deleteFromStorage(beat.audioUrl);
  // Update database
  updates.audio_url = newPath;
}
// If audioFile is null, existing file is kept
```

### Database Updates:
- Only changed fields are sent to database
- Licenses are updated as complete object
- Duration is recalculated if new audio uploaded

### Storage Cleanup:
- Old files are explicitly deleted from storage
- Prevents abandoned files accumulating
- Applies to all file types (cover, audio, WAV, STEMS)

## UI Features

### Visual Indicators:
- Current cover image shown as preview
- Tip box explaining files are optional
- File size limits shown in hints
- Error messages for oversized files

### Navigation:
- Three-step wizard (same as upload)
- "Back" button to go to previous step or dashboard
- "Continue" button to advance
- "Save changes" button on final step
- Progress indicators at top

### Loading States:
- Spinner while loading existing beat data
- "Saving..." state during save operation
- Error messages for permission issues

## Best Practices

### When to Edit:
- Correct typos in title or description
- Update tags for better discoverability
- Adjust pricing based on market feedback
- Replace low-quality cover with better artwork
- Add WAV/STEMS files you forgot initially
- Fix incorrect BPM or key information

### What NOT to Edit:
- Don't completely change the beat genre (confuses existing customers)
- Don't drastically raise prices after sales (unfair to previous buyers)
- Don't replace audio files with completely different beats
- Consider these as "different beats" that should be uploaded fresh

### File Management Tips:
1. **Only upload new files when needed** - saves bandwidth
2. **Test file sizes first** - avoid failed uploads
3. **Keep filenames clean** - special characters are removed
4. **Verify changes** - check beat page after saving
5. **Backup files locally** - old files are deleted permanently

## Troubleshooting

### "Beat not found" Error
- Beat might have been deleted
- Check beat ID in URL is correct
- Try refreshing from dashboard

### "Permission denied" Error
- You're not the owner of this beat
- Check you're logged in as the correct producer
- Beat might belong to different account

### "Save failed" Error
- File size might be too large
- Network connection issue
- Check browser console for details
- Try saving again or reduce file sizes

### Files Not Updating
- Make sure you're uploading new files
- Check file format matches accepted types
- Clear browser cache
- Verify storage buckets exist in Supabase

## Future Enhancements

Planned features for edit functionality:
- [ ] Bulk edit multiple beats
- [ ] Version history (track changes)
- [ ] Preview changes before saving
- [ ] Unpublish/draft mode
- [ ] Duplicate beat feature
- [ ] Analytics on edit page (views, sales)
- [ ] A/B testing different covers
- [ ] Schedule price changes

## Related Documentation

- **Upload Guide**: See `UPLOAD-GUIDE.md` for file type details
- **Setup Instructions**: See `SETUP-INSTRUCTIONS.md` for initial setup
- **SQL Schema**: See `supabase-setup.sql` for database structure

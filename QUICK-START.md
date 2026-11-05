# Quick Start Guide - Beat Upload & Edit System

## 🚀 Get Started in 5 Minutes

### Step 1: Run SQL Setup (2 minutes)
```sql
1. Open Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to SQL Editor (left sidebar)
4. Click "New Query"
5. Copy ENTIRE content from supabase-setup.sql
6. Click "Run" or press Cmd+Enter
7. Wait for success message
```

**What this does:**
- Creates 4 storage buckets (producer-assets, beat-audio, beat-covers, beat-files)
- Sets up storage policies for uploads/downloads
- Adds wav_url and stems_url columns to beats table

### Step 2: Test Upload (2 minutes)
```
1. Start your dev server (if not running)
2. Navigate to: http://localhost:8083/producer/upload
3. Fill in Step 1: Beat info (title, genre, BPM, etc.)
4. Click Continue

5. Fill in Step 2: Upload files
   - Cover image (JPG/PNG, max 10MB) ✅ Required
   - Preview MP3 (max 50MB) ✅ Required
   - WAV file (max 200MB) ⭕ Optional
   - STEMS ZIP (max 500MB) ⭕ Optional

6. Click Continue

7. Fill in Step 3: Set license prices
8. Click "Publish beat"
```

### Step 3: Verify Upload (1 minute)
```
1. Go to Supabase Dashboard → Storage
2. Check these buckets have files:
   ✅ beat-audio → Your MP3
   ✅ beat-covers → Your cover image
   ✅ beat-files → WAV and/or STEMS (if uploaded)

3. Go to Table Editor → beats table
4. Find your beat, check columns:
   ✅ audio_url
   ✅ cover_url
   ✅ wav_url (if uploaded)
   ✅ stems_url (if uploaded)
```

### Step 4: Test Edit (1 minute)
```
1. Go to: http://localhost:8083/producer/dashboard
2. Click "Beats" tab
3. Find your beat in the table
4. Click the pencil icon (edit button)
5. Change the title or BPM
6. Click through steps and "Save changes"
7. Verify changes appear in dashboard
```

## ✅ Success Checklist

After setup, you should be able to:
- [ ] Upload a beat with MP3 and cover
- [ ] Upload optional WAV file
- [ ] Upload STEMS as a ZIP file (500MB max)
- [ ] See files in Supabase storage
- [ ] Edit beat information
- [ ] Replace files (old ones auto-deleted)
- [ ] View beats in dashboard
- [ ] Delete beats from dashboard

## 📦 File Requirements Summary

### Required Files:
1. **Cover Image**: JPG or PNG, max 10MB, square aspect ratio recommended
2. **Preview MP3**: MP3 format, max 50MB, should be tagged/watermarked

### Optional Files:
3. **WAV File**: High-quality WAV, max 200MB, untagged for buyers
4. **STEMS ZIP**: ZIP file containing track stems, max 500MB

## 🎯 What is STEMS (ZIP)?

**STEMS** = Individual audio tracks from your beat production

### Example:
```
my-beat-stems.zip
├── kick.wav
├── 808.wav
├── snare.wav
├── hi-hats.wav
├── melody.wav
├── bass.wav
└── fx.wav
```

### How to Create STEMS ZIP:
1. Export individual tracks from your DAW (FL Studio, Ableton, etc.)
2. Name files clearly (kick.wav, snare.wav, etc.)
3. Select all WAV files
4. Right-click → Compress (Mac) or Send to → Compressed folder (Windows)
5. Upload the resulting ZIP file

## 🎨 File Size Tips

### If Files Are Too Large:

**Cover Image (>10MB):**
- Resize to 2000x2000px or 1500x1500px
- Use JPG instead of PNG
- Reduce quality to 85-90%

**MP3 (>50MB):**
- Reduce bitrate to 320kbps (max)
- Check file length (5-7 min max recommended)
- Re-export from DAW

**WAV (>200MB):**
- Use 44.1kHz sample rate (not 96kHz)
- Use 16-bit depth (not 24-bit)
- Trim silence from start/end

**STEMS ZIP (>500MB):**
- Remove unnecessary stems
- Use 44.1kHz/16-bit for stems
- Consolidate similar tracks
- Trim silence from stems

## 🔥 Common Issues & Fixes

### Issue: "Beat files bucket not found"
**Fix**: Run the SQL setup script in Supabase

### Issue: "File too large" error
**Fix**: Check file sizes match limits above

### Issue: "Permission denied"
**Fix**: Make sure you're logged in as a producer

### Issue: Can't see edit button
**Fix**: Make sure you're in the "Beats" tab on dashboard

### Issue: Old files not deleted
**Fix**: This is automatic - check Supabase storage to verify

### Issue: STEMS upload fails
**Fix**: Make sure it's a ZIP file, not a folder or individual WAV files

## 📱 Mobile Testing

The upload and edit pages work on mobile:
- Responsive layout
- Touch-friendly file upload
- Mobile-optimized forms

Test on:
- [ ] iPhone/iOS Safari
- [ ] Android Chrome
- [ ] iPad/tablet

## 🎓 Learning Resources

### New to Beat Selling?
1. Read UPLOAD-GUIDE.md for detailed explanations
2. Check FILE-SIZE-LIMITS.md for file size details
3. Review EDIT-BEATS-GUIDE.md for editing tips

### Technical Details?
1. See SETUP-INSTRUCTIONS.md for architecture
2. Check supabase-setup.sql for database structure
3. Read CHANGES-SUMMARY.md for full changelog

## 🎉 You're Ready!

You now have a complete beat marketplace with:
- ✅ Professional file upload system
- ✅ Multiple file type support (MP3, WAV, STEMS)
- ✅ Edit functionality for all beats
- ✅ File size validation
- ✅ Automatic file cleanup
- ✅ Producer dashboard with management tools

## 🚀 Next Steps

### Immediate:
1. Upload 3-5 test beats
2. Test editing each one
3. Verify files in Supabase storage

### Short-term:
1. Add real beat content
2. Set appropriate pricing
3. Test on mobile devices

### Long-term:
1. Implement purchase flow
2. Add download functionality for buyers
3. Track downloads and analytics

## 💡 Pro Tips

1. **Tag your MP3s** - Add audio watermarks to preview files
2. **High-quality covers** - First impression matters
3. **Organize STEMS** - Clear file names help buyers
4. **Test downloads** - Make sure ZIPs extract correctly
5. **Monitor storage** - Check Supabase dashboard regularly
6. **Price strategically** - Higher tiers = more files (WAV + STEMS)

## 📞 Need Help?

Check these docs in order:
1. **QUICK-START.md** (this file) - Basic setup
2. **SETUP-INSTRUCTIONS.md** - Detailed setup guide
3. **UPLOAD-GUIDE.md** - Upload system details
4. **EDIT-BEATS-GUIDE.md** - Edit functionality
5. **FILE-SIZE-LIMITS.md** - File size reference
6. **CHANGES-SUMMARY.md** - Complete changelog

## ⚡ Quick Commands

```bash
# Start dev server
npm run dev

# Check for TypeScript errors
npm run build

# View Supabase logs
# Go to: https://app.supabase.com → Logs
```

## 🎯 Success Metrics

After setup, measure:
- ✅ Upload success rate (should be 100%)
- ✅ Edit success rate (should be 100%)
- ✅ File storage usage (monitor in Supabase)
- ✅ Average upload time (should be <30 seconds)
- ✅ User experience (test with real producers)

---

**Happy Beat Selling! 🎵**

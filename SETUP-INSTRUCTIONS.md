# Setup Instructions for Beat Upload Feature

## ✅ What's Been Implemented

### 1. Upload Page Updates
- **File Types Supported**:
  - **Preview MP3** (required): Tagged audio for streaming preview
  - **Cover Image** (required): Beat artwork
  - **WAV File** (optional): High-quality untagged download
  - **STEMS ZIP** (optional): Trackout stems for buyers

- **File Size Validation**:
  - Cover: 10MB max
  - MP3: 50MB max
  - WAV: 200MB max
  - STEMS (ZIP): 500MB max

- **User Experience**:
  - Clear file size hints in UI
  - Real-time validation with error messages
  - Visual preview for cover images
  - Organized layout with "Downloadable Files" section

### 2. Edit Beat Page (NEW)
- **Route**: `/producer/edit/$id`
- **Features**:
  - Load existing beat data for editing
  - Update beat information (title, genre, BPM, etc.)
  - Replace files optionally (keep existing if not uploaded)
  - Edit license prices and terms
  - Permission check (only beat owner can edit)
  - Old files are deleted when new ones are uploaded
  - Three-step process matching upload flow

- **Access**:
  - Edit button (pencil icon) in producer dashboard beat table
  - Loads all existing data into form
  - Shows existing cover preview

### 3. Producer Dashboard Updates
- **New Actions**:
  - Edit button (pencil icon) for each beat
  - Delete button (trash icon) for each beat
  - Both actions positioned in the last column
  - Edit navigates to `/producer/edit/$id`

### 4. Database Schema
- Added `wav_url` column to beats table
- Added `stems_url` column to beats table
- These store the file paths for downloadable content

### 3. Storage Buckets
The SQL script creates 4 storage buckets:
- `producer-assets`: Profile pictures & cover banners (public)
- `beat-audio`: Preview MP3 files (public)
- `beat-covers`: Beat artwork (public)
- `beat-files`: WAV & STEMS downloads (private, authenticated only)

## 🚀 Next Steps for You

### Step 1: Run SQL Setup
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the entire content from `supabase-setup.sql`
4. Paste and run it in the SQL Editor
5. Verify no errors appear

This will create:
- All 4 storage buckets
- Storage policies for uploads and downloads
- Database columns for wav_url and stems_url

### Step 2: Test Upload Flow
1. Navigate to `/producer/upload` in your app
2. Fill in beat information (Step 1)
3. Upload files (Step 2):
   - Upload a cover image (see preview)
   - Upload an MP3 file (required)
   - Optionally upload WAV file
   - Optionally upload STEMS ZIP
4. Set licensing (Step 3)
5. Click "Publish beat"

### Step 3: Verify Storage
After uploading, check your Supabase Dashboard:
1. Go to **Storage**
2. Check each bucket has files:
   - `beat-audio`: Your MP3 preview
   - `beat-covers`: Your cover image
   - `beat-files`: Your WAV/STEMS (if uploaded)

### Step 4: Verify Database
1. Go to **Table Editor** → `beats` table
2. Find your newly created beat
3. Verify columns are populated:
   - `audio_url`: Path to MP3
   - `cover_url`: Path to image
   - `wav_url`: Path to WAV (if uploaded)
   - `stems_url`: Path to STEMS (if uploaded)

## 📁 File Structure Explanation

```
Beat Upload Flow:
┌─────────────────────────────────────┐
│ Producer uploads files              │
├─────────────────────────────────────┤
│ 1. Preview MP3 (tagged)             │ → beat-audio (public)
│ 2. Cover image                      │ → beat-covers (public)
│ 3. WAV file (optional)              │ → beat-files (private)
│ 4. STEMS ZIP (optional)             │ → beat-files (private)
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Buyer views beat                    │
├─────────────────────────────────────┤
│ - Sees cover image (public)         │
│ - Plays preview MP3 (public)        │
│ - Sees license options              │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ After Purchase                      │
├─────────────────────────────────────┤
│ - Downloads WAV (authenticated)     │
│ - Downloads STEMS (authenticated)   │
└─────────────────────────────────────┘
```

## 🔐 Security Notes

- **Preview files (MP3, covers)**: Public access for streaming/viewing
- **Downloadable files (WAV, STEMS)**: Private, require authentication
- **File size limits**: Enforced at UI and storage level
- **Upload permissions**: Only authenticated producers can upload
- **Download permissions**: Only authenticated users (future: only buyers)

## 🛠️ Future Enhancements

To complete the purchase flow, you'll need to:
1. Create a purchases table linking users to beats
2. Add download functionality that checks purchase status
3. Generate signed URLs for authenticated downloads
4. Track download counts/limits per license

## 📝 Important Files

- **Upload Page**: `/src/routes/producer/upload.tsx`
- **Edit Page**: `/src/routes/producer/edit.$id.tsx` (NEW)
- **Dashboard**: `/src/routes/producer/dashboard.tsx` (updated with edit button)
- **SQL Setup**: `/supabase-setup.sql`
- **Upload Guide**: `/UPLOAD-GUIDE.md` (detailed documentation)
- **This File**: `/SETUP-INSTRUCTIONS.md` (step-by-step setup)

## ❓ Troubleshooting

### "Upload failed" error
- Make sure you've run the SQL setup script
- Check Supabase storage is enabled
- Verify authentication is working

### "File too large" error
- Check file sizes match the limits
- Compress files if needed
- WAV files can be large - ensure under 100MB

### Files not appearing in storage
- Check storage policies are created
- Verify user is authenticated
- Check browser console for errors

## ✅ Checklist

- [ ] Run `supabase-setup.sql` in Supabase SQL Editor
- [ ] Verify all 4 storage buckets are created
- [ ] Test uploading a beat with all file types
- [ ] Check files appear in storage buckets
- [ ] Verify database columns are populated
- [ ] Test file size validation works
- [ ] Confirm error messages display correctly
- [ ] Test editing a beat (click pencil icon in dashboard)
- [ ] Verify edit page loads existing beat data
- [ ] Test updating beat info without changing files
- [ ] Test replacing files (old files should be deleted)
- [ ] Confirm changes save correctly

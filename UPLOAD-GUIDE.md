# Beat Upload Guide

## Overview
Producers can upload beats with multiple file types for different purposes. The platform handles preview files separately from downloadable purchase files.

## File Types Explained

### 1. **Preview MP3** (Required)
- **Purpose**: Streaming preview for potential buyers
- **Format**: MP3 (audio/mpeg)
- **Max Size**: 50MB
- **Notes**: This file should be tagged/watermarked to prevent unauthorized use
- **Storage**: `beat-audio` bucket (public)
- **Database**: Stored in `audio_url` column

### 2. **Artwork/Cover Image** (Required)
- **Purpose**: Beat cover art displayed on cards and player
- **Format**: JPG, PNG (image/*)
- **Max Size**: 10MB
- **Notes**: Square images work best (1:1 aspect ratio)
- **Storage**: `beat-covers` bucket (public)
- **Database**: Stored in `cover_url` column

### 3. **WAV File** (Optional)
- **Purpose**: High-quality untagged file for download after purchase
- **Format**: WAV (audio/wav, audio/x-wav)
- **Max Size**: 200MB
- **Notes**: Untagged, full quality audio file
- **Storage**: `beat-files` bucket (private, authenticated access only)
- **Database**: Stored in `wav_url` column

### 4. **STEMS (ZIP)** (Optional)
- **Purpose**: Trackout stems for professional mixing/production after purchase
- **Format**: ZIP (application/zip)
- **Max Size**: 500MB
- **Notes**: Should contain individual track stems (drums, bass, melody, etc.) packaged as a ZIP file
- **Storage**: `beat-files` bucket (private, authenticated access only)
- **Database**: Stored in `stems_url` column

## Upload Flow

### Step 1: Beat Information
- Enter title, description, genre, mood, BPM, key, and tags
- This metadata helps buyers discover your beats

### Step 2: Upload Files
1. Upload artwork (required) - displays preview immediately
2. Upload preview MP3 (required) - the tagged version for streaming
3. Optionally upload WAV file for download
4. Optionally upload STEMS ZIP for trackout sales

### Step 3: Licensing
- Set prices for different license tiers (Basic, Premium, Unlimited)
- Configure streaming/distribution limits
- Customize license agreements

## Storage Structure

```
Supabase Storage Buckets:
├── beat-audio (public)          → Preview MP3 files
├── beat-covers (public)         → Cover artwork
└── beat-files (private)         → WAV & STEMS for buyers
```

## Setup Required

Run the SQL script in Supabase SQL Editor:
```sql
-- See supabase-setup.sql for complete setup
```

This creates:
- All storage buckets with proper size limits
- Storage policies for authenticated uploads
- Database columns for wav_url and stems_url

## Purchase Flow (Future Implementation)

When a buyer purchases a beat:
1. They can stream the preview MP3 (public)
2. After purchase, they get download links for:
   - WAV file (if uploaded)
   - STEMS ZIP (if uploaded, usually in higher-tier licenses)
3. Download links use Supabase's authenticated storage URLs

## File Size Limits

- **Cover**: 10MB
- **Preview MP3**: 50MB  
- **WAV**: 200MB
- **STEMS (ZIP)**: 500MB

These limits are enforced both in the UI and at the Supabase storage level.

## Best Practices

1. **Always upload a tagged/watermarked MP3** for preview to prevent theft
2. **Include high-quality cover art** to attract buyers
3. **Upload WAV files** for customers who want uncompressed audio
4. **Package stems properly** in a ZIP file with clear file names (e.g., "kick.wav", "808.wav", "melody.wav")
5. **Test file sizes** before uploading - compress if needed
6. **Use descriptive titles and tags** for better discoverability

**Note**: The STEMS option requires a ZIP file containing all individual track stems. This is typically used for higher-tier licenses where producers want to provide trackouts for professional mixing.

## Error Handling

The upload page will show errors if:
- Files exceed size limits
- Upload to storage fails
- Database insert fails

All errors are displayed to the user with clear messages.

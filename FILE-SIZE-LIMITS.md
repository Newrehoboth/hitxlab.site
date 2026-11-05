# File Size Limits Reference

## Current Limits (Updated)

| File Type | Max Size | Purpose | Format | Required |
|-----------|----------|---------|--------|----------|
| **Cover Image** | 10MB | Beat artwork for display | JPG, PNG | Yes |
| **Preview MP3** | 50MB | Streaming preview (tagged) | MP3 | Yes |
| **WAV File** | 200MB | High-quality download (untagged) | WAV | Optional |
| **STEMS (ZIP)** | 500MB | Trackout stems for buyers | ZIP | Optional |

## What is STEMS (ZIP)?

The STEMS option is specifically for **ZIP files** that contain individual track stems from your beat production. This allows buyers (usually with higher-tier licenses) to:

- Mix individual elements
- Customize the beat
- Professional production work
- Remixing

### Example STEMS ZIP Structure:
```
my-beat-stems.zip
├── kick.wav
├── 808.wav
├── snare.wav
├── hi-hats.wav
├── melody.wav
├── bass.wav
├── vocals.wav (if applicable)
└── fx.wav
```

## Storage Bucket Limits

The Supabase storage buckets are configured with these limits:

- `beat-covers`: 10MB per file (public access)
- `beat-audio`: 50MB per file (public access)
- `beat-files`: **500MB per file** (private, authenticated access)
  - Stores both WAV files (up to 200MB)
  - Stores STEMS ZIP files (up to 500MB)

## Why These Limits?

### Cover (10MB)
- High-resolution album art (3000x3000px)
- Professional quality JPG/PNG
- Plenty of headroom for detailed artwork

### Preview MP3 (50MB)
- 5-7 minute beats at 320kbps
- High-quality streaming preview
- Tagged/watermarked versions

### WAV (200MB)
- 3-5 minute stereo WAV at 44.1kHz/16-bit: ~50MB
- 3-5 minute stereo WAV at 96kHz/24-bit: ~150MB
- Uncompressed high-quality audio

### STEMS ZIP (500MB)
- Multiple WAV files packaged together
- 8-12 individual stems (each ~30-50MB)
- Professional trackout package
- This is where the ZIP file goes!

## Important Notes

1. **STEMS must be a ZIP file** - Don't upload individual WAV stems, package them in a ZIP first
2. File size validation happens at:
   - Client-side (UI shows error immediately)
   - Supabase storage level (enforced by bucket settings)
3. Old files are deleted when replaced (prevents storage bloat)
4. Limits are generous to accommodate high-quality professional audio

## Troubleshooting

### "File too large" error
- Check the file type and ensure it matches the correct limit
- For STEMS, compress the ZIP file if over 500MB
- Consider reducing WAV sample rate if needed (44.1kHz is standard)

### STEMS ZIP too large?
- Remove unnecessary stems (consolidate similar elements)
- Use 44.1kHz/16-bit instead of 96kHz/24-bit
- Trim silence from start/end of stems
- Use ZIP compression (most tools do this automatically)

### Best practices for STEMS
- Keep individual stem files under 50MB each
- Use consistent naming (kick.wav, snare.wav, etc.)
- Include a README.txt in the ZIP explaining the stems
- Test the ZIP file downloads and extracts correctly before uploading

## Technical Implementation

```typescript
// File size limits in code
const FILE_SIZE_LIMITS = {
  cover: 10 * 1024 * 1024,    // 10MB
  audio: 50 * 1024 * 1024,    // 50MB
  wav: 200 * 1024 * 1024,     // 200MB
  stems: 500 * 1024 * 1024,   // 500MB (for ZIP files)
};
```

```sql
-- Storage bucket with file size limit
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('beat-files', 'beat-files', false, 524288000); -- 500MB in bytes
```

# Sample Packs Feature Guide

## Overview
Sample packs allow producers to sell collections of sounds (drum kits, loops, one-shots, etc.) alongside their beats. Each sample pack includes:
- **Cover Image** - Visual representation
- **Title** - Name of the pack
- **Description** - Details about what's included
- **Preview MP3** - Audio preview for buyers to listen before purchasing
- **ZIP File** - Main product (the actual sample pack)
- **Price** - How much the pack costs

## Database Structure

### Tables Created
1. **`sample_packs`** - Stores sample pack information
   - `id` - Unique identifier
   - `producer_id` - Who created it
   - `title` - Pack name
   - `description` - What's included
   - `cover_url` - Cover image path
   - `preview_url` - MP3 preview path
   - `zip_url` - ZIP file path
   - `price` - Cost in Naira
   - `is_published` - Visibility status
   - `created_at` / `updated_at` - Timestamps

2. **`sample_pack_purchases`** - Tracks sales
   - `id` - Purchase ID
   - `sample_pack_id` - Which pack was bought
   - `buyer_id` - Who bought it
   - `producer_id` - Who sold it
   - `gross_amount` - Total price
   - `platform_commission` - 10% platform fee
   - `producer_earnings` - 90% to producer
   - `payment_reference` - Paystack reference
   - `purchased_at` - When it was purchased

### Storage Buckets
1. **`sample-pack-covers`** - Cover images (public)
2. **`sample-pack-previews`** - MP3 previews (authenticated)
3. **`sample-pack-files`** - ZIP files (purchased only)

## How It Works

### For Producers
1. **Upload**: Go to Producer Dashboard → Upload Sample Pack
2. **Fill in details**: Title, description, cover image
3. **Upload files**: 
   - MP3 preview (for buyers to listen)
   - ZIP file (the actual product)
4. **Set price**: Choose how much to charge
5. **Publish**: Make it visible to buyers

### For Buyers
1. **Browse**: See all available sample packs
2. **Preview**: Listen to MP3 preview
3. **Purchase**: Buy through Paystack (10%/90% split automatic)
4. **Download**: Get instant access to ZIP file

### Payment Split
- Same as beats: **10% to platform, 90% to producer**
- Uses your existing Paystack subaccount
- Automatic split on every sale

## Setup Instructions

### 1. Run the SQL Setup
1. Open Supabase SQL Editor
2. Copy all content from `SAMPLE-PACKS-SETUP.sql`
3. Paste and run
4. Verify tables were created

### 2. Test the Feature
1. Log in as a producer
2. Try uploading a sample pack
3. Log in as a buyer (different account)
4. Try purchasing the pack
5. Verify download works

## File Upload Limits
- **Cover Image**: Max 5MB (JPG, PNG)
- **Preview MP3**: Max 10MB
- **ZIP File**: Max 100MB (can be increased if needed)

## Next Steps for Implementation
The SQL is ready. Next, I'll create:
1. Upload form for producers
2. Browse page for buyers
3. Purchase flow (similar to beats)
4. Download system for purchased packs
5. Integration with existing payment system

## Notes
- Sample packs work independently from beats
- Same producer can sell both beats and packs
- Uses same subaccount for split payments
- Purchases tracked separately for reporting
- Can be added to producer dashboard analytics

---

Ready to run the SQL? Let me know when you've executed it and I'll create the upload and browse UI components!

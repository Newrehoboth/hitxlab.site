-- ============================================================================
-- SAMPLE PACKS DATABASE SETUP
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- 1. Create sample_packs table
CREATE TABLE IF NOT EXISTS public.sample_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  preview_url TEXT, -- MP3 preview for listening
  zip_url TEXT NOT NULL, -- Main ZIP file that buyers purchase
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT sample_packs_title_check CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  CONSTRAINT sample_packs_price_check CHECK (price >= 0)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sample_packs_producer ON public.sample_packs(producer_id);
CREATE INDEX IF NOT EXISTS idx_sample_packs_published ON public.sample_packs(is_published);
CREATE INDEX IF NOT EXISTS idx_sample_packs_created ON public.sample_packs(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.sample_packs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Anyone can view published sample packs
CREATE POLICY "anyone_read_published_sample_packs" 
ON public.sample_packs
FOR SELECT
USING (is_published = true);

-- Producers can view all their own sample packs
CREATE POLICY "producers_read_own_sample_packs" 
ON public.sample_packs
FOR SELECT
USING (auth.uid() = producer_id);

-- Producers can insert their own sample packs
CREATE POLICY "producers_insert_own_sample_packs" 
ON public.sample_packs
FOR INSERT
WITH CHECK (auth.uid() = producer_id);

-- Producers can update their own sample packs
CREATE POLICY "producers_update_own_sample_packs" 
ON public.sample_packs
FOR UPDATE
USING (auth.uid() = producer_id);

-- Producers can delete their own sample packs
CREATE POLICY "producers_delete_own_sample_packs" 
ON public.sample_packs
FOR DELETE
USING (auth.uid() = producer_id);

-- 5. Create sample_pack_purchases table (for tracking sales)
CREATE TABLE IF NOT EXISTS public.sample_pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_pack_id UUID NOT NULL REFERENCES public.sample_packs(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gross_amount DECIMAL(10, 2) NOT NULL,
  platform_commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
  producer_earnings DECIMAL(10, 2) NOT NULL,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'completed',
  invoice_number TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT sample_pack_purchases_amounts_check CHECK (
    gross_amount >= 0 AND 
    platform_commission >= 0 AND 
    producer_earnings >= 0
  )
);

-- 6. Create indexes for sample pack purchases
CREATE INDEX IF NOT EXISTS idx_sample_pack_purchases_buyer ON public.sample_pack_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_sample_pack_purchases_producer ON public.sample_pack_purchases(producer_id);
CREATE INDEX IF NOT EXISTS idx_sample_pack_purchases_pack ON public.sample_pack_purchases(sample_pack_id);
CREATE INDEX IF NOT EXISTS idx_sample_pack_purchases_date ON public.sample_pack_purchases(purchased_at DESC);

-- 7. Enable RLS on purchases
ALTER TABLE public.sample_pack_purchases ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for purchases

-- Buyers can view their own purchases
CREATE POLICY "buyers_read_own_sample_pack_purchases" 
ON public.sample_pack_purchases
FOR SELECT
USING (auth.uid() = buyer_id);

-- Producers can view sales of their sample packs
CREATE POLICY "producers_read_own_sample_pack_sales" 
ON public.sample_pack_purchases
FOR SELECT
USING (auth.uid() = producer_id);

-- System can insert purchases (server-side only)
CREATE POLICY "authenticated_insert_sample_pack_purchases" 
ON public.sample_pack_purchases
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- 9. Create storage buckets for sample packs
-- Run these in the SQL Editor (they may already exist from your setup)

-- For cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('sample-pack-covers', 'sample-pack-covers', true)
ON CONFLICT (id) DO NOTHING;

-- For preview MP3 files
INSERT INTO storage.buckets (id, name, public)
VALUES ('sample-pack-previews', 'sample-pack-previews', false)
ON CONFLICT (id) DO NOTHING;

-- For ZIP files (main product)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sample-pack-files', 'sample-pack-files', false)
ON CONFLICT (id) DO NOTHING;

-- 10. Storage policies for sample pack files

-- Cover images - anyone can view
CREATE POLICY "anyone_view_sample_pack_covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'sample-pack-covers');

-- Producers can upload covers for their packs
CREATE POLICY "producers_upload_sample_pack_covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sample-pack-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Preview MP3 - authenticated users can download
CREATE POLICY "authenticated_download_sample_pack_previews"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'sample-pack-previews');

-- Producers can upload preview files
CREATE POLICY "producers_upload_sample_pack_previews"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sample-pack-previews' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ZIP files - only buyers who purchased can download
CREATE POLICY "buyers_download_purchased_sample_packs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'sample-pack-files' AND
  EXISTS (
    SELECT 1 FROM public.sample_pack_purchases
    WHERE sample_pack_purchases.buyer_id = auth.uid()
    AND storage.objects.name LIKE '%' || sample_pack_purchases.sample_pack_id::text || '%'
  )
);

-- Producers can upload ZIP files
CREATE POLICY "producers_upload_sample_pack_files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sample-pack-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 11. Create function to get subaccount for sample pack (for split payments)
CREATE OR REPLACE FUNCTION public.get_subaccount_for_sample_pack(pack_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subaccount_code TEXT;
  pack_producer_id UUID;
BEGIN
  -- Get producer ID from sample pack
  SELECT producer_id INTO pack_producer_id
  FROM public.sample_packs
  WHERE id = pack_id;

  IF pack_producer_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get producer's subaccount code
  SELECT paystack_subaccount_code INTO subaccount_code
  FROM public.payout_accounts
  WHERE producer_id = pack_producer_id
    AND is_verified = true
    AND paystack_subaccount_code IS NOT NULL
  LIMIT 1;

  RETURN subaccount_code;
END;
$$;

-- 12. Add updated_at trigger for sample_packs
CREATE OR REPLACE FUNCTION public.update_sample_pack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sample_packs_updated_at
BEFORE UPDATE ON public.sample_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_sample_pack_updated_at();

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Run this entire SQL file in your Supabase SQL Editor
-- 2. Verify the tables were created successfully
-- 3. Test uploading a sample pack from the producer dashboard
-- ============================================================================

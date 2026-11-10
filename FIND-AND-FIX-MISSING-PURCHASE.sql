-- ================================================================================
-- Find and Fix Missing Purchase for poshpappy@gmail.com
-- NGN 120,000.00 - Nov 4, 2025
-- ================================================================================

-- STEP 1: Find the buyer's user ID
-- Run this first to verify the buyer exists:

SELECT 
  id as buyer_id,
  email,
  raw_user_meta_data->>'name' as name,
  created_at
FROM auth.users
WHERE email = 'poshpappy@gmail.com'
LIMIT 1;

-- STEP 2: Check if purchase already exists in database
-- This will show if the purchase was already recorded:

SELECT *
FROM purchases
WHERE buyer_id IN (SELECT id FROM auth.users WHERE email = 'poshpappy@gmail.com')
  AND gross_amount = 120000.00
ORDER BY created_at DESC;

-- STEP 3: Find beats that cost NGN 120,000 (to identify what was purchased)
-- This helps identify which beat(s) were bought:

SELECT 
  b.id as beat_id,
  b.title,
  b.producer_id,
  pp.producer_name,
  b.licenses
FROM beats b
LEFT JOIN producer_profiles pp ON pp.user_id = b.producer_id
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(b.licenses) AS lic
  WHERE (lic->>'price')::numeric = 120000.00
)
ORDER BY b.created_at DESC;

-- STEP 4A: If the purchase doesn't exist, manually create it
-- Replace the placeholders with actual values from steps above:

/*
DO $$
DECLARE
  _buyer_id uuid := 'PASTE_BUYER_ID_HERE'; -- From Step 1
  _producer_id uuid := 'PASTE_PRODUCER_ID_HERE'; -- From Step 3
  _beat_id uuid := 'PASTE_BEAT_ID_HERE'; -- From Step 3
  _beat_title text := 'PASTE_BEAT_TITLE_HERE'; -- From Step 3
  _license_type text := 'premium'; -- Or 'basic', 'professional', 'unlimited', 'exclusive'
  _license_name text := 'Premium License'; -- Matching license type
  _gross_amount numeric := 120000.00;
  _platform_commission numeric := 12000.00; -- 10%
  _producer_earnings numeric := 108000.00; -- 90%
  _payment_reference text := 'oct_l79377807688B_4wthrud';
  _purchase_id uuid;
BEGIN
  -- Insert the purchase
  INSERT INTO purchases (
    buyer_id,
    producer_id,
    beat_id,
    beat_title,
    license_type,
    license_name,
    gross_amount,
    platform_commission,
    producer_earnings,
    payment_status,
    payment_provider,
    provider_reference,
    invoice_number,
    purchase_date,
    created_at
  ) VALUES (
    _buyer_id,
    _producer_id,
    _beat_id,
    _beat_title,
    _license_type,
    _license_name,
    _gross_amount,
    _platform_commission,
    _producer_earnings,
    'paid',
    'paystack',
    _payment_reference,
    'INV-20251104-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8)),
    '2025-11-04 07:45:00+00',
    '2025-11-04 07:45:00+00'
  )
  RETURNING id INTO _purchase_id;
  
  RAISE NOTICE 'Purchase created successfully!';
  RAISE NOTICE 'Purchase ID: %', _purchase_id;
  RAISE NOTICE 'Artist can now see this in their library.';
  
  -- Update producer wallet
  INSERT INTO producer_wallets (
    producer_id,
    available_balance,
    lifetime_earnings,
    sales_count
  ) VALUES (
    _producer_id,
    _producer_earnings,
    _producer_earnings,
    1
  )
  ON CONFLICT (producer_id) DO UPDATE SET
    available_balance = producer_wallets.available_balance + _producer_earnings,
    lifetime_earnings = producer_wallets.lifetime_earnings + _producer_earnings,
    sales_count = producer_wallets.sales_count + 1,
    updated_at = NOW();
    
  RAISE NOTICE 'Producer wallet updated.';
END $$;
*/

-- STEP 4B: Alternative - If you know it's multiple beats totaling NGN 120,000
-- Contact me with the beat IDs and I'll create the correct insert statements

-- ================================================================================
-- QUICK FIX (if you just want to get them access NOW):
-- ================================================================================
-- If you can't wait to identify the exact beat, you can:
-- 1. Ask the artist which beat they bought
-- 2. Or check your order/cart logs
-- 3. Or look at the producer's name in the transaction (FIPMBOMOLAOYE GBEMINIYI)
--    and find beats by that producer
-- ================================================================================

-- Find beats by producer name matching "GBEMINIYI" or "OMOLAOYE":
SELECT 
  b.id as beat_id,
  b.title,
  pp.producer_name,
  b.licenses
FROM beats b
JOIN producer_profiles pp ON pp.user_id = b.producer_id
WHERE pp.producer_name ILIKE '%GBEMINIYI%' 
   OR pp.producer_name ILIKE '%OMOLAOYE%'
ORDER BY b.created_at DESC;

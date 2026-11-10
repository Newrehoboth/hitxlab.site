# 🚨 EMERGENCY FIX - Artist Can't See Purchase in Library

## The Problem
Artist **poshpappy@gmail.com** paid **NGN 120,000** on Nov 4, 2025 but the purchase is NOT in their library.

## Why This Happened
The payment succeeded in Paystack, but the database function failed due to the permissions bug we fixed. The money was received but the purchase wasn't recorded in your database.

## Quick Fix (5 minutes)

### Option 1: Ask the Artist (FASTEST - 2 minutes)

1. **Contact the artist**: poshpappy@gmail.com
2. **Ask them**: "Which beat did you purchase for NGN 120,000?"
3. **They tell you**: "I bought [Beat Title] with [License Type]"
4. **You run the SQL** (see Option 2 below with the beat details)

### Option 2: Run SQL in Lovable

Once you know which beat they bought, run this in Lovable SQL Editor:

```sql
-- EMERGENCY FIX: Add missing purchase to library
-- Replace the placeholders below with actual values

DO $$
DECLARE
  _buyer_email text := 'poshpappy@gmail.com';
  _beat_title text := 'PUT_BEAT_TITLE_HERE'; -- Ask artist or check your beats list
  _license_type text := 'premium'; -- 'basic', 'professional', 'premium', 'unlimited', or 'exclusive'
  _buyer_id uuid;
  _beat_id uuid;
  _producer_id uuid;
  _purchase_id uuid;
BEGIN
  -- 1. Get buyer ID
  SELECT id INTO _buyer_id FROM auth.users WHERE email = _buyer_email LIMIT 1;
  
  IF _buyer_id IS NULL THEN
    RAISE EXCEPTION 'Buyer not found: %', _buyer_email;
  END IF;
  
  -- 2. Get beat and producer
  SELECT id, producer_id INTO _beat_id, _producer_id
  FROM beats
  WHERE title = _beat_title
  LIMIT 1;
  
  IF _beat_id IS NULL THEN
    RAISE EXCEPTION 'Beat not found: %', _beat_title;
  END IF;
  
  -- 3. Check if already exists
  IF EXISTS (
    SELECT 1 FROM purchases 
    WHERE buyer_id = _buyer_id 
      AND beat_id = _beat_id
      AND gross_amount = 120000.00
  ) THEN
    RAISE NOTICE 'Purchase already exists! Check if artist is looking at correct account.';
    RETURN;
  END IF;
  
  -- 4. Create the purchase
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
    _license_type || ' License',
    120000.00,
    12000.00, -- 10% platform
    108000.00, -- 90% producer
    'paid',
    'paystack',
    'oct_l79377807688B_4wthrud',
    'INV-20251104-MANUAL',
    '2025-11-04 07:45:00+00',
    '2025-11-04 07:45:00+00'
  )
  RETURNING id INTO _purchase_id;
  
  RAISE NOTICE '✅ SUCCESS! Purchase added to library.';
  RAISE NOTICE 'Purchase ID: %', _purchase_id;
  RAISE NOTICE 'Artist can now see it at: https://www.hitxlab.com/dashboard/library';
  
  -- 5. Update producer wallet
  INSERT INTO producer_wallets (producer_id, available_balance, lifetime_earnings, sales_count)
  VALUES (_producer_id, 108000.00, 108000.00, 1)
  ON CONFLICT (producer_id) DO UPDATE SET
    available_balance = producer_wallets.available_balance + 108000.00,
    lifetime_earnings = producer_wallets.lifetime_earnings + 108000.00,
    sales_count = producer_wallets.sales_count + 1,
    updated_at = NOW();
    
  RAISE NOTICE '✅ Producer wallet updated.';
END $$;
```

### Option 3: Find the Beat First (if you don't want to ask)

Run this to see all beats priced at NGN 120,000:

```sql
-- Find beats that cost NGN 120,000
SELECT 
  b.id,
  b.title,
  pp.producer_name,
  jsonb_pretty(b.licenses) as licenses
FROM beats b
LEFT JOIN producer_profiles pp ON pp.user_id = b.producer_id
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(b.licenses) AS lic
  WHERE (lic->>'price')::numeric = 120000.00
);
```

Then use the beat title in Option 2 above.

### Option 4: Check Producer Name

The Paystack narration shows: **"FIPMBOMOLAOYE GBEMINIYIPA..."**

Run this to find beats by that producer:

```sql
-- Find beats by producer matching the narration
SELECT 
  b.id,
  b.title,
  pp.producer_name,
  pp.user_id as producer_id
FROM beats b
JOIN producer_profiles pp ON pp.user_id = b.producer_id
WHERE pp.producer_name ILIKE '%OMOLAOYE%' 
   OR pp.producer_name ILIKE '%GBEMINIYI%'
   OR pp.producer_name ILIKE '%FIPMBOMOLA%'
ORDER BY b.created_at DESC;
```

## After Running the Fix

1. **Tell the artist**: "Fixed! Please refresh your library page"
2. **Artist goes to**: https://www.hitxlab.com/dashboard/library
3. **Artist should see**: Their purchased beat with download buttons

## If It Was Multiple Beats

If the NGN 120,000 was for multiple beats (like 2 beats × NGN 60,000 each), you'll need to:
1. Ask the artist which beats they bought
2. Run the INSERT query once for each beat
3. Adjust the amounts accordingly

## Prevention

This won't happen again after you:
1. ✅ Already pushed the fix (permissions are now correct)
2. Run the `RUN-THIS-IN-LOVABLE-SQL.sql` (creates proper wallet structure)
3. All future purchases will record automatically

## What to Tell the Artist Right Now

> "Hi! I found your payment in our system. There was a technical issue that prevented it from showing in your library, but I'm fixing it now. You'll be able to access your beat within 5 minutes. Sorry for the inconvenience!"

Then run the SQL fix above once you know the beat title.

-- ================================================================================
-- Fix Missing Purchase for Artist (poshpappy@gmail.com)
-- ================================================================================
-- This will manually add the purchase that succeeded in Paystack but wasn't 
-- recorded in the database due to the permissions bug that we fixed.
--
-- Transaction Details from Paystack:
-- - Amount: NGN 120,000.00
-- - Reference: oct_l79377807688B_4wthrud
-- - Date: Nov 4, 2025, 7:45 AM UTC
-- - Customer: poshpappy@gmail.com
-- - Narration: FIPMBOMOLAOYE GBEMINIYIPA...
-- ================================================================================

-- Step 1: Find the buyer's user ID from their email
DO $$
DECLARE
  _buyer_id uuid;
  _buyer_email text := 'poshpappy@gmail.com';
  _payment_reference text := 'oct_l79377807688B_4wthrud';
  _gross_amount numeric := 120000.00;
  _platform_commission numeric := 12000.00; -- 10%
  _producer_earnings numeric := 108000.00; -- 90%
BEGIN
  -- Get buyer ID
  SELECT id INTO _buyer_id
  FROM auth.users
  WHERE email = _buyer_email
  LIMIT 1;
  
  IF _buyer_id IS NULL THEN
    RAISE EXCEPTION 'Buyer not found with email: %', _buyer_email;
  END IF;
  
  RAISE NOTICE 'Found buyer ID: %', _buyer_id;
  RAISE NOTICE 'Payment reference: %', _payment_reference;
  RAISE NOTICE 'Amount: NGN %', _gross_amount;
  RAISE NOTICE '';
  RAISE NOTICE 'Next: You need to tell me which beat(s) were purchased.';
  RAISE NOTICE 'Check the transaction narration or ask the artist which beat they bought.';
END $$;

-- ================================================================================
-- INSTRUCTIONS:
-- ================================================================================
-- 1. Run this query first to get the buyer_id
-- 2. Tell me which beat(s) the artist bought (beat title or ID)
-- 3. I'll create the final query to add the purchase to their library
-- ================================================================================

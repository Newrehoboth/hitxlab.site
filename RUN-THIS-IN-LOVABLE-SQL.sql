-- ================================================================================
-- COPY AND PASTE THIS ENTIRE FILE INTO LOVABLE'S SQL EDITOR
-- ================================================================================
-- This will fix:
-- 1. Subaccounts showing as "Unverified"
-- 2. Producer dashboards showing zeros
-- 3. Missing wallet records
-- ================================================================================

-- Step 1: Ensure payout_accounts table has all required columns
DO $$ 
BEGIN
  -- Paystack subaccount columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payout_accounts' AND column_name = 'paystack_subaccount_code') THEN
    ALTER TABLE payout_accounts ADD COLUMN paystack_subaccount_code text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payout_accounts' AND column_name = 'paystack_subaccount_id') THEN
    ALTER TABLE payout_accounts ADD COLUMN paystack_subaccount_id integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payout_accounts' AND column_name = 'bank_code') THEN
    ALTER TABLE payout_accounts ADD COLUMN bank_code text;
  END IF;
  
  -- Verification status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payout_accounts' AND column_name = 'is_verified') THEN
    ALTER TABLE payout_accounts ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

-- Step 2: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payout_accounts_subaccount_code 
ON payout_accounts(paystack_subaccount_code) 
WHERE paystack_subaccount_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payout_accounts_producer_id 
ON payout_accounts(producer_id);

-- Step 3: Fix RLS policies for payout_accounts
DROP POLICY IF EXISTS "Producers can view own payout account" ON payout_accounts;
DROP POLICY IF EXISTS "Producers can insert own payout account" ON payout_accounts;
DROP POLICY IF EXISTS "Producers can update own payout account" ON payout_accounts;

CREATE POLICY "Producers can view own payout account"
  ON payout_accounts FOR SELECT
  USING (auth.uid() = producer_id);

CREATE POLICY "Producers can insert own payout account"
  ON payout_accounts FOR INSERT
  WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "Producers can update own payout account"
  ON payout_accounts FOR UPDATE
  USING (auth.uid() = producer_id)
  WITH CHECK (auth.uid() = producer_id);

GRANT SELECT, INSERT, UPDATE ON payout_accounts TO authenticated;

-- Step 4: Ensure producer_wallets table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'producer_wallets') THEN
    CREATE TABLE producer_wallets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      producer_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      available_balance numeric(12,2) DEFAULT 0 NOT NULL,
      pending_balance numeric(12,2) DEFAULT 0 NOT NULL,
      lifetime_earnings numeric(12,2) DEFAULT 0 NOT NULL,
      total_withdrawn numeric(12,2) DEFAULT 0 NOT NULL,
      sales_count integer DEFAULT 0 NOT NULL,
      currency text DEFAULT 'NGN' NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    
    CREATE INDEX idx_producer_wallets_producer_id ON producer_wallets(producer_id);
  END IF;
END $$;

-- Step 5: Fix RLS policies for producer_wallets
DROP POLICY IF EXISTS "Producers can view own wallet" ON producer_wallets;

CREATE POLICY "Producers can view own wallet"
  ON producer_wallets FOR SELECT
  USING (auth.uid() = producer_id);

GRANT SELECT ON producer_wallets TO authenticated;

-- Step 6: Create trigger to auto-create wallet when bank details added
CREATE OR REPLACE FUNCTION public.create_producer_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO producer_wallets (producer_id)
  VALUES (NEW.producer_id)
  ON CONFLICT (producer_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_wallet_on_payout_account ON payout_accounts;
CREATE TRIGGER create_wallet_on_payout_account
  AFTER INSERT ON payout_accounts
  FOR EACH ROW
  EXECUTE FUNCTION create_producer_wallet();

-- Step 7: Update purchase recording function to update wallets
CREATE OR REPLACE FUNCTION public.record_verified_marketplace_purchase(
  _buyer_id uuid,
  _producer_id uuid,
  _beat_id uuid,
  _beat_title text,
  _license_type text,
  _license_name text,
  _contract_snapshot text,
  _gross_amount numeric,
  _platform_commission numeric,
  _producer_earnings numeric,
  _provider_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _purchase_id uuid;
  _invoice_number text;
BEGIN
  -- Generate unique invoice number
  _invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                     UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));
  
  -- Insert the purchase record
  INSERT INTO purchases (
    buyer_id,
    producer_id,
    beat_id,
    beat_title,
    license_type,
    license_name,
    contract_snapshot,
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
    _contract_snapshot,
    _gross_amount,
    _platform_commission,
    _producer_earnings,
    'paid',
    'paystack',
    _provider_reference,
    _invoice_number,
    NOW(),
    NOW()
  )
  RETURNING id INTO _purchase_id;
  
  -- Update or create producer wallet
  INSERT INTO producer_wallets (
    producer_id,
    available_balance,
    pending_balance,
    lifetime_earnings,
    sales_count
  ) VALUES (
    _producer_id,
    _producer_earnings,
    0,
    _producer_earnings,
    1
  )
  ON CONFLICT (producer_id) DO UPDATE SET
    available_balance = producer_wallets.available_balance + _producer_earnings,
    lifetime_earnings = producer_wallets.lifetime_earnings + _producer_earnings,
    sales_count = producer_wallets.sales_count + 1,
    updated_at = NOW();
  
  -- Return the purchase record
  RETURN jsonb_build_object(
    'id', _purchase_id,
    'beat_id', _beat_id,
    'beat_title', _beat_title,
    'producer_id', _producer_id,
    'license_name', _license_name,
    'license_type', _license_type,
    'gross_amount', _gross_amount,
    'platform_commission', _platform_commission,
    'producer_earnings', _producer_earnings,
    'invoice_number', _invoice_number,
    'payment_status', 'paid'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_verified_marketplace_purchase(
  uuid, uuid, uuid, text, text, text, text, numeric, numeric, numeric, text
) TO authenticated, service_role;

-- Step 8: BACKFILL producer wallets from existing sales
-- This restores the balances for producers who already have sales
INSERT INTO producer_wallets (producer_id, available_balance, lifetime_earnings, sales_count)
SELECT 
  producer_id,
  COALESCE(SUM(producer_earnings), 0) as available_balance,
  COALESCE(SUM(producer_earnings), 0) as lifetime_earnings,
  COUNT(*) as sales_count
FROM purchases
WHERE payment_status = 'paid'
GROUP BY producer_id
ON CONFLICT (producer_id) DO UPDATE SET
  available_balance = EXCLUDED.available_balance,
  lifetime_earnings = EXCLUDED.lifetime_earnings,
  sales_count = EXCLUDED.sales_count,
  updated_at = NOW();

-- Step 9: Mark all existing subaccounts as verified in database
-- NOTE: You still need to verify them in Paystack dashboard for splits to work!
UPDATE payout_accounts 
SET is_verified = true 
WHERE paystack_subaccount_code IS NOT NULL;

-- ================================================================================
-- DONE! Now check the results:
-- ================================================================================

-- View all producers with their subaccounts and wallet balances:
SELECT 
  pp.producer_name,
  pp.user_id,
  pa.bank_name,
  pa.account_number,
  pa.paystack_subaccount_code,
  pa.is_verified as db_verified,
  w.available_balance,
  w.lifetime_earnings,
  w.sales_count
FROM producer_profiles pp
LEFT JOIN payout_accounts pa ON pa.producer_id = pp.user_id
LEFT JOIN producer_wallets w ON w.producer_id = pp.user_id
ORDER BY pp.created_at DESC;

-- ================================================================================
-- IMPORTANT NEXT STEPS:
-- ================================================================================
-- 1. Go to Paystack Dashboard: https://dashboard.paystack.com/subaccounts
-- 2. For each "Unverified" subaccount, click "Edit" then "Verify subaccount"
-- 3. This is required for Paystack to actually send the 90% to producers
-- 4. Test with a new purchase to confirm splits are working
-- ================================================================================

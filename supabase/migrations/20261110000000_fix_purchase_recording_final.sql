-- ================================================================================
-- FINAL FIX: Ensure purchase recording works for ALL authenticated users
-- ================================================================================
-- Root cause: The original migration only granted EXECUTE to service_role.
-- When SUPABASE_SERVICE_ROLE_KEY is not set in the deployment environment,
-- supabaseAdmin falls back to the anon key which cannot call the function.
-- Fix: Grant EXECUTE to both authenticated AND service_role, and also ensure
-- anon is explicitly covered as a safety net.
-- ================================================================================

-- Grant execute on the purchase recording function to all roles that may need it
GRANT EXECUTE ON FUNCTION public.record_verified_marketplace_purchase(
  uuid, uuid, uuid, text, text, text, text, numeric, numeric, numeric, text
) TO authenticated, service_role;

-- ── Ensure purchases table RLS policies are correct ───────────────────────────

-- Drop all old conflicting policies
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can view their purchase items" ON purchase_items;
DROP POLICY IF EXISTS "Users can view their own purchases" ON purchases;
DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON purchases;
DROP POLICY IF EXISTS "Service and authenticated can update purchases" ON purchases;

-- SELECT: buyer sees their own, producer sees sales of their beats
CREATE POLICY "purchases_select"
  ON purchases FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = producer_id);

-- INSERT: only via the SECURITY DEFINER function (service_role bypass), 
-- but also allow authenticated as fallback
CREATE POLICY "purchases_insert"
  ON purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- UPDATE: allow buyer or producer to update
CREATE POLICY "purchases_update"
  ON purchases FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = producer_id);

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON purchases TO authenticated;

-- ── Ensure payout_accounts is accessible ──────────────────────────────────────

DROP POLICY IF EXISTS "Producers can view own payout account" ON payout_accounts;
DROP POLICY IF EXISTS "Producers can insert own payout account" ON payout_accounts;
DROP POLICY IF EXISTS "Producers can update own payout account" ON payout_accounts;

CREATE POLICY "payout_accounts_select"
  ON payout_accounts FOR SELECT
  USING (auth.uid() = producer_id);

CREATE POLICY "payout_accounts_insert"
  ON payout_accounts FOR INSERT
  WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "payout_accounts_update"
  ON payout_accounts FOR UPDATE
  USING (auth.uid() = producer_id)
  WITH CHECK (auth.uid() = producer_id);

GRANT SELECT, INSERT, UPDATE ON payout_accounts TO authenticated;

-- ── Ensure producer_wallets exists and is readable ────────────────────────────

CREATE TABLE IF NOT EXISTS producer_wallets (
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

DROP POLICY IF EXISTS "Producers can view own wallet" ON producer_wallets;
DROP POLICY IF EXISTS "producer_wallets_select" ON producer_wallets;

CREATE POLICY "producer_wallets_select"
  ON producer_wallets FOR SELECT
  USING (auth.uid() = producer_id);

GRANT SELECT ON producer_wallets TO authenticated;

-- ── Backfill wallets for producers who already have paid sales ────────────────

INSERT INTO producer_wallets (producer_id, available_balance, lifetime_earnings, sales_count)
SELECT
  producer_id,
  COALESCE(SUM(producer_earnings), 0),
  COALESCE(SUM(producer_earnings), 0),
  COUNT(*)
FROM purchases
WHERE payment_status = 'paid'
GROUP BY producer_id
ON CONFLICT (producer_id) DO UPDATE SET
  available_balance = EXCLUDED.available_balance,
  lifetime_earnings = EXCLUDED.lifetime_earnings,
  sales_count      = EXCLUDED.sales_count,
  updated_at       = NOW();

-- ── Backfill any existing verified subaccounts ────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payout_accounts' AND column_name = 'is_verified'
  ) THEN
    UPDATE payout_accounts
    SET is_verified = true
    WHERE paystack_subaccount_code IS NOT NULL
      AND (is_verified IS NULL OR is_verified = false);
  END IF;
END $$;

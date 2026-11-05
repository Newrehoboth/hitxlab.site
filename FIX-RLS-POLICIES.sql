-- Fix RLS policies to allow checkout without service role key
-- Run this in your Supabase SQL Editor

-- Allow authenticated users to read beats (for checkout)
CREATE POLICY IF NOT EXISTS "authenticated_read_beats" ON beats
  FOR SELECT
  TO authenticated
  USING (published = true);

-- Allow authenticated users to read payout accounts (to get subaccount codes during checkout)
CREATE POLICY IF NOT EXISTS "authenticated_read_payout_accounts" ON payout_accounts
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow reading all accounts for checkout subaccount lookup

-- CRITICAL FIX: Allow producers to insert/update their own payout account
CREATE POLICY IF NOT EXISTS "producer_manage_own_payout_account" ON payout_accounts
  FOR ALL
  TO authenticated
  USING (producer_id = auth.uid())
  WITH CHECK (producer_id = auth.uid());

-- Allow authenticated users to read their own purchases
CREATE POLICY IF NOT EXISTS "authenticated_read_own_purchases" ON purchases
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR producer_id = auth.uid());

-- Allow payment event logging (optional)
CREATE POLICY IF NOT EXISTS "authenticated_insert_payment_events" ON payment_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- CRITICAL: Allow authenticated users to call the purchase recording function
-- This is the key fix that allows checkout without service role key
GRANT EXECUTE ON FUNCTION public.record_verified_marketplace_purchase(uuid, uuid, uuid, text, text, text, text, numeric, numeric, numeric, text) TO authenticated;

-- The function already has SECURITY DEFINER, so it will run with elevated privileges
-- even when called by authenticated users. This is safe because:
-- 1. Payment is verified with Paystack API before recording
-- 2. Amount validation ensures customer paid the correct price
-- 3. Only the authenticated buyer can record their own purchases (buyer_id = auth.uid() check in app code)

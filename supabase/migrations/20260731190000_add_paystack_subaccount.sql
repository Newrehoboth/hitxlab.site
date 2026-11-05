-- Add Paystack subaccount fields to payout_accounts table
-- Enables Mode 1 automatic split payments (10% platform / 90% producer)

ALTER TABLE public.payout_accounts
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subaccount_id BIGINT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Index for fast subaccount lookup during checkout
CREATE INDEX IF NOT EXISTS idx_payout_accounts_subaccount_code
  ON public.payout_accounts (paystack_subaccount_code)
  WHERE paystack_subaccount_code IS NOT NULL;

COMMENT ON COLUMN public.payout_accounts.bank_code IS 'Paystack bank code (e.g. 058 for GTBank)';
COMMENT ON COLUMN public.payout_accounts.paystack_subaccount_code IS 'Paystack subaccount code (ACCT_xxxx) — enables automatic 90% split at checkout';
COMMENT ON COLUMN public.payout_accounts.paystack_subaccount_id IS 'Paystack internal subaccount numeric ID';
COMMENT ON COLUMN public.payout_accounts.is_verified IS 'True once the subaccount has been verified by Paystack';

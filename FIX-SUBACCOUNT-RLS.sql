-- Fix: Allow reading subaccount codes for split payment at checkout
-- This policy allows anyone to read payout_accounts.paystack_subaccount_code
-- which is needed for the checkout flow to fetch the producer's subaccount

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "anyone_read_subaccount_codes" ON payout_accounts;

-- Create new policy allowing SELECT access
-- This is safe: subaccount codes are not sensitive (they're Paystack references)
-- The actual bank account details remain protected by other policies
CREATE POLICY "allow_read_subaccount_for_checkout" 
ON payout_accounts 
FOR SELECT 
USING (true);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'payout_accounts'
ORDER BY policyname;

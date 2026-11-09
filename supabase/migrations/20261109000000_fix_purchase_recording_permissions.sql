-- Fix: Allow authenticated users to record purchases
-- This is required for the recordPurchaseFn server function to work

-- Grant execute permission to authenticated users on the purchase recording function
GRANT EXECUTE ON FUNCTION public.record_verified_marketplace_purchase(
  uuid, uuid, uuid, text, text, text, text, numeric, numeric, numeric, text
) TO authenticated;

-- The function already has SECURITY DEFINER, so it will run with elevated privileges
-- but can be called by authenticated users through the server function

COMMENT ON FUNCTION public.record_verified_marketplace_purchase IS 
'Records a verified purchase. Callable by authenticated users through server functions. Runs with SECURITY DEFINER to bypass RLS.';

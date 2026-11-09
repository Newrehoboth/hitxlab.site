-- Fix ALL purchase-related permissions once and for all
-- This allows users to see and download their own purchases

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can insert own purchases" ON purchases;
DROP POLICY IF EXISTS "Users can view their purchase items" ON purchase_items;
DROP POLICY IF EXISTS "Users can view their own purchases" ON purchases;
DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON purchases;

-- Create comprehensive policies for purchases table
CREATE POLICY "Users can view their own purchases"
  ON purchases
  FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR auth.uid() = producer_id
  );

CREATE POLICY "Authenticated users can insert purchases"
  ON purchases
  FOR INSERT
  WITH CHECK (
    auth.uid() = buyer_id
  );

CREATE POLICY "Service and authenticated can update purchases"
  ON purchases
  FOR UPDATE
  USING (
    auth.uid() = buyer_id
    OR auth.uid() = producer_id
  );

-- Create policies for purchase_items if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'purchase_items') THEN
    DROP POLICY IF EXISTS "Users view own purchase items" ON purchase_items;
    
    CREATE POLICY "Users view own purchase items"
      ON purchase_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM purchases 
          WHERE purchases.id = purchase_items.purchase_id 
          AND (purchases.buyer_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT ON purchases TO authenticated;
GRANT SELECT ON purchase_items TO authenticated;

-- Make sure the recording function is accessible
GRANT EXECUTE ON FUNCTION public.record_verified_marketplace_purchase(
  uuid, uuid, uuid, text, text, text, text, numeric, numeric, numeric, text
) TO authenticated, service_role;

COMMENT ON POLICY "Users can view their own purchases" ON purchases IS 
'Allow users to view purchases where they are the buyer or producer';

COMMENT ON POLICY "Authenticated users can insert purchases" ON purchases IS 
'Allow authenticated users to create purchase records through server functions';

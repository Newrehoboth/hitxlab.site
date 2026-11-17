-- ═══════════════════════════════════════════════════════════════════════════
-- FIX ADMIN ACCESS - Grant Admin Role and Bypass RLS
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this SQL in your Supabase SQL Editor to fix admin dashboard access
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Find the admin user ID (replace email if different)
DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT := 'hixlabadmin@gmail.com';
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user not found with email: %', admin_email;
    RETURN;
  END IF;

  RAISE NOTICE 'Found admin user ID: %', admin_user_id;

  -- Step 2: Ensure user_roles table exists (should already exist)
  -- (Already created in migrations)

  -- Step 3: Grant admin role to the user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin role granted successfully';

END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 5: Update RLS Policies to Allow Admin Full Access
-- ═══════════════════════════════════════════════════════════════════════════

-- Purchases: Allow admins to see ALL purchases
DROP POLICY IF EXISTS "admins read all purchases" ON public.purchases;
CREATE POLICY "admins read all purchases"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.uid() = buyer_id
    OR auth.uid() = producer_id
  );

-- Beats: Allow admins to see ALL beats
DROP POLICY IF EXISTS "admins read all beats" ON public.beats;
CREATE POLICY "admins read all beats"
  ON public.beats FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR published = true
    OR producer_id = auth.uid()
  );

-- Producer Wallets: Allow admins to see ALL wallets
DROP POLICY IF EXISTS "admins read all wallets" ON public.producer_wallets;
CREATE POLICY "admins read all wallets"
  ON public.producer_wallets FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR producer_id = auth.uid()
  );

-- Withdrawals: Allow admins to see ALL withdrawals
DROP POLICY IF EXISTS "admins read all withdrawals" ON public.withdrawals;
CREATE POLICY "admins read all withdrawals"
  ON public.withdrawals FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR producer_id = auth.uid()
  );

-- Payout Accounts: Allow admins to see ALL payout accounts
DROP POLICY IF EXISTS "admins read all payout accounts" ON public.payout_accounts;
CREATE POLICY "admins read all payout accounts"
  ON public.payout_accounts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR producer_id = auth.uid()
  );

-- Profiles: Allow admins to see ALL profiles
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR id = auth.uid()
  );

-- Producer Profiles: Allow admins to see ALL producer profiles
DROP POLICY IF EXISTS "admins read all producer profiles" ON public.producer_profiles;
CREATE POLICY "admins read all producer profiles"
  ON public.producer_profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR user_id = auth.uid()
  );

-- Sample Packs: Allow admins to see ALL sample packs
DROP POLICY IF EXISTS "admins read all sample packs" ON public.sample_packs;
CREATE POLICY "admins read all sample packs"
  ON public.sample_packs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR published = true
    OR producer_id = auth.uid()
  );

-- Academy Applications: Allow admins to see ALL applications
DROP POLICY IF EXISTS "admins read all academy apps" ON public.academy_applications;
CREATE POLICY "admins read all academy apps"
  ON public.academy_applications FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR user_id = auth.uid()
  );

-- Payment Events: Already has admin policy, ensure it exists
DROP POLICY IF EXISTS "admins read payment events" ON public.payment_events;
CREATE POLICY "admins read payment events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 6: Verify Admin Access
-- ═══════════════════════════════════════════════════════════════════════════

-- Check if admin role was granted successfully
SELECT 
  u.email,
  ur.role,
  p.account_type,
  'Admin access configured' AS status
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'hixlabadmin@gmail.com';

-- Test the has_role function
SELECT 
  public.has_role(
    (SELECT id FROM auth.users WHERE email = 'hixlabadmin@gmail.com'),
    'admin'::public.app_role
  ) AS is_admin;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Now refresh your admin dashboard
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.user_roles IS 
'Stores user role assignments. Admin role grants full access to admin dashboard and all RLS-protected tables.';

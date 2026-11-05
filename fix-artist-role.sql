-- Fix Artist Role for mainsitemail09@gmail.com
-- Run this in your Supabase SQL Editor

-- 1. First, let's check what the current role is
SELECT 
  id, 
  email, 
  name, 
  account_type,
  created_at
FROM profiles
WHERE email = 'mainsitemail09@gmail.com';

-- 2. If the account_type is 'producer' or you need to fix it, run this:
UPDATE profiles
SET account_type = 'artist'
WHERE email = 'mainsitemail09@gmail.com';

-- 3. Also update the auth metadata to match
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{account_type}',
  '"artist"'
)
WHERE email = 'mainsitemail09@gmail.com';

-- 4. Verify the changes
SELECT 
  p.id,
  p.email,
  p.name,
  p.account_type as profile_role,
  u.raw_user_meta_data->>'account_type' as metadata_role
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email = 'mainsitemail09@gmail.com';

-- Expected result:
-- profile_role should be 'artist'
-- metadata_role should be 'artist'

-- URGENT FIX: Change account from producer to artist
-- For user: mainsitemail09@gmail.com (shown as mainsitemail@gmail.com in console)

-- Step 1: Check current state
SELECT 
  id, 
  email, 
  name, 
  account_type as current_role
FROM profiles 
WHERE email LIKE 'mainsitemail%@gmail.com';

-- Step 2: Update profile to artist
UPDATE profiles 
SET account_type = 'artist'
WHERE email LIKE 'mainsitemail%@gmail.com';

-- Step 3: Update auth metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{account_type}',
  '"artist"'
)
WHERE email LIKE 'mainsitemail%@gmail.com';

-- Step 4: Verify the fix
SELECT 
  p.id,
  p.email,
  p.name,
  p.account_type as profile_role,
  u.raw_user_meta_data->>'account_type' as metadata_role
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email LIKE 'mainsitemail%@gmail.com';

-- Expected result:
-- Both profile_role and metadata_role should now be 'artist'

# 🚨 Quick Fix for Artist Redirect Issue

## Test This Immediately:

1. Open browser console (F12)
2. Go to `/auth`
3. Sign in: `mainsitemail09@gmail.com` / `Tochi123!!!`
4. Check console for 🔍 messages

## Most Likely Cause:

The user account in your database has `account_type = 'producer'` when it should be `'artist'`.

## Fix:

### Option 1: Run SQL Script (Recommended)
Go to Supabase SQL Editor and paste:

```sql
-- Check current role
SELECT id, email, name, account_type 
FROM profiles 
WHERE email = 'mainsitemail09@gmail.com';

-- Fix the role
UPDATE profiles 
SET account_type = 'artist' 
WHERE email = 'mainsitemail09@gmail.com';

-- Update auth metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{account_type}',
  '"artist"'
)
WHERE email = 'mainsitemail09@gmail.com';

-- Verify
SELECT 
  p.email,
  p.account_type as profile_role,
  u.raw_user_meta_data->>'account_type' as metadata_role
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email = 'mainsitemail09@gmail.com';
```

Expected result: Both `profile_role` and `metadata_role` should be `'artist'`.

### Option 2: Sign Up Fresh (Alternative)

1. Create a NEW artist account with different email
2. Make sure to select "I'm an Artist" during signup
3. Verify it works correctly
4. Then fix the original account with SQL

## After Running Fix:

1. **Sign out completely**
2. **Clear browser cache/localStorage** or use incognito
3. **Sign in again**
4. Should now go to `/artist/dashboard` ✅

## Still Not Working?

Send me the console output (the 🔍 messages) and I'll diagnose further.

## Debug Logging Added

The app now logs detailed information when you sign in:
- What role is in the database
- What role is in auth metadata  
- What role the system thinks you have
- Where it's trying to route you

This will help us pinpoint exactly where the issue is.

## Remove Debug Logging Later

Once fixed, let me know and I'll remove the console.log statements to clean up the code.

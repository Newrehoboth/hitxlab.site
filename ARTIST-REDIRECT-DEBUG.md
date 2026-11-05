# Artist Redirect Issue - Debug Guide

## Problem
Artists logging in with credentials `mainsitemail09@gmail.com` are being redirected to `/producer/onboarding` instead of `/artist/dashboard`.

## Changes Made

I've added comprehensive debug logging to track down where the issue is occurring:

### 1. **auth.tsx** (Sign-in Flow)
Added logging at line 73-76 to see:
- What user object is returned from signIn
- What role the user has
- Where the user should be routed

### 2. **store.tsx** (User Loading)
Added logging in `loadUser` function to see:
- What data comes from the database
- What metadata exists in the auth session
- What final user object is created

### 3. **ProducerLayout.tsx** (Route Protection)
Added logging in the useEffect to see:
- What user object the layout receives
- What role the user has
- Whether redirects are triggered

## How to Test

1. **Open browser console** (F12 or Cmd+Option+I on Mac)
2. **Clear any existing sessions** (Sign out if logged in)
3. **Navigate to** `/auth` 
4. **Sign in** with: `mainsitemail09@gmail.com` / `Tochi123!!!`
5. **Watch the console** for messages starting with 🔍

## What to Look For

The console will show messages like:

```
🔍 loadUser - DB data: { id: "...", account_type: "artist", ... }
🔍 loadUser - metadata: { account_type: "artist", ... }
🔍 loadUser - final user: { id: "...", role: "artist", ... }
🔍 Sign-in successful. User: { id: "...", role: "artist", ... }
🔍 User role: artist
🔍 Routing to: /artist/dashboard
```

### Possible Issues to Check:

1. **Wrong role in database**: If DB data shows `account_type: "producer"` for the artist account
2. **Missing role in database**: If DB data is null and it's falling back to metadata
3. **Race condition**: If loadUser is called multiple times with different results
4. **ProducerLayout interference**: If the user is correctly routed to `/artist/dashboard` but then ProducerLayout redirects them

## Next Steps

Once you run the test and see the console output, send me:
1. Screenshot or copy-paste of the console messages
2. What page you end up on
3. Any error messages

This will tell us exactly where the routing is going wrong and I can fix it immediately.

## Expected Behavior

For an artist account:
1. Sign in → loadUser returns role: "artist"
2. auth.tsx routes to `/artist/dashboard`
3. ArtistLayout allows access (no redirect)
4. User stays on `/artist/dashboard`

For a producer account:
1. Sign in → loadUser returns role: "producer"
2. auth.tsx routes to `/producer/onboarding`
3. ProducerLayout allows access
4. User stays on `/producer/onboarding` (or dashboard if profile exists)

## Database Check

If the console shows the wrong role, we need to check the database:

```sql
SELECT id, email, name, account_type 
FROM profiles 
WHERE email = 'mainsitemail09@gmail.com';
```

The `account_type` should be `'artist'` for this user.

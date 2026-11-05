# Artist Redirect Issue - Fix Summary

## Problem Statement
When logging in with artist credentials (`mainsitemail09@gmail.com`), users are being redirected to `/producer/onboarding` instead of `/artist/dashboard`.

## Root Cause Analysis

The routing flow works as follows:

1. **Sign-in** (auth.tsx, line 73-76):
   ```typescript
   const u = await signIn(email, pw);
   routeAfter(u.role);
   ```

2. **Route determination** (auth.tsx, line 51-54):
   ```typescript
   const routeAfter = (accountType: Role) => {
     if (accountType === "producer") nav({ to: "/producer/onboarding" });
     else nav({ to: "/artist/dashboard", search: { tab: "overview" } });
   };
   ```

3. **User role loading** (store.tsx, loadUser function):
   ```typescript
   role: (data?.account_type as Role) ?? (meta.account_type as Role) ?? "artist"
   ```

## Potential Issues

### Issue 1: Wrong Role in Database
The `profiles` table might have `account_type = 'producer'` for the artist account.

**Check**: Run `fix-artist-role.sql` to verify and fix the database.

### Issue 2: Wrong Role in Auth Metadata
The user's `raw_user_meta_data` might have `account_type = 'producer'`.

**Check**: The `fix-artist-role.sql` script also updates this.

### Issue 3: Race Condition
The `loadUser` function might be fetching data before the database profile is fully created or synced.

**Solution**: The debug logging will help identify this.

## Changes Made

### 1. Added Debug Logging

**auth.tsx** - Sign-in flow:
```typescript
console.log("🔍 Sign-in successful. User:", u);
console.log("🔍 User role:", u.role);
console.log("🔍 Routing to:", u.role === "producer" ? "/producer/onboarding" : "/artist/dashboard");
```

**store.tsx** - User loading:
```typescript
console.log("🔍 loadUser - DB data:", data);
console.log("🔍 loadUser - metadata:", meta);
console.log("🔍 loadUser - final user:", user);
```

**ProducerLayout.tsx** - Route protection:
```typescript
console.log("🔍 ProducerLayout - user:", user);
console.log("🔍 ProducerLayout - user role:", user?.role);
```

### 2. Created Fix Script

**fix-artist-role.sql** - Database correction script to:
- Check current role in `profiles` table
- Update `account_type` to `'artist'`
- Update `raw_user_meta_data` in `auth.users`
- Verify the changes

## Testing Instructions

### Step 1: Check Console Logs

1. Open browser console (F12 or Cmd+Option+I)
2. Navigate to `/auth`
3. Sign in with: `mainsitemail09@gmail.com` / `Tochi123!!!`
4. Look for console messages starting with 🔍

### Step 2: Expected Console Output (for Artist)

```
🔍 loadUser - DB data: { id: "...", account_type: "artist", name: "...", email: "..." }
🔍 loadUser - metadata: { account_type: "artist", name: "..." }
🔍 loadUser - final user: { id: "...", role: "artist", name: "...", email: "..." }
🔍 Sign-in successful. User: { id: "...", role: "artist", ... }
🔍 User role: artist
🔍 Routing to: /artist/dashboard
```

### Step 3: If Role is Wrong

If console shows `role: "producer"` instead of `"artist"`:

1. Go to Supabase SQL Editor
2. Run the `fix-artist-role.sql` script
3. Sign out completely
4. Clear browser cache/localStorage
5. Sign in again
6. Check console again

## Database Schema Reference

**profiles table**:
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text,
  name text NOT NULL DEFAULT '',
  account_type public.account_type NOT NULL DEFAULT 'artist',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**account_type enum**:
```sql
CREATE TYPE public.account_type AS ENUM ('artist', 'producer');
```

## Route Protection Summary

### Producer Routes (ProducerLayout)
- Checks: `user.role === "producer"`
- Redirects: Artists → `/artist/dashboard`
- Redirects: Unauthenticated → `/auth`

### Artist Routes (ArtistLayout)
- Checks: `user` exists
- Redirects: Unauthenticated → `/auth`
- **NO** role checking (allows both artists and producers)

### Onboarding Page
- Checks: `user.role === "producer"`
- Redirects: Non-producers → `/`

## Expected Behavior

### Artist Login Flow:
1. Enter credentials at `/auth`
2. `signIn` returns user with `role: "artist"`
3. `routeAfter` navigates to `/artist/dashboard`
4. ArtistLayout allows access
5. User sees artist dashboard

### Producer Login Flow:
1. Enter credentials at `/auth`
2. `signIn` returns user with `role: "producer"`
3. `routeAfter` navigates to `/producer/onboarding`
4. ProducerLayout allows access
5. If profile exists: see dashboard
6. If no profile: complete onboarding

## Next Steps

1. **Test with console open** to see what role is being returned
2. **Run fix-artist-role.sql** if role is wrong in database
3. **Report back** with console output if issue persists
4. **Remove debug logging** once issue is resolved

## Files Modified

- `/Users/user/Documents/beats_market/beat-boutique-hq/src/routes/auth.tsx`
- `/Users/user/Documents/beats_market/beat-boutique-hq/src/lib/store.tsx`
- `/Users/user/Documents/beats_market/beat-boutique-hq/src/components/ProducerLayout.tsx`

## Files Created

- `/Users/user/Documents/beats_market/beat-boutique-hq/ARTIST-REDIRECT-DEBUG.md`
- `/Users/user/Documents/beats_market/beat-boutique-hq/fix-artist-role.sql`
- `/Users/user/Documents/beats_market/beat-boutique-hq/ARTIST-REDIRECT-FIX-SUMMARY.md` (this file)

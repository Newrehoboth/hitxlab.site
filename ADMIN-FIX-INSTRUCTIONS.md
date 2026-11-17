# 🔧 FIX ADMIN DASHBOARD ACCESS

## Problem
Your admin dashboard shows "Access Warning: Forbidden" because the admin user doesn't have the proper role assigned in the database.

## Solution (2 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Quick Fix
1. Copy the **ENTIRE** content from `QUICK-FIX-ADMIN.sql`
2. Paste it into the SQL Editor
3. Click **RUN** (or press Cmd/Ctrl + Enter)

### Step 3: Verify the Fix
You should see output like this:
```
email                  | role  | account_type | status
-----------------------+-------+--------------+------------------------
hixlabadmin@gmail.com  | admin | admin        | ✅ Admin role granted
```

### Step 4: Refresh Admin Dashboard
1. Go back to your admin dashboard: `http://localhost:8080/admin`
2. Press **Cmd/Ctrl + Shift + R** (hard refresh)
3. Click the **"Refresh Data"** button

You should now see all the data!

---

## What This Does

The SQL script:
1. ✅ Adds the `admin` role to your user in the `user_roles` table
2. ✅ Updates your profile `account_type` to `admin`
3. ✅ Verifies the changes were applied

The existing RLS policies already check for admin role using:
```sql
public.has_role(auth.uid(), 'admin')
```

So once the role is granted, you'll have access to:
- All purchases
- All beats (published and unpublished)
- All producer wallets
- All withdrawals
- All user profiles
- All sample packs
- All academy applications

---

## If It Still Doesn't Work

### Option A: Check if you're logged in
1. Open browser console (F12)
2. Type: `localStorage.getItem('supabase.auth.token')`
3. If it returns `null`, you need to log in again

### Option B: Clear browser cache
1. Open Dev Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Option C: Run the full fix
If the quick fix didn't work, run `FIX-ADMIN-ACCESS.sql` instead.
This includes additional RLS policy updates to ensure admin access.

---

## Need Help?

If you're still seeing "Forbidden" after running the SQL:

1. **Check the browser console** for errors
2. **Verify your email** matches exactly: `hixlabadmin@gmail.com`
3. **Try logging out and back in**
4. **Check if the `user_roles` table exists**:
   ```sql
   SELECT * FROM public.user_roles LIMIT 5;
   ```

---

## Prevention

To avoid this issue in the future, when creating new admin users:

```sql
-- Grant admin role immediately after user creation
INSERT INTO public.user_roles (user_id, role)
VALUES ('<new-admin-user-id>', 'admin'::public.app_role);

UPDATE public.profiles
SET account_type = 'admin'
WHERE id = '<new-admin-user-id>';
```

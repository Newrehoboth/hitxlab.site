# 🚨 URGENT FIXES - Email & Purchase Issues

## Problems Found:
1. ❌ Missing `SUPABASE_SERVICE_ROLE_KEY` in Vercel
2. ❌ Missing `purchases` table in database
3. ❌ Emails can't send without service role key

## Fix #1: Add Service Role Key to Vercel

### Step 1: Get the Service Role Key

1. Go to: https://supabase.com/dashboard/project/jcnritxaulgwdeardfss/settings/api
2. Scroll down to **"Project API keys"**
3. Find **"service_role" key** (NOT the "anon" key!)
4. Click "Reveal" and copy it

### Step 2: Add to Vercel

1. In your Vercel dashboard (already open)
2. Click **"Add Environment Variable"**
3. Add:
   ```
   Name: SUPABASE_SERVICE_ROLE_KEY
   Value: [paste the service_role key from step 1]
   ```
4. Check all environments:
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
5. Click **Save**

### Step 3: Redeploy

1. Go to **Deployments** tab
2. Click on latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to finish

## Fix #2: Create Purchases Table

### Run This SQL in Supabase

1. Go to: https://supabase.com/dashboard/project/jcnritxaulgwdeardfss/editor
2. Click **"SQL Editor"**
3. Click **"New Query"**
4. Copy and paste this:

```sql
-- Create purchases table for storing user purchases/library
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  purchase_id text NOT NULL UNIQUE,
  license_name text NOT NULL,
  license_type text NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT purchases_user_beat_unique UNIQUE (user_id, beat_id, purchase_id)
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own purchases"
  ON public.purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON public.purchases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;

-- Create indexes
CREATE INDEX purchases_user_id_idx ON public.purchases(user_id);
CREATE INDEX purchases_beat_id_idx ON public.purchases(beat_id);
CREATE INDEX purchases_created_at_idx ON public.purchases(created_at DESC);
```

5. Click **"Run"**
6. Should see: "purchases table created successfully"

## Fix #3: Also Check These Env Vars in Vercel

Make sure ALL these are set:

```
✅ RESEND_API_KEY = re_Tc8G694F_K4TSfSazxUJKMxH1n3WcgB2J
✅ SUPABASE_SERVICE_ROLE_KEY = [get from Supabase]
✅ SUPABASE_URL = https://jcnritxaulgwdeardfss.supabase.co
✅ SUPABASE_PUBLISHABLE_KEY = sb_publishable_Cz_Aiqat9O_GHZAkpFrsqQ_ZnSthm-G
✅ VITE_SUPABASE_URL = https://jcnritxaulgwdeardfss.supabase.co
✅ VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_Cz_Aiqat9O_GHZAkpFrsqQ_ZnSthm-G
✅ VITE_SITE_URL = https://hitxlab.com.ng
```

## Test After Fixes

1. ✅ Redeploy Vercel
2. ✅ Visit your site: https://hitxlab.com.ng
3. ✅ Make a test purchase
4. ✅ Check console - should see:
   ```
   📧 Attempting to send purchase email to: [email]
   ✅ Purchase email sent successfully
   ```
5. ✅ Check email inbox (and spam!)
6. ✅ Check Resend dashboard: https://resend.com/emails

## Why This Happened

- The `SUPABASE_SERVICE_ROLE_KEY` is needed for server-side operations like sending emails
- The `purchases` table stores user library/purchase history
- Without these, purchases fail and emails can't send

## Priority Order

1. **FIRST**: Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel
2. **SECOND**: Create `purchases` table in Supabase  
3. **THIRD**: Redeploy Vercel
4. **FOURTH**: Test purchase

Do these in order and everything should work! 🚀

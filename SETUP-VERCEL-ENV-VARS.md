# Set Up Environment Variables on Vercel

## ⚠️ IMPORTANT: Emails won't work without these!

Your purchase emails are failing because the `RESEND_API_KEY` isn't set on Vercel.

### Steps to Fix:

1. **Go to Vercel Dashboard**: https://vercel.com/

2. **Select your project**: `hitxlabsite` or whatever your project is called

3. **Go to Settings** → **Environment Variables**

4. **Add this variable**:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_Tc8G694F_K4TSfSazxUJKMxH1n3WcgB2J`
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

5. **Redeploy** (REQUIRED):
   - Go to **Deployments** tab
   - Find the latest deployment
   - Click the three dots (**...**) → **Redeploy**
   - OR just push any change to trigger a new deployment

### Why this is needed:

- The `.env` file is only for local development
- Vercel deployments need variables set in their dashboard
- Without `RESEND_API_KEY`, the email sending will fail silently

### Test it:

After redeployment:
1. Buy a beat
2. You should receive an email
3. Producer should receive a sale notification email

---

## All Environment Variables You Should Have on Vercel:

```
RESEND_API_KEY=re_Tc8G694F_K4TSfSazxUJKMxH1n3WcgB2J
VITE_SITE_URL=https://www.hitxlab.com
SUPABASE_URL=https://jcnritxaulgwdeardfss.supabase.co
SUPABASE_PROJECT_ID=jcnritxaulgwdeardfss
SUPABASE_PUBLISHABLE_KEY=sb_publishable_Cz_Aiqat9O_GHZAkpFrsqQ_ZnSthm-G
VITE_SUPABASE_URL=https://jcnritxaulgwdeardfss.supabase.co
VITE_SUPABASE_PROJECT_ID=jcnritxaulgwdeardfss
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Cz_Aiqat9O_GHZAkpFrsqQ_ZnSthm-G
PAYSTACK_SECRET_KEY=sk_live_8c528e95019e41dd5611a15977a05d30fcd36ebf
PAYSTACK_PUBLIC_KEY=pk_live_e9bf7cfed2bff11590869169b377d641f6932a5a
VITE_PAYSTACK_PUBLIC_KEY=pk_live_e9bf7cfed2bff11590869169b377d641f6932a5a
PAYMENT_PROVIDER=paystack
```

### Pro tip:
You can paste multiple variables at once by clicking "Add Variable" multiple times or use the bulk import feature if available.

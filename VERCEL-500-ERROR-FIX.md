# Vercel 500 Error Fix Guide

## Issue
Your site works locally but shows "500 Internal Server Error" on Vercel at hitxlab.com.ng

## Root Causes (Most Common)

### 1. Missing Environment Variables ⚠️
The most common cause! Vercel needs ALL your environment variables from `.env`

### 2. Build Configuration Issues
TanStack Start needs proper Vercel configuration

### 3. Server Function Errors
Something in your server-side code is crashing

---

## SOLUTION 1: Add All Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com
2. Select your project (hitxlab.com.ng)
3. Go to **Settings** > **Environment Variables**

### Step 2: Add ALL These Variables

Copy these from your `.env` file:

```bash
# Supabase
SUPABASE_PROJECT_ID=jcnritxaulgwdeardfss
SUPABASE_PUBLISHABLE_KEY=sb_publishable_Cz_Aiqat9O_GHZAkpFrsqQ_ZnSthm-G
SUPABASE_URL=https://jcnritxaulgwdeardfss.supabase.co
VITE_SUPABASE_PROJECT_ID=jcnritxaulgwdeardfss
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Cz_Aiqat9O_GHZAkpFrsqQ_ZnSthm-G
VITE_SUPABASE_URL=https://jcnritxaulgwdeardfss.supabase.co

# Resend (Email)
RESEND_API_KEY=re_Tc8G694F_K4TSfSazxUJKMxH1n3WcgB2J

# Site URL
VITE_SITE_URL=https://hitxlab.com.ng

# Paystack (Live Keys)
PAYSTACK_SECRET_KEY=sk_live_8c528e95019e41dd5611a15977a05d30fcd36ebf
PAYSTACK_PUBLIC_KEY=pk_live_e9bf7cfed2bff11590869169b377d641f6932a5a
VITE_PAYSTACK_PUBLIC_KEY=pk_live_e9bf7cfed2bff11590869169b377d641f6932a5a
PAYMENT_PROVIDER=paystack
```

### Step 3: Check Environment Scope
For EACH variable, make sure these are checked:
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

### Step 4: Redeploy
After adding all variables:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **"..."** menu
4. Click **"Redeploy"**
5. Click **"Redeploy"** again to confirm

**IMPORTANT:** Changes to environment variables ONLY take effect after redeployment!

---

## SOLUTION 2: Check Vercel Build Logs

### How to Check:
1. Go to **Deployments** tab in Vercel
2. Click on the failed deployment
3. Click **"View Build Logs"**
4. Look for RED error messages

### Common Errors to Look For:
- `Module not found`
- `Cannot find module`
- `TypeScript error`
- `Build failed`
- Server function errors
- Supabase connection errors

### If You See Build Errors:
Take a screenshot and we'll fix the specific error.

---

## SOLUTION 3: Add Vercel Configuration File

Create a `vercel.json` file in your project root to help Vercel understand your build:

```json
{
  "version": 2,
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": ".output/public",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

---

## SOLUTION 4: Check Vercel Function Logs (Runtime Errors)

If the build succeeds but you still get 500 errors:

### Step 1: Enable Vercel Logs
1. Go to your project in Vercel
2. Click **"Logs"** tab
3. Look for errors when you visit hitxlab.com.ng

### Step 2: Common Runtime Errors
- **"Cannot connect to Supabase"** → Environment variables missing
- **"PAYSTACK_SECRET_KEY is not defined"** → Environment variables missing
- **"Module not found"** → Build configuration issue
- **Database/SQL errors** → Check Supabase is accessible

---

## SOLUTION 5: Temporarily Disable SSR (Server-Side Rendering)

If all else fails, we can temporarily disable server-side features:

### In `vite.config.ts`:
```typescript
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Disable SSR temporarily
    ssr: false,
    server: { entry: "server" },
  },
});
```

Then rebuild and redeploy.

---

## SOLUTION 6: Check for Server-Side Code Issues

The new `academy.tsx` page or other recent changes might have server-side issues.

### Common Issues:
1. **Window/Document usage in SSR** - These don't exist on the server
2. **localStorage/sessionStorage** - Not available on server
3. **Browser-only APIs** - Won't work on server

### Quick Fix:
Wrap browser code with checks:

```typescript
// BAD (crashes on server)
const data = localStorage.getItem('key');

// GOOD (works everywhere)
const data = typeof window !== 'undefined' 
  ? localStorage.getItem('key') 
  : null;
```

---

## QUICK DEBUG STEPS

### 1. Check Build Status
Go to Vercel → Deployments → Check if build is GREEN ✅ or RED ❌

### 2. If Build is GREEN but Site Shows 500:
The build succeeded but runtime is failing. Check:
- Environment variables are set
- Function logs for runtime errors

### 3. If Build is RED:
The build is failing. Check:
- Build logs for specific error
- Fix the error and push again

---

## MOST LIKELY FIX (Do This First!)

**90% of the time, it's missing environment variables!**

### Quick Checklist:
1. ✅ Go to Vercel Dashboard
2. ✅ Settings → Environment Variables
3. ✅ Add ALL 12 variables from above
4. ✅ Make sure "Production" is checked for each
5. ✅ Go to Deployments → Redeploy

**After redeployment, wait 1-2 minutes then check hitxlab.com.ng**

---

## If Still Not Working

### Share These Details:
1. **Vercel Build Logs** (screenshot or text)
2. **Vercel Function Logs** (if available)
3. **Specific error message** from browser console (F12)

This will help me pinpoint the exact issue!

---

## Test After Fix

Once deployed, test:
1. ✅ Homepage loads
2. ✅ Can sign in
3. ✅ Can browse beats
4. ✅ Can purchase (Paystack popup opens)
5. ✅ Sample packs page works
6. ✅ Academy page works
7. ✅ Producer dashboard works

---

**Next Step:** Go to Vercel dashboard and add all environment variables, then redeploy! 🚀

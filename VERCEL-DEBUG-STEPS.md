# Vercel 500 Error - Debugging Steps

Your site at https://hitxlab.com.ng is showing a 500 Internal Server Error. Since environment variables are already set, follow these steps to identify and fix the issue:

## Step 1: Check Deployment Status

1. Go to **Vercel Dashboard** → https://vercel.com
2. Find your **hitxlab.com.ng** project
3. Click on **Deployments** tab
4. Look at the most recent deployment

### What to check:
- ✅ **Green checkmark** = Build succeeded, but runtime error
- ❌ **Red X** = Build failed

## Step 2: View Build Logs

1. Click on the most recent deployment
2. Click "**View Build Logs**" or "**Logs**" button
3. Scroll through and look for:
   - RED error messages
   - `Error:` lines
   - `Failed to compile` messages
   - Module not found errors

### Common Build Errors:

```
Error: Cannot find module 'X'
→ Missing dependency in package.json

TypeScript error in file.tsx
→ Type error in your code

Build failed with exit code 1
→ Generic build failure, check above for details
```

## Step 3: Check Function/Runtime Logs

If build succeeded but you get 500 errors:

1. Go to **Logs** tab in Vercel dashboard
2. Try visiting https://hitxlab.com.ng
3. Immediately check the logs - errors should appear

### Common Runtime Errors:

```
Error: SUPABASE_URL is not defined
→ Environment variable not loaded

Cannot read properties of undefined
→ Server-side code accessing browser APIs

Module not found at runtime
→ Build/bundling issue
```

## Step 4: Redeploy from Scratch

Sometimes Vercel cache causes issues:

1. Go to **Settings** → **General**
2. Scroll down to "**Danger Zone**"
3. **Do NOT delete** - instead:
4. Go to **Deployments** tab
5. Find the last **successful** deployment
6. Click "**...**" menu → "**Promote to Production**"

OR:

1. Go to latest deployment
2. Click "**...**" menu
3. Click "**Redeploy**"
4. **UNCHECK** "Use existing build cache"
5. Click **Redeploy** button

## Step 5: Check Build Command

Make sure Vercel is using the correct build command:

1. Go to **Settings** → **General**
2. Check "**Build & Development Settings**"

Should be:
```
Framework Preset: Vite (or None)
Build Command: npm run build
Output Directory: .output/public
Install Command: npm install
```

## Step 6: Test Locally with Production Build

Run these commands locally to simulate production:

```bash
# Clean everything
rm -rf .output node_modules

# Fresh install
npm install

# Build for production
npm run build

# Preview production build
npm run preview
```

Visit http://localhost:4173 (or whatever port it says)

If it works locally but fails on Vercel, the issue is environment-specific.

## Step 7: Check Node Version

Vercel might be using a different Node version:

1. Create `vercel.json` in your project root:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "vite",
  "outputDirectory": ".output/public"
}
```

2. Commit and push
3. Redeploy

## Step 8: Simplify to Find the Issue

If nothing works, let's isolate the problem:

### Test 1: Check if it's the academy page

Temporarily comment out the academy route:

1. Rename `src/routes/academy.tsx` to `src/routes/academy.tsx.backup`
2. Push to git
3. Check if site works

### Test 2: Check for imports

Look for any imports that might fail:

```bash
# Search for problematic imports
grep -r "import.*from.*'fs'" src/
grep -r "import.*from.*'path'" src/
grep -r "import.*from.*'node:" src/
```

These won't work in browser/Cloudflare Workers.

## Step 9: Enable Vercel Error Reporting

Add error logging to see what's failing:

Create `.vercel/edge-config/errors.json`:

```json
{
  "errorReporting": {
    "enabled": true,
    "logLevel": "error"
  }
}
```

## Most Likely Issues (in order):

### 1. Build Failure (80% chance)
- Check build logs for errors
- Fix the specific error shown
- Redeploy

### 2. Runtime Error (15% chance)
- Check function logs
- Look for undefined environment variables
- Check for server-side code accessing browser APIs

### 3. Vercel Configuration (5% chance)
- Wrong build command
- Wrong output directory
- Cache issues

## Quick Test URLs

Try these to see what works:

```
https://hitxlab.com.ng → 500 error?
https://hitxlab.com.ng/browse → 500 error?
https://hitxlab.com.ng/api/test → 404 or 500?
```

If all show 500, the issue is at the root server level.
If some work, specific routes are broken.

## What to Share for Help

If still stuck, share these:

1. **Build logs** (screenshot or text)
2. **Runtime/Function logs** (if build succeeded)
3. **Specific error messages** from browser console (F12)
4. **Which deployment was the last working one?**

## Emergency Fix: Rollback

If you had a working deployment before:

1. Go to **Deployments**
2. Find the last GREEN deployment that worked
3. Click "**...**" → "**Promote to Production**"

This will instantly restore your working site while you debug.

---

**Next Action:** Check Vercel deployment logs and share any error messages you see! 🔍

# Fix for Vercel 500 Error - TanStack Version Mismatch

## Problem Identified ✅

Your Vercel logs show: `TypeError: matchedRoutes is not iterable`

This is caused by **version mismatches** in your TanStack Router packages. The packages are out of sync, which causes runtime errors in production.

## Solution: Clean Install

Run these commands in your terminal:

```bash
# 1. Clean up old dependencies
rm -rf node_modules package-lock.json

# 2. Fresh install
npm install

# 3. Test build locally
npm run build

# 4. Test it works
npm run dev
```

Visit http://localhost:8083 to confirm it works.

## Then Deploy to Vercel

### Option 1: Push to Git (Automatic Deploy)
```bash
git add .
git commit -m "fix: resolve TanStack version mismatches"
git push
```

Vercel will automatically deploy.

### Option 2: Manual Deploy via Vercel CLI
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
vercel --prod
```

## Expected Result

After the clean install and redeploy:
- ✅ Local build should work
- ✅ Vercel deployment should succeed
- ✅ https://hitxlab.com.ng should load without 500 error

## What Caused This?

The error log showed:
```
invalid: @tanstack/react-router@1.170.18 (expected: 1.170.25)
invalid: @tanstack/router-core@1.171.15 (expected: 1.171.21)
```

These version mismatches cause the router to fail during server-side rendering on Vercel.

## If Still Not Working

### Check Vercel Build Settings:

1. Go to Vercel Dashboard → Your Project
2. Settings → General → Build & Development Settings
3. Ensure:
   - **Framework Preset**: Vite (or None)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.output/public`
   - **Install Command**: `npm install`

### Clear Vercel Cache:

1. Go to Deployments tab
2. Click on latest deployment
3. Click "..." menu → "Redeploy"
4. **UNCHECK** "Use existing build cache"
5. Click Redeploy

## Alternative Quick Fix (If Above Doesn't Work)

If the clean install doesn't fix it, try updating the lovable config package:

```bash
npm install @lovable.dev/vite-tanstack-config@latest
npm install
```

Then rebuild and deploy.

---

**Run the commands above and let me know if the site loads!** 🚀

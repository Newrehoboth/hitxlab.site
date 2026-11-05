# Producer Routing Fix

## Problem
Producers with existing profiles were being redirected to the onboarding page instead of their dashboard when logging in.

## Root Cause
The `routeAfter` function in `auth.tsx` was sending ALL producers to `/producer/onboarding`, without checking if they already had a profile.

## The Fix
Updated `routeAfter` to check if a producer profile exists:
- **If profile exists** → Go to `/producer/dashboard`
- **If no profile** → Go to `/producer/onboarding`

## Changes Made
1. Made `routeAfter` async and added `userId` parameter
2. Added check for existing `producer_profiles` entry
3. Route to dashboard if profile exists, onboarding if not
4. Added `supabase` import to auth.tsx

## Test Now

### For Producers WITH Profile:
1. **Sign out completely**
2. **Sign in as producer** (with existing profile)
3. **Should go directly to** `/producer/dashboard` ✅
4. **NOT** to onboarding page

### For New Producers:
1. **Sign up as new producer**
2. **Should go to** `/producer/onboarding` ✅
3. **Complete onboarding**
4. **Next login** should go to dashboard

### For Artists:
1. **Sign in as artist**
2. **Should go to** `/artist/dashboard` ✅
3. (No change - this already worked)

## Files Modified
- ✅ `/src/routes/auth.tsx` - Fixed routeAfter logic
- ✅ Added supabase import
- ✅ Made function async
- ✅ Added profile checking

## What's Fixed Now
- ✅ Artist redirect issue (previous fix)
- ✅ Negotiation creation (previous fix)
- ✅ Producer routing based on profile existence (this fix)

## Next: Test Negotiations on Producer Side
Once you can log in as producer and reach the dashboard:
1. Go to **Messages tab**
2. Check if negotiations appear
3. Send me screenshot of console (🔍 messages)

This will help us verify the negotiations are loading properly!

# Vercel Email Setup Guide

## Current Issue
The `RESEND_API_KEY` is set in Vercel, but server functions might not be working properly.

## Check Your Vercel Settings

### 1. Verify Environment Variables

In your Vercel dashboard (which I can see is open), make sure:

✅ `RESEND_API_KEY` = `your_resend_api_key_here`

**IMPORTANT**: Click on the variable and check:
- ✅ Is it available for **Production**?
- ✅ Is it available for **Preview**?
- ✅ Is it available for **Development**?

Make sure ALL THREE are checked!

### 2. Redeploy After Adding Variables

After adding or changing environment variables:
1. Go to **Deployments** tab
2. Click on latest deployment
3. Click **Redeploy**
4. Select "Use existing build cache" or rebuild

Environment variables are only available AFTER redeployment!

### 3. Check Build Logs

In Vercel:
1. Go to **Deployments**
2. Click on latest deployment
3. Check **Build Logs** for any errors related to:
   - `@tanstack/react-start`
   - Server functions
   - API routes

## Alternative Solution: Use Supabase Edge Function

Instead of TanStack server functions, we can use Supabase Edge Functions which work better with Vercel.

### Step 1: Create Edge Function

Create this file: `supabase/functions/send-purchase-email/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { to, buyerName, beatTitle, producerName, licenseName, price, purchaseId } = await req.json()

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Octave <noreply@hitxlab.com.ng>',
        to,
        subject: `Your beat license is ready — ${beatTitle}`,
        html: `[Your HTML email template here]`,
      }),
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

### Step 2: Deploy Edge Function

```bash
supabase functions deploy send-purchase-email --project-ref jcnritxaulgwdeardfss
```

### Step 3: Set Resend API Key in Supabase

```bash
supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY --project-ref jcnritxaulgwdeardfss
```

## Simpler Solution: Direct Resend Call from Client

For now, let's just call Resend directly from the success page:

### In `/src/routes/purchase/success.tsx`

```typescript
useEffect(() => {
  if (purchaseId && beatTitle) {
    // Call a simple API endpoint
    fetch('/api/send-purchase-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user?.email,
        buyerName: user?.name,
        beatTitle,
        producerName,
        licenseName,
        price: parseFloat(price),
        purchaseId,
      }),
    }).catch(console.error);
  }
}, [purchaseId]);
```

## Debug: Check if Server Functions Work

Add this test endpoint to verify server functions work on Vercel.

Create: `/src/routes/api/test-email.ts`

```typescript
import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'

export const Route = createAPIFileRoute('/api/test-email')({
  GET: async ({ request }) => {
    const hasKey = !!process.env.RESEND_API_KEY
    return json({ 
      message: 'Server function works!',
      hasResendKey: hasKey,
      env: process.env.NODE_ENV,
    })
  },
})
```

Then visit: `https://hitxlab.com.ng/api/test-email`

Should return:
```json
{
  "message": "Server function works!",
  "hasResendKey": true,
  "env": "production"
}
```

If `hasResendKey` is `false`, the environment variable isn't being read!

## Quick Fix for Now

The fastest solution: Just skip server-side and send emails from client:

```typescript
// In CartDrawer after purchase
const sendEmail = async () => {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_RESEND_API_KEY',
      },
      body: JSON.stringify({
        from: 'Octave <noreply@hitxlab.com.ng>',
        to: user.email,
        subject: 'Your purchase is ready!',
        html: '<h1>Thanks for your purchase!</h1>',
      }),
    });
  } catch (e) {
    console.error('Email failed:', e);
  }
};
```

**Note**: This exposes your API key in the client, so only use for testing!

## Best Solution

Use Supabase Edge Functions (shown above) - they work perfectly with Vercel and keep your API key secure.

Want me to implement the Edge Function approach?

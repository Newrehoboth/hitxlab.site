# Checkout Fix - No Service Role Key Required

## Problem
The checkout was failing with "Beat lookup failed: Invalid API key" because it required the `SUPABASE_SERVICE_ROLE_KEY` which you don't want to use.

## Solution
I've modified the code to work WITHOUT the service role key by using RLS (Row Level Security) policies instead.

## What I Changed

### 1. Modified Supabase Client (`src/integrations/supabase/client.server.ts`)
- Changed from throwing an error to using the publishable key as a fallback
- Now works with just the `SUPABASE_PUBLISHABLE_KEY` that's already in your `.env`

### 2. Created RLS Policy SQL (`FIX-RLS-POLICIES.sql`)
- Allows authenticated users to read published beats
- Allows authenticated users to read payout accounts (for subaccount lookup)
- Allows authenticated users to create their own purchases
- Allows authenticated users to read their own purchases

## What You Need to Do

### Step 1: Run the SQL Migration
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/jcnritxaulgwdeardfss
2. Click on "SQL Editor" in the left sidebar
3. Open the file `FIX-RLS-POLICIES.sql` from your project
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click "Run" to execute

### Step 2: Restart Your Dev Server
```bash
# Stop the current server (Ctrl+C if running)
npm run dev
```

### Step 3: Test Checkout
1. Add a beat to your cart
2. Click "Pay with Paystack"
3. Complete the payment
4. The 10%/90% split should work automatically via Paystack subaccounts

## How the 10%/90% Split Works

1. **Producer Setup** (already implemented):
   - Producer connects their bank account in dashboard
   - System creates a Paystack subaccount with 10% platform charge
   - Subaccount code is stored in `payout_accounts` table

2. **Checkout Flow** (already implemented):
   - Customer selects beat and license
   - Paystack popup opens for payment
   - Payment includes the producer's subaccount code
   - **Paystack automatically splits**: 10% to platform, 90% to producer

3. **After Payment** (already implemented):
   - Payment reference is verified with Paystack API
   - Purchase is recorded in database
   - Downloads are unlocked for the customer
   - Producer sees the sale in their dashboard

## Important Notes

- ✅ No service role key needed
- ✅ Uses standard RLS security
- ✅ 10%/90% split handled by Paystack (not manual)
- ✅ All existing features preserved
- ⚠️ Make sure to run the SQL migration first

## Troubleshooting

### If you still see "Invalid API key":
1. Make sure you ran the SQL migration
2. Check that your `.env` has `SUPABASE_PUBLISHABLE_KEY`
3. Restart your dev server

### If checkout completes but no purchase record:
- The `record_verified_marketplace_purchase` RPC function may need updating
- Check Supabase logs for permission errors

### For Vercel Deployment:
- Just deploy normally - no special env vars needed beyond what's already there
- The `PAYSTACK_SECRET_KEY` and `SUPABASE_PUBLISHABLE_KEY` should already be set in Vercel

## Testing the Split

To verify the 10%/90% split is working:
1. Make a test purchase
2. Check your Paystack dashboard transactions
3. Verify the subaccount split was applied
4. Producer should see 90% in their settlement

---

**Status**: Ready to test after running SQL migration
**Last Updated**: 2026-07-31

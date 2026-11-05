# Instructions for Loveable: Fix Paystack Split Payment

## Problem
The Paystack 10%/90% split payment is not working because the checkout doesn't pass the producer's `subaccount` parameter to Paystack.

## What Needs To Be Done

### 1. Database: Add RLS Policy for Reading Subaccount Codes

**Run this SQL in Supabase SQL Editor:**

```sql
-- Allow anyone to read subaccount codes (needed for checkout)
CREATE POLICY "allow_read_subaccount_for_checkout" 
ON payout_accounts 
FOR SELECT 
USING (true);
```

**Why:** The `payout_accounts` table needs a policy to allow anonymous reads of `paystack_subaccount_code` so the checkout can fetch it.

---

### 2. Code Changes Already Made (In Current Commit)

The following files have been updated to implement split payment:

#### A. `src/lib/payouts.server.ts`
- Added `getSubaccountForBeat()` - fetches subaccount using service role
- Added `getSubaccountForBeatPublic()` - fetches subaccount using publishable key (bypasses service role requirement)

#### B. `src/lib/payouts.functions.ts`
- Added `getSubaccountForBeatFn` - server function wrapper that calls `getSubaccountForBeatPublic()`

#### C. `src/components/CartDrawer.tsx`
- Updated `checkout()` function to:
  1. Fetch producer's subaccount code before payment
  2. Pass `subaccount` parameter to Paystack.setup()
  3. Log split status to console

---

### 3. What To Tell Loveable

Copy and paste this message to Loveable:

```
I need you to verify and deploy the Paystack split payment implementation. Here's what was done:

1. **Database Change Needed:**
   Run this SQL in Supabase:
   ```sql
   CREATE POLICY "allow_read_subaccount_for_checkout" 
   ON payout_accounts 
   FOR SELECT 
   USING (true);
   ```

2. **Code Changes (Already Committed):**
   - `src/lib/payouts.server.ts` - Added `getSubaccountForBeatPublic()` function
   - `src/lib/payouts.functions.ts` - Added `getSubaccountForBeatFn` wrapper
   - `src/components/CartDrawer.tsx` - Updated checkout to fetch and pass subaccount to Paystack

3. **How It Works:**
   - When buyer clicks "Pay with Paystack", the checkout fetches the producer's subaccount code
   - The subaccount code (e.g., ACCT_grch0rtggi68b72) is passed to Paystack
   - Paystack automatically splits payment: 10% to platform, 90% to producer

4. **Testing:**
   After deployment, test with a real purchase and check:
   - Browser console should show: "✅ Applying 10%/90% split payment with subaccount: ACCT_xxxx"
   - Paystack Dashboard → Transactions → Transaction Splits should show 2 splits

Please review these changes and deploy to production.
```

---

## What Loveable Should Verify

1. **Check the RLS policy was created** (run the SQL query)
2. **Review the code changes** in the 3 files mentioned
3. **Test locally** if possible
4. **Deploy to production** (Vercel)

---

## Expected Behavior After Fix

### Before Payment:
```
Browser Console:
[Checkout] Subaccount for beat b0a6d841-... : ACCT_grch0rtggi68b72
✅ Applying 10%/90% split payment with subaccount: ACCT_grch0rtggi68b72
```

### After Payment:
```
Paystack Dashboard → Transactions → Click transaction → Transaction Splits:
- Platform: ₦10 (10%)
- Subaccount ACCT_grch0rtggi68b72: ₦90 (90%)
```

---

## Files Modified

1. `/src/lib/payouts.server.ts` - Added subaccount lookup functions
2. `/src/lib/payouts.functions.ts` - Added server function wrapper
3. `/src/components/CartDrawer.tsx` - Updated checkout flow

---

## Key Technical Details

- Uses `@supabase/ssr` `createBrowserClient` with publishable key to bypass service role requirement
- Subaccount code is stored in `payout_accounts.paystack_subaccount_code`
- RLS policy allows SELECT on `payout_accounts` table
- Only works for single-beat purchases (multi-beat needs Paystack split groups)

---

## Testing Checklist

- [ ] SQL policy created successfully
- [ ] Code builds without errors
- [ ] Browser console shows subaccount code
- [ ] Paystack shows split details
- [ ] Producer receives 90% in bank account

---

## Support

If splits still don't work:
1. Check browser console for error messages
2. Check server logs for `[getSubaccountForBeatPublic]` errors
3. Verify RLS policy exists: `SELECT * FROM pg_policies WHERE tablename = 'payout_accounts';`
4. Confirm subaccount in database: `SELECT paystack_subaccount_code FROM payout_accounts WHERE producer_id = '...';`

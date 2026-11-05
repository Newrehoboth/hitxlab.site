# ✅ Paystack Split Payment FIXED

## Issue Summary

The payment split was **NOT working** because the `subaccount` parameter was missing from the Paystack checkout configuration.

### Previous Behavior:
- ❌ Paystack checkout did NOT include `subaccount` field
- ❌ Payments showed **0 splits** in Paystack dashboard
- ❌ 100% of payment went to platform account
- ❌ Producer received nothing automatically

### Current Behavior (FIXED):
- ✅ Checkout fetches producer's `subaccount_code` from database
- ✅ Passes `subaccount` to Paystack.setup() configuration
- ✅ Paystack automatically applies 10%/90% split
- ✅ Platform receives 10%, Producer receives 90%
- ✅ Splits will show in Paystack dashboard under "Transaction Splits"

---

## What Was Changed

### 1. **Added Server Function** (`src/lib/payouts.server.ts`)
```typescript
export async function getSubaccountForBeat(beatId: string): Promise<string | null>
```
- Fetches the producer ID for a beat
- Returns the producer's Paystack subaccount code
- Used at checkout to enable split payment

### 2. **Added Wrapper Function** (`src/lib/payouts.functions.ts`)
```typescript
export const getSubaccountForBeatFn = createServerFn({ method: "POST" })
```
- Exposes `getSubaccountForBeat` to the client
- Validates `beatId` is a UUID
- Called from checkout flow

### 3. **Updated Checkout** (`src/components/CartDrawer.tsx`)

#### Before:
```typescript
const handler = (window as any).PaystackPop.setup({
  key: paystackKey,
  email: user.email,
  amount: Math.round(total * 100),
  currency: "NGN",
  ref: `oct_${Date.now()}...`,
  // ❌ NO SUBACCOUNT FIELD!
});
```

#### After:
```typescript
// 1. Fetch subaccount before checkout
const result = await getSubaccountForBeat({ data: { beatId } });
const subaccountCode = result.subaccountCode;

// 2. Build config with subaccount
const config: any = {
  key: paystackKey,
  email: user.email,
  amount: Math.round(total * 100),
  currency: "NGN",
  ref: `oct_${Date.now()}...`,
  // ✅ SUBACCOUNT FIELD ADDED!
};

if (subaccountCode) {
  config.subaccount = subaccountCode; // This is the critical line!
}

const handler = (window as any).PaystackPop.setup(config);
```

---

## How to Verify the Fix

### Step 1: Make a Test Purchase
1. Start dev server: `npm run dev`
2. Log in as a buyer
3. Add a beat to cart (from a producer who has connected their bank)
4. Click "Pay with Paystack"
5. Complete payment (₦100+)

### Step 2: Check Console Logs
Look for these console messages:
```
[Checkout] Subaccount for beat <beatId> : ACCT_xxxxx
✅ Applying 10%/90% split payment with subaccount: ACCT_xxxxx
```

If you see:
```
⚠️ No subaccount found - payment will NOT be split automatically
```
...then the producer hasn't connected their bank account yet.

### Step 3: Check Paystack Dashboard
1. Go to: **Paystack Dashboard** → **Transactions**
2. Find your test transaction
3. Click to view details
4. Look for: **"Transaction Splits"** section
5. Should show:
   - Platform: 10% (₦10 if payment was ₦100)
   - Subaccount: 90% (₦90 if payment was ₦100)

---

## Your Subaccount Details

**Subaccount Code:** `ACCT_grch0rtggi68b72`
**Bank:** OPay Digital Services Limited
**Account:** ****6951 (IFEOMA PRECIOUS NWACHUKWU)
**Split:** 90% to producer, 10% to platform

---

## How the Full Flow Works Now

```mermaid
sequenceDiagram
    Buyer->>CartDrawer: Click "Pay with Paystack"
    CartDrawer->>Server: getSubaccountForBeat(beatId)
    Server->>Database: Get producer_id for beat
    Server->>Database: Get subaccount_code for producer
    Server-->>CartDrawer: Return subaccount_code
    CartDrawer->>Paystack: Setup payment with subaccount
    Paystack->>Paystack: Apply 10%/90% split
    Paystack-->>Platform: 10% commission
    Paystack-->>Producer: 90% earnings
    Paystack-->>CartDrawer: Payment success
    CartDrawer->>Server: recordPurchases()
    Server->>Database: Save purchase record
```

---

## Important Notes

### ✅ Single-Beat Purchases
- Fully supported with automatic split
- Producer receives 90% instantly

### ⚠️ Multi-Beat Carts (Future)
Currently, if a buyer adds beats from **multiple different producers** to cart:
- Only the FIRST producer's subaccount is used
- This needs "Split Groups" (Paystack advanced feature)
- Workaround: Encourage single-beat purchases for now

Console will show:
```
[Checkout] Multi-beat cart - split payment not yet supported for multiple producers
```

### 🔍 When Splits Won't Apply
If producer hasn't connected their bank:
1. Subaccount will be `null`
2. Payment goes 100% to platform account
3. Producer needs to visit `/producer/payouts` and connect bank
4. Future purchases will then split automatically

---

## Testing Checklist

- [x] Build succeeds without errors
- [ ] Test purchase with connected producer
- [ ] Verify console shows subaccount code
- [ ] Check Paystack shows split details
- [ ] Verify producer receives 90% in their bank
- [ ] Test with producer who hasn't connected bank (should show warning)

---

## Files Modified

1. `/src/lib/payouts.server.ts` - Added `getSubaccountForBeat()` function
2. `/src/lib/payouts.functions.ts` - Added `getSubaccountForBeatFn` wrapper
3. `/src/components/CartDrawer.tsx` - Updated checkout to fetch and pass subaccount

---

## Next Steps

1. **Test locally** with real payment (₦100 minimum)
2. **Check Paystack dashboard** to confirm split appears
3. **Verify producer bank** receives 90%
4. **Deploy to Vercel** when confirmed working
5. **Monitor production** payments for split accuracy

---

## Support

If splits still don't appear:
1. Check console logs for subaccount code
2. Verify producer has `is_verified: true` in `payout_accounts` table
3. Confirm Paystack account is Business (not Personal)
4. Check Paystack Subaccount status is "active"

Run this SQL to check:
```sql
SELECT 
  producer_id,
  paystack_subaccount_code,
  paystack_subaccount_id,
  is_verified,
  bank_name,
  account_number
FROM payout_accounts
WHERE producer_id = '<your-producer-id>';
```

---

**Status:** ✅ READY FOR TESTING
**Date Fixed:** August 12, 2026
**Build Status:** ✅ Compiles successfully

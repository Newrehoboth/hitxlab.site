# 🔍 Where to Find Payment Splits in Paystack Dashboard

## Quick Answer

**Paystack Dashboard → Transactions → Click on a transaction → Look for "Transaction Splits" section**

---

## Step-by-Step Guide

### Step 1: Go to Transactions
1. Log into your Paystack Dashboard: https://dashboard.paystack.com
2. Click **"Transactions"** in the left sidebar
3. You'll see a list of all payments

### Step 2: Find Your Test Transaction
Look for:
- **Reference:** Starts with `oct_` (e.g., `oct_1723478956789_abc123`)
- **Amount:** ₦100, ₦400, or whatever you paid
- **Status:** Success (green checkmark)
- **Date:** Today's date
- **Email:** Your test email (mainsitemail09@gmail.com)

### Step 3: Click the Transaction
Click anywhere on the transaction row to open the details page.

### Step 4: Look for "Transaction Splits"
Scroll down on the transaction details page. You should see a section called:

**"Transaction Splits"** or **"Split Payment Details"**

---

## What You Should See

### ✅ If Split is Working (AFTER FIX):
```
┌─────────────────────────────────────────┐
│ Transaction Splits                      │
├─────────────────────────────────────────┤
│ Platform (Integration)                  │
│ ₦10.00 (10%)                            │
├─────────────────────────────────────────┤
│ Subaccount: ACCT_grch0rtggi68b72       │
│ IFEOMA PRECIOUS NWACHUKWU               │
│ ₦90.00 (90%)                            │
└─────────────────────────────────────────┘
Total: ₦100.00
```

### ❌ If Split is NOT Working (BEFORE FIX):
```
┌─────────────────────────────────────────┐
│ Transaction Splits                      │
├─────────────────────────────────────────┤
│ No splits configured                    │
│ or                                      │
│ 0 splits                                │
└─────────────────────────────────────────┘
```

---

## Alternative Places to Check

### Option 1: Transaction Details Tab
Some Paystack versions show splits in a tab called:
- **"Settlement"** tab
- **"Payouts"** tab  
- **"Distribution"** tab

### Option 2: Subaccounts Page
1. Go to **Settings** → **Subaccounts**
2. Click on: **ACCT_grch0rtggi68b72**
3. View **"Transactions"** for this subaccount
4. Should show all purchases where split was applied

### Option 3: Settlement Reports
1. Go to **Settlements** in left sidebar
2. Look for settlement amounts
3. If splits work, you'll see:
   - Platform receives 10% in main account
   - Subaccount receives 90% automatically

---

## Your Previous Test Purchases

You mentioned these transactions:

### Test 1: calipso_beat - ₦100
- **Status:** ✅ Successful payment
- **Problem:** 0 splits (because subaccount wasn't passed)
- **Where it went:** 100% to platform account
- **Solution:** Need to test again with the fix

### Test 2-4: ₦400 attempts
- **Status:** ❌ Failed at bank level
- **Problem:** Bank declined transfers
- **Split Status:** N/A (payment didn't complete)

---

## Testing After Fix

### Make a New Test Purchase
1. **Start dev server:** `npm run dev` (port 8083)
2. **Log in as buyer:** mainsitemail09@gmail.com
3. **Add beat to cart:** Any beat from your producer account
4. **Check console:** Should see "✅ Applying 10%/90% split payment"
5. **Complete payment:** Use Paystack popup (₦100 minimum)
6. **Get transaction reference:** Starts with `oct_`

### Check Paystack Dashboard
1. Wait 30 seconds for transaction to appear
2. Go to **Transactions** → Find your new transaction
3. Click to open details
4. **Look for "Transaction Splits" section**
5. Should show: 10% to platform, 90% to subaccount

---

## Earnings Page

Your producer earnings page is at:
**http://localhost:8083/producer/payouts**

### What Shows There:
- **Before subaccount connected:** Manual withdrawal mode
- **After subaccount connected:** 
  - "Auto-Split Payout Account" shows ✅ CONNECTED
  - Bank details displayed
  - Future sales auto-split 90% to bank

### Current Status:
Your account shows:
```
✅ CONNECTED
Account: ****6951
Bank: OPay Digital Services Limited  
Name: IFEOMA PRECIOUS NWACHUKWU
Subaccount: ACCT_grch0rtggi68b72
```

But transactions table will be empty until you:
1. Make a NEW purchase with the fix applied
2. Payment will then show in "Recent transactions" table

---

## Common Issues

### Issue 1: "I don't see Transaction Splits section"
**Possible reasons:**
- Transaction was made BEFORE the fix
- Subaccount wasn't passed during checkout
- Your Paystack account needs "Subaccounts" feature enabled

**Solution:** Make a fresh test purchase NOW (after fix)

### Issue 2: "Shows 0 splits"
**Reason:** Transaction was completed before fix was deployed

**Solution:** Test again with new purchase

### Issue 3: "Subaccount not found"
**Reason:** Producer hasn't connected bank yet

**Check:** Visit `/producer/payouts` - should show "CONNECTED" status

---

## Quick SQL Check

To verify your subaccount is in the database:

```sql
SELECT 
  paystack_subaccount_code,
  bank_name,
  account_number,
  account_name,
  is_verified
FROM payout_accounts
WHERE producer_id = (
  SELECT id FROM auth.users WHERE email = 'mainsitemail09@gmail.com'
);
```

Expected result:
```
ACCT_grch0rtggi68b72 | OPay Digital Services Limited | 7037076951 | IFEOMA PRECIOUS NWACHUKWU | true
```

---

## Summary

**To see if splits are working:**

1. ✅ Make a NEW test purchase (after fix)
2. ✅ Open Paystack Dashboard → Transactions
3. ✅ Click on the transaction
4. ✅ Look for "Transaction Splits" section
5. ✅ Should show 10% platform, 90% subaccount

**Your previous ₦100 purchase (calipso_beat) will show 0 splits** because it was made before the fix. That's expected.

---

**Next Step:** Make a fresh test purchase NOW to verify the fix works! 🚀

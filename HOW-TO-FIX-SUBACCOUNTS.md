# How to Fix Subaccounts & Producer Dashboards

## Quick Summary

**Good news**: The 10%/90% split code is already working! ✅

**Problems**:
1. ❌ Subaccounts show "Unverified" in Paystack
2. ❌ Producer dashboards show zeros after adding bank

**Fix time**: 5 minutes

---

## Step 1: Run SQL in Lovable (2 minutes)

1. Open your Lovable project
2. Find the SQL Editor (usually in the database section)
3. Copy the ENTIRE contents of `RUN-THIS-IN-LOVABLE-SQL.sql`
4. Paste into SQL Editor
5. Click "Run" or "Execute"

**What this does**:
- Creates missing wallet records for producers
- Restores producer balances from their sales history
- Marks subaccounts as verified in your database
- Sets up proper permissions

---

## Step 2: Verify Subaccounts in Paystack (3 minutes)

⚠️ **CRITICAL**: Even though Step 1 marks them as verified in YOUR database, you MUST verify them in Paystack for splits to actually work!

1. Go to: https://dashboard.paystack.com/subaccounts
2. You'll see a list like this:

```
Name                        Bank        Split   Status      Actions
EZEH CHISOM FAITH          GTBank      90%     Unverified  [Edit] [Delete]
IFEOMA PRECIOUS NWACHUKWU  OPay        90%     Verified    [Edit] [Delete]
EKENE REHOBOTH NWACHUKWU   OPay        90%     Unverified  [Edit] [Delete]
```

3. For each "Unverified" subaccount:
   - Click **"Edit"**
   - Look for the **"Verify subaccount"** button
   - Click it
   - Paystack will verify the bank details
   - Status should change to **"Verified"**

4. Repeat for ALL unverified subaccounts

**Why this is important**:
- Paystack ONLY sends money to VERIFIED subaccounts
- If unverified, ALL money goes to your main account (no split)
- Once verified, Paystack automatically does: 10% to you, 90% to producer

---

## Step 3: Test Everything (30 seconds)

### Test Producer Dashboard:
1. Log in as one of the producers (like IFEOMA or EZEH)
2. Go to: Producer Studio > Earnings & Payouts
3. You should now see:
   - ✅ Available balance (NOT zero)
   - ✅ Lifetime earnings (NOT zero)
   - ✅ Sales count (NOT zero)
   - ✅ Transaction history with all their sales

### Test New Purchase:
1. Log in as a buyer
2. Add a beat to cart from a producer with verified subaccount
3. Complete checkout with Paystack
4. Open browser console (F12) and look for:
   ```
   [Checkout] ✅ Applying 10%/90% split payment with subaccount: ACCT_xxxxx
   ```
5. Go to Paystack dashboard > Transactions
6. Find the transaction - it should show the split:
   - Main account: 10% of total
   - Subaccount: 90% of total (pending payout to producer's bank)

---

## Understanding the Splits

### How Paystack Splits Work:

**Before (Unverified)**:
```
Customer pays: NGN 10,000
↓
Main account gets: NGN 10,000 (100%)
Producer gets: NGN 0 (must request withdrawal manually)
```

**After (Verified)**:
```
Customer pays: NGN 10,000
↓
Paystack automatically splits:
├─ Main account: NGN 1,000 (10% - platform commission)
└─ Producer subaccount: NGN 9,000 (90% - goes to their bank)
```

**Result**:
- Platform gets 10% instantly
- Producer gets 90% in their bank (according to payout schedule)
- No manual withdrawals needed
- Everything automatic

---

## Checking Paystack Payouts

Looking at your screenshot, you have pending payouts:

1. **NGN 118,100.00 - Thursday, November 5, 2026 - Big Vybz Limited - Pending**
   - This is 90% of sales going to a producer
   - It's scheduled for payout
   - Will be sent to their bank on the scheduled date

2. **NGN 321.00 - Paid**
3. **NGN 270.00 - Paid**
4. **NGN 492.50 - Paid**

The "Pending" status is normal - Paystack holds it until the scheduled payout date.

---

## What About the Missing 10%?

If you're not seeing the 10% platform commission in your main account:

1. Go to: https://dashboard.paystack.com/transactions
2. Click on one of the split transactions
3. Look for "Split Details" or "Transaction Split"
4. You should see:
   ```
   Total: NGN 10,000
   Main Account: NGN 1,000 (10%)
   Subaccount (Producer): NGN 9,000 (90%)
   ```

If it shows 100% going to producer instead:
- The subaccount was created with wrong percentage
- Need to edit the subaccount in Paystack
- Change "Percentage Charge" to 10%

---

## Common Questions

### Q: Why do I need to verify in Paystack if the database shows verified?

A: Two separate systems:
- **Your database**: Tracks that subaccount exists
- **Paystack**: Actually does the money split

The database can't force Paystack to verify. You must verify in both places.

### Q: Can I auto-verify subaccounts?

A: No, Paystack requires manual verification for security. They verify:
- Bank account exists
- Account number matches name
- BVN validation

### Q: What if a producer changes their bank?

A: They need to:
1. Update in your app (Producer Studio > Earnings)
2. You verify the NEW subaccount in Paystack
3. Old subaccount can be deleted or kept inactive

### Q: Do old purchases need to be re-split?

A: No. Paystack already processed those. The split happens at payment time. Old purchases can't be retroactively split.

---

## Troubleshooting

### Producer dashboard still shows zeros:

```sql
-- Check if wallet exists:
SELECT * FROM producer_wallets WHERE producer_id = 'PRODUCER_USER_ID_HERE';

-- If no result, manually create:
INSERT INTO producer_wallets (producer_id, available_balance, lifetime_earnings, sales_count)
SELECT producer_id, 
       SUM(producer_earnings), 
       SUM(producer_earnings), 
       COUNT(*)
FROM purchases 
WHERE producer_id = 'PRODUCER_USER_ID_HERE' 
  AND payment_status = 'paid'
GROUP BY producer_id;
```

### Subaccount not applying at checkout:

Check browser console for:
```
[Checkout] ⚠️ No subaccount found - payment will NOT be split automatically
```

This means:
- Producer hasn't added bank details yet
- OR the `get_subaccount_for_beat()` function isn't finding the subaccount
- Check: `SELECT * FROM payout_accounts WHERE producer_id = 'PRODUCER_ID';`

### "Split" column shows 100% instead of 90%:

Edit the subaccount in Paystack and change "Percentage Charge" to 10.

---

## Summary Checklist

- [ ] Run `RUN-THIS-IN-LOVABLE-SQL.sql` in Lovable SQL Editor
- [ ] Go to Paystack dashboard > Subaccounts
- [ ] Verify each "Unverified" subaccount
- [ ] Confirm "Split" column shows "90%" for all subaccounts
- [ ] Test producer dashboard - should show balances
- [ ] Make test purchase - check browser console for subaccount code
- [ ] Check Paystack transaction - confirm split is shown

**After these steps, everything should work automatically!**

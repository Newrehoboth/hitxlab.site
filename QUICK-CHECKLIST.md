# ⚡ Quick Fix Checklist - 5 Minutes

## ✅ The Problem
- [ ] NGN 120k went 100% to producers (should be 90%)
- [ ] You didn't get 10% commission
- [ ] Subaccounts show "Unverified" 
- [ ] Producer dashboards show ₦0

## ✅ The Solution

### □ STEP 1: Run SQL in Lovable (2 min)

1. Open your Lovable project: https://lovable.dev
2. Find and click **"SQL Editor"** or **"Database"**
3. Open this file: `RUN-THIS-IN-LOVABLE-SQL.sql`
4. Copy EVERYTHING (Ctrl+A, Ctrl+C)
5. Paste into Lovable SQL Editor
6. Click **"Run"** or **"Execute"**
7. Wait for "Query succeeded" message

**What this does:**
- Restores producer balances from their sales
- Creates missing wallet records
- Marks subaccounts as verified in database

---

### □ STEP 2: Verify in Paystack (3 min)

⚠️ **CRITICAL** - SQL alone is not enough. You MUST do this step!

1. Go to: **https://dashboard.paystack.com/subaccounts**

2. You'll see a table like this:
   ```
   Name                  Bank    Split   Status        Action
   EZEH CHISOM FAITH    GTBank   90%    Unverified    [Edit]
   IFEOMA PRECIOUS      OPay     90%    Unverified    [Edit]
   EKENE REHOBOTH       OPay     90%    Unverified    [Edit]
   ```

3. For EACH "Unverified" row:
   - Click **[Edit]**
   - Find **"Verify subaccount"** button
   - Click it
   - Wait for green "Verified" status
   - Close

4. Repeat for ALL unverified subaccounts

5. Refresh the page - all should show **"Verified"**

---

### □ STEP 3: Test Everything (30 sec)

**Test Producer Dashboard:**
1. Log in as a producer (EZEH, IFEOMA, or EKENE)
2. Go to: **Producer Studio** → **Earnings & Payouts**
3. Check you see numbers (not zeros):
   - Available balance: ✅ Shows amount
   - Lifetime earnings: ✅ Shows amount
   - Sales count: ✅ Shows number
   - Transaction list: ✅ Shows sales

**Test New Purchase:**
1. Open browser console (Press F12)
2. Log in as buyer
3. Buy a beat from a verified producer
4. Complete Paystack checkout
5. Check console for this message:
   ```
   [Checkout] ✅ Applying 10%/90% split payment with subaccount: ACCT_xxxxx
   ```

**Test Paystack Split:**
1. Go to: https://dashboard.paystack.com/transactions
2. Find the test transaction
3. Click it to see details
4. Look for split breakdown:
   ```
   Total: NGN 10,000
   Main: NGN 1,000 (10%)
   Producer: NGN 9,000 (90%)
   ```

---

## ✅ Done! What Happens Now?

### Every New Purchase:
```
Customer pays → Paystack automatically splits:
├─ 10% to YOUR account (platform commission)
└─ 90% to PRODUCER's bank (their earnings)
```

### Producer Dashboard:
- Shows correct balances
- Updates automatically on each sale
- No more zeros

### Your Main Account:
- Gets 10% on every sale
- Automatic - no manual work
- Can withdraw anytime

---

## 🚨 If Something Doesn't Work

### Producer dashboard still shows zeros?
→ Re-run Step 1 (SQL) and wait 30 seconds

### Subaccounts still "Unverified"?
→ Did you click "Verify" in Paystack dashboard? (Step 2)

### No split showing in Paystack transaction?
→ Check: Is the subaccount verified? Check "Status" column

### Console shows "⚠️ No subaccount found"?
→ Producer hasn't added bank details yet - ask them to connect

### "Split" column shows 100% instead of 90%?
→ Edit subaccount in Paystack, change "Percentage Charge" to 10

---

## 📊 How to Check if Working

### Quick Check (10 seconds):
1. Go to: https://dashboard.paystack.com/subaccounts
2. All should show:
   - Split: **90%** ✅
   - Status: **Verified** ✅

### Full Check (1 minute):
1. Browser console shows: **✅ Applying split** ✅
2. Producer dashboard shows balances ✅
3. Paystack transaction shows 10%/90% breakdown ✅

---

## 📝 Summary

**Before Fix:**
- Customer pays NGN 10,000
- Subaccount unverified
- Producer gets NGN 10,000 (100%)
- You get NGN 0 (0%)

**After Fix:**
- Customer pays NGN 10,000
- Subaccount verified ✅
- Producer gets NGN 9,000 (90%) → sent to their bank
- You get NGN 1,000 (10%) → in your account
- Automatic, every time

---

## ⏰ Time Breakdown

- Step 1 (SQL): 2 minutes
- Step 2 (Verify): 3 minutes (30 sec per subaccount × 6 subaccounts)
- Step 3 (Test): 30 seconds
- **Total: 5.5 minutes**

---

## ✅ Final Checklist

- [ ] Ran `RUN-THIS-IN-LOVABLE-SQL.sql`
- [ ] Saw "Query succeeded" message
- [ ] Went to Paystack subaccounts page
- [ ] Verified EVERY unverified subaccount
- [ ] All show "Verified" status
- [ ] All show "90%" split
- [ ] Tested producer dashboard - sees balances
- [ ] Made test purchase - saw "✅ Applying split" in console
- [ ] Checked Paystack transaction - saw 10%/90% breakdown

**If all checked ✅ = DONE! System is working!** 🎉

---

## 🎯 Expected Results

After completing this checklist:

1. **Your main account**: Gets 10% on every sale automatically
2. **Producer accounts**: Get 90% in their bank automatically  
3. **Producer dashboards**: Show correct balances (no zeros)
4. **No manual work**: Everything happens automatically
5. **Past sales**: Can't be re-split (already processed by Paystack)
6. **Future sales**: Will split correctly from now on

**The 10%/90% split code was ALREADY correct in your app!**  
You just needed to verify the subaccounts in Paystack. That's it!

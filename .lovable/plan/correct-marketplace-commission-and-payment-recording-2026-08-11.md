# Correct Marketplace Commission and Payment Recording

## Goal
Make every successful beat purchase record the producer’s 90% earnings and the platform’s 10% commission, with no fulfillment or wallet credit before payment verification.

## Changes
- Replace the client-only Paystack success assumption with server-side transaction verification using the returned payment reference.
- Record successful purchases only in the canonical purchase ledger; remove the legacy order fallback that currently reports the full gross amount as producer revenue.
- Credit the producer wallet with exactly `gross × 90%` only when Paystack has not already applied an automatic split.
- Update producer dashboard orders, revenue, and analytics to read canonical paid purchases and display producer earnings rather than gross sales.
- Remove hardcoded live payment credentials from source and read private credentials only from server secrets; expose the public checkout key through safe configuration.
- Correct the payment webhook route export that is causing the current server-route runtime error.

## Verification
- Add focused commission tests for ₦100 → ₦10 platform commission and ₦90 producer earnings.
- Verify the homepage and payment webhook route load without server errors.
- Verify dashboard calculations use `producer_earnings` and exclude pending/failed purchases.

## Technical details
- Preserve the existing Paystack marketplace/subaccount flow and Lovable Cloud ledger.
- Payment references are idempotent so retries cannot create duplicate purchases or wallet credits.
- Existing historical gross order rows remain available but no longer contribute to producer earnings totals.

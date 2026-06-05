# Task A4: Fix Missing Payment Processing in /api/rides Route

## Agent: full-stack-developer
## Status: COMPLETED

## Changes Made

### File Modified: `/home/z/my-project/src/app/api/rides/route.ts`

1. **Added `phoneNumber` to body destructuring** (line 56)
   - Required for mobile money payments (MTN MoMo, Airtel Money)
   - Optional field — only needed when paymentMethod is mobile money

2. **Added payment processing after ride creation** (lines 83-142)
   - **WALLET**: Uses `PaymentService.initiatePayment()` with `paymentMethod: 'WALLET'`. On failure, ride is deleted (rollback — can't ride without paying). PaymentService internally checks balance, deducts from wallet, and transitions PENDING→PROCESSING→COMPLETED.
   - **MTN_MOMO / MOBILE_MONEY_MTN**: Uses `PaymentService.initiatePayment()` with `paymentMethod: 'MTN_MOMO'` and `phoneNumber`. Ride stays even if payment initiation fails — user needs to approve on phone and can retry.
   - **AIRTEL_MONEY / MOBILE_MONEY_AIRTEL**: Uses `PaymentService.initiatePayment()` with `paymentMethod: 'AIRTEL_MONEY'` and `phoneNumber`. Same retry semantics as MTN.
   - **CASH**: Uses `PaymentService.initiatePayment()` with `paymentMethod: 'CASH'`. Creates payment record marked as pending collection.

3. **Updated response to include payment info** (lines 144-157)
   - Response now includes `payment` object with: paymentId, reference, status, message
   - `payment` is null when no payment processing occurred

## Architecture Decisions

- All payment processing delegated to existing `PaymentService.initiatePayment()` — zero duplicated payment logic
- PaymentService handles: Payment record creation, state machine transitions, audit logging, provider API calls
- WALLET failure = ride rollback (delete the ride)
- MOBILE_MONEY failure = ride stays (user can retry payment)
- CASH = payment record created as pending collection
- Payment linked to ride via `taskId` parameter

## Lint Check: PASS (zero errors)

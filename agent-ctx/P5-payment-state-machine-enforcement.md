# Task P5: Payment State Machine Enforcement

## Agent: Payment State Machine Enforcement Agent

## Summary
Enforced `payment-state-machine.ts` as the ONLY mechanism for payment status transitions across the entire codebase. Replaced all raw `db.payment.update()` and `db.payment.updateMany()` calls that change payment status with `transitionPaymentStatus()`.

## Files Modified (10 total)

1. **`src/lib/payments/payment-state-machine.ts`** — Added PENDING→COMPLETED valid transition for wallet instant payments
2. **`src/lib/payments/payment-service.ts`** — 7 raw updates replaced with state machine calls; removed `updatePaymentStatus` helper
3. **`src/lib/payments/index.ts`** — 10 raw updates replaced with state machine calls; cash payment no-op removed
4. **`src/app/api/payments/flutterwave/route.ts`** — 3 raw updates replaced (POST failed, GET verify)
5. **`src/app/api/payments/mtn/callback/route.ts`** — 1 raw updateMany replaced with state machine
6. **`src/app/api/payments/airtel/callback/route.ts`** — 1 raw updateMany replaced with state machine
7. **`src/app/api/webhooks/flutterwave/route.ts`** — 1 raw update replaced with state machine
8. **`src/app/api/payments/[id]/route.ts`** — PUT handler now uses state machine for status transitions
9. **`src/app/api/payments/mtn-callback/route.ts`** — 1 raw updateMany replaced (primary MTN callback)
10. **`src/app/api/payments/airtel-callback/route.ts`** — 1 raw updateMany replaced (primary Airtel callback)
11. **`src/app/api/orders/[id]/route.ts`** — 2 raw updateMany replaced for order rejection/cancellation refunds

## Key Design Decisions

- **Status changes go through state machine ONLY**: All `db.payment.update()` calls that change status are replaced with `transitionPaymentStatus()`
- **Non-status fields updated separately**: Fields like `transactionId`, `providerResponse`, `momoTransactionId` are updated via separate `db.payment.update()` since they don't affect the state machine
- **PENDING→COMPLETED transition added**: Needed for wallet instant payments, mock/dev payments, and edge cases where callbacks arrive before PROCESSING status is set
- **Callback handlers check final state first**: Before calling `transitionPaymentStatus()`, callbacks check if payment is already in a final state (COMPLETED, FAILED, REFUNDED) and skip if so
- **Admin PUT endpoint validates transitions**: Admin can still change status but ONLY through legal transition paths — `transitionPaymentStatus()` rejects illegal transitions
- **Cash payment no-op removed**: Setting status to PENDING on an already-PENDING payment was a no-op

## Validation
- `bun run lint` — PASSED
- No remaining `db.payment.updateMany()` calls for payments
- All remaining `db.payment.update()` calls are for non-status fields only

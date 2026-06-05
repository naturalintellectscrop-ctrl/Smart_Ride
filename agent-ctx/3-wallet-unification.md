# Task 3: Wallet Architecture Unification

## Summary
Migrated all code that reads/writes `Rider.walletBalance` (deprecated System A) to use the canonical `Wallet` model (System B) via `wallet-service.ts` methods.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)
- Line 148: Marked `walletBalance Float @default(0)` with `// DEPRECATED: Use Wallet model via wallet-service.ts`
- Field NOT removed (reserved for Phase 11 after all migrations verified)

### 2. Finance Ledger Service (`src/lib/services/finance-ledger.service.ts`) — 6 references
- **Line 17**: Added import: `getOrCreateWallet, getWalletBalance, creditRewardToWallet, withdrawFromWallet`
- **recordTaskCompletion()**: Removed `walletBalance: { increment: riderEarnings }` from `tx.rider.update()` — now only updates `totalEarnings`. After transaction, calls `creditRewardToWallet()`.
- **recordTaskCompletion() audit log**: Reads wallet balance from `getWalletBalance(riderId, 'RIDER')` instead of `task.rider?.walletBalance`
- **recordPaymentRefund()**: Removed `walletBalance: { decrement: riderEarnings }` from `tx.rider.update()` — now only decrements `totalEarnings`. After transaction, calls `withdrawFromWallet()`.
- **recordPaymentRefund() audit log**: Reads wallet balance from `getWalletBalance(riderId, 'RIDER')` instead of `task?.rider?.walletBalance`
- All wallet operations have error handling (non-fatal, reconciliation can retry)

### 3. Payment Service (`src/lib/payments/payment-service.ts`) — 3 references
- **Line 11**: Added import: `getWalletBalance, payFromWallet` from wallet-service
- **processWalletPayment()**: Complete rewrite:
  - Replaced `db.user.findUnique({ include: { rider: true } })` + `user?.rider?.walletBalance` with `getWalletBalance(userId, 'USER')`
  - Replaced `db.rider.update({ data: { walletBalance: { decrement: amount } } })` with `payFromWallet({ ownerId, ownerType, amount, ... })`
  - Added proper error handling for wallet operations, including payment state machine transitions on failure

### 4. Refund Service (`src/lib/payments/refund-service.ts`) — 1 reference
- **Line 15**: Extended import: added `withdrawFromWallet`
- **processRefund() step 9**: Rider earnings deduction on full refund:
  - Replaced `db.rider.update({ data: { walletBalance: { decrement }, totalEarnings: { decrement } } })` with:
    1. `withdrawFromWallet()` for Wallet model (canonical)
    2. `db.rider.update({ data: { totalEarnings: { decrement } } })` for Rider.totalEarnings only
  - Added error handling for wallet withdrawal failure

### 5. Payments Index (`src/lib/payments/index.ts`) — 2 references
- **Line 11**: Added import: `withdrawFromWallet` from wallet-service
- **processRiderPayout() MTN MoMo**: Replaced `db.rider.update({ data: { walletBalance: { decrement } } })` with `withdrawFromWallet()`
- **processRiderPayout() Airtel Money**: Same migration — replaced `db.rider.update({ walletBalance: decrement })` with `withdrawFromWallet()`

### 6. Incentive Fulfillment (`src/lib/marketplace/incentive-fulfillment.ts`) — 1 reference
- **completeIncentiveAndReward()**: Removed `walletBalance: { increment: rewardAmount }` from `tx.rider.update()`. Only `totalEarnings` updated on Rider model. The existing `creditRewardToWallet()` call handles the canonical Wallet credit.

### 7. Dashboard Service (`src/lib/analytics/dashboard-service.ts`) — 1 reference
- **Line 10**: Added import: `getWalletBalance` from wallet-service
- **getOperationalDashboard()**: Replaced `db.rider.count({ where: { walletBalance: { gt: 500000 } } })` with `db.wallet.count({ where: { ownerType: 'RIDER', balance: { gt: 500000 } } })`

### 8. Driver Reputation API (`src/app/api/driver-reputation/[riderId]/route.ts`) — 1 reference (bonus)
- **Line 3**: Added import: `getWalletBalance` from wallet-service
- Removed `walletBalance: true` from Prisma select, now fetches from `getWalletBalance(riderId, 'RIDER')` and includes it in the response

## Remaining References (non-migratable)
- `src/types/index.ts:37` — TypeScript interface `walletBalance: number`. Kept as-is since the Prisma field still exists (deprecated).
- `src/app/api/admin/data-integrity/route.ts` — `checkWalletBalanceInconsistency` function checks `Rider.totalEarnings` vs task sums, NOT `walletBalance`. Name is misleading but function is correct.
- `src/components/smart-ride/dashboards/client/tabs/client-wallet.tsx` — Uses a local hardcoded mock value, not reading from the Rider model.

## Verification
- `bun run db:push` — database in sync, Prisma Client regenerated
- `bun run lint` — zero errors
- All existing business logic preserved — only data access layer changed
- No more `walletBalance: { increment/decrement }` writes to Rider model
- No more `rider.walletBalance` reads from Rider model

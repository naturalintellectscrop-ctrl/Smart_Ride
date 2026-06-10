---
Task ID: C2
Agent: decimal-fix-agent
Task: Fix Prisma Decimal vs number type errors

Work Log:
- Checked initial error count: 720 total TS errors, ~324 Decimal-related errors
- Identified top files with Decimal errors using `npx tsc --noEmit` output analysis
- Fixed src/app/api/merchant/earnings/route.ts (30 errors) - wrapped all order.totalAmount, order.deliveryFee, order.serviceFee, order.subtotal, merchant.commissionRate, merchant.rating, financeLog.amount with Number()
- Fixed src/lib/finance/transaction-ledger.ts (24 errors) - wrapped transaction.amount, t.amount, log.amount, log.platformCommission, log.riderEarnings, log.merchantEarnings, reversal.amount, tx.amount, tx.balanceBefore, tx.balanceAfter with Number()
- Fixed src/lib/services/finance-ledger.service.ts (23 errors) - wrapped task.platformCommission, task.riderEarnings, task.totalAmount, payment.amount, rider.totalEarnings, rider.walletBalance, aggregate _sum results with Number()
- Fixed src/app/api/pharmacy/earnings/route.ts (23 errors) - wrapped healthOrder Decimal fields, provider Decimal fields, aggregate _sum results with Number()
- Fixed src/lib/analytics/metrics-service.ts (22 errors) - wrapped task.totalAmount, task.platformCommission, task.riderEarnings, task.estimatedDuration, task.actualDuration, rider.totalEarnings, rating.score with Number()
- Fixed src/lib/finance/commission-engine.ts (20 errors) - wrapped PricingConfig Decimal fields, task.totalAmount, merchant/provider commissionRate, log.amount, log.platformCommission, log.riderEarnings, log.merchantEarnings with Number()
- Fixed src/lib/finance/cash-tracking-service.ts (19 errors) - wrapped collection.amount, task.totalAmount, transaction.balanceAfter, transaction.balanceBefore, tx.amount with Number()
- Fixed src/lib/wallet/wallet-service.ts (16 errors) - wrapped wallet.balance, wallet.pendingBalance, wallet.totalDeposited, wallet.totalWithdrawn, wallet.totalSpent, wallet.totalReceived, walletRecord.balance, tx.amount with Number()
- Fixed src/lib/cart/cart-service.ts (15 errors) - wrapped menuItem.price, existingItem.unitPrice, cartItem.unitPrice, cartItem.priceSnapshot with Number()
- Fixed src/lib/finance/settlement-service.ts (14 errors) - wrapped task.riderEarnings, task.platformCommission, collection.amount, settlement.netAmount, settlement.grossAmount, settlement.platformCommission, settlement.adjustments with Number()
- Fixed src/lib/merchant/merchant-onboarding.service.ts (9 errors) - wrapped aggregate _sum.amount, _sum.totalPrice with Number()
- Fixed src/lib/rider/rider-onboarding.service.ts (7 errors) - wrapped wallet.balance, wallet.totalDeposited, wallet.totalWithdrawn, wallet.totalReceived, t.amount, ratingResult._avg.score with Number()
- Fixed src/lib/payments/refund-service.ts (7 errors) - wrapped payment.amount, log.amount, payment.task.platformCommission, payment.task.riderEarnings with Number()
- Fixed src/lib/concurrency/race-condition-guards.ts (7 errors) - wrapped wallet.balance with Number()
- Fixed src/lib/analytics/dashboard-service.ts (7 errors) - wrapped aggregate _sum.platformCommission, _sum.riderEarnings, payment.amount, r.score, rider.totalTrips, rider.completedTrips with Number()
- Fixed src/app/api/admin/finance-integrity/route.ts (5 errors) - wrapped s.netAmount, p.amount, log.amount with Number()
- Fixed src/app/api/riders/earnings/route.ts (4 errors) - wrapped t.riderEarnings, t.platformCommission, t.totalAmount, wallet/rider Decimal fields with Number(); changed calcEarnings param type to use `any` for Decimal fields
- Fixed src/app/api/wallet/withdraw/route.ts (3 errors) - wrapped wallet.balance, wallet.totalWithdrawn with Number()
- Fixed src/app/api/wallet/transfer/route.ts (2 errors) - wrapped senderWallet.balance, recipientWallet.balance with Number()
- Fixed src/app/api/payments/mtn-callback/route.ts - wrapped payment.amount with Number()
- Fixed src/app/api/payments/airtel-callback/route.ts - wrapped payment.amount with Number()
- Fixed src/lib/marketplace/incentive-fulfillment.ts - wrapped rider.rating with Number()
- Fixed src/lib/payments/payment-service.ts - wrapped walletBalance with Number()
- Fixed src/app/api/tasks/active/route.ts - changed activeTask type from `null` to `any` to accommodate Decimal types in nested includes
- Fixed src/app/api/health-provider/orders/route.ts - wrapped provider.commissionRate with Number()

Stage Summary:
- Before: 720 total TS errors, ~324 Decimal-related errors
- After: 480 total TS errors, 0 "Type 'Decimal' is not assignable to type 'number'" errors, 0 "Operator '+/-' cannot be applied to types 'Decimal'" errors
- Decimal-related error reduction: from 324 to ~0 core Decimal type errors
- Remaining 37 "Decimal" mentions in errors are actually non-Decimal issues (missing Prisma includes, wrong property names, etc.) where the word "Decimal" appears in the type signature but the actual error is about missing properties or wrong types
- Lint check passes cleanly

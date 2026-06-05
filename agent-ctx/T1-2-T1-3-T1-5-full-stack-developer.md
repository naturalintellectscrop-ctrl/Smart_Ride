# T1-2/T1-3/T1-5 — full-stack-developer

## Task: Fix Admin→Mobile Sync, Wallet Architecture, and Checkout System

## Summary
Completed all 9 sub-tasks across 3 production blockers. All changes verified with lint check (zero errors).

## Files Created
- `/src/app/api/riders/suspend/route.ts` — Rider suspension API (admin-only)
- `/src/app/api/riders/reactivate/route.ts` — Rider reactivation API (admin-only)
- `/src/app/api/admin/wallet/adjust/route.ts` — Admin wallet credit/debit API

## Files Modified
- `/src/app/api/admin/merchants/verify/route.ts` — Migrated to createNotification()
- `/src/app/api/admin/health-providers/verify/route.ts` — Migrated to createNotification()
- `/src/app/api/health-provider/verify/route.ts` — Migrated to createNotification()
- `/src/app/api/wallet/transfer/route.ts` — Migrated to createNotification()
- `/src/app/api/webhooks/flutterwave/route.ts` — Migrated to createNotification()
- `/src/app/api/sos/route.ts` — Migrated to createNotification()
- `/src/app/api/notifications/route.ts` — Migrated to createNotification()
- `/src/lib/merchant/merchant-onboarding.service.ts` — Migrated to createNotification()
- `/src/lib/rider/rider-onboarding.service.ts` — Migrated to createNotification()
- `/src/lib/realtime/socket-reliability.service.ts` — Migrated to createNotification()
- `/src/lib/retry/retry-system.service.ts` — Migrated to createNotification()
- `/src/lib/concurrency/race-condition-guards.ts` — Migrated to createNotification()
- `/src/app/api/wallet/route.ts` — Refactored to use wallet-service (getOrCreateWallet, depositToWallet, getWalletTransactions)
- `/src/app/api/orders/route.ts` — Added WALLET payment method + wallet payment flow
- `/src/app/api/health-orders/route.ts` — Added WALLET payment method + mobile money payment initiation
- `/src/app/api/wallet/payment/route.ts` — Added PROVIDER to ownerType enum
- `/src/app/api/cart/route.ts` — Fixed IDOR by using requireAuth() + added PUT/DELETE handlers
- `/expo-app/app/notifications/index.tsx` — Replaced mock data with API calls, added loading/error states
- `/expo-app/src/services/api.ts` — Added notification preferences + cart API methods
- `/expo-app/src/store/cartStore.ts` — Added backend API sync with offline cache

## Key Decisions
- Used `createNotification()` consistently for socket emission guarantee
- Used `requireAuth()` from `@/lib/auth/guards` (not auth-utils) for cart API — consistent with orders/wallet patterns
- Wallet payment in orders: pays BEFORE order creation (prevents orders without payment)
- Cart store uses optimistic updates locally + syncs to backend, AsyncStorage as offline cache
- Admin wallet adjustment resolves userId from RIDER/MERCHANT/PROVIDER for notification delivery

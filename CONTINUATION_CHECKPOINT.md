# SMART RIDE — CONTINUATION CHECKPOINT

## Files modified

**Schema**
- `prisma/schema.prisma` — added `UserPaymentMethod`, `EmergencyContact` (+`EmergencyContactOwner`), `HealthProvider.user` relation (+`User.healthProvider`, `User.paymentMethods`); added enum members to `WalletTransactionType` (TRANSFER_IN/TRANSFER_OUT/FEE), `NotificationType` (8 marketplace/driver types), `ActorType` (PHARMACIST, HEALTH_PROVIDER)

**Web API / lib**
- `src/app/api/wallet/route.ts`, `wallet/transfer/route.ts`, `wallet/payment-methods/route.ts`
- `src/app/api/riders/withdraw/route.ts`, `riders/status/route.ts`, `riders/onboarding/route.ts`
- `src/app/api/auth/change-password/route.ts`, `auth/me/route.ts`
- `src/app/api/merchants/register/route.ts`, `merchants/menu/route.ts`, `merchant/earnings/route.ts`
- `src/app/api/pharmacy/earnings/route.ts`, `admin/health-providers/verify/route.ts`
- `src/app/api/dispatch/route.ts`, `dispatch/assign/route.ts`, `rider/heartbeat/route.ts`
- `src/app/api/payments/nylonpay/callback/route.ts`, `chat/[conversationId]/send/route.ts`
- `src/app/api/audit/route.ts`, `health-orders/route.ts`
- `src/lib/api/audit.ts`, `src/lib/auth/index.ts`, `src/lib/cart/cart-service.ts`
- `src/lib/finance/cash-tracking-service.ts`, `src/lib/services/finance-ledger.service.ts`
- `src/lib/services/task-state-machine.service.ts`, `src/lib/analytics/metrics-service.ts`
- `src/lib/marketplace/{client-promotion-service,incentive-fulfillment}.ts`
- `src/components/auth/AnimatedAuthBackground.tsx`

**Mobile**
- `expo-app/src/constants/index.ts`, `src/components/{SmartBottomSheet,Avatar}.tsx`, `app/auth/reset-password.tsx`

## Work completed

The starting claim "build passing / TypeScript clean" was false: `next.config.ts`
sets `typescript.ignoreBuildErrors: true`, so 665 real type errors — many of them
guaranteed runtime 500s — were shipping behind a green build.

Fixed, verified by `tsc` and a passing `next build` after each batch:

- **Wallet/payments** — P2P transfers wrote three enum values that did not exist (every transfer threw); balance math used `Decimal − number` (wrong values) and the insufficient-funds guard compared a Decimal with `<`; `UserPaymentMethod` model was missing entirely.
- **SOS** — `EmergencyContact` model was missing while the mobile app calls get/add/delete on it.
- **Auth** — password change read/wrote `password` instead of `passwordHash`, so it was impossible; `@/lib/auth` barrel exported two incompatible `requireAuth` implementations.
- **Merchant** — signup passed wrong shapes to both token generators; menu handlers resolved the merchant by a JWT field that does not exist, falling back to an email match that could hit the wrong merchant.
- **Payments (NylonPay)** — webhook read `body.data.*` but the SDK sends `body.payload.*`; read the signature from the body when the SDK states it is header-only; matched an event name that never fires, so re-verification never ran.
- **Money correctness** — all 23 `Decimal` arithmetic bugs (cart line totals, merchant/pharmacy earnings, cash deposit allocation, finance ledger, metrics) produced NaN or wrong figures.
- **Ride state machine** — `TASK_STATE_TRANSITIONS` covered 11 of 17 `TaskStatus` values; unmapped states strand tasks.
- **Mobile** — expo-app was never typechecked (excluded from root tsconfig). Now clean: dead duplicate style blocks meant `reset-password` rendered pre-migration styles, `TYPOGRAPHY.displaySm` did not exist, and `SmartBottomSheet` animations had undefined durations.

Errors: **665 → 478** (web), **14 → 0** (mobile). Build passes. 5 commits.

## Remaining work

1. **~30 missing Prisma models** block 168 errors across 22 files — fraud (`FraudRiskScore`, `SuspiciousActivityLog`, `DeviceFingerprint`, …), reputation (`DriverReputation`, …), marketplace (`GeographicZone`, `DriverIncentive`, `RiderPromotion`, …). These are **unbuilt features**, not regressions: decide per module whether to build the schema or delete the dead routes.
2. Remaining ~310 errors in analytics/admin/setup — mostly inference and shape mismatches; triage `TS2353`/`TS2339` first, they are the runtime-fatal ones.
3. No live verification was possible — see blocker below.

## Schema push — DONE and verified

The database became reachable and `prisma db push` was applied to the live
Supabase instance. The diff was verified additive-only beforehand (no DROP /
TRUNCATE / column retype) and an FK precheck found 0 orphaned or duplicate
`HealthProvider.userId` rows.

Verified against the live DB after the push:
- `UserPaymentMethod` and `EmergencyContact` tables exist (72 → 74 tables)
- `WalletTransactionType` has TRANSFER_IN / TRANSFER_OUT / FEE
- `NotificationType` has all 8 new marketplace/driver values
- `ActorType` has PHARMACIST / HEALTH_PROVIDER
- Data intact: User=12, Task=28, Notification=777, Wallet=6
- Round-trip smoke test passed (then cleaned up): create/list a payment method,
  create an emergency contact, insert all three wallet transfer legs, insert a
  SURGE_ALERT notification, and `healthProvider.findMany({ include: { user } })`

### Correction to the Decimal findings

Measured against the real Prisma `Decimal`, the earlier commit messages
overstated part of this. Actual behaviour:
- `Decimal + number` **concatenates strings** — `50000.75 + 1000` produced
  `"50000.751000"`. This is the transfer recipient's `balanceAfter`, so credited
  balances were silently written ~1000 UGX short. Genuinely corrupting.
- `Decimal - number` and `Decimal * number` coerce correctly via `valueOf` and
  produced right answers; they were type errors, not wrong values.
- Raw arithmetic also loses integer precision above 2^53 where the Decimal API
  keeps it.

The fixes remain correct (the Decimal API is precision-safe), but only the `+`
sites were producing bad data.

## Exact next implementation step

Decide the fate of the ~30 missing Prisma models (item 1 under Remaining work):
build the schema for fraud / reputation / marketplace, or delete the dead routes.
That single decision clears 168 of the remaining 478 errors.

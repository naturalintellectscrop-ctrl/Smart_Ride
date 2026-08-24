# Smart Ride — production readiness

**Date:** 2026-08-24, autonomous closure pass.
**Deployment SHA:** `d7740d1` · **`origin/main`:** `d7740d1` · **local `HEAD`:** `d7740d1`
**Database:** `Payment.providerOrderId` pushed and verified in production.

---

## A. Readiness

### Backend and money: **READY**

Every P0 and P1 found in this pass is closed and verified against the deployed
API and the production database — not against a local build, a passing type
check, or a previous report.

```
verify-financial-integrity     43/43
verify-dispatch-integrity      26/26
verify-authorization           38/38
verify-pharmacy-delivery-chain 43/43
verify-decline-reroute          7/7
verify-order-pricing           37/37
```

### Mobile release: **NOT READY — one blocker, and it is not a code defect**

The test device is locked with a PIN. The app is installed and the bundle is
confirmed to contain every client change from this pass, but the lock screen
cannot be passed without the credential, and guessing it is not something to
do. **Device verification of the new client is the one thing outstanding.**

This matters for sequencing, not for correctness:

> The deployed backend refuses the old client's invented `PAY-${Date.now()}`
> payment reference with **402**. An APK built before this pass therefore
> **cannot complete a merchant order**. The new APK — already built, installed,
> and at
> `expo-app/android/app/build/outputs/apk/release/app-release.apk` — must go
> out with it.

Ride booking, parcel delivery and browsing are unaffected by that.

---

## B. What changed

**Money**
`src/lib/api/pricing.ts` · `src/lib/api/order-pricing.ts` ·
`src/lib/services/finance-ledger.service.ts` · `src/lib/payments/payment-service.ts` ·
`src/lib/wallet/wallet-service.ts` · `src/app/api/payments/initiate/route.ts` ·
`scripts/seed-pricing-config.ts`

**Orders and dispatch**
`src/app/api/orders/route.ts` · `src/app/api/orders/[id]/route.ts` ·
`src/app/api/rides/route.ts` · `src/app/api/tasks/[id]/decline/route.ts` ·
`src/lib/api/after-response.ts` *(new)* ·
`src/lib/services/enhanced-task-state-machine.service.ts`

**Pharmacy**
`src/app/api/health-provider/orders/route.ts` · `src/lib/health/provider-order-delivery.ts`

**Schema**
`prisma/schema.prisma` — `Payment.providerOrderId` (nullable + index + FK)

**Mobile**
`expo-app/app/orders/cart.tsx` · `expo-app/src/constants/index.ts` ·
`expo-app/src/services/api.ts` · `expo-app/src/components/storefront/storefrontKit.tsx` ·
`expo-app/src/components/storefront/pharmacyOrder.ts` · `expo-app/app/merchant/orders.tsx`

---

## C. P0 and P1 findings

### BE-047 (P0) — no order was ever offered to a courier, on any service

**Defect.** Marking a merchant order READY created the delivery task, priced it,
moved it to `MATCHING` — and produced nothing. No `DispatchMatch`, no
`SEARCHING` transition, no audit entry, with an eligible courier online at that
moment, for the full 25 seconds it was watched.

**Root cause.** The dispatch call was a bare floating promise started just
before the response, on a comment reading "don't block the response". The
runtime freezes the invocation when it answers, so the `.then()` never fires;
and the route's own `finally { resetRLSContext() }` strips the context from the
one pooled connection the search uses. Three call sites: ride booking, merchant
orders, pharmacy.

**Fix.** `runAfterResponse` — `next/server`'s `after()` plus its own service-role
context. The state machine already had a private copy of exactly this with the
reasoning written out; the dispatch paths never used it. That copy now
delegates to the shared one.

**Verified.** Live match created, accepted, held. Rides offered to a boda
rider, food to a courier.

---

### BE-043 / MERCH-7 (P0) — the task was created too early

**Defect.** `POST /orders` created the delivery task inside order creation and
put it in `MATCHING`. `handleReady` — which prices the courier leg *and* calls
dispatch — is wrapped in `if (!existingTask)`, so that block never ran. The
early task also carried the whole order total as its fare with no commission
split, so the merchant's residual payout absorbed the customer's delivery and
service fees.

**Fix.** The task is created when the merchant marks the order ready. The
merchant's payout is no longer a residual: it is `order.subtotal × (1 −
merchant.commissionRate)`, the same rule the pharmacy side already used.

**Verified.** No task before READY; task, price and offer after it.

---

### BE-044 (P0) — the customer declared their own order paid

**Defect.** `confirm-payment` is reachable by the CLIENT role and wrote
`paymentStatus: COMPLETED` unconditionally. Its only evidence was a free-text
reference nothing looked up — which the mobile app filled in with
`PAY-${Date.now()}`. Reproduced on production with `QA-NO-SUCH-PAYMENT` and no
`Payment` row anywhere.

**Fix.** Confirmation is a read, not an assertion: a `COMPLETED` `Payment` row
belonging to this customer for this order, for at least the amount due.
Anything else is 402 and audited. The same gate is on pharmacy `ACCEPT`, where
a pharmacy commits stock.

**Verified.** 402 on the exact attack; order untouched; merchant blocked from
starting.

---

### BE-039 / BE-040 (P0) — completion paid the courier with nothing collected

**Defect.** A non-cash completion credited the courier's wallet in full on the
strength of the task finishing. Nothing collected, nothing retried, and
`COMPLETED → PAID` has no caller.

**Fix.** The invariant is explicit: **no spendable balance is created from a
non-cash job until a `COMPLETED` `Payment` exists.** Unpaid completions still
record what the courier is owed — held in `Wallet.pendingBalance` against a
PENDING ledger row, with the shortfall written to the finance log — and release
when the payment lands.

**Verified.** Held 3,570 with spendable 0; released to 3,570 on payment; replay
of both the payment and the completion moved nothing.

---

### BE-048 / LC-1 (P1) — a courier could not give back a job

**Defect.** Three separate refusals. `ASSIGNED → SEARCHING` was in none of the
five transition tables. The actor gate then refused `RIDER` for it — the fourth
instance of that same omission in one list. And the decline left the refused
offer PENDING, which excluded nobody from the retry and blocked the cron's
stuck-task sweep.

**Fix.** The edge added to all five tables, the actor pairs added, and
`DispatchService.rejectMatch` — which already did the right thing and had no
caller here — wired in after the response.

**Verified.** Given back → match REJECTED → re-offered to a *different* courier
→ first courier released. No `ASSIGNED → CANCELLED` recorded.

---

### BE-045 (P0) — the wallet path could never succeed, and lied about itself

`processWalletPayment` read the *rider's* denormalised balance to decide whether
a *customer* could pay, so it always refused; and `mapPaymentMethod` stored
WALLET as CASH, sending wallet payments down the cash settlement branch. With
every gateway unconfigured, this was the reason "non-cash is unverified".

**Fix.** Debits the real `Wallet` through `payFromWallet`; records the method as
`WALLET`; runs `handleSuccessfulPayment` so collection has one downstream path.

---

### BE-046 (P0) — a confirmed payment suppressed the completion ledger

`handleSuccessfulPayment` wrote a `FinanceLog` under the same
`(referenceId, transactionType)` key `recordTaskCompletion` uses for
idempotency. A payment confirming first made the completion look
already-recorded, and the courier's earnings were skipped entirely. It also
never touched orders, so a real gateway callback left `Order.paymentStatus`
PENDING forever.

---

### BE-049 (P1, security) — any courier could act on a task assigned to nobody

`if (task.riderId && task.riderId !== rider.id)` refuses somebody else's task
and silently permits one belonging to nobody. Found by the authorization suite
driving it as an attack: HTTP 200, and the task moved. Now `task.riderId !==
rider.id` refuses.

---

### PRICING-1 (P0) — the platform lost money on most food deliveries

Covered in full in `SMART_RIDE_FINANCIAL_MODEL.md`. In short: the customer's
delivery charge was assembled from a subset of the engine's components,
dropping `minimumFare` and the payable rounding, while the courier's fare kept
both.

---

### Also fixed

- **Grocery orders were created, priced and driven as food deliveries** (P2).
  The cart posts `FOOD_DELIVERY` as a literal for everything. Order type is now
  derived from the merchant's own type — fixing every client at once, with no
  APK dependency.
- **UI-2** `Performance` rendered as `Performanc / e`; **UI-3** clipped search
  placeholder and `Cash on d…`.

---

## D. The financial model

| | Food / Shopping | Pharmacy | Ride | Parcel |
|---|---|---|---|---|
| **Customer pays** | goods + delivery + service | goods + 5,000 + 2% | fare | fare |
| **Delivery charge** | `calculatePricingAsync().totalAmount` | `PricingConfig` floor 5,000 | — | — |
| **Courier receives** | charge × (1 − 15%) | charge × (1 − 15%) | fare × (1 − 15/20%) | fare × (1 − 10%) |
| **Shop receives** | subtotal × (1 − 15%) | subtotal × (1 − 10%) | — | — |
| **Smart Ride receives** | both commissions | both commissions | commission | commission |
| **Cash allowed** | **no** | **no** | yes | yes |
| **Settlement** | collected up front; courier paid after delivery | same | courier holds fare, owes commission | same |

Worked example, 3.59 km food order:

```
customer          23,000 = goods 18,000 + delivery 4,888 + service 112
merchant          15,300 = 18,000 × (1 − 15%)
courier            4,250 = 5,000 × (1 − 15%)        released after delivery
Smart Ride         3,450 = 2,700 goods + 750 delivery commission

reconciles          15,300 + 4,250 + 3,450 = 23,000
the leg             delivery 4,888 + service 112 = 5,000 = the courier's fare
                    of which commission 750 + courier 4,250 = 5,000
```

(The delivery/service split moves a little with the night and peak surcharges;
the two lines always add to the leg.)

Commission + courier earnings always equal the delivery money charged, by
construction. `SMART_RIDE_FINANCIAL_MODEL.md` carries the before/after tables
and the payment lifecycle.

---

## E. Production verification

| | |
|---|---|
| local `HEAD` | `d7740d1` |
| `origin/main` | `d7740d1` |
| production SHA | `d7740d1` |
| alias | `smartrideug.vercel.app` |
| schema | `Payment.providerOrderId` — column, index and FK confirmed by `information_schema` |

Every deploy this pass was confirmed by those three values agreeing.

**Production data, final:**

```
QA users 0 · orders 0 · provider orders 0 · non-terminal tasks 0
pending offers 0 · riders online 0 · riders holding tasks 0
pending payments 0 · wallets with balance 0 · held balances 0
provider payouts 0 · uncleared cash 0 · open exceptions 0
```

The four `@smartride.test` accounts are the deliberate standing fixtures. Six
merchants dated June/July predate this session and were left alone.

---

## F. Journey matrix

| Journey | Backend | Production HTTP | Device |
|---|---|---|---|
| Client ride | PASS | PASS — booked, offered to a boda rider | not run (device locked) |
| Merchant food | PASS | PASS — placed, paid, accepted, prepared, ready, offered, accepted | not run (device locked) |
| Shopping | PASS | PASS — order type now derived from the merchant | not run |
| Pharmacy | PASS 43/43 | PASS — dispatch, settlement, held/released payout | verified on hardware in the previous pass |
| Delivery personnel | PASS | PASS — accept, give back, re-offer, release | not run (device locked) |
| Parcel | PASS | not exercised this pass | not run |

---

## G. What remains

### Release blockers
1. **Device verification of the new client.** Unlock the phone and run the
   merchant checkout once. `bun scripts/qa-device-fixtures.ts setup` prints
   three logins and funds a wallet.

### Non-blocking
- Gateways (MTN, Airtel, card, NylonPay) are unconfigured here, so those methods
  stay BLOCKED for verification. `WALLET` is fully verified end to end.
- `PaymentStatus` has no CANCELLED/EXPIRED — a timed-out prompt and a declined
  one both land on `FAILED`. Correct for the money, a reporting gap.
- `commission-engine.ts` is a third rate table, reachable only from
  `/api/finance/commission`, disagreeing with `PRICING_CONFIG`. Not on any live
  pricing path.
- Two stale transition tables remain unimported.

### Business decisions
- **OPS-1: food and shopping have a fleet of one.** `RiderCapability` is empty,
  so food, shopping and pharmacy all fall back to `DELIVERY_PERSONNEL` alone —
  and production holds one approved courier of that role against three boda
  riders. `ITEM_DELIVERY` already allows both. Insert `RiderCapability` rows to
  decide it; no deploy needed. **This is the most likely thing to bite on launch
  day.**
- **Pharmacy commission share.** The customer's 5,000 is settled. Whether 15% is
  the right platform share of it is a field on the same `PricingConfig` row.

---

## H. Next step

The backend MVP is **ready for release**. Remaining mechanics:

1. Unlock the device and run one merchant checkout on the installed APK.
2. Decide OPS-1 before launch, or food orders will find no courier.
3. Ship the new APK alongside the deployed backend — the old client cannot
   check out against it.

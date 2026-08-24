# Smart Ride — the financial model, as implemented

**Written:** 2026-08-24, at the close of the financial-integrity pass.
**Commit:** `ab3fe4d`. **Traced from:** the live code paths and real rows, not from UI labels.

This is the authoritative description of who owes what to whom, where each
number comes from, and what has to be true before money moves. Where a rule was
missing rather than merely mis-implemented, that is said plainly rather than
filled in.

---

## 1. The rule the whole model rests on

> **A delivery leg is priced once. The customer is charged that price. The
> courier is paid that price less the platform's declared commission.**

This was always the intent — it is what `calculatePricing` in
`src/lib/api/pricing.ts` computes, and it is what rides have always done. The
defect was that merchant and pharmacy orders reached the same engine by
different routes and each kept a different part of its answer.

Everything below follows from that one sentence.

---

## 2. Where each number comes from

| Number | Source | Rule |
|---|---|---|
| Goods subtotal | merchant's own catalogue (`priceItemsFromCatalogue`) | line quantity × the menu's price. The client's `unitPrice` is used only to detect a stale cart. |
| Delivery leg | `calculatePricingAsync(taskType, distanceKm)` → `totalAmount` | base + distance + surcharges, floored at `minimumFare`, rounded to UGX 100. |
| Customer's delivery line | `courierFare − serviceFee` | a display split; the two lines always re-add to the leg's cost. |
| Customer's service fee | `breakdown.serviceFee` | the service's `serviceFeePercent` of the leg. |
| Order total | `subtotal + deliveryFee + serviceFee − discount` | |
| Courier's task fare | `splitChargedFare(taskType, deliveryFee + serviceFee)` | **the delivery money the customer actually paid** — not a second calculation. |
| Courier's earnings | `fare × (1 − platformCommissionPercent)` | |
| Platform's cut on the leg | `fare × platformCommissionPercent` | 15% food & health, 12% shopping, 15% boda, 20% car, 10% parcel. |
| Merchant's payout | `order.subtotal × (1 − merchant.commissionRate)` | default 15%. |
| Pharmacy's payout | `subtotal × (1 − provider.commissionRate)` | default 10%, set per provider. |

**Rates were not changed.** Every figure above already existed in
`PRICING_CONFIG` or on the merchant/provider record. What changed is which of
the engine's own outputs each side reads.

---

## 3. PRICING-1 — before and after

Straight from the engine (`scripts/.qa-pricing-proof.ts`).

### Food delivery

| km | Customer paid (before) | Customer pays (now) | Courier fare | Platform margin before | Platform margin now |
|---|---|---|---|---|---|
| 1 | 3,296 | 5,000 | 5,000 | **−954** | +750 |
| 2 | 3,502 | 5,000 | 5,000 | **−748** | +750 |
| 3 | 3,708 | 5,000 | 5,000 | **−542** | +750 |
| 5.5 | 4,223 | 5,000 | 5,000 | **−27** | +750 |
| 8 | 4,738 | 5,000 | 5,000 | +488 | +750 |
| 10 | 5,150 | 5,200 | 5,200 | +730 | +780 |
| 15 | 6,180 | 6,200 | 6,200 | +910 | +930 |

The old customer figure dropped `minimumFare` and the payable rounding; the
courier's fare kept both. Under about 6 km the platform paid the courier more
than it charged, on the majority of real Kampala orders.

### Pharmacy delivery

| km | Customer paid (before) | Customer pays (now) | Courier fare | Margin before | Margin now |
|---|---|---|---|---|---|
| 1 | 5,000 (flat) | 3,000 | 3,000 | +2,450 | +450 |
| 3 | 5,000 (flat) | 3,000 | 3,000 | +2,450 | +450 |
| 5.5 | 5,000 (flat) | 3,000 | 3,000 | +2,450 | +450 |
| 10 | 5,000 (flat) | 3,600 | 3,600 | +1,940 | +540 |

**Note this direction explicitly: pharmacy customers now pay less.** The old
5,000 was a hardcode (`supportsDelivery ? 5000 : 0`), not a stated rule, and the
retention above the courier's fare was not represented anywhere in the ledger.
Applying the engine removes an undocumented margin. If the intended pharmacy
delivery price really is a flat 5,000, that is a rate decision to make
deliberately — set it in `PricingConfig` for `SMART_HEALTH_DELIVERY`, where the
admin surface already reads it, rather than restoring the constant.

### The invariant now enforced

For every merchant and pharmacy delivery:

```
customer delivery charge  ==  courier task fare
courier task fare         ==  riderEarnings + platformCommission
therefore  customer charge >= courier compensation, always
```

Asserted by `scripts/verify-financial-integrity.ts` on a real order, not by
arithmetic on paper.

---

## 4. Cash vs non-cash

### Merchant, food, retail, shopping, pharmacy — **non-cash only**

Business decision, 2026-08-24. These orders are three-sided: the customer owes
for goods *and* delivery, the shop is owed for the goods, the courier is owed
for the trip. Cash at the door puts the entire sum in the courier's hand and
leaves the platform chasing them for everyone else's share.

Enforced in three places:
- `POST /api/orders` — the zod enum no longer contains `CASH`.
- `POST /api/health-provider/orders` — same, and `paymentMethod` is now
  validated against the enum instead of being a free string.
- the mobile cart — `ORDER_PAYMENT_METHODS`, which is `PAYMENT_METHODS` minus
  cash, and the default selection moved off `CASH`.

Money flow:

```
customer  --(collected up front)-->  Smart Ride
                                       |
                                       +--> merchant: subtotal × (1 − commissionRate)
                                       |
                                       +--> courier, AFTER delivery completes:
                                       |      deliveryFee+serviceFee × (1 − commission%)
                                       |
                                       +--> platform: the two commissions
```

### Rides — **cash retained**

A ride is two-sided and its cash settlement is verified: the rider takes the
fare in hand, keeps `riderEarnings`, and owes the platform its commission as a
`CashCollection` receivable of type `COD_PAYMENT` that the existing deposit flow
clears. `walletBalance` is deliberately **not** credited for cash, or the rider
would be paid twice. Untouched by this pass, and asserted unchanged by the
suite.

### Parcel / item delivery — **left on the ride model, and flagged**

`ITEM_DELIVERY` is structurally a ride: one customer, one courier, no third
party, settled by the same verified `CashCollection` path. The closure brief
lists "Item/Merchant Delivery" among the non-cash services, while the earlier
instruction scoped the change to "food, merchants, retail etc of that sort …
different from the delivery personnel or the courier's". Those two readings
disagree, and removing cash here would break a flow that is currently verified
and financially sound.

**Decision required.** Left as-is pending it. No code assumes either answer.

---

## 5. The payment lifecycle, and one thing it cannot say

`PaymentStatus` = `PENDING | PROCESSING | COMPLETED | FAILED | REFUNDED`.
Mapped against what the brief asks each state to distinguish:

| Required distinction | Represented as | Adequate? |
|---|---|---|
| payment required | no `Payment` row, order `paymentStatus = PENDING` | yes |
| payment initiated | `Payment` row at `PENDING` | yes |
| payment pending | `PROCESSING` — the provider prompt is out | yes |
| payment confirmed / collected | `COMPLETED` + `processedAt` | yes |
| payment failed | `FAILED` + `failureReason` | yes |
| payment cancelled / expired | **collapses into `FAILED`** | see below |
| settlement / payout available | `Wallet.balance` vs `Wallet.pendingBalance`, and `WalletTransaction.status` | yes |

**The one schema limitation, reported rather than changed:** there is no
`CANCELLED` or `EXPIRED` member. A timed-out mobile-money prompt and a genuinely
declined one both land on `FAILED`, separated only by `failureReason` text.

For the money invariant this is *sufficient* — neither is collected, so neither
releases a payout, and correctness does not depend on telling them apart. It is
a **reporting** gap: operations cannot distinguish "the customer never answered"
from "the customer's payment was rejected" without parsing free text. Adding the
members is a one-line enum change plus a `db:push`, but it changes a state
machine, so it is left for an explicit decision rather than taken in a
correctness pass.

No second payment state machine was introduced. `PaymentStateTransition` already
exists in the schema for auditing these moves and is unchanged.

---

## 6. What has to be true before money moves

The invariant, as implemented:

> **No spendable balance is created from a non-cash job until a `COMPLETED`
> `Payment` row exists for it.**

The authority is the `Payment` row itself — deliberately *not* `task.paymentStatus`
(a mirror several paths set optimistically) and *not* the task's own status
(which says only that the physical work is done).

### Payment collected

completion → ledger row → courier's `Wallet.balance` credited, withdrawable →
merchant/provider payout enters the withdrawable balance → task `paymentStatus`
mirrors `COMPLETED`.

### Payment not collected

completion → ledger row still written, the courier is owed → earnings go to
`Wallet.pendingBalance` against a **PENDING** `WalletTransaction` → a
`FinanceLog` `ADJUSTMENT` at status `PENDING` records the shortfall by name
(`unpaid-completion-<taskId>`, or `unpaid-provider-order-<id>`) → `rider.walletBalance`
does **not** move → provider `pendingPayout` does **not** move.

When the payment later confirms, `releaseHeldEarnings` and
`releaseProviderPayout` move the held figures across and close the exception.
Both are idempotent: the guard is the PENDING row's own status, claimed with a
conditional `updateMany`, so two concurrent releases cannot both pay.

Nothing is silently created. Nothing is silently lost.

---

## 7. Duplicate protection

| Risk | Guard |
|---|---|
| replayed completion | `FinanceLog` (referenceId, transactionType) checked outside *and* inside the transaction, plus `WalletTransaction.idempotencyKey = <walletId>:task-earnings:<taskId>`, enforced by a DB unique index |
| replayed payment callback | `payment.updateMany` guarded on `status IN (PENDING, PROCESSING)`; a second callback matches zero rows and returns |
| duplicate payment for one order | `/payments/initiate` refuses with 409 when the obligation is already `COMPLETED` |
| duplicate release | conditional `updateMany` on the PENDING ledger row |
| duplicate provider settlement | conditional `updateMany` on `status != DELIVERED`, count checked |
| client-set amount | derived server-side from the task/order/provider order; a mismatch is refused and logged as tampering, never silently corrected |
| paying someone else's order | ownership checked against the token before any write, for all three obligation types |

---

## 8. What is still open

1. **`npm run db:push:prod`** — `Payment.providerOrderId` must exist before this
   code is deployed, or every payment read fails. Additive; the diff is one
   column, one index, one FK.
2. **Parcel/item-delivery cash** — the scope ambiguity in §4. Needs a decision.
3. **Pharmacy delivery price** — §3 lowers it. Confirm that is intended, or set
   a `PricingConfig` row for `SMART_HEALTH_DELIVERY`.
4. **`PaymentStatus` cancelled/expired** — §5. Reporting gap, not a correctness
   one.
5. **Gateways** — MTN, Airtel, card and NylonPay remain unconfigured in this
   environment, so those methods are still `BLOCKED` for verification. `WALLET`
   is now a genuinely working end-to-end non-cash path and is what the suite
   drives.
6. **`commission-engine.ts`** — a third rate table, reachable only from
   `/api/finance/commission`, whose numbers disagree with `PRICING_CONFIG`
   (e.g. food `perKmRate` 500 vs 200, commission 20% vs 15%). Not on any live
   pricing path; recorded as tech debt so nobody later mistakes it for the rule.

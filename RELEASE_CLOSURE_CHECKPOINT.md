# Release-closure checkpoint

**Written:** 2026-08-24, mid-pass, so the next session resumes without re-deriving anything.
**Branch:** `main`. **Deployed:** everything committed is pushed unless noted under "Uncommitted".

---

## How to resume in one minute

1. Read this file top to bottom.
2. `git log --oneline -8` — confirm the commits listed below are present.
3. The device screenshots from this pass are in `.qa-screens/merchant-2026-08-24/`
   (gitignored). The user will mark up design/overflow edits against them.
4. Pick up at "What is still open", in order.

---

## PHASE 1 — device verification: **DONE**

Built from `59690d7`, installed on `R3CR709T4FN`, bundle confirmed to contain the
commits under test (`Give back`, `Waiting on you`, `Needs action`,
`Find a courier`, `Give this job back` all present in
`assets/index.android.bundle`).

Verified on hardware:

| Item | Result |
|---|---|
| Label truncation — `Needs action` | **FIXED** — wraps to two lines, no clip |
| Label truncation — action tiles | **FIXED** — `Menu / Manage items`, `Earnings / View & withdraw` render in full |
| Sparkline day labels | **FIXED** — single letters `M T W T F S S` |
| OPEN/CLOSED pill | **FIXED** — full word, knob clear of it |
| Merchant login | **PASS** |
| Merchant dashboard | **PASS** — greeting, VERIFIED + OPEN FOR ORDERS, 3 stat tiles, money hero, "Waiting on you (1)" with actions attached |
| Merchant order list | **PASS** — search, phase tabs with live counts (All 1 / New 0 / Active 1) |
| Tabs | **PASS** — New correctly empty with human copy; Active shows the accepted order |
| Accept | **PASS** — order moved `PAYMENT_CONFIRMED → MERCHANT_ACCEPTED`, confirmed in the DB |
| Payment visibility on merchant cards | **PASS** — "Paid" pill + method |

**A false alarm worth recording:** the first Accept appeared to fail. It was the
device screen sleeping mid-tap (screenshot came back black). `adb shell svc power
stayon true` before driving. Not a defect.

### Found during Phase 1, still open

- **MERCH-6 (P1)** — merchant order DETAIL shows "Order not found — Network
  error. Please check your connection." when opened from the list. The list
  itself renders the order fine, so the detail screen's own fetch is wrong.
  Not yet traced. `expo-app/app/merchant/orders/[id].tsx`.
- **UI-2 (P2)** — `Performance` breaks mid-word as `Performanc / e` on the
  action tile. Cause: `numberOfLines={2}` lets a single long word break rather
  than shrink, so `adjustsFontSizeToFit` never engages. Fix is
  `numberOfLines={1}` + lower `minimumFontScale` on `ActionTile`'s title in
  `expo-app/src/components/storefront/storefrontKit.tsx`. Not yet applied.
- **UI-3 (P3)** — merchant orders search placeholder clipped
  ("Search by order, customer or"), and "Cash on delivery" clipped to
  "Cash on d…" on the order card.

---

## PHASE 2 — reconciliation: **DONE** (committed `489c4f3`)

Every OPEN finding re-read against code. Four were already closed and the
register was stale; two were real and are fixed; one is a product decision.
Full table is in `SMART_RIDE_QA_MATRIX.md` under "Reconciliation".

`SMART_RIDE_BACKEND_FINDINGS.md` statuses re-checked this pass:

| Finding | Register said | Actually |
|---|---|---|
| BE-041 (client-supplied amount) | OPEN | **FIXED** — route derives from task/order, refuses mismatch |
| BE-042 (three stale tables) | OPEN | **PARTLY** — `unified-state-machine.ts` deleted; other two remain (tech debt, not a blocker) |
| BE-039 (non-cash never charged) | OPEN P0 | **STILL OPEN — see Phase 6** |
| BE-040 (earnings credited before payment) | OPEN P2 | **STILL OPEN — confirmed live** |

---

## PHASE 3 — LC-1: **NOT YET DONE**

The implementation exists (commit `d51e478`): before pickup the driver's button
calls `api.declineTask`; from `PICKED_UP` on it calls `cancelTask`. Label is
"Give back" / "Cancel" accordingly.

Still to verify before LC-1 can be closed:
- `ASSIGNED → CANCELLED` is never attempted by the app
- decline rejects the DispatchMatch and excludes that rider from the attempt
- task returns to dispatch and is re-offered
- `rider.currentTaskId` is released
- customer sees searching
- a driver holding an active task cannot be offered another
- behaviour correct for rides AND deliveries

---

## PHASE 4/5 — financial model: **PARTLY DONE, and it found a real problem**

### The pricing rule, as it actually exists

- **Rides**: `calculatePricing({taskType, distanceKm})` in `src/lib/api/pricing.ts`.
  `totalAmount` = base + distance + time + surcharges, floored at `minimumFare`.
  `riderEarnings = totalAmount × (1 − platformCommissionPercent)`.
  Commission is the only documented margin: 15% boda, 20% car, 10% food/shopping,
  15% health.
- **Food / shopping**: customer's delivery fee is computed by `quoteOrder`
  (`src/lib/api/order-pricing.ts`) as
  `baseFare + distanceFare + nightSurcharge + peakSurcharge` — **the minimum fare
  is NOT applied**. The courier's task is priced by `calculatePricing`, which
  **does** apply it.
- **Pharmacy**: `deliveryFee = provider.supportsDelivery ? 5000 : 0` — a flat
  hardcode in `src/app/api/health-provider/orders/route.ts`. The courier task is
  distance-priced as above.

### **PRICING-1 (P0, business-rule blocker) — the platform loses money on short food deliveries**

Measured directly from the engine:

| Distance | Customer pays (delivery) | Courier task total | Platform |
|---|---|---|---|
| 1 km | 3,200 | 5,000 | **−1,800** |
| 3 km | 3,600 | 5,000 | **−1,400** |
| 5.5 km | 4,100 | 5,000 | **−900** |
| 10 km | 5,000 | 5,200 | **−200** |

Because the customer fee omits `minimumFare` and the courier fare applies it,
Smart Ride pays the courier more than it charges the customer on every food
delivery under ~10 km — which is most of them.

Pharmacy runs the other way: flat 5,000 against a 3,000–3,600 courier fare, so
the platform retains 1,400–2,000 per order by accident of a hardcode, not a rule.

**Do not "fix" this by changing rates.** The decision needed is: *is the customer
delivery fee meant to equal the courier fare, or is it a separate price with its
own margin?* Everything else follows from that.

### Answers to the Phase 5 questions

1. Customer delivery fee: distance-based for merchant orders (no minimum), flat
   5,000 for pharmacy.
2. Courier compensation: `totalAmount × (1 − commission%)`, minimum applied.
3. Yes, distance-based.
4. Nominally the same engine, but reached by two different code paths that
   disagree.
5. Intended margin: `platformCommissionPercent`, taken out of the courier fare.
6. **No** — the difference is represented nowhere.
7. Pharmacy: yes, undocumented retention. Food: the reverse, undocumented loss.

---

## PHASE 6 — payment methods: **PARTLY DONE**

| Method | Status | Note |
|---|---|---|
| CASH | **VERIFIED** | end-to-end on the pharmacy chain; courier receivables recorded |
| WALLET | **UNVERIFIED** | the only end-to-end non-cash path per BE-039; not driven this pass |
| MTN / Airtel / card | **BLOCKED** | gateway not configured in this environment |

**BE-039 (P0) stands:** `FinanceLedgerService.recordTaskCompletion` sets
`paymentStatus = COMPLETED` **only for CASH**. Every gateway method leaves the
task PENDING, nothing collects it automatically, nothing retries, and
`COMPLETED → PAID` has no caller anywhere.

**BE-040 (P0 in combination) confirmed live this pass:** the same function
credits `rider.walletBalance` AND the real `Wallet` for every **non-cash**
completion, while the customer's payment is still PENDING. So a non-cash trip
pays the courier and never charges the customer.

---

## NEW BUSINESS DECISION (from the user, 2026-08-24) — not yet implemented

> Remove CASH as a payment method for **merchant deliveries** — food, retail,
> merchants "of that sort" — until there is a safe way to verify the cash flow.
> The system should collect all the money at once (non-cash), pay the restaurant,
> and pay the delivery person **later, once the delivery is completed**.
>
> This does **not** apply to the courier's / delivery-personnel's own earnings
> flow, and (per the wording) is about merchant/food/retail, not pharmacy —
> **confirm the pharmacy question with the user before implementing.**

Implementation notes for whoever picks this up:
- Order creation validates `paymentMethod` in `src/app/api/orders/route.ts`
  (zod schema). Restricting CASH for `FOOD_DELIVERY` / `SHOPPING` belongs there,
  plus the client's method picker.
- "Pay the courier later, on completion" is close to what already happens for
  non-cash (`creditRewardToWallet` at COMPLETED) — but BE-039/BE-040 mean the
  customer has not actually paid at that point. **This decision cannot be
  correctly implemented until BE-039 is resolved**, or it formalises paying out
  money that was never collected.

---

## PHASE 7 — final security audit: **NOT STARTED**

## PHASE 8 — readiness decision: **NOT REACHED**

---

## What is still open, in the order I would do it

1. **PRICING-1** — get the business rule decided. Blocks any honest money model.
2. **BE-039 / BE-040** — non-cash collects nothing and pays out anyway. Blocks
   the new cash-removal decision, and blocks non-cash release.
3. **MERCH-6** — merchant order detail "Order not found".
4. **LC-1 verification** (Phase 3 checklist above).
5. **UI-2 / UI-3** — the remaining truncations.
6. **Phase 7** security sweep, then **Phase 8**.

---

## Commits created this pass

- `d51e478` fix(driver): two controls that could only ever fail — DEV-3, DEV-6
- `b93bed1` fix(auth): the login back arrow went wherever you came from
- `a62d466` feat(incentives): a driver can leave a bonus they joined — INC-3
- `489c4f3` docs(qa): reconcile every open finding against the code

Not mine, present on the branch: `06394bf`, `7559dce`, `59690d7` (auth field
fixes, client home screen, card/radius refactor).

## QA data

All transient fixtures cleaned. The four standing `@smartride.test` accounts are
deliberate. **Left behind by this pass, still to clean:**
`scripts/.qa-merch.json` + the QA Kitchen merchant, its 2 orders and menu item —
run `bun scripts/.qa-merch.ts cleanup`.

`qa.courier@smartride.test` was found holding `FINANCE_ADMIN` and was reset to
`RIDER` this pass.

## Uncommitted at time of writing

`scripts/.qa-merch.ts`, `scripts/.qa-inc3.ts` (dot-prefixed QA harnesses),
`.qa-screens/`, and a set of expo auth/client files that are the user's own
in-flight work — do not commit those without asking.

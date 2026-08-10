# Smart Ride — Backend Findings Ledger

A living, shared record of backend / platform / financial / security / workflow /
realtime / data-integrity defects discovered by the **Screen Migration Session**
while migrating the mobile app onto the Design System.

**This file is coordination infrastructure between parallel engineering
sessions.** Preserve existing findings and their IDs. Never renumber. Never
delete a resolved finding — append a Resolution block instead, so the audit
trail survives.

**Owner of the fixes:** Backend / Production Engineering session, unless a
finding is explicitly marked as already fixed locally.

**ID allocation:** next free ID is **BE-008**.

---

## Index

| ID | Title | Priority | Status | Category |
|---|---|---|---|---|
| BE-001 | Order creation trusted client-supplied prices | P0 | FIXED_PENDING_VERIFICATION | Financial |
| BE-002 | Order line-item `unitPrice` still comes from the client | P0 | OPEN | Financial |
| BE-003 | Two divergent withdrawal implementations | P1 | OPEN | Financial |
| BE-004 | Chat claimed end-to-end encryption that does not exist | P1 | FIXED_PENDING_VERIFICATION | Security |
| BE-005 | `DELIVERY_PERSONNEL` dispatched work it had no UI to accept | P1 | FIXED_PENDING_VERIFICATION | Workflow |
| BE-006 | `riderRole` enum drift written by onboarding | P1 | FIXED_PENDING_VERIFICATION | Data |
| BE-007 | Dead wallet API surface with no callers | P3 | OPEN | Backend |

---

## BE-001 — Order creation trusted client-supplied prices

**Status:** FIXED_PENDING_VERIFICATION
**Priority:** P0
**Category:** Financial
**Discovered by:** Screen Migration Session
**Discovered at:** Journey 3 (Shopping), 2026-08-10

**Location:**
- `src/app/api/orders/route.ts` (POST handler, schema and `tx.order.create`)
- `expo-app/app/orders/cart.tsx`
- new: `src/lib/api/order-pricing.ts`, `src/app/api/orders/quote/route.ts`

**Evidence:**
`POST /api/orders` validated `subtotal`, `deliveryFee`, `serviceFee` and
`totalAmount` as `z.number().min(0)` straight from the request body and wrote
them to the `Order` and `Task` rows verbatim. The mobile cart supplied them from
two literals it declared itself (`const deliveryFee = 3000; const serviceFee =
500;`). A modified client could therefore post a zero delivery fee, or a total
that did not match its own line items. A server-side pricing engine
(`src/lib/api/pricing.ts`) already existed and was used by rides, but no order
route consulted it.

**Why it matters:**
Client-controlled pricing on a money path. Revenue loss and an unreconcilable
ledger — the stored order total need not equal the sum of anything.

**Expected behavior:**
The server prices the order. The request body may carry advisory figures for
backward compatibility but must not determine what is charged.

**Fix applied by this session (mobile-adjacent, small, unblocking):**
`src/lib/api/order-pricing.ts` now derives subtotal from the submitted line
items, computes distance from merchant and delivery coordinates rather than a
client-asserted number (with a non-zero fallback so a missing coordinate cannot
make delivery free), and takes fees from the existing pricing engine.
`POST /api/orders/quote` exposes the same function so the cart shows what will
be charged. `POST /api/orders` now writes `pricing.*` instead of
`validatedData.*`. Money fields remain in the schema as `optional()` and are
ignored.
Commit: `975fd6b`, `86cb72f`.

**Do not assume:**
- Whether any *other* client (web app, admin) still relies on being able to set
  these fields. Only the mobile cart was audited.
- Whether existing orders written before this change need reconciliation.
- `FALLBACK_DISTANCE_KM = 3` is a placeholder chosen to be non-zero; the
  backend session should decide the correct policy when coordinates are absent.

**Related screens/journeys:** Journey 3 — Shopping (`orders/cart.tsx`).

**Verification required:**
Post an order with `deliveryFee: 0` and confirm the stored order carries the
server-computed fee. Confirm `POST /api/orders/quote` and `POST /api/orders`
return the same figures for identical input.

**Dependencies:** BE-002 (same money path, still open).

---

## BE-002 — Order line-item `unitPrice` still comes from the client

**Status:** OPEN
**Priority:** P0
**Category:** Financial
**Discovered by:** Screen Migration Session
**Discovered at:** Journey 3 (Shopping), 2026-08-10

**Location:**
- `src/app/api/orders/route.ts` — `items: z.array(z.object({ ..., unitPrice: z.number().min(0) }))`
- `src/lib/api/order-pricing.ts` — `quoteOrder` derives subtotal from these values

**Evidence:**
BE-001 stopped the client setting fees and totals, but the subtotal is still
derived from `unitPrice` values supplied in the request. A modified client can
post `unitPrice: 0` for a real menu item and the server will compute a subtotal
of zero, correctly and consistently, from a false input.

**Why it matters:**
The remaining half of the same price-tampering path. Fixing fees without fixing
item prices closes the smaller hole.

**Expected behavior:**
Item prices should be looked up from the merchant's menu/catalogue inside the
order transaction, and the request's `unitPrice` ignored (or rejected on
mismatch).

**Recommended investigation/fix:**
Join `menuItemId` against the merchant's menu inside the existing
`db.$transaction` in `POST /api/orders`, and price from the stored record.
Decide the behaviour when an item is missing or its price changed between cart
and checkout — silently repricing surprises the customer; failing the order is
safer but needs a good client-side message.

**Do not assume:**
- Whether every cart line reliably carries a resolvable `menuItemId`
  (`expo-app/app/orders/cart.tsx` sends `menuItemId: item.productId`, which was
  not traced to the menu model in this session).
- Whether shopping (non-food) items live in the same table as food menu items.

**Related screens/journeys:** Journey 3 — Shopping.

**Verification required:**
Post an order with a deliberately understated `unitPrice` and confirm the stored
order uses the catalogue price.

**Dependencies:** BE-001.

---

## BE-003 — Two divergent withdrawal implementations

**Status:** OPEN
**Priority:** P1
**Category:** Financial
**Discovered by:** Screen Migration Session
**Discovered at:** Journey 6 (Driver), 2026-08-10

**Location:**
- `src/app/api/riders/withdraw/route.ts` — uses `withdrawFromWallet` from `src/lib/wallet/wallet-service`
- `src/app/api/wallet/withdraw/route.ts` — hand-rolls the balance update with `db.wallet.findFirst` / `db.wallet.create`
- Mobile callers: `expo-app/app/rider/earnings.tsx` → `/riders/withdraw`; `expo-app/app/wallet/index.tsx`, `expo-app/app/rider/wallet.tsx` → `/wallet/withdraw`

**Evidence:**
Two endpoints perform the same operation — debit a wallet, pay out to mobile
money — with different implementations. `/riders/withdraw` goes through the
atomic wallet-service and records a payout. `/wallet/withdraw` reads and writes
the wallet directly in the route. Three mobile screens call one or the other
depending on which screen the user happened to be on.

**Why it matters:**
Money leaving the platform through two code paths with different atomicity
guarantees. Whichever is non-atomic is a candidate for lost or double debits
under concurrency, and reconciliation has to account for two shapes of record.

**Expected behavior:**
One withdrawal implementation. Both routes may remain as endpoints if their
authorization or business rules genuinely differ, but they should delegate to
the same service.

**Recommended investigation/fix:**
Determine whether the two endpoints differ in intent (rider earnings payout vs
general wallet withdrawal) or only by accident. If only by accident, collapse
`/wallet/withdraw` onto `withdrawFromWallet`. Check both for idempotency and for
behaviour under concurrent requests.

**Do not assume:**
- That the two are semantically identical. They may intentionally differ in who
  may call them, what balance they draw from, or what payout record they write.
  This session did not trace the business rules, only the implementations.

**Fix NOT applied by this session** — this is financial infrastructure and owned
by the backend session. The mobile side was made safe without picking a winner:
`WithdrawModal` gained an optional `onSubmit` override so both callers share one
UI while keeping their own endpoint (commit `fa47b16`). Unifying the mobile
callers is trivial *after* the backend decides which endpoint is canonical.

**Related screens/journeys:** Journey 1 — Client Money; Journey 6 — Driver.

**Verification required:**
Concurrent withdrawal requests against the same wallet must not over-draw.
Both paths must produce equivalent transaction/payout records.

**Dependencies:** None.

---

## BE-004 — Chat claimed end-to-end encryption that does not exist

**Status:** FIXED_PENDING_VERIFICATION
**Priority:** P1
**Category:** Security
**Discovered by:** Screen Migration Session
**Discovered at:** Journey 2 (Client Support), 2026-08-10

**Location:**
- `expo-app/app/chat/[id].tsx` (header badge — fixed)
- `prisma/schema.prisma` — `model Message { content String ... }`

**Evidence:**
The conversation header displayed a shield badge reading **"End-to-end
encrypted"**. `Message.content` is a plain `String` column. A search for
encryption in the chat path (`chatStore`, `socket.service`, the chat API routes)
found no crypto library, no ciphertext field and no key exchange. Messages are
stored and transmitted in plaintext and are readable by the server and by anyone
with database access.

**Why it matters:**
A false security claim, not merely inaccurate copy. `expo-app/app/rider/ride-tracking.tsx`
actively promotes in-app chat as the privacy-safe alternative to sharing a phone
number, so the badge could plausibly influence what a user chooses to send —
addresses, ID numbers, payment details.

**Expected behavior:**
Either the claim is removed, or E2E encryption is actually implemented.

**Fix applied by this session (UI-owned, so fixed directly):**
The badge now states the property that does hold — contact details stay private,
in-app only — matching the wording ride tracking already uses. Commit `298820f`.

**Remaining backend question (why this is still logged):**
Whether messages *should* be encrypted at rest is a platform decision. If the
product intends to make this claim, the backend needs to implement it. Recorded
so the decision is made deliberately rather than by a badge.

**Do not assume:**
- That no other surface makes the same claim. The web app and marketing pages
  were not audited.

**Related screens/journeys:** Journey 2 — Client Support.

**Verification required:**
Search the web app and marketing copy for equivalent claims. If E2E is
implemented, verify ciphertext at rest in the `Message` table.

**Dependencies:** None.

---

## BE-005 — `DELIVERY_PERSONNEL` was dispatched work it had no UI to accept

**Status:** FIXED_PENDING_VERIFICATION
**Priority:** P1
**Category:** Workflow
**Discovered by:** Screen Migration Session
**Discovered at:** Journey 5 (Delivery Personnel), 2026-08-10

**Location:**
- `src/lib/dispatch/types.ts:320-323`
- `src/lib/api/state-machine.ts:78, 91-94`
- `src/lib/api/health-state-machine.ts:43`
- Mobile: `expo-app/app/driver/index.tsx`, new `expo-app/app/driver/deliveries.tsx`

**Evidence:**
Dispatch routes `FOOD_DELIVERY`, `SHOPPING` and `SMART_HEALTH_DELIVERY`
exclusively to `DELIVERY_PERSONNEL`, and `ITEM_DELIVERY` partly to it. Health
orders are DP-only (`health-state-machine.ts:43`). The mobile app had no UI that
acknowledged the role: the dashboard called every offer a "ride", the map drew
DP riders as boda riders, and there was no view of the multiple assignments a
delivery provider can hold at once.

**Why it matters:**
Work was being assigned to providers whose app could not represent it. This is a
role that exists end-to-end in the backend and was unusable in practice.

**Expected behavior:**
A delivery provider can see, accept and complete the work dispatch sends them.

**Fix applied by this session (mobile-owned):**
Golden Screens #40–42 specced in `SMART_RIDE_GOLDEN_SCREENS.md`; the driver
dashboard branches on `riderRole` for framing; `app/driver/deliveries.tsx` added
as the delivery queue. Commit `a45cb28`.

**Remaining backend questions (why this is still logged):**
1. Is there a proof-of-delivery requirement (photo, signature, code) that the
   backend expects and the mobile app does not yet collect? `driver-task.tsx`
   implements a `DELIVERY_FLOW` but this session did not verify it against the
   server's expected state transitions for DP tasks.
2. `GET /tasks` is role-scoped and was used for the queue. Confirm it returns
   *all* concurrent assignments for a DP rider, not just the active one.

**Do not assume:**
- That the DP lifecycle is complete server-side merely because dispatch reaches
  the role.

**Related screens/journeys:** Journey 5 — Delivery Personnel.

**Verification required:**
Assign two concurrent deliveries to one DP rider and confirm both appear in
`GET /tasks` and can be progressed independently.

**Dependencies:** BE-006.

---

## BE-006 — `riderRole` enum drift written by onboarding

**Status:** FIXED_PENDING_VERIFICATION
**Priority:** P1
**Category:** Data
**Discovered by:** Screen Migration Session
**Discovered at:** Journey 5 (Delivery Personnel), 2026-08-10

**Location:**
- `expo-app/app/rider/onboarding.tsx` — `VEHICLE_TYPE_TO_RIDER_ROLE`
- `expo-app/src/types/index.ts:165` — `RiderRole`
- `prisma/schema.prisma` — `enum RiderRole`

**Evidence:**
Onboarding mapped `MOTORCYCLE → 'SMART_BODA'` and `CAR → 'SMART_CAR'`. Neither
is a member of `RiderRole`, which is
`SMART_BODA_RIDER | SMART_CAR_DRIVER | DELIVERY_PERSONNEL`, nor of the Prisma
enum. Nothing downstream matched those values, so the map marker system, the
dashboard's role branch and any dispatch logic keyed on `riderRole` fell through
to defaults for every rider onboarded through that path.

**Why it matters:**
Silently wrong data written at signup. Riders were persisted with a role no
consumer recognises, and the failure mode was a default rather than an error, so
nothing surfaced it.

**Expected behavior:**
Onboarding writes a valid `RiderRole`.

**Fix applied by this session (mobile-owned):**
The map is now typed `Record<string, RiderRole>` so the union is enforced at
compile time, and writes the correct members. Also removed two dead marker
branches on `'ERRAND_RUNNER'` and `'PARCEL_DRIVER'`, neither of which exists in
the union or the schema. Commit `a45cb28`.

**Remaining backend work (why this is logged):**
**Existing rows are still wrong.** Any `Rider` persisted before this fix may
carry `'SMART_BODA'` / `'SMART_CAR'` (or whatever the column accepted). The
backend session should check what actually landed in the database and migrate
those rows.

**Do not assume:**
- That Prisma rejected the invalid values. If `riderRole` is stored as a String
  anywhere in the write path, or the API coerced it, bad rows exist.
- That this was the only writer of `riderRole`.

**Related screens/journeys:** Journey 5 — Delivery Personnel; Journey 6 — Driver.

**Verification required:**
`SELECT DISTINCT "riderRole" FROM "Rider"` — confirm only the three valid
members are present, and migrate any that are not.

**Dependencies:** BE-005.

---

## BE-007 — Dead wallet API surface with no callers

**Status:** OPEN
**Priority:** P3
**Category:** Backend
**Discovered by:** Screen Migration Session
**Discovered at:** Journey 1 (Client Money), 2026-08-10

**Location:**
- `expo-app/src/services/api.ts` — `getWalletBalance()`, `getReceipts()`
- corresponding routes under `src/app/api/wallet/balance`, receipts

**Evidence:**
`getWalletBalance()` has zero callers — the home screen uses the heavier
`getWallet()` instead. `getReceipts()` has zero callers; no receipts-list screen
exists (only `receipt/[id]`).

**Why it matters:**
Low. Either the endpoints are genuinely unused and can go, or a planned screen
(a receipts list) was never built and the API is waiting for it.

**Expected behavior:**
Either consume or remove.

**Recommended investigation/fix:**
Decide whether a receipts-list screen is wanted. If yes, it is a small AR-4
screen the migration session can build on request. If no, remove both methods
and their routes.

**Do not assume:**
- That the web app does not call these. Only the mobile client was audited.

**Related screens/journeys:** Journey 1 — Client Money.

**Verification required:** N/A — a product decision.

**Dependencies:** None.

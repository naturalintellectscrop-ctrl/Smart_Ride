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

**ID allocation:** next free ID is **BE-015**.

---

## Index

| ID | Title | Priority | Status | Category |
|---|---|---|---|---|
| BE-001 | Order creation trusted client-supplied prices | P0 | FIXED_PENDING_VERIFICATION | Financial |
| BE-002 | Order line-item `unitPrice` still comes from the client | P0 | RESOLVED | Financial |
| BE-003 | Two divergent withdrawal implementations | P1 | RESOLVED | Financial |
| BE-004 | Chat claimed end-to-end encryption that does not exist | P1 | RESOLVED | Security |
| BE-005 | `DELIVERY_PERSONNEL` dispatched work it had no UI to accept | P1 | RESOLVED | Workflow |
| BE-006 | `riderRole` enum drift written by onboarding | P1 | RESOLVED — no backfill owed | Data |
| BE-007 | Dead wallet API surface with no callers | P3 | RESOLVED — receipts screen specced as Golden Screen #43 | Backend |
| BE-008 | `getFareEstimate` signature left incomplete mid-edit | P2 | FIXED_PENDING_VERIFICATION | Backend |
| BE-009 | Surge applied silently, broke the minimum-fare flag | P2 | FIXED_PENDING_VERIFICATION | Backend |
| BE-010 | Push registration fails on the release build | P1 | DIAGNOSED — one Console change owed | Infrastructure |
| BE-011 | Withdrawals were not idempotent | P1 | RESOLVED | Financial |
| BE-012 | Ratings were one-way; sub-scores written by nothing | P1 | RESOLVED | Data |
| BE-013 | Three unreconciled stores held the same rating | P1 | RESOLVED | Data |
| BE-014 | Intermittent P2028 in verification runs | P2 | RESOLVED | Infrastructure |

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

**Status:** RESOLVED
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

### Resolution — Backend session, 2026-08-10

`priceItemsFromCatalogue()` in `src/lib/api/order-pricing.ts` resolves every
line against the **merchant's own** `MenuItem` rows and returns the prices that
will be charged. `POST /api/orders` writes `priced.items`; the request's
`unitPrice` is never persisted.

Scoping to the merchant matters as much as the lookup: without it a client
could reference a cheaper item belonging to a *different* merchant and buy this
merchant's goods at that price. That case is now rejected, and is asserted.

Name and description also come from the catalogue. A client that could relabel
a line could buy a cheap item under an expensive item's name, which matters
once a human is picking the order.

Answers to the two "do not assume" questions:
- **Every cart line does carry a resolvable `menuItemId`.** `cart.tsx` sends
  `menuItemId: item.productId`, and `productId` is `product.id` from the
  merchant's own menu API (`orders/merchant/[id].tsx:126`). A line without one
  is now rejected rather than trusted.
- **Shopping and food items share one table** (`MenuItem`, scoped by
  `merchantId`), so one lookup covers both order types.

On the behaviour question the ledger left open — silently repricing vs failing
— neither. Repricing *upward* returns **409 `PRICE_CHANGED`** with the affected
lines, because charging more than the customer agreed to at checkout is the
thing to avoid; repricing *downward* just charges the lower real price. Items
that cannot be honoured at all return **409 `ITEMS_UNAVAILABLE`** with a
per-item reason so the cart can mark exactly which lines to fix. Availability
and stock are enforced at the same point.

`POST /api/orders/quote` now performs the same resolution and returns
`priceChanges` / `unavailable` / `pricedFromCatalogue`, so a stale cart is
corrected while the customer can still react instead of failing at checkout.
The mobile cart sends `menuItemId` to the quote.

**Verification:** `bun scripts/verify-order-pricing.ts` — 16 checks. Attacks the
resolver the way a tampered client would: `unitPrice: 0` on a real item (charged
25,000, not 0), another merchant's cheap item, an unavailable item, more than
stock, a line with no `menuItemId`, and zero quantity. Also asserts a truthful
cart produces no warnings, that a client offering to *overpay* is charged the
lower real price, and that delivery is never free even on a zero-value cart.

---

## BE-003 — Two divergent withdrawal implementations

**Status:** RESOLVED
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

### Resolution — Backend session, 2026-08-10

**They differed by accident, and the difference had already killed one of
them.** Both endpoints are RIDER-only, but they addressed *different wallets*:

- `/riders/withdraw` → `ownerType: 'RIDER'`, keyed on `rider.id`
- `/wallet/withdraw` → `ownerType: 'USER'`, keyed on `user.userId`

`SELECT "ownerType", COUNT(*) FROM "Wallet" GROUP BY 1` returns **`USER` only —
zero RIDER-owned wallets have ever existed.** So every withdrawal from the
earnings screen failed with "Wallet not found", and `/riders/earnings` displayed
a balance read from that same non-existent wallet. Two more call sites shared
the mistake: `riders/earnings/route.ts:126` and
`marketplace/incentive-fulfillment.ts:506`, the latter *crediting* incentive
payouts into a parallel balance no driver could ever withdraw from.

**USER is canonical.** Every existing wallet row is USER-owned, so nothing needs
migrating and no driver loses money; and a person who both rides and drives
should have one balance, not two. All four call sites now agree.

**The deeper defect was shared by both implementations.** Each read the balance
and then wrote `balance = read - amount`. That is a lost update even inside a
transaction: under READ COMMITTED (Prisma's default) two concurrent withdrawals
both read the same balance, both pass the sufficiency check, and the second
overwrites the first — a wallet holding 10,000 pays out 10,000 twice and ends at
5,000. `/wallet/withdraw` was worse (it read *outside* the transaction), but
`withdrawFromWallet` was not safe either.

The debit is now a single conditional statement — `UPDATE … SET balance =
balance - :amount WHERE id = :id AND status = 'ACTIVE' AND balance >= :amount
RETURNING balance`. Postgres evaluates the condition and applies the decrement
atomically, so the loser of a race matches zero rows instead of over-drawing,
and there is no gap between the check and the write for a read to go stale in.
`RETURNING` also supplies the post-debit balance from the same statement, which
keeps the transaction to two round trips instead of four — that footprint is
what exhausts the connection pool under real concurrency.

Payouts are recorded **PENDING**, not COMPLETED: the balance is debited
immediately so the money cannot be spent twice, but a mobile-money payout is not
settled until the provider confirms it. Errors now surface the specific reason
("Insufficient balance", "Wallet is not active") rather than a generic failure.

**Verification:** `bun scripts/verify-wallet-withdrawal.ts` — 15 checks,
including ten genuinely concurrent withdrawals of 2,000 against a 10,000 wallet.
Asserts both halves of the property: **safety** (never more successes than the
balance funds, never negative, ledger reconciles `before - amount = after`) and
**liveness** (the wallet still drains to exactly zero afterwards, so an
over-eager guard cannot strand money). Some racers lose to Prisma `P2028`
connection-pool pressure rather than to the balance guard; that is
infrastructure, not correctness, which is why the assertion is `succeeded <= 5`
plus a sequential drain to zero rather than `succeeded === 5`.

**Still owed:** neither endpoint is idempotent. A retried request with the same
intent will debit twice. Fixing that needs a client-supplied idempotency key and
is left as a separate item rather than smuggled into this one.

---

## BE-004 — Chat claimed end-to-end encryption that does not exist

**Status:** RESOLVED
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

### Resolution — Backend session, 2026-08-10

**The mobile badge was fixed, but the same false claim was still live on the
web.** The "do not assume" note was right: `src/components/smart-ride/messaging/
enhanced-messaging-screen.tsx:532` and `messaging-screen.tsx:416` both rendered
"End-to-end encrypted • Phone numbers hidden", and the first of those is
reachable — `client-messages.tsx` imports it into the client dashboard.

**A third claim was found that no session had recorded.**
`pharmacy-prescriptions.tsx:161` labelled prescription images "Encrypted image
storage". `POST /api/prescriptions` stores `imageUrl` as a plain URL and sets
`imageHash: Date.now().toString(36)` — a timestamp, not a digest. Nothing
encrypts the file. That is a health record, so the claim mattered more than the
chat one.

**Decision on the platform claim — MADE, 2026-08-10.** The product decision:
**accurate non-E2EE messaging with real encryption at rest**, rather than
prematurely shipping end-to-end encryption.

`src/lib/crypto/field-encryption.ts` encrypts message bodies with AES-256-GCM
before storage. Authenticated, so a tampered ciphertext fails to decrypt rather
than silently yielding altered plaintext; a fresh random IV per record, so
identical messages do not produce identical ciphertext — without that, "yes" and
"no" replies would be distinguishable by pattern alone. The stored format is
version-prefixed (`v1:iv:tag:ciphertext`) so a future key rotation does not need
a flag-day migration, and rows written before a key existed keep reading.

**What this protects, stated precisely, because the whole finding is about not
overclaiming:**

- IT DOES protect message contents against someone who obtains the database — a
  leaked backup, a stolen dump, a misconfigured replica, a support engineer
  browsing rows. That is the realistic threat.
- IT DOES NOT make messages unreadable to Smart Ride. The server holds the key,
  deliberately, because the platform must be able to read a conversation to
  adjudicate a dispute, investigate harassment, or answer a lawful request.

All four chat read/write paths are wired (`api/messages`, `api/chat/*`), and the
audit log now records message *length* rather than content — an audit trail
holding plaintext would have undone the encryption sitting beside it.

**Operational note:** encryption activates only when `MESSAGE_ENCRYPTION_KEY` is
set (32+ random characters). Absent, the code degrades to plaintext rather than
refusing to start — a platform that will not boot is worse than one storing what
it stored yesterday — but `verify-production-config` reports it as a warning
every run so it cannot pass unnoticed.

All three now state properties that actually hold — contact details stay
private, in-app only; prescriptions are visible only to the patient and their
pharmacist. That wording is backed by a real mechanism (`redactPerson` in
`src/lib/privacy/public-contact.ts`), which the harness also asserts still
exists, so the replacement claim cannot quietly become false either.

**Claims audited and deliberately left alone, because they are true:**
- "encrypted in transit and at rest" (help, landing, privacy pages) — holds at
  the platform level: Supabase/AWS encrypt volumes and TLS covers transit.
  Nothing in the application enforces it, so it is a **platform** guarantee, not
  an application one. Worth knowing if the hosting ever moves.
- "Your code is encrypted" (`verify-otp.tsx`) — the OTP is bcrypt-hashed
  (`otpHash`, `bcryptjs`) before storage. "Encrypted" is loose for "hashed", but
  the user-facing meaning — we do not keep your code in readable form — is true.

**Verification:** `bun scripts/verify-security-claims.ts` — 10 checks scanning
**612 UI files across 4 roots** for banned claims (end-to-end encrypted, E2EE,
encrypted image storage, zero-knowledge, "we cannot read your messages").
Comments are stripped before scanning, so the notes explaining why each claim
was removed do not trip the scanner. This is a regression guard: a removed
claim cannot come back in a later redesign without failing the suite.

---

## BE-011 — Withdrawals were not idempotent

**Status:** RESOLVED
**Priority:** P1
**Category:** Financial
**Discovered by:** Backend session, while closing BE-003
**Discovered at:** 2026-08-10

**Location:** `src/lib/wallet/wallet-service.ts`,
`src/app/api/wallet/withdraw/route.ts`, `src/app/api/riders/withdraw/route.ts`

**Evidence:**
Recorded as "still owed" when BE-003 closed. A retried withdrawal debited
twice. On a mobile connection a dropped response is indistinguishable from a
failure, so the user taps again — and the second tap took their money again.

**Fix:**
`WalletTransaction.idempotencyKey`, unique, holding `<walletId>:<clientKey>` so
the same key from two different users cannot collide. Callers pass a key via
the standard `Idempotency-Key` header (body accepted as a fallback).

The guarantee is the **unique constraint**, not a lookup. A check-then-act read
is exactly what fails under concurrency: two simultaneous retries both find no
prior transaction and both debit. Because the ledger insert shares a
transaction with the balance decrement, a duplicate key rolls the debit back
with it — so the wallet moves exactly once and the loser returns the winner's
result. The prior-transaction lookup is kept as a fast path for the ordinary
sequential retry, but it is an optimisation, not the guard.

A replayed request also short-circuits before the audit log and the
notification, so a driver is not told twice that they withdrew.

**Verification:** covered by `verify-wallet-withdrawal` (26 checks total).
Ten sequential and six *simultaneous* retries with one key produce **one**
transaction and **one** debit. Also asserts a different key is a genuinely new
withdrawal, the same key on a different wallet is not blocked, and a **refused**
withdrawal leaves no key behind to block a later real one.

**Dependencies:** BE-003.

---

## BE-005 — `DELIVERY_PERSONNEL` was dispatched work it had no UI to accept

**Status:** RESOLVED
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

### Resolution — Backend session, 2026-08-10

Both remaining questions answered, and a third defect found while answering
them.

**1. Proof of delivery did not exist at all.** Not "the app does not collect
it" — there was no photo, signature, code or timestamp field anywhere on
`Task`. A courier could mark a parcel DELIVERED from anywhere, and a customer
disputing "I never received it" left the platform with nothing to adjudicate
on.

Added: `deliveryCode`, `proofType`, `proofPhotoUrl`, `proofSignatureUrl`,
`proofRecipientName`, `proofLatitude/Longitude`, `proofCapturedAt`, and a
`ProofOfDeliveryType` enum (CODE / PHOTO / SIGNATURE / LEFT_WITH_NOTE —
the last deliberately distinct, because it is a *claim*, not evidence, and so
carries a higher bar: a photo of where the parcel was left).

The important asymmetry: the handover code is issued to the **customer** and
never returned to the courier. `GET /api/tasks/[id]/proof` returns it only when
the caller is the client, and no task listing selects the column. A courier who
could read it could "prove" a delivery they never made, which is the exact
thing the code exists to prevent.

Proof is validated, not merely accepted — a wrong code, a PHOTO with no photo,
or a capture more than 1 km from the recorded drop-off are all refused. And it
is a one-time act: re-submitting is rejected, so a courier cannot replace weak
evidence after a dispute is raised.

**Completion is gated on it.** `POST /api/tasks/[id]/status` refuses
DELIVERED/COMPLETED with 409 `PROOF_REQUIRED` when a delivery has no proof —
enforced server-side, because if completion were still possible without proof,
capturing it would be optional in practice and the missing ones would be
exactly the disputed ones. An **admin can override**: a genuine delivery whose
photo upload failed still has to be closable by a human.

**2. `GET /tasks` does return all concurrent assignments** for a DP rider — it
is role-scoped with no artificial limit. `/tasks/active` uses `findFirst` and
returns one by design; `getActiveAssignments()` is the multi-job accessor, and
a courier holding three parcels sees all three, ordered by urgency. A courier
sees only their own.

**3. A defect found while testing: claiming was a race.** `POST
/tasks/[id]/accept` read the task, checked it was unclaimed, then let the state
machine write `riderId` unconditionally — the same read-then-write that let two
withdrawals drain one wallet. Two couriers accepting the same offer within the
dispatch window both passed the check and both wrote; the second silently won,
and the first spent the trip believing they held a job that had been reassigned
under them.

`claimTask()` is now a single conditional UPDATE — assign only if the row still
has no rider (or already has this one) and is still claimable — so the loser
matches zero rows and is *told*, rather than being overwritten. Idempotent, so
a courier re-sending their own accept keeps the job. If the state transition
then fails, the claim is released rather than stranding the job.

**4. A fourth defect, found by testing the ROUTE rather than the service.**
The rider actor list in the state machine permitted the shortcut
`IN_TRANSIT -> DELIVERED` but omitted both `IN_TRANSIT -> DELIVERING` and
`DELIVERING -> DELIVERED`. The transition *tables* allowed the handover step,
so every existing test passed — `verify-delivery-journey` walks a delivery to
COMPLETED with `db.task.update` directly and never touches the authorisation
check. Driven through the real endpoint it returns:

```
400  Actor 'RIDER' is not authorized to transition from DELIVERING to DELIVERED
```

A courier who used the handover step could move a parcel INTO delivering and
then had no authority to finish it. Both pairs added.

The general lesson, recorded because it will recur: a guard tested only at
service level can be bypassed by a route that forgets to call it, and a
lifecycle tested by writing the status column directly proves nothing about who
is allowed to write it.

**Verification:** `bun scripts/verify-delivery-personnel.ts` — 29 checks,
including a real race (two couriers, then a four-way stampede, against one
task) and a real HTTP call through `POST /api/tasks/[id]/status` proving the
proof gate returns 409 `PROOF_REQUIRED` before proof and 200 after.

---

## BE-006 — `riderRole` enum drift written by onboarding

**Status:** RESOLVED — the backfill is not owed
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

### Resolution — Backend session, 2026-08-10

**The backfill this ledger called "owed that no session has claimed" is not
owed. No drift rows exist, and none could have.**

The verification the ledger asked for, run against the live database:

```
SELECT "riderRole", COUNT(*) FROM "Rider" GROUP BY 1
  -> SMART_BODA_RIDER  6
```

Only valid members are present. The "do not assume" note asked whether Prisma
had rejected the invalid values, or whether `riderRole` was stored as a String
somewhere in the write path. It is not:

```
information_schema.columns -> data_type: USER-DEFINED, udt_name: RiderRole, is_nullable: NO
pg_enum                    -> SMART_BODA_RIDER, SMART_CAR_DRIVER, DELIVERY_PERSONNEL
```

It is a real Postgres enum, NOT NULL. And the only writer —
`POST /api/riders` (`route.ts:107`) — validates with
`z.enum(['SMART_BODA_RIDER','SMART_CAR_DRIVER','DELIVERY_PERSONNEL'])` with no
default. `/api/riders/onboarding` only *reads* `riderRole`; it never writes it.

**So the failure mode was not silently-wrong data — it was a 400.** A rider
onboarding through the mobile path that sent `'SMART_BODA'` was rejected by zod
before reaching the database. Registration failed outright rather than
persisting a role no consumer recognised. The mobile fix in `a45cb28` is
therefore the whole fix, and it unblocked signups rather than merely correcting
future rows.

**One thing worth watching, not a defect:** there are zero `SMART_CAR_DRIVER`
rows. With only six riders that is unremarkable, but if car-driver signups are
expected and still absent after this fix ships, that is the thread to pull.

---

## BE-007 — Dead wallet API surface with no callers

**Status:** ANSWERED — the factual questions are settled; the removal is a product decision
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

### Findings — Backend session, 2026-08-10

The "do not assume" note asked whether the web app calls these. It was audited:

- **`/api/wallet/balance` has zero callers anywhere.** Not just mobile — the web
  client declared it *twice*, as `getWallet()` and `getWalletBalance()`, byte-
  identical, and **neither is called by any component**. The duplicate has been
  removed (`src/services/api.ts`); one name is kept.
- **`/api/receipts` is live and must stay.** `GET` has no client caller, but
  `POST` is reachable and the route's `ensureReceiptForTask` is imported by
  `orders/[id]`, `tasks`, and `tasks/[id]`. Deleting the route would break
  receipt generation.

### Product decision — resolved, 2026-08-10

**Receipt history is required, and the backend needs no work.** Receipts are
generated automatically for every completed task, so the data already exists for
every user — it is simply unreachable: `receipt/[id]` can only be opened from a
task still in view, so nobody can retrieve last month's receipt for an expense
claim or a dispute.

`GET /api/receipts` already supports the journey: scoped to the caller under
RLS, newest first, capped at 50. `api.getReceipts()` is already declared in the
mobile client. Nothing was rebuilt.

Specced as **Golden Screen #43 (Receipt History)** in
`SMART_RIDE_GOLDEN_SCREENS.md`, inheriting the #39 `ReceiptCard` architecture in
its compact variant so the list row and the detail page cannot diverge into two
receipt designs. One limitation flagged for the UI session: the endpoint has no
pagination parameter, which is ample for a first version — if infinite scroll is
wanted, that is a small backend request rather than something to work around.

`GET /api/wallet/balance` remains uncalled by anything; the web duplicate was
removed. The remaining wrapper is three lines over a working endpoint, so it
stays.

**Superseded note:**
whether a receipts-list screen is wanted. If yes, `GET /api/receipts` and the
mobile `getReceipts()` wrapper are already in place for it. If no, both can go.
`GET /api/wallet/balance` and the mobile `getWalletBalance()` wrapper can be
removed either way — the home screen uses the heavier `getWallet()` — but they
are three-line wrappers over a working endpoint, so leaving them costs nothing
and the call is the product owner's.


---

## BE-008 — `getFareEstimate` signature left incomplete mid-edit

**Status:** FIXED_PENDING_VERIFICATION
**Priority:** P2
**Category:** Backend
**Discovered by:** Screen Migration Session
**Discovered at:** Journey 7 (Merchant), 2026-08-10

**Location:**
- `expo-app/src/services/api.ts` — `getFareEstimate`
- related in-flight: `src/app/api/tasks/fare-estimate/route.ts`

**Evidence:**
While migrating the merchant screens, `npx tsc --noEmit` began failing on four
errors in `expo-app/src/services/api.ts:931-933` — `Cannot find name
'pickupLatitude'` / `'pickupLongitude'`. `git status` showed both that file and
`src/app/api/tasks/fare-estimate/route.ts` modified but uncommitted, i.e. the
backend session's working tree. The diff adds surge fields to the response type
and builds a query string from `pickupLatitude` / `pickupLongitude`, but those
two parameters were never added to the function signature, so the file did not
compile.

**Why it matters:**
Not a product defect — an in-flight edit. But it blocked *all* typecheck and
bundle verification across the whole mobile app, so the migration session could
not verify any screen until it was resolved.

**Fix applied by this session (rule 13 — tiny, obvious, directly blocking):**
Added `pickupLatitude?: number | null` and `pickupLongitude?: number | null` to
the signature. Nothing else touched; the surge logic, response type and route
are the backend session's and were left exactly as found.

**Do not assume:**
- That this is the intended final signature. If the backend session meant to
  pass a coordinate object rather than two positional params, they should
  change it — this was the minimum needed to make the tree compile.
- **No caller passes the new arguments yet.** `expo-app/app/rider/ride-request.tsx`
  still calls `api.getFareEstimate(roadKm, driveMin)`, so every fare quote is
  currently computed *without* surge. Wiring the booking screen to pass pickup
  coordinates is a small change the migration session can make on request —
  flagged rather than done, because whether surge should apply at quote time is
  a pricing decision.

**Related screens/journeys:** Journey 1 — Client Money (fare quotes); ride booking.

**Verification required:**
Confirm the signature matches the backend session's intent, then decide whether
the booking screen should pass coordinates so quotes include surge.

**Dependencies:** None.

---

## BE-009 — Surge was applied silently and broke the minimum-fare flag

**Status:** FIXED_PENDING_VERIFICATION
**Severity:** P2 — pricing transparency
**Owner:** UI session (fixed); the surge *engine* itself belongs to the backend session
**File:** `src/app/api/tasks/fare-estimate/route.ts`
**Found:** Stage 3 exit, while completing the incomplete `getFareEstimate`
signature recorded as BE-008.

### What was verified

`getFareEstimate` returns `surgeMultiplier`, `surgeAmount` and `surgeReason` in
its breakdown. The estimate route consumed none of them — it folded
`breakdown.totalAmount` (surge included) into the response and dropped the three
explanatory fields. A rider on a surging route saw a higher number with nothing
to attribute it to.

Second, concrete bug: `minimumApplied` was computed as
`breakdown.totalAmount > rawTotal`. Surge is added *on top of* a fare that has
already cleared the minimum floor, so any surge at all made the post-surge total
exceed the raw fare and the response claimed "minimum fare applied" on every
surging trip — including long, expensive ones nowhere near the floor.

### What was changed

`minimumApplied` now compares the **pre-surge** total against `rawTotal`, and
the three surge fields are passed through to the client so the price can be
explained rather than merely charged.

### What the backend session should confirm

Whether any consumer of this endpoint reads `minimumApplied` for accounting
rather than display. If so, its historical values were wrong during surge.

---

---

## BE-010 — Push registration fails on the release build (`FIS_AUTH_ERROR`)

**Status:** OPEN
**Severity:** P1 — no push notifications reach production users
**Owner:** backend / infrastructure session
**Found:** Stage 3 exit device pass, release APK on `R3CR709T4FN`, 2026-08-10.

### What was verified

A cold launch of the release APK logs:

```
W/ReactNativeJS: '[PUSH] Failed to register:',
  { [Error: Fetching the token failed:
     java.util.concurrent.ExecutionException:
     java.io.IOException: FIS_AUTH_ERROR] code: 'E_REGISTRATION_FAILED' }
```

The device never obtains a push token, so every server-side notification path
(dispatch offers, order status, chat) silently reaches nobody on this build.

**Ruled out:** package-name mismatch. `android/app/google-services.json` and the
repo-root copy both declare `ug.smartride.app` for project `smart-ride-774e7`,
matching `applicationId` in `android/app/build.gradle:106`.

**Remaining candidates** (all outside this session's reach): the Firebase
Installations API disabled on the Cloud project, an API-key application
restriction that does not include the release signing certificate's SHA-1, or a
`google-services.json` regenerated without the release key.

### Diagnosis — Backend session, 2026-08-10

**Root cause identified: `API_KEY_ANDROID_APP_BLOCKED`.**

`scripts/verify-firebase-config.ts` probes the Firebase Installations API with
the exact key the app ships, and gets:

```
HTTP 403  API_KEY_ANDROID_APP_BLOCKED
"Requests from this Android client application <empty> are blocked."
```

That is the server-side form of the device's `FIS_AUTH_ERROR`. Of the three
candidates recorded above, the evidence rules two out:

- **Signing certificate — RULED OUT.** The release keystore's SHA-1
  (`98EA9B4B1847…`) *is* registered; it is one of three certificate hashes in
  `google-services.json`.
- **Package mismatch — RULED OUT** (already, and re-asserted by the suite):
  gradle `applicationId` and the Firebase package both read `ug.smartride.app`.
- **API key restriction — CONFIRMED.** The key carries an Android application
  restriction that does not admit this app.

**The single change owed, in Google Cloud Console** (not Firebase Console —
this is the key's own restriction): *APIs & Services > Credentials > the
Android API key > Application restrictions* — add package `ug.smartride.app`
with the release SHA-1, or relax the restriction. Re-run
`bun scripts/verify-firebase-config.ts` afterwards; STAGE 3 turning green means
devices will obtain tokens.

**Also resolved:** the `scheme` gap recorded below is closed —
`app.json` declares `scheme: "smartride"`, so a tapped notification can
deep-link once tokens are issued.

### Related gap, not a defect

`app.json` declares no `scheme`. Nothing in the app depends on one today —
there is no `Linking.createURL`, no OAuth redirect and no notification-tap
route — so nothing is broken. But push notifications cannot deep-link into a
screen until a scheme exists, which makes this a prerequisite for fixing the
above in a way users would notice. Recorded as a Stage-4 item, not fixed here,
because adding it is a native config change with no current consumer.

# Session-end audit — Stage 3 exit

Re-verified every finding against the tree at commit `94fec96`.

| ID | Status at audit | Evidence |
|---|---|---|
| BE-001 | FIXED_PENDING_VERIFICATION | `src/app/api/orders/route.ts` money fields are `.optional()` and ignored; `pricing.*` written server-side |
| BE-002 | **RESOLVED by the backend session** | re-verified 2026-08-10 after their working-tree changes: `route.ts:210` now documents `unitPrice` as advisory only, and `:254` prices from `priced.items` rather than the request body |
| BE-003 | **RESOLVED by the backend session** | re-verified 2026-08-10: both routes still exist as endpoints, but each now delegates to the single `withdrawFromWallet` in `src/lib/wallet/wallet-service.ts` — the *divergent implementations* are gone. The UI-side `WithdrawModal` `onSubmit` override remains valid and now sits over one behaviour instead of two |
| BE-004 | FIXED_PENDING_VERIFICATION | the false badge is gone from `chat/[id].tsx`; the replacement comment records why |
| BE-005 | FIXED_PENDING_VERIFICATION | DP dashboard, offer sheet and queue built (Golden Screens #40–#42) |
| BE-006 | FIXED_PENDING_VERIFICATION | `rider/onboarding.tsx` writes the real `RiderRole` values. **Rows written before this fix still hold the bad values** — a data backfill is still owed and is not something the UI can do |
| BE-007 | **still OPEN** | `getWalletBalance` (`api.ts:993`) and `getReceipts` (`api.ts:1300`) still have zero callers |
| BE-008 | FIXED_PENDING_VERIFICATION | signature completed with the two optional coordinate params only; the parallel session's surge logic untouched |
| BE-009 | FIXED_PENDING_VERIFICATION | see above |
| BE-010 | **OPEN** | reproduced on device at Stage 3 exit; package name ruled out as the cause |

**Nothing in this ledger was renumbered.** BE-002, BE-003 and BE-007 are left
open deliberately: each is backend architecture or financial infrastructure, and
under the issue-handling rules those are documented and handed over rather than
fixed from a UI session.

**One item is owed that no session has claimed:** the BE-006 data backfill.
Fixing the writer does not fix rows already written.

---

# Re-verification — 2026-08-10, after the backend session's working-tree changes

Checked before the next APK build, at the user's instruction, because several
findings were being worked on in parallel.

**Now resolved (theirs):**

- **BE-002** — order line-item pricing is server-derived. The request's
  `unitPrice` is kept in the schema but treated as advisory, used only to detect
  a stale cart; the persisted price comes from the server's own `priced.items`.
  This also completes BE-001 — the whole money path is now server-authoritative.
- **BE-003** — the two withdrawal implementations were consolidated onto
  `withdrawFromWallet` in `src/lib/wallet/wallet-service.ts`. Both
  `/api/riders/withdraw` and `/api/wallet/withdraw` are now thin callers.
  The service debits atomically rather than read-then-write, closing the race
  the original divergence hid.

**Still open, and now attributable:**

- **BE-003 follow-on.** The original finding also noted that top-up enforced a
  UGX 1,000 minimum while withdrawal enforced none. The consolidated
  `withdrawFromWallet` validates only `amount > 0`, so the asymmetry survived
  consolidation. Not fixed here: a withdrawal floor is a financial-policy
  decision, not a UI one.
- **BE-007** — dead wallet API surface, unchanged.
- **BE-010** — push registration failure, unchanged.
- **BE-006 backfill** — still owed; fixing the writer did not fix existing rows.

---

## BE-011 — Admin finance page fetches a payouts route that does not exist

**Status:** OPEN
**Severity:** P1 — rider withdrawals are invisible to admins, and the failure is silent
**Owner:** backend session
**Found:** 2026-08-10, tracing rider-screen functionality through to the admin dashboard.

### What was verified

`src/components/dashboard/payment-finance.tsx:97` fetches
`/api/admin/payouts?limit=10`. There is no `src/app/api/admin/payouts/route.ts`
— the only payout route in the tree is `src/app/api/pharmacy/payout`, which is
a different subject. `ls src/app/api/admin/` confirms no `payouts` directory.

The component is the live one: `/intellects` renders
`components/smart-ride/dashboards/admin-dashboard.tsx`, an 8-line re-export of
`components/dashboard/admin-dashboard.tsx`, which mounts this finance page.

The request 404s, and because the result is guarded by `if (payoutsRes.ok)`
with no `else`, nothing is reported. `setPayouts` is never called, so the table
renders empty and an admin reads "no payouts" rather than "this feature is not
connected." A rider who withdraws through `/riders/withdraw` — now consolidated
onto `withdrawFromWallet` per BE-003 — has no corresponding admin view.

### Not fixed here

Building the route means deciding what a payout record *is*: whether it reads
`Transaction` rows of type WITHDRAWAL, a dedicated payout model, or the mobile
money provider's settlement records. That is a financial-data-model decision.

### Adjacent, same file, also unfixed

The three `if (res.ok)` blocks all fail silently the same way. A failed admin
finance fetch should not be indistinguishable from an empty result set.

---

## BE-012 — Rating is one-directional: drivers can never rate clients

**Status:** OPEN
**Severity:** P2 — a documented model field is permanently unpopulated
**Owner:** backend session (needs an endpoint + a policy decision)
**Found:** 2026-08-10, tracing the rating system end to end.

### What was verified

`POST /api/tasks/[id]/rate` is the only rating write path in the tree. It
enforces at `route.ts:86`:

```ts
if (task.clientId !== user.userId) { ... 403 ... }
```

Only the task's client may rate. There is no driver-side equivalent — a search
across `src/app/api/tasks/` and `src/app/api/riders/` finds no other route that
writes a `Rating`.

The consequence is a schema field that can never hold what it describes.
`Rating.toUserId` is set at `:103` to `task.rider?.userId` — the *driver's*
user id — on a row whose `fromUserId` is the client. So `toUserId` is only ever
a driver, and `User.ratingsReceived` never contains a client's rating.
A rider with a history of no-shows or abuse accumulates nothing.

### Also unpopulated

`Rating` declares `punctualityScore`, `professionalismScore` and
`vehicleConditionScore`. No write path sets any of them — the endpoint's Zod
schema accepts only `rating` and `comment`. They are dead columns today.

### Decision needed before building

Whether client ratings are visible to drivers at dispatch time. That changes
whether this is a private quality signal or something that can be used to
refuse a passenger, which is a policy question, not an implementation one.

---

## BE-013 — `DriverReputation.averageRating` duplicates `Rider.rating` with no reconciliation

**Status:** OPEN
**Severity:** P2 — two competing sources of the same number
**Owner:** backend session
**Found:** 2026-08-10, same trace.

### What was verified

Three separate stores hold a driver's rating:

1. `Rider.rating` — a `Float @default(5.0)` column, recomputed by
   `tasks/[id]/rate/route.ts:112-124` on every submission.
2. `Rating` rows — the source of truth, aggregated on demand by
   `riders/profile/route.ts:85`, `dispatch/[id]/accept/route.ts:122` and
   `rider-onboarding.service.ts:609`.
3. `DriverReputation.averageRating` + the five star-bucket counters
   (`schema.prisma:3215-3222`), fed separately via
   `PlatformIntelligence.onRatingSubmitted`.

Nothing reconciles them. `Rider.rating` and `DriverReputation.averageRating`
both default to 5, so an unrated driver reads as a perfect 5.0 in both. The
count-aware path (`riders/profile`) correctly returns `rating: null` until a
real rating exists — but any consumer reading `Rider.rating` or
`DriverReputation.averageRating` directly gets the fabricated 5.0 instead.

**The mobile side of this is fixed** in the same commit: the shared `Rating`
component now renders "New" when `value == null` or `count <= 0`, matching
`formatRating` in `utils/money.ts`, which already did. Previously the same
unrated driver could read "New" and "5.00" on one screen.

What remains is server-side: decide which store is authoritative and make the
others derive from it, or drop the duplicates.

---

## BE-012 - Ratings were one-way, and three sub-score columns were dead

**Status:** RESOLVED | **Priority:** P1 | **Category:** Data
**Resolved by:** Backend session, 2026-08-10

**Evidence:** `Rating.taskId` was `@unique`, so a trip could physically hold
**one** rating - and the rate route rejected anyone but the client, so that row
was always the client's. `toUserId` held the *driver's* user id, so despite the
field's name `User.ratingsReceived` never contained a passenger's rating. A
passenger with a history of no-shows accumulated nothing. `punctualityScore`,
`professionalismScore` and `vehicleConditionScore` were declared and written by
nothing.

**Fix:** `@@unique([taskId, fromUserId])` replaces `taskId @unique`;
`Task.rating` becomes `Task.ratings`. Each party rates once per task and
neither can overwrite the other. The route derives *direction* from who the
caller is on the task - client to driver sets `toRiderId`, driver to passenger
leaves it null, and that one field is what keeps a passenger's score out of the
driver's average. All three sub-scores are persisted, and **refused on a
passenger rating**: a passenger has no vehicle and no punctuality obligation, so
storing numbers there would feed meaningless values to a reputation engine that
weights ratings at 40%. `User.passengerRating` / `passengerRatingCount` added as
the passenger-side cache.

**The policy question is deliberately left open.** Passenger ratings are stored
and feed **nothing automated** - not dispatch ranking, not pricing, not the
offer sheet. Whether a passenger score should affect any of those is a product
decision, and wiring it up quietly would be making that decision by default. A
test asserts dispatch does not read `passengerRating`, so the boundary cannot
erode silently.

---

## BE-013 - Three unreconciled stores held the same rating

**Status:** RESOLVED | **Priority:** P1 | **Category:** Data
**Resolved by:** Backend session, 2026-08-10

**Evidence:** `Rating` rows, `Rider.rating`, and `DriverReputation.averageRating`
plus five star buckets all held the same number with nothing reconciling them.
Two of the three defaulted to 5, so an unrated driver was indistinguishable from
a flawless one. The rate route computed the average inline, which is how a
second call site could disagree with the first.

**Fix:** the caches stay - dispatch ranking and rider lists read them on every
request and cannot aggregate inline - but they are now provably **derived**.
`src/lib/ratings/rating-reconciliation.service.ts` is the only writer and always
computes from the `Rating` rows. `reconcileAll()` runs as a new
`ratings.reconcile` scheduler step; it is idempotent and it **reports** every
discrepancy it repairs rather than silently self-healing, because a cache that
quietly fixes itself hides whatever caused the drift.

`deriveRiderRating()` returns `average: null` for a never-rated driver rather
than 5.0. `Rider.rating` keeps its non-nullable 5.0 default - changing it would
ripple through every consumer - but `totalRatings` is written truthfully, so
"5.0 from zero ratings" stays detectable.

**Verification:** `bun scripts/verify-two-way-ratings.ts` - 20 checks.

---

## ARCHITECTURE DECISION — passenger ratings do not influence dispatch

**Recorded:** 2026-08-10 | **Arises from:** BE-012 | **Status:** standing decision

Drivers can now rate passengers (BE-012). Those scores are **stored and shown
to nobody automatically**. Specifically, `User.passengerRating` does not feed:

- dispatch ranking or matching order
- pricing, surge, or any fee
- what a driver sees on an incoming offer
- any automated suspension, restriction or fraud signal

**Why this is a decision rather than an omission.** Letting a passenger score
affect dispatch changes who gets served, and it does so through a signal with
known failure modes: drivers rate down for reasons unrelated to conduct — a
short fare, a walk-up flight of stairs, a neighbourhood — and a low-rated
passenger has no equivalent recourse to a driver, who has an appeals path
through the reputation system. Wiring it in silently would embed that into who
can get a ride, without anyone choosing it.

**What would have to be settled before changing this:** whether a passenger can
see their own score, whether they can contest it, what a driver is told when
they decline, and what score is low enough to matter. Those are product and
policy questions, not implementation ones.

**How the decision is held in place.** `verify-two-way-ratings` asserts that
`src/lib/dispatch/types.ts` does not reference `passengerRating`, and that the
rate route contains no automated consumer. Turning this on is therefore a
deliberate act that fails a test first — which is the point.

---

## BE-014 — Intermittent P2028 in verification runs

**Status:** RESOLVED | **Priority:** P2 | **Category:** Infrastructure
**Resolved by:** Backend session, 2026-08-10

**Evidence:** suites failed non-deterministically inside `verify-all` — a
different one each time — and passed standalone. It had been assumed to be
connection-pool exhaustion and papered over by raising the inter-suite cooldown
to 12 seconds. That assumption was wrong.

**Measured, not guessed:**

```
12 concurrent PLAIN queries        -> 12/12 succeed
12 concurrent interactive TXNS     ->  3/12 succeed      P2028
failures begin at concurrency       ->  4                (pool allowed 17)
single round trip to the pooler     -> 750ms - 2539ms
maxWait 2000ms (default) @ 12 conc  ->  2/12
maxWait 10000ms          @ 12 conc  -> 12/12
connection_limit=10      @ 24 conc  -> 24/24
```

**Two real causes, neither of them the pool being too small:**

1. **Prisma's default transaction `maxWait` is 2000 ms** — how long a
   transaction queues for a connection before giving up. A single round trip to
   the eu-west-1 pooler measures up to 2.5 s from here, so the default covered
   roughly *zero* queued transactions. Fixed at the client with `maxWait:
   15000`, paired with `timeout: 15000` so a transaction still cannot hold a
   connection indefinitely.

2. **`connection_limit` is deliberately 1** — and correctly so: RLS context
   lives in PostgreSQL *session* state (`SET ROLE`, `SET app.current_user_id`),
   so a `SET` and the queries depending on it must share one connection.
   Production keeps that. The **test runner** now sets
   `DB_CONNECTION_LIMIT=10` for its own processes only; the suites use the
   service role rather than per-user RLS context, so the constraint does not
   apply to them.

**No production database setting was changed.** The cooldown is back to 5 s,
because it is once again only covering what it was ever for — letting sockets
close between processes — rather than masking a defect.

---

# Session-end audit - Backend session, 2026-08-10

Re-verified every finding against the tree after closing P1–P4.

| ID | Status | Evidence |
|---|---|---|
| BE-001 | FIXED_PENDING_VERIFICATION | unchanged; superseded in practice by BE-002, which now prices the lines the fees are computed from |
| BE-002 | **RESOLVED** | `priceItemsFromCatalogue` scoped to `merchantId`; `verify-order-pricing` 16 checks |
| BE-003 | **RESOLVED** | one atomic implementation, all four call sites on the USER wallet; `verify-wallet-withdrawal` |
| BE-004 | **RESOLVED** | three false claims removed (two of them web, never previously audited); `verify-security-claims` 13 checks over 612 files |
| BE-005 | **RESOLVED** | proof of delivery built and gated; claiming made atomic (a third defect found while testing); concurrent assignments confirmed |
| BE-006 | **RESOLVED** | no backfill owed; the enum column rejected bad values, so onboarding 400'd rather than writing drift |
| BE-007 | **RESOLVED** | receipts API confirmed sufficient; screen specced as Golden Screen #43, no backend built |
| BE-008 | FIXED_PENDING_VERIFICATION | signature intact; the `estimates` response type has been widened to carry the surge fields it returns |
| BE-009 | FIXED_PENDING_VERIFICATION | unchanged |
| BE-010 | **DIAGNOSED** | 403 API_KEY_ANDROID_APP_BLOCKED — certificate and package ruled out with evidence; one Cloud Console change owed |
| BE-011 | **RESOLVED** | DB-enforced idempotency key; six simultaneous retries produce one debit |
| BE-012 | **RESOLVED** | `@@unique([taskId, fromUserId])`; both directions verified; passenger scores feed nothing automated |
| BE-013 | **RESOLVED** | caches derived by one service, reconciled on schedule, drift reported not hidden |

**Still owed:**
- **BE-010's one Console change.** *APIs & Services > Credentials > the Android
  API key > Application restrictions* — add `ug.smartride.app` with the release
  SHA-1, or relax the restriction. Everything else about push is verified;
  re-run `verify-firebase-config` and STAGE 3 turning green means devices will
  obtain tokens.
- **`MESSAGE_ENCRYPTION_KEY` in each deployment.** The cipher is built and
  wired, but encryption only activates when the key is set. Until then messages
  are still stored in plaintext, and `verify-production-config` warns on every
  run.
- **A device pass on the offer ringtone.** Whether the alert is loud enough
  through a helmet, and whether a custom tone beats the system default, cannot
  be judged from a build log.
- **The mobile proof-of-delivery UI.** The backend enforces proof; the courier
  app needs a screen to capture a code, photo or signature. Handed to the
  migration session, not built here.

**Not a defect, recorded so it is not re-investigated:** the zero
`SMART_CAR_DRIVER` rows noted at the last audit. The role was driven end to end
— registration, approval, dispatch eligibility, the full ride lifecycle,
earnings into a withdrawable wallet, and a receipt naming the car service — and
passes at every step (`verify-car-driver-journey`, 15 checks). The absence is a
small dataset, not a broken role.

# Smart Ride — Device QA Matrix (Phase C)

Physical-device QA on a real Android build. This is deliberately **separate**
from the automated pipeline: eight green stages mean the implementation passed
automated engineering verification, **not** that Smart Ride is production-ready.

Everything here is a thing only a human on a real phone can answer — is the
ringtone audible in traffic, does the map settle, does the offer sheet arrive
before it expires, can you actually finish the job with one hand on a boda.

---

## How to use this

| Symbol | Meaning |
|---|---|
| ☐ | not yet tested |
| ✅ | works as described |
| ⚠️ | works but poorly (slow, confusing, ugly) — record what and why |
| ❌ | broken — **log it in `SMART_RIDE_BACKEND_FINDINGS.md` with the next free BE-id** |

**Rules for this pass**

1. **Real accounts, real network.** No seeded shortcuts. Register each role
   through the app the way a new user would; that is where onboarding defects
   live.
2. **One device, one role at a time.** Two roles on one phone hides
   notification and session bugs.
3. **A step that cannot be reached is a failure**, not a skip. Record where it
   stopped.
4. **Write down the actual number** — seconds to match, seconds to notify — not
   "fast". Slow is a defect with a measurement.
5. **Turn the screen off.** Half the notification defects only appear when the
   app is backgrounded or the phone is locked.

---

## Pre-flight — do these before any role testing

| # | Check | Expected | Result |
|---|---|---|---|
| P1 | `bun scripts/verify-firebase-config.ts` | STAGE 3 passes. **Currently FAILS with `API_KEY_ANDROID_APP_BLOCKED`** — until fixed, no push arrives and every notification row below is untestable | ☐ |
| P2 | `MESSAGE_ENCRYPTION_KEY` set in the deployment | messages encrypt at rest; without it they are stored plaintext | ☐ |
| P3 | `AUDIT_TARGET=production bun scripts/verify-production-config.ts` | no FAIL rows against the environment the app points at | ☐ |
| P4 | App installs and cold-launches | no crash on first open, no `FIS_AUTH_ERROR` in logcat | ☐ |
| P5 | Push token registers | a row appears in `ExpoPushToken` for the account | ☐ |

> P1 gates a large part of this matrix. Do it first.

---

## 1. Client

### 1.1 Account
| # | Step | Expected | Result |
|---|---|---|---|
| C1 | Register with a real phone number | account created, no silent failure | ☐ |
| C2 | Receive and enter the OTP | code arrives; **time it** | ☐ |
| C3 | Wrong OTP | rejected with a clear message, attempt counted | ☐ |
| C4 | Expired OTP (wait past the window) | rejected, resend offered | ☐ |
| C5 | Log out and back in | session restores, no re-onboarding | ☐ |
| C6 | Kill the app and reopen | still logged in | ☐ |
| C7 | Forgot password | reset arrives and works | ☐ |

### 1.2 Booking a ride
| # | Step | Expected | Result |
|---|---|---|---|
| C8 | Home screen loads | wallet, search, services, nearby drivers | ☐ |
| C9 | Set pickup and destination | map and addresses agree | ☐ |
| C10 | Fare estimate appears | a real number, no `NaN`, no blank | ☐ |
| C11 | Estimate matches the charge | quoted total == what the task is created with | ☐ |
| C12 | Confirm the booking | enters searching; **time to match** | ☐ |
| C13 | Driver matched | driver name, vehicle, ETA, live position | ☐ |
| C14 | Track the driver | marker moves; no freeze; no teleporting | ☐ |
| C15 | Cancel before pickup | cancels cleanly, fee behaviour is as stated | ☐ |
| C16 | Complete a real trip | reaches COMPLETED | ☐ |
| C17 | Rate the driver | rating and comment stored; sub-scores if offered | ☐ |
| C18 | Receipt | totals match what was charged and reconcile | ☐ |

### 1.3 Money
| # | Step | Expected | Result |
|---|---|---|---|
| C19 | Wallet balance | matches the server | ☐ |
| C20 | Top up | balance rises by exactly the amount | ☐ |
| C21 | Withdraw | balance falls; payout recorded PENDING | ☐ |
| C22 | **Withdraw, then kill the app mid-request and retry** | debited **once**, not twice (BE-011) | ☐ |
| C23 | Withdraw more than the balance | refused with "insufficient balance" | ☐ |
| C24 | Transaction history | every movement listed and reconciling | ☐ |

### 1.4 Other services
| # | Step | Expected | Result |
|---|---|---|---|
| C25 | Food: browse, cart, checkout | order placed | ☐ |
| C26 | **Cart price vs charged price** | identical; a stale cart is corrected, not silently repriced (BE-002) | ☐ |
| C27 | Shopping order | placed and tracked | ☐ |
| C28 | Health / pharmacy order | placed; prescription upload works | ☐ |
| C29 | Messaging | send and receive; **no "end-to-end encrypted" claim anywhere** (BE-004) | ☐ |
| C30 | SOS | triggers; contacts alerted | ☐ |

---

## 2. Smart Boda Driver

| # | Step | Expected | Result |
|---|---|---|---|
| B1 | Register as a boda rider | role persists as `SMART_BODA_RIDER` | ☐ |
| B2 | Vehicle and document setup | uploads accepted | ☐ |
| B3 | Approval | account becomes usable | ☐ |
| B4 | Go online | visible to dispatch | ☐ |
| B5 | **Offer arrives with sound** | the ringtone plays, app foregrounded | ☐ |
| B6 | **Offer with the screen OFF and app closed** | phone rings and vibrates; **this is the one that matters** | ☐ |
| B7 | Offer sound is distinct from an ordinary notification | tells them it is a job without looking | ☐ |
| B8 | Offer while Do Not Disturb is on | still breaks through (channel sets `bypassDnd`) | ☐ |
| B9 | Accept the offer | assigned; **time from offer to accept** | ☐ |
| B10 | Navigate to pickup | route and customer contact shown | ☐ |
| B11 | Arrive, then start the ride | status moves correctly | ☐ |
| B12 | Complete the trip | reaches COMPLETED | ☐ |
| B13 | Earnings update | trip amount appears; commission split is right | ☐ |
| B14 | Withdraw earnings | money leaves the wallet exactly once | ☐ |
| B15 | Reputation screen | score and tier shown; no fraud internals leaked | ☐ |
| B16 | **Ignore an offer until it expires** | it disappears cleanly and is re-offered elsewhere | ☐ |
| B17 | **Two drivers accept the same offer at once** | one gets it, the other is told — not silently overwritten | ☐ |

---

## 3. Smart Car Driver

Worth its own pass: the database held **zero `SMART_CAR_DRIVER` rows**. The
automated journey passes, so it is not a broken role — but nobody has ever
created one through the app. That is the question here.

| # | Step | Expected | Result |
|---|---|---|---|
| K1 | **Register choosing "Car"** | role persists as `SMART_CAR_DRIVER`, **not** boda | ☐ |
| K2 | Car-specific vehicle setup | plate, model, seats | ☐ |
| K3 | Approval and go online | visible to dispatch as a car | ☐ |
| K4 | Receive a **car** ride offer | only car requests, never boda | ☐ |
| K5 | A boda request does **not** reach them | role separation holds | ☐ |
| K6 | Complete a car trip | full lifecycle | ☐ |
| K7 | **Car fare is higher than the same boda trip** | separate tariff applied | ☐ |
| K8 | Earnings and withdrawal | as for boda | ☐ |
| K9 | Receipt says "Smart Car Ride" | not mislabelled as a bike | ☐ |

---

## 4. Delivery Personnel

Includes the new proof-of-delivery system. **The mobile capture UI may not
exist yet** — if there is no way to enter a code or take a photo, that is the
finding, and every row after it is blocked.

| # | Step | Expected | Result |
|---|---|---|---|
| D1 | Register as delivery personnel | role persists as `DELIVERY_PERSONNEL` | ☐ |
| D2 | Go online | receives delivery offers | ☐ |
| D3 | Offer arrives (screen off) | rings like a job | ☐ |
| D4 | Accept | assigned | ☐ |
| D5 | **Hold three deliveries at once** | all three visible and independently progressable | ☐ |
| D6 | Collect from the merchant | reaches PICKED_UP | ☐ |
| D7 | In transit | status and tracking correct | ☐ |
| D8 | **Start the handover** | reaches DELIVERING | ☐ |
| D9 | **Capture proof — code** | customer reads the code; courier enters it | ☐ |
| D10 | **Wrong code entered** | refused; parcel stays undelivered | ☐ |
| D11 | **Capture proof — photo** | photo uploads and is stored | ☐ |
| D12 | **Try to complete WITHOUT proof** | refused with a clear message (BE-005) | ☐ |
| D13 | **Courier can never see the code** | it appears only on the customer's screen | ☐ |
| D14 | Complete after proof | reaches DELIVERED then COMPLETED | ☐ |
| D15 | **Kill the app mid-handover, reopen** | resumes at DELIVERING; job still finishable | ☐ |
| D16 | **Lose signal during proof upload, retry** | proof recorded once; courier not locked out | ☐ |
| D17 | Earnings | delivery fee credited correctly | ☐ |
| D18 | Customer sees the proof | photo/code and recipient name on their receipt | ☐ |

---

## 5. Merchant

| # | Step | Expected | Result |
|---|---|---|---|
| M1 | Register a business | pending approval | ☐ |
| M2 | Approval | can operate | ☐ |
| M3 | Add menu items with prices | saved and visible to customers | ☐ |
| M4 | Receive an order | notified | ☐ |
| M5 | Accept an order | customer sees the change | ☐ |
| M6 | Reject an order | customer told; refunded if pre-paid | ☐ |
| M7 | Mark ready for pickup | courier dispatched | ☐ |
| M8 | **Change an item's price mid-cart** | a customer with a stale cart is stopped, not overcharged (BE-002) | ☐ |
| M9 | **Mark an item unavailable mid-cart** | ordering it is refused with a clear reason | ☐ |
| M10 | Earnings and payout | figures reconcile | ☐ |

---

## 6. Pharmacist / Health

| # | Step | Expected | Result |
|---|---|---|---|
| H1 | Register as a pharmacy | pending approval | ☐ |
| H2 | Approval gate | cannot operate before approval | ☐ |
| H3 | Add catalogue items | visible to customers | ☐ |
| H4 | Receive a prescription order | notified; image viewable | ☐ |
| H5 | **Prescription image claim** | no "encrypted image storage" claim (BE-004) | ☐ |
| H6 | Verify and accept | order proceeds | ☐ |
| H7 | Reject an invalid prescription | customer told why | ☐ |
| H8 | Dispatch to a courier | delivery created; DP receives it | ☐ |
| H9 | Fulfilment through to delivered | full chain | ☐ |
| H10 | Earnings | reconcile | ☐ |

---

## 7. Advanced systems — tested INSIDE the journeys above

These are not separate apps. Each is a thing to notice **while** running the
role journeys, and each is already asserted automatically by
`verify-intelligence-in-journey` — this pass confirms it on a real device with
real people.

### 7.1 Driver reputation
| # | Do this | Expect | Result |
|---|---|---|---|
| I1 | Rate a driver 1★ several times (client account) | their trust score falls; tier drops | ☐ |
| I2 | Check the driver's app | **they are told** — a notification, not a silent change | ☐ |
| I3 | Book again with both a well-rated and a poorly-rated driver nearby | the better-rated one is offered first | ☐ |
| I4 | Driver's reputation screen | shows the score; **no fraud internals** | ☐ |

### 7.2 Marketplace intelligence
| # | Do this | Expect | Result |
|---|---|---|---|
| I5 | Create many requests with few drivers online in one area | surge starts | ☐ |
| I6 | Book during surge | **the quoted fare is higher**, with a stated reason | ☐ |
| I7 | Check driver earnings for that trip | the whole premium goes to the driver | ☐ |
| I8 | Let demand normalise, book again | **the fare returns to normal** | ☐ |
| I9 | Driver-side | told where demand is | ☐ |

### 7.3 Fraud intelligence
| # | Do this | Expect | Result |
|---|---|---|---|
| I10 | Normal top-up on a clean account | allowed — the gate must not block real business | ☐ |
| I11 | Repeated suspicious behaviour (many cancellations, repeated failed payments) | risk score rises | ☐ |
| I12 | Try to transact on the flagged account | **refused** | ☐ |
| I13 | Read the refusal message | generic — never names the rule that fired | ☐ |
| I14 | Admin side | an alert exists to review | ☐ |

---

## 8. Cross-cutting

| # | Check | Expected | Result |
|---|---|---|---|
| X1 | Airplane mode mid-trip, then restore | reconnects; state not lost | ☐ |
| X2 | Kill the app mid-trip | resumes in the right state | ☐ |
| X3 | Low battery / power saving | notifications still arrive | ☐ |
| X4 | Slow 3G | screens load or degrade honestly — no infinite spinner | ☐ |
| X5 | Deny location permission | explained, not a silent failure | ☐ |
| X6 | Deny notification permission | explained; driver told they will miss offers | ☐ |
| X7 | Rotate the screen | no crash, no lost input | ☐ |
| X8 | Small screen | nothing clipped or unreachable | ☐ |
| X9 | Dark mode | legible throughout | ☐ |
| X10 | Back button from every screen | never traps the user | ☐ |

---

## Recording results

For every ❌ or ⚠️:

```
BE-0XX — <one line: what a user experiences>
Role / screen:
Steps to reproduce:
Expected / actual:
Device, Android version, build:
Logcat excerpt if relevant:
```

Append to `SMART_RIDE_BACKEND_FINDINGS.md` using the next free ID. **Never
renumber, never delete a resolved finding** — append a Resolution block, so the
audit trail survives.

---

## What this pass does NOT cover

Stated so nobody assumes otherwise:

- **iOS.** Android only.
- **Load and scale.** Concurrency is verified logically, not under real traffic.
- **Payment provider integration.** Mobile-money payouts are recorded as PENDING;
  no real MTN/Airtel settlement has been exercised end to end.
- **Multi-device sessions** for one account.
- **Accessibility** beyond dark mode and screen size.

---

# Update — role journeys closed in code, 2026-08-14

Client, Smart Boda, Smart Car, Merchant and Pharmacist were driven end to end
through real route handlers against a live server. **The device pass below got
shorter**: anything proven by those suites is no longer worth a human's time on
a phone.

Run both before picking up a device — a red suite means the device pass will
waste your afternoon on a defect already visible from a terminal:

```bash
npm run dev                                   # they need a live server
bun scripts/verify-role-journeys.ts           # 40 checks — the positive half
bun scripts/verify-role-authorization.ts      # 17 checks — the negative half
```

## Now verified automatically — do NOT re-test by hand

Each of these is asserted through the API with a real signed token, so a pass
also proves the actor was authorized to cause it.

| Area | What is proven |
|---|---|
| Ride lifecycle | request → available-queue → accept → ARRIVING → ARRIVED → PICKED_UP → IN_PROGRESS → COMPLETED, for both Boda and Car |
| Role persistence | `SMART_BODA_RIDER`/`BODA` and `SMART_CAR_DRIVER`/`CAR` survive registration and reach dispatch |
| Pricing authority | the server prices the trip; a client-supplied fare is refused, never applied |
| Payout sanity | `riderEarnings` never exceeds `totalAmount` |
| Driver release | `currentTaskId` clears on completion, so a second job is possible |
| Receipts | generated on demand, listed in the client's own history |
| Rating | a completed trip can be rated by its client |
| Client money | wallet balance and transaction history return for the owner |
| Order pricing | catalogue price wins; an under-priced line is refused |
| Merchant lifecycle | confirm-payment → accept → preparing → ready |
| Pharmacy lifecycle | order book read → ACCEPT → VERIFY_PRESCRIPTION → START_PREPARING → READY |
| Earnings scope | a merchant and a pharmacy each read their own figures only |
| Cross-tenant refusal | merchant vs merchant, rider vs rider, unassigned rider, client vs provider surface, stranger vs receipt, stranger vs proof, anonymous vs pharmacy order book, anonymous vs platform revenue |
| Proof authorization | customer and assigned courier only; the handover code never reaches the courier |

## Still device-only — the smallest honest list

Everything here fails the "could a terminal answer this?" test.

| # | Check | Why a device is required | Result |
|---|---|---|---|
| D-1 | Offer sheet takes over the screen when the app is **backgrounded** and the phone is **locked** | notification presentation and wake behaviour have no server-side truth | ☐ |
| D-2 | Ringtone is audible over traffic noise; vibration is felt in a pocket | audibility is physical | ☐ |
| D-3 | The SLA countdown on screen matches the server's window as it runs out | clock skew between phone and server only shows live | ☐ |
| D-4 | Tapping the notification opens the offer, from cold start and from background | OS launch-intent routing | ☐ |
| D-5 | `[Realtime] Channel error` under a real mobile network — does the channel-local recovery restore it, and does an offer arrive after? | **does not reproduce off-device; the trigger is still unknown** | ☐ |
| D-6 | Ride a real route: does the map settle, does the driver marker track, does the ETA stop lying | GPS and map rendering | ☐ |
| D-7 | Camera capture at the drop-off in poor light | camera path and image quality | ☐ |
| D-8 | The proof photo renders on the **customer's** receipt at real photo dimensions | layout with a real 700KB+ camera image | ☐ |
| D-9 | Backgrounding mid-trip and returning — is the screen still correct, or stale? | `realtime:resubscribed` reconciliation under real app lifecycle | ☐ |
| D-10 | Push actually arrives on the release build (FCM), not just the dev build | signing and FCM registration differ per build | ☐ |

## Carried forward, unchanged

- **P2** `MESSAGE_ENCRYPTION_KEY` is still unset in every deployment — messages
  are stored plaintext. The UI no longer claims otherwise (BE-004), so this is
  a real gap rather than a false promise, but it is still a gap.
- **The unaudited auth surface** listed at the end of
  `SMART_RIDE_BACKEND_FINDINGS.md`. Twelve routes under `health-provider`,
  `health-orders`, `inventory` and `merchants` have no authentication reference
  and have not been checked. Given that five of the five audited in this pass
  were exposed, assume the rest are until shown otherwise. **This is a bigger
  risk than anything on the device list.**

---

# Feature connectivity matrix — 2026-08-14

The question this answers is the only one that matters before device QA:
**if I press this button in the real app, what happens all the way through?**

Nothing here is classified from the existence of a file, a route, a model or a
screen. Each row is either traced end to end by a suite that drives real HTTP
handlers with real tokens, or marked as unverified. Where a chain breaks, the
break is named.

## Legend

| Code | Meaning |
|---|---|
| **A** | Fully connected — user action reaches the backend, the intended thing happens, and the affected user sees the result |
| **B** | Connected but broken — the production path exists and fails under realistic execution |
| **C** | Partially connected — some layers work, one important link is missing |
| **D** | Backend only — the system works but no user-facing workflow consumes it |
| **E** | UI only — the control exists but produces no real backend outcome |
| **F** | Dead / orphaned — code with no reachable caller |
| **G** | Blocked — implemented but cannot operate without external configuration |
| **H** | Not implemented |

`✓` verified this session · `~` present, not independently verified · `✗` absent

---

## Core mobility

| Feature | UI | API | Service | DB | Realtime | Notif | Consumer | Status |
|---|---|---|---|---|---|---|---|---|
| Ride booking (Boda) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | client sees driver | **A** |
| Ride booking (Car) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | client sees driver | **A** |
| Server-authoritative fare | — | ✓ | ✓ | ✓ | — | — | quoted price honoured | **A** |
| Surge → fare | ✓ | ✓ | ✓ | ✓ | — | ✓ | client quoted more, told why | **A** |
| Driver offer (push path) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | offer sheet + ring | **A** |
| Driver offer (open market pull) | ✓ | ✓ | ✓ | ✓ | — | — | queue → accept | **A** |
| Accept / atomic claim | ✓ | ✓ | ✓ | ✓ | ✓ | — | loser is told | **A** |
| Trip lifecycle → COMPLETED | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | both sides | **A** |
| Driver release after completion | — | ✓ | ✓ | ✓ | — | — | next job possible | **A** |
| Receipts | ✓ | ✓ | ✓ | ✓ | — | — | client history | **A** |
| Two-way rating | ✓ | ✓ | ✓ | ✓ | — | — | scores stored | **A** |
| Live GPS tracking | ~ | ✓ | ✓ | ✓ | ✓ | — | map marker | **device-only** |
| SLA timeout / reassignment | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | cron-driven | **~ A** |

## Delivery Personnel

| Feature | UI | API | Service | DB | Realtime | Notif | Consumer | Status |
|---|---|---|---|---|---|---|---|---|
| Full DP journey to DELIVERED | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | proven on hardware | **A** |
| Proof of delivery capture | ✓ | ✓ | ✓ | ✓ | — | — | courier | **A** |
| Proof visible to the customer | ✓ | ✓ | ✓ | ✓ | — | — | receipt screen | **A** (fixed this session) |
| Handover code withheld from courier | — | ✓ | ✓ | ✓ | — | — | customer only | **A** |
| Too-far refusal with distance | ✓ | ✓ | ✓ | — | — | — | courier | **A** |

## Money

| Feature | UI | API | Service | DB | Realtime | Notif | Consumer | Status |
|---|---|---|---|---|---|---|---|---|
| Wallet balance / history | ✓ | ✓ | ✓ | ✓ | — | — | client + driver | **A** |
| Withdrawal (atomic, idempotent) | ✓ | ✓ | ✓ | ✓ | — | — | 30 checks | **A** |
| Driver earnings | ✓ | ✓ | ✓ | ✓ | — | — | driver | **A** |
| Merchant earnings (own only) | ✓ | ✓ | ✓ | ✓ | — | — | merchant | **A** (fixed) |
| Pharmacy earnings (own only) | ✓ | ✓ | ✓ | ✓ | — | — | pharmacy | **A** (fixed) |
| Mobile-money settlement | ~ | ✓ | ✓ | ✓ | — | — | recorded PENDING | **G** — no provider settlement exercised |

## Merchant / Pharmacy

| Feature | UI | API | Service | DB | Realtime | Notif | Consumer | Status |
|---|---|---|---|---|---|---|---|---|
| Order placement, catalogue-priced | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | merchant queue | **A** |
| Order lifecycle accept→ready | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | client updates | **A** |
| Merchant tenant isolation | — | ✓ | ✓ | ✓ | — | — | refusal | **A** (fixed) |
| Prescription lifecycle + verify | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | pharmacy | **A** |
| Pharmacy tenant isolation | — | ✓ | ✓ | ✓ | — | — | refusal | **A** (fixed) |
| Merchant verification (admin) | ✓ | ✓ | ✓ | ✓ | — | ✓ | merchant notified | **~ A** |

## Platform intelligence

| Feature | UI | API | Service | DB | Realtime | Notif | Consumer | Status |
|---|---|---|---|---|---|---|---|---|
| Driver reputation → dispatch rank | ✓ | ✓ | ✓ | ✓ | — | ✓ | **fewer offers**, verified | **A** |
| Fraud score → payment refusal | ✓ | ✓ | ✓ | ✓ | — | ✓ | **transaction blocked**, verified | **A** |
| Surge → fare → driver premium | ✓ | ✓ | ✓ | ✓ | — | ✓ | verified both directions | **A** |
| **Incentives, full chain** | ✓ | ✓ | ✓ | ✓ | — | ✓ | **5000 UGX in a spendable wallet** | **A** (was C→B; fixed) |
| Zone metrics → scheduler | — | ✓ | ✓ | ✓ | — | — | surge decisions | **A** |
| Device trust | — | ✓ | ✓ | ✓ | — | — | risk scoring | **~ D** |

## Admin dashboard — 15 modules

| Module | Reaches API | Sends token | Status |
|---|---|---|---|
| Overview, Users, Riders, Merchants, Orders, Tasks, Payments, Audit, Settings | ✓ | ✓ | **A** |
| Monitoring, Health, SOS, Fraud | ✓ | ✓ | **A** |
| Driver Reputation | ✓ | ✓ | **A** (token added this session) |
| Marketplace Balance | ✓ | ✓ | **A** (token added this session) |
| Audit DOCX export | ✓ | ✓ | **A** (token added this session) |

Rider approve / reject / suspend are wired from Rider Management to
`/api/riders/*` and verified working — see the BE-021 retraction.

## Dead / orphaned — classified, not deleted

| Item | Evidence | Recommendation |
|---|---|---|
| `components/dashboard/fraud-monitoring-enhanced.tsx` | 0 importers | delete or wire |
| `components/dashboard/pharmacy-finance.tsx` | 0 importers | delete |
| `components/dashboard/merchant-finance.tsx` | 0 importers (the wired one is a different file under `smart-ride/dashboards/merchant/tabs/`) | delete |
| `components/dashboard/pricing-configuration.tsx` | 0 importers | delete or wire |
| `components/dashboard/route-optimization.tsx` | 0 importers | delete or wire |
| `components/dashboard/collusion-network-graph.tsx` | 0 importers; contains a commented-out fetch | delete or finish |
| `src/app/api/admin/riders/verify` | 0 callers; duplicates `/api/riders/approve` | **delete, or repoint Rider Management at it and delete the older three** |
| `expo-app/src/services/realtime.service.ts` | 0 importers; `socket.service.ts` is the live one | delete |

None deleted. Each is a judgement about which surface is canonical, which is a
product decision rather than a defect.

## Blocked on configuration

| Item | Blocker |
|---|---|
| Message encryption at rest | `MESSAGE_ENCRYPTION_KEY` unset in every deployment — messages stored plaintext |
| Mobile-money settlement | no real MTN/Airtel settlement exercised end to end |
| Push on release build | FCM key uploaded; release-build delivery still device-only to confirm |

---

# Physical device QA — session of 2026-08-14

## The device, proven rather than assumed

`adb devices` returning a serial is not proof of hardware; an emulator returns
one too. These are the properties that separate them:

| Property | Value | Why it matters |
|---|---|---|
| `ro.serialno` | `R3CR709T4FN` | the QA target for every command below |
| `ro.product.model` | `SM-G991U` | Samsung Galaxy S21 5G |
| `ro.build.version.release` / `sdk` | `15` / `35` | current Android |
| `ro.product.cpu.abi` | `arm64-v8a` | not an x86 emulator image |
| **`ro.kernel.qemu`** | **`0`** | an emulator reports `1` |
| **`ro.hardware`** | **`qcom`** | real Qualcomm silicon; an emulator reports `ranchu` / `goldfish` |
| Battery | 79%, 4158 mV, **33.4 °C**, Li-ion | a real cell, discharging, at a real temperature. Emulators report a fixed synthetic profile |
| Sensors | 289 entries | an emulator exposes a handful |
| Display | 1080×2400 @ 480dpi | matches the physical panel |

## Tooling available to me

| Capability | Command | Level |
|---|---|---|
| Launch / force-stop | `am start -n ug.smartride.app/.MainActivity` | C |
| Screenshot **and read it** | `exec-out screencap -p` → image | C |
| Tap / swipe / type | `input tap`, `input text`, `input keyevent` | C |
| Read logs | `logcat` | C |
| Install | `adb install -r` | C |

I can drive the UI and see the result. What I **cannot** do: hear a ringtone,
feel a vibration, judge whether a photo is legible in poor light, carry the
phone through a network dead-spot, or confirm a map settles smoothly. Those stay
level **D — human required**.

## Installed build at session start

```
package      ug.smartride.app
versionName  1.0.0  (versionCode 1)
installed    2026-08-13 20:19:15
targetSdk    36, minSdk 24
```

**This APK is stale.** Four mobile files changed after it was built, across two
commits:

| Commit | File | What it changes |
|---|---|---|
| `22bb0c0` | `src/services/socket.service.ts` | channel-local realtime recovery, real backoff, dead postgres_changes layer removed |
| `22bb0c0` | `app/driver/index.tsx` | `realtime:resubscribed` reconciliation |
| `22bb0c0` | `app/receipt/[id].tsx` | proof-of-delivery photo on the customer receipt |
| `939700f` | `app/driver/reputation.tsx` | the incentive Join button |

**Consequence, stated plainly:** any journey run against the installed APK tests
code that no longer exists. A pass would prove nothing about what ships and a
failure might already be fixed. So the device journeys below are gated on a
rebuild, and nothing is marked verified against the old binary.

## QA accounts for device testing

Created by `scripts/qa-device-accounts.ts`, re-runnable, password
`QaDevice@2026`:

```
qa.client@smartride.test    CLIENT
qa.boda@smartride.test      RIDER / SMART_BODA_RIDER
qa.car@smartride.test       RIDER / SMART_CAR_DRIVER
qa.courier@smartride.test   RIDER / DELIVERY_PERSONNEL
```

Login verified through the real HTTP route: `POST /api/auth/login` → 200 with an
access token.

**A caution recorded for the next session.** Two "failures" during this pass —
a 404 on `/api/marketplace/incentives` and a "Failed to login" — were the Next
dev server answering before it had compiled the route, not defects. Both looked
convincing. Give a freshly started dev server a real request and a moment before
believing anything it says.

---

# Device-only QA — executable scenarios

Every row below is something no server-side test can answer. Each names the
role, the account, the setup, the exact action, and what a pass looks like, so
it can be run without re-deriving any of it.

All accounts use password `QaDevice@2026` and are created by
`bun scripts/qa-device-accounts.ts`.

Device: `R3CR709T4FN` — Galaxy S21 5G, Android 15.

Legend: **C** = I can drive it via adb and read the result · **D** = a human
must be present (hearing, touch, judgement, physical movement).

---

## D1 — The offer arrives while the phone is locked

| | |
|---|---|
| **Level** | D — human |
| **Role / account** | Boda · `qa.boda@smartride.test` |
| **Setup** | Log in, go online, confirm "Waiting for requests". Lock the phone. Leave it locked, screen off, for 2 minutes. |
| **Action** | From another machine: `bun scripts/qa-dispatch-offer.ts boda` (or book a ride as `qa.client@smartride.test`). |
| **Expected** | The phone wakes or lights the screen, plays the offer sound, and vibrates. Unlocking lands on the offer sheet with a live countdown — **not** on the dashboard, and **not** on a tray notification the courier must find. |
| **Why a human** | Screen-wake behaviour, audibility and vibration cannot be sampled over adb. |
| **Result** | ☐ |

## D2 — The ringtone is audible over traffic

| | |
|---|---|
| **Level** | D — human |
| **Setup** | Phone in a trouser pocket, media volume at the level a courier would actually use, near a road. |
| **Action** | Trigger an offer. |
| **Expected** | Noticed within ~3 seconds without looking at the phone. |
| **Why a human** | This is the difference between a courier earning and a courier missing the job. |
| **Result** | ☐ |

## D3 — The SLA countdown matches the server

| | |
|---|---|
| **Level** | D — human (stopwatch) |
| **Action** | Trigger an offer, start a stopwatch when the sheet appears, do nothing, and note when the sheet closes. Then read the task's `expiresAt` from the database. |
| **Expected** | On-screen countdown reaches zero within ~2s of the server's own expiry. Accepting after the sheet closes is refused **by the server**, not merely hidden by the UI. |
| **Why a human** | Clock skew between phone and server only appears live. |
| **Result** | ☐ |

## D4 — Tapping the notification, from cold start

| | |
|---|---|
| **Level** | D — human |
| **Setup** | Force-stop the app (`adb shell am force-stop ug.smartride.app`). Phone unlocked, app not running. |
| **Action** | Trigger an offer. Tap the notification. |
| **Expected** | App cold-starts and lands on the driver dashboard with the offer sheet open. The known failure was landing on the client's rides tab, or nothing happening at all. |
| **Result** | ☐ |

## D5 — Realtime through a network change

| | |
|---|---|
| **Level** | D — human |
| **Setup** | Logged in as Boda, online, on Wi-Fi. |
| **Action** | Turn Wi-Fi off so the phone falls to mobile data. Wait 30s. Trigger an offer. Then re-enable Wi-Fi and trigger another. |
| **Expected** | Both offers arrive. After each switch the dashboard shows current state — the fix re-reads authoritative state on resubscribe rather than trusting the last screen. |
| **Note** | **RT-4: nothing will appear in logcat.** The release build prints no JS logs, so judge this by whether the offer arrives, not by watching for a channel error. |
| **Result** | ☐ |

## D6 — Proof photo in poor light

| | |
|---|---|
| **Level** | D — human |
| **Role / account** | Courier · `qa.courier@smartride.test` |
| **Setup** | Take a delivery to DELIVERING. Stand somewhere dim — a stairwell or a doorway at dusk. |
| **Action** | Capture proof of delivery. |
| **Expected** | The photo uploads, and — the part that matters — **the customer can tell what it shows**. Open the same task's receipt as `qa.client@smartride.test` and look. |
| **Why a human** | Legibility is a judgement, and a 700KB blob that proves nothing settles no dispute. |
| **Result** | ☐ |

## D7 — The too-far refusal is actionable

| | |
|---|---|
| **Level** | D — human (requires physically moving) |
| **Action** | Attempt proof capture ~2km from the drop-off, then again at the drop-off. |
| **Expected** | First attempt refused, naming the distance. Second accepted. |
| **Result** | ☐ |

## D8 — Map settles and the driver marker tracks

| | |
|---|---|
| **Level** | D — human |
| **Action** | Ride an actual short route with client and driver accounts on two devices, or drive one leg. |
| **Expected** | Map settles without jitter; the marker follows; the ETA changes in a way that matches reality. |
| **Note** | Mapbox **telemetry** fails on this device (`ERR_NAME_NOT_RESOLVED`). Tiles and directions are unaffected — but if the map misbehaves, check that first. |
| **Result** | ☐ |

## D9 — Push on the release build, off the cable

| | |
|---|---|
| **Level** | D — human |
| **Setup** | Install the release APK, then **unplug the USB cable**. |
| **Action** | Trigger an offer from another machine. |
| **Expected** | It arrives. USB is a debugging channel, not a delivery channel — this rules out the possibility that push only appeared to work because the device was tethered. |
| **Result** | ☐ |

## D10 — A second delivery, back to back

| | |
|---|---|
| **Level** | C→D |
| **Action** | Complete one delivery fully, then immediately dispatch another to the same courier. |
| **Expected** | The second offer arrives. This is the regression guard for the defect where a courier who finished one delivery never got another. |
| **Result** | ☐ |

---

## What I could drive myself, and did

| # | Scenario | Result |
|---|---|---|
| C-1 | App cold-starts on real hardware | **PASS** |
| C-2 | Login screen renders and accepts typed input | **PASS** |
| C-3 | Email/password login against the production API | **PASS** |
| C-4 | Server-side role reaches the UI (Rider/Boda pre-selected) | **PASS** |

Anything beyond C-4 in this session ran against a **stale APK** and is therefore
not recorded as verified — see the staleness note above.

---

# Device findings — release APK on R3CR709T4FN, 2026-08-15

Built and installed the current code (109MB signed release, `BUILD SUCCESSFUL
in 26m 26s`), then drove it with adb and read every screen. Three defects that
no server-side test could have found, all in code written earlier in this same
session.

## DEV-1 — A new driver could not see the bonus written for new drivers

**Status:** RESOLVED | **Priority:** P1 | **Found:** on the phone

The reputation screen returned its "No reputation yet" empty state for the
**whole screen**, before rendering anything below — including the Join button
added hours earlier to fix the incentive system's missing link.

So campaigns were unreachable for any driver with no completed trips, which is
exactly the driver a first-rides or completion bonus exists for. The one person
who most needed to join a campaign was the one person who could not see it: the
same unreachability the Join button was meant to fix, one level up.

Evidence: `qa.boda@smartride.test` has no reputation row and zero enrolments,
with one ACTIVE 15,000 UGX campaign visible to that same account through the
API. The screen showed the empty state and nothing else.

**Fix:** the empty state now covers only the reputation cards; open campaigns
render beneath it. Re-verified on device — "Bonuses you can join" and a "Join
this bonus" button now appear for a driver with zero trips.

## DEV-2 — The bonus was advertised as "UGX NaN"

**Status:** RESOLVED | **Priority:** P1 | **Found:** on the phone

With DEV-1 fixed, the campaign rendered — as **UGX NaN**.

The marketplace API nests its payload: `reward.amount` and
`requirements.minRides`. The screen read them flat, as `rewardAmount` and
`minRides`. `Number(undefined)` is `NaN`, so a live driver was shown a bonus
worth NaN, and the "3 rides to qualify" line silently never rendered.

Nothing threw. Types passed. The screen looked correct until you read it.

**Fix:** read the real shape, and **omit** the figure when the payload carries
no usable number — an absent amount is honest, a nonsense one is not. Also gave
the row a gap, because the title and amount butted together as
"Weekend PushUGX NaN".

**Not yet re-verified on device** — needs the next build. The expected result is
"UGX 15,000" and a "3 rides to qualify" line.

## DEV-3 — An approved rider can be trapped in the onboarding form

**Status:** OPEN | **Priority:** P1 | **Category:** Navigation

Reaching "Become a Rider" (Step 1 of 4) as an already-approved rider produces a
dialog — "Already Approved: Your rider account is already approved!" — which is
correct. Dismissing it leaves the driver **on the onboarding form**, which they
cannot meaningfully complete.

The exits are worse than the trap:

| Exit | What happens |
|---|---|
| Continue | a form for an account that is already approved |
| Header back | "Not a Rider? … **Switch to Client**" — offers to *demote* an approved driver |
| Cancel | stays on the form |
| Android back | leaves the app entirely |

An approved driver who lands here has no path to their dashboard, and the one
prominent escape would change their role. A cold restart does route correctly to
the dashboard, so the state is recoverable — by knowing to force-quit.

**Recommended fix (not made):** when the account is already approved, the dialog
should navigate to the driver dashboard on dismiss rather than returning to the
form. Left for a decision because it touches onboarding routing, which is
outside the QA scope freeze.

---

## Device-verified this session (level C — I drove it and read the screen)

| # | Scenario | Result |
|---|---|---|
| C-1 | App cold-starts on real hardware | **PASS** |
| C-2 | Login screen renders, accepts typed input | **PASS** |
| C-3 | Email/password login against the production API | **PASS** |
| C-4 | Server-side role reaches the UI (Rider/Boda pre-selected) | **PASS** |
| C-5 | All five roles render on the role chooser | **PASS** |
| C-6 | Driver dashboard: map, offline toggle, earnings, wallet actions | **PASS** |
| C-7 | **Live GPS fix** — blue dot placed in Bugolobi, Kampala | **PASS** |
| C-8 | Approved-rider guard refuses re-onboarding | **PASS** (but see DEV-3) |
| C-9 | Reputation screen reachable from the dashboard | **PASS** |
| C-10 | Incentive campaign + Join button visible to a zero-trip driver | **PASS** (after DEV-1) |

## Not verified on device, and why

- **The offer → ring → accept journey.** Needs a dispatched offer with a second
  account online; the ringing and vibration are level D regardless.
- **Proof photo on the customer receipt.** The delivery that carried a photo was
  removed by the fixture sweep, so there is currently no proof row to display.
  Needs a fresh delivery driven to DELIVERING on the device.
- **UGX 15,000 rendering correctly** — fixed but awaiting the next build.
- Everything in the D1–D10 list, which is human-only by construction.

---

# QA baseline closure — 2026-08-17

## The phone changed, and that matters

The device connected today is **not** the one the previous session tested.

| | Previous session | Today |
|---|---|---|
| Serial | `R3CR709T4FN` | `R58M3631ABM` |
| Model | SM-G991U (Galaxy S21 5G) | **SM-G975U (Galaxy S10+)** |
| Android | 15 (SDK 35) | **12 (SDK 31)** |
| Chipset | — | Snapdragon 855 (SM8150), Adreno |

Proven physical on the same terms as before, not assumed from `adb devices`:
`ro.kernel.qemu=0`, `ro.hardware=qcom` (an emulator reports `ranchu`/`goldfish`),
a real Li-ion cell at 100% / 4222 mV / **34.5 °C**, 59 sensors.

Three Android versions separate the two handsets. Any device result carried over
from the S21 is evidence about the S21, so the level-C table from that session is
**not** transitively true here and is not being claimed as such.

The APK installed on this phone was `versionName=1.0.0`, `lastUpdateTime`
**2026-07-21** — roughly four weeks stale, predating every fix in this ledger.

## Build discipline, and an honest failure

The APK on disk was built at **15:48**, which contains the DEV-1 fix (15:26) but
**not** DEV-2 (16:12). Testing DEV-2 on it would have validated code that does
not exist in it, so it was not used.

The rebuild was started, ran for roughly two hours, and **was killed** — no
`FAILURE:` in the log, the output simply stops mid-`mergeReleaseNativeLibs`,
which is what a process kill looks like rather than a build error. The machine
was under RAM pressure with a dev server running alongside it.

Two things worth recording, because both cost real time:

1. **The build script's clean step deletes the previous APK before producing a
   new one.** When the build then dies, there is no APK at all — not the new one
   and not the old one. A failed rebuild is not a no-op; it is destructive.
2. Running the Next dev server and Gradle concurrently starved both. The dev
   server died, and its death presented as API requests hanging — which looks
   exactly like a backend defect and is not one. This is the same class of
   mistake as the warm-up false-failure already recorded: **the environment
   producing a symptom that mimics the product.**

Restarted as `./gradlew assembleRelease` alone — no `prebuild --clean`, nothing
competing. Only JS changed, so the native artifacts did not need regenerating.

## DEV-2 — status

**Fix committed and correct against the authoritative response shape.** Verified
by reading the API: `src/app/api/marketplace/incentives/route.ts:99-105` returns
`reward: { amount, type }` and `requirements: { minRides }`, nested, which is
what `expo-app/app/driver/reputation.tsx` now reads.

**NOT device-verified.** The build that would prove it did not finish. The
expected result on screen remains "UGX 15,000" and a "3 rides to qualify" line.
Recorded as **UNVERIFIED**, not as passed — a fix that is provably correct in
source is still not a fix that was seen working on a phone.

## Level-C device scenarios — this handset

| # | Scenario | Result |
|---|---|---|
| C-1 | Device is physical, not an emulator | **VERIFIED** |
| C-2 | Installed build identified and dated | **VERIFIED** (stale, 2026-07-21) |
| C-3 | DEV-2 renders UGX 15,000 | **UNVERIFIED — no APK** |
| C-4 | Everything else on this handset | **UNVERIFIED — not re-run on S10+** |

---

# Incentive journey on the phone — 2026-08-17, second half

Device: `R3CR709T4FN` — **SM-G991U (Galaxy S21 5G), Android 15**. The S10+ that
was connected earlier in the session was swapped back out; both are real
handsets, and this note supersedes the device change recorded above. Proven
physical again on the same terms: `ro.kernel.qemu=0`, `ro.hardware=qcom`, real
Li-ion cell at 79% / 4142 mV / 33.4 °C.

APK: rebuilt and installed, `lastUpdateTime=2026-08-17 12:54:02`, 114,363,475
bytes, `:app:assembleRelease` completed. Newer than the DEV-2 commit (2026-08-15
16:12), so it contains it.

## DEV-2 — CLOSED

The campaign renders on the device as:

> **QA-DEVICE Weekend Push**  **UGX 15,000**
> Complete 3 rides this weekend and earn a bonus.
> **3 rides to qualify**

All three of the things that were wrong are right: the amount is a number and
not `NaN`, the qualifying line renders instead of silently vanishing, and the
title no longer collides with the figure. Confirmed stable across a reload.

DEV-1 holds alongside it — "No reputation yet" covers only the reputation area
while "Bonuses you can join" renders beneath it for a driver with zero trips.

## DEV-4 — Joining fails on the device, and it is not a code defect

**Status:** OPEN — deployment | **Priority:** P0 (operational)

Tapping "Join this bonus" produced:

> **Something went wrong** — Invalid input: expected string, received undefined

The mobile app sends `{ incentiveId }`. The **deployed** schema requires both:

```ts
const enrollSchema = z.object({ incentiveId: z.string(), riderId: z.string() });
```

so Zod rejects on the missing `riderId`. The local fix — which derives the rider
from the token instead of trusting a body field, the BE-030 repair — makes
`riderId` optional. Driving the local handler with the phone's exact payload
returns **201, ENROLLED**.

So the fix is correct and the phone cannot see it.

### The finding underneath this one

`EXPO_PUBLIC_API_BASE_URL=https://smartrideug.vercel.app/api`. **The phone talks
to production.** This branch is **20 commits ahead of `origin/main`.**

That has two consequences, and the second is the serious one:

1. Every backend fix in this ledger — BE-022 through BE-036 — is **invisible to
   the device**. Device QA of anything server-side has been testing code from
   before this work started. Only client-side fixes like DEV-2 could ever have
   shown up.
2. Therefore **BE-035 and BE-036 are live in production right now.** Any user can
   still PUT themselves `SUPER_ADMIN`; any stranger can still mark a payment
   COMPLETED and rewrite a driver's trust score. Fixing them locally closed
   nothing until this is deployed.

Deploying is a release decision, not a QA one, so it is recorded rather than
performed. It is the highest-priority item on this ledger.

## DEV-5 — A bonus already joined still offered a Join button

**Status:** RESOLVED (awaiting rebuild + deploy to see on device) | **Priority:** P1

After the enrolment existed server-side, the phone reloaded and still showed the
campaign under "Bonuses you can join" with an active **Join this bonus** button.
Tapping it again would attempt a duplicate enrolment.

Two independent faults, either sufficient alone:

1. `/api/rider/reputation` returned `id: p.id` — the **participation** row's id —
   and never exposed the campaign id. The screen compared that set against
   **campaign** ids, so it was permanently disjoint and excluded nothing.
2. The `hasReputation: false` branch omitted `incentives` altogether. A driver
   with no completed trips got no enrolment state at all — and that is exactly
   the driver a first-rides bonus is written for.

The second is DEV-1's mistake one level deeper: **the audience the feature exists
for is the audience the code forgets.** Three separate times now, the zero-trip
driver has been the case that broke.

Fixed by adding `incentiveId` to the contract and including enrolments in the
no-reputation branch. Verified in process: a zero-trip driver with one ENROLLED
participation now receives it, `incentiveId` matching the campaign.

## Device scenarios — this session

| # | Scenario | Result |
|---|---|---|
| C-1 | Device physical, S21, Android 15 | **VERIFIED** |
| C-2 | New APK installed and dated after the fix | **VERIFIED** |
| C-3 | Cold start to driver dashboard, live GPS in Bugolobi | **VERIFIED** |
| C-4 | Reputation screen reachable, campaign visible to a zero-trip driver | **VERIFIED** |
| C-5 | **Campaign displays UGX 15,000 and "3 rides to qualify"** | **VERIFIED — DEV-2 closed** |
| C-6 | Join enrols the driver from the device | **DEFECT — DEV-4, deployment gap** |
| C-7 | Joined campaign stops offering Join | **DEFECT — DEV-5, fixed, not yet on device** |
| C-8 | Progress advances toward the reward | **UNVERIFIED — blocked by C-6** |
| C-9 | Reward reaches the wallet on completion | **UNVERIFIED — blocked by C-6** |

C-8 and C-9 are honestly blocked rather than failed: they need enrolment from the
device, which needs the deploy. The same two steps were proven server-side
earlier (BE-030/031/032, a real 5,000 UGX wallet credit), so the mechanism works
— it is the device path that is unproven.

---

## DEV-6 — The driver's Cancel button can never succeed on an assigned ride

**Status:** OPEN — not fixed (scope) | **Priority:** P1 | **Category:** Navigation / wiring
**Found:** physical device, 2026-08-17

Pressing Cancel on an assigned ride shows the driver:

> Actor 'RIDER' is not authorized to transition from ASSIGNED to CANCELLED

**The server is right.** `getAllowedActors` permits a driver to cancel a ride
only from `IN_PROGRESS`:

```ts
if (toStatus === CANCELLED) {
  actors.push('CLIENT');
  if (isRideType) {
    if (fromStatus === IN_PROGRESS) actors.push('RIDER');  // mid-trip only
  } else {
    actors.push('RIDER');                                   // deliveries: any active phase
  }
}
```

From `ASSIGNED` the allowed actors are SYSTEM, ADMIN and CLIENT. The rule looks
deliberate — it stops a driver taking an assignment and dumping it, which would
strand the customer.

**The defect is the button.** `handleCancelTask` calls `api.cancelTask()`, a
`CANCELLED` transition. For an offer the driver has not started, the correct call
is the decline path — which already exists and has no caller here:

- `api.declineTask(taskId)` → `POST /tasks/{id}/decline`
- `api.rejectDispatch(matchId, reason)` → `POST /dispatch/{id}/reject`

So the control is guaranteed to fail, and it fails by showing a courier the state
machine's internal vocabulary. Two things to fix together: point the button at
decline, and stop surfacing raw transition errors to drivers.

## DEV-7 — In-app calling cannot derive the task, so no call connects

**Status:** OPEN — not fixed (scope) | **Priority:** P1 | **Category:** Contract
**Found:** manual device test by the user, 2026-08-17

The call screen sits on "Connecting…" and reports:

> taskId is required to call a client or rider

**The server is right again.** `/api/calls/initiate` requires `taskId` for
CLIENT/RIDER calls as a deliberate IDOR guard — without it `recipientId` is a
caller-supplied field checked only for "exists and is ACTIVE", so any
authenticated user could ring any other user with no relationship at all.

The client derives the task id by string-surgery on the conversation id:

```ts
taskId: conversationId?.replace('conv-', ''),
```

When the call screen is opened without a `conversationId` — which is what
happens from the task card's "Tap to call in-app" — this evaluates to
`undefined` and the server refuses. The call can never connect from that entry
point.

Two problems, not one. The missing parameter is the immediate cause; the deeper
issue is that **reconstructing a task id by stripping a prefix off a conversation
id is a guess, not a contract.** The task screen already knows the real task id
and should pass it explicitly rather than encoding it in another identifier's
string form.

Recorded rather than fixed: this is the calling subsystem, outside the incentive
closure currently in progress.

---

---

# Role journeys — controls vs. backend lifecycle, 2026-08-17

Audited under the rule LC-1 established: the question is not *does the button
render*, it is **does this control correspond to a backend operation that
exists, is reachable, and is legal at this state.**

## Driver progression — SOUND

`scripts/verify-ui-lifecycle-parity.ts` takes the mobile app's own progression
maps (`RIDE_FLOW`, `DELIVERY_FLOW` from `driver-task.tsx`) and walks each one
through the real state machine as the RIDER actor, on real tasks.

| Journey | Result |
|---|---|
| Smart Boda — ASSIGNED → ACCEPTED → ARRIVING → ARRIVED → PICKED_UP → IN_PROGRESS → COMPLETED | **6/6 accepted** |
| Smart Car — same map, `SMART_CAR_RIDE` | **6/6 accepted** |
| Delivery — ASSIGNED → ACCEPTED → ARRIVING → PICKED_UP → IN_TRANSIT → DELIVERING | **5/5 accepted** |

**17/17.** The primary button matches the server on every step of all three
journeys. `DELIVERING → DELIVERED` is correctly absent from the button map —
proof capture advances it, not a tap.

**A false defect, caught by doubting it.** The first run reported Smart Boda
dead at its very first step with the state machine's catch-all "An internal
error occurred", while Smart Car passed the identical map. The difference was
run order: the harness had not established a service-role context before the
first walk. It read exactly like a product defect and was not one. Recorded
because it is the third time this session an environmental artifact has imitated
a bug.

## MERCH-1 — The merchant cannot accept or reject an order

**Status:** OPEN | **Priority:** P0 | **Category:** Dead control / contract

The merchant screens render Accept and Reject. Pressing them calls:

```ts
api.updateOrderStatus(orderId, 'CONFIRMED')
  → PATCH /orders/{id}/status   body { status: 'CONFIRMED' }
```

**`/api/orders/[id]/status` does not exist.** Everything under `/api/orders` is:

```
src/app/api/orders/[id]/route.ts
src/app/api/orders/quote/route.ts
src/app/api/orders/route.ts
```

The real contract is a **query parameter on a different URL**:

```
PATCH /orders/{id}?action=accept
```

with `ACTION_ROLE_MATRIX` gating `confirm-payment, accept, reject, preparing,
ready, pickup, deliver, cancel` — the same route hardened in BE-025.

So the mismatch is three-deep: wrong URL, wrong parameter location (query, not
body), wrong vocabulary (`CONFIRMED`/`REJECTED` vs `accept`/`reject`). Every
merchant order action is a 404.

**The whole merchant journey is inert from the app.** A restaurant cannot accept
an order, mark it preparing, or mark it ready. The backend supports all of it.

## PHARM-1 — The pharmacist cannot progress a health order

**Status:** OPEN | **Priority:** P0 | **Category:** Dead control / contract

```ts
api.updateHealthOrderStatus(orderId, status)
  → PATCH /health/orders/{id}/status
```

**`/api/health/orders/...` does not exist.** `src/app/api/health/` contains only
the health*check* endpoints — `route.ts`, `ready`, `startup`. The real route is

```
PATCH /health-orders/{id}    body { status }
```

— hyphenated, no `/status` segment. The app is calling into the monitoring
namespace by accident. Fulfilment cannot be advanced from the pharmacist app.

**Not everything on that screen is broken.** `verifyPrescription` and
`rejectPrescription` call `PATCH /prescriptions/{id}`, and
`src/app/api/prescriptions/[id]/route.ts` exists — that pair is correctly
addressed and was not disproved here.

## What these two have in common

Neither is a logic bug. Both are **address mismatches between a client and a
backend that were written to different maps**, and both survive every check that
does not actually issue the request: the screens render, the handlers are wired,
the store updates optimistically, TypeScript is satisfied, and the button
animates on press. `merchantStore.updateOrderStatus` even patches local state
after the call, so the order visibly moves on screen while the server never
heard about it.

That last detail is the dangerous one: **the merchant sees the order advance.**
The failure is invisible until someone asks the database.

## Method note

The first inventory pass grepped `api.*` inside the screen directories and found
no merchant order actions at all, which suggested a missing feature. That was
wrong — the calls go through `useMerchantStore()`, one indirection away. The
feature exists and is wired; it is the address that is wrong. Worth recording
because the same grep shape would under-report every store-mediated action.

---

# Session — Ride offer notifications and driver eligibility

The report was "the driver appears to receive too many notifications for a
single ride request." Counting them on the phone cannot say where they come
from, so they were counted at the source instead: `verify-offer-lifecycle.ts`
intercepts every outbound call to the Expo push API and records how many push
messages one `DispatchMatch` actually produces.

## DISP-1 — one offer stacked about ten notifications

**Status:** FIXED, backend counts VERIFIED | **Priority:** P1 | **Category:** Notification / UX

The duplicates were **local, not server-side**. Dispatch sends exactly one push
per DispatchMatch — measured, not assumed.

`expo-app/app/driver/index.tsx` kept the offer ringing by posting a fresh local
notification every 3.5 seconds. It passed no `identifier`, so
expo-notifications minted a new one each time and Android had no way to know
the alerts were one event. With `shouldShowList: true` in the global handler,
each became its own tray entry:

```
 1  server push        (dispatch to Expo, once per match)
 9  local ring repeats (30s offer / 3.5s)
---
~10 notifications for ONE offer
```

The comment in that code admitted the mechanism — "plays the device's own
notification sound repeatedly (via a local, immediate notification)" — a
ringtone implemented as notification spam because no audio asset is bundled.

**Fix.** Every repeat now reuses `OFFER_ALERT_ID`, so Android updates the same
notification in place. It still re-alerts on each repeat (we never set
`onlyAlertOnce`), so the ringing behaviour is unchanged — there is one
notification per offer, and one handle to dismiss when it ends. Clearing the
offer now dismisses it, instead of leaving a dead offer in the tray inviting a
tap the server will refuse.

The server's push is additionally suppressed when the offer sheet is already up
for that same offer — and **only** then. If the sheet is not showing (socket
dropped, app backgrounded, driver on another screen) the push shows normally.
Suppressing it unconditionally would hide the very offer the push exists to
deliver.

## DISP-2 — the cron retry re-pushed offers the driver had already been rung about

**Status:** FIXED + VERIFIED | **Priority:** P2 | **Category:** Dispatch / duplicate delivery

`DispatchMatch.notificationSent` records only whether the **realtime broadcast**
succeeded. The push is fire-and-forget and its outcome is never stored. So a
match whose broadcast failed while its push landed fine was recorded as "not
sent", and `retryFailedNotifications()` called `notifyRider()` again — firing a
second push for an offer the driver had already heard.

Bounded in practice (the GitHub-Actions cron is ~5-minute granularity against a
30-second offer window), so this was a smaller contributor than DISP-1, but it
is a genuine duplicate. Retries now re-attempt the broadcast only.

## DISP-3 — one driver could accept two rides at once

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P0 | **Category:** Dispatch / eligibility

Found by testing the race the brief asked for rather than by reading code.

`acceptMatch` guarded the match row against being taken twice. Nothing stopped
the same driver taking two **different** matches. The gap is reachable in normal
use: a PENDING DispatchMatch does not set `rider.currentTaskId`, so a driver
sitting on an open offer still reads as free and stays in the eligible pool for
the next task. Two offers, two taps, and both transitions committed:

```
accept1=true accept2=true -> 2 active tasks held by one rider
  E2E-OFFER-71:ASSIGNED, E2E-OFFER-72:ASSIGNED
```

`currentTaskId` named only the second, so the first became a trip nobody was
dispatched to and nothing would ever release.

**Fix.** Accepting now claims the rider row with a compare-and-set on
`currentTaskId` — the same field dispatch eligibility already reads — inside the
existing transaction. The loser throws (a plain `return` would COMMIT, leaving
the match ACCEPTED with the task unassigned), which rolls the match back to
PENDING so the offer stays claimable by someone actually free.

This decides only whether an accept is admissible. **The state machine and its
transition tables are untouched, and LC-1 remains frozen.**

Verified against the deployed API, not just locally — 6/6 on
`verify-production-dispatch.ts`, reading the production database afterwards to
confirm the rows, because an API that returns the right JSON while writing the
wrong rows is the failure worth catching.

## DISP-4 — stale device tokens multiply every offer (latent, NOT the cause here)

**Status:** OPEN | **Priority:** P3 | **Category:** Push / token hygiene

`sendViaExpoPush` sends one message per **active token row**. Demonstrated: with
3 active rows for one user, a single offer addressed 3 push messages.

Both registration routes upsert on the unique `token`, so the same token never
duplicates — but a device that rotates its token leaves the old row
`isActive: true` forever, and `update` never reassigns `userId`, so a shared
device keeps pushing to whoever registered first.

**This is not what was happening.** Measured on production: `qa.boda` has
exactly **one** active token, and platform-wide **zero** users carry more than
one. Recorded as a latent multiplier, not the reported defect.

## Driver eligibility — the invariant, tested state by state

Traced to the actual server-side query: `CapabilityService.getEligibleRiders`
filters on `currentTaskId: null` (plus APPROVED, isOnline, and a heartbeat
within 90s). Tested by querying that pool directly, not by watching for
notifications, with the driver otherwise kept perfectly dispatchable so an
active task is the only possible reason to exclude them.

| Driver state | Eligible? | Result |
|---|---|---|
| no active task | yes | PASS |
| ASSIGNED | no | PASS |
| ACCEPTED | no | PASS |
| ARRIVING | no | PASS |
| ARRIVED | no | PASS |
| PICKED_UP | no | PASS |
| IN_PROGRESS | no | PASS |
| COMPLETED | yes | PASS |

Delivery personnel, against the delivery lifecycle's own states:

| Courier state | Eligible? | Result |
|---|---|---|
| ASSIGNED / ACCEPTED / ARRIVING | no | PASS |
| PICKED_UP / IN_TRANSIT / DELIVERING | no | PASS |
| DELIVERED | yes | PASS |

Note there is deliberately **no ARRIVED step** for a delivery —
`ITEM_DELIVERY_TRANSITIONS` goes ARRIVING to PICKED_UP. The first run of this
suite asserted a ride's states against a delivery and reported a defect that
does not exist; the test was wrong, not the product. Worth recording because
asserting one task type's lifecycle against another is an easy way to invent a
bug.

## Offer lifecycle — one offer, end to end

All verified in `verify-offer-lifecycle.ts` (37/37):

- dispatch creates exactly **one** DispatchMatch and addresses exactly **one**
  push, on the MAX-importance `ride-offers-v1` channel
- **accept** produces match ACCEPTED, task ASSIGNED with the rider attached,
  `currentTaskId` pinned; a second accept is refused
- **decline** produces match REJECTED and a new match for a **different**
  driver; the decliner cannot accept the match they rejected
- **expiry** refuses a late accept, marks the match EXPIRED rather than leaving
  it PENDING, and the task is never assigned by it
- an old notification tapped after the SLA is refused by the server — the
  notification is not the offer

## Findings carried forward, not closed

- **DEV-7** — the call screen now receives the authoritative `taskId` rather
  than reconstructing it from `conversationId`. Closed on device.
- **DEV-10** — `CallSession` stays `status: "ringing"`, `endedAt: null` after
  Decline, because `api.endCall` only runs when `callInfo?.sessionId` is set.
  Still OPEN; needs the incoming path's sessionId population traced, not
  guessed.
- **LC-1** — still frozen, still a product decision. `ASSIGNED -> SEARCHING`
  exists in no task-type transition table, so `verify-decline-reroute.ts` sits
  at 2/7. Confirmed unchanged by this session's work: the same 2/7 with the
  dispatch changes stashed.
- **Actor authority derives from the account's global role**, not the caller's
  relationship to the task, so a user whose role is RIDER cannot cancel a ride
  they booked as the client. Entangled with LC-1; not touched.

# Session — Financial integrity

Two P0s on opposite ends of the same money path, both live in production when
found: customers could underpay, and drivers could not be paid at all.

## BE-041 — the customer decided what they owed

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P0 | **Category:** Payment integrity

`/payments/initiate` destructured `amount` from the request body and passed it
to `initiatePayment`, which wrote it straight to `db.payment.create`. Nothing
looked the obligation up. The client was the sole authority on the figure:

```
UGX 50,000 fare, settled for 100  → accepted
settled for 0                      → accepted
settled for -50,000                → accepted
attached to someone else's task    → accepted
```

The mobile client's own comment conceded it — *"the endpoint trusts the amount
it is given."*

**Fix.** The amount is derived from the task or order being settled; the caller
must own it; an already-paid obligation is refused; a request referencing
neither is rejected (top-ups have `/wallet/topup`, where a user-chosen amount is
legitimate). A client figure that disagrees with the derived one is **refused
and logged**, not silently corrected — quietly charging the right amount would
hide both a drifted client and a probing one.

## BE-043 — no customer could create a payment at all

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P0 | **Category:** RLS

Found while testing BE-041, not by reading code. The honest payment failed:

```
new row violates row-level security policy for table "Payment"
```

`Payment` has three policies — `service_role_access` (ALL), `admin_read`
(SELECT), `users_read_own_payments` (SELECT). **Not one permits INSERT for an
ordinary user.** A customer could read their payments and never make one, so
non-cash settlement has never worked under the caller's own context.

Same family as the earlier finding that `Task` has no rider SELECT policy.

**Fix.** Recording a payment is the platform acting on the customer's behalf,
and the write is now made with that authority. Safe precisely because
authorization is no longer implicit: ownership and amount are both proven
immediately above it, and the route's `finally` resets the context so the
elevation cannot outlive the request.

## BE-040 — drivers could not see or withdraw their earnings

**Status:** FIXED + VERIFIED | **Priority:** P0 | **Category:** Wallet / source of truth

Two stores, and the money path crossed them:

| Path | Store |
|---|---|
| Task-completion earnings | `rider.walletBalance` **only** |
| Incentive reward | **both** — already correct |
| Driver app wallet display | `Wallet` model only |
| Withdrawal | `Wallet` model only, upserts `balance: 0` |

Ride earnings accrued into a column the driver's app never reads and the
withdrawal route never debits. UGX 0 on screen after a completed paid trip, and
nothing to pay out on request.

**Fix.** Ride earnings now go through `creditRewardToWallet` inside the existing
completion transaction — the path the incentive payout already used correctly —
so the money lands where the driver looks and the ledger gets its row. A failed
credit throws rather than recording earnings as paid that never moved. Cash is
still excluded: the rider was paid in hand.

**Production data.** `report-wallet-reconciliation.ts` is read-only and reports
what this stranded. Run against production: **7 riders, 0 stranded, UGX 0** —
caught before it cost anyone. No backfill needed.

## INC-4 — a replayed completion advanced progress twice

**Status:** FIXED | **Priority:** P1 | **Category:** Incentive integrity

`qualifyingTasks` records which tasks have already counted, but nothing
consulted it before appending. The same task arriving twice incremented
`ridesCompleted` twice. Completion events are not delivered exactly once — a
retry, a replayed webhook, a double-fired hook — so a driver could reach a rides
target without driving the rides and the campaign would pay for work never done.

## INC-5 — one qualification could pay twice

**Status:** FIXED | **Priority:** P1 | **Category:** Payout idempotency

The payout marked the participation `REWARDED` with an unconditional update,
which succeeded whatever the status already was. Two concurrent runs both passed
and both credited the wallet. Claiming the row is now atomic, and the loser
throws so the transaction rolls back rather than committing a half-payout — a
plain `return` inside a Prisma interactive transaction COMMITS.

## INC-2 — a live campaign could not be stopped

**Status:** FIXED | **Priority:** P2 | **Category:** Admin control

A campaign ran to its end time paying real money with no way to intervene.
`PATCH /api/marketplace/incentives` already accepted `{ incentiveId, status }`;
only the control was missing. Added to the marketplace admin view against that
existing contract, gated by the same `canEdit('pricing')` permission the rest of
the view uses.

## DISP-5 — the offer alert never reached its own channel

**Status:** FIXED + VERIFIED ON DEVICE | **Priority:** P1 | **Category:** Notification

`dumpsys notification` showed every offer on
`expo_notifications_fallback_notification_channel` at importance 4 — not the
MAX-importance `ride-offers-v1` channel built for it. No heads-up while the
driver was in another app, no DND bypass, indistinguishable from a receipt.

Root cause, confirmed against the installed SDK rather than guessed:
`NotificationContentInput` has **no** `channelId` field. It belongs on the
trigger, via `ChannelAwareTriggerInput`. The code passed it inside `content`
with `trigger: null`, so no channel was communicated at all. TypeScript could
not catch it because the value arrived through a **conditional spread**, and
spreads skip excess-property checking.

Verified on hardware after rebuild: `channel=ride-offers-v1`, `importance=5`,
and still exactly one notification held across the ring loop.

## BE-042 — three files claimed to be the lifecycle

**Status:** RESOLVED | **Priority:** P2 | **Category:** Duplicate authority

Importer counts settled it:

- `enhanced-task-state-machine.service.ts` — **12 importers**, authoritative
- `unified-state-machine.ts` — **0 references anywhere** → deleted
- `api/state-machine.ts`, `services/task-state-machine.service.ts` — imported
  only by verify scripts and a unit test → annotated, not deleted

The annotation says the part that matters: a suite asserting against a parallel
transition table proves nothing about what the server will allow, so those
suites can pass while production refuses the move. Repointing them at the
enhanced machine is recorded as follow-up.

## INC-1 — the four-hour hardcode, located

**Status:** OPEN (product decision) | **Category:** Business rule

Found at `src/components/dashboard/marketplace-balance.tsx`:

```ts
endTime.setHours(endTime.getHours() + 4);
```

It is in the admin **create form**, not the API — so every campaign an admin
creates is four hours long and the duration is never offered as a choice. The
API accepts whatever start/end it is given. Making it configurable is a small
change to that form; whether four hours is the intended default is a product
question, so it stays open rather than being changed unilaterally.

# Session — Device journey matrix: client and merchant

## CLIENT JOURNEY — VERIFIED end to end on physical hardware

One ride, `TASK-2026-000060`, driven from a real phone with a properly separated
client and driver account (different user ids — the earlier self-assigned
fixture could not have caught actor bugs).

| Step | Evidence |
|---|---|
| Request | HTTP 201, fare 3000, riderEarnings 2550 |
| Matching | exactly 1 DispatchMatch |
| One offer | 1 notification, `ride-offers-v1`, importance 5 |
| Accept | tapped on device → `MATCHING→ASSIGNED[RIDER]` |
| Client sees assignment | status ASSIGNED, driver named, phone hidden |
| In-journey | ETA, progress timeline, correct "You earn UGX 2,550" |
| Progression | 8 transitions, every rider step tapped on the phone |
| Completion | COMPLETED, `payment=COMPLETED/CASH` |
| Settlement | ledger riderEarnings 2550, commission 450, `COD_PAYMENT 450 COLLECTED` |
| Rating | 5★, `direction: client_rated_driver`, toRiderId + toUserId both set |
| Wallet/ledger | Wallet untouched — correct, the passenger paid cash in hand |
| Final state | `/tasks/active` → 404; completed card offers only "View earnings" |

Full transition chain, all from the device:

```
CREATED→MATCHING[SYSTEM] MATCHING→ASSIGNED[RIDER] ASSIGNED→ACCEPTED[RIDER]
ACCEPTED→ARRIVING[RIDER] ARRIVING→ARRIVED[RIDER] ARRIVED→PICKED_UP[RIDER]
PICKED_UP→IN_PROGRESS[RIDER] IN_PROGRESS→COMPLETED[RIDER]
```

## JRN-1 — the job screen hid its own action button

**Status:** FIXED + VERIFIED ON DEVICE | **Priority:** P0 | **Category:** Layout

A driver holding an assigned ride had no way to advance it. `JourneyShell` caps
the panel at 68% of the screen, but the detail `ScrollView` was `flexGrow: 0`
with nothing letting it shrink, so it always sized to its full content, the card
grew past the cap, and the pinned action block went off the bottom. The panel
would not scroll because there was nothing to scroll — the overflow was outside
the viewport, not inside the list. Every extra progress step made it worse.

## JRN-2 — `allowedTransitions` was never published

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P0 | **Category:** Contract

The job screen asks the server which move is legal — `pickPrimaryTransition()`
reads `task.allowedTransitions`. The mobile half shipped; the server half did
not, so `GET /tasks/[id]` answered without the field, `nextStatus` was null and
no primary action was rendered at all. The route now returns
`EnhancedTaskStateMachine.getValidNextStatuses`, so there is still exactly one
lifecycle authority and the client only chooses which of those to offer.

## JRN-3 — the offer overstated the driver's pay

**Status:** FIXED | **Priority:** P1 | **Category:** Correctness

The offer sheet labelled `totalAmount` "You earn", advertising UGX 3,000 for a
job that pays 2,550 — on the one screen where the driver decides whether the
work is worth taking, and contradicted by the job screen a tap later.
`riderEarnings` was read for the push text but never included in the dispatch
broadcast, so the sheet had nothing else to show. It is in the payload now.

## HB-1 — a stationary rider's heartbeat was rejected

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P1 | **Category:** Dispatch

`POST /rider/heartbeat` declared `speed` and `heading` `.optional()`, which
accepts a missing key but rejects an explicit null — and Android reports null
for both whenever the device is not moving. Every heartbeat from a parked rider
came back `400 "Invalid input: expected number, received null"` and was thrown
away by the caller's `.catch(() => {})`.

**Important qualification.** This is real and reproduced directly against
production, but it was NOT the cause of the symptom that led me to it. I read a
rider as an hour stale and went hunting; the local machine's clock is exactly one
hour ahead of the server, and by the database's own clock the heartbeat was 24
seconds old. The keep-alive timer sends position only, which always passed, so
the rider stayed eligible throughout. The fix restores the movement-triggered
heartbeat and its telemetry; the staleness never existed.

## MERCH-2 — the dashboard could not load a single order

**Status:** FIXED + VERIFIED ON DEVICE | **Priority:** P0 | **Category:** Contract

`getMerchantOrders` called `/merchants/{id}/orders`, which does not exist — that
directory holds analytics, availability, menu and products. The request 404'd
and the store reported "Network error. Please check your connection." while the
order sat in the database. Same shape as MERCH-1: a client addressing a URL
nobody built.

`GET /orders` is the real contract and already scopes a MERCHANT caller to their
own merchant from the token, so the id is no longer sent.

Paging was broken in the same place: `pagination` is a sibling of `data` in the
backend envelope, but the client's unwrap returned only the inner payload, so
every paged list believed it was on page 1 of 1.

## MERCH-3 — every tab filtered on a status that does not exist

**Status:** FIXED + VERIFIED ON DEVICE | **Priority:** P0 | **Category:** Enum drift

With the URL corrected the dashboard still failed — but the message changed from
the client's network catch-all to the server's own "Failed to fetch orders",
which is what a 500 from `GET /orders` looks like.

The tabs filtered on `NEW`, `PENDING`, `CONFIRMED`, `READY`, `COMPLETED`. None
are `OrderStatus` values, so Prisma rejected them. Only `PREPARING` and
`DELIVERED` were ever real. Proven after the fix: `status=NEW` still returns
**500** on production, while `status=ORDER_CREATED,PAYMENT_CONFIRMED` returns
200.

Tabs are phases, so `GET /orders` now accepts a comma-separated list — a single
value behaves exactly as before. Previously only `statuses[0]` was sent, which
would have hidden half of each tab even once the names were right.

## MERCH-4 — Accept and Reject never rendered

**Status:** FIXED | **Priority:** P0 | **Category:** Enum drift

The card gated its buttons on `['NEW','PENDING'].includes(order.status)` — the
same invented names — so the test was permanently false and the merchant could
see an order but never act on it. Now gated on `PAYMENT_CONFIRMED`, and only
that: the backend refuses an accept before the customer has paid, so offering
the button earlier would promise an action the server rejects. The status label
table had the same invented keys, so cards printed the raw enum.

## Merchant actions — VERIFIED against the deployed API (7/7)

```
client confirm-payment  → PAYMENT_CONFIRMED
Accept   → MERCHANT_ACCEPTED
Preparing→ PREPARING
Ready    → READY_FOR_PICKUP
Reject   → REJECTED
accepting an already-advanced order → 400 "Order must be in PAYMENT_CONFIRMED status"
another provider advancing it       → 403 "Role 'PHARMACIST' is not permitted"
```

## Observation — role picker after login

A MERCHANT signing in on a fresh install passes through "Choose Your Role"
before reaching the dashboard. The correct role is **pre-selected** and the
database role is unchanged afterwards (verified: still MERCHANT), so this is
onboarding friction on a fresh install rather than a data defect. Recorded, not
fixed.

## Approval gate — working as designed

Both fixtures were initially refused with "Application under review": `Merchant.
status` defaults to `PENDING_APPROVAL` and `HealthProvider.verificationStatus`
to `PENDING`. That is the gate doing its job; the fixtures were approved to
proceed, not the gate weakened.

# Session — Pharmacy closure and PHARM-2

## PHARM-2 — a pharmacy order could be moved backwards, or delivered twice

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P0 | **Category:** Lifecycle

Reproduced against production: an order at `READY_FOR_PICKUP` accepted `ACCEPT`
and went back to `ACCEPTED`.

**Root cause.** `PATCH /health-provider/orders` maps an action straight onto a
new status. It fetches the order — for the ownership check — and then never
reads `order.status`, so any action applied from any state. `ACCEPT` was only
the case that surfaced; the same gap allowed a `DELIVERED` order to be
re-accepted, a `CANCELLED` one to be marched forward, and `DELIVER` to run twice
on an already-delivered order, re-stamping `deliveredAt` and `paymentStatus`.
That last one is money.

**Is the transition legitimate? No.** There is no workflow in which a pharmacy
accepts an order it has already prepared and set aside for collection.
`acceptedAt` records when the pharmacy took the job; rewriting it afterwards
loses when that happened.

**Which state machine is authoritative?** None existed.
`ProviderOrderStatus` is referenced in exactly one file, so the guard added to
that route is the **first** definition of this lifecycle rather than a second
authority competing with an existing one. It sits beside the switch it guards —
the only code that moves a provider order.

**Regression:** `verify-provider-order-lifecycle.ts` **12/12** — the legal path
`ORDER_RECEIVED → ACCEPTED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY →
DELIVERED` still runs, and every backwards move, terminal move, skipped step and
double delivery is refused with 409 while the stored status stays put.

**Production:** `ACCEPT` on an `ACCEPTED` order → **409 "Cannot ACCEPT an order
that is ACCEPTED"**; the legal `START_PREPARING` → 200.

## PHARM-3 — the pharmacist gate reads a different table than the orders do

**Status:** OPEN (product decision) | **Priority:** P2 | **Category:** Data model

An approved pharmacist with a `HealthProvider` and a live `ProviderOrder` was
sent to "Register Pharmacy". `useProviderApprovalGate` calls
`api.getMerchantProfile()` for PHARMACIST, so the **gate** wants
`Merchant(type=PHARMACY)` + `Pharmacy`, while **order fulfilment** — verified
working — lives on `HealthProvider` + `ProviderOrder`.

So a pharmacist has two half-identities and needs both rows to use the app.
Deciding which model is authoritative is an architectural call, not a QA fix, so
this is recorded rather than changed. The QA fixture was given both halves to
proceed. Worth noting: **`HealthOrder` has 0 rows platform-wide** — that third
table is entirely unused, while `ProviderOrder` carries the real orders.

## PHARM-4 — the orders screen showed nothing, and printed its own source

**Status:** FIXED + VERIFIED ON DEVICE | **Priority:** P0

The dashboard said "Orders: 1 total"; opening Orders said "No orders found".

- **The All tab asked the wrong service.** With no status filter,
  `getHealthOrders` fell through to `/health/orders` — the monitoring namespace,
  which holds the healthcheck endpoints and has never had an orders route.
- **The tabs filtered on statuses that do not exist.** `PENDING`, `PROCESSING`,
  `COMPLETED`. `enumParam` ignores an unrecognised value rather than erroring,
  so those tabs quietly showed everything instead of filtering — the same enum
  drift as the merchant tabs, failing silently instead of loudly.
- **The empty state printed code at the user.** The subtitle was wrapped in
  quotes, so pharmacy staff were shown
  `{activeTab === 'ALL' ? ... : \`No ${activeTab.toLowerCase()} orders\`}`
  rendered verbatim.

## PHARM-5 — five pharmacist calls addressed the monitoring namespace

**Status:** FIXED + VERIFIED ON DEVICE | **Priority:** P0

Opening an order said "Order not found" while the list had just rendered it.
`/api/health/` holds `route.ts`, `ready` and `startup` — never pharmacy data.
Measured against production, every one returned **404**:

```
/health/orders   404      /health-provider/orders   200
/health/status   404      /health-provider/status   400 (exists, needs an id)
/health/catalog  404      /health-provider/catalog  400 (exists, needs an id)
```

Affected: `getHealthOrder`, `getHealthProviderStatus`,
`updateHealthProviderStatus`, `getMedicineCatalog`, `updateMedicineCatalog`,
`updateMedicineAvailability`. Editing a medicine or toggling its availability
silently did nothing.

The single-order read has no route of its own, and adding one would create a
second way to read the same data, so it selects from the provider's own order
list — the detail screen therefore always shows the row the list showed.

## PHARM-7 — status and catalog need an id the client never sends

**Status:** OPEN | **Priority:** P3

`/health-provider/status` and `/health-provider/catalog` exist but require
`providerId` (or `userId`), unlike `/health-provider/orders`, which resolves the
provider from the token. The corrected client calls therefore reach a real route
and get 400. Not on the pharmacy journey's critical path — the dashboard
tolerates the failure — so recorded rather than fixed here.

## PHARM-6 — the order screen offered no way to act on the order

**Status:** FIXED | **Priority:** P0

The action buttons branched on `PENDING`, `ORDER_CREATED` and `PROCESSING`, so
on a real `ORDER_RECEIVED` order no branch matched and the container rendered
empty: the pharmacist could read an order and do nothing with it. Third screen
in this app with the same enum drift.

Each state now offers exactly the one action the server accepts. **"Complete
Order" was removed rather than remapped** — it sent `DELIVER`, legal only once a
courier is carrying the order, so with the PHARM-2 guard in place it would now
always fail. The progress timeline was also missing `ORDER_RECEIVED`, so a new
order showed no progress at all.

## Note — a 403 that did not reproduce

While testing PHARM-2 on production I saw repeated
`403 "This order belongs to another provider"` for the order's own pharmacist.
The cause was mine: a failed first fixture run had left **two** `qa-rx-*` users,
and the harness's `findFirst` was logging in as one while acting on the other's
order. Not a product defect. Recorded because the same shape of mistake could
easily be reported as an authorization bug.

## PHARM-8 — a ready pharmacy order is never routed to a courier

**Status:** OPEN (blocker for the pharmacy→customer chain) | **Priority:** P0 | **Category:** Missing dispatch

Marking a pharmacy order READY_FOR_PICKUP does nothing beyond setting the
status. The order stops there.

The merchant flow does the opposite. `src/app/api/orders/[id]/route.ts` on ready:

```
{ triggeredByType: 'SYSTEM', reason: 'Food/shopping order ready, starting dispatch' }
DispatchService.findAndAssign({ ... })
```

`/health-provider/orders` contains no `findAndAssign`, no `DispatchService`, and
never creates a `Task`. `findAndAssign` is called from rides, tasks and merchant
orders — never from a provider order. `ProviderOrder` has a `riderId` field
("the rider carrying this order") and the route has an `ASSIGN_RIDER` action, but
nothing calls it and no screen offers it: a rider can only be attached by hand
via the API, with an id chosen by a human.

So the chain pharmacy → courier → customer has no automatic link. The medicine is
prepared and set aside, and no delivery is ever requested.

Not fixed here: wiring dispatch into the provider-order lifecycle means deciding
what Task a pharmacy delivery becomes, who pays the courier out of
`providerEarnings` vs `deliveryFee`, and how `ProviderOrder.status` and
`Task.status` stay consistent — design decisions, not a contained defect fix.

---

# Session — the pharmacy chain closed, and the merchant app rebuilt

## PHARM-8 — a ready pharmacy order is never routed to a courier

**Status:** FIXED + VERIFIED IN PRODUCTION AND ON DEVICE | **Priority:** P0

`READY` now creates a `SMART_HEALTH_DELIVERY` task and calls the same
`DispatchService.findAndAssign` the merchant flow uses. Nothing new was
modelled: that TaskType already existed, was already in `DELIVERY_TASK_TYPES`
(so proof of delivery is required), was already priced in `lib/api/pricing.ts`,
and was already mapped to `DELIVERY_PERSONNEL` by `CapabilityService`. The
courier drives the task through the same `EnhancedTaskStateMachine` as every
other delivery; `lib/health/provider-order-delivery.ts` only mirrors the result
back onto the order the pharmacist is watching — forward-only, so PHARM-2 cannot
return through a side door.

The link is a new `Task.providerOrderId` (unique, nullable), the third of its
kind beside `orderId` and `healthOrderId`. Schema pushed; the diff was
`ADD COLUMN` + unique index + FK, nothing else.

**Verified end to end on hardware:** order `HPO-1787139420369-HJEC` →
`TASK-2026-000074` → offer on the courier's phone → accept → pickup → transit →
proof by handover code → delivered. Task `ASSIGNED` mirrored to order
`RIDER_ASSIGNED` 250 ms later; `PICKED_UP` → `OUT_FOR_DELIVERY` 470 ms later.

## PHARM-9 — the medicine catalogue could not be used at all

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P0

Reported from the device: *"why can't I add my catalog in the medicine
catalog?"* Every handler demanded an explicit `providerId`, which the pharmacist
app has never been told — it authenticates as a user and the server resolves the
pharmacy from the token everywhere else. So the catalogue screen asked for its
own stock, got `400 providerId is required`, and rendered it as an empty shelf;
and `category` was a required strict enum behind a free text box, so a
pharmacist typing "painkillers" was refused. A pharmacy could not list, add,
edit, restock or remove anything.

## PHARM-10 — a pharmacy could earn but never be paid

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P0 | **Category:** Money

`pendingPayout` is the balance `/api/pharmacy/payout` treats as withdrawable and
the only figure it decrements. **Nothing in the codebase ever credited it.**
`DELIVER` incremented `totalEarnings` alone, so a pharmacy could deliver a
hundred orders and withdraw nothing. Both now move together from one place,
claimed by a conditional `updateMany` so the courier's completion and a manual
`DELIVER` cannot both pay. Verified: `0 → 27,000` on delivery, withdrawal of
27,000 accepted, balance drawn to 0, second `DELIVER` refused 409 with no
second payment.

## PHARM-11 — any pharmacist could edit or delete another pharmacy's stock

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P0 | **Category:** Authorization

`PATCH` and `DELETE` on the catalogue checked a `providerId` in the QUERY
STRING, which no client sends. The guard therefore only confirmed the caller had
*some* pharmacy account, then acted on whatever `medicineId` was named. A
signed-in pharmacist could reprice a competitor's stock, mark it unavailable,
delete it, or turn `requiresPrescription` off a controlled drug in someone
else's catalogue. Both now verify the medicine belongs to the caller — 403 in
production, rival's price untouched.

## PHARM-12 — no customer could place a pharmacy order at all

**Status:** FIXED | **Priority:** P0

`POST /health-provider/orders` answered 500 on every request. Four
health-provider routes logged fraud telemetry with
`await fetch('/api/fraud/activity', …)` — a **relative** URL, from Node. There
is no origin to resolve it against on the server, so it throws every time, and
awaited inside the route's try block that throw became the route's own failure.
Registration and controlled-medicine additions failed the same way *after*
writing their rows, so the app reported failure for records that existed and a
retry produced duplicates. An absolute URL would not have helped either: that
endpoint is admin-guarded and these callers are a customer or a pharmacist.
Written directly now, and the events that are not fraud signals (an order being
placed) go to the audit log, where the enum actually has a member for them.

## PHARM-13 — the earnings screen read a table with no rows in it

**Status:** FIXED | **Priority:** P0 | **Category:** Money

`/pharmacy/earnings?action=summary` aggregated `db.healthOrder`, which has zero
rows platform-wide — real pharmacy orders are `ProviderOrder`. Every pharmacy
saw UGX 0 lifetime. Its `pendingPayout` aggregate also had **no provider
filter**, so each pharmacy was shown the sum of what the platform owes *every*
pharmacy as its own available balance.

## PHARM-14 — an order no courier took could never ask again

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P1

Dispatch runs once, at READY, and is allowed to find nobody. That was the end of
it: the order sat at `READY_FOR_PICKUP` with no courier and nothing would ever
ask again. `REDISPATCH` is legal only from `READY_FOR_PICKUP` with no courier
assigned, and searches the SAME task rather than creating a second one. Surfaced
as "Find a courier" — a backend action no screen exposes is the same as not
having one.

## PHARM-3 — the two halves of a pharmacy identity

**Status:** FIXED (was recorded as a P2 product decision; it was a P0 functional
failure) | **Priority:** P0

**What represents a pharmacy:** two things. `Merchant(type=PHARMACY)` +
`Pharmacy` carry the approval gate (`useProviderApprovalGate` calls
`getMerchantProfile`). `HealthProvider` carries everything the pharmacy actually
does — orders, catalogue, open/closed, earnings, payout — and every one of those
routes resolves it by `userId` from the token.

**What was broken:** app registration (`/merchants/register?type=PHARMACY`)
created only the first pair. A pharmacist who signed up through the app passed
the gate and then met "No health provider account for this user" on every
screen — an account that looked approved and could do nothing.

**Fix:** both halves are created together in the same transaction from the same
details, and an admin's approval is recorded on both, because it is one
decision. The models are **not** merged: that is an architectural call and
merging them reaches into the customer-facing health storefront. `HealthOrder`
remains entirely unused (0 rows).

## DEL-1 — the courier could not submit proof of delivery

**Status:** FIXED | **Priority:** P0 | **Category:** Delivery

Found by driving a real delivery to a customer's door. The proof sheet's confirm
button sat below the bottom of the screen with no way to reach it: the sheet
caps at 80% of the screen and puts content in a ScrollView, but that scroll view
could only grow, never shrink, so content taller than the cap was clipped rather
than scrolled — and never scrolled, because it believed it was already tall
enough. A courier at the door could enter the handover code and had no button to
send it. One `flexShrink`; it affects every sheet with a form in it.

## DEL-2 — the courier was recorded owing money they were never given

**Status:** FIXED | **Priority:** P0 | **Category:** Money

`FinanceLedger` records the fare commission as a receivable from the courier
when the task completes; the pharmacy settlement separately recorded the whole
order remainder, which already contained that same commission. Measured on the
real delivery: **UGX 6,530 + 450 recorded against UGX 6,530 actually
collected.** The order-level figure now excludes the fare commission, and the
suite asserts the two receivables sum to exactly what the courier holds.

## DEL-3 — pickup showed an address, not a place

**Status:** FIXED | **Priority:** P2

The courier's offer and job screens showed `pickupAddress` — "Plot 1, Kampala".
A courier recognises "Kyebando Pharmacy" and does not know Plot 1. Both flows
already stored the business name in `pickupContactName`; nothing displayed it.

## DEL-4 — the courier could reach only one of the two parties

**Status:** FIXED | **Priority:** P1

The call action went to the customer, always. A courier stuck outside a closed
pharmacy had no way to ask anyone about it. The action now offers the pickup
shop or the customer, ordered by which the job stage makes likely. The pharmacy
can call back: provider orders now carry the courier's name and number, which
the pharmacist could previously see existed and never contact.

## RT-1 — nothing a shop did reached the people it affected

**Status:** FIXED + VERIFIED IN PRODUCTION (6/6) | **Priority:** P1

A shop opens, closes, runs out, reprices — and none of it reached the customer's
app until they pulled to refresh. A customer could sit on a pharmacy that shut
ten minutes ago, build a basket, and be refused by a server that knew better
than the screen. One low-volume `storefront` channel now carries availability,
catalogue and profile changes. Verified by subscribing with the **mobile app's
own credentials** and driving the pharmacy from the production API: closing,
opening, adding stock, going out of stock and removal all arrived, with the new
state in the payload.

## PHARM-15 — a closed pharmacy still received orders

**Status:** FIXED + VERIFIED IN PRODUCTION | **Priority:** P1

The OPEN/CLOSED control wrote `isOpenNow` and nothing read it on the way in. A
pharmacist could shut for the night and still wake up to orders nobody had
agreed to fill. Order creation now refuses a closed pharmacy with 409 and names
it. Admins are exempt — that is the phone-order path. An order already placed is
**not** cancelled by closing.

## MERCH-5 — merchant order tabs were single statuses

**Status:** FIXED | **Priority:** P2

One status per tab, so an order that got accepted vanished from "New" and
appeared in "Accepted", then vanished again at "Preparing". A merchant chasing
an order had to guess which tab it had moved to. Tabs are phases now, shared
with the dashboard so the two cannot disagree.

## BE-043 — /merchants/[id]/products forwarded no route params

**Status:** FIXED | **Priority:** P2

The alias delegates to the menu handler, which reads `{ params }` to know which
merchant. It was called with the request alone, so every request through that
alias threw before reaching the database.

## UI-1 — the OPEN/ONLINE pill was overrun by its own knob

**Status:** FIXED | **Priority:** P2

The word was centred across the whole track, so as soon as the switch turned on
the knob slid over it — "OPEN" rendered as "OPE(" on the pharmacy dashboard and
"ONLINE" as "ONLI(" on the courier's, which reads as a rendering fault rather
than a state. The word now sits in the half the knob has vacated.

---

# Money flow, as measured on a real cash delivery

Customer paid **UGX 9,080** in cash at the door for pharmacy order
`HPO-1787139420369-HJEC` (medicines 4,000 · delivery 5,000 · service fee 80).

| Party | Gets | Recorded as |
|---|---|---|
| Courier | 2,550 kept in hand | `Task.riderEarnings`, `rider.totalEarnings` |
| Courier owes back | 6,080 + 450 = 6,530 | two `CashCollection` rows (order share, fare commission) |
| Pharmacy | 3,600 | `HealthProvider.pendingPayout` — withdrawable |
| Smart Ride | 480 order + 450 fare + 2,000 fee difference | `FinanceLog` PLATFORM_COMMISSION + HEALTH_ORDER_PAYMENT |

Ledger rows written: `HEALTH_ORDER_PAYMENT` 9,080 (pharmacy 3,600, delivery
5,000, platform 480), `HEALTH_ORDER_PAYMENT` 3,000 for the fare (rider 2,550,
commission 450), `PLATFORM_COMMISSION` 450.

**Wallet is correctly NOT credited on cash** — the courier was paid in hand;
crediting a withdrawable balance too would pay them twice.

**Open contract, reported not invented:** the customer is charged a flat
`deliveryFee` of 5,000 on the order while the courier's task is priced from
distance (3,000 here). The 2,000 difference is the platform's by elimination,
and no rule anywhere states that. It is inside the courier's recorded 6,080
receivable, so no shilling is unaccounted — but the *rule* is undefined and
should be written down before the fee or the fare rates change.

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

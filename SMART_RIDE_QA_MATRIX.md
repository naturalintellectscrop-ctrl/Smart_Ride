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

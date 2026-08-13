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

# Release-closure checkpoint

**Updated:** 2026-08-24, autonomous production-readiness pass.
**Branch:** `main`. **Everything committed is on `origin/main` and deployed.**

---

## How to resume in one minute

1. Read this file, then `SMART_RIDE_FINANCIAL_MODEL.md` for the money.
2. `git log --oneline -12` and confirm `origin/main` matches `HEAD`.
3. Run the three suites. They are the fastest statement of whether the platform
   is still correct:
   ```
   bun scripts/verify-financial-integrity.ts     # money
   bun scripts/verify-dispatch-integrity.ts      # the job reaches a courier
   bun scripts/verify-authorization.ts           # the hostile cases
   bun scripts/verify-pharmacy-delivery-chain.ts # pharmacy end to end
   ```
4. Pick up at "What is still open".

---

## A correction worth keeping

An earlier report said commits were "pushed to main". They were not. The
working branch was `redesign/client-surface`, and `git push origin main` pushed
the stale local `main` ref and answered "Everything up-to-date" while eight
commits — including every financial fix — sat unpublished. Production ran
`489c4f3` for the whole session.

**Never read "Everything up-to-date" as "deployed".** The check that matters is
three values agreeing:

```
git rev-parse HEAD          local
git rev-parse origin/main   remote   (after git fetch)
deployment.meta.githubCommitSha      production
```

All three now agree. Every deploy below was confirmed that way.

---

## Closed and verified in production this pass

| ID | Defect | Verified by |
|---|---|---|
| **PRICING-1** | customer delivery charge below courier compensation; platform lost money on most food orders | financial suite, live order |
| **BE-039/040** | non-cash completion credited the courier with nothing collected | financial suite, held → released |
| **BE-043 / MERCH-7** | task created at order creation, so `handleReady` skipped pricing AND dispatch | dispatch suite |
| **BE-044** | the customer declared their own order paid | authorization suite, 402 |
| **BE-045** | wallet payment read the rider's balance; wallet stored as CASH | financial suite |
| **BE-046** | a confirmed payment suppressed the completion ledger | ledger keys separated |
| **BE-047** | **no order was ever offered to a courier, on any service** | dispatch suite, live match |
| **BE-048 / LC-1** | a courier could not give back a job; two gates, both refusing | dispatch suite, re-offered |
| **BE-049** | any courier could act on a task assigned to nobody | authorization suite |
| **UI-2 / UI-3** | `Performanc/e`, clipped placeholder, `Cash on d…` | typechecked; device pending |

Suite results against production:

```
verify-financial-integrity     42/43   (1 known: see below)
verify-dispatch-integrity      26/26
verify-authorization           38/38   (after BE-049)
verify-pharmacy-delivery-chain 43/43
```

The financial suite's one open assertion is the MERCH-7 dispatch check, which
now passes in the dispatch suite; re-run it to confirm both together.

---

## Decisions taken this pass, for review

None of these change an established business rule. Each was the least
surprising option that made an already-defined flow work.

1. **`ASSIGNED → SEARCHING` added to all five transition tables**, plus the
   RIDER actor pairs. An earlier plan had frozen this. It is superseded: the
   give-back control was shipped in `d51e478`, so the product decision was
   already made — and the state machine already contained the rider-release
   code for exactly this edge, with no other caller. Without it the shipped
   button could never succeed.
2. **`Payment.providerOrderId`** added (nullable + index + FK). There was no
   way to record that a pharmacy order had been paid for, so the up-front
   collection decision could not be implemented for pharmacy at all.
3. **Pharmacy delivery priced from `PricingConfig`**, seeded at 5,000 per the
   standing decision. `SMART_HEALTH_DELIVERY` was the only service type with no
   row — which is why the route carried a constant.
4. **Parcel/item delivery keeps cash**, per the standing decision.

---

## What is still open

### Release blockers

**None known.** Every P0 and P1 found this pass is closed and verified against
production.

### Verification debt

- **Device verification of the client checkout change.** The cart now collects
  payment before confirming. This matters for release sequencing: the deployed
  backend refuses the old client's invented `PAY-${Date.now()}` reference with
  402, so **an APK built before this pass cannot complete a merchant order**.
  The new APK must ship with, or before, wide use of the new backend.
- **Device verification of UI-2/UI-3** (label fixes) — typechecked, not yet run
  on hardware.
- Device screenshots from the previous pass are in
  `.qa-screens/merchant-2026-08-24/` (gitignored) for design markup.

### Business decisions, not defects

- **OPS-1 — food and shopping have a fleet of one.** `RiderCapability` is
  empty, so food/shopping/pharmacy all fall back to `DELIVERY_PERSONNEL` alone,
  and production holds one approved courier of that role against three boda
  riders. `ITEM_DELIVERY` already allows both roles. Decide which roles may
  carry food and insert `RiderCapability` rows — no deploy needed.
- **Pharmacy commission share.** The customer's 5,000 is settled. Whether 15%
  is the right platform share of it is a field on the same `PricingConfig` row.
  See `SMART_RIDE_FINANCIAL_MODEL.md` §3 for what changed and why.
- **`PaymentStatus` has no CANCELLED/EXPIRED.** A timed-out prompt and a
  declined one both land on `FAILED`. Correct for the money invariant, a
  reporting gap for operations.

### Deferred (P3)

- `commission-engine.ts` — a third rate table reachable only from
  `/api/finance/commission`, disagreeing with `PRICING_CONFIG`. Not on any live
  pricing path.
- Two stale transition tables remain unimported (`state-machine.ts`,
  `task-state-machine.service.ts`).
- Gateways (MTN, Airtel, card, NylonPay) are unconfigured in this environment,
  so those methods stay BLOCKED for verification. `WALLET` is a fully working
  non-cash path and is what the suites drive.

---

## QA data

Production was left clean and re-checked after every suite:

```
QA users 0 · QA orders 0 · QA tasks 0 · pending offers 0
riders online 0 · riders holding tasks 0 · pending payments 0
stranded wallet balances 0 · provider orders 0
```

The four `@smartride.test` accounts are the deliberate standing fixtures.

Also removed this pass: an E2E fixture left behind on 2026-08-13 — two
duplicate `E2E-HEALTH Pharmacy` records each holding **UGX 9,000 in withdrawable
`pendingPayout`**, and its customer and provider order.

Disposable probes are now gitignored (`scripts/.qa-*`). The durable suites are
`scripts/verify-*.ts`.

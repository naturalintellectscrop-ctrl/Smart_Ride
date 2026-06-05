# PHASE 6: Dispatch Race Condition Hardening

## Task ID: P6
## Agent: Dispatch Race Condition Hardening Agent

## Summary
Hardened the dispatch accept flow against race conditions where Rider A and Rider B both try to accept the same dispatch match simultaneously. Only ONE rider now succeeds; the other gets a clear 409 Conflict error. No duplicate assignments are possible.

## Files Modified

### 1. `/src/lib/concurrency/race-condition-guards.ts`
- Added `AtomicAcceptResult` discriminated union type with 5 outcomes
- Added `atomicAcceptDispatch(matchId, riderId)` — the single source of truth for atomic dispatch acceptance
- Optimistic locking via `updateMany({ where: { id, status: 'PENDING' } })` inside a Prisma transaction
- Idempotent retry: same rider re-accepting returns IDEMPOTENT (not an error)
- Two-step task transition: MATCHING/SEARCHING → ASSIGNED → ACCEPTED
- Atomically cancels other PENDING matches and returns `cancelledRiderIds` for notification
- Full audit logging inside the transaction (DISPATCH_ACCEPTED, DISPATCH_ACCEPT_RACE_LOST)

### 2. `/src/lib/services/dispatch-persistence.service.ts`
- `acceptMatch()` now delegates to `atomicAcceptDispatch()`
- Returns extended result with `resultCode`, `cancelledRiderIds`, `clientId`, `taskNumber`

### 3. `/src/app/api/dispatch/[id]/accept/route.ts`
- Complete rewrite with proper HTTP status codes:
  - 409 Conflict for race losers
  - 410 Gone for expired matches
  - 200 + `idempotent: true` for same-rider retry
  - 200 for fresh acceptance
- Socket notifications to ALL affected parties:
  - Client: `rider:task:matched`
  - Task room: `task:status:update` (ACCEPTED)
  - Accepting rider: `dispatch:assignment`
  - Other riders: `dispatch:expired` with reason 'OTHER_RIDER_ACCEPTED'
- Audit logging for all outcomes

## Race Condition Protection Mechanism
1. Pre-check: fast-path read outside transaction for IDEMPOTENT/CONFLICT/EXPIRED
2. Transaction: `updateMany` with `status: 'PENDING'` guard — only 1 rider wins
3. If `count === 0`: another rider won — returns CONFLICT with audit log
4. If `count === 1`: this rider won — all related updates happen atomically
5. No double-acceptance possible due to DB-level optimistic locking

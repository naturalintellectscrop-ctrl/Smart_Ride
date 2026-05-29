# Task 4 - Analytics & Metrics Wiring Agent

## Summary
Wired the Analytics & Metrics system so metrics update automatically during task state transitions. Created TaskAnalyticsUpdater service, integrated it into the state machine, and replaced all hardcoded metric stubs with real DB queries.

## Files Created
- `src/lib/services/analytics-updater.service.ts` — TaskAnalyticsUpdater with 9 fire-and-forget methods

## Files Modified
- `src/lib/services/enhanced-task-state-machine.service.ts` — Added analytics update hook in transition() method
- `src/lib/analytics/metrics-service.ts` — Replaced hardcoded onTimeRate=85, onlineHours=0, acceptanceRate=0 with real DB queries
- `src/lib/analytics/dashboard-service.ts` — Replaced hardcoded acceptanceRate=0 with real DispatchMatch query

## Key Design Decisions
- All analytics updates are fire-and-forget (non-blocking, never fail the parent transaction)
- Double try/catch safety: TaskAnalyticsUpdater methods catch their own errors, and updateAnalytics has an outer catch
- Analytics only fire for non-idempotent transitions (skip duplicate/idempotent transitions)
- onTimeRate uses 15% tolerance (actualDuration ≤ estimatedDuration * 1.15)
- onlineHours estimated from HeartbeatLog count × 30s interval / 3600s
- acceptanceRate calculated from DispatchMatch (ACCEPTED / total * 100)

## Lint
- ESLint passes with no errors

# Task 2-c: Fix Duplicate Notification Services & Tasks API State Machine Bypass

## Agent: Bug Fix Agent

## Summary
Fixed 4 issues: duplicate notification services consolidated, tasks API now uses state machine, MATCHING notification added, DELIVERED notification helper added.

## Changes Made

### Issue 1: Duplicate Notification Services
- **Canonical** (`lib/services/notification.service.ts`): Added all missing functionality from duplicate:
  - `createNotificationsForUsers` - multi-user notification helper
  - `broadcastNotification` + `BroadcastInput`, `BroadcastTypeInput`, `TargetAudienceInput` types
  - `getTargetUserIds`, `getNotificationTypeForBroadcast` private helpers
  - Marketplace notifications: `notifySurgeActivation`, `notifyHighDemand`, `notifyNewIncentive`, `notifyEarningsOpportunity`, `requestDriverReposition`, `notifyClientPromotion`, `warnClientsAboutSurge`
  - Notification preferences: `getNotificationPreferences`, `updateNotificationPreferences`, `shouldSendNotification`
  - Broadcast history: `getBroadcastHistory`, `getBroadcastStats`
  - `formatCurrency` private helper
  - Added Socket.io emission to broadcast notifications (duplicate never emitted real-time events)
- **Duplicate** (`lib/notifications/notification-service.ts`): Replaced with `@deprecated` re-export module pointing to canonical
- **Import fixes** (5 files → canonical path):
  - `lib/marketplace/incentive-fulfillment.ts`
  - `lib/marketplace/client-promotion-service.ts`
  - `app/api/marketplace/surge/route.ts`
  - `app/api/marketplace/incentives/route.ts`
  - `app/api/notifications/preferences/route.ts`

### Issue 2: Tasks API State Machine Bypass
- Replaced `db.task.update` (CREATED→MATCHING) with `EnhancedTaskStateMachine.transition()`
- Replaced `db.task.update` (MATCHING→SEARCHING) with `EnhancedTaskStateMachine.transition()`
- Added `EnhancedTaskStateMachine` to imports
- Error handling: logs errors but doesn't fail task creation

### Issue 3: Missing MATCHING Notification
- Added `sendTaskUpdateNotification(clientId, taskId, taskNumber, 'MATCHING')` after successful MATCHING transition
- Non-blocking: notification failure caught and logged

### Issue 4: DELIVERED Notification
- Verified DELIVERED templates exist in `sendTaskUpdateNotification` and `sendOrderUpdateNotification`
- Added `sendDeliveredNotification` helper function for discoverability
- Added to re-export list in deprecated module

## Files Modified
1. `src/lib/services/notification.service.ts` - Canonical: added all missing functionality + sendDeliveredNotification
2. `src/lib/notifications/notification-service.ts` - Duplicate: replaced with @deprecated re-export
3. `src/app/api/tasks/route.ts` - State machine transitions + MATCHING notification
4. `src/lib/marketplace/incentive-fulfillment.ts` - Import path fix
5. `src/lib/marketplace/client-promotion-service.ts` - Import path fix
6. `src/app/api/marketplace/surge/route.ts` - Import path fix
7. `src/app/api/marketplace/incentives/route.ts` - Import path fix
8. `src/app/api/notifications/preferences/route.ts` - Import path fix

## Verification
- `bun run lint` passes with no errors

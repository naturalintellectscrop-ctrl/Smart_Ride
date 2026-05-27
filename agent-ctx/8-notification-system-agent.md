# Task 8: Verify and Complete Notification System

## Agent: Main Agent
## Date: 2024-01-XX

## Task Summary
Verify and complete the notification system for Smart Ride, including adding missing notification templates, fixing auth protection on API routes, wiring dispatch events to create DB notifications, and fixing the unread count flow.

## Changes Made

### 1. Notification Templates (notification.service.ts)
- Added 7 missing templates: SEARCHING, MATCHING, REASSIGNED, ARRIVING, PICKED_UP, IN_PROGRESS, FAILED
- Added `sendDispatchReassignedNotification()` helper function
- Added `sendSearchingNotification()` helper function

### 2. Auth Protection on API Routes
- `/api/notifications/route.ts` POST: Added `getAuthUser()` check
- `/api/notifications/read/route.ts`: Rewrote to use auth-derived userId instead of body userId (IDOR fix)
- `/api/notifications/token/route.ts` POST/DELETE: Added `getAuthUser()` check
- `/api/notifications/preferences/route.ts` GET/PATCH: Rewrote to use auth-derived userId (IDOR fix)

### 3. DB Notifications for Dispatch Events (dispatch-persistence.service.ts)
- `handleNoRidersAvailable()`: Added `sendSearchingNotification()` call
- `processExpiredMatches()`: Added `sendDispatchReassignedNotification()` call when reassigning
- `autoCancelTask()`: Added `sendTaskUpdateNotification(..., 'CANCELLED')` call

### 4. Task Transition Notification Statuses (transition/route.ts)
- Expanded notification statuses from 7 to 14
- Added REASSIGNED, PICKED_UP, IN_PROGRESS, FAILED to rider notification statuses

### 5. Unread Count Fix (rider-messages.tsx)
- Removed `setUnreadCount(totalUnread)` that was overriding API-fetched count
- Removed unused `useNotifications` and `useEffect` imports

### 6. Prisma Schema (schema.prisma)
- Added `NotificationPreference` model with all preference fields
- Added `NotificationBroadcast` model for admin broadcast notifications
- Added `notificationPreference` relation to User model

## Files Modified
- `src/lib/services/notification.service.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/read/route.ts`
- `src/app/api/notifications/token/route.ts`
- `src/app/api/notifications/preferences/route.ts`
- `src/lib/services/dispatch-persistence.service.ts`
- `src/app/api/tasks/[id]/transition/route.ts`
- `src/components/smart-ride/dashboards/tabs/rider-messages.tsx`
- `prisma/schema.prisma`

## Verification
- Lint passes with no errors
- Dev server starts correctly
- Prisma client regenerated successfully
- DB push fails (Render free-tier unreachable - known issue from previous sessions)

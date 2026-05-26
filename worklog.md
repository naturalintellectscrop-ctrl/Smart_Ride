# Smart Ride - Parcel Delivery Flow Verification Report

## EXECUTIVE SUMMARY

**Date**: 2025-03-04
**Scope**: Full parcel delivery lifecycle verification
**Method**: Static code analysis tracing every file, API call, database write, and event

**OVERALL RESULT**: ❌ **FAIL** — The parcel delivery flow is **NOT operational** end-to-end. Critical gaps exist in dispatch automation, notification wiring, and real-time communication.

---

## DETAILED STEP-BY-STEP VERIFICATION

### STEP 1: Customer Login

| Aspect | Detail |
|--------|--------|
| **Verdict** | ✅ **PASS** |
| **Frontend File** | `expo-app/app/auth/login.tsx` |
| **Frontend Service** | `expo-app/services/auth.ts` → `loginWithEmail()` |
| **API Endpoint** | `POST /api/auth/login` |
| **Backend Handler** | `src/app/api/auth/login/route.ts` |
| **Auth Service** | `src/lib/services/auth.service.ts` → `loginUser()` |
| **Session Service** | `src/lib/auth/session-service.ts` → `createSession()` |
| **Database Tables** | `User` (credential verification), `Session` (session creation) |
| **Audit Log** | ✅ `securityAudit.log({ action: 'LOGIN_SUCCESS' })` in `src/lib/security/audit-log.ts` |
| **Token Storage** | `AsyncStorage` (access + refresh tokens) + `useAuthStore.login()` |

**Evidence**: Complete chain from UI → API → DB → audit. Login correctly returns `accessToken` and `refreshToken`. Security audit logs both success and failure.

---

### STEP 2: Create Parcel Task

| Aspect | Detail |
|--------|--------|
| **Verdict** | ✅ **PASS** |
| **Frontend File** | `expo-app/app/delivery/index.tsx` → `handleSubmit()` |
| **Store Action** | `useTaskStore.setPendingTask(response.data)` |
| **API Service** | `expo-app/src/services/api.ts` → `api.requestRide()` |
| **API Endpoint** | `POST /api/tasks` |
| **Backend Handler** | `src/app/api/tasks/route.ts` → `POST` handler |
| **Validation** | Zod `createTaskSchema` validates all fields |
| **Pricing** | `calculatePricing()` from `enhanced-task-state-machine.service.ts` |
| **Database Write** | `db.task.create()` with status `CREATED` |
| **Status Update** | Immediately updated to `MATCHING` with `matchingStartedAt` |
| **Audit Log** | ✅ `createAuditLog({ action: AuditActions.TASK_CREATED })` |

**Payload sent from frontend**:
```typescript
{
  taskType: 'ITEM_DELIVERY',
  clientId: user.id,
  pickupAddress, pickupLatitude, pickupLongitude,
  dropoffAddress, dropoffLatitude, dropoffLongitude,
  distanceKm, paymentMethod,
  packageDescription, deliveryType,
}
```

**Evidence**: Full chain works. Task is created in DB with pricing calculated server-side. Audit log created. Status goes CREATED → MATCHING.

---

### STEP 3: Task Saved in Database

| Aspect | Detail |
|--------|--------|
| **Verdict** | ✅ **PASS** |
| **Database Table** | `Task` model in Prisma schema (line 329-407) |
| **Key Fields Written** | `taskNumber` (auto-generated), `taskType`, `status`, `clientId`, pickup/dropoff addresses & coords, `distanceKm`, pricing fields, `paymentMethod`, `paymentStatus: 'PENDING'`, `matchingStartedAt` |
| **Database** | Supabase PostgreSQL |

**Evidence**: `db.task.create()` with all validated fields. Task persists with unique `taskNumber` from `generateTaskNumber()`.

---

### STEP 4: Dispatch Record Created

| Aspect | Detail |
|--------|--------|
| **Verdict** | ❌ **FAIL** |
| **Root Cause** | After task creation, `POST /api/tasks` sets status to `MATCHING` but **NEVER calls any dispatch service** |
| **Backend Code** | `src/app/api/tasks/route.ts` line ~245: "Start matching process (in background - would normally be a job queue)" — only sets status to MATCHING |
| **Missing Call** | Should call `DispatchService.findAndAssign()` from `src/lib/services/dispatch-persistence.service.ts` |
| **Available Endpoint** | `POST /api/dispatch/assign` exists and works, but is never auto-triggered |
| **Impact** | No `DispatchMatch` record is created. No rider is found. Task stays in MATCHING forever. |

**Exact file**: `src/app/api/tasks/route.ts`  
**Exact reason**: The POST handler creates a task and updates status to MATCHING but has a comment "// For now, we just update status to MATCHING" with no actual dispatch call.  
**Exact fix**: After `db.task.update({ status: 'MATCHING' })`, call `DispatchService.findAndAssign()`:
```typescript
// After task is set to MATCHING:
try {
  const dispatchResult = await DispatchService.findAndAssign({
    taskId: matchingTask.id,
    taskType: matchingTask.taskType,
    pickupLatitude: matchingTask.pickupLatitude,
    pickupLongitude: matchingTask.pickupLongitude,
  });
  // Dispatch created - DispatchMatch record in DB
} catch (dispatchError) {
  console.error('Auto-dispatch failed:', dispatchError);
}
```

---

### STEP 5: Rider Receives Task

| Aspect | Detail |
|--------|--------|
| **Verdict** | ❌ **FAIL** |
| **Root Cause 1** | No auto-dispatch means no DispatchMatch is created, so no rider is ever notified |
| **Root Cause 2** | No socket.io server is running. The frontend `socket.service.ts` tries to connect to `wss://smartrideug.vercel.app/api` but Vercel serverless functions don't support WebSocket connections |
| **Frontend Code** | `expo-app/src/services/socket.service.ts` → `connect()` tries `io(wsUrl, ...)` but no server listens |
| **Driver Screen** | `expo-app/app/driver/index.tsx` listens for `socketService.on('driver:request', ...)` which never fires |
| **Fallback** | No HTTP polling fallback for the driver screen to check for pending dispatches |

**Exact file**: `expo-app/src/services/socket.service.ts`  
**Exact reason**: Socket.io client connects to API URL, but there's no socket.io server running. Vercel doesn't support WebSocket.  
**Exact fix**: Implement an HTTP polling fallback in the driver screen. Add a periodic check for pending dispatch matches:
```typescript
// In app/driver/index.tsx, add polling for pending dispatches
useEffect(() => {
  if (!isOnline) return;
  const interval = setInterval(async () => {
    try {
      const response = await api.getAvailableTasks(); // Need this endpoint
      if (response.success && response.data?.length > 0) {
        // Convert to IncomingRequest format and show modal
      }
    } catch (e) {}
  }, 5000);
  return () => clearInterval(interval);
}, [isOnline]);
```

---

### STEP 6: Rider Accepts Task

| Aspect | Detail |
|--------|--------|
| **Verdict** | ⚠️ **PARTIAL** |
| **Frontend File** | `expo-app/app/driver/index.tsx` → `handleAcceptRequest()` |
| **Mechanism Used** | Direct `fetch()` to `POST /api/tasks/${taskId}/transition` with `toStatus: 'ACCEPTED'` |
| **Backend Handler** | `src/app/api/tasks/[id]/transition/route.ts` |
| **State Machine** | `EnhancedTaskStateMachine.transition(taskId, 'ACCEPTED', context)` |
| **Transition Validation** | Requires current status to be `ASSIGNED` (which requires dispatch first) |
| **Alternative Path** | `POST /api/tasks/[id]?action=accept` also exists with `handleAccept()` |
| **Dispatch Accept** | `POST /api/dispatch/[id]/accept` exists via `DispatchService.acceptMatch()` |
| **Database Tables** | `Task` (status → ACCEPTED), `TaskStateTransition` (record), `DispatchMatch` (status → ACCEPTED) |
| **Audit Log** | ✅ Created in transition route |

**Issue**: The accept flow works IF a dispatch was created and the task is in ASSIGNED status. But since Step 4 fails (no auto-dispatch), the task never reaches ASSIGNED, so acceptance is impossible in the normal flow.

**Evidence of competing mechanisms**: 
1. Driver screen uses `transitionTask()` → `POST /tasks/{id}/transition` (state machine)
2. Tasks API has `POST /tasks/{id}?action=accept` → `handleAccept()` (direct DB update)
3. Dispatch has `POST /dispatch/{id}/accept` → `DispatchService.acceptMatch()` (dispatch match)

These three paths are not coordinated.

---

### STEP 7: State Transitions Occur Correctly

| Aspect | Detail |
|--------|--------|
| **Verdict** | ⚠️ **PARTIAL** |
| **State Machine File** | `src/lib/services/enhanced-task-state-machine.service.ts` |
| **Transition API** | `POST /api/tasks/[id]/transition` → `EnhancedTaskStateMachine.transition()` |
| **Transition Validation** | `isValidTransition()` validates state machine rules |
| **Transition Recording** | `db.taskStateTransition.create()` records each transition |
| **Timestamp Updates** | Each transition updates the corresponding timestamp field (acceptedAt, pickedUpAt, etc.) |
| **Audit Logs** | ✅ Created for each transition |

**Expected ITEM_DELIVERY transition chain** (from code analysis):
```
CREATED → MATCHING → ASSIGNED → ACCEPTED → ARRIVED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
```

**Actual transition chain achievable**:
```
CREATED → MATCHING → (STUCK - no dispatch)
```

**Issue**: The state machine itself is correct, but the automatic trigger from MATCHING → ASSIGNED (via dispatch) is missing. Manual transitions via the transition API work correctly.

**Driver screen flow** (`app/driver/driver-task.tsx`):
```typescript
const TASK_FLOW: Record<TaskStatus, TaskStatus | null> = {
  'ASSIGNED': 'ACCEPTED',
  'ACCEPTED': 'ARRIVED',
  'ARRIVED': 'PICKED_UP',
  'PICKED_UP': 'IN_TRANSIT',
  'IN_TRANSIT': 'DELIVERED',
  'DELIVERED': 'COMPLETED',
};
```

This is correct for the driver-side transitions, but the initial transitions (CREATED → MATCHING → ASSIGNED) are not automated.

---

### STEP 8: Delivery Completed

| Aspect | Detail |
|--------|--------|
| **Verdict** | ⚠️ **PARTIAL** (mechanism works, but unreachable in automated flow) |
| **Frontend File** | `expo-app/app/driver/driver-task.tsx` → `handleButtonPress()` |
| **Final Transition** | `updateStatus('COMPLETED')` → `transitionTask()` → `POST /tasks/{id}/transition` |
| **Backend Handler** | `src/app/api/tasks/[id]/transition/route.ts` → `EnhancedTaskStateMachine.transition(taskId, 'COMPLETED')` |
| **Alternative Path** | `POST /api/tasks/[id]?action=complete` → `handleComplete()` |
| **Database Updates** | Task status → COMPLETED, completedAt timestamp, rider stats (completedTrips++, totalEarnings++) |
| **Audit Log** | ✅ Created |

**Evidence**: The completion mechanism works if the task reaches the right status. The `handleComplete()` function also updates rider stats which is correct.

---

### STEP 9: Completion Recorded in Database

| Aspect | Detail |
|--------|--------|
| **Verdict** | ✅ **PASS** |
| **Database Writes** | |
| `Task` table | `status: 'COMPLETED'`, `completedAt: new Date()`, `actualDuration` |
| `Rider` table | `completedTrips: increment: 1`, `totalTrips: increment: 1`, `totalEarnings: increment: task.riderEarnings` |
| `TaskStateTransition` | Full transition history with fromStatus, toStatus, timestamps |

**Evidence**: `db.task.update()` and `db.rider.update()` are called in `handleComplete()`. The transition API also creates `TaskStateTransition` records.

---

### STEP 10: Audit Logs Created

| Aspect | Detail |
|--------|--------|
| **Verdict** | ✅ **PASS** |
| **Audit Log Table** | `AuditLog` model in Prisma schema |
| **Audit Service** | `src/lib/api/audit.ts` → `createAuditLog()` |
| **Security Audit** | `src/lib/security/audit-log.ts` → `securityAudit.log()` |
| **Mobile Audit** | `expo-app/src/services/audit.service.ts` → `api.logActivity()` |

**Audit events created during parcel flow**:
| Event | Action | Source |
|-------|--------|--------|
| Task Created | `TASK_CREATED` | `tasks/route.ts` |
| Task Accepted | `TASK_ACCEPTED` | `tasks/[id]/route.ts` |
| Task Started | `TASK_STARTED` | `tasks/[id]/route.ts` |
| Task Completed | `TASK_COMPLETED` | `tasks/[id]/route.ts` |
| Task Cancelled | `TASK_CANCELLED` | `tasks/[id]/route.ts` |
| State Transition | `TASK_ASSIGNED/ACCEPTED/STARTED/COMPLETED/CANCELLED` | `tasks/[id]/transition/route.ts` |
| Login Success | `LOGIN_SUCCESS` | `auth/login/route.ts` |
| User Registered | `USER_REGISTERED` | `auth/register/route.ts` |
| Dispatch Created | `DISPATCH_CREATED` | `dispatch/route.ts` |
| Dispatch Assigned | `DISPATCH_ASSIGNED` | `dispatch/assign/route.ts` |

**Evidence**: All critical events produce audit logs in the `AuditLog` table. The mobile audit service also batches logs from the app side.

---

### STEP 11: Notifications Created

| Aspect | Detail |
|--------|--------|
| **Verdict** | ❌ **FAIL** |
| **Notification Service** | `src/lib/notifications/notification-service.ts` exists with full functionality |
| **Notification Table** | `Notification` model in Prisma schema |
| **Root Cause** | The notification service is **NEVER called** during the task lifecycle |
| **Missing Calls** | |
| Task Created | No notification to client ("Your delivery request has been created") |
| Dispatch Assigned | No notification to client ("A rider has been assigned") |
| Task Accepted | No notification to client ("Rider is on the way") |
| Rider Arrived | No notification to client ("Rider has arrived at pickup") |
| Task Completed | No notification to client ("Delivery completed!") |
| Task Cancelled | No notification to client ("Your delivery has been cancelled") |

**Exact file**: `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/transition/route.ts`  
**Exact reason**: Neither the task creation route nor the transition route calls any notification function. The `notification-service.ts` has `createNotification()` and `createNotificationsForUsers()` but these are orphaned — no code invokes them in the task flow.  
**Exact fix**: In `src/app/api/tasks/[id]/transition/route.ts`, after successful transition, call:
```typescript
import { createNotification } from '@/lib/notifications/notification-service';

// After successful transition:
await createNotification({
  userId: task.clientId,
  title: 'Delivery Update',
  message: `Your delivery is now ${toStatus}`,
  type: 'TASK_UPDATE',
  referenceId: taskId,
  referenceType: 'TASK',
});
```

---

### STEP 12: Analytics Updated

| Aspect | Detail |
|--------|--------|
| **Verdict** | ⚠️ **PARTIAL** |
| **Analytics Tables** | `TaskAnalytics`, `PlatformMetrics` in Prisma schema |
| **Analytics Services** | `src/lib/analytics/dashboard-service.ts`, `src/lib/analytics/metrics-service.ts` |
| **How Analytics Work** | On-demand queries against live `Task` table data |
| **What Works** | `getActiveTasksCount()`, `getCompletionRate()`, `getRevenueAnalytics()` all query real data |
| **What's Missing** | The `TaskAnalytics` and `PlatformMetrics` tables are NEVER populated — they appear designed for scheduled batch updates that don't exist |

**Evidence**: The analytics services read from the `Task` table directly (e.g., `db.task.count()`, `db.task.findMany()`) so real-time queries work. But the pre-computed analytics tables (`TaskAnalytics` with daily aggregations, `PlatformMetrics` with daily metrics) are not updated.

---

## CRITICAL INFRASTRUCTURE ISSUES

### Issue A: No Socket.io Server (Blocking)

| Aspect | Detail |
|--------|--------|
| **Impact** | Real-time driver notifications, location updates, and status changes don't work |
| **Root Cause** | The app is deployed on Vercel (serverless) which doesn't support persistent WebSocket connections |
| **Frontend Code** | `expo-app/src/services/socket.service.ts` tries to connect to `wss://smartrideug.vercel.app/api` |
| **Current State** | Socket connection silently fails, no fallback in driver screen |

**Fix Required**: Either deploy a separate socket.io server (mini-service) or implement HTTP polling fallback in the driver screen.

### Issue B: No Auto-Dispatch After Task Creation (Blocking)

| Aspect | Detail |
|--------|--------|
| **Impact** | Tasks stay in MATCHING forever, never get assigned to riders |
| **Root Cause** | `POST /api/tasks` has a TODO comment instead of actual dispatch call |
| **Current State** | `DispatchService.findAndAssign()` exists but is never called automatically |

**Fix Required**: Wire `DispatchService.findAndAssign()` into the task creation flow.

### Issue C: Notification Service Not Wired (Non-Blocking but Critical)

| Aspect | Detail |
|--------|--------|
| **Impact** | Users never receive push/in-app notifications about delivery status |
| **Root Cause** | `notification-service.ts` exists with full API but is never called from task/transition routes |
| **Current State** | `Notification` table is empty, no notifications created |

**Fix Required**: Call `createNotification()` in transition routes.

### Issue D: Competing Transition Mechanisms (Architecture)

| Aspect | Detail |
|--------|--------|
| **Path 1** | `POST /api/tasks/[id]/transition` → `EnhancedTaskStateMachine.transition()` (full validation) |
| **Path 2** | `POST /api/tasks/[id]?action=accept/start/complete` → direct DB update (partial validation) |
| **Path 3** | `POST /api/dispatch/[id]/accept` → `DispatchService.acceptMatch()` |
| **Impact** | Different code paths may produce inconsistent state transitions |
| **Frontend Uses** | Path 1 (transition API) in driver screens, which is the correct one |

**Recommendation**: Deprecate Path 2 (action-based routes) and use only Path 1 (state machine transitions) + Path 3 for dispatch-specific operations.

---

## SUMMARY TABLE

| Step | Description | Verdict | File | API Endpoint | DB Table | Audit Log | Notification |
|------|-------------|---------|------|--------------|----------|-----------|--------------|
| 1 | Login | ✅ PASS | `app/auth/login.tsx` | `POST /api/auth/login` | `User`, `Session` | ✅ `LOGIN_SUCCESS` | N/A |
| 2 | Create parcel task | ✅ PASS | `app/delivery/index.tsx` | `POST /api/tasks` | `Task` | ✅ `TASK_CREATED` | ❌ None |
| 3 | Task saved in database | ✅ PASS | `src/app/api/tasks/route.ts` | `POST /api/tasks` | `Task` | ✅ | N/A |
| 4 | Dispatch record created | ❌ FAIL | `src/app/api/tasks/route.ts` | Missing auto-dispatch | `DispatchMatch` (empty) | ❌ | ❌ None |
| 5 | Rider receives task | ❌ FAIL | `app/driver/index.tsx` | No socket/polling | N/A | N/A | ❌ None |
| 6 | Rider accepts task | ⚠️ PARTIAL | `app/driver/index.tsx` | `POST /tasks/{id}/transition` | `Task`, `TaskStateTransition` | ✅ | ❌ None |
| 7 | State transitions correct | ⚠️ PARTIAL | `enhanced-task-state-machine.service.ts` | `POST /tasks/{id}/transition` | `TaskStateTransition` | ✅ | ❌ None |
| 8 | Delivery completed | ⚠️ PARTIAL | `app/driver/driver-task.tsx` | `POST /tasks/{id}/transition` | `Task` | ✅ | ❌ None |
| 9 | Completion in database | ✅ PASS | `src/app/api/tasks/[id]/route.ts` | `POST /tasks/{id}?action=complete` | `Task`, `Rider` | ✅ | ❌ None |
| 10 | Audit logs created | ✅ PASS | Multiple routes | Multiple | `AuditLog` | ✅ | N/A |
| 11 | Notifications created | ❌ FAIL | N/A (never called) | N/A | `Notification` (empty) | N/A | ❌ Never called |
| 12 | Analytics updated | ⚠️ PARTIAL | `metrics-service.ts` | On-demand queries | Live queries work, aggregate tables empty | N/A | N/A |

---

## PASS/FAIL/PARTIAL COUNT

| Verdict | Count | Steps |
|---------|-------|-------|
| ✅ **PASS** | 5 | 1, 2, 3, 9, 10 |
| ❌ **FAIL** | 3 | 4, 5, 11 |
| ⚠️ **PARTIAL** | 4 | 6, 7, 8, 12 |

**Overall: ❌ FAIL** — 3 steps completely fail, making the automated parcel delivery flow inoperable.

---

## REQUIRED FIXES (Ordered by Priority)

### Fix 1: Auto-dispatch after task creation (Unblocks Steps 4-8)
**File**: `src/app/api/tasks/route.ts`  
**Change**: After setting status to MATCHING, call `DispatchService.findAndAssign()`

### Fix 2: HTTP polling for driver incoming requests (Unblocks Step 5)
**File**: `expo-app/app/driver/index.tsx`  
**Change**: Add polling interval to check for pending dispatch matches when online

### Fix 3: Wire notifications into task transitions (Unblocks Step 11)
**File**: `src/app/api/tasks/[id]/transition/route.ts`  
**Change**: Call `createNotification()` after each successful transition

### Fix 4: Backend endpoint for driver pending dispatches (Supports Fix 2)
**File**: New route `src/app/api/tasks/available/route.ts`  
**Change**: Create endpoint that returns pending dispatch matches for the authenticated rider

---
Task ID: 1
Agent: Code Inspector - Task Creation & Dispatch Flow
Task: Inspect task creation to dispatch code path

Work Log:
- Read `src/app/api/tasks/route.ts` (274 lines) — full task creation handler
- Listed and read all 3 files in `src/lib/dispatch/` (dispatch-engine.ts, scoring-engine.ts, types.ts)
- Listed and read all files in `mini-services/dispatch-service/` (index.ts, scoring-engine.ts, types.ts, package.json)
- Searched for DispatchService class — found in `src/lib/services/dispatch-persistence.service.ts`
- Read `src/lib/services/enhanced-task-state-machine.service.ts` (607 lines)
- Searched for DispatchMatch — found in dispatch-persistence.service.ts, prisma schema, dispatch API routes
- Searched for createDispatch/autoDispatch/auto_dispatch — found in dispatch-engine.ts, client-api.ts, dispatch route
- Read `src/app/api/dispatch/route.ts` (436 lines)
- Read `src/app/api/dispatch/assign/route.ts` (77 lines)
- Read `src/app/api/dispatch/[id]/accept/route.ts` (60 lines)
- Read `src/app/api/dispatch/[id]/reject/route.ts` (62 lines)
- Read `src/lib/api/client-api.ts` (531 lines)
- Searched for all importers of DispatchService — found 3 files (assign, accept, reject routes)
- Checked Prisma schema for DispatchMatch model definition

Stage Summary:

## 1. TASK CREATION CODE PATH (src/app/api/tasks/route.ts)

**Exact flow in POST handler (lines 159-273):**
- Line 162-169: Auth check via `requireAuth(request)`
- Line 171-172: Parse & validate body via `createTaskSchema.parse(body)`
- Line 176-183: IDOR check — non-admin must be the client
- Line 186-192: Verify client exists in DB
- Line 195-199: Calculate pricing via `calculatePricing()`
- Line 202-241: `db.task.create()` with status `'CREATED'`
- Line 244-252: `createAuditLog()` with action `TASK_CREATED`
- **Line 254-262**: Status update to `'MATCHING'` with `matchingStartedAt`
  - Comment on line 254: `"// Start matching process (in background - would normally be a job queue)"`
  - Comment on line 255: `"// For now, we just update status to MATCHING"`
  - **NO CALL to any dispatch service** — only a DB status update
- Line 264: Return `successResponse(matchingTask, 'Task created and matching started', 201)`

**CRITICAL FINDING: Task creation does NOT directly call dispatch.** It only sets status to MATCHING. The dispatch service is never invoked.

## 2. DISPATCH SERVICE IMPLEMENTATIONS (3 parallel systems)

### System A: `src/lib/services/dispatch-persistence.service.ts` — DB-backed DispatchService
- **Class**: `DispatchService` (line 72)
- **Key method**: `findAndAssign(request)` (line 76-156) — finds riders, scores them, creates `DispatchMatch` record in DB
- **DispatchMatch creation**: `createDispatchMatch()` (line 203-227) — creates `db.dispatchMatch.create()` with status PENDING
- **Accept flow**: `acceptMatch()` (line 250-333) — updates match to ACCEPTED, task to ASSIGNED, cancels other matches
- **Reject flow**: `rejectMatch()` (line 338-390) — updates match to REJECTED, retries with next rider up to maxRetryAttempts=3
- **Uses**: `CapabilityService.getEligibleRiders()` for rider discovery
- **Called from**: `src/app/api/dispatch/assign/route.ts` line 40 ONLY
- **NOT called from**: task creation route (`/api/tasks`)

### System B: `src/lib/dispatch/dispatch-engine.ts` — In-memory dispatch engine
- **Functions**: `createDispatchRequest()`, `startDispatch()`, `findMatchingProviders()`, `handleOfferAccepted()`, `handleOfferRejected()`
- **Storage**: In-memory Maps (`pendingRequests`, `activeDispatches`, `providerRegistry`)
- **Uses**: `scoreAndRankProviders()` from `src/lib/dispatch/scoring-engine.ts`
- **Called from**: `src/app/api/dispatch/route.ts` — the REST dispatch API
- **NOT called from**: task creation route
- **Note**: Entirely in-memory, no DB persistence, providers must be manually registered

### System C: `mini-services/dispatch-service/index.ts` — Socket.io dispatch service
- **Port**: 3003
- **Mechanism**: WebSocket via Socket.io
- **Key event**: `task:create` (line 963) — creates a PendingTask, calls `matchTaskToProviders()` immediately
- **Matching flow**: `matchTaskToProviders()` → `scoreProvidersForTask()` → sends `task:offer` to riders
- **Storage**: In-memory Maps (`riders`, `pendingTasks`, `dispatchAttempts`)
- **NOT integrated with**: the main Next.js app — this is a standalone service
- **NOT called from**: any Next.js API route

## 3. DispatchMatch CREATION

- **Prisma model**: Defined at schema line 1180, with status enum `DispatchMatchStatus` (PENDING, ACCEPTED, REJECTED, EXPIRED, CANCELLED)
- **Created by**: `DispatchService.createDispatchMatch()` at dispatch-persistence.service.ts line 203-227
- **Called by**: `DispatchService.findAndAssign()` at line 126-132
- **Auto-created**: NO — `findAndAssign()` is only called from `POST /api/dispatch/assign` route (line 40 of assign/route.ts), which is never auto-triggered
- **DispatchMatch is NEVER created automatically after task creation**

## 4. BACKGROUND SERVICE / SCHEDULER

- `DispatchService.processExpiredMatches()` (line 452-480) — checks for expired PENDING matches and retries assignment
- **NOT called by any cron job or scheduler** — only exists as a method, no periodic invocation found
- No background worker, no cron configuration, no job queue found in the codebase

## 5. CLIENT-SIDE DISPATCH INTEGRATION

- `src/lib/api/client-api.ts` has `useCreateDispatch()` hook (line 285-324)
- Calls `POST /api/dispatch?action=create` — which uses System B (in-memory engine)
- **NOT called after task creation** in the frontend — `useCreateTask()` (line 135-168) only calls `POST /api/tasks`
- The two hooks are independent; the frontend would need to chain them manually

## 6. COMPLETE CODE PATH AFTER TASK CREATION

```
POST /api/tasks
  → validate input (Zod)
  → check auth & IDOR
  → calculate pricing
  → db.task.create({ status: 'CREATED' })
  → createAuditLog({ action: TASK_CREATED })
  → db.task.update({ status: 'MATCHING', matchingStartedAt })
  → return response
  → **FLOW ENDS HERE** — nothing else is triggered
```

No dispatch call. No background job. No socket event. No notification.

## 7. WHAT SHOULD HAPPEN (available but disconnected)

```
After db.task.update({ status: 'MATCHING' }):
  → DispatchService.findAndAssign({
      taskId, taskType, pickupLatitude, pickupLongitude
    })
  → This would:
    1. Update task status to SEARCHING
    2. Find eligible riders via CapabilityService
    3. Score and rank riders
    4. Create DispatchMatch record in DB
    5. Send notification to best rider
    6. Return match with expiresAt (30s timeout)
```

This code path exists and works (via `POST /api/dispatch/assign`) but is never automatically triggered after task creation.

---
Task ID: 2
Agent: Code Inspector - Socket Event Matching
Task: Inspect rider assignment socket event matching

Work Log:
- Read all files in `mini-services/dispatch-service/` (index.ts, scoring-engine.ts, types.ts, package.json)
- Read all files in `mini-services/realtime-service/` (index.ts)
- Read all files in `mini-services/heartbeat-monitor/` (index.ts)
- Read `expo-app/src/services/socket.service.ts` (expo mobile socket service)
- Read `src/services/socket.ts` (web app socket service)
- Read `src/hooks/useSocket.ts` (web app socket hooks)
- Read `src/hooks/use-driver-location.ts` (driver location hook — connects to dispatch service port 3003)
- Read `src/hooks/use-heartbeat.ts` (heartbeat hook — connects to heartbeat monitor port 3004)
- Read `src/components/mobile/shared/rider-tracking.tsx` (tracking component — connects to heartbeat monitor port 3004)
- Read `src/components/dashboard/dispatch-monitoring.tsx` (admin dashboard — connects to dispatch service port 3003)
- Read `src/components/admin/connection-monitoring.tsx` (admin connection monitor — connects to heartbeat monitor port 3004)
- Read `expo-app/src/store/taskStore.ts` and `src/store/taskStore.ts`
- Searched for `.emit(` across entire `src/` and `expo-app/` directories
- Searched for `socket.on(` across entire `src/` and `expo-app/` directories
- Read dispatch API routes for socket integration — confirmed no socket.io calls in REST API routes

Stage Summary:

## SOCKET SERVICES ARCHITECTURE

The project has **3 separate Socket.io server services** and **2 separate Socket.io client services**, none of which are fully aligned:

### Server Services:
1. **Dispatch Service** — `mini-services/dispatch-service/index.ts` (port 3003) — handles matching, offers, accept/reject
2. **Realtime Service** — `mini-services/realtime-service/index.ts` (port 3001) — handles task rooms, chat, general events
3. **Heartbeat Monitor** — `mini-services/heartbeat-monitor/index.ts` (port 3004) — handles rider heartbeats, connection status

### Client Services:
1. **Expo App** — `expo-app/src/services/socket.service.ts` — connects to API URL (Vercel, no socket server)
2. **Web App** — `src/services/socket.ts` — connects to SOCKET_URL env variable

### Direct Hook Connections (bypass socket service):
- `src/hooks/use-driver-location.ts` — connects directly to dispatch service port 3003
- `src/hooks/use-heartbeat.ts` — connects directly to heartbeat monitor port 3004
- `src/components/mobile/shared/rider-tracking.tsx` — connects directly to heartbeat monitor port 3004
- `src/components/dashboard/dispatch-monitoring.tsx` — connects directly to dispatch service port 3003
- `src/components/admin/connection-monitoring.tsx` — connects directly to heartbeat monitor port 3004

---

## ALL SOCKET EVENTS FOUND

### A. Dispatch Service (port 3003) — EMITTED (Server → Client)

| # | Event Name | Line | Target | Payload |
|---|-----------|------|--------|---------|
| 1 | `task:offer` | 451, 599 | `rider:{providerId}` room | `{ taskId, taskNumber, taskType, pickupAddress, dropoffAddress, totalAmount, riderEarnings, estimatedDistance, estimatedArrival, expiresAt, score, rank }` |
| 2 | `task:failed` | 408, 538, 634 | `client:{clientId}` room | `{ taskId, reason, message }` |
| 3 | `rider:status` | 711, 741, 1213 | io.emit (broadcast) | `{ riderId, isOnline, location? }` |
| 4 | `rider:online:ack` | 717 | socket (requesting rider) | `{ success: true }` |
| 5 | `rider:offline:ack` | 749 | socket (requesting rider) | `{ success: true }` |
| 6 | `rider:{riderId}:location` | 767 | io.emit (broadcast) | `{ latitude, longitude, speed, heading, battery, timestamp }` |
| 7 | `task:accept:ack` | 789, 825 | socket (accepting rider) | `{ success, task? }` or `{ success: false, error }` |
| 8 | `task:assigned` | 828 | `client:{clientId}` room | `{ taskId, rider: { id, name, role, rating, vehicle } }` |
| 9 | `task:unavailable` | 842 | `rider:{riderId}` room | `{ taskId }` |
| 10 | `task:reject:ack` | 906 | socket (rejecting rider) | `{ success: true }` |
| 11 | `task:{taskId}:status` | 920 | io.emit (broadcast) | `{ status, timestamp, metadata }` |
| 12 | `task:create:ack` | 1007 | socket (creating client) | `{ success, taskId, message }` |
| 13 | `task:cancelled` | 1035 | `rider:{riderId}` room | `{ taskId }` |
| 14 | `task:cancel:ack` | 1051 | socket (cancelling client) | `{ success: true }` |
| 15 | `rider:location` | 1062 | socket (tracker) | `{ riderId, location }` |
| 16 | `admin:stats` | 1086 | socket (admin) | `{ totalRiders, onlineRiders, availableRiders, pendingTasks, byRole, surgeMultiplier }` |
| 17 | `admin:logs` | 1105 | socket (admin) | `DispatchLog[]` |
| 18 | `admin:flag-rider:ack` | 1126 | socket (admin) | `{ success: true }` |
| 19 | `admin:update-safety:ack` | 1154 | socket (admin) | `{ success: true }` |
| 20 | `health-provider:online:ack` | 1191 | socket (health provider) | `{ success: true }` |

### B. Dispatch Service (port 3003) — LISTENED FOR (Client → Server)

| # | Event Name | Line | Expected Payload |
|---|-----------|------|-----------------|
| 1 | `rider:online` | 657 | `{ riderId, name, role, latitude, longitude, rating?, totalTrips?, ... }` |
| 2 | `rider:offline` | 732 | `{ riderId }` |
| 3 | `rider:location` | 755 | `{ riderId, latitude, longitude, speed?, heading?, battery? }` |
| 4 | `task:accept` | 781 | `{ taskId, riderId }` |
| 5 | `task:reject` | 859 | `{ taskId, riderId, reason? }` |
| 6 | `task:status` | 912 | `{ taskId, riderId, status, metadata? }` |
| 7 | `task:complete` | 939 | `{ taskId, riderId }` |
| 8 | `task:create` | 963 | `{ taskId, taskNumber, taskType, clientId, pickupAddress, pickupLocation, ... }` |
| 9 | `task:cancel` | 1026 | `{ taskId, clientId, reason }` |
| 10 | `track:rider` | 1057 | `{ riderId }` |
| 11 | `admin:join` | 1074 | (none) |
| 12 | `admin:stats` | 1082 | (none) |
| 13 | `admin:logs` | 1103 | `{ limit? }` |
| 14 | `admin:flag-rider` | 1111 | `{ riderId, flag, reason? }` |
| 15 | `admin:update-safety` | 1133 | `{ riderId, safetyScore?, fraudRiskScore? }` |
| 16 | `health-provider:online` | 1162 | `{ providerId, name, type, latitude, longitude, ... }` |

### C. Realtime Service (port 3001) — EMITTED (Server → Client)

| # | Event Name | Line | Target | Payload |
|---|-----------|------|--------|---------|
| 1 | `connection:established` | 73 | socket | `{ socketId, userId, timestamp }` |
| 2 | `task:joined` | 89 | socket | `{ taskId }` |
| 3 | `task:status:update` | 101 | `task:{taskId}` room | `{ taskId, status, metadata, timestamp }` |
| 4 | `rider:location:update` | 125, 137 | `task:{taskId}` & `rider:{riderId}` rooms | `{ riderId, latitude, longitude, speed?, heading?, battery?, timestamp }` |
| 5 | `dispatch:new-task` | 165 | `user:{riderId}` room | `{ task, expiresIn, timestamp }` |
| 6 | `dispatch:assignment` | 174 | `task:{taskId}` room | `{ taskId, riderId, timestamp }` |
| 7 | `order:joined` | 188 | socket | `{ orderId }` |
| 8 | `order:status:update` | 193 | `order:{orderId}` room | `{ orderId, status, metadata, timestamp }` |
| 9 | `chat:joined` | 208 | socket | `{ roomId }` |
| 10 | `chat:message:received` | 213 | `chat:{roomId}` room | `{ ...message, timestamp }` |
| 11 | `chat:typing` | 221 | `chat:{roomId}` room (broadcast) | `{ userId, isTyping }` |
| 12 | `admin:joined` | 235 | socket | `{ message }` |
| 13 | `sos:new` | 243 | `admin:dashboard` room | (any data) |
| 14 | `heartbeat:ack` | 258 | socket | `{ received: true, timestamp }` |

### D. Realtime Service (port 3001) — LISTENED FOR (Client → Server)

| # | Event Name | Line | Expected Payload |
|---|-----------|------|-----------------|
| 1 | `task:join` | 85 | `taskId: string` |
| 2 | `task:leave` | 93 | `taskId: string` |
| 3 | `task:status` | 100 | `{ taskId, status, metadata? }` |
| 4 | `rider:location` | 114 | `{ riderId, taskId?, latitude, longitude, speed?, heading?, battery? }` |
| 5 | `rider:track` | 145 | `riderId: string` |
| 6 | `rider:untrack` | 151 | `riderId: string` |
| 7 | `dispatch:request` | 160 | `{ riderId, task, expiresIn }` |
| 8 | `dispatch:assigned` | 173 | `{ taskId, riderId }` |
| 9 | `order:join` | 186 | `orderId: string` |
| 10 | `order:status` | 192 | `{ orderId, status, metadata? }` |
| 11 | `chat:join` | 206 | `roomId: string` |
| 12 | `chat:message` | 212 | `{ roomId, message }` |
| 13 | `chat:typing` | 220 | `{ roomId, isTyping }` |
| 14 | `admin:dashboard` | 232 | (none) |
| 15 | `sos:alert` | 242 | (any data) |
| 16 | `heartbeat` | 251 | `{ riderId, taskId?, latitude, longitude, battery? }` |

### E. Heartbeat Monitor (port 3004) — EMITTED (Server → Client)

| # | Event Name | Line | Target | Payload |
|---|-----------|------|--------|---------|
| 1 | `admin:active-riders` | 68 | socket | `ActiveRider[]` |
| 2 | `rider:location` | 84, 204 | socket / `rider:{riderId}:location` room | `{ riderId, latitude, longitude, speed?, heading?, batteryLevel?, timestamp, connectionStatus }` |
| 3 | `task:location` | 217 | `task:{taskId}:tracking` room | `{ taskId, riderId, latitude, longitude, timestamp }` |
| 4 | `admin:alert` | 367 | `admin` room | `{ id, riderId, taskId, alertType, severity, message, createdAt }` |
| 5 | `rider:{riderId}:status` | 388 | io.emit (broadcast) | `{ riderId, connectionStatus, location?, timestamp }` |
| 6 | `admin:rider:status` | 396 | `admin` room | `{ riderId, connectionStatus, timestamp }` |

### F. Heartbeat Monitor (port 3004) — LISTENED FOR (Client → Server)

| # | Event Name | Line | Expected Payload |
|---|-----------|------|-----------------|
| 1 | `admin:join` | 62 | (none) |
| 2 | `admin:leave` | 72 | (none) |
| 3 | `subscribe:rider` | 78 | `{ riderId }` |
| 4 | `unsubscribe:rider` | 95 | `{ riderId }` |
| 5 | `subscribe:task` | 100 | `{ taskId }` |
| 6 | `heartbeat` | 105 | `{ riderId, taskId?, latitude, longitude, speed?, batteryLevel?, heading? }` |
| 7 | `rider:task:start` | 127 | `{ riderId, taskId }` |
| 8 | `rider:task:end` | 146 | `{ riderId, taskId }` |

### G. Expo App Socket Service — LISTENED FOR (from Server)

| # | Event Name | Line | Used By |
|---|-----------|------|---------|
| 1 | `driver:request` | 130 | Driver screens |
| 2 | `driver:request:expired` | 135 | Driver screens |
| 3 | `driver:request:cancelled` | 140 | Driver screens |
| 4 | `driver:task:updated` | 145 | Driver screens |
| 5 | `rider:task:created` | 154 | Rider screens |
| 6 | `rider:task:matched` | 159 | Rider screens |
| 7 | `rider:driver:location` | 164 | Rider screens |
| 8 | `rider:task:status` | 168 | Rider screens |
| 9 | `rider:task:completed` | 173 | Rider screens |
| 10 | `task:status:changed` | 182 | General |

### H. Expo App Socket Service — EMITTED (to Server)

| # | Event Name | Line | Payload |
|---|-----------|------|---------|
| 1 | `driver:join` | 210 | `{ driverId }` |
| 2 | `driver:leave` | 215 | `{ driverId }` |
| 3 | `driver:location:update` | 225 | `{ latitude, longitude, heading, speed, timestamp }` |
| 4 | `task:join` | 244 | `{ taskId }` |
| 5 | `task:leave` | 249 | `{ taskId }` |
| 6 | `rider:join` | 262 | `{ riderId }` |
| 7 | `rider:leave` | 267 | `{ riderId }` |

### I. Web App Socket Service — LISTENED FOR (from Server)

| # | Event Name | Line | Local Event |
|---|-----------|------|------------|
| 1 | `task:created` | 146 | `task:created` |
| 2 | `task:assigned` | 147 | `task:assigned` |
| 3 | `task:accepted` | 148 | `task:accepted` |
| 4 | `task:status` | 149 | `task:status` |
| 5 | `task:cancelled` | 150 | `task:cancelled` |
| 6 | `task:completed` | 151 | `task:completed` |
| 7 | `location:update` | 154 | `location:update` |
| 8 | `driver:request` | 157 | `driver:request` |
| 9 | `driver:request:expired` | 158 | `driver:request:expired` |
| 10 | `order:status` | 161 | `order:status` |
| 11 | `message:new` | 164 | `message:new` |
| 12 | `sos:alert` | 167 | `sos:alert` |

### J. Web App Socket Service — EMITTED (to Server)

| # | Event Name | Line | Payload |
|---|-----------|------|---------|
| 1 | `join` | 210 | `room: string` |
| 2 | `leave` | 217 | `room: string` |
| 3 | `location:update` | 239 | `{ latitude, longitude, heading?, speed?, batteryLevel? }` |
| 4 | `task:accept` | 244 | `{ taskId }` |
| 5 | `task:decline` | 249 | `{ taskId, reason? }` |
| 6 | `message:send` | 254 | `{ conversationId, content }` |
| 7 | `sos:trigger` | 259 | `{ latitude, longitude, type }` |

### K. Direct Hook Connections (bypass socket service layer)

**use-driver-location.ts** (→ dispatch service port 3003):
| Direction | Event Name | Line | Payload |
|-----------|-----------|------|---------|
| EMIT | `rider:location` | 185 | `{ driver_id, latitude, longitude, speed, heading, timestamp, accuracy }` |
| EMIT | `rider:online` | 247 | `{ riderId, name, role, latitude, longitude }` |
| EMIT | `rider:offline` | 257 | `{ riderId }` |
| LISTEN | `rider:online:ack` | 118 | `{ success, error? }` |
| LISTEN | `rider:offline:ack` | 128 | `{ success }` |

**use-heartbeat.ts** (→ heartbeat monitor port 3004):
| Direction | Event Name | Line | Payload |
|-----------|-----------|------|---------|
| EMIT | `heartbeat` | 347 | `{ riderId, taskId?, latitude, longitude, speed?, batteryLevel?, heading?, accuracy?, isCharging?, networkType? }` |
| EMIT | `rider:task:start` | 462 | `{ riderId, taskId }` |
| EMIT | `rider:task:end` | 494 | `{ riderId, taskId }` |
| EMIT | `subscribe:rider` | 578 | `{ riderId }` |
| EMIT | `subscribe:task` | 581 | `{ taskId }` |
| EMIT | `unsubscribe:rider` | 601 | `{ riderId }` |
| LISTEN | `rider:location` | 585 | (any) |
| LISTEN | `rider:{riderId}:status` | 595 | (any) |

**rider-tracking.tsx** (→ heartbeat monitor port 3004):
| Direction | Event Name | Line | Payload |
|-----------|-----------|------|---------|
| EMIT | `subscribe:rider` | 79, 334 | `{ riderId }` |
| EMIT | `subscribe:task` | 80 | `{ taskId }` |
| EMIT | `unsubscribe:rider` | 147 | `{ riderId }` |
| LISTEN | `rider:location` | 95, 337 | (any) |
| LISTEN | `task:location` | 112 | (any) |
| LISTEN | `rider:{riderId}:status` | 124, 341 | (any) |

**dispatch-monitoring.tsx** (→ dispatch service port 3003):
| Direction | Event Name | Line | Payload |
|-----------|-----------|------|---------|
| EMIT | `admin:join` | 92 | (none) |
| EMIT | `admin:stats` | 93 | (none) |
| LISTEN | `admin:stats` | 101 | DispatchStats |
| LISTEN | `admin:logs` | 105 | DispatchLog[] |

**connection-monitoring.tsx** (→ heartbeat monitor port 3004):
| Direction | Event Name | Line | Payload |
|-----------|-----------|------|---------|
| EMIT | `admin:join` | 174 | (none) |
| LISTEN | `admin:active-riders` | 183 | RiderStatus[] |
| LISTEN | `admin:rider:status` | 208 | `{ riderId, connectionStatus }` |
| LISTEN | `admin:alert` | 217 | ConnectionAlert |

---

## RIDER ASSIGNMENT FLOW — EVENT MATCHING TABLE

### Core Assignment Flow Events (Client creates task → Rider receives offer → Rider accepts → Client notified)

| Event Name | Emitted In (file:line) | Listened In (file:line) | Match? | Notes |
|-----------|----------------------|------------------------|--------|-------|
| `task:create` | **Expo/Web**: NOT emitted by any client | **Dispatch**: index.ts:963 | ❌ **NO EMITTER** | Dispatch service expects `task:create` but no client emits it. Task creation goes through REST API instead. |
| `task:create:ack` | **Dispatch**: index.ts:1007 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | Dispatch emits ack but no client catches it. |
| `task:offer` | **Dispatch**: index.ts:451, 599 | **Expo**: NOT listened ❌ / **Web**: NOT listened ❌ | ❌ **NO MATCH** | **CRITICAL**: Dispatch sends `task:offer` to riders but neither Expo nor Web listens for it. Expo listens for `driver:request` instead. |
| `task:accept` | **Web**: socket.ts:244 | **Dispatch**: index.ts:781 | ⚠️ **PARTIAL** | Name matches but **payload mismatch**: Web sends `{ taskId }` only; Dispatch expects `{ taskId, riderId }`. Expo does NOT emit `task:accept` at all. |
| `task:accept:ack` | **Dispatch**: index.ts:789, 825 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | Dispatch emits ack but no client catches it. |
| `task:assigned` | **Dispatch**: index.ts:828 | **Web**: socket.ts:147 ✅ / **Expo**: NOT listened ❌ | ⚠️ **PARTIAL** | Web listens ✅ but Expo listens for `rider:task:matched` instead. |
| `task:reject` | **Expo/Web**: NOT emitted | **Dispatch**: index.ts:859 | ❌ **NO EMITTER** | Dispatch expects `task:reject` but Web emits `task:decline` (different name). Expo emits nothing. |
| `task:reject:ack` | **Dispatch**: index.ts:906 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | |
| `task:unavailable` | **Dispatch**: index.ts:842 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | Dispatch notifies other riders but clients listen for `driver:request:expired` instead. |
| `task:failed` | **Dispatch**: index.ts:408, 538, 634 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | Client never learns that no rider was found. |
| `task:cancelled` | **Dispatch**: index.ts:1035 | **Web**: socket.ts:150 ✅ / **Expo**: NOT listened ❌ | ⚠️ **PARTIAL** | Web catches it. Expo listens for `driver:request:cancelled` instead. |
| `task:cancel` | **Expo/Web**: NOT emitted | **Dispatch**: index.ts:1026 | ❌ **NO EMITTER** | Dispatch expects `task:cancel` but no client emits it. Cancellation goes through REST API. |
| `task:cancel:ack` | **Dispatch**: index.ts:1051 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | |

### Realtime Service Events (Alternate channel)

| Event Name | Emitted In (file:line) | Listened In (file:line) | Match? | Notes |
|-----------|----------------------|------------------------|--------|-------|
| `dispatch:new-task` | **Realtime**: index.ts:165 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | Realtime emits this but no client catches it. |
| `dispatch:assignment` | **Realtime**: index.ts:174 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | Realtime emits this but Expo listens for `rider:task:matched`. |
| `dispatch:request` | **Expo/Web**: NOT emitted | **Realtime**: index.ts:160 | ❌ **NO EMITTER** | Realtime expects this but no client emits it. |
| `dispatch:assigned` | **Expo/Web**: NOT emitted | **Realtime**: index.ts:173 | ❌ **NO EMITTER** | Realtime expects this but no client emits it. |
| `task:status:update` | **Realtime**: index.ts:101 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | Realtime emits this but Web listens for `task:status` (no `:update`). |
| `rider:location:update` | **Realtime**: index.ts:125, 137 | **Expo/Web**: NOT listened | ❌ **NO LISTENER** | Realtime emits this but Expo listens for `rider:driver:location`. Web listens for `location:update`. |
| `task:join` | **Expo**: socket.service.ts:244 / **Web**: NOT emitted | **Realtime**: index.ts:85 | ⚠️ **PARTIAL** | Expo emits `{ taskId }` object but Realtime expects plain `taskId: string`. |
| `task:status` | **Web**: socket.ts:149 (listens) | **Realtime**: index.ts:100 (listens) | ⚠️ **AMBIGUOUS** | Both listen for same event but server name is `task:status:update` (mismatch). |

### Expo App vs Dispatch Service Mismatches

| Expo Client Event | Line | Closest Server Event | Server | Match? |
|-------------------|------|---------------------|--------|--------|
| LISTEN: `driver:request` | 130 | EMIT: `task:offer` | Dispatch:451 | ❌ Name mismatch |
| LISTEN: `driver:request:expired` | 135 | EMIT: `task:unavailable` | Dispatch:842 | ❌ Name mismatch |
| LISTEN: `driver:request:cancelled` | 140 | EMIT: `task:cancelled` | Dispatch:1035 | ❌ Name mismatch |
| LISTEN: `rider:task:matched` | 159 | EMIT: `task:assigned` | Dispatch:828 | ❌ Name mismatch |
| LISTEN: `rider:task:status` | 168 | EMIT: `task:{taskId}:status` | Dispatch:920 | ❌ Name mismatch |
| EMIT: `driver:join` | 210 | (no listener) | — | ❌ No server listener |
| EMIT: `driver:leave` | 215 | (no listener) | — | ❌ No server listener |
| EMIT: `driver:location:update` | 225 | LISTEN: `rider:location` | Dispatch:755 | ❌ Name mismatch |
| EMIT: `rider:join` | 262 | (no listener) | — | ❌ No server listener |
| EMIT: `rider:leave` | 267 | (no listener) | — | ❌ No server listener |

### Web App vs Dispatch/Realtime Service Mismatches

| Web Client Event | Line | Closest Server Event | Server | Match? |
|-----------------|------|---------------------|--------|--------|
| EMIT: `task:accept` | 244 | LISTEN: `task:accept` | Dispatch:781 | ⚠️ Payload mismatch (missing riderId) |
| EMIT: `task:decline` | 249 | LISTEN: `task:reject` | Dispatch:859 | ❌ Name mismatch |
| EMIT: `location:update` | 239 | LISTEN: `rider:location` | Realtime:114 | ❌ Name mismatch |
| EMIT: `message:send` | 254 | LISTEN: `chat:message` | Realtime:212 | ❌ Name mismatch |
| EMIT: `sos:trigger` | 259 | LISTEN: `sos:alert` | Realtime:242 | ❌ Name mismatch |
| LISTEN: `task:created` | 146 | EMIT: `task:join` ack only | — | ❌ No server emitter |
| LISTEN: `task:accepted` | 148 | (no direct emitter) | — | ❌ No server emitter |
| LISTEN: `task:status` | 149 | EMIT: `task:status:update` | Realtime:101 | ❌ Name mismatch |
| LISTEN: `task:completed` | 151 | (no direct emitter) | — | ❌ No server emitter |
| LISTEN: `location:update` | 154 | EMIT: `rider:location:update` | Realtime:125 | ❌ Name mismatch |
| LISTEN: `message:new` | 164 | EMIT: `chat:message:received` | Realtime:213 | ❌ Name mismatch |
| LISTEN: `sos:alert` | 167 | EMIT: `sos:new` | Realtime:243 | ❌ Name mismatch |

### Direct Hook Connections — Working Matches

| Hook | Client Event | Server Listener/Emitter | Service | Match? |
|------|-------------|------------------------|---------|--------|
| use-driver-location | EMIT: `rider:online` :247 | LISTEN: `rider:online` :657 | Dispatch | ✅ MATCH |
| use-driver-location | EMIT: `rider:offline` :257 | LISTEN: `rider:offline` :732 | Dispatch | ✅ MATCH |
| use-driver-location | EMIT: `rider:location` :185 | LISTEN: `rider:location` :755 | Dispatch | ✅ MATCH (payload slightly different: client uses `driver_id`, server expects `riderId`) |
| use-driver-location | LISTEN: `rider:online:ack` :118 | EMIT: `rider:online:ack` :717 | Dispatch | ✅ MATCH |
| use-driver-location | LISTEN: `rider:offline:ack` :128 | EMIT: `rider:offline:ack` :749 | Dispatch | ✅ MATCH |
| use-heartbeat | EMIT: `heartbeat` :347 | LISTEN: `heartbeat` :105 | Heartbeat | ✅ MATCH |
| use-heartbeat | EMIT: `rider:task:start` :462 | LISTEN: `rider:task:start` :127 | Heartbeat | ✅ MATCH |
| use-heartbeat | EMIT: `rider:task:end` :494 | LISTEN: `rider:task:end` :146 | Heartbeat | ✅ MATCH |
| use-heartbeat | EMIT: `subscribe:rider` :578 | LISTEN: `subscribe:rider` :78 | Heartbeat | ✅ MATCH |
| use-heartbeat | EMIT: `subscribe:task` :581 | LISTEN: `subscribe:task` :100 | Heartbeat | ✅ MATCH |
| use-heartbeat | EMIT: `unsubscribe:rider` :601 | LISTEN: `unsubscribe:rider` :95 | Heartbeat | ✅ MATCH |
| use-heartbeat | LISTEN: `rider:location` :585 | EMIT: `rider:location` :204 | Heartbeat | ✅ MATCH |
| dispatch-monitoring | EMIT: `admin:join` :92 | LISTEN: `admin:join` :1074 | Dispatch | ✅ MATCH |
| dispatch-monitoring | EMIT: `admin:stats` :93 | LISTEN: `admin:stats` :1082 | Dispatch | ✅ MATCH |
| dispatch-monitoring | LISTEN: `admin:stats` :101 | EMIT: `admin:stats` :1086 | Dispatch | ✅ MATCH |
| dispatch-monitoring | LISTEN: `admin:logs` :105 | EMIT: `admin:logs` :1105 | Dispatch | ✅ MATCH |
| connection-monitoring | EMIT: `admin:join` :174 | LISTEN: `admin:join` :62 | Heartbeat | ✅ MATCH |
| connection-monitoring | LISTEN: `admin:active-riders` :183 | EMIT: `admin:active-riders` :68 | Heartbeat | ✅ MATCH |
| connection-monitoring | LISTEN: `admin:rider:status` :208 | EMIT: `admin:rider:status` :396 | Heartbeat | ✅ MATCH |
| connection-monitoring | LISTEN: `admin:alert` :217 | EMIT: `admin:alert` :367 | Heartbeat | ✅ MATCH |
| rider-tracking | EMIT: `subscribe:rider` :79 | LISTEN: `subscribe:rider` :78 | Heartbeat | ✅ MATCH |
| rider-tracking | EMIT: `subscribe:task` :80 | LISTEN: `subscribe:task` :100 | Heartbeat | ✅ MATCH |
| rider-tracking | EMIT: `unsubscribe:rider` :147 | LISTEN: `unsubscribe:rider` :95 | Heartbeat | ✅ MATCH |
| rider-tracking | LISTEN: `rider:location` :95 | EMIT: `rider:location` :204 | Heartbeat | ✅ MATCH |
| rider-tracking | LISTEN: `task:location` :112 | EMIT: `task:location` :217 | Heartbeat | ✅ MATCH |
| rider-tracking | LISTEN: `rider:{riderId}:status` :124 | EMIT: `rider:{riderId}:status` :388 | Heartbeat | ✅ MATCH |

---

## MATCHING SUMMARY

| Category | Total Events | ✅ Matched | ❌ Mismatched | ⚠️ Partial |
|----------|-------------|-----------|--------------|-----------|
| **Core Assignment Flow** (Dispatch Service) | 13 | 0 | 10 | 3 |
| **Realtime Service** (Alternate Channel) | 7 | 0 | 6 | 1 |
| **Expo App ↔ Dispatch** | 11 | 0 | 11 | 0 |
| **Web App ↔ Dispatch/Realtime** | 12 | 0 | 10 | 2 |
| **Direct Hook Connections** | 26 | 24 | 0 | 2 |
| **TOTAL** | 69 | 24 | 37 | 8 |

### Verdict: ❌ **CRITICAL FAILURE** — Core rider assignment flow has ZERO fully matching events

The only working socket connections are the **direct hook connections** (use-driver-location, use-heartbeat, rider-tracking, dispatch-monitoring, connection-monitoring), which bypass the socket service abstraction layer and connect directly to the correct microservice ports.

### Key Issues:

1. **Dispatch Service is disconnected from clients**: The `task:offer` event (the most critical event in the assignment flow) has NO listener on either client platform. Riders will never receive task offers via socket.

2. **Expo app uses completely different event names**: The expo app expects `driver:request` while the server emits `task:offer`. The entire event vocabulary differs between the two.

3. **Web app socket service connects to wrong server**: The web app socket service connects to `SOCKET_URL` (likely the realtime service or main API), not the dispatch service (port 3003). So even matching event names like `task:accept` won't reach the dispatch service.

4. **Realtime service has its own dispatch events**: `dispatch:new-task` and `dispatch:assignment` exist but no client emits or listens for them.

5. **Three parallel dispatch systems**: The dispatch service (port 3003), the realtime service (port 3001), and the REST dispatch API (`/api/dispatch/assign`) all implement different dispatch flows with different event names, and none are properly connected to the client applications.

6. **Payload mismatches**: Even where names match (`task:accept`), payloads differ between client and server (missing `riderId` field).

---
Task ID: 3
Agent: Code Inspector - Notification Flow
Task: Inspect notification creation during task transitions

Work Log:
- Searched entire project for `createNotification` — found in 5 files
- Read `src/lib/services/notification.service.ts` (451 lines) — notification service with Socket.io emission
- Read `src/lib/notifications/notification-service.ts` (730 lines) — full notification service with broadcast, preferences, marketplace notifications
- Read `src/app/api/tasks/[id]/transition/route.ts` (136 lines) — task transition API route
- Read `src/lib/services/enhanced-task-state-machine.service.ts` (607 lines) — state machine implementation
- Read `src/lib/marketplace/incentive-fulfillment.ts` (700 lines) — calls createNotification at line 559
- Read `src/lib/marketplace/client-promotion-service.ts` (452 lines) — calls createNotification at line 305
- Read all 4 files in `src/app/api/notifications/` (route.ts, read/route.ts, preferences/route.ts, token/route.ts)
- Read `src/app/api/sos/route.ts` — creates notification directly via db.notification.create at line 122
- Read `src/app/api/marketplace/incentives/route.ts` — calls notifyNewIncentive at line 191
- Read `src/app/api/marketplace/surge/route.ts` — calls notifySurgeActivation and warnClientsAboutSurge at lines 165, 173
- Read `src/app/api/dispatch/assign/route.ts` — NO notification calls
- Read `src/app/api/dispatch/route.ts` — NO notification calls
- Read `src/lib/api/audit.ts` — audit log service, no notification calls
- Read `src/lib/security/audit-log.ts` — security audit logger, no notification calls
- Checked Prisma schema for NotificationType enum
- Searched for `sendTaskUpdateNotification`, `sendOrderUpdateNotification`, `sendPaymentNotification`, `sendSOSAlertNotification` — found ZERO callers
- Searched for `sendNotification` and `pushNotification` — found ZERO results

Stage Summary:

## 1. TWO SEPARATE NOTIFICATION SERVICES (not unified)

### Service A: `src/lib/services/notification.service.ts`
- **Exported functions**: `createNotification()`, `createNotifications()`, `getUserNotifications()`, `markNotificationAsRead()`, `markAllNotificationsAsRead()`, `deleteNotification()`
- **Template functions**: `sendTaskUpdateNotification()` (line 232), `sendOrderUpdateNotification()` (line 284), `sendPaymentNotification()` (line 336), `sendSOSAlertNotification()` (line 376)
- **Real-time**: `emitNotification()` (line 425) — emits via Socket.io fetch to `http://localhost:{SOCKET_PORT}/emit`
- **Imported by**: `src/lib/services/index.ts` ONLY (re-exported)
- **Template callers**: ZERO — none of `sendTaskUpdateNotification`, `sendOrderUpdateNotification`, `sendPaymentNotification`, `sendSOSAlertNotification` are called from anywhere

### Service B: `src/lib/notifications/notification-service.ts`
- **Exported functions**: `createNotification()`, `createNotificationsForUsers()`, `getUserNotifications()`, `markNotificationAsRead()`, `markAllNotificationsAsRead()`, `broadcastNotification()`, `getNotificationPreferences()`, `updateNotificationPreferences()`, `shouldSendNotification()`, `getBroadcastHistory()`, `getBroadcastStats()`
- **Marketplace functions**: `notifySurgeActivation()` (line 367), `notifyHighDemand()` (line 391), `notifyNewIncentive()` (line 415), `notifyEarningsOpportunity()` (line 442), `requestDriverReposition()` (line 466), `notifyClientPromotion()` (line 492), `warnClientsAboutSurge()` (line 516)
- **No real-time emission**: Does NOT call Socket.io — only creates DB records
- **Imported by**: `incentive-fulfillment.ts`, `client-promotion-service.ts`, `notifications/read/route.ts`, `notifications/preferences/route.ts`, `marketplace/incentives/route.ts`, `marketplace/surge/route.ts`

**CRITICAL**: These are TWO DUPLICATE services with different signatures, different features, and different callers. Service A has Socket.io emission; Service B has broadcast + preferences. Neither is the canonical source.

## 2. EXACT PLACES WHERE `createNotification()` IS CALLED

| # | File | Line | Trigger | Notification Created |
|---|------|------|---------|---------------------|
| 1 | `src/lib/services/notification.service.ts` | 270 | `sendTaskUpdateNotification()` → calls `createNotification()` | type: `TASK_UPDATE`, templates for ASSIGNED/ACCEPTED/ARRIVED/IN_TRANSIT/COMPLETED/CANCELLED |
| 2 | `src/lib/services/notification.service.ts` | 322 | `sendOrderUpdateNotification()` → calls `createNotification()` | type: `ORDER_UPDATE`, templates for PAYMENT_CONFIRMED/MERCHANT_ACCEPTED/PREPARING/READY_FOR_PICKUP/DELIVERED/CANCELLED |
| 3 | `src/lib/services/notification.service.ts` | 362 | `sendPaymentNotification()` → calls `createNotification()` | type: `PAYMENT`, templates for COMPLETED/FAILED/REFUNDED |
| 4 | `src/lib/services/notification.service.ts` | 400 | `sendSOSAlertNotification()` → calls `createNotifications()` (batch) | type: `SOS_ALERT`, sent to all admin users |
| 5 | `src/lib/marketplace/incentive-fulfillment.ts` | 559 | `completeIncentiveAndReward()` — when incentive is completed & reward credited | type: `PAYMENT`, title: "🎁 Incentive Completed!" |
| 6 | `src/lib/marketplace/client-promotion-service.ts` | 305 | `processOrderCompletion()` — when cashback is credited | type: `PAYMENT`, title: "💰 Cashback Credited!" |
| 7 | `src/app/api/notifications/route.ts` | 68 | `POST /api/notifications` — manual notification creation | type: any, provided by caller |
| 8 | `src/app/api/sos/route.ts` | 122 | `POST /api/sos` — when SOS alert is triggered | type: `SOS_ALERT`, direct `db.notification.create()` (bypasses both services) |

**NOTE**: Entries 1-4 are DEFINED but NEVER CALLED from any route or service. They are orphaned template functions.

## 3. BROADCAST NOTIFICATIONS (via Service B)

| # | File | Line | Trigger | Notification |
|---|------|------|---------|-------------|
| 1 | `src/app/api/marketplace/incentives/route.ts` | 191 | Admin creates active incentive | `notifyNewIncentive()` → broadcast to all RIDERS |
| 2 | `src/app/api/marketplace/surge/route.ts` | 165 | Admin starts surge pricing | `notifySurgeActivation()` → broadcast to ALL_ONLINE_RIDERS |
| 3 | `src/app/api/marketplace/surge/route.ts` | 173 | Admin starts surge pricing | `warnClientsAboutSurge()` → broadcast to ZONE_CLIENTS |

These marketplace broadcasts are the ONLY notifications that are actually triggered in the codebase. None are related to task status changes.

## 4. NOTIFICATION TYPES IN PRISMA SCHEMA

```prisma
enum NotificationType {
  TASK_UPDATE
  ORDER_UPDATE
  PAYMENT
  PROMOTION
  SYSTEM
  VERIFICATION
  SOS_ALERT
  HEALTH_ORDER_UPDATE
  PRESCRIPTION_UPDATE
}
```

**BUG**: Service B's `broadcastNotification()` uses types that do NOT exist in the Prisma enum:
- `SURGE_ALERT` (used by notifySurgeActivation)
- `HIGH_DEMAND_ZONE` (used by notifyHighDemand)
- `INCENTIVE_AVAILABLE` (used by notifyNewIncentive)
- `EARNINGS_OPPORTUNITY` (used by notifyEarningsOpportunity)
- `DRIVER_REPOSITION` (used by requestDriverReposition)
- `SURGE_WARNING` (used by warnClientsAboutSurge)
- `PROMO_AVAILABLE` (used by notifyClientPromotion)
- `DISCOUNT_OFFER` (used in shouldSendNotification)

These would cause Prisma runtime errors when the broadcast functions are called, because `db.notification.createMany()` would reject invalid enum values.

## 5. TASK TRANSITION ROUTE — NOTIFICATION ANALYSIS

**File**: `src/app/api/tasks/[id]/transition/route.ts` (136 lines)

The POST handler does the following after a successful transition:
1. Calls `EnhancedTaskStateMachine.transition()` (line 78)
2. Creates an audit log via `createAuditLog()` (lines 92-119)
3. Returns the response (lines 121-127)

**It does NOT call `createNotification()`, `sendTaskUpdateNotification()`, or any notification function.** No notification is created for ANY task status change.

## 6. ENHANCED TASK STATE MACHINE — NOTIFICATION ANALYSIS

**File**: `src/lib/services/enhanced-task-state-machine.service.ts` (607 lines)

The `transition()` method (line 304-435) does the following:
1. Fetches the task (lines 311-318)
2. Validates the transition (lines 328-356)
3. Runs custom validation (lines 359-364)
4. Runs `beforeTransition` hook (lines 367-369)
5. Executes DB transaction: updates task status, creates `TaskStateTransition`, creates `AuditLog` (lines 372-416)
6. Runs `afterTransition` hook (lines 419-421)

**It does NOT call `createNotification()` or any notification function.** The `afterTransition` hook is defined in `TransitionConfig` but NONE of the actual transition configurations (RIDE_TRANSITIONS, FOOD_DELIVERY_TRANSITIONS, etc.) define an `afterTransition` callback. So no notification is triggered.

The state machine creates an `AuditLog` entry inside the transaction (lines 401-413), but this is an audit log, NOT a user-facing notification.

## 7. SOS ROUTE — DIRECT DB NOTIFICATION

**File**: `src/app/api/sos/route.ts` (lines 122-131)

The SOS route creates a notification directly via `db.notification.create()` bypassing both notification services. However, the notification is created with `userId: user.userId` (the user who triggered the SOS), NOT to admin users. This appears to be a bug — the SOS notification should go to admins, not back to the triggering user.

## SPECIFIC ANSWERS

### Q: Does the task transition route call createNotification()?
**A: NO.** The transition route at `src/app/api/tasks/[id]/transition/route.ts` never imports or calls any notification function. It only creates an audit log.

### Q: Does the enhanced-task-state-machine call createNotification()?
**A: NO.** The state machine at `src/lib/services/enhanced-task-state-machine.service.ts` never imports or calls any notification function. It creates `AuditLog` entries (not user notifications) and supports `afterTransition` hooks, but no transition config defines one.

### Q: Are notifications generated during status changes REQUESTED→SEARCHING→ASSIGNED→ARRIVING→PICKED_UP→IN_PROGRESS→COMPLETED→PAID→CLOSED?
**A: NO.** Zero notifications are generated during ANY task status transition. The `sendTaskUpdateNotification()` function exists in `src/lib/services/notification.service.ts` (line 232) with templates for ASSIGNED, ACCEPTED, ARRIVED, IN_TRANSIT, COMPLETED, CANCELLED — but it is NEVER called from any route or service.

### Q: What notification types exist?
**A: Per the Prisma schema enum `NotificationType`:**
1. `TASK_UPDATE`
2. `ORDER_UPDATE`
3. `PAYMENT`
4. `PROMOTION`
5. `SYSTEM`
6. `VERIFICATION`
7. `SOS_ALERT`
8. `HEALTH_ORDER_UPDATE`
9. `PRESCRIPTION_UPDATE`

**Additionally, 8 types are used in code but NOT in the Prisma enum (would cause runtime errors):**
- `SURGE_ALERT`, `HIGH_DEMAND_ZONE`, `INCENTIVE_AVAILABLE`, `EARNINGS_OPPORTUNITY`, `DRIVER_REPOSITION`, `SURGE_WARNING`, `PROMO_AVAILABLE`, `DISCOUNT_OFFER`

## SUMMARY OF GAPS

1. **No notification is created during ANY task status transition** — the entire ride/delivery lifecycle is silent
2. **Two duplicate notification services exist** — neither is canonical, and they have different features
3. **The task-specific notification templates are orphaned** — `sendTaskUpdateNotification()` is never called
4. **The state machine's `afterTransition` hooks are never used** — no transition config defines one
5. **8 notification types are used in broadcast code but missing from the Prisma enum** — runtime errors would occur for marketplace broadcasts
6. **The SOS route creates a notification to the triggering user, not to admins** — likely a bug

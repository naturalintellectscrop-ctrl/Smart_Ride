# Task P1-11 & P1-12 — Work Record

## P1-11: Configure Vercel Cron for Dispatch/Cleanup

### Files Created/Modified:
1. **`/vercel.json`** — Updated with 3 cron schedules:
   - `/api/cron/dispatch-timeout` (every 1 min)
   - `/api/cron/cleanup-sessions` (every 6 hours)
   - `/api/cron/cleanup-otp` (every 1 hour)

2. **`/src/app/api/cron/dispatch-timeout/route.ts`** — GET handler that:
   - Verifies cron auth via `verifyCronAuth()` (X-Cron-Secret or Authorization header vs CRON_SECRET)
   - Calls `DispatchService.processExpiredMatches()`
   - Writes audit log

3. **`/src/app/api/cron/cleanup-sessions/route.ts`** — GET handler that:
   - Deletes expired sessions (expiresAt < now)
   - Clears expired refresh tokens from User records
   - Writes audit log

4. **`/src/app/api/cron/cleanup-otp/route.ts`** — GET handler that:
   - Deletes OTPs expired > 30 min
   - Deletes ApiRateLimit entries > 1 hour old
   - Writes audit log

## P1-12: Wire Realtime Broadcasts

### Files Created/Modified:
1. **`/src/app/api/chat/[conversationId]/send/route.ts`** — Added:
   - Realtime broadcast of `chat:message` to all conversation participants (except sender)
   - Uses `broadcastToUser()` from `@/lib/realtime-server`

2. **`/src/app/api/calls/[sessionId]/end/route.ts`** — Created:
   - PATCH handler to end a call session
   - Broadcasts `call:ended` to both caller and recipient
   - Uses `broadcastToUser()` from `@/lib/realtime-server`

3. **`/src/app/api/rider/heartbeat/route.ts`** — Added:
   - Realtime broadcast of `location:update` to task room when task_id is provided
   - Uses `broadcastToTask()` from `@/lib/realtime-server`

## Lint Status: PASS (0 errors)

/**
 * ⚠️ DEPRECATED — This Socket.IO service is NO LONGER USED.
 *
 * Smart Ride has migrated to **Supabase Realtime** for all real-time communication.
 * This eliminates the need for a separate WebSocket hosting service.
 *
 * Replacement:
 *   - Client-side: `src/services/socket.ts` (web) and `expo-app/src/services/socket.service.ts` (mobile)
 *     Both use `@supabase/supabase-js` with Broadcast, Presence, and Postgres Changes.
 *   - Server-side: `src/lib/realtime-server.ts` provides `broadcastEvent()`, `broadcastToUser()`,
 *     `broadcastToTask()`, `broadcastToRider()`, `broadcastTaskStatusUpdate()`, `broadcastNotification()`.
 *
 * This file is kept for reference only. Do NOT start this service.
 * It will be removed in a future cleanup.
 */

// Legacy Socket.io server — DO NOT START
// All real-time communication now goes through Supabase Realtime.

console.warn('⚠️  This Socket.IO realtime service is DEPRECATED. Use Supabase Realtime instead.');
console.warn('   See: src/lib/realtime-server.ts (server) and src/services/socket.ts (client)');
console.warn('   This service will NOT start.');

process.exit(0);

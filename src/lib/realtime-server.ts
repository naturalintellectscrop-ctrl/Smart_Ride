// ============================================
// SMART RIDE - Server-Side Supabase Realtime
// ============================================
// Used by Next.js API routes to broadcast events to clients.
// Replaces the old pattern of calling the Socket.io internal API on port 3002.
//
// Usage in API routes:
//   import { broadcastEvent } from '@/lib/realtime-server';
//   await broadcastEvent(`task:${taskId}`, 'task:status:update', { taskId, status });
//   await broadcastToUser(userId, 'notification', { type: 'task', title: 'Ride Updated', message: '...' });

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { realtimeLogger } from '@/lib/logging/logger';

// ============================================
// CONFIGURATION CHECK
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Check if Supabase Realtime is properly configured.
 * Requires NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY).
 */
export function isConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

/** Boolean export for quick checks */
export const realtimeConfigured = isConfigured();

/** Structured unavailability message */
const UNAVAILABLE_MESSAGE = 'Realtime service not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.';

// Singleton server-side Supabase client (uses service role key for full access)
let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient | null {
  if (!isConfigured()) {
    return null;
  }

  if (serverClient) return serverClient;

  serverClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    realtime: {
      params: {
        eventsPerSecond: 50,
      },
    },
  });

  return serverClient;
}

// ============================================
// CHANNEL CACHE
// ============================================
// Reuse channels instead of creating/destroying per broadcast.
// Channels are cleaned up after being idle for CHANNEL_IDLE_TIMEOUT ms.

const channelCache = new Map<string, { channel: RealtimeChannel; lastUsedAt: number }>();
const CHANNEL_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function getOrCreateChannel(name: string): RealtimeChannel | null {
  const client = getServerClient();
  if (!client) return null;

  const cached = channelCache.get(name);

  // Reuse if channel exists and is not closed
  if (cached && cached.channel.state !== 'closed') {
    cached.lastUsedAt = Date.now();
    return cached.channel;
  }

  // Create new channel and cache it
  const channel = client.channel(name);
  channel.subscribe();
  channelCache.set(name, { channel, lastUsedAt: Date.now() });
  return channel;
}

/**
 * Periodically clean up idle channels to free resources.
 * Runs every 5 minutes, removes channels not used in the last 5 minutes.
 */
function cleanupIdleChannels(): void {
  const now = Date.now();
  const client = getServerClient();
  if (!client) return;

  for (const [name, entry] of channelCache.entries()) {
    if (now - entry.lastUsedAt > CHANNEL_IDLE_TIMEOUT) {
      try {
        client.removeChannel(entry.channel);
      } catch {
        // Ignore removal errors for cached channels
      }
      channelCache.delete(name);
    }
  }
}

// Start periodic cleanup (every 5 minutes)
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

function ensureCleanupRunning(): void {
  if (cleanupIntervalId) return;
  cleanupIntervalId = setInterval(cleanupIdleChannels, CHANNEL_IDLE_TIMEOUT);
  // Allow the Node.js process to exit even if this interval is running
  if (cleanupIntervalId && typeof cleanupIntervalId === 'object' && 'unref' in cleanupIntervalId) {
    cleanupIntervalId.unref();
  }
}

// Initialize cleanup on first module load
ensureCleanupRunning();

/**
 * Broadcast an event to all subscribers of a channel.
 * Replaces: fetch(REALTIME_API_URL + '/emit', { body: { room, event, data } })
 *
 * Uses cached channels for performance — avoids creating/destroying
 * a new channel on every broadcast call.
 *
 * @param channelName - The channel to broadcast on (e.g., "task:abc123", "user:def456")
 * @param event - The event name (e.g., "task:status:update", "rider:location:update")
 * @param payload - The event data
 */
export async function broadcastEvent(
  channelName: string,
  event: string,
  payload: unknown
): Promise<void> {
  // Gracefully no-op when realtime is not configured
  if (!isConfigured()) {
    realtimeLogger.warn(UNAVAILABLE_MESSAGE);
    return;
  }

  try {
    const channel = getOrCreateChannel(channelName);
    if (!channel) {
      realtimeLogger.warn('Failed to create realtime channel — client not available.');
      return;
    }

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });

    // Don't remove the channel — let it be reused from cache
  } catch (error) {
    realtimeLogger.error(`Failed to broadcast to ${channelName}:`, { error: String(error) });
  }
}

/**
 * Broadcast an event to a specific user's personal channel.
 * Shortcut for broadcastEvent(`user:${userId}`, event, payload)
 */
export async function broadcastToUser(
  userId: string,
  event: string,
  payload: unknown
): Promise<void> {
  await broadcastEvent(`user:${userId}`, event, payload);
}

/**
 * Broadcast an event to a task room.
 * Shortcut for broadcastEvent(`task:${taskId}`, event, payload)
 */
export async function broadcastToTask(
  taskId: string,
  event: string,
  payload: unknown
): Promise<void> {
  await broadcastEvent(`task:${taskId}`, event, payload);
}

/**
 * Broadcast an event to a rider's channel.
 * Shortcut for broadcastEvent(`rider:${riderId}`, event, payload)
 */
export async function broadcastToRider(
  riderId: string,
  event: string,
  payload: unknown
): Promise<void> {
  await broadcastEvent(`rider:${riderId}`, event, payload);
}

/**
 * Broadcast a task status update to both the task room and the client's personal channel.
 * This is the most common server-side broadcast pattern.
 */
export async function broadcastTaskStatusUpdate(data: {
  taskId: string;
  status: string;
  clientId?: string;
  riderId?: string;
  metadata?: unknown;
}): Promise<void> {
  const payload = {
    taskId: data.taskId,
    status: data.status,
    metadata: data.metadata,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to task room (anyone watching this task)
  await broadcastToTask(data.taskId, 'task:status:update', payload);

  // Broadcast to client's personal channel
  if (data.clientId) {
    await broadcastToUser(data.clientId, 'task:status:update', payload);
  }

  // Broadcast to rider's channel
  if (data.riderId) {
    await broadcastToRider(data.riderId, 'task:status:update', payload);
  }
}

/**
 * Broadcast a notification to a user.
 */
export async function broadcastNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  await broadcastToUser(userId, 'notification', {
    ...notification,
    timestamp: new Date().toISOString(),
  });
}

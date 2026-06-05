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

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton server-side Supabase client (uses service role key for full access)
let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (serverClient) return serverClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('[Realtime Server] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  serverClient = createClient(supabaseUrl, serviceRoleKey, {
    realtime: {
      params: {
        eventsPerSecond: 50,
      },
    },
  });

  return serverClient;
}

/**
 * Broadcast an event to all subscribers of a channel.
 * Replaces: fetch(REALTIME_API_URL + '/emit', { body: { room, event, data } })
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
  try {
    const client = getServerClient();
    const channel = client.channel(channelName);

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });

    // Clean up the channel after sending (server doesn't need to stay subscribed)
    client.removeChannel(channel);
  } catch (error) {
    console.error(`[Realtime Server] Failed to broadcast to ${channelName}:`, error);
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

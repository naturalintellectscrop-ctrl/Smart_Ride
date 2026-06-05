/**
 * Smart Ride Socket Reliability Service
 * Provides reliable real-time communication with fallback to DB notifications.
 *
 * Migrated from Socket.IO HTTP calls to Supabase Realtime broadcast.
 * Supabase Realtime handles its own reconnection, so the acknowledgement
 * and health-check mechanisms have been simplified. The DB notification
 * fallback is preserved for critical messages.
 */

import { db } from '@/lib/db';
import { NotificationType } from '@prisma/client';
import { broadcastEvent, broadcastToUser } from '@/lib/realtime-server';

// ============================================
// PENDING ACKNOWLEDGEMENT TRACKING
// ============================================
// Note: Supabase Broadcast is fire-and-forget (no server-side ack).
// We keep the ack interface for backward compatibility but resolve
// immediately after broadcast.

interface PendingAck {
  id: string;
  userId: string;
  event: string;
  data: unknown;
  resolve: (acknowledged: boolean) => void;
  reject: (error: Error) => void;
  retryCount: number;
  createdAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

const pendingAcknowledgements = new Map<string, PendingAck>();

// ============================================
// REALTIME HEALTH STATUS
// ============================================

interface RealtimeHealth {
  reachable: boolean;
  lastCheckedAt: string;
  error?: string;
}

let lastHealthCheck: RealtimeHealth = {
  reachable: false,
  lastCheckedAt: new Date().toISOString(),
  error: 'Not yet checked',
};

// ============================================
// FALLBACK: CREATE NOTIFICATION IN DB
// ============================================

async function fallbackToNotification(
  userId: string,
  title: string,
  message: string,
  notificationType: string,
  referenceId?: string,
  referenceType?: string
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId,
        type: notificationType as NotificationType,
        title,
        message,
        referenceId: referenceId || null,
        referenceType: referenceType || null,
      },
    });
    console.log(`[RealtimeReliability] Fallback notification created for user ${userId}`);
  } catch (error) {
    console.error('[RealtimeReliability] Fallback notification failed:', error instanceof Error ? error.message : error);
  }
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class SocketReliabilityService {
  /**
   * Emit event to a specific user's room.
   * Broadcasts via Supabase Realtime. If broadcast fails, falls back to creating a Notification record.
   */
  static async emitToUser(
    userId: string,
    event: string,
    data: {
      title?: string;
      message?: string;
      notificationType?: string;
      referenceId?: string;
      referenceType?: string;
      [key: string]: unknown;
    }
  ): Promise<{ socketDelivered: boolean; fallbackCreated: boolean }> {
    try {
      await broadcastToUser(userId, event, {
        ...data,
        timestamp: new Date().toISOString(),
      });

      return { socketDelivered: true, fallbackCreated: false };
    } catch (error) {
      console.error('[RealtimeReliability] Broadcast to user failed:', error instanceof Error ? error.message : error);

      if (data.title && data.message && data.notificationType) {
        await fallbackToNotification(
          userId,
          data.title,
          data.message,
          data.notificationType,
          data.referenceId,
          data.referenceType
        );
        return { socketDelivered: false, fallbackCreated: true };
      }

      return { socketDelivered: false, fallbackCreated: false };
    }
  }

  /**
   * Emit event to a task room (all participants tracking this task).
   */
  static async emitToTaskRoom(
    taskId: string,
    event: string,
    data: Record<string, unknown>
  ): Promise<{ socketDelivered: boolean }> {
    try {
      await broadcastEvent(`task:${taskId}`, event, {
        ...data,
        taskId,
        timestamp: new Date().toISOString(),
      });

      return { socketDelivered: true };
    } catch (error) {
      console.error('[RealtimeReliability] Broadcast to task room failed:', error instanceof Error ? error.message : error);
      return { socketDelivered: false };
    }
  }

  /**
   * Emit event to the admin dashboard room.
   */
  static async emitToAdminRoom(
    event: string,
    data: Record<string, unknown>
  ): Promise<{ socketDelivered: boolean }> {
    try {
      await broadcastEvent('admin:dashboard', event, {
        ...data,
        timestamp: new Date().toISOString(),
      });

      return { socketDelivered: true };
    } catch (error) {
      console.error('[RealtimeReliability] Broadcast to admin room failed:', error instanceof Error ? error.message : error);
      return { socketDelivered: false };
    }
  }

  /**
   * Emit event and resolve after broadcast.
   * Supabase Broadcast is fire-and-forget, so acknowledgement is implied
   * by successful broadcast. Falls back to DB notification on failure.
   */
  static async emitWithAcknowledgement(
    userId: string,
    event: string,
    data: Record<string, unknown>,
    _timeout: number = 10000
  ): Promise<boolean> {
    try {
      await broadcastToUser(userId, event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('[RealtimeReliability] Acknowledged broadcast failed:', error instanceof Error ? error.message : error);

      // Fall back to notification if title/message provided
      const dataRecord = data as Record<string, unknown>;
      if (dataRecord.title && dataRecord.message && dataRecord.notificationType) {
        await fallbackToNotification(
          userId,
          dataRecord.title as string,
          dataRecord.message as string,
          dataRecord.notificationType as string,
          dataRecord.referenceId as string | undefined,
          dataRecord.referenceType as string | undefined
        ).catch(() => {});
      }

      return false;
    }
  }

  /**
   * Receive an acknowledgement for a pending event.
   * Kept for backward compatibility — Supabase Broadcast doesn't have
   * server-side acks, so this is a no-op that resolves any pending promise.
   */
  static receiveAcknowledgement(ackId: string): void {
    const pending = pendingAcknowledgements.get(ackId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    pendingAcknowledgements.delete(ackId);
    pending.resolve(true);
  }

  /**
   * Check if the Supabase Realtime service is reachable.
   * Performs a lightweight broadcast test to verify connectivity.
   */
  static async getSocketHealth(): Promise<RealtimeHealth> {
    try {
      // Attempt a lightweight broadcast to verify Supabase connectivity
      await broadcastEvent('health:check', 'ping', { timestamp: new Date().toISOString() });

      lastHealthCheck = {
        reachable: true,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastHealthCheck = {
        reachable: false,
        lastCheckedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return lastHealthCheck;
  }

  /**
   * Get current pending acknowledgement count.
   * Always 0 with Supabase Broadcast (fire-and-forget).
   */
  static getPendingAckCount(): number {
    return pendingAcknowledgements.size;
  }

  /**
   * Get current cached health status (without making a new request).
   */
  static getCachedHealth(): RealtimeHealth {
    return lastHealthCheck;
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export const emitToUser = SocketReliabilityService.emitToUser.bind(SocketReliabilityService);
export const emitToTaskRoom = SocketReliabilityService.emitToTaskRoom.bind(SocketReliabilityService);
export const emitToAdminRoom = SocketReliabilityService.emitToAdminRoom.bind(SocketReliabilityService);
export const getSocketHealth = SocketReliabilityService.getSocketHealth.bind(SocketReliabilityService);

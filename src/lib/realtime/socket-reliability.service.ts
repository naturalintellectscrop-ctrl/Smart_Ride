/**
 * Smart Ride Socket Reliability Service
 * Provides reliable real-time communication with fallback to DB notifications.
 * All HTTP calls to the socket service use the gateway pattern.
 */

import { db } from '@/lib/db';
import { NotificationType } from '@prisma/client';

// ============================================
// CONFIGURATION
// ============================================

const SOCKET_HTTP_PORT = 3002;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
const DEFAULT_ACK_TIMEOUT_MS = 10000; // 10 seconds
const MAX_ACK_RETRIES = 3;

// ============================================
// PENDING ACKNOWLEDGEMENT TRACKING
// ============================================

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
// SOCKET HEALTH STATUS
// ============================================

interface SocketHealth {
  reachable: boolean;
  connections: number;
  connectedUsers: number;
  latencyMs: number | null;
  lastCheckedAt: string;
  error?: string;
}

let lastHealthCheck: SocketHealth = {
  reachable: false,
  connections: 0,
  connectedUsers: 0,
  latencyMs: null,
  lastCheckedAt: new Date().toISOString(),
  error: 'Not yet checked',
};

// ============================================
// INTERNAL: HTTP CALL TO SOCKET SERVICE
// ============================================

async function callSocketService(path: string, body?: unknown): Promise<Response | null> {
  try {
    const url = `/api${path}?XTransformPort=${SOCKET_HTTP_PORT}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response;
  } catch (error) {
    console.error('[SocketReliability] Failed to call socket service:', error instanceof Error ? error.message : error);
    return null;
  }
}

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
    console.log(`[SocketReliability] Fallback notification created for user ${userId}`);
  } catch (error) {
    console.error('[SocketReliability] Fallback notification failed:', error instanceof Error ? error.message : error);
  }
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class SocketReliabilityService {
  /**
   * Emit event to a specific user's room.
   * Tries socket emission first. If socket fails, falls back to creating a Notification record.
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
    const response = await callSocketService('/emit', {
      room: `user:${userId}`,
      event,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });

    const socketDelivered = response?.ok === true;

    if (!socketDelivered && data.title && data.message && data.notificationType) {
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

    return { socketDelivered, fallbackCreated: false };
  }

  /**
   * Emit event to a task room (all participants tracking this task).
   */
  static async emitToTaskRoom(
    taskId: string,
    event: string,
    data: Record<string, unknown>
  ): Promise<{ socketDelivered: boolean }> {
    const response = await callSocketService('/emit', {
      room: `task:${taskId}`,
      event,
      data: {
        ...data,
        taskId,
        timestamp: new Date().toISOString(),
      },
    });

    return { socketDelivered: response?.ok === true };
  }

  /**
   * Emit event to the admin dashboard room.
   */
  static async emitToAdminRoom(
    event: string,
    data: Record<string, unknown>
  ): Promise<{ socketDelivered: boolean }> {
    const response = await callSocketService('/emit', {
      room: 'admin:dashboard',
      event,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });

    return { socketDelivered: response?.ok === true };
  }

  /**
   * Emit event and wait for acknowledgement.
   * Stores pending acknowledgement in memory.
   * Retries if no ack within timeout.
   * Max 3 retries.
   */
  static emitWithAcknowledgement(
    userId: string,
    event: string,
    data: Record<string, unknown>,
    timeout: number = DEFAULT_ACK_TIMEOUT_MS
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const ackId = `ack:${userId}:${event}:${Date.now()}`;

      const timeoutId = setTimeout(() => {
        handleAckTimeout(ackId);
      }, timeout);

      const pendingAck: PendingAck = {
        id: ackId,
        userId,
        event,
        data,
        resolve,
        reject,
        retryCount: 0,
        createdAt: Date.now(),
        timeoutId,
      };

      pendingAcknowledgements.set(ackId, pendingAck);

      // Emit the event
      callSocketService('/emit', {
        room: `user:${userId}`,
        event,
        data: {
          ...data,
          _ackId: ackId,
          timestamp: new Date().toISOString(),
        },
      }).then(response => {
        if (!response?.ok) {
          // Socket delivery failed — still wait for ack (might come via polling)
          console.log(`[SocketReliability] Socket delivery failed for ack ${ackId}, waiting for acknowledgement`);
        }
      }).catch(error => {
        console.error(`[SocketReliability] Error emitting for ack ${ackId}:`, error);
      });
    });
  }

  /**
   * Receive an acknowledgement for a pending event.
   * Called when the client sends back an ack response.
   */
  static receiveAcknowledgement(ackId: string): void {
    const pending = pendingAcknowledgements.get(ackId);
    if (!pending) {
      console.warn(`[SocketReliability] Received ack for unknown ID: ${ackId}`);
      return;
    }

    clearTimeout(pending.timeoutId);
    pendingAcknowledgements.delete(ackId);
    pending.resolve(true);
  }

  /**
   * Check if the socket service is reachable.
   * Pings the socket HTTP health endpoint.
   */
  static async getSocketHealth(): Promise<SocketHealth> {
    const startTime = Date.now();

    try {
      const url = `/api/health?XTransformPort=${SOCKET_HTTP_PORT}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Internal-Key': INTERNAL_API_KEY,
        },
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        const body = await response.json() as { status: string; connections: number; connectedUsers: number };
        lastHealthCheck = {
          reachable: true,
          connections: body.connections || 0,
          connectedUsers: body.connectedUsers || 0,
          latencyMs,
          lastCheckedAt: new Date().toISOString(),
        };
      } else {
        lastHealthCheck = {
          reachable: false,
          connections: 0,
          connectedUsers: 0,
          latencyMs: null,
          lastCheckedAt: new Date().toISOString(),
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      lastHealthCheck = {
        reachable: false,
        connections: 0,
        connectedUsers: 0,
        latencyMs: null,
        lastCheckedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return lastHealthCheck;
  }

  /**
   * Get current pending acknowledgement count.
   */
  static getPendingAckCount(): number {
    return pendingAcknowledgements.size;
  }

  /**
   * Get current cached health status (without making a new request).
   */
  static getCachedHealth(): SocketHealth {
    return lastHealthCheck;
  }
}

// ============================================
// ACK TIMEOUT HANDLER
// ============================================

function handleAckTimeout(ackId: string): void {
  const pending = pendingAcknowledgements.get(ackId);
  if (!pending) return;

  pending.retryCount++;

  if (pending.retryCount <= MAX_ACK_RETRIES) {
    console.log(`[SocketReliability] Ack timeout for ${ackId}, retry ${pending.retryCount}/${MAX_ACK_RETRIES}`);

    // Re-emit the event
    callSocketService('/emit', {
      room: `user:${pending.userId}`,
      event: pending.event,
      data: {
        ...pending.data,
        _ackId: ackId,
        _retryCount: pending.retryCount,
        timestamp: new Date().toISOString(),
      },
    }).catch(error => {
      console.error(`[SocketReliability] Retry emission failed for ack ${ackId}:`, error);
    });

    // Set a new timeout
    pending.timeoutId = setTimeout(() => {
      handleAckTimeout(ackId);
    }, DEFAULT_ACK_TIMEOUT_MS);
  } else {
    console.warn(`[SocketReliability] Ack ${ackId} failed after ${MAX_ACK_RETRIES} retries`);

    // Clean up and resolve as not acknowledged
    pendingAcknowledgements.delete(ackId);

    // Fall back to notification if title/message provided
    const data = pending.data as Record<string, unknown>;
    if (data.title && data.message && data.notificationType) {
      fallbackToNotification(
        pending.userId,
        data.title as string,
        data.message as string,
        data.notificationType as string,
        data.referenceId as string | undefined,
        data.referenceType as string | undefined
      ).catch(() => {});
    }

    pending.resolve(false);
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export const emitToUser = SocketReliabilityService.emitToUser.bind(SocketReliabilityService);
export const emitToTaskRoom = SocketReliabilityService.emitToTaskRoom.bind(SocketReliabilityService);
export const emitToAdminRoom = SocketReliabilityService.emitToAdminRoom.bind(SocketReliabilityService);
export const getSocketHealth = SocketReliabilityService.getSocketHealth.bind(SocketReliabilityService);

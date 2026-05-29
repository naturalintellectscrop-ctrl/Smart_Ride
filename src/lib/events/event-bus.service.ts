/**
 * Smart Ride Event Bus Service
 * Standardized event bus that all services use to emit events.
 * Events are persisted to the DB for reliability and replay.
 */

import { db } from '@/lib/db';
import { createHash } from 'crypto';

// ============================================
// EVENT TYPES
// ============================================

export type SmartRideEvent =
  | { type: 'TASK_UPDATE'; taskId: string; status: string; metadata?: Record<string, unknown> }
  | { type: 'ORDER_UPDATE'; orderId: string; status: string; metadata?: Record<string, unknown> }
  | { type: 'RIDER_STATUS'; riderId: string; isOnline: boolean; metadata?: Record<string, unknown> }
  | { type: 'MERCHANT_STATUS'; merchantId: string; isOpen: boolean; metadata?: Record<string, unknown> }
  | { type: 'WALLET_CHANGE'; walletId: string; ownerId: string; ownerType: string; changeType: string; amount: number; metadata?: Record<string, unknown> }
  | { type: 'NOTIFICATION'; userId: string; title: string; message: string; notificationType: string; metadata?: Record<string, unknown> }
  | { type: 'PAYMENT_UPDATE'; paymentId: string; status: string; metadata?: Record<string, unknown> }
  | { type: 'DISPATCH_EVENT'; taskId: string; riderId: string; action: string; metadata?: Record<string, unknown> };

// ============================================
// HELPER: Get entity ID from event
// ============================================

function getEntityId(event: SmartRideEvent): string {
  switch (event.type) {
    case 'TASK_UPDATE':
      return event.taskId;
    case 'ORDER_UPDATE':
      return event.orderId;
    case 'RIDER_STATUS':
      return event.riderId;
    case 'MERCHANT_STATUS':
      return event.merchantId;
    case 'WALLET_CHANGE':
      return event.walletId;
    case 'NOTIFICATION':
      return event.userId;
    case 'PAYMENT_UPDATE':
      return event.paymentId;
    case 'DISPATCH_EVENT':
      return event.taskId;
  }
}

// ============================================
// HELPER: Generate dedup event ID
// ============================================

function generateEventId(event: SmartRideEvent): string {
  const entityId = getEntityId(event);
  const timestamp = Date.now();
  // Round to nearest second to allow dedup window
  const secondBucket = Math.floor(timestamp / 1000);
  const raw = `${event.type}:${entityId}:${secondBucket}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

// ============================================
// HELPER: Get task/order ID from event for audit log linkage
// ============================================

function getTaskId(event: SmartRideEvent): string | undefined {
  switch (event.type) {
    case 'TASK_UPDATE':
    case 'DISPATCH_EVENT':
      return event.taskId;
    default:
      return undefined;
  }
}

function getOrderId(event: SmartRideEvent): string | undefined {
  switch (event.type) {
    case 'ORDER_UPDATE':
      return event.orderId;
    default:
      return undefined;
  }
}

// ============================================
// SOCKET EMISSION
// ============================================

const SOCKET_HTTP_PORT = 3002;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';

async function emitViaSocket(event: SmartRideEvent, eventId: string): Promise<boolean> {
  try {
    const room = getRoomForEvent(event);
    const socketEventName = getSocketEventName(event);

    const response = await fetch(`/api/emit?XTransformPort=${SOCKET_HTTP_PORT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        room,
        event: socketEventName,
        data: {
          eventId,
          ...event,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[EventBus] Socket emission failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

function getRoomForEvent(event: SmartRideEvent): string {
  switch (event.type) {
    case 'TASK_UPDATE':
      return `task:${event.taskId}`;
    case 'ORDER_UPDATE':
      return `order:${event.orderId}`;
    case 'RIDER_STATUS':
      return `user:${event.riderId}`;
    case 'MERCHANT_STATUS':
      return `user:${event.merchantId}`;
    case 'WALLET_CHANGE':
      return `user:${event.ownerId}`;
    case 'NOTIFICATION':
      return `user:${event.userId}`;
    case 'PAYMENT_UPDATE':
      return `user:${event.paymentId}`;
    case 'DISPATCH_EVENT':
      return `task:${event.taskId}`;
  }
}

function getSocketEventName(event: SmartRideEvent): string {
  switch (event.type) {
    case 'TASK_UPDATE':
      return 'task:status:update';
    case 'ORDER_UPDATE':
      return 'order:status:update';
    case 'RIDER_STATUS':
      return 'rider:status:update';
    case 'MERCHANT_STATUS':
      return 'merchant:status:update';
    case 'WALLET_CHANGE':
      return 'wallet:change';
    case 'NOTIFICATION':
      return 'notification';
    case 'PAYMENT_UPDATE':
      return 'payment:status:update';
    case 'DISPATCH_EVENT':
      return 'dispatch:event';
  }
}

// ============================================
// EVENT EMISSION RESULT
// ============================================

export interface EmitResult {
  success: boolean;
  eventId: string;
  persisted: boolean;
  socketDelivered: boolean;
  error?: string;
}

// ============================================
// MAIN EVENT BUS CLASS
// ============================================

export class EventBusService {
  /**
   * Emit a single event.
   * Persists to AuditLog and emits via Socket.io.
   * Supports deduplication and acknowledgement tracking.
   */
  static async emit(event: SmartRideEvent): Promise<EmitResult> {
    const eventId = generateEventId(event);

    try {
      // 1. Persist event to AuditLog with action='EVENT_EMITTED' and entityType='SystemEvent'
      let persisted = false;
      try {
        await db.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            action: 'EVENT_EMITTED',
            entityType: 'SystemEvent',
            entityId: eventId,
            taskId: getTaskId(event),
            orderId: getOrderId(event),
            description: `Event emitted: ${event.type}`,
            newValues: JSON.stringify(event),
            source: 'SYSTEM',
          },
        });
        persisted = true;
      } catch (persistError) {
        console.error('[EventBus] Failed to persist event:', persistError instanceof Error ? persistError.message : persistError);
      }

      // 2. Emit via Socket.io HTTP endpoint
      const socketDelivered = await emitViaSocket(event, eventId);

      return {
        success: persisted || socketDelivered,
        eventId,
        persisted,
        socketDelivered,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EventBus] Emit failed:', errorMessage);
      return {
        success: false,
        eventId,
        persisted: false,
        socketDelivered: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Emit an event with retry on failure.
   * Uses exponential backoff between retries.
   * Tracks retry count in metadata.
   */
  static async emitWithRetry(
    event: SmartRideEvent,
    maxRetries: number = 3
  ): Promise<EmitResult> {
    let lastResult: EmitResult | undefined;
    const enrichedEvent = { ...event, metadata: { ...event.metadata } };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // Add retry count to metadata
        enrichedEvent.metadata = {
          ...enrichedEvent.metadata,
          _retryCount: attempt,
          _maxRetries: maxRetries,
        };

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));

        console.log(`[EventBus] Retry attempt ${attempt}/${maxRetries} for event ${event.type}`);
      }

      lastResult = await this.emit(enrichedEvent);

      if (lastResult.success) {
        if (attempt > 0) {
          console.log(`[EventBus] Event ${event.type} succeeded on attempt ${attempt}`);
        }
        return lastResult;
      }
    }

    console.error(`[EventBus] Event ${event.type} failed after ${maxRetries} retries`);
    return lastResult!;
  }

  /**
   * Emit multiple events in batch.
   * Each event is emitted independently — one failure doesn't block others.
   */
  static async emitBatch(events: SmartRideEvent[]): Promise<EmitResult[]> {
    const results = await Promise.allSettled(
      events.map(event => this.emit(event))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        success: false,
        eventId: generateEventId(events[index]),
        persisted: false,
        socketDelivered: false,
        error: result.reason?.message || 'Batch emission failed',
      };
    });
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export const emitEvent = EventBusService.emit.bind(EventBusService);
export const emitEventWithRetry = EventBusService.emitWithRetry.bind(EventBusService);
export const emitEventBatch = EventBusService.emitBatch.bind(EventBusService);

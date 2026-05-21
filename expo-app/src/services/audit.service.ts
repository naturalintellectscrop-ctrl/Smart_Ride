// ============================================
// SMART RIDE MOBILE - AUDIT SERVICE
// ============================================
// Tracks all mobile app activities and logs them
// to the backend audit system
// ============================================

import { api } from './api';
import { useAuthStore } from '../store/authStore';

// ============================================
// TYPES
// ============================================

type MobileAction =
  | 'SCREEN_VIEWED'
  | 'RIDE_REQUESTED'
  | 'RIDE_CANCELLED'
  | 'TASK_ACCEPTED'
  | 'TASK_DECLINED'
  | 'TASK_COMPLETED'
  | 'ORDER_PLACED'
  | 'ORDER_CANCELLED'
  | 'WALLET_VIEWED'
  | 'WALLET_TOPUP'
  | 'WALLET_WITHDRAWAL'
  | 'SOS_TRIGGERED'
  | 'PROFILE_UPDATED'
  | 'RIDER_ONLINE'
  | 'RIDER_OFFLINE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PAYMENT_INITIATED'
  | 'LOCATION_SHARED'
  | 'RATING_SUBMITTED';

// ============================================
// AUDIT SERVICE CLASS
// ============================================

class AuditService {
  private queue: Array<{
    action: string;
    entityType: string;
    entityId: string;
    description?: string;
    actorType?: string;
    actorId?: string;
    userId?: string;
    riderId?: string;
    orderId?: string;
    taskId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly flushIntervalMs = 10000; // 10 seconds
  private readonly batchSize = 20;

  constructor() {
    // Start periodic flush
    this.startFlushTimer();
  }

  private startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  /**
   * Log a mobile app activity
   * Queues the entry for batch submission
   */
  log(entry: {
    action: MobileAction | string;
    entityType: string;
    entityId: string;
    description?: string;
    actorType?: string;
    actorId?: string;
    userId?: string;
    riderId?: string;
    orderId?: string;
    taskId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  }) {
    // Auto-fill userId from auth store if not provided
    const authState = useAuthStore.getState();
    if (!entry.userId && authState.user?.id) {
      entry.userId = authState.user.id;
    }
    if (!entry.actorId && authState.user?.id) {
      entry.actorId = authState.user.id;
    }

    this.queue.push(entry);

    // Flush immediately if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Log immediately (for critical events like SOS, payments)
   */
  async logImmediate(entry: {
    action: MobileAction | string;
    entityType: string;
    entityId: string;
    description?: string;
    actorType?: string;
    actorId?: string;
    userId?: string;
    riderId?: string;
    orderId?: string;
    taskId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  }) {
    // Auto-fill userId from auth store
    const authState = useAuthStore.getState();
    if (!entry.userId && authState.user?.id) {
      entry.userId = authState.user.id;
    }
    if (!entry.actorId && authState.user?.id) {
      entry.actorId = authState.user.id;
    }

    try {
      await api.logActivity(entry);
    } catch (error) {
      // Queue for later if immediate fails
      this.queue.push(entry);
    }
  }

  /**
   * Flush queued entries to the backend
   */
  async flush() {
    if (this.queue.length === 0) return;

    const entries = [...this.queue];
    this.queue = [];

    // Send entries one by one (API supports single entry POST)
    // In production, we'd batch these, but for now sequential is fine
    for (const entry of entries) {
      try {
        await api.logActivity(entry);
      } catch (error) {
        console.warn('[AUDIT] Failed to flush entry:', error);
        // Re-queue on failure (limit re-queue to prevent infinite growth)
        if (this.queue.length < 100) {
          this.queue.push(entry);
        }
      }
    }
  }
}

// Singleton instance
export const auditService = new AuditService();

// ============================================
// CONVENIENCE HELPERS
// ============================================

export const MobileAudit = {
  /** Log screen navigation */
  screenViewed(screenName: string, userId?: string) {
    auditService.log({
      action: 'SCREEN_VIEWED',
      entityType: 'Screen',
      entityId: screenName,
      description: `Viewed ${screenName} screen`,
      userId,
    });
  },

  /** Log ride request */
  rideRequested(taskId: string, rideType: string, userId?: string) {
    auditService.logImmediate({
      action: 'RIDE_REQUESTED',
      entityType: 'Task',
      entityId: taskId,
      description: `Requested ${rideType} ride`,
      taskId,
      userId,
    });
  },

  /** Log ride cancellation */
  rideCancelled(taskId: string, reason: string, userId?: string) {
    auditService.logImmediate({
      action: 'RIDE_CANCELLED',
      entityType: 'Task',
      entityId: taskId,
      description: `Cancelled ride: ${reason}`,
      taskId,
      userId,
    });
  },

  /** Log task acceptance (rider) */
  taskAccepted(taskId: string, riderId?: string) {
    auditService.logImmediate({
      action: 'TASK_ACCEPTED',
      entityType: 'Task',
      entityId: taskId,
      description: 'Rider accepted task',
      taskId,
      riderId,
      actorType: 'RIDER',
    });
  },

  /** Log task completion (rider) */
  taskCompleted(taskId: string, riderId?: string) {
    auditService.logImmediate({
      action: 'TASK_COMPLETED',
      entityType: 'Task',
      entityId: taskId,
      description: 'Task completed successfully',
      taskId,
      riderId,
      actorType: 'RIDER',
    });
  },

  /** Log order placement */
  orderPlaced(orderId: string, totalAmount: number, userId?: string) {
    auditService.logImmediate({
      action: 'ORDER_PLACED',
      entityType: 'Order',
      entityId: orderId,
      description: `Placed order for UGX ${totalAmount.toLocaleString()}`,
      orderId,
      userId,
    });
  },

  /** Log wallet top-up */
  walletTopup(walletId: string, amount: number, userId?: string) {
    auditService.logImmediate({
      action: 'WALLET_TOPUP',
      entityType: 'Wallet',
      entityId: walletId,
      description: `Wallet top-up of UGX ${amount.toLocaleString()}`,
      userId,
    });
  },

  /** Log SOS trigger */
  sosTriggered(sosId: string, userId?: string, riderId?: string, taskId?: string) {
    auditService.logImmediate({
      action: 'SOS_TRIGGERED',
      entityType: 'SOS',
      entityId: sosId,
      description: 'Emergency SOS alert triggered',
      userId,
      riderId,
      taskId,
    });
  },

  /** Log profile update */
  profileUpdated(userId: string, updatedFields: string[]) {
    auditService.log({
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: userId,
      description: `Updated profile fields: ${updatedFields.join(', ')}`,
      userId,
    });
  },

  /** Log rider online/offline */
  riderStatusChanged(riderId: string, isOnline: boolean) {
    auditService.log({
      action: isOnline ? 'RIDER_ONLINE' : 'RIDER_OFFLINE',
      entityType: 'Rider',
      entityId: riderId,
      description: `Rider went ${isOnline ? 'online' : 'offline'}`,
      riderId,
      actorType: 'RIDER',
    });
  },

  /** Log login */
  login(userId: string, method: string = 'email') {
    auditService.logImmediate({
      action: 'LOGIN',
      entityType: 'User',
      entityId: userId,
      description: `User logged in via ${method}`,
      userId,
    });
  },

  /** Log logout */
  logout(userId: string) {
    auditService.logImmediate({
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
      description: 'User logged out',
      userId,
    });
  },

  /** Log payment initiation */
  paymentInitiated(paymentId: string, amount: number, method: string, userId?: string) {
    auditService.logImmediate({
      action: 'PAYMENT_INITIATED',
      entityType: 'Payment',
      entityId: paymentId,
      description: `Payment of UGX ${amount.toLocaleString()} via ${method}`,
      userId,
    });
  },

  /** Log rating submission */
  ratingSubmitted(taskId: string, score: number, userId?: string) {
    auditService.log({
      action: 'RATING_SUBMITTED',
      entityType: 'Task',
      entityId: taskId,
      description: `Rated task ${score}/5`,
      taskId,
      userId,
    });
  },
};

export default auditService;

console.log('[AUDIT-SERVICE] Service initialized');

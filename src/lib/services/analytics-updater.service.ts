// ============================================
// SMART RIDE - TASK ANALYTICS UPDATER SERVICE
// ============================================
// Fire-and-forget analytics updates that are
// called during task state transitions to keep
// metrics up-to-date in real-time.
//
// IMPORTANT: Every method must be safe to call
// (non-blocking, errors caught and logged, never
// fails the parent transaction).
// ============================================

import { db } from '@/lib/db';
import { TaskType, TransactionType } from '@prisma/client';

// ============================================
// TASK TYPE → TRANSACTION TYPE MAPPING
// ============================================

const TRANSACTION_TYPE_MAP: Record<TaskType, TransactionType> = {
  SMART_BODA_RIDE: 'RIDE_PAYMENT',
  SMART_CAR_RIDE: 'RIDE_PAYMENT',
  FOOD_DELIVERY: 'FOOD_ORDER_PAYMENT',
  SHOPPING: 'SHOPPING_ORDER_PAYMENT',
  ITEM_DELIVERY: 'ITEM_DELIVERY_PAYMENT',
  SMART_HEALTH_DELIVERY: 'HEALTH_ORDER_PAYMENT',
};

// ============================================
// TASK ANALYTICS UPDATER
// ============================================

export class TaskAnalyticsUpdater {
  // ============================================
  // TASK LIFECYCLE EVENTS
  // ============================================

  /**
   * Called when a new task is created.
   * Records the creation in the FinanceLog for analytics tracking.
   */
  static async onTaskCreated(taskType: TaskType): Promise<void> {
    try {
      await db.financeLog.create({
        data: {
          transactionType: 'ADJUSTMENT',
          referenceId: `task-created-${Date.now()}`,
          amount: 0,
          currency: 'UGX',
          status: 'INFO',
          description: `Task created of type ${taskType}`,
          metadata: JSON.stringify({ taskType, event: 'TASK_CREATED' }),
        },
      });
    } catch (error) {
      console.error('[AnalyticsUpdater] onTaskCreated failed:', error);
    }
  }

  /**
   * Called when a task is assigned to a rider.
   * Tracks assignment rate and dispatch duration.
   */
  static async onTaskAssigned(
    taskType: TaskType,
    riderId: string,
    dispatchDurationMs?: number
  ): Promise<void> {
    try {
      await Promise.all([
        // Update rider's totalTrips counter
        db.rider.update({
          where: { id: riderId },
          data: { totalTrips: { increment: 1 } },
        }),

        // Log the assignment for analytics
        db.financeLog.create({
          data: {
            transactionType: 'ADJUSTMENT',
            referenceId: `task-assigned-${Date.now()}`,
            amount: 0,
            currency: 'UGX',
            riderId,
            status: 'INFO',
            description: `Task assigned for type ${taskType}`,
            metadata: JSON.stringify({
              taskType,
              event: 'TASK_ASSIGNED',
              dispatchDurationMs: dispatchDurationMs ?? null,
            }),
          },
        }),
      ]);
    } catch (error) {
      console.error('[AnalyticsUpdater] onTaskAssigned failed:', error);
    }
  }

  /**
   * Called when a task is completed.
   * Updates rider completedTrips, totalTrips, and totalEarnings.
   * Records completion analytics in FinanceLog.
   */
  static async onTaskCompleted(
    taskType: TaskType,
    riderId: string,
    taskDurationMs?: number,
    riderEarnings?: number
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        completedTrips: { increment: 1 },
      };

      // Add earnings if available
      if (riderEarnings && riderEarnings > 0) {
        updateData.totalEarnings = { increment: riderEarnings };
      }

      await Promise.all([
        // Update rider stats
        db.rider.update({
          where: { id: riderId },
          data: updateData,
        }),

        // Log completion analytics
        db.financeLog.create({
          data: {
            transactionType: TRANSACTION_TYPE_MAP[taskType] || 'RIDE_PAYMENT',
            referenceId: `task-completed-${Date.now()}`,
            amount: riderEarnings ?? 0,
            currency: 'UGX',
            riderId,
            status: 'COMPLETED',
            description: `Task completed for type ${taskType}`,
            riderEarnings: riderEarnings ?? 0,
            metadata: JSON.stringify({
              taskType,
              event: 'TASK_COMPLETED',
              taskDurationMs: taskDurationMs ?? null,
            }),
          },
        }),
      ]);
    } catch (error) {
      console.error('[AnalyticsUpdater] onTaskCompleted failed:', error);
    }
  }

  /**
   * Called when a task is cancelled.
   * Updates rider cancelledTrips and totalTrips counters.
   * Records cancellation reason for analytics.
   */
  static async onTaskCancelled(
    taskType: TaskType,
    reason?: string,
    riderId?: string
  ): Promise<void> {
    try {
      const updates: Promise<any>[] = [];

      // Update rider stats if rider was assigned
      if (riderId) {
        updates.push(
          db.rider.update({
            where: { id: riderId },
            data: {
              cancelledTrips: { increment: 1 },
            },
          })
        );
      }

      // Log cancellation analytics
      updates.push(
        db.financeLog.create({
          data: {
            transactionType: 'ADJUSTMENT',
            referenceId: `task-cancelled-${Date.now()}`,
            amount: 0,
            currency: 'UGX',
            riderId: riderId ?? null,
            status: 'CANCELLED',
            description: `Task cancelled for type ${taskType}`,
            metadata: JSON.stringify({
              taskType,
              event: 'TASK_CANCELLED',
              cancellationReason: reason ?? 'UNKNOWN',
            }),
          },
        })
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('[AnalyticsUpdater] onTaskCancelled failed:', error);
    }
  }

  // ============================================
  // RIDER METRICS
  // ============================================

  /**
   * Called when a rider's rating is updated.
   * Updates the rider's rating using a weighted average approach.
   */
  static async onRiderRatingUpdated(
    riderId: string,
    newRating: number
  ): Promise<void> {
    try {
      const rider = await db.rider.findUnique({
        where: { id: riderId },
        select: { rating: true, totalTrips: true, completedTrips: true },
      });

      if (!rider) return;

      // Weighted average: blend existing rating with new rating
      // More weight to existing rating as trip count grows
      const totalRatings = rider.completedTrips || 1;
      const blendedRating =
        totalRatings > 1
          ? (rider.rating * (totalRatings - 1) + newRating) / totalRatings
          : newRating;

      // Clamp to 0-5 range
      const clampedRating = Math.max(0, Math.min(5, blendedRating));

      await db.rider.update({
        where: { id: riderId },
        data: { rating: Math.round(clampedRating * 100) / 100 },
      });
    } catch (error) {
      console.error('[AnalyticsUpdater] onRiderRatingUpdated failed:', error);
    }
  }

  // ============================================
  // DISPATCH MATCH EVENTS
  // ============================================

  /**
   * Called when a new dispatch match is created.
   * Tracks dispatch attempts for acceptance rate calculation.
   */
  static async onDispatchMatchCreated(taskType: TaskType): Promise<void> {
    try {
      await db.financeLog.create({
        data: {
          transactionType: 'ADJUSTMENT',
          referenceId: `dispatch-created-${Date.now()}`,
          amount: 0,
          currency: 'UGX',
          status: 'INFO',
          description: `Dispatch match created for type ${taskType}`,
          metadata: JSON.stringify({
            taskType,
            event: 'DISPATCH_MATCH_CREATED',
          }),
        },
      });
    } catch (error) {
      console.error('[AnalyticsUpdater] onDispatchMatchCreated failed:', error);
    }
  }

  /**
   * Called when a dispatch match is accepted by a rider.
   * Tracks acceptance rate and response time.
   * Updates rider rating with acceptance signal.
   */
  static async onDispatchMatchAccepted(
    taskType: TaskType,
    riderId: string,
    responseTimeMs?: number
  ): Promise<void> {
    try {
      await db.financeLog.create({
        data: {
          transactionType: 'ADJUSTMENT',
          referenceId: `dispatch-accepted-${Date.now()}`,
          amount: 0,
          currency: 'UGX',
          riderId,
          status: 'INFO',
          description: `Dispatch match accepted for type ${taskType}`,
          metadata: JSON.stringify({
            taskType,
            event: 'DISPATCH_MATCH_ACCEPTED',
            responseTimeMs: responseTimeMs ?? null,
          }),
        },
      });
    } catch (error) {
      console.error('[AnalyticsUpdater] onDispatchMatchAccepted failed:', error);
    }
  }

  /**
   * Called when a dispatch match expires without response.
   * Tracks expiration rate for dispatch optimization.
   */
  static async onDispatchMatchExpired(taskType: TaskType): Promise<void> {
    try {
      await db.financeLog.create({
        data: {
          transactionType: 'ADJUSTMENT',
          referenceId: `dispatch-expired-${Date.now()}`,
          amount: 0,
          currency: 'UGX',
          status: 'INFO',
          description: `Dispatch match expired for type ${taskType}`,
          metadata: JSON.stringify({
            taskType,
            event: 'DISPATCH_MATCH_EXPIRED',
          }),
        },
      });
    } catch (error) {
      console.error('[AnalyticsUpdater] onDispatchMatchExpired failed:', error);
    }
  }

  // ============================================
  // PAYMENT EVENTS
  // ============================================

  /**
   * Called when a payment is completed for a task.
   * Records revenue analytics including platform commission and rider earnings.
   */
  static async onPaymentCompleted(
    taskType: TaskType,
    amount: number,
    commission: number,
    riderEarnings: number,
    riderId?: string,
    clientId?: string
  ): Promise<void> {
    try {
      const transactionType = TRANSACTION_TYPE_MAP[taskType] || 'RIDE_PAYMENT';

      await db.financeLog.create({
        data: {
          transactionType,
          referenceId: `payment-completed-${Date.now()}`,
          amount,
          currency: 'UGX',
          clientId: clientId ?? null,
          riderId: riderId ?? null,
          platformCommission: commission,
          riderEarnings,
          status: 'COMPLETED',
          description: `Payment completed for ${taskType}: amount=${amount}, commission=${commission}, riderEarnings=${riderEarnings}`,
          metadata: JSON.stringify({
            taskType,
            event: 'PAYMENT_COMPLETED',
            amount,
            commission,
            riderEarnings,
          }),
        },
      });
    } catch (error) {
      console.error('[AnalyticsUpdater] onPaymentCompleted failed:', error);
    }
  }
}

export default TaskAnalyticsUpdater;

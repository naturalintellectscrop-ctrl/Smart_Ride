// ============================================
// SMART RIDE - DISPATCH PERSISTENCE SERVICE
// ============================================
// Production dispatch system with:
// - Nearest rider matching
// - Rider availability tracking
// - Timeout reassignment
// - Auto-cancel logic
// - DB persistence for all dispatch attempts
// ============================================

import { db } from '@/lib/db';
import { DispatchMatchStatus, TaskStatus, TaskType } from '@prisma/client';
import { CapabilityService } from './capability.service';
import { sendDispatchReassignedNotification, sendSearchingNotification, sendTaskUpdateNotification } from './notification.service';

// ============================================
// DISPATCH CONFIGURATION
// ============================================

const DISPATCH_CONFIG = {
  // Time to wait for rider response (seconds)
  matchTimeout: 30,
  
  // Maximum distance to search for riders (km)
  maxSearchRadius: 10,
  
  // Number of retry attempts before auto-cancel
  maxRetryAttempts: 3,
  
  // Time between retry attempts (seconds)
  retryDelay: 5,
  
  // Scoring weights
  weights: {
    distance: 0.4,
    rating: 0.3,
    completedTrips: 0.2,
    responseTime: 0.1,
  },
};

// ============================================
// DISPATCH SERVICE
// ============================================

export interface DispatchRequest {
  taskId: string;
  taskType: TaskType;
  pickupLatitude: number;
  pickupLongitude: number;
  excludeRiderIds?: string[];
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

export interface DispatchMatch {
  id: string;
  riderId: string;
  matchScore: number;
  distanceKm: number;
  estimatedArrival: number;
  status: DispatchMatchStatus;
  expiresAt: Date;
}

export interface DispatchResult {
  success: boolean;
  match?: DispatchMatch;
  error?: string;
  noRidersAvailable?: boolean;
}

export class DispatchService {
  /**
   * Find and assign the best rider for a task
   */
  static async findAndAssign(
    request: DispatchRequest
  ): Promise<DispatchResult> {
    try {
      // Update task status - use SEARCHING unless already in a matching state
      const currentTask = await db.task.findUnique({
        where: { id: request.taskId },
        select: { status: true },
      });
      
      const matchingStatuses = [TaskStatus.MATCHING, TaskStatus.SEARCHING];
      if (!currentTask || !matchingStatuses.includes(currentTask.status)) {
        await db.task.update({
          where: { id: request.taskId },
          data: {
            status: TaskStatus.SEARCHING,
            matchingStartedAt: new Date(),
          },
        });
      }

      // Find eligible riders
      const eligibleRiders = await CapabilityService.getEligibleRiders(
        request.taskType,
        {
          latitude: request.pickupLatitude,
          longitude: request.pickupLongitude,
          radiusKm: DISPATCH_CONFIG.maxSearchRadius,
          limit: 10,
        }
      );

      // Filter out excluded riders
      const availableRiders = eligibleRiders.filter(
        (r) => !request.excludeRiderIds?.includes(r.id)
      );

      if (availableRiders.length === 0) {
        // No riders available - handle this case
        await this.handleNoRidersAvailable(request.taskId);
        return {
          success: false,
          noRidersAvailable: true,
          error: 'No riders available in the area',
        };
      }

      // Score and rank riders
      const scoredRiders = await this.scoreRiders(
        availableRiders,
        request.pickupLatitude,
        request.pickupLongitude
      );

      // Select the best rider
      const bestRider = scoredRiders[0];

      // Create dispatch match record
      const match = await this.createDispatchMatch(
        request.taskId,
        bestRider.rider.id,
        bestRider.score,
        bestRider.distanceKm,
        bestRider.estimatedArrival
      );

      // Send notification to rider (would integrate with notification service)
      await this.notifyRider(match, request.taskId);

      return {
        success: true,
        match: {
          id: match.id,
          riderId: match.riderId,
          matchScore: match.matchScore,
          distanceKm: match.distanceKm || 0,
          estimatedArrival: match.estimatedArrival || 0,
          status: match.status,
          expiresAt: match.expiresAt,
        },
      };
    } catch (error: any) {
      console.error('Dispatch error:', error);
      return {
        success: false,
        error: error.message || 'Failed to dispatch',
      };
    }
  }

  /**
   * Score riders based on multiple factors
   */
  private static async scoreRiders(
    riders: any[],
    pickupLat: number,
    pickupLng: number
  ): Promise<{ rider: any; score: number; distanceKm: number; estimatedArrival: number }[]> {
    const scoredRiders = riders.map((rider) => {
      const distanceKm = this.calculateDistance(
        pickupLat,
        pickupLng,
        rider.currentLatitude || 0,
        rider.currentLongitude || 0
      );

      // Calculate individual scores (0-100)
      const distanceScore = Math.max(0, 100 - distanceKm * 10);
      const ratingScore = (rider.rating || 5) * 20; // 5.0 rating = 100
      const tripScore = Math.min(100, (rider.completedTrips || 0) / 100);
      
      // Combined weighted score
      const score =
        DISPATCH_CONFIG.weights.distance * distanceScore +
        DISPATCH_CONFIG.weights.rating * ratingScore +
        DISPATCH_CONFIG.weights.completedTrips * tripScore;

      // Estimate arrival time (assuming 30km/h average speed in city)
      const estimatedArrival = Math.round((distanceKm / 30) * 3600); // seconds

      return {
        rider,
        score,
        distanceKm,
        estimatedArrival,
      };
    });

    // Sort by score descending
    return scoredRiders.sort((a, b) => b.score - a.score);
  }

  /**
   * Create a dispatch match record in the database
   */
  private static async createDispatchMatch(
    taskId: string,
    riderId: string,
    matchScore: number,
    distanceKm: number,
    estimatedArrival: number
  ): Promise<any> {
    const expiresAt = new Date(
      Date.now() + DISPATCH_CONFIG.matchTimeout * 1000
    );

    return db.dispatchMatch.create({
      data: {
        taskId,
        riderId,
        matchScore,
        distanceKm,
        estimatedArrival,
        matchReason: 'NEAREST',
        status: DispatchMatchStatus.PENDING,
        expiresAt,
        notificationSent: false,
      },
    });
  }

  /**
   * Notify rider about the dispatch match
   * Emits socket event to the realtime service so the rider app receives the offer.
   * Includes retry logic: if the socket emission fails, retries up to 3 times
   * with 1-second delays. If all retries fail, marks notificationSent as false
   * so the periodic processExpiredMatches() can re-attempt later.
   */
  private static async notifyRider(match: any, taskId: string): Promise<void> {
    // Get task details for the offer
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        taskNumber: true,
        taskType: true,
        pickupAddress: true,
        dropoffAddress: true,
        totalAmount: true,
        riderEarnings: true,
        pickupLatitude: true,
        pickupLongitude: true,
        dropoffLatitude: true,
        dropoffLongitude: true,
        clientId: true,
        paymentMethod: true,
      },
    });

    // Get rider's userId for socket room targeting (rooms are keyed by userId)
    const rider = await db.rider.findUnique({
      where: { id: match.riderId },
      select: { userId: true },
    });

    // Build the socket emission payload
    const socketPort = process.env.SOCKET_PORT || '3002';
    const internalKey = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
    const payload = {
      room: `user:${rider?.userId || match.riderId}`,
      event: 'driver:request',
      data: {
        task: {
          id: taskId,
          taskNumber: task?.taskNumber,
          taskType: task?.taskType,
          pickupAddress: task?.pickupAddress,
          dropoffAddress: task?.dropoffAddress,
          pickupLatitude: task?.pickupLatitude,
          pickupLongitude: task?.pickupLongitude,
          dropoffLatitude: task?.dropoffLatitude,
          dropoffLongitude: task?.dropoffLongitude,
          totalAmount: task?.totalAmount,
          paymentMethod: task?.paymentMethod,
          status: 'ASSIGNED',
        },
        pickup: {
          address: task?.pickupAddress,
          latitude: task?.pickupLatitude || 0,
          longitude: task?.pickupLongitude || 0,
        },
        matchId: match.id,
        distanceKm: match.distanceKm,
        estimatedArrival: match.estimatedArrival,
        expiresAt: match.expiresAt?.toISOString(),
      },
    };

    // Attempt socket emission with retry (3 attempts, 1s delay)
    const maxRetries = 3;
    const retryDelayMs = 1000;
    let notificationSucceeded = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`http://localhost:${socketPort}/emit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': internalKey,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          notificationSucceeded = true;
          console.log(`[Dispatch] Socket notification sent to rider ${match.riderId} about task ${taskId} (attempt ${attempt})`);
          break;
        }

        // Non-OK response — might be temporary server issue
        console.warn(
          `[Dispatch] Socket emission returned ${response.status} for rider ${match.riderId}, task ${taskId} (attempt ${attempt}/${maxRetries})`
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      } catch (error) {
        // Network error — service might be temporarily unavailable
        console.warn(
          `[Dispatch] Socket emission failed for rider ${match.riderId}, task ${taskId} (attempt ${attempt}/${maxRetries}):`,
          error instanceof Error ? error.message : error
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    // Update the match record with the notification result
    if (notificationSucceeded) {
      await db.dispatchMatch.update({
        where: { id: match.id },
        data: {
          notificationSent: true,
          notificationSentAt: new Date(),
        },
      });
    } else {
      // All retries failed — mark notificationSent as false so the
      // periodic processExpiredMatches() can re-attempt notification
      await db.dispatchMatch.update({
        where: { id: match.id },
        data: {
          notificationSent: false,
        },
      });
      console.error(
        `[Dispatch] All ${maxRetries} socket emission attempts failed for rider ${match.riderId}, task ${taskId}. Match added to retry queue.`
      );
    }
  }

  /**
   * Accept a dispatch match (rider accepts the task)
   */
  static async acceptMatch(
    matchId: string,
    riderId: string
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const match = await db.dispatchMatch.findUnique({
        where: { id: matchId },
        include: { task: true },
      });

      if (!match) {
        return { success: false, error: 'Match not found' };
      }

      if (match.riderId !== riderId) {
        return { success: false, error: 'Not authorized' };
      }

      if (match.status !== DispatchMatchStatus.PENDING) {
        return { success: false, error: `Match already ${match.status}` };
      }

      if (new Date() > match.expiresAt) {
        await this.expireMatch(matchId);
        return { success: false, error: 'Match has expired' };
      }

      // Accept the match
      await db.$transaction([
        // Update match status
        db.dispatchMatch.update({
          where: { id: matchId },
          data: {
            status: DispatchMatchStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        }),
        // Update task with rider
        db.task.update({
          where: { id: match.taskId },
          data: {
            riderId,
            status: TaskStatus.ASSIGNED,
            assignedAt: new Date(),
          },
        }),
        // Update rider's current task
        db.rider.update({
          where: { id: riderId },
          data: { currentTaskId: match.taskId },
        }),
        // Cancel other pending matches for this task
        db.dispatchMatch.updateMany({
          where: {
            taskId: match.taskId,
            status: DispatchMatchStatus.PENDING,
            id: { not: matchId },
          },
          data: {
            status: DispatchMatchStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        }),
      ]);

      // Create audit log
      await db.auditLog.create({
        data: {
          actorId: riderId,
          actorType: 'RIDER',
          taskId: match.taskId,
          action: 'DISPATCH_ACCEPTED',
          entityType: 'DispatchMatch',
          entityId: matchId,
          description: `Rider accepted dispatch for task ${match.task.taskNumber}`,
        },
      });

      return { success: true, taskId: match.taskId };
    } catch (error: any) {
      console.error('Accept match error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject a dispatch match (rider declines the task)
   */
  static async rejectMatch(
    matchId: string,
    riderId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const match = await db.dispatchMatch.findUnique({
        where: { id: matchId },
        include: { task: true },
      });

      if (!match) {
        return { success: false, error: 'Match not found' };
      }

      // Update match status
      await db.dispatchMatch.update({
        where: { id: matchId },
        data: {
          status: DispatchMatchStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      // Try to find another rider
      const retryCount = match.retryCount + 1;

      if (retryCount < DISPATCH_CONFIG.maxRetryAttempts) {
        // Update retry count
        await db.dispatchMatch.update({
          where: { id: matchId },
          data: { retryCount },
        });

        // Find next rider
        return this.findAndAssign({
          taskId: match.taskId,
          taskType: match.task.taskType,
          pickupLatitude: match.task.pickupLatitude || 0,
          pickupLongitude: match.task.pickupLongitude || 0,
          excludeRiderIds: [riderId],
        }).then(() => ({ success: true }));
      } else {
        // Max retries reached - auto-cancel
        await this.autoCancelTask(match.taskId, 'Max dispatch attempts reached');
        return { success: true };
      }
    } catch (error: any) {
      console.error('Reject match error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Expire a match that wasn't responded to in time
   */
  static async expireMatch(matchId: string): Promise<void> {
    await db.dispatchMatch.update({
      where: { id: matchId },
      data: {
        status: DispatchMatchStatus.EXPIRED,
        expiredAt: new Date(),
      },
    });
  }

  /**
   * Handle case when no riders are available
   * Updates task status to SEARCHING (keeps it eligible for future matching)
   * and notifies the client about the delay
   */
  private static async handleNoRidersAvailable(taskId: string): Promise<void> {
    console.log(`[Dispatch] No riders available for task ${taskId}`);

    try {
      // Get current task status
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { status: true, clientId: true, taskNumber: true },
      });

      if (!task) {
        console.error(`[Dispatch] Task ${taskId} not found when handling no riders`);
        return;
      }

      // If task is in MATCHING status, move it to SEARCHING so it stays eligible
      // for the periodic expired match processor to retry
      if (task.status === TaskStatus.MATCHING || task.status === TaskStatus.SEARCHING) {
        await db.task.update({
          where: { id: taskId },
          data: {
            status: TaskStatus.SEARCHING,
          },
        });
      }

      // Notify the client about the delay via socket
      await this.notifyClient(taskId, task.clientId, {
        event: 'dispatch:delay',
        data: {
          taskId,
          taskNumber: task.taskNumber,
          status: 'SEARCHING',
          message: 'We are searching for available riders. Please wait a moment.',
          reason: 'NO_RIDERS_AVAILABLE',
        },
      });

      // Create DB notification for the client about the searching status
      try {
        await sendSearchingNotification(task.clientId, taskId, task.taskNumber || taskId);
      } catch (notifError) {
        console.error(`[Dispatch] Failed to send SEARCHING notification for task ${taskId}:`, notifError);
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          taskId,
          action: 'DISPATCH_NO_RIDERS',
          entityType: 'Task',
          entityId: taskId,
          description: `No riders available for task ${task.taskNumber}, status set to SEARCHING`,
          source: 'SYSTEM',
        },
      });
    } catch (error) {
      console.error(`[Dispatch] Error handling no riders for task ${taskId}:`, error);
    }
  }

  /**
   * Notify the client about dispatch status via socket emission
   * Emits an event to the client's user room through the realtime service
   */
  private static async notifyClient(
    taskId: string,
    clientId: string,
    payload: { event: string; data: Record<string, unknown> }
  ): Promise<void> {
    try {
      const socketPort = process.env.SOCKET_PORT || '3002';
      const internalKey = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
      await fetch(`http://localhost:${socketPort}/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': internalKey,
        },
        body: JSON.stringify({
          room: `user:${clientId}`,
          event: payload.event,
          data: payload.data,
        }),
      });
      console.log(`[Dispatch] Client notification sent for task ${taskId}, event: ${payload.event}`);
    } catch (error) {
      // Socket service might not be running - don't fail the dispatch
      console.log(`[Dispatch] Client notification skipped for task ${taskId} (service unavailable)`);
    }
  }

  /**
   * Auto-cancel a task after failed dispatch attempts
   */
  private static async autoCancelTask(
    taskId: string,
    reason: string
  ): Promise<void> {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { clientId: true, taskNumber: true },
    });

    await db.$transaction([
      db.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancellationCode: 'NO_RIDER_AVAILABLE',
        },
      }),
      db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          taskId,
          action: 'AUTO_CANCEL',
          entityType: 'Task',
          entityId: taskId,
          description: `Task auto-cancelled: ${reason}`,
          source: 'SYSTEM',
        },
      }),
    ]);

    // Notify client via socket about the cancellation
    if (task) {
      await this.notifyClient(taskId, task.clientId, {
        event: 'task:cancelled',
        data: {
          taskId,
          taskNumber: task.taskNumber,
          reason: 'NO_RIDER_AVAILABLE',
          message: 'Your task has been cancelled because no rider was available.',
        },
      });

      // Create DB notification for the client about the cancellation
      try {
        await sendTaskUpdateNotification(
          task.clientId,
          taskId,
          task.taskNumber || taskId,
          'CANCELLED'
        );
      } catch (notifError) {
        console.error(`[Dispatch] Failed to send CANCELLED notification for task ${taskId}:`, notifError);
      }
    }

    console.log(`[Dispatch] Task ${taskId} auto-cancelled: ${reason}`);
  }

  /**
   * Re-attempt notification for matches where notification failed.
   * Called by processExpiredMatches() as Step 0 before processing expired matches.
   * 
   * Finds PENDING matches where notificationSent is false and the match
   * hasn't expired yet, then re-attempts the socket emission.
   * 
   * @returns Number of matches re-notified
   */
  private static async retryFailedNotifications(): Promise<number> {
    let retriedCount = 0;

    try {
      // Find PENDING matches where notification was never sent
      const failedNotificationMatches = await db.dispatchMatch.findMany({
        where: {
          status: DispatchMatchStatus.PENDING,
          notificationSent: false,
          // Only retry for matches that haven't expired yet
          expiresAt: { gt: new Date() },
        },
      });

      for (const match of failedNotificationMatches) {
        try {
          console.log(
            `[Dispatch] Re-attempting notification for match ${match.id}, rider ${match.riderId}, task ${match.taskId}`
          );
          await this.notifyRider(match, match.taskId);
          retriedCount++;
        } catch (error) {
          console.error(
            `[Dispatch] Failed to re-notify match ${match.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      if (retriedCount > 0) {
        console.log(`[Dispatch] Re-notified ${retriedCount} matches with failed notifications`);
      }
    } catch (error) {
      console.error('[Dispatch] Error in retryFailedNotifications:', error);
    }

    return retriedCount;
  }

  /**
   * Check and process expired matches (run periodically via cron or scheduler)
   * 
   * This method finds all PENDING matches that have passed their expiresAt timestamp,
   * marks them as EXPIRED, and attempts to reassign the task to a different rider.
   * If no riders are available after exhausting retries, the task may be auto-cancelled.
   * 
   * Also finds tasks stuck in MATCHING or SEARCHING status with no active pending matches,
   * and re-triggers the dispatch flow.
   * 
   * Step 0: Re-attempt notification for PENDING matches where notificationSent=false.
   * 
   * @returns Number of expired matches processed
   */
  static async processExpiredMatches(): Promise<number> {
    let processedCount = 0;

    try {
      // Step 0: Re-attempt failed notifications before processing expired matches
      await this.retryFailedNotifications();

      // Step 1: Find and expire all PENDING matches past their timeout
      const expiredMatches = await db.dispatchMatch.findMany({
        where: {
          status: DispatchMatchStatus.PENDING,
          expiresAt: { lt: new Date() },
        },
        include: {
          task: {
            select: {
              id: true,
              taskNumber: true,
              status: true,
              taskType: true,
              pickupLatitude: true,
              pickupLongitude: true,
              clientId: true,
            },
          },
        },
      });

      for (const match of expiredMatches) {
        try {
          // Expire the match
          await this.expireMatch(match.id);

          // Create audit log for the expiry
          await db.auditLog.create({
            data: {
              actorType: 'SYSTEM',
              taskId: match.taskId,
              action: 'DISPATCH_MATCH_EXPIRED',
              entityType: 'DispatchMatch',
              entityId: match.id,
              description: `Dispatch match expired for rider on task ${match.task?.taskNumber || match.taskId}`,
              source: 'SYSTEM',
              metadata: JSON.stringify({
                riderId: match.riderId,
                matchScore: match.matchScore,
                retryCount: match.retryCount,
              }),
            },
          });

          // Try to reassign if task is still in a matching state
          const task = match.task;
          if (task && (task.status === TaskStatus.SEARCHING || task.status === TaskStatus.MATCHING)) {
            // Count how many expired/rejected matches this task has had
            const failedMatchCount = await db.dispatchMatch.count({
              where: {
                taskId: task.id,
                status: { in: [DispatchMatchStatus.EXPIRED, DispatchMatchStatus.REJECTED] },
              },
            });

            if (failedMatchCount < DISPATCH_CONFIG.maxRetryAttempts) {
              // Notify client that we're still searching
              await this.notifyClient(task.id, task.clientId, {
                event: 'dispatch:retry',
                data: {
                  taskId: task.id,
                  taskNumber: task.taskNumber,
                  message: 'Previous rider did not respond. Searching for another rider...',
                  attempt: failedMatchCount + 1,
                  maxAttempts: DISPATCH_CONFIG.maxRetryAttempts,
                },
              });

              // Create DB notification for the client about the reassignment
              try {
                await sendDispatchReassignedNotification(
                  task.clientId,
                  task.id,
                  task.taskNumber || task.id,
                  'Previous rider did not respond. Searching for another rider...'
                );
              } catch (notifError) {
                console.error(`[Dispatch] Failed to send REASSIGNED notification for task ${task.id}:`, notifError);
              }

              await this.findAndAssign({
                taskId: task.id,
                taskType: task.taskType,
                pickupLatitude: task.pickupLatitude || 0,
                pickupLongitude: task.pickupLongitude || 0,
                excludeRiderIds: [match.riderId],
              });
            } else {
              // Max retries reached - auto-cancel
              await this.autoCancelTask(task.id, 'Max dispatch attempts reached - all riders expired or rejected');

              // Notify client about cancellation
              await this.notifyClient(task.id, task.clientId, {
                event: 'dispatch:cancelled',
                data: {
                  taskId: task.id,
                  taskNumber: task.taskNumber,
                  message: 'Sorry, we could not find an available rider. Your task has been cancelled.',
                  reason: 'MAX_RETRIES_EXCEEDED',
                },
              });
            }
          }

          processedCount++;
        } catch (error) {
          console.error(`[Dispatch] Error processing expired match ${match.id}:`, error);
          // Continue processing other matches
        }
      }

      // Step 2: Find tasks stuck in MATCHING/SEARCHING with no active pending matches
      // These are tasks where all matches may have been expired/rejected but no new
      // dispatch was triggered (edge case during service restart, etc.)
      const stuckTasks = await db.task.findMany({
        where: {
          status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
          matchingStartedAt: { lt: new Date(Date.now() - 60000) }, // stuck for at least 1 minute
        },
        select: {
          id: true,
          taskNumber: true,
          taskType: true,
          pickupLatitude: true,
          pickupLongitude: true,
          clientId: true,
          matchingStartedAt: true,
        },
      });

      for (const task of stuckTasks) {
        // Check if there are any active pending matches for this task
        const activeMatches = await db.dispatchMatch.count({
          where: {
            taskId: task.id,
            status: DispatchMatchStatus.PENDING,
          },
        });

        if (activeMatches === 0) {
          console.log(`[Dispatch] Found stuck task ${task.taskNumber} with no active matches, re-triggering dispatch`);

          // Count total failed attempts
          const failedMatchCount = await db.dispatchMatch.count({
            where: {
              taskId: task.id,
              status: { in: [DispatchMatchStatus.EXPIRED, DispatchMatchStatus.REJECTED] },
            },
          });

          if (failedMatchCount < DISPATCH_CONFIG.maxRetryAttempts) {
            await this.findAndAssign({
              taskId: task.id,
              taskType: task.taskType,
              pickupLatitude: task.pickupLatitude || 0,
              pickupLongitude: task.pickupLongitude || 0,
            });
            processedCount++;
          } else {
            await this.autoCancelTask(task.id, 'Task stuck in matching - max dispatch attempts exceeded');

            await this.notifyClient(task.id, task.clientId, {
              event: 'dispatch:cancelled',
              data: {
                taskId: task.id,
                taskNumber: task.taskNumber,
                message: 'Sorry, we could not find an available rider. Your task has been cancelled.',
                reason: 'STUCK_TASK_MAX_RETRIES',
              },
            });
            processedCount++;
          }
        }
      }

      if (processedCount > 0) {
        console.log(`[Dispatch] Processed ${processedCount} expired/stuck dispatch entries`);
      }
    } catch (error) {
      console.error('[Dispatch] Error in processExpiredMatches:', error);
    }

    return processedCount;
  }

  /**
   * Get dispatch history for a task
   */
  static async getDispatchHistory(taskId: string) {
    return db.dispatchMatch.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        rider: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            rating: true,
          },
        },
      },
    });
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export default DispatchService;

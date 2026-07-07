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

import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { DispatchMatchStatus, TaskStatus, TaskType } from '@prisma/client';
import { CapabilityService } from './capability.service';
import { sendDispatchReassignedNotification, sendSearchingNotification } from './notification.service';
import { sendPushNotification } from './push-notification.service';
import { EnhancedTaskStateMachine } from './enhanced-task-state-machine.service';
import { broadcastToUser } from '@/lib/realtime-server';
import { DEFAULT_DISPATCH_CONFIG } from '@/lib/dispatch/types';

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

  // Hard product cap: never keep a customer searching longer than this.
  // Reuses the single source of truth in dispatch/types (120s).
  maxSearchMs: DEFAULT_DISPATCH_CONFIG.matchingTimeoutMs,
  
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
    // Dispatch is a SYSTEM operation: it must see every eligible rider, but it
    // is triggered from CLIENT-authenticated requests (task creation), whose
    // RLS context cannot read the Rider table (policies: service_role_access /
    // riders_read_own / admin_read_all only). Without elevation the eligible
    // pool is always empty and every client booking dies with "no riders
    // available" — the production dispatch failure found by runtime testing.
    // Route-level auth/IDOR checks have already run before we get here.
    await setServiceRoleContext();
    try {
      // Update task status - use SEARCHING unless already in a matching state
      const currentTask = await db.task.findUnique({
        where: { id: request.taskId },
        select: { status: true },
      });
      
      const matchingStatuses: TaskStatus[] = [TaskStatus.MATCHING, TaskStatus.SEARCHING];
      if (!currentTask || !matchingStatuses.includes(currentTask.status)) {
        // ── PHASE 3: Route status transition through the State Machine ──
        // SM handles: task.status update, matchingStartedAt timestamp, transition
        // record creation, audit log, and post-commit side effects.
        const smResult = await EnhancedTaskStateMachine.transition(
          request.taskId,
          TaskStatus.SEARCHING,
          {
            triggeredByType: 'SYSTEM',
            reason: 'Dispatch searching for riders',
          }
        );
        if (!smResult.success) {
          console.warn(`[Dispatch] SM rejected SEARCHING transition for task ${request.taskId}: ${smResult.error}`);
          // Continue with dispatch even if SM rejects — the task may already
          // be in SEARCHING from a previous call (idempotent case).
        }
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

      // ROTATION: the offer must move through the pool, not bounce back to
      // the same rider. Riders who explicitly DECLINED this task are excluded
      // outright. Riders who let the offer TIME OUT are skipped while fresh
      // candidates exist, but may be re-offered when they're all that's left
      // (small pools) — the retry cap / 120s SLA still bounds the search.
      const priorMatches = await db.dispatchMatch.findMany({
        where: {
          taskId: request.taskId,
          status: { in: [DispatchMatchStatus.REJECTED, DispatchMatchStatus.EXPIRED] },
        },
        select: { riderId: true, status: true },
      });
      const declinedIds = new Set(
        priorMatches.filter((m) => m.status === DispatchMatchStatus.REJECTED).map((m) => m.riderId)
      );
      const timedOutIds = new Set(
        priorMatches.filter((m) => m.status === DispatchMatchStatus.EXPIRED).map((m) => m.riderId)
      );

      let availableRiders = eligibleRiders.filter(
        (r) => !request.excludeRiderIds?.includes(r.id) && !declinedIds.has(r.id)
      );
      const freshRiders = availableRiders.filter((r) => !timedOutIds.has(r.id));
      if (freshRiders.length > 0) {
        availableRiders = freshRiders;
      }

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
    } catch (error: unknown) {
      console.error('Dispatch error:', error);
      return {
        success: false,
        error: 'An internal error occurred',
      };
    } finally {
      // Restore the caller's RLS context (the route's own finally also resets,
      // but findAndAssign is often fire-and-forget after the response).
      await resetRLSContext().catch(() => {});
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
   * Broadcasts event via Supabase Realtime so the rider app receives the offer.
   * If broadcast fails, marks notificationSent as false so the periodic
   * processExpiredMatches() can re-attempt later.
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

    // Get rider's userId for channel targeting (Supabase channels are keyed by userId)
    const rider = await db.rider.findUnique({
      where: { id: match.riderId },
      select: { userId: true },
    });

    // Build the broadcast payload
    const payload = {
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
    };

    // Broadcast via Supabase Realtime
    let notificationSucceeded = false;

    try {
      await broadcastToUser(
        rider?.userId || match.riderId,
        'driver:request',
        payload
      );
      notificationSucceeded = true;
      console.log(`[Dispatch] Notification sent to rider ${match.riderId} about task ${taskId}`);
    } catch (error) {
      console.error(`[Dispatch] Broadcast failed for rider ${match.riderId}:`, error);
    }

    // ALSO send a push notification. The realtime broadcast only reaches the
    // driver while the app is foregrounded with a live channel; a push wakes a
    // backgrounded/closed app so drivers don't miss requests between rides.
    // Fire-and-forget — push failure must never block dispatch.
    if (rider?.userId) {
      const fareText = task?.riderEarnings || task?.totalAmount
        ? ` · UGX ${Number(task.riderEarnings || task.totalAmount).toLocaleString()}`
        : '';
      sendPushNotification({
        userId: rider.userId,
        title: 'New ride request',
        message: `${task?.pickupAddress || 'Nearby pickup'}${fareText}`,
        data: { type: 'driver:request', taskId, matchId: match.id },
      }).catch((err) => console.error(`[Dispatch] Push to rider ${match.riderId} failed:`, err));
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
      // Broadcast failed — mark notificationSent as false so the
      // periodic processExpiredMatches() can re-attempt notification
      await db.dispatchMatch.update({
        where: { id: match.id },
        data: {
          notificationSent: false,
        },
      });
      console.error(
        `[Dispatch] Broadcast failed for rider ${match.riderId}, task ${taskId}. Match added to retry queue.`
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
    // System operation under the caller's RIDER context: accepting must write
    // the client's Task row + cancel sibling matches, which rider-scoped RLS
    // can't fully see. The route has already verified the rider's identity,
    // and the ownership check below (match.riderId !== riderId) still guards.
    await setServiceRoleContext();
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

      // Accept the match — use updateMany with a status guard to prevent
      // double-acceptance when two concurrent requests race for the same match.
      //
      // ── PHASE 3: Transaction Participant Pattern ──
      // We use EnhancedTaskStateMachine.transitionInTx() to delegate the status
      // transition to the SM WITHIN our existing transaction. This avoids unsafe
      // nested transactions (Prisma doesn't support them) while ensuring the SM
      // handles: status update, transition record, audit log, and rider lifecycle.
      //
      // Post-commit side effects (notifications, sockets, analytics) are fired
      // AFTER the transaction commits via emitPostTransitionSideEffects().

      const txResult = await db.$transaction(async (tx) => {
        // Atomically update the match ONLY if it is still PENDING.
        // If another transaction already changed it, this will affect 0 rows.
        const updateResult = await tx.dispatchMatch.updateMany({
          where: { id: matchId, status: DispatchMatchStatus.PENDING },
          data: {
            status: DispatchMatchStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        });

        // If 0 rows were updated, the match was already handled by another
        // concurrent transaction — abort to prevent double-acceptance.
        if (updateResult.count === 0) {
          return { alreadyHandled: true as const, smContextData: null as any };
        }

        // ── Delegate status transition to SM within this transaction ──
        // SM handles: task.status=ASSIGNED, assignedAt, riderId, transition
        // record, audit log, and rider.currentTaskId — all within our tx.
        const smContextData = {
          riderId,
          triggeredByType: 'RIDER' as const,
          reason: 'Rider accepted dispatch match',
        };

        const smResult = await EnhancedTaskStateMachine.transitionInTx(
          tx,
          match.taskId,
          TaskStatus.ASSIGNED,
          smContextData
        );

        if (!smResult.success) {
          // SM rejected the transition — this is a business rule violation.
          // Throw to roll back the entire transaction.
          throw new Error(`State machine rejected ASSIGNED transition: ${smResult.error}`);
        }

        // Cancel other pending matches for this task
        await tx.dispatchMatch.updateMany({
          where: {
            taskId: match.taskId,
            status: DispatchMatchStatus.PENDING,
            id: { not: matchId },
          },
          data: {
            status: DispatchMatchStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        return { alreadyHandled: false as const, smContextData: { smResult, context: smContextData } };
      });

      // If the match was already handled by another concurrent request,
      // return an error so the caller knows it didn't win the race.
      if (txResult.alreadyHandled) {
        return { success: false, error: 'Match already accepted by another request' };
      }

      // ── Fire post-commit side effects AFTER the transaction commits ──
      // This ensures notifications, sockets, and analytics only fire if the
      // transaction was successful — no inconsistency on rollback.
      if (txResult.smContextData) {
        EnhancedTaskStateMachine.emitPostTransitionSideEffects(
          txResult.smContextData.smResult,
          txResult.smContextData.context
        ).catch(err =>
          console.error('[Dispatch] Post-transition side effects failed:', err)
        );
      }

      return { success: true, taskId: match.taskId };
    } catch (error: unknown) {
      console.error('Accept match error:', error);
      return { success: false, error: 'An internal error occurred' };
    } finally {
      await resetRLSContext().catch(() => {});
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
    // Same elevation rationale as acceptMatch — rejection cascades into
    // findAndAssign (reassignment) which must see the full rider pool.
    await setServiceRoleContext();
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
    } catch (error: unknown) {
      console.error('Reject match error:', error);
      return { success: false, error: 'An internal error occurred' };
    } finally {
      await resetRLSContext().catch(() => {});
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
   * After an offer expires, either rotate the task to the next rider or —
   * once maxRetryAttempts offers have failed — give up: cancel the task and
   * tell the client. Without the cap check, a small pool loops forever
   * (verified at runtime: 8 straight offers to the same rider).
   */
  static async rotateAfterExpiry(
    taskId: string,
    taskType: TaskType,
    pickupLatitude: number,
    pickupLongitude: number,
  ): Promise<void> {
    const failedCount = await db.dispatchMatch.count({
      where: {
        taskId,
        status: { in: [DispatchMatchStatus.EXPIRED, DispatchMatchStatus.REJECTED] },
      },
    });

    if (failedCount < DISPATCH_CONFIG.maxRetryAttempts) {
      await this.findAndAssign({ taskId, taskType, pickupLatitude, pickupLongitude });
      return;
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { clientId: true, taskNumber: true, status: true },
    });
    // Only cancel if the task is still searching — never yank an assigned trip.
    if (!task || !['MATCHING', 'SEARCHING', 'CREATED', 'REQUESTED'].includes(task.status)) return;

    await this.autoCancelTask(taskId, 'No rider accepted after maximum attempts');
    await this.notifyClient(taskId, task.clientId, {
      event: 'dispatch:cancelled',
      data: {
        taskId,
        taskNumber: task.taskNumber,
        message: 'Sorry, no rider accepted your request. Please try again.',
        reason: 'MAX_ATTEMPTS',
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

      // ── PHASE 3: Route MATCHING→SEARCHING through the State Machine ──
      // SM handles: task.status update, timestamp, transition record, audit log.
      // Dispatch-specific logic (client socket, DB notification) is preserved.
      if (task.status === TaskStatus.MATCHING || task.status === TaskStatus.SEARCHING) {
        const smResult = await EnhancedTaskStateMachine.transition(
          taskId,
          TaskStatus.SEARCHING,
          {
            triggeredByType: 'SYSTEM',
            reason: 'No riders available, continuing search',
          }
        );
        if (!smResult.success) {
          console.warn(`[Dispatch] SM rejected SEARCHING transition for task ${taskId}: ${smResult.error}`);
        }
      }

      // Notify the client about the delay via Supabase Realtime broadcast
      // (dispatch-specific event — not handled by SM lifecycle hooks)
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
      // (SEARCHING is not in SM's emitNotifications — dispatch-specific)
      try {
        await sendSearchingNotification(task.clientId, taskId, task.taskNumber || taskId);
      } catch (notifError) {
        console.error(`[Dispatch] Failed to send SEARCHING notification for task ${taskId}:`, notifError);
      }
    } catch (error) {
      console.error(`[Dispatch] Error handling no riders for task ${taskId}:`, error);
    }
  }

  /**
   * Notify the client about dispatch status via Supabase Realtime broadcast
   * Emits an event to the client's user channel through Supabase Realtime
   */
  private static async notifyClient(
    taskId: string,
    clientId: string,
    payload: { event: string; data: Record<string, unknown> }
  ): Promise<void> {
    try {
      await broadcastToUser(clientId, payload.event, payload.data);
      console.log(`[Dispatch] Client notification sent for task ${taskId}, event: ${payload.event}`);
    } catch (error) {
      console.log(`[Dispatch] Client notification skipped for task ${taskId} (broadcast failed)`);
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
      select: { clientId: true, taskNumber: true, status: true },
    });

    // ── PHASE 3: Route CANCELLED transition through the State Machine ──
    // SM handles: task.status=CANCELLED, cancelledAt, transition record, audit
    // log, rider.currentTaskId cleanup, notifications, sockets, analytics.
    //
    // We use additionalTaskData to atomically set cancellation metadata fields
    // (cancelledBy, cancellationReason, cancellationCode) within the SM's own
    // transaction — no separate update needed.
    //
    // The previous batch $transaction is eliminated entirely. The SM's own
    // $transaction covers all the atomicity guarantees that the batch provided.
    //
    // Previously duplicated logic (now removed):
    //   - taskStateTransition.create → SM does this
    //   - auditLog.create → SM does this
    //   - sendTaskUpdateNotification → SM does this via emitNotifications
    //   - notifyClient('task:cancelled') → SM does this via emitSocketEvents
    const smResult = await EnhancedTaskStateMachine.cancelTask(
      taskId,
      'SYSTEM',
      reason,
      {
        triggeredByType: 'SYSTEM',
        reason: `Auto-cancelled: ${reason}`,
        cancellationReason: reason,
        additionalTaskData: {
          cancelledBy: 'SYSTEM',
          cancellationReason: reason,
          cancellationCode: 'NO_RIDER_AVAILABLE',
        },
      }
    );

    if (!smResult.success) {
      console.error(`[Dispatch] SM rejected CANCELLED transition for task ${taskId}: ${smResult.error}`);
      return;
    }

    // Dispatch-specific: notify client with user-friendly message about
    // the auto-cancellation. The SM's socket event (task:cancelled) is more
    // generic; this provides additional context specific to dispatch.
    if (task) {
      await this.notifyClient(taskId, task.clientId, {
        event: 'dispatch:cancelled',
        data: {
          taskId,
          taskNumber: task.taskNumber,
          reason: 'NO_RIDER_AVAILABLE',
          message: 'Your task has been cancelled because no rider was available.',
        },
      });
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
          // Hard SLA cap: if this task has been searching past the product
          // maximum (120s) we terminate + notify, no matter how many riders
          // we did or didn't try. This closes the "zero eligible riders ->
          // no matches ever created -> retry forever" hole, since without
          // matches failedMatchCount stays 0 and would otherwise re-dispatch
          // on every cron tick indefinitely.
          const searchedForMs = task.matchingStartedAt
            ? Date.now() - new Date(task.matchingStartedAt).getTime()
            : Number.POSITIVE_INFINITY;

          if (searchedForMs >= DISPATCH_CONFIG.maxSearchMs) {
            console.log(`[Dispatch] Task ${task.taskNumber} exceeded ${DISPATCH_CONFIG.maxSearchMs}ms search cap, auto-cancelling`);
            await this.autoCancelTask(task.id, 'No available rider found within the maximum wait time');

            await this.notifyClient(task.id, task.clientId, {
              event: 'dispatch:cancelled',
              data: {
                taskId: task.id,
                taskNumber: task.taskNumber,
                message: 'Sorry, we could not find an available rider. Your request has been cancelled.',
                reason: 'SEARCH_TIMEOUT',
              },
            });
            processedCount++;
            continue;
          }

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

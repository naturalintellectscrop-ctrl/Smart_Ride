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
   * Emits socket event to the realtime service so the rider app receives the offer
   */
  private static async notifyRider(match: any, taskId: string): Promise<void> {
    // Mark notification as sent in DB
    await db.dispatchMatch.update({
      where: { id: match.id },
      data: {
        notificationSent: true,
        notificationSentAt: new Date(),
      },
    });

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

    // Emit socket event to the realtime service for delivery to the rider
    try {
      // Get rider's userId for socket room targeting (rooms are keyed by userId)
      const rider = await db.rider.findUnique({
        where: { id: match.riderId },
        select: { userId: true },
      });
      
      // Internal HTTP emit API runs on port 3002 (Socket.io WebSocket is on 3001)
      const socketPort = process.env.SOCKET_PORT || '3002';
      const internalKey = process.env.JWT_SECRET || 'internal';
      await fetch(`http://localhost:${socketPort}/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': internalKey,
        },
        body: JSON.stringify({
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
        }),
      });
      console.log(`[Dispatch] Socket notification sent to rider ${match.riderId} about task ${taskId}`);
    } catch (error) {
      // Socket service might not be running - don't fail the dispatch
      console.log(`[Dispatch] Socket notification skipped for rider ${match.riderId} (service unavailable)`);
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
   */
  private static async handleNoRidersAvailable(taskId: string): Promise<void> {
    // Could implement:
    // 1. Notify client about delay
    // 2. Expand search radius
    // 3. Schedule for retry later
    console.log(`[Dispatch] No riders available for task ${taskId}`);
  }

  /**
   * Auto-cancel a task after failed dispatch attempts
   */
  private static async autoCancelTask(
    taskId: string,
    reason: string
  ): Promise<void> {
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
        },
      }),
    ]);

    // Notify client
    console.log(`[Dispatch] Task ${taskId} auto-cancelled: ${reason}`);
  }

  /**
   * Check and process expired matches (run periodically)
   */
  static async processExpiredMatches(): Promise<number> {
    const expiredMatches = await db.dispatchMatch.findMany({
      where: {
        status: DispatchMatchStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
    });

    for (const match of expiredMatches) {
      await this.expireMatch(match.id);
      
      // Try to reassign
      const task = await db.task.findUnique({
        where: { id: match.taskId },
      });

      if (task && (task.status === TaskStatus.SEARCHING || task.status === TaskStatus.MATCHING)) {
        await this.findAndAssign({
          taskId: task.id,
          taskType: task.taskType,
          pickupLatitude: task.pickupLatitude || 0,
          pickupLongitude: task.pickupLongitude || 0,
          excludeRiderIds: [match.riderId],
        });
      }
    }

    return expiredMatches.length;
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

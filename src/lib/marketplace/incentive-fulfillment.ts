// Incentive Fulfillment Service
// Handles driver participation, progress tracking, and automatic reward distribution

import { db } from '@/lib/db';
import { IncentiveType, IncentiveStatus, ParticipationStatus, RewardType } from '@prisma/client';
import { createNotification } from '@/lib/services/notification.service';
import { creditRewardToWallet } from '@/lib/wallet/wallet-service';

// ============================================
// TYPES
// ============================================

export interface IncentiveProgress {
  incentiveId: string;
  incentiveName: string;
  incentiveType: IncentiveType;
  rewardAmount: number;
  rewardType: RewardType;
  
  // Requirements
  minRides: number | null;
  minEarnings: number | null;
  targetHours: number | null;
  
  // Current Progress
  ridesCompleted: number;
  earningsAccumulated: number;
  hoursOnline: number;
  currentStreak: number;
  
  // Percentage
  progressPercent: number;
  isCompleted: boolean;
  
  // Timing
  endTime: Date;
  timeRemaining: number; // seconds
  
  // Status
  status: ParticipationStatus;
}

export interface TaskCompletionData {
  riderId: string;
  taskId: string;
  taskType: string;
  earnings: number;
  completedAt: Date;
  pickupZoneId?: string;
  dropoffZoneId?: string;
}

// ============================================
// PARTICIPATION MANAGEMENT
// ============================================

/**
 * Enroll a driver in an incentive program
 */
export async function enrollInIncentive(
  incentiveId: string,
  riderId: string
): Promise<{ success: boolean; participation?: typeof participation; error?: string }> {
  try {
    // Get the incentive
    const incentive = await db.driverIncentive.findUnique({
      where: { id: incentiveId },
      include: { zone: true },
    });

    if (!incentive) {
      return { success: false, error: 'Incentive not found' };
    }

    // Check if incentive is active
    if (incentive.status !== IncentiveStatus.ACTIVE) {
      return { success: false, error: 'Incentive is not currently active' };
    }

    // Check if within time window
    const now = new Date();
    if (now < incentive.startTime || now > incentive.endTime) {
      return { success: false, error: 'Incentive is not within the valid time window' };
    }

    // Check if already enrolled
    const existing = await db.incentiveParticipation.findUnique({
      where: {
        incentiveId_riderId: { incentiveId, riderId },
      },
    });

    if (existing) {
      return { success: false, error: 'Already enrolled in this incentive' };
    }

    // Check participant cap
    if (incentive.maxParticipants) {
      const currentCount = await db.incentiveParticipation.count({
        where: { incentiveId, status: { in: [ParticipationStatus.ENROLLED, ParticipationStatus.IN_PROGRESS] } },
      });
      if (currentCount >= incentive.maxParticipants) {
        return { success: false, error: 'Incentive has reached maximum participants' };
      }
    }

    // Check eligibility - get rider info
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      include: { reputation: true },
    });

    if (!rider) {
      return { success: false, error: 'Rider not found' };
    }

    // Check rating requirement
    if (incentive.minRating && rider.rating < incentive.minRating) {
      return { success: false, error: `Requires minimum rating of ${incentive.minRating}` };
    }

    // Check completion rate requirement
    if (incentive.minCompletionRate && rider.reputation?.completionRate) {
      if (rider.reputation.completionRate < incentive.minCompletionRate) {
        return { success: false, error: `Requires minimum completion rate of ${(incentive.minCompletionRate * 100).toFixed(0)}%` };
      }
    }

    // Check vehicle type requirement
    if (incentive.vehicleTypes) {
      const allowedTypes = JSON.parse(incentive.vehicleTypes);
      if (rider.vehicleType && !allowedTypes.includes(rider.vehicleType)) {
        return { success: false, error: 'Your vehicle type is not eligible for this incentive' };
      }
    }

    // Create participation
    const participation = await db.incentiveParticipation.create({
      data: {
        incentiveId,
        riderId,
        status: ParticipationStatus.ENROLLED,
      },
    });

    // Update incentive participant count
    await db.driverIncentive.update({
      where: { id: incentiveId },
      data: { currentParticipants: { increment: 1 } },
    });

    return { success: true, participation };
  } catch (error) {
    console.error('Error enrolling in incentive:', error);
    return { success: false, error: 'Failed to enroll in incentive' };
  }
}

/**
 * Get all incentives a driver is eligible for and their progress
 */
export async function getDriverIncentiveProgress(riderId: string): Promise<IncentiveProgress[]> {
  const now = new Date();

  // Get all active incentives
  const activeIncentives = await db.driverIncentive.findMany({
    where: {
      status: IncentiveStatus.ACTIVE,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: { zone: true },
  });

  // Get driver's participations
  const participations = await db.incentiveParticipation.findMany({
    where: { riderId },
    include: { incentive: true },
  });

  const participationMap = new Map(participations.map(p => [p.incentiveId, p]));

  const progressList: IncentiveProgress[] = [];

  for (const incentive of activeIncentives) {
    const participation = participationMap.get(incentive.id);

    const progress: IncentiveProgress = {
      incentiveId: incentive.id,
      incentiveName: incentive.name,
      incentiveType: incentive.incentiveType,
      rewardAmount: incentive.rewardAmount,
      rewardType: incentive.rewardType,
      minRides: incentive.minRides,
      minEarnings: incentive.minEarnings,
      targetHours: incentive.targetHours,
      ridesCompleted: participation?.ridesCompleted || 0,
      earningsAccumulated: participation?.earningsAccumulated || 0,
      hoursOnline: participation?.hoursOnline || 0,
      currentStreak: participation?.currentStreak || 0,
      progressPercent: calculateProgressPercent(incentive, participation),
      isCompleted: participation?.status === ParticipationStatus.COMPLETED || 
                   participation?.status === ParticipationStatus.REWARDED,
      endTime: incentive.endTime,
      timeRemaining: Math.max(0, (incentive.endTime.getTime() - now.getTime()) / 1000),
      status: participation?.status || ParticipationStatus.ENROLLED,
    };

    progressList.push(progress);
  }

  return progressList;
}

/**
 * Calculate progress percentage toward incentive completion
 */
function calculateProgressPercent(
  incentive: { minRides: number | null; minEarnings: number | null; targetHours: number | null },
  participation: { ridesCompleted: number; earningsAccumulated: number; hoursOnline: number } | null
): number {
  if (!participation) return 0;

  const requirements: number[] = [];
  const progresses: number[] = [];

  if (incentive.minRides) {
    requirements.push(incentive.minRides);
    progresses.push(participation.ridesCompleted);
  }

  if (incentive.minEarnings) {
    requirements.push(incentive.minEarnings);
    progresses.push(participation.earningsAccumulated);
  }

  if (incentive.targetHours) {
    requirements.push(incentive.targetHours);
    progresses.push(participation.hoursOnline);
  }

  if (requirements.length === 0) return 100; // No requirements = auto-complete

  // Calculate the minimum progress across all requirements
  const percents = requirements.map((req, i) => Math.min(100, (progresses[i] / req) * 100));
  return Math.min(...percents);
}

// ============================================
// PROGRESS TRACKING
// ============================================

/**
 * Process task completion for incentive progress
 * This should be called whenever a task is completed
 */
export async function processTaskCompletion(data: TaskCompletionData): Promise<void> {
  try {
    // Get all active incentives the driver is participating in
    const participations = await db.incentiveParticipation.findMany({
      where: {
        riderId: data.riderId,
        status: { in: [ParticipationStatus.ENROLLED, ParticipationStatus.IN_PROGRESS] },
      },
      include: {
        incentive: {
          include: { zone: true },
        },
      },
    });

    for (const participation of participations) {
      const incentive = participation.incentive;

      // Check if task qualifies for this incentive
      if (!taskQualifiesForIncentive(data, incentive)) {
        continue;
      }

      // Check valid time window (valid days and hours)
      if (!isWithinValidTimeWindow(incentive, data.completedAt)) {
        continue;
      }

      // Update progress
      const updateData: {
        ridesCompleted?: { increment: number };
        earningsAccumulated?: { increment: number };
        ridesInTargetZone?: { increment: number };
        qualifyingTasks?: string;
        lastProgressAt: Date;
        status?: ParticipationStatus;
      } = {
        lastProgressAt: new Date(),
      };

      // Increment rides
      updateData.ridesCompleted = { increment: 1 };

      // Increment earnings
      if (data.earnings > 0) {
        updateData.earningsAccumulated = { increment: data.earnings };
      }

      // Track zone-specific rides
      if (incentive.zoneId && (data.pickupZoneId === incentive.zoneId || data.dropoffZoneId === incentive.zoneId)) {
        updateData.ridesInTargetZone = { increment: 1 };
      }

      // Track qualifying tasks
      const qualifyingTasks = participation.qualifyingTasks 
        ? JSON.parse(participation.qualifyingTasks) 
        : [];
      qualifyingTasks.push(data.taskId);
      updateData.qualifyingTasks = JSON.stringify(qualifyingTasks);

      // Update status to IN_PROGRESS if first ride
      if (participation.status === ParticipationStatus.ENROLLED) {
        updateData.status = ParticipationStatus.IN_PROGRESS;
      }

      // Update participation
      const updatedParticipation = await db.incentiveParticipation.update({
        where: { id: participation.id },
        data: updateData,
      });

      // Check if incentive is completed
      const isCompleted = checkIncentiveCompletion(incentive, updatedParticipation);

      if (isCompleted) {
        await completeIncentiveAndReward(participation.id);
      }
    }
  } catch (error) {
    console.error('Error processing task completion for incentives:', error);
  }
}

/**
 * Check if a task qualifies for an incentive
 */
function taskQualifiesForIncentive(
  task: TaskCompletionData,
  incentive: {
    incentiveType: IncentiveType;
    zoneId: string | null;
    targetZones: string | null;
    vehicleTypes: string | null;
  }
): boolean {
  // Zone-specific incentive
  if (incentive.zoneId) {
    if (task.pickupZoneId !== incentive.zoneId && task.dropoffZoneId !== incentive.zoneId) {
      return false;
    }
  }

  // Multiple target zones
  if (incentive.targetZones) {
    const targetZones = JSON.parse(incentive.targetZones);
    if (targetZones.length > 0) {
      const inTargetZone = targetZones.includes(task.pickupZoneId) || 
                          targetZones.includes(task.dropoffZoneId);
      if (!inTargetZone) return false;
    }
  }

  return true;
}

/**
 * Check if current time is within valid days/hours for incentive
 */
function isWithinValidTimeWindow(
  incentive: {
    validDays: string | null;
    validHoursStart: number | null;
    validHoursEnd: number | null;
  },
  completedAt: Date
): boolean {
  // Check valid days
  if (incentive.validDays) {
    const validDays = JSON.parse(incentive.validDays);
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const taskDay = dayNames[completedAt.getDay()];
    if (!validDays.includes(taskDay)) {
      return false;
    }
  }

  // Check valid hours
  if (incentive.validHoursStart !== null && incentive.validHoursEnd !== null) {
    const hour = completedAt.getHours();
    if (hour < incentive.validHoursStart || hour >= incentive.validHoursEnd) {
      return false;
    }
  }

  return true;
}

/**
 * Check if incentive requirements are met
 */
function checkIncentiveCompletion(
  incentive: {
    minRides: number | null;
    minEarnings: number | null;
    targetHours: number | null;
    streakDays: number | null;
    incentiveType: IncentiveType;
  },
  participation: {
    ridesCompleted: number;
    earningsAccumulated: number;
    hoursOnline: number;
    currentStreak: number;
  }
): boolean {
  // Check ride requirement
  if (incentive.minRides && participation.ridesCompleted < incentive.minRides) {
    return false;
  }

  // Check earnings requirement
  if (incentive.minEarnings && participation.earningsAccumulated < incentive.minEarnings) {
    return false;
  }

  // Check hours requirement
  if (incentive.targetHours && participation.hoursOnline < incentive.targetHours) {
    return false;
  }

  // Check streak requirement
  if (incentive.streakDays && participation.currentStreak < incentive.streakDays) {
    return false;
  }

  return true;
}

// ============================================
// REWARD DISTRIBUTION
// ============================================

/**
 * Complete incentive and credit reward to driver's wallet
 */
export async function completeIncentiveAndReward(participationId: string): Promise<{
  success: boolean;
  rewardAmount?: number;
  error?: string;
}> {
  try {
    // Get participation with incentive details
    const participation = await db.incentiveParticipation.findUnique({
      where: { id: participationId },
      include: {
        incentive: true,
        rider: {
          include: { user: true },
        },
      },
    });

    if (!participation) {
      return { success: false, error: 'Participation not found' };
    }

    if (participation.status === ParticipationStatus.REWARDED) {
      return { success: false, error: 'Incentive already rewarded' };
    }

    const rewardAmount = participation.incentive.rewardAmount;

    // Start a transaction to update everything atomically
    const result = await db.$transaction(async (tx) => {
      // 1. Update participation status
      const updatedParticipation = await tx.incentiveParticipation.update({
        where: { id: participationId },
        data: {
          status: ParticipationStatus.REWARDED,
          rewardEarned: rewardAmount,
          rewardCreditedAt: new Date(),
        },
      });

      // 2. Credit to rider's actual wallet (using wallet service)
      await tx.rider.update({
        where: { id: participation.riderId },
        data: {
          walletBalance: { increment: rewardAmount },
          totalEarnings: { increment: rewardAmount },
        },
      });
      
      // Also credit to the real wallet system
      await creditRewardToWallet({
        ownerId: participation.riderId,
        ownerType: 'RIDER',
        amount: rewardAmount,
        referenceId: participationId,
        referenceType: 'INCENTIVE',
        description: `Incentive reward: ${participation.incentive.name}`,
      });

      // 3. Update incentive totals
      await tx.driverIncentive.update({
        where: { id: participation.incentiveId },
        data: {
          totalRewardsPaid: { increment: rewardAmount },
          totalRidesCompleted: { increment: participation.ridesCompleted },
          currentPayout: { increment: rewardAmount },
        },
      });

      // 4. Create finance log
      await tx.financeLog.create({
        data: {
          transactionType: 'RIDER_PAYOUT',
          referenceId: participationId,
          amount: rewardAmount,
          riderId: participation.riderId,
          description: `Incentive reward: ${participation.incentive.name}`,
          status: 'COMPLETED',
          metadata: JSON.stringify({
            incentiveId: participation.incentiveId,
            incentiveName: participation.incentive.name,
            incentiveType: participation.incentive.incentiveType,
            participationId,
          }),
        },
      });

      // 5. Create DriverIncentiveEarned record for reputation tracking
      await tx.driverIncentiveEarned.create({
        data: {
          reputationId: participation.rider.reputation?.id || '',
          incentiveId: participation.incentiveId,
          incentiveType: mapIncentiveType(participation.incentive.incentiveType),
          name: participation.incentive.name,
          description: participation.incentive.description,
          rewardAmount: rewardAmount,
          rewardType: participation.incentive.rewardType,
          qualifyingMetric: getQualifyingMetric(participation),
          qualifyingValue: getQualifyingValue(participation),
          status: 'PAID',
          paidOutAt: new Date(),
        },
      });

      return updatedParticipation;
    });

    // 6. Send notification to driver
    await createNotification({
      userId: participation.rider.userId,
      title: `🎁 Incentive Completed!`,
      message: `Congratulations! You've earned ${formatCurrency(rewardAmount)} for completing "${participation.incentive.name}". The reward has been credited to your wallet.`,
      type: 'PAYMENT',
      referenceId: participationId,
      referenceType: 'INCENTIVE_REWARD',
    });

    return { success: true, rewardAmount };
  } catch (error) {
    console.error('Error completing incentive reward:', error);
    return { success: false, error: 'Failed to process reward' };
  }
}

/**
 * Map IncentiveType to DriverIncentiveType for reputation tracking
 */
function mapIncentiveType(type: IncentiveType): string {
  const mapping: Record<IncentiveType, string> = {
    PEAK_HOUR_BONUS: 'PEAK_PERFORMANCE',
    RIDE_STREAK: 'STREAK_BONUS',
    ZONE_SPECIFIC: 'QUALITY_BONUS',
    GUARANTEED_EARNINGS: 'RELIABILITY_AWARD',
    FIRST_RIDE_BONUS: 'QUALITY_BONUS',
    REFERRAL_BONUS: 'QUALITY_BONUS',
    COMPLETION_BONUS: 'COMPLETION_BONUS',
    QUALITY_BONUS: 'QUALITY_BONUS',
  };
  return mapping[type] || 'QUALITY_BONUS';
}

/**
 * Get qualifying metric description
 */
function getQualifyingMetric(participation: {
  ridesCompleted: number;
  earningsAccumulated: number;
  incentive: { incentiveType: IncentiveType; minRides: number | null; minEarnings: number | null };
}): string {
  const parts: string[] = [];
  
  if (participation.incentive.minRides) {
    parts.push(`rides: ${participation.ridesCompleted}/${participation.incentive.minRides}`);
  }
  if (participation.incentive.minEarnings) {
    parts.push(`earnings: ${formatCurrency(participation.earningsAccumulated)}`);
  }
  
  return parts.join(', ') || 'completed';
}

/**
 * Get qualifying value for record
 */
function getQualifyingValue(participation: {
  ridesCompleted: number;
  earningsAccumulated: number;
}): number {
  return participation.ridesCompleted + participation.earningsAccumulated;
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Process all pending rewards (for scheduled jobs)
 */
export async function processPendingRewards(): Promise<{
  processed: number;
  totalRewards: number;
}> {
  // Find participations that are COMPLETED but not yet REWARDED
  const pendingRewards = await db.incentiveParticipation.findMany({
    where: {
      status: ParticipationStatus.COMPLETED,
    },
  });

  let processed = 0;
  let totalRewards = 0;

  for (const pending of pendingRewards) {
    const result = await completeIncentiveAndReward(pending.id);
    if (result.success && result.rewardAmount) {
      processed++;
      totalRewards += result.rewardAmount;
    }
  }

  return { processed, totalRewards };
}

/**
 * Mark expired participations as failed
 */
export async function expireEndedIncentives(): Promise<number> {
  const now = new Date();

  // Find participations in incentives that have ended
  const result = await db.incentiveParticipation.updateMany({
    where: {
      status: { in: [ParticipationStatus.ENROLLED, ParticipationStatus.IN_PROGRESS] },
      incentive: {
        endTime: { lt: now },
      },
    },
    data: {
      status: ParticipationStatus.FAILED,
    },
  });

  return result.count;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// EXPORTS
// ============================================

export {
  enrollInIncentive,
  getDriverIncentiveProgress,
  processTaskCompletion,
  completeIncentiveAndReward,
  processPendingRewards,
  expireEndedIncentives,
};

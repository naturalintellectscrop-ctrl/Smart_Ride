/**
 * Settlement Service for Smart Ride
 * SafeBoda-style rider settlement processing
 * 
 * Handles calculation of rider earnings, batch settlement processing,
 * and integration with MTN Mobile Money and Airtel Money for payouts.
 */

import { db } from '@/lib/db';
import { PayoutStatus, TaskType, PaymentMethod } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface SettlementPeriod {
  startDate: Date;
  endDate: Date;
}

export interface RiderEarningsSummary {
  riderId: string;
  riderName: string;
  riderPhone: string;
  totalTasks: number;
  completedTasks: number;
  totalEarnings: number;
  platformCommission: number;
  bonuses: number;
  deductions: number;
  netEarnings: number;
  cashCollected: number;
  cashDeposited: number;
  pendingCash: number;
  taskBreakdown: Record<TaskType, { count: number; earnings: number }>;
}

export interface SettlementRecord {
  id: string;
  riderId: string;
  periodStart: Date;
  periodEnd: Date;
  taskCount: number;
  grossAmount: number;
  platformCommission: number;
  adjustments: number;
  netAmount: number;
  status: PayoutStatus;
  paymentMethod: string;
  phoneNumber: string;
  transactionId?: string;
  processedAt?: Date;
  failureReason?: string;
}

export interface BatchSettlementResult {
  totalPayouts: number;
  totalAmount: number;
  successful: number;
  failed: number;
  pending: number;
  settlements: SettlementRecord[];
}

export interface SettlementFilter {
  riderId?: string;
  status?: PayoutStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================
// CONSTANTS
// ============================================

// Minimum payout amount (UGX)
const MINIMUM_PAYOUT_AMOUNT = 5000;

// Settlement periods
const SETTLEMENT_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
} as const;

// Payout processing fees
const PAYOUT_FEES = {
  MTN_MOMO: 500, // UGX
  AIRTEL_MONEY: 500, // UGX
  BANK_TRANSFER: 2000, // UGX
};

// ============================================
// SETTLEMENT SERVICE
// ============================================

/**
 * Calculate rider earnings for a period
 */
export async function calculateRiderEarnings(
  riderId: string,
  period: SettlementPeriod
): Promise<RiderEarningsSummary> {
  // Get rider details
  const rider = await db.rider.findUnique({
    where: { id: riderId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      totalEarnings: true,
    },
  });

  if (!rider) {
    throw new Error(`Rider not found: ${riderId}`);
  }

  // Get completed tasks in period
  const tasks = await db.task.findMany({
    where: {
      riderId,
      status: 'COMPLETED',
      completedAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
    select: {
      id: true,
      taskType: true,
      totalAmount: true,
      platformCommission: true,
      riderEarnings: true,
      paymentMethod: true,
    },
  });

  // Get cash collections
  const cashCollections = await db.cashCollection.findMany({
    where: {
      riderId,
      collectedAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
    select: {
      amount: true,
      collectionType: true,
      status: true,
    },
  });

  // Calculate totals
  let totalEarnings = 0;
  let platformCommission = 0;
  const taskBreakdown: Record<string, { count: number; earnings: number }> = {};

  for (const task of tasks) {
    totalEarnings += task.riderEarnings || 0;
    platformCommission += task.platformCommission || 0;

    const type = task.taskType;
    if (!taskBreakdown[type]) {
      taskBreakdown[type] = { count: 0, earnings: 0 };
    }
    taskBreakdown[type].count++;
    taskBreakdown[type].earnings += task.riderEarnings || 0;
  }

  // Calculate cash totals
  let cashCollected = 0;
  let cashDeposited = 0;

  for (const collection of cashCollections) {
    cashCollected += collection.amount;
    if (collection.status === 'DEPOSITED' || collection.status === 'VERIFIED') {
      cashDeposited += collection.amount;
    }
  }

  const pendingCash = cashCollected - cashDeposited;

  return {
    riderId: rider.id,
    riderName: rider.fullName,
    riderPhone: rider.phone,
    totalTasks: tasks.length,
    completedTasks: tasks.length,
    totalEarnings,
    platformCommission,
    bonuses: 0, // TODO: Implement bonus system
    deductions: 0, // TODO: Implement deduction system
    netEarnings: totalEarnings,
    cashCollected,
    cashDeposited,
    pendingCash,
    taskBreakdown: taskBreakdown as Record<TaskType, { count: number; earnings: number }>,
  };
}

/**
 * Create a settlement record for a rider
 */
export async function createSettlement(
  riderId: string,
  period: SettlementPeriod,
  paymentMethod: 'MTN_MOMO' | 'AIRTEL_MONEY' | 'BANK_TRANSFER',
  phoneNumber?: string
): Promise<SettlementRecord> {
  // Calculate earnings
  const earnings = await calculateRiderEarnings(riderId, period);

  // Check minimum payout
  if (earnings.netEarnings < MINIMUM_PAYOUT_AMOUNT) {
    throw new Error(`Minimum payout amount is UGX ${MINIMUM_PAYOUT_AMOUNT}. Current earnings: UGX ${earnings.netEarnings}`);
  }

  // Get rider phone if not provided
  let payoutPhone = phoneNumber;
  if (!payoutPhone) {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      select: { phone: true },
    });
    payoutPhone = rider?.phone;
  }

  // Calculate processing fee
  const processingFee = PAYOUT_FEES[paymentMethod] || 0;

  // Generate settlement reference
  const settlementRef = `STL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  // Create settlement and rider payout atomically in a transaction.
  // Both records track the same data; they must be created together to prevent divergence.
  const settlement = await db.$transaction(async (tx) => {
    const settlement = await tx.settlement.create({
      data: {
        settlementRef,
        recipientType: 'RIDER',
        recipientId: riderId,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        taskCount: earnings.completedTasks,
        grossAmount: earnings.totalEarnings,
        platformCommission: earnings.platformCommission,
        adjustments: 0,
        netAmount: earnings.netEarnings - processingFee,
        status: 'PENDING',
        paymentMethod,
        paymentReference: payoutPhone,
      },
    });

    // Also create rider payout record for compatibility.
    // This is coupled with the Settlement record — both must exist together.
    await tx.riderPayout.create({
      data: {
        riderId,
        amount: earnings.netEarnings - processingFee,
        status: 'PENDING',
        periodStart: period.startDate,
        periodEnd: period.endDate,
        taskCount: earnings.completedTasks,
        paymentMethod,
        phoneNumber: payoutPhone,
      },
    });

    return settlement;
  });

  return {
    id: settlement.id,
    riderId,
    periodStart: period.startDate,
    periodEnd: period.endDate,
    taskCount: earnings.completedTasks,
    grossAmount: earnings.totalEarnings,
    platformCommission: earnings.platformCommission,
    adjustments: 0,
    netAmount: earnings.netEarnings - processingFee,
    status: 'PENDING',
    paymentMethod,
    phoneNumber: payoutPhone || '',
  };
}

/**
 * Process a single settlement payout
 */
export async function processSettlement(settlementId: string): Promise<SettlementRecord> {
  const settlement = await db.settlement.findUnique({
    where: { id: settlementId },
  });

  if (!settlement) {
    throw new Error(`Settlement not found: ${settlementId}`);
  }

  if (settlement.status !== 'PENDING') {
    throw new Error(`Settlement already processed: ${settlement.status}`);
  }

  // Update status to processing
  await db.settlement.update({
    where: { id: settlementId },
    data: { status: 'PROCESSING' },
  });

  try {
    // In production, integrate with actual MoMo APIs
    // For now, we'll simulate the payout
    const transactionId = `TXN${Date.now().toString(36).toUpperCase()}`;

    // Update settlement as completed
    const updated = await db.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'COMPLETED',
        transactionId,
        processedAt: new Date(),
        paidAt: new Date(),
      },
    });

    // Update rider payout record
    await db.riderPayout.updateMany({
      where: {
        riderId: settlement.recipientId,
        periodStart: settlement.periodStart,
        periodEnd: settlement.periodEnd,
      },
      data: {
        status: 'COMPLETED',
        transactionId,
        processedAt: new Date(),
      },
    });

    // Create finance log
    await db.financeLog.create({
      data: {
        transactionType: 'RIDER_PAYOUT',
        referenceId: settlementId,
        amount: settlement.netAmount,
        riderId: settlement.recipientId,
        platformCommission: 0,
        riderEarnings: settlement.netAmount,
        status: 'COMPLETED',
        description: `Settlement payout for period ${settlement.periodStart.toISOString()} - ${settlement.periodEnd.toISOString()}`,
      },
    });

    return {
      id: updated.id,
      riderId: updated.recipientId,
      periodStart: updated.periodStart,
      periodEnd: updated.periodEnd,
      taskCount: updated.taskCount,
      grossAmount: updated.grossAmount,
      platformCommission: updated.platformCommission,
      adjustments: updated.adjustments,
      netAmount: updated.netAmount,
      status: updated.status as PayoutStatus,
      paymentMethod: updated.paymentMethod || '',
      phoneNumber: updated.paymentReference || '',
      transactionId: updated.transactionId || undefined,
      processedAt: updated.processedAt || undefined,
    };
  } catch (error) {
    // Mark as failed
    await db.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Process batch settlements for multiple riders
 */
export async function processBatchSettlements(
  riderIds: string[],
  period: SettlementPeriod,
  paymentMethod: 'MTN_MOMO' | 'AIRTEL_MONEY' | 'BANK_TRANSFER'
): Promise<BatchSettlementResult> {
  const results: SettlementRecord[] = [];
  let successful = 0;
  let failed = 0;
  let pending = 0;
  let totalAmount = 0;

  for (const riderId of riderIds) {
    try {
      const settlement = await createSettlement(riderId, period, paymentMethod);
      
      // Attempt to process
      const processed = await processSettlement(settlement.id);
      results.push(processed);
      
      if (processed.status === 'COMPLETED') {
        successful++;
        totalAmount += processed.netAmount;
      } else if (processed.status === 'FAILED') {
        failed++;
      } else {
        pending++;
      }
    } catch (error) {
      failed++;
      console.error(`Failed to process settlement for rider ${riderId}:`, error);
    }
  }

  return {
    totalPayouts: riderIds.length,
    totalAmount,
    successful,
    failed,
    pending,
    settlements: results,
  };
}

/**
 * Get settlements with filtering
 */
export async function getSettlements(filter: SettlementFilter = {}): Promise<{
  settlements: SettlementRecord[];
  total: number;
}> {
  const where: Record<string, unknown> = {
    recipientType: 'RIDER',
  };

  if (filter.riderId) {
    where.recipientId = filter.riderId;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.startDate || filter.endDate) {
    where.createdAt = {};
    if (filter.startDate) {
      (where.createdAt as Record<string, Date>).gte = filter.startDate;
    }
    if (filter.endDate) {
      (where.createdAt as Record<string, Date>).lte = filter.endDate;
    }
  }

  const [settlements, total] = await Promise.all([
    db.settlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 20,
      skip: filter.offset || 0,
    }),
    db.settlement.count({ where }),
  ]);

  return {
    settlements: settlements.map((s) => ({
      id: s.id,
      riderId: s.recipientId,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      taskCount: s.taskCount,
      grossAmount: s.grossAmount,
      platformCommission: s.platformCommission,
      adjustments: s.adjustments,
      netAmount: s.netAmount,
      status: s.status as PayoutStatus,
      paymentMethod: s.paymentMethod || '',
      phoneNumber: s.paymentReference || '',
      transactionId: s.transactionId || undefined,
      processedAt: s.processedAt || undefined,
      failureReason: s.failureReason || undefined,
    })),
    total,
  };
}

/**
 * Get pending settlements count and total
 */
export async function getPendingSettlementsSummary(): Promise<{
  count: number;
  totalAmount: number;
  riders: string[];
}> {
  const pendingSettlements = await db.settlement.findMany({
    where: {
      recipientType: 'RIDER',
      status: 'PENDING',
    },
    select: {
      recipientId: true,
      netAmount: true,
    },
  });

  return {
    count: pendingSettlements.length,
    totalAmount: pendingSettlements.reduce((sum, s) => sum + s.netAmount, 0),
    riders: [...new Set(pendingSettlements.map((s) => s.recipientId))],
  };
}

/**
 * Retry a failed settlement
 */
export async function retrySettlement(settlementId: string): Promise<SettlementRecord> {
  const settlement = await db.settlement.findUnique({
    where: { id: settlementId },
  });

  if (!settlement) {
    throw new Error(`Settlement not found: ${settlementId}`);
  }

  if (settlement.status !== 'FAILED') {
    throw new Error('Only failed settlements can be retried');
  }

  // Reset status to pending
  await db.settlement.update({
    where: { id: settlementId },
    data: {
      status: 'PENDING',
      failedAt: null,
      failureReason: null,
    },
  });

  // Process again
  return processSettlement(settlementId);
}

/**
 * Generate settlement report
 */
export async function generateSettlementReport(
  period: SettlementPeriod
): Promise<{
  period: SettlementPeriod;
  totalRiders: number;
  totalSettlements: number;
  totalAmount: number;
  totalCommission: number;
  averagePayout: number;
  byPaymentMethod: Record<string, { count: number; amount: number }>;
}> {
  const settlements = await db.settlement.findMany({
    where: {
      recipientType: 'RIDER',
      periodStart: { gte: period.startDate },
      periodEnd: { lte: period.endDate },
      status: 'COMPLETED',
    },
  });

  const uniqueRiders = new Set(settlements.map((s) => s.recipientId));
  const totalAmount = settlements.reduce((sum, s) => sum + s.netAmount, 0);
  const totalCommission = settlements.reduce((sum, s) => sum + s.platformCommission, 0);
  const byPaymentMethod: Record<string, { count: number; amount: number }> = {};

  for (const settlement of settlements) {
    const method = settlement.paymentMethod || 'UNKNOWN';
    if (!byPaymentMethod[method]) {
      byPaymentMethod[method] = { count: 0, amount: 0 };
    }
    byPaymentMethod[method].count++;
    byPaymentMethod[method].amount += settlement.netAmount;
  }

  return {
    period,
    totalRiders: uniqueRiders.size,
    totalSettlements: settlements.length,
    totalAmount,
    totalCommission,
    averagePayout: settlements.length > 0 ? totalAmount / settlements.length : 0,
    byPaymentMethod,
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  MINIMUM_PAYOUT_AMOUNT,
  SETTLEMENT_PERIODS,
  PAYOUT_FEES,
};

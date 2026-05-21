/**
 * Cash Tracking Service for Smart Ride
 * SafeBoda-style cash collection and float management
 * 
 * Tracks cash collected by riders for COD (Cash on Delivery) orders,
 * manages float balances, and handles cash deposits and reconciliation.
 */

import { db } from '@/lib/db';
import { CollectionType, CollectionStatus, TaskStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CashCollectionInput {
  riderId: string;
  taskId?: string;
  userId?: string;
  amount: number;
  collectionType: CollectionType;
  notes?: string;
}

export interface CashDepositInput {
  riderId: string;
  amount: number;
  depositReference?: string;
  notes?: string;
}

export interface RiderCashSummary {
  riderId: string;
  riderName: string;
  riderPhone: string;
  totalCashCollected: number;
  totalCashDeposited: number;
  pendingCash: number;
  verifiedCash: number;
  unverifiedCash: number;
  lastCollectionDate?: Date;
  lastDepositDate?: Date;
  overdueAmount: number;
  collections: CashCollectionRecord[];
}

export interface CashCollectionRecord {
  id: string;
  riderId: string;
  taskId?: string;
  taskNumber?: string;
  userId?: string;
  userName?: string;
  amount: number;
  currency: string;
  collectionType: CollectionType;
  status: CollectionStatus;
  collectedAt?: Date;
  depositedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface CashReconciliationResult {
  riderId: string;
  periodStart: Date;
  periodEnd: Date;
  expectedCash: number;
  reportedCash: number;
  discrepancy: number;
  taskCount: number;
  reconciledTasks: number;
  unreconciledTasks: number;
  status: 'BALANCED' | 'DISCREPANCY' | 'PENDING';
}

export interface CashAlert {
  riderId: string;
  riderName: string;
  alertType: 'HIGH_CASH' | 'OVERDUE_DEPOSIT' | 'LARGE_COLLECTION' | 'DISCREPANCY';
  amount: number;
  threshold: number;
  message: string;
  createdAt: Date;
}

// ============================================
// CONSTANTS
// ============================================

// Cash limits (UGX)
const MAX_CASH_HOLDING = 500000; // Maximum cash a rider can hold before mandatory deposit
const LARGE_COLLECTION_THRESHOLD = 200000; // Alert for large single collection
const DEPOSIT_REMINDER_THRESHOLD = 300000; // Remind rider to deposit
const OVERDUE_HOURS = 24; // Hours before cash is considered overdue

// Float management
const INITIAL_FLOAT_AMOUNT = 100000; // Initial float for new riders
const MAX_FLOAT_AMOUNT = 500000; // Maximum float allowed
const FLOAT_REPLENISH_THRESHOLD = 20000; // Replenish when below this

// ============================================
// CASH TRACKING SERVICE
// ============================================

/**
 * Record a cash collection from a task
 */
export async function recordCashCollection(
  input: CashCollectionInput
): Promise<CashCollectionRecord> {
  // Validate rider
  const rider = await db.rider.findUnique({
    where: { id: input.riderId },
    select: { id: true, fullName: true },
  });

  if (!rider) {
    throw new Error(`Rider not found: ${input.riderId}`);
  }

  // Create cash collection record
  const collection = await db.cashCollection.create({
    data: {
      riderId: input.riderId,
      taskId: input.taskId,
      userId: input.userId,
      amount: input.amount,
      currency: 'UGX',
      collectionType: input.collectionType,
      status: 'PENDING',
      notes: input.notes,
    },
  });

  // Update collection time
  await db.cashCollection.update({
    where: { id: collection.id },
    data: {
      status: 'COLLECTED',
      collectedAt: new Date(),
    },
  });

  // Check if this is a large collection
  if (input.amount >= LARGE_COLLECTION_THRESHOLD) {
    // Could trigger notification in production
    console.log(`Large cash collection alert: UGX ${input.amount} for rider ${rider.fullName}`);
  }

  // Get updated cash summary and check limits
  const summary = await getRiderCashSummary(input.riderId);
  if (summary.pendingCash >= MAX_CASH_HOLDING) {
    // Could trigger mandatory deposit notification
    console.log(`Mandatory deposit required for rider ${rider.fullName}: UGX ${summary.pendingCash}`);
  }

  return {
    id: collection.id,
    riderId: collection.riderId,
    taskId: collection.taskId || undefined,
    userId: collection.userId || undefined,
    amount: collection.amount,
    currency: collection.currency,
    collectionType: collection.collectionType,
    status: 'COLLECTED',
    collectedAt: collection.collectedAt || undefined,
    depositedAt: collection.depositedAt || undefined,
    notes: collection.notes || undefined,
    createdAt: collection.createdAt,
  };
}

/**
 * Record a cash deposit from a rider
 */
export async function recordCashDeposit(
  input: CashDepositInput
): Promise<CashCollectionRecord> {
  // Validate rider
  const rider = await db.rider.findUnique({
    where: { id: input.riderId },
    select: { id: true, fullName: true },
  });

  if (!rider) {
    throw new Error(`Rider not found: ${input.riderId}`);
  }

  // Get pending cash collections
  const pendingCollections = await db.cashCollection.findMany({
    where: {
      riderId: input.riderId,
      status: 'COLLECTED',
    },
    orderBy: { collectedAt: 'asc' },
  });

  const totalPending = pendingCollections.reduce((sum, c) => sum + c.amount, 0);

  if (input.amount > totalPending) {
    throw new Error(`Deposit amount (UGX ${input.amount}) exceeds pending cash (UGX ${totalPending})`);
  }

  // Create deposit record
  const deposit = await db.cashCollection.create({
    data: {
      riderId: input.riderId,
      amount: -input.amount, // Negative for deposit
      currency: 'UGX',
      collectionType: 'DEPOSIT',
      status: 'DEPOSITED',
      depositedAt: new Date(),
      notes: input.notes || input.depositReference,
    },
  });

  // Mark pending collections as deposited (FIFO)
  let remainingDeposit = input.amount;
  for (const collection of pendingCollections) {
    if (remainingDeposit <= 0) break;

    await db.cashCollection.update({
      where: { id: collection.id },
      data: {
        status: 'DEPOSITED',
        depositedAt: new Date(),
      },
    });

    remainingDeposit -= collection.amount;
  }

  // Create finance log
  await db.financeLog.create({
    data: {
      transactionType: 'CASH_COLLECTION',
      referenceId: deposit.id,
      amount: input.amount,
      riderId: input.riderId,
      status: 'COMPLETED',
      description: `Cash deposit by rider ${rider.fullName}`,
    },
  });

  return {
    id: deposit.id,
    riderId: deposit.riderId,
    amount: input.amount,
    currency: deposit.currency,
    collectionType: 'DEPOSIT',
    status: 'DEPOSITED',
    depositedAt: deposit.depositedAt || undefined,
    notes: deposit.notes || undefined,
    createdAt: deposit.createdAt,
  };
}

/**
 * Get cash summary for a rider
 */
export async function getRiderCashSummary(riderId: string): Promise<RiderCashSummary> {
  const rider = await db.rider.findUnique({
    where: { id: riderId },
    select: {
      id: true,
      fullName: true,
      phone: true,
    },
  });

  if (!rider) {
    throw new Error(`Rider not found: ${riderId}`);
  }

  // Get all cash collections
  const collections = await db.cashCollection.findMany({
    where: { riderId },
    include: {
      user: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate totals
  let totalCashCollected = 0;
  let totalCashDeposited = 0;
  let pendingCash = 0;
  let verifiedCash = 0;
  let unverifiedCash = 0;
  let overdueAmount = 0;
  let lastCollectionDate: Date | undefined;
  let lastDepositDate: Date | undefined;

  const now = new Date();
  const overdueThreshold = new Date(now.getTime() - OVERDUE_HOURS * 60 * 60 * 1000);

  const collectionRecords: CashCollectionRecord[] = [];

  for (const c of collections) {
    if (c.collectionType === 'COD_PAYMENT') {
      totalCashCollected += c.amount;

      if (c.status === 'COLLECTED') {
        pendingCash += c.amount;
        if (c.collectedAt && c.collectedAt < overdueThreshold) {
          overdueAmount += c.amount;
        }
      } else if (c.status === 'DEPOSITED') {
        // Already deposited
      } else if (c.status === 'VERIFIED') {
        verifiedCash += c.amount;
      }

      if (!lastCollectionDate || (c.collectedAt && c.collectedAt > lastCollectionDate)) {
        lastCollectionDate = c.collectedAt || undefined;
      }
    } else if (c.collectionType === 'DEPOSIT') {
      totalCashDeposited += Math.abs(c.amount);
      if (!lastDepositDate || (c.depositedAt && c.depositedAt > lastDepositDate)) {
        lastDepositDate = c.depositedAt || undefined;
      }
    }

    collectionRecords.push({
      id: c.id,
      riderId: c.riderId,
      taskId: c.taskId || undefined,
      userId: c.userId || undefined,
      userName: c.user?.name || undefined,
      amount: Math.abs(c.amount),
      currency: c.currency,
      collectionType: c.collectionType,
      status: c.status,
      collectedAt: c.collectedAt || undefined,
      depositedAt: c.depositedAt || undefined,
      notes: c.notes || undefined,
      createdAt: c.createdAt,
    });
  }

  unverifiedCash = pendingCash;

  return {
    riderId: rider.id,
    riderName: rider.fullName,
    riderPhone: rider.phone,
    totalCashCollected,
    totalCashDeposited,
    pendingCash,
    verifiedCash,
    unverifiedCash,
    lastCollectionDate,
    lastDepositDate,
    overdueAmount,
    collections: collectionRecords.slice(0, 50), // Last 50 collections
  };
}

/**
 * Verify a cash collection
 */
export async function verifyCashCollection(
  collectionId: string,
  verifiedBy: string
): Promise<CashCollectionRecord> {
  const collection = await db.cashCollection.update({
    where: { id: collectionId },
    data: {
      status: 'VERIFIED',
      notes: `Verified by ${verifiedBy} at ${new Date().toISOString()}`,
    },
  });

  return {
    id: collection.id,
    riderId: collection.riderId,
    taskId: collection.taskId || undefined,
    userId: collection.userId || undefined,
    amount: collection.amount,
    currency: collection.currency,
    collectionType: collection.collectionType,
    status: collection.status,
    collectedAt: collection.collectedAt || undefined,
    depositedAt: collection.depositedAt || undefined,
    notes: collection.notes || undefined,
    createdAt: collection.createdAt,
  };
}

/**
 * Reconcile cash collections with tasks
 */
export async function reconcileCashCollections(
  riderId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<CashReconciliationResult> {
  // Get all completed cash tasks for rider in period
  const cashTasks = await db.task.findMany({
    where: {
      riderId,
      paymentMethod: 'CASH',
      status: TaskStatus.COMPLETED,
      completedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      id: true,
      taskNumber: true,
      totalAmount: true,
    },
  });

  // Get cash collections in period
  const collections = await db.cashCollection.findMany({
    where: {
      riderId,
      collectionType: 'COD_PAYMENT',
      collectedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  const expectedCash = cashTasks.reduce((sum, t) => sum + t.totalAmount, 0);
  const reportedCash = collections.reduce((sum, c) => sum + c.amount, 0);
  const discrepancy = expectedCash - reportedCash;

  // Count reconciled tasks
  const reconciledTaskIds = new Set(collections.map((c) => c.taskId).filter(Boolean));
  const reconciledTasks = cashTasks.filter((t) => reconciledTaskIds.has(t.id)).length;

  return {
    riderId,
    periodStart,
    periodEnd,
    expectedCash,
    reportedCash,
    discrepancy,
    taskCount: cashTasks.length,
    reconciledTasks,
    unreconciledTasks: cashTasks.length - reconciledTasks,
    status: discrepancy === 0 ? 'BALANCED' : discrepancy > 0 ? 'DISCREPANCY' : 'PENDING',
  };
}

/**
 * Get riders with high cash holdings
 */
export async function getHighCashRiders(): Promise<CashAlert[]> {
  const riders = await db.rider.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, fullName: true },
  });

  const alerts: CashAlert[] = [];

  for (const rider of riders) {
    const summary = await getRiderCashSummary(rider.id);

    if (summary.pendingCash >= DEPOSIT_REMINDER_THRESHOLD) {
      alerts.push({
        riderId: rider.id,
        riderName: rider.fullName,
        alertType: summary.pendingCash >= MAX_CASH_HOLDING ? 'HIGH_CASH' : 'OVERDUE_DEPOSIT',
        amount: summary.pendingCash,
        threshold: summary.pendingCash >= MAX_CASH_HOLDING ? MAX_CASH_HOLDING : DEPOSIT_REMINDER_THRESHOLD,
        message: `Rider has UGX ${summary.pendingCash.toLocaleString()} pending cash. Deposit required.`,
        createdAt: new Date(),
      });
    }

    if (summary.overdueAmount > 0) {
      alerts.push({
        riderId: rider.id,
        riderName: rider.fullName,
        alertType: 'OVERDUE_DEPOSIT',
        amount: summary.overdueAmount,
        threshold: 0,
        message: `Rider has UGX ${summary.overdueAmount.toLocaleString()} overdue cash (collected >${OVERDUE_HOURS}h ago).`,
        createdAt: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Get all pending cash collections
 */
export async function getPendingCashCollections(options?: {
  riderId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ collections: CashCollectionRecord[]; total: number }> {
  const where: Record<string, unknown> = {
    status: 'COLLECTED',
    collectionType: 'COD_PAYMENT',
  };

  if (options?.riderId) {
    where.riderId = options.riderId;
  }

  const [collections, total] = await Promise.all([
    db.cashCollection.findMany({
      where,
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { collectedAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.cashCollection.count({ where }),
  ]);

  return {
    collections: collections.map((c) => ({
      id: c.id,
      riderId: c.riderId,
      taskId: c.taskId || undefined,
      userId: c.userId || undefined,
      userName: c.user?.name || undefined,
      amount: c.amount,
      currency: c.currency,
      collectionType: c.collectionType,
      status: c.status,
      collectedAt: c.collectedAt || undefined,
      depositedAt: c.depositedAt || undefined,
      notes: c.notes || undefined,
      createdAt: c.createdAt,
    })),
    total,
  };
}

/**
 * Record an adjustment (for corrections)
 */
export async function recordCashAdjustment(
  riderId: string,
  amount: number,
  reason: string
): Promise<CashCollectionRecord> {
  const adjustment = await db.cashCollection.create({
    data: {
      riderId,
      amount,
      currency: 'UGX',
      collectionType: 'ADJUSTMENT',
      status: 'VERIFIED',
      notes: reason,
    },
  });

  return {
    id: adjustment.id,
    riderId: adjustment.riderId,
    amount: adjustment.amount,
    currency: adjustment.currency,
    collectionType: adjustment.collectionType,
    status: adjustment.status,
    notes: adjustment.notes || undefined,
    createdAt: adjustment.createdAt,
  };
}

/**
 * Get cash collection summary for admin dashboard
 */
export async function getCashCollectionSummary(): Promise<{
  totalPendingCash: number;
  totalRidersWithCash: number;
  totalOverdueCash: number;
  recentDeposits: number;
  alertCount: number;
}> {
  const riders = await db.rider.findMany({
    where: { status: 'APPROVED' },
    select: { id: true },
  });

  let totalPendingCash = 0;
  let totalOverdueCash = 0;
  let ridersWithCash = 0;
  let alertCount = 0;

  for (const rider of riders) {
    const summary = await getRiderCashSummary(rider.id);

    if (summary.pendingCash > 0) {
      totalPendingCash += summary.pendingCash;
      ridersWithCash++;

      if (summary.pendingCash >= DEPOSIT_REMINDER_THRESHOLD) {
        alertCount++;
      }
    }

    totalOverdueCash += summary.overdueAmount;
  }

  // Get recent deposits (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentDeposits = await db.cashCollection.aggregate({
    where: {
      collectionType: 'DEPOSIT',
      depositedAt: { gte: yesterday },
    },
    _sum: { amount: true },
  });

  return {
    totalPendingCash,
    totalRidersWithCash: ridersWithCash,
    totalOverdueCash,
    recentDeposits: Math.abs(recentDeposits._sum.amount || 0),
    alertCount,
  };
}

// ============================================
// FLOAT MANAGEMENT (SafeBoda-style)
// ============================================

/**
 * Float balance represents the "working capital" a rider has
 * to provide change to customers paying with large bills.
 * 
 * This is tracked separately from earnings.
 */

export interface FloatBalance {
  riderId: string;
  currentFloat: number;
  maxFloat: number;
  lastReplenished: Date | null;
  transactions: FloatTransaction[];
}

export interface FloatTransaction {
  id: string;
  riderId: string;
  amount: number;
  type: 'INITIAL' | 'REPLENISH' | 'ADJUSTMENT' | 'RESET';
  balanceBefore: number;
  balanceAfter: number;
  notes?: string;
  createdAt: Date;
}

/**
 * Initialize float for a new rider
 */
export async function initializeRiderFloat(riderId: string): Promise<FloatBalance> {
  // Create a transaction record for initial float
  await db.transaction.create({
    data: {
      transactionRef: `FLT${Date.now().toString(36).toUpperCase()}`,
      riderId,
      type: 'CREDIT',
      amount: INITIAL_FLOAT_AMOUNT,
      balanceBefore: 0,
      balanceAfter: INITIAL_FLOAT_AMOUNT,
      status: 'COMPLETED',
      description: 'Initial float allocation',
      metadata: JSON.stringify({ type: 'FLOAT_INIT' }),
    },
  });

  return {
    riderId,
    currentFloat: INITIAL_FLOAT_AMOUNT,
    maxFloat: MAX_FLOAT_AMOUNT,
    lastReplenished: new Date(),
    transactions: [],
  };
}

/**
 * Get rider's current float balance
 */
export async function getRiderFloat(riderId: string): Promise<FloatBalance> {
  const transactions = await db.transaction.findMany({
    where: {
      riderId,
      metadata: { contains: 'FLOAT' },
    },
    orderBy: { createdAt: 'desc' },
  });

  let currentFloat = 0;
  const floatTransactions: FloatTransaction[] = [];

  for (const tx of transactions) {
    if (tx.metadata?.includes('FLOAT')) {
      currentFloat = tx.balanceAfter;

      floatTransactions.push({
        id: tx.id,
        riderId: tx.riderId || '',
        amount: tx.amount,
        type: tx.metadata?.includes('INIT') ? 'INITIAL' :
              tx.metadata?.includes('REPLENISH') ? 'REPLENISH' :
              tx.metadata?.includes('RESET') ? 'RESET' : 'ADJUSTMENT',
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        notes: tx.description || undefined,
        createdAt: tx.createdAt,
      });
    }
  }

  // If no float transactions, initialize
  if (transactions.length === 0) {
    return initializeRiderFloat(riderId);
  }

  return {
    riderId,
    currentFloat,
    maxFloat: MAX_FLOAT_AMOUNT,
    lastReplenished: transactions[0]?.createdAt || null,
    transactions: floatTransactions.slice(0, 10),
  };
}

/**
 * Replenish rider's float
 */
export async function replenishRiderFloat(
  riderId: string,
  amount: number
): Promise<FloatBalance> {
  const currentFloat = await getRiderFloat(riderId);
  const newFloat = Math.min(currentFloat.currentFloat + amount, MAX_FLOAT_AMOUNT);

  await db.transaction.create({
    data: {
      transactionRef: `FLT${Date.now().toString(36).toUpperCase()}`,
      riderId,
      type: 'CREDIT',
      amount,
      balanceBefore: currentFloat.currentFloat,
      balanceAfter: newFloat,
      status: 'COMPLETED',
      description: 'Float replenishment',
      metadata: JSON.stringify({ type: 'FLOAT_REPLENISH' }),
    },
  });

  return getRiderFloat(riderId);
}

// ============================================
// EXPORTS
// ============================================

export {
  MAX_CASH_HOLDING,
  LARGE_COLLECTION_THRESHOLD,
  DEPOSIT_REMINDER_THRESHOLD,
  OVERDUE_HOURS,
  INITIAL_FLOAT_AMOUNT,
  MAX_FLOAT_AMOUNT,
  FLOAT_REPLENISH_THRESHOLD,
};

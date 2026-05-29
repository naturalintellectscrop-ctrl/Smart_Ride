/**
 * Transaction Ledger Service for Smart Ride
 * Complete financial transaction ledger with double-entry bookkeeping
 * 
 * Provides audit trail for all financial movements, reconciliation reports,
 * and financial statement generation.
 */

import { db } from '@/lib/db';
import { TransactionType, TransactionStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface LedgerEntry {
  id: string;
  transactionRef: string;
  type: TransactionType;
  amount: number;
  currency: string;
  clientId?: string;
  riderId?: string;
  merchantId?: string;
  taskId?: string;
  orderId?: string;
  platformCommission?: number;
  riderEarnings?: number;
  merchantEarnings?: number;
  status: TransactionStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  processedAt: Date;
  reversedAt?: Date;
  reversalReason?: string;
  createdAt: Date;
}

export interface DoubleEntry {
  debit: LedgerEntry;
  credit: LedgerEntry;
  transactionRef: string;
  description: string;
  createdAt: Date;
}

export interface LedgerBalance {
  clientId?: string;
  riderId?: string;
  merchantId?: string;
  totalCredits: number;
  totalDebits: number;
  balance: number;
  currency: string;
  lastUpdated: Date;
}

export interface ReconciliationReport {
  periodStart: Date;
  periodEnd: Date;
  totalTransactions: number;
  totalAmount: number;
  totalPlatformCommission: number;
  totalRiderEarnings: number;
  totalMerchantEarnings: number;
  byType: Record<TransactionType, { count: number; amount: number }>;
  byStatus: Record<TransactionStatus, { count: number; amount: number }>;
  discrepancies: DiscrepancyRecord[];
  generatedAt: Date;
}

export interface DiscrepancyRecord {
  type: 'MISSING_TRANSACTION' | 'AMOUNT_MISMATCH' | 'STATUS_INCONSISTENCY' | 'ORPHAN_RECORD';
  referenceId: string;
  expectedAmount?: number;
  actualAmount?: number;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detectedAt: Date;
}

export interface FinancialStatement {
  periodStart: Date;
  periodEnd: Date;
  revenue: {
    ridePayments: number;
    foodOrders: number;
    shoppingOrders: number;
    itemDelivery: number;
    healthOrders: number;
    totalRevenue: number;
  };
  costs: {
    riderPayouts: number;
    merchantPayouts: number;
    totalPayouts: number;
  };
  platform: {
    grossCommission: number;
    serviceFees: number;
    surcharges: number;
    netCommission: number;
  };
  netIncome: number;
  currency: string;
  generatedAt: Date;
}

export interface LedgerFilter {
  type?: TransactionType | TransactionType[];
  status?: TransactionStatus | TransactionStatus[];
  clientId?: string;
  riderId?: string;
  merchantId?: string;
  taskId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

// ============================================
// ACCOUNTS (Double-Entry Bookkeeping)
// ============================================

const ACCOUNTS = {
  // Assets
  CASH_ON_HAND: 'CASH_ON_HAND',
  MTN_MOMO_RECEIVABLE: 'MTN_MOMO_RECEIVABLE',
  AIRTEL_RECEIVABLE: 'AIRTEL_RECEIVABLE',
  RIDER_RECEIVABLE: 'RIDER_RECEIVABLE',
  
  // Liabilities
  RIDER_PAYABLE: 'RIDER_PAYABLE',
  MERCHANT_PAYABLE: 'MERCHANT_PAYABLE',
  CLIENT_DEPOSITS: 'CLIENT_DEPOSITS',
  
  // Revenue
  RIDE_REVENUE: 'RIDE_REVENUE',
  DELIVERY_REVENUE: 'DELIVERY_REVENUE',
  COMMISSION_REVENUE: 'COMMISSION_REVENUE',
  SERVICE_FEE_REVENUE: 'SERVICE_FEE_REVENUE',
  
  // Expenses
  RIDER_PAYOUT_EXPENSE: 'RIDER_PAYOUT_EXPENSE',
  MERCHANT_PAYOUT_EXPENSE: 'MERCHANT_PAYOUT_EXPENSE',
  PROCESSING_FEE_EXPENSE: 'PROCESSING_FEE_EXPENSE',
  
  // Equity
  RETAINED_EARNINGS: 'RETAINED_EARNINGS',
} as const;

// ============================================
// TRANSACTION LEDGER SERVICE
// ============================================

/**
 * Create a ledger entry (single entry)
 */
export async function createLedgerEntry(input: {
  type: TransactionType;
  amount: number;
  currency?: string;
  clientId?: string;
  riderId?: string;
  merchantId?: string;
  taskId?: string;
  orderId?: string;
  platformCommission?: number;
  riderEarnings?: number;
  merchantEarnings?: number;
  status?: TransactionStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  paymentMethod?: string;
  paymentReference?: string;
}): Promise<LedgerEntry> {
  const transactionRef = input.paymentReference || 
    `TXN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const transaction = await db.transaction.create({
    data: {
      transactionRef,
      type: input.type,
      amount: input.amount,
      currency: input.currency || 'UGX',
      userId: input.clientId,
      riderId: input.riderId,
      merchantId: input.merchantId,
      taskId: input.taskId,
      orderId: input.orderId,
      balanceBefore: 0, // Will be updated if needed
      balanceAfter: input.amount,
      status: input.status || 'COMPLETED',
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      description: input.description,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      processedAt: new Date(),
    },
  });

  return {
    id: transaction.id,
    transactionRef: transaction.transactionRef,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    clientId: transaction.userId || undefined,
    riderId: transaction.riderId || undefined,
    merchantId: transaction.merchantId || undefined,
    taskId: transaction.taskId || undefined,
    orderId: transaction.orderId || undefined,
    platformCommission: transaction.platformCommission || undefined,
    riderEarnings: transaction.riderEarnings || undefined,
    merchantEarnings: transaction.merchantEarnings || undefined,
    status: transaction.status,
    description: transaction.description || undefined,
    metadata: transaction.metadata ? JSON.parse(transaction.metadata) : undefined,
    processedAt: transaction.processedAt,
    reversedAt: transaction.reversedAt || undefined,
    reversalReason: transaction.reversalReason || undefined,
    createdAt: transaction.createdAt,
  };
}

/**
 * Create a double-entry transaction
 */
export async function createDoubleEntryTransaction(input: {
  type: TransactionType;
  amount: number;
  description: string;
  debitAccount: string;
  creditAccount: string;
  clientId?: string;
  riderId?: string;
  merchantId?: string;
  taskId?: string;
  platformCommission?: number;
  riderEarnings?: number;
  merchantEarnings?: number;
  metadata?: Record<string, unknown>;
}): Promise<DoubleEntry> {
  const transactionRef = `DBL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Create debit entry
  const debitTransaction = await db.transaction.create({
    data: {
      transactionRef: `${transactionRef}-DR`,
      type: input.type,
      amount: input.amount,
      currency: 'UGX',
      userId: input.clientId,
      riderId: input.riderId,
      merchantId: input.merchantId,
      taskId: input.taskId,
      balanceBefore: 0,
      balanceAfter: -input.amount, // Debit reduces balance
      status: 'COMPLETED',
      description: `${input.description} (Debit: ${input.debitAccount})`,
      metadata: JSON.stringify({
        ...input.metadata,
        entryType: 'DEBIT',
        account: input.debitAccount,
        pairedRef: `${transactionRef}-CR`,
      }),
    },
  });

  // Create credit entry
  const creditTransaction = await db.transaction.create({
    data: {
      transactionRef: `${transactionRef}-CR`,
      type: input.type,
      amount: input.amount,
      currency: 'UGX',
      userId: input.clientId,
      riderId: input.riderId,
      merchantId: input.merchantId,
      taskId: input.taskId,
      balanceBefore: 0,
      balanceAfter: input.amount, // Credit increases balance
      status: 'COMPLETED',
      description: `${input.description} (Credit: ${input.creditAccount})`,
      metadata: JSON.stringify({
        ...input.metadata,
        entryType: 'CREDIT',
        account: input.creditAccount,
        pairedRef: `${transactionRef}-DR`,
      }),
    },
  });

  // Create finance log
  await db.financeLog.create({
    data: {
      transactionType: input.type,
      referenceId: transactionRef,
      amount: input.amount,
      currency: 'UGX',
      clientId: input.clientId,
      riderId: input.riderId,
      merchantId: input.merchantId,
      platformCommission: input.platformCommission,
      riderEarnings: input.riderEarnings,
      merchantEarnings: input.merchantEarnings,
      status: 'COMPLETED',
      description: input.description,
      metadata: JSON.stringify({
        debitAccount: input.debitAccount,
        creditAccount: input.creditAccount,
      }),
    },
  });

  const toLedgerEntry = (tx: typeof debitTransaction): LedgerEntry => ({
    id: tx.id,
    transactionRef: tx.transactionRef,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    clientId: tx.userId || undefined,
    riderId: tx.riderId || undefined,
    merchantId: tx.merchantId || undefined,
    taskId: tx.taskId || undefined,
    status: tx.status,
    description: tx.description || undefined,
    metadata: tx.metadata ? JSON.parse(tx.metadata) : undefined,
    processedAt: tx.processedAt,
    createdAt: tx.createdAt,
  });

  return {
    debit: toLedgerEntry(debitTransaction),
    credit: toLedgerEntry(creditTransaction),
    transactionRef,
    description: input.description,
    createdAt: new Date(),
  };
}

/**
 * Record a payment transaction
 */
export async function recordPaymentTransaction(input: {
  taskId: string;
  clientId: string;
  riderId?: string;
  merchantId?: string;
  amount: number;
  platformCommission: number;
  riderEarnings: number;
  merchantEarnings?: number;
  paymentMethod: string;
  paymentReference?: string;
}): Promise<DoubleEntry> {
  // Determine transaction type based on task
  const task = await db.task.findUnique({
    where: { id: input.taskId },
    select: { taskType: true },
  });

  const typeMap: Record<string, TransactionType> = {
    SMART_BODA_RIDE: 'RIDE_PAYMENT',
    SMART_CAR_RIDE: 'RIDE_PAYMENT',
    FOOD_DELIVERY: 'FOOD_ORDER_PAYMENT',
    SHOPPING: 'SHOPPING_ORDER_PAYMENT',
    ITEM_DELIVERY: 'ITEM_DELIVERY_PAYMENT',
    SMART_HEALTH_DELIVERY: 'HEALTH_ORDER_PAYMENT',
  };

  const transactionType = task ? typeMap[task.taskType] || 'RIDE_PAYMENT' : 'RIDE_PAYMENT';

  return createDoubleEntryTransaction({
    type: transactionType,
    amount: input.amount,
    description: `Payment for task ${input.taskId}`,
    debitAccount: ACCOUNTS.CASH_ON_HAND,
    creditAccount: ACCOUNTS.RIDE_REVENUE,
    clientId: input.clientId,
    riderId: input.riderId,
    merchantId: input.merchantId,
    taskId: input.taskId,
    platformCommission: input.platformCommission,
    riderEarnings: input.riderEarnings,
    merchantEarnings: input.merchantEarnings,
    metadata: {
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
    },
  });
}

/**
 * Record a rider payout
 */
export async function recordRiderPayoutTransaction(input: {
  riderId: string;
  amount: number;
  settlementId: string;
  paymentMethod: string;
  transactionId?: string;
}): Promise<DoubleEntry> {
  return createDoubleEntryTransaction({
    type: 'RIDER_PAYOUT',
    amount: input.amount,
    description: `Rider payout - Settlement ${input.settlementId}`,
    debitAccount: ACCOUNTS.RIDER_PAYABLE,
    creditAccount: ACCOUNTS.CASH_ON_HAND,
    riderId: input.riderId,
    metadata: {
      settlementId: input.settlementId,
      paymentMethod: input.paymentMethod,
      transactionId: input.transactionId,
    },
  });
}

/**
 * Reverse a transaction
 */
export async function reverseTransaction(
  transactionRef: string,
  reason: string
): Promise<LedgerEntry> {
  const original = await db.transaction.findFirst({
    where: { transactionRef },
  });

  if (!original) {
    throw new Error(`Transaction not found: ${transactionRef}`);
  }

  if (original.status === 'REVERSED') {
    throw new Error('Transaction already reversed');
  }

  // Mark original as reversed
  await db.transaction.update({
    where: { id: original.id },
    data: {
      status: 'REVERSED',
      reversedAt: new Date(),
      reversalReason: reason,
    },
  });

  // Create reversal entry
  const reversalRef = `REV${Date.now().toString(36).toUpperCase()}`;
  const reversal = await db.transaction.create({
    data: {
      transactionRef: reversalRef,
      type: original.type,
      amount: -original.amount,
      currency: original.currency,
      userId: original.userId,
      riderId: original.riderId,
      merchantId: original.merchantId,
      taskId: original.taskId,
      balanceBefore: original.balanceAfter,
      balanceAfter: original.balanceBefore,
      status: 'COMPLETED',
      description: `Reversal of ${transactionRef}: ${reason}`,
      metadata: JSON.stringify({
        originalRef: transactionRef,
        reversalReason: reason,
      }),
    },
  });

  return {
    id: reversal.id,
    transactionRef: reversal.transactionRef,
    type: reversal.type,
    amount: reversal.amount,
    currency: reversal.currency,
    clientId: reversal.userId || undefined,
    riderId: reversal.riderId || undefined,
    merchantId: reversal.merchantId || undefined,
    taskId: reversal.taskId || undefined,
    status: reversal.status,
    description: reversal.description || undefined,
    metadata: reversal.metadata ? JSON.parse(reversal.metadata) : undefined,
    processedAt: reversal.processedAt,
    createdAt: reversal.createdAt,
  };
}

/**
 * Get ledger entries with filtering
 */
export async function getLedgerEntries(filter: LedgerFilter = {}): Promise<{
  entries: LedgerEntry[];
  total: number;
}> {
  const where: Record<string, unknown> = {};

  if (filter.type) {
    if (Array.isArray(filter.type)) {
      where.type = { in: filter.type };
    } else {
      where.type = filter.type;
    }
  }

  if (filter.status) {
    if (Array.isArray(filter.status)) {
      where.status = { in: filter.status };
    } else {
      where.status = filter.status;
    }
  }

  if (filter.clientId) where.userId = filter.clientId;
  if (filter.riderId) where.riderId = filter.riderId;
  if (filter.merchantId) where.merchantId = filter.merchantId;
  if (filter.taskId) where.taskId = filter.taskId;

  if (filter.startDate || filter.endDate) {
    where.processedAt = {};
    if (filter.startDate) {
      (where.processedAt as Record<string, Date>).gte = filter.startDate;
    }
    if (filter.endDate) {
      (where.processedAt as Record<string, Date>).lte = filter.endDate;
    }
  }

  if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
    where.amount = {};
    if (filter.minAmount !== undefined) {
      (where.amount as Record<string, number>).gte = filter.minAmount;
    }
    if (filter.maxAmount !== undefined) {
      (where.amount as Record<string, number>).lte = filter.maxAmount;
    }
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 50,
      skip: filter.offset || 0,
    }),
    db.transaction.count({ where }),
  ]);

  return {
    entries: transactions.map((t) => ({
      id: t.id,
      transactionRef: t.transactionRef,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      clientId: t.userId || undefined,
      riderId: t.riderId || undefined,
      merchantId: t.merchantId || undefined,
      taskId: t.taskId || undefined,
      orderId: t.orderId || undefined,
      status: t.status,
      description: t.description || undefined,
      metadata: t.metadata ? JSON.parse(t.metadata) : undefined,
      processedAt: t.processedAt,
      reversedAt: t.reversedAt || undefined,
      reversalReason: t.reversalReason || undefined,
      createdAt: t.createdAt,
    })),
    total,
  };
}

/**
 * Get ledger balance for an entity
 */
export async function getLedgerBalance(options: {
  clientId?: string;
  riderId?: string;
  merchantId?: string;
}): Promise<LedgerBalance> {
  const where: Record<string, unknown> = { status: 'COMPLETED' };

  if (options.clientId) where.userId = options.clientId;
  if (options.riderId) where.riderId = options.riderId;
  if (options.merchantId) where.merchantId = options.merchantId;

  const transactions = await db.transaction.findMany({
    where,
    select: {
      amount: true,
      balanceAfter: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalCredits = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    clientId: options.clientId,
    riderId: options.riderId,
    merchantId: options.merchantId,
    totalCredits,
    totalDebits,
    balance: totalCredits - totalDebits,
    currency: 'UGX',
    lastUpdated: transactions[0]?.createdAt || new Date(),
  };
}

/**
 * Generate reconciliation report
 */
export async function generateReconciliationReport(
  startDate: Date,
  endDate: Date
): Promise<ReconciliationReport> {
  // Get all transactions in period
  const transactions = await db.transaction.findMany({
    where: {
      processedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Get finance logs for same period
  const financeLogs = await db.financeLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Calculate totals
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalPlatformCommission = financeLogs.reduce((sum, l) => sum + (l.platformCommission || 0), 0);
  const totalRiderEarnings = financeLogs.reduce((sum, l) => sum + (l.riderEarnings || 0), 0);
  const totalMerchantEarnings = financeLogs.reduce((sum, l) => sum + (l.merchantEarnings || 0), 0);

  // Group by type
  const byType: Record<string, { count: number; amount: number }> = {};
  for (const t of transactions) {
    if (!byType[t.type]) {
      byType[t.type] = { count: 0, amount: 0 };
    }
    byType[t.type].count++;
    byType[t.type].amount += t.amount;
  }

  // Group by status
  const byStatus: Record<string, { count: number; amount: number }> = {};
  for (const t of transactions) {
    if (!byStatus[t.status]) {
      byStatus[t.status] = { count: 0, amount: 0 };
    }
    byStatus[t.status].count++;
    byStatus[t.status].amount += t.amount;
  }

  // Check for discrepancies
  const discrepancies: DiscrepancyRecord[] = [];

  // Check for orphan transactions (no corresponding finance log)
  const transactionTaskIds = new Set(
    transactions
      .filter((t) => t.taskId)
      .map((t) => t.taskId)
  );

  const financeLogTaskIds = new Set(
    financeLogs
      .filter((l) => l.referenceId)
      .map((l) => l.referenceId)
  );

  for (const taskId of transactionTaskIds) {
    if (!financeLogTaskIds.has(taskId)) {
      discrepancies.push({
        type: 'ORPHAN_RECORD',
        referenceId: taskId || '',
        description: `Transaction exists but no finance log found for task ${taskId}`,
        severity: 'MEDIUM',
        detectedAt: new Date(),
      });
    }
  }

  return {
    periodStart: startDate,
    periodEnd: endDate,
    totalTransactions: transactions.length,
    totalAmount,
    totalPlatformCommission,
    totalRiderEarnings,
    totalMerchantEarnings,
    byType: byType as Record<TransactionType, { count: number; amount: number }>,
    byStatus: byStatus as Record<TransactionStatus, { count: number; amount: number }>,
    discrepancies,
    generatedAt: new Date(),
  };
}

/**
 * Generate financial statement
 */
export async function generateFinancialStatement(
  startDate: Date,
  endDate: Date
): Promise<FinancialStatement> {
  const financeLogs = await db.financeLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    },
  });

  // Revenue by type
  const revenue = {
    ridePayments: 0,
    foodOrders: 0,
    shoppingOrders: 0,
    itemDelivery: 0,
    healthOrders: 0,
    totalRevenue: 0,
  };

  // Payouts
  const costs = {
    riderPayouts: 0,
    merchantPayouts: 0,
    totalPayouts: 0,
  };

  // Platform earnings
  const platform = {
    grossCommission: 0,
    serviceFees: 0,
    surcharges: 0,
    netCommission: 0,
  };

  for (const log of financeLogs) {
    switch (log.transactionType) {
      case 'RIDE_PAYMENT':
        revenue.ridePayments += log.amount;
        break;
      case 'FOOD_ORDER_PAYMENT':
        revenue.foodOrders += log.amount;
        break;
      case 'SHOPPING_ORDER_PAYMENT':
        revenue.shoppingOrders += log.amount;
        break;
      case 'ITEM_DELIVERY_PAYMENT':
        revenue.itemDelivery += log.amount;
        break;
      case 'HEALTH_ORDER_PAYMENT':
        revenue.healthOrders += log.amount;
        break;
      case 'RIDER_PAYOUT':
        costs.riderPayouts += log.amount;
        break;
      case 'MERCHANT_PAYOUT':
        costs.merchantPayouts += log.amount;
        break;
      case 'PLATFORM_COMMISSION':
        platform.grossCommission += log.platformCommission || 0;
        break;
    }

    // Note: platformCommission is only counted in the PLATFORM_COMMISSION case above,
    // not unconditionally, to avoid double-counting.
    costs.riderPayouts += log.riderEarnings || 0;
    costs.merchantPayouts += log.merchantEarnings || 0;
  }

  revenue.totalRevenue = 
    revenue.ridePayments + 
    revenue.foodOrders + 
    revenue.shoppingOrders + 
    revenue.itemDelivery + 
    revenue.healthOrders;

  costs.totalPayouts = costs.riderPayouts + costs.merchantPayouts;

  // Estimate service fees (typically 5-8% of revenue)
  platform.serviceFees = Math.round(revenue.totalRevenue * 0.06);
  
  // Estimate surcharges (typically 1-3% of revenue)
  platform.surcharges = Math.round(revenue.totalRevenue * 0.02);

  platform.netCommission = platform.grossCommission + platform.serviceFees + platform.surcharges;

  const netIncome = revenue.totalRevenue - costs.totalPayouts;

  return {
    periodStart: startDate,
    periodEnd: endDate,
    revenue,
    costs,
    platform,
    netIncome,
    currency: 'UGX',
    generatedAt: new Date(),
  };
}

/**
 * Export ledger entries to CSV format
 */
export function exportLedgerToCSV(entries: LedgerEntry[]): string {
  const headers = [
    'Transaction Ref',
    'Type',
    'Amount',
    'Currency',
    'Client ID',
    'Rider ID',
    'Merchant ID',
    'Task ID',
    'Status',
    'Description',
    'Processed At',
    'Created At',
  ];

  const rows = entries.map((e) => [
    e.transactionRef,
    e.type,
    e.amount.toString(),
    e.currency,
    e.clientId || '',
    e.riderId || '',
    e.merchantId || '',
    e.taskId || '',
    e.status,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    e.processedAt.toISOString(),
    e.createdAt.toISOString(),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ============================================
// EXPORTS
// ============================================

export {
  ACCOUNTS,
};

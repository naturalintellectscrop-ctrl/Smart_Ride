/**
 * Commission Engine Service for Smart Ride
 * Calculates and persists commission splits for all service types.
 *
 * Commission model:
 * - Rides (BODA, CAR): Platform commission + rider earnings
 * - Food/shopping orders: Platform commission + rider earnings + merchant earnings
 * - Item delivery: Platform commission + rider earnings
 * - Health orders: Platform commission + rider earnings + provider earnings
 *
 * Uses PricingConfig from the database for commission rates.
 * Supports custom commission rates from Merchant/Provider records.
 * Persists all calculations to FinanceLog and updates task fields.
 */

import { db } from '@/lib/db';
import { TaskType, TransactionType } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CommissionCalculation {
  totalAmount: number;
  platformCommission: number;
  riderEarnings: number;
  merchantEarnings: number;
  commissionRate: number;
  serviceType: TaskType;
}

export interface CommissionInput {
  taskId: string;
  taskType: TaskType;
  totalAmount: number;
  distanceKm?: number;
  durationMinutes?: number;
  merchantId?: string;
  riderId?: string;
  clientId: string;
  paymentMethod?: string;
  isNightRide?: boolean;
  isPeakHours?: boolean;
  customCommissionRate?: number;
}

export interface CommissionBreakdown {
  taskId: string;
  taskType: TaskType;
  totalAmount: number;
  baseCommission: number;
  serviceFee: number;
  nightSurcharge: number;
  peakSurcharge: number;
  totalPlatformCommission: number;
  riderEarnings: number;
  merchantEarnings: number;
  commissionPercent: number;
  currency: string;
  calculatedAt: Date;
}

export interface CommissionConfig {
  serviceType: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate?: number;
  minimumFare: number;
  maximumFare?: number;
  platformCommissionPercent: number;
  serviceFeePercent: number;
  nightSurchargePercent: number;
  peakSurchargePercent: number;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_COMMISSION_RATES: Record<TaskType, CommissionConfig> = {
  SMART_BODA_RIDE: {
    serviceType: 'SMART_BODA_RIDE',
    baseFare: 2000,
    perKmRate: 800,
    perMinuteRate: 50,
    minimumFare: 3000,
    platformCommissionPercent: 15,
    serviceFeePercent: 5,
    nightSurchargePercent: 20,
    peakSurchargePercent: 25,
  },
  SMART_CAR_RIDE: {
    serviceType: 'SMART_CAR_RIDE',
    baseFare: 5000,
    perKmRate: 1200,
    perMinuteRate: 100,
    minimumFare: 8000,
    platformCommissionPercent: 18,
    serviceFeePercent: 5,
    nightSurchargePercent: 20,
    peakSurchargePercent: 25,
  },
  FOOD_DELIVERY: {
    serviceType: 'FOOD_DELIVERY',
    baseFare: 3000,
    perKmRate: 500,
    perMinuteRate: 30,
    minimumFare: 4000,
    platformCommissionPercent: 20,
    serviceFeePercent: 8,
    nightSurchargePercent: 15,
    peakSurchargePercent: 20,
  },
  SHOPPING: {
    serviceType: 'SHOPPING',
    baseFare: 3000,
    perKmRate: 500,
    perMinuteRate: 30,
    minimumFare: 4000,
    platformCommissionPercent: 18,
    serviceFeePercent: 8,
    nightSurchargePercent: 15,
    peakSurchargePercent: 20,
  },
  ITEM_DELIVERY: {
    serviceType: 'ITEM_DELIVERY',
    baseFare: 2500,
    perKmRate: 400,
    perMinuteRate: 25,
    minimumFare: 3500,
    platformCommissionPercent: 12,
    serviceFeePercent: 5,
    nightSurchargePercent: 15,
    peakSurchargePercent: 20,
  },
  SMART_HEALTH_DELIVERY: {
    serviceType: 'SMART_HEALTH_DELIVERY',
    baseFare: 3500,
    perKmRate: 500,
    perMinuteRate: 35,
    minimumFare: 4500,
    platformCommissionPercent: 15,
    serviceFeePercent: 5,
    nightSurchargePercent: 15,
    peakSurchargePercent: 20,
  },
};

// Night hours: 22:00 - 05:00 (Uganda timezone)
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 5;

// Peak hours: 07:00 - 09:00 and 17:00 - 20:00
const PEAK_MORNING_START = 7;
const PEAK_MORNING_END = 9;
const PEAK_EVENING_START = 17;
const PEAK_EVENING_END = 20;

// Map TaskType to TransactionType for finance logs
const TRANSACTION_TYPE_MAP: Record<TaskType, TransactionType> = {
  SMART_BODA_RIDE: 'RIDE_PAYMENT',
  SMART_CAR_RIDE: 'RIDE_PAYMENT',
  FOOD_DELIVERY: 'FOOD_ORDER_PAYMENT',
  SHOPPING: 'SHOPPING_ORDER_PAYMENT',
  ITEM_DELIVERY: 'ITEM_DELIVERY_PAYMENT',
  SMART_HEALTH_DELIVERY: 'HEALTH_ORDER_PAYMENT',
};

// ============================================
// COMMISSION CONFIG LOOKUP
// ============================================

/**
 * Get commission configuration for a task type.
 * Tries the database PricingConfig first, falls back to defaults.
 */
export async function getCommissionConfig(taskType: TaskType): Promise<CommissionConfig> {
  const dbConfig = await db.pricingConfig.findUnique({
    where: { serviceType: taskType },
  });

  if (dbConfig) {
    return {
      serviceType: dbConfig.serviceType,
      baseFare: dbConfig.baseFare,
      perKmRate: dbConfig.perKmRate,
      perMinuteRate: dbConfig.perMinuteRate || 0,
      minimumFare: dbConfig.minimumFare,
      maximumFare: dbConfig.maximumFare || undefined,
      platformCommissionPercent:
        dbConfig.platformCommissionPercent ||
        DEFAULT_COMMISSION_RATES[taskType].platformCommissionPercent,
      serviceFeePercent:
        dbConfig.serviceFeePercent ||
        DEFAULT_COMMISSION_RATES[taskType].serviceFeePercent,
      nightSurchargePercent:
        dbConfig.nightSurchargePercent ||
        DEFAULT_COMMISSION_RATES[taskType].nightSurchargePercent,
      peakSurchargePercent:
        dbConfig.peakSurchargePercent ||
        DEFAULT_COMMISSION_RATES[taskType].peakSurchargePercent,
    };
  }

  return DEFAULT_COMMISSION_RATES[taskType];
}

// ============================================
// TIME-BASED SURCHARGE HELPERS
// ============================================

/**
 * Check if current time is night hours (22:00 - 05:00)
 */
export function isNightHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/**
 * Check if current time is peak hours
 */
export function isPeakHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return (
    (hour >= PEAK_MORNING_START && hour < PEAK_MORNING_END) ||
    (hour >= PEAK_EVENING_START && hour < PEAK_EVENING_END)
  );
}

// ============================================
// COMMISSION CALCULATION
// ============================================

/**
 * Calculate commission for a task given its input parameters.
 */
export async function calculateCommission(
  input: CommissionInput
): Promise<CommissionBreakdown> {
  const config = await getCommissionConfig(input.taskType);
  const now = new Date();

  const isNight =
    input.isNightRide !== undefined ? input.isNightRide : isNightHours(now);
  const isPeak =
    input.isPeakHours !== undefined ? input.isPeakHours : isPeakHours(now);

  // Use custom commission rate if provided
  const commissionPercent =
    input.customCommissionRate ?? config.platformCommissionPercent;

  const totalAmount = input.totalAmount;

  // Calculate service fee
  const serviceFee = Math.round(
    totalAmount * (config.serviceFeePercent / 100)
  );

  // Calculate surcharges
  let nightSurcharge = 0;
  let peakSurcharge = 0;

  if (isNight) {
    nightSurcharge = Math.round(
      totalAmount * (config.nightSurchargePercent / 100)
    );
  }

  if (isPeak) {
    peakSurcharge = Math.round(
      totalAmount * (config.peakSurchargePercent / 100)
    );
  }

  // Calculate platform commission
  const baseCommission = Math.round(
    totalAmount * (commissionPercent / 100)
  );
  const totalPlatformCommission =
    baseCommission + serviceFee + nightSurcharge + peakSurcharge;

  // Calculate rider earnings (total - platform commission - merchant share)
  let merchantEarnings = 0;
  let riderEarnings = totalAmount - totalPlatformCommission;

  // For delivery tasks with merchants, calculate merchant share
  if (
    input.merchantId &&
    ['FOOD_DELIVERY', 'SHOPPING', 'SMART_HEALTH_DELIVERY'].includes(
      input.taskType
    )
  ) {
    const merchant = await db.merchant.findUnique({
      where: { id: input.merchantId },
      select: { commissionRate: true },
    });

    if (merchant) {
      const merchantCommissionRate = merchant.commissionRate;
      // Merchant gets their share minus platform commission for goods
      // Rider only gets delivery fee portion
      merchantEarnings = Math.round(
        totalAmount * (1 - merchantCommissionRate)
      );
      riderEarnings = totalAmount - totalPlatformCommission - merchantEarnings;
    }
  }

  // For health orders with providers, calculate provider share
  if (input.taskType === 'SMART_HEALTH_DELIVERY') {
    // Check for health provider custom commission
    const task = await db.task.findUnique({
      where: { id: input.taskId },
      select: { healthOrderId: true },
    });

    if (task?.healthOrderId) {
      const healthOrder = await db.healthOrder.findUnique({
        where: { id: task.healthOrderId },
        select: { providerId: true },
      });

      if (healthOrder?.providerId) {
        const provider = await db.healthProvider.findUnique({
          where: { id: healthOrder.providerId },
          select: { commissionRate: true },
        });

        if (provider && merchantEarnings === 0) {
          // Provider earnings from their custom commission rate
          const providerCommissionRate = provider.commissionRate;
          merchantEarnings = Math.round(
            totalAmount * (1 - providerCommissionRate)
          );
          riderEarnings =
            totalAmount - totalPlatformCommission - merchantEarnings;
        }
      }
    }
  }

  // Ensure rider earnings is not negative
  riderEarnings = Math.max(0, riderEarnings);

  return {
    taskId: input.taskId,
    taskType: input.taskType,
    totalAmount,
    baseCommission,
    serviceFee,
    nightSurcharge,
    peakSurcharge,
    totalPlatformCommission,
    riderEarnings,
    merchantEarnings,
    commissionPercent,
    currency: 'UGX',
    calculatedAt: now,
  };
}

// ============================================
// PERSIST COMMISSION (NEW FUNCTION)
// ============================================

/**
 * Calculate and persist commission for a task.
 *
 * This function:
 * 1. Looks up the task and its related order (if any)
 * 2. Calculates the commission split based on task type
 * 3. Persists the calculation to FinanceLog
 * 4. Updates the task's platformCommission and riderEarnings fields
 * 5. Returns the calculation breakdown
 */
export async function calculateAndPersistCommission(
  taskId: string
): Promise<CommissionCalculation> {
  // 1. Look up the task with its related order and health order
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      order: {
        select: {
          id: true,
          merchantId: true,
          orderType: true,
        },
      },
      healthOrder: {
        select: {
          id: true,
          providerId: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // 2. Build commission input from task data
  const commissionInput: CommissionInput = {
    taskId: task.id,
    taskType: task.taskType,
    totalAmount: task.totalAmount,
    distanceKm: task.distanceKm ?? undefined,
    riderId: task.riderId ?? undefined,
    clientId: task.clientId,
    paymentMethod: task.paymentMethod,
  };

  // Attach merchant ID from the related order
  if (task.order?.merchantId) {
    commissionInput.merchantId = task.order.merchantId;
  }

  // Check for custom commission rate from merchant
  if (task.order?.merchantId) {
    const merchant = await db.merchant.findUnique({
      where: { id: task.order.merchantId },
      select: { commissionRate: true },
    });
    if (merchant) {
      commissionInput.customCommissionRate = merchant.commissionRate * 100; // Convert from decimal to percent
    }
  }

  // Check for custom commission rate from health provider
  if (task.healthOrder?.providerId) {
    const provider = await db.healthProvider.findUnique({
      where: { id: task.healthOrder.providerId },
      select: { commissionRate: true },
    });
    if (provider && !commissionInput.customCommissionRate) {
      commissionInput.customCommissionRate = provider.commissionRate * 100;
    }
  }

  // 3. Calculate the commission split
  const breakdown = await calculateCommission(commissionInput);

  // 4. Persist to FinanceLog
  const transactionType =
    TRANSACTION_TYPE_MAP[task.taskType] || 'RIDE_PAYMENT';

  // Create the main payment finance log with commission breakdown
  await db.financeLog.create({
    data: {
      transactionType,
      referenceId: taskId,
      amount: task.totalAmount,
      currency: 'UGX',
      clientId: task.clientId,
      riderId: task.riderId || undefined,
      merchantId: task.order?.merchantId || undefined,
      platformCommission: breakdown.totalPlatformCommission,
      riderEarnings: breakdown.riderEarnings,
      merchantEarnings: breakdown.merchantEarnings || 0,
      status: 'COMPLETED',
      description: `Commission calculated for task ${task.taskNumber} (${task.taskType})`,
      metadata: JSON.stringify({
        taskId: task.id,
        taskNumber: task.taskNumber,
        taskType: task.taskType,
        totalAmount: task.totalAmount,
        baseCommission: breakdown.baseCommission,
        serviceFee: breakdown.serviceFee,
        nightSurcharge: breakdown.nightSurcharge,
        peakSurcharge: breakdown.peakSurcharge,
        totalPlatformCommission: breakdown.totalPlatformCommission,
        riderEarnings: breakdown.riderEarnings,
        merchantEarnings: breakdown.merchantEarnings,
        commissionPercent: breakdown.commissionPercent,
        calculatedAt: breakdown.calculatedAt.toISOString(),
      }),
    },
  });

  // Create a separate PLATFORM_COMMISSION finance log entry
  await db.financeLog.create({
    data: {
      transactionType: 'PLATFORM_COMMISSION',
      referenceId: taskId,
      amount: breakdown.totalPlatformCommission,
      currency: 'UGX',
      clientId: task.clientId,
      platformCommission: breakdown.totalPlatformCommission,
      riderEarnings: 0,
      merchantEarnings: 0,
      status: 'COMPLETED',
      description: `Platform commission for task ${task.taskNumber} (${task.taskType}): ${breakdown.commissionPercent}%`,
      metadata: JSON.stringify({
        taskId: task.id,
        taskNumber: task.taskNumber,
        taskType: task.taskType,
        commissionPercent: breakdown.commissionPercent,
        baseCommission: breakdown.baseCommission,
        serviceFee: breakdown.serviceFee,
        nightSurcharge: breakdown.nightSurcharge,
        peakSurcharge: breakdown.peakSurcharge,
      }),
    },
  });

  // 5. Update the task's platformCommission and riderEarnings fields
  await db.task.update({
    where: { id: taskId },
    data: {
      platformCommission: breakdown.totalPlatformCommission,
      riderEarnings: breakdown.riderEarnings,
    },
  });

  // 6. Create audit log
  try {
    await db.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'COMMISSION_CALCULATED',
        entityType: 'Task',
        entityId: taskId,
        taskId,
        description: `Commission calculated for task ${task.taskNumber}: Platform=${breakdown.totalPlatformCommission}, Rider=${breakdown.riderEarnings}, Merchant=${breakdown.merchantEarnings}`,
        newValues: JSON.stringify({
          platformCommission: breakdown.totalPlatformCommission,
          riderEarnings: breakdown.riderEarnings,
          merchantEarnings: breakdown.merchantEarnings,
          commissionPercent: breakdown.commissionPercent,
        }),
        source: 'SYSTEM',
      },
    });
  } catch (auditError) {
    console.error(
      `Commission audit log creation failed for task ${taskId}:`,
      auditError
    );
    // Non-fatal
  }

  // 7. Return the calculation breakdown
  return {
    totalAmount: breakdown.totalAmount,
    platformCommission: breakdown.totalPlatformCommission,
    riderEarnings: breakdown.riderEarnings,
    merchantEarnings: breakdown.merchantEarnings,
    commissionRate: breakdown.commissionPercent,
    serviceType: task.taskType,
  };
}

// ============================================
// LEGACY: Calculate and record commission (preserved for backward compat)
// ============================================

/**
 * Calculate and record commission for a task.
 * @deprecated Use calculateAndPersistCommission(taskId) instead for automatic task lookup.
 */
export async function calculateAndRecordCommission(
  input: CommissionInput
): Promise<CommissionBreakdown> {
  const breakdown = await calculateCommission(input);

  // Update task with commission details
  await db.task.update({
    where: { id: input.taskId },
    data: {
      platformCommission: breakdown.totalPlatformCommission,
      riderEarnings: breakdown.riderEarnings,
    },
  });

  return breakdown;
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get commission breakdown for display
 */
export function formatCommissionBreakdown(breakdown: CommissionBreakdown): string {
  const lines = [
    `Commission Breakdown for Task ${breakdown.taskId}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Task Type: ${breakdown.taskType}`,
    `Total Amount: UGX ${breakdown.totalAmount.toLocaleString()}`,
    ``,
    `Commission Details:`,
    `  Base Commission (${breakdown.commissionPercent}%): UGX ${breakdown.baseCommission.toLocaleString()}`,
    `  Service Fee: UGX ${breakdown.serviceFee.toLocaleString()}`,
  ];

  if (breakdown.nightSurcharge > 0) {
    lines.push(
      `  Night Surcharge: UGX ${breakdown.nightSurcharge.toLocaleString()}`
    );
  }

  if (breakdown.peakSurcharge > 0) {
    lines.push(
      `  Peak Surcharge: UGX ${breakdown.peakSurcharge.toLocaleString()}`
    );
  }

  lines.push(``);
  lines.push(
    `Total Platform Commission: UGX ${breakdown.totalPlatformCommission.toLocaleString()}`
  );
  lines.push(
    `Rider Earnings: UGX ${breakdown.riderEarnings.toLocaleString()}`
  );

  if (breakdown.merchantEarnings > 0) {
    lines.push(
      `Merchant Earnings: UGX ${breakdown.merchantEarnings.toLocaleString()}`
    );
  }

  return lines.join('\n');
}

// ============================================
// PLATFORM EARNINGS SUMMARY
// ============================================

/**
 * Get platform earnings summary for a period
 */
export async function getPlatformEarningsSummary(
  startDate: Date,
  endDate: Date
): Promise<{
  totalRevenue: number;
  totalCommission: number;
  totalServiceFees: number;
  totalSurcharges: number;
  totalRiderPayouts: number;
  totalMerchantPayouts: number;
  taskCount: number;
  breakdown: Record<TaskType, { count: number; revenue: number; commission: number }>;
}> {
  const tasks = await db.task.findMany({
    where: {
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    },
    select: {
      id: true,
      taskType: true,
      totalAmount: true,
      platformCommission: true,
      riderEarnings: true,
    },
  });

  const financeLogs = await db.financeLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      transactionType: {
        in: [
          'RIDE_PAYMENT',
          'FOOD_ORDER_PAYMENT',
          'SHOPPING_ORDER_PAYMENT',
          'ITEM_DELIVERY_PAYMENT',
          'HEALTH_ORDER_PAYMENT',
        ],
      },
    },
    select: {
      amount: true,
      platformCommission: true,
      riderEarnings: true,
      merchantEarnings: true,
    },
  });

  let totalRevenue = 0;
  let totalCommission = 0;
  let totalRiderPayouts = 0;
  let totalMerchantPayouts = 0;
  const breakdown: Record<string, { count: number; revenue: number; commission: number }> = {};

  for (const log of financeLogs) {
    totalRevenue += log.amount;
    totalCommission += log.platformCommission || 0;
    totalRiderPayouts += log.riderEarnings || 0;
    totalMerchantPayouts += log.merchantEarnings || 0;
  }

  for (const task of tasks) {
    const type = task.taskType;
    if (!breakdown[type]) {
      breakdown[type] = { count: 0, revenue: 0, commission: 0 };
    }
    breakdown[type].count++;
    breakdown[type].revenue += task.totalAmount;
    breakdown[type].commission += task.platformCommission || 0;
  }

  return {
    totalRevenue,
    totalCommission,
    totalServiceFees: Math.round(totalCommission * 0.25), // Estimate
    totalSurcharges: Math.round(totalCommission * 0.1), // Estimate
    totalRiderPayouts,
    totalMerchantPayouts,
    taskCount: tasks.length,
    breakdown: breakdown as Record<
      TaskType,
      { count: number; revenue: number; commission: number }
    >,
  };
}

// ============================================
// ESTIMATION HELPERS
// ============================================

/**
 * Estimate commission for fare preview
 */
export function estimateCommission(
  taskType: TaskType,
  totalAmount: number,
  isNight: boolean = false,
  isPeak: boolean = false
): {
  platformCommission: number;
  riderEarnings: number;
} {
  const config = DEFAULT_COMMISSION_RATES[taskType];

  let commission = totalAmount * (config.platformCommissionPercent / 100);
  commission += totalAmount * (config.serviceFeePercent / 100);

  if (isNight) {
    commission += totalAmount * (config.nightSurchargePercent / 100);
  }

  if (isPeak) {
    commission += totalAmount * (config.peakSurchargePercent / 100);
  }

  const riderEarnings = totalAmount - Math.round(commission);

  return {
    platformCommission: Math.round(commission),
    riderEarnings: Math.max(0, riderEarnings),
  };
}

// ============================================
// EXPORTS
// ============================================

export { DEFAULT_COMMISSION_RATES };

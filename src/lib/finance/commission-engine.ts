/**
 * Commission Engine for Smart Ride
 * SafeBoda-style commission calculation for all task types
 * 
 * Calculates platform commissions, rider earnings, and merchant earnings
 * based on task type, pricing configuration, and surcharges.
 */

import { db } from '@/lib/db';
import { TaskType, PaymentMethod } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CommissionInput {
  taskId: string;
  taskType: TaskType;
  totalAmount: number;
  distanceKm?: number;
  durationMinutes?: number;
  merchantId?: string;
  riderId?: string;
  clientId: string;
  paymentMethod: PaymentMethod;
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

// ============================================
// COMMISSION ENGINE
// ============================================

/**
 * Get commission configuration for a task type
 */
export async function getCommissionConfig(taskType: TaskType): Promise<CommissionConfig> {
  // Try to get from database first
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
      platformCommissionPercent: dbConfig.platformCommissionPercent || DEFAULT_COMMISSION_RATES[taskType].platformCommissionPercent,
      serviceFeePercent: dbConfig.serviceFeePercent || DEFAULT_COMMISSION_RATES[taskType].serviceFeePercent,
      nightSurchargePercent: dbConfig.nightSurchargePercent || DEFAULT_COMMISSION_RATES[taskType].nightSurchargePercent,
      peakSurchargePercent: dbConfig.peakSurchargePercent || DEFAULT_COMMISSION_RATES[taskType].peakSurchargePercent,
    };
  }

  return DEFAULT_COMMISSION_RATES[taskType];
}

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

/**
 * Calculate commission for a task
 */
export async function calculateCommission(input: CommissionInput): Promise<CommissionBreakdown> {
  const config = await getCommissionConfig(input.taskType);
  const now = new Date();

  // Determine if night or peak hours
  const isNight = input.isNightRide !== undefined ? input.isNightRide : isNightHours(now);
  const isPeak = input.isPeakHours !== undefined ? input.isPeakHours : isPeakHours(now);

  // Use custom commission rate if provided
  const commissionPercent = input.customCommissionRate ?? config.platformCommissionPercent;

  // Calculate base amounts
  const totalAmount = input.totalAmount;

  // Calculate service fee
  const serviceFee = Math.round(totalAmount * (config.serviceFeePercent / 100));

  // Calculate surcharges
  let nightSurcharge = 0;
  let peakSurcharge = 0;

  if (isNight) {
    nightSurcharge = Math.round(totalAmount * (config.nightSurchargePercent / 100));
  }

  if (isPeak) {
    peakSurcharge = Math.round(totalAmount * (config.peakSurchargePercent / 100));
  }

  // Calculate platform commission
  const baseCommission = Math.round(totalAmount * (commissionPercent / 100));
  const totalPlatformCommission = baseCommission + serviceFee + nightSurcharge + peakSurcharge;

  // Calculate rider earnings (total - platform commission - merchant share)
  let merchantEarnings = 0;
  let riderEarnings = totalAmount - totalPlatformCommission;

  // For delivery tasks with merchants, calculate merchant share
  if (input.merchantId && ['FOOD_DELIVERY', 'SHOPPING', 'SMART_HEALTH_DELIVERY'].includes(input.taskType)) {
    // Get merchant commission rate
    const merchant = await db.merchant.findUnique({
      where: { id: input.merchantId },
      select: { commissionRate: true },
    });

    if (merchant) {
      const merchantCommissionRate = merchant.commissionRate;
      // Merchant gets their share minus platform commission for goods
      // Rider only gets delivery fee portion
      merchantEarnings = Math.round(totalAmount * (1 - merchantCommissionRate));
      riderEarnings = totalAmount - totalPlatformCommission - merchantEarnings;
    }
  }

  // Ensure rider earnings is not negative
  riderEarnings = Math.max(0, riderEarnings);

  const breakdown: CommissionBreakdown = {
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

  return breakdown;
}

/**
 * Calculate and record commission for a task
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
    lines.push(`  Night Surcharge: UGX ${breakdown.nightSurcharge.toLocaleString()}`);
  }

  if (breakdown.peakSurcharge > 0) {
    lines.push(`  Peak Surcharge: UGX ${breakdown.peakSurcharge.toLocaleString()}`);
  }

  lines.push(``);
  lines.push(`Total Platform Commission: UGX ${breakdown.totalPlatformCommission.toLocaleString()}`);
  lines.push(`Rider Earnings: UGX ${breakdown.riderEarnings.toLocaleString()}`);

  if (breakdown.merchantEarnings > 0) {
    lines.push(`Merchant Earnings: UGX ${breakdown.merchantEarnings.toLocaleString()}`);
  }

  return lines.join('\n');
}

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
        in: ['RIDE_PAYMENT', 'FOOD_ORDER_PAYMENT', 'SHOPPING_ORDER_PAYMENT', 'ITEM_DELIVERY_PAYMENT', 'HEALTH_ORDER_PAYMENT'],
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
    breakdown: breakdown as Record<TaskType, { count: number; revenue: number; commission: number }>,
  };
}

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

export {
  DEFAULT_COMMISSION_RATES,
};

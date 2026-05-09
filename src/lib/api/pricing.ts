import { TaskType } from '@prisma/client';

interface PricingInput {
  taskType: TaskType;
  distanceKm: number;
  durationMinutes?: number;
  itemWeight?: number;
  itemValue?: number;
  passengerCount?: number;
  isNightTime?: boolean;
  isPeakHours?: boolean;
}

interface PricingBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  deliveryFee: number;
  serviceFee: number;
  nightSurcharge: number;
  peakSurcharge: number;
  totalAmount: number;
  platformCommission: number;
  riderEarnings: number;
}

// Pricing configuration per service type (in UGX)
const PRICING_CONFIG = {
  SMART_BODA_RIDE: {
    baseFare: 2000,
    perKmRate: 150,
    perMinuteRate: 50,
    minimumFare: 3000,
    platformCommissionPercent: 0.15,
    serviceFeePercent: 0.05,
    nightSurchargePercent: 0.20,
    peakSurchargePercent: 0.25,
  },
  SMART_CAR_RIDE: {
    baseFare: 5000,
    perKmRate: 300,
    perMinuteRate: 100,
    minimumFare: 8000,
    platformCommissionPercent: 0.20,
    serviceFeePercent: 0.05,
    nightSurchargePercent: 0.20,
    peakSurchargePercent: 0.25,
  },
  FOOD_DELIVERY: {
    baseFare: 3000,
    perKmRate: 200,
    perMinuteRate: 0,
    minimumFare: 5000,
    platformCommissionPercent: 0.15,
    serviceFeePercent: 0.03,
    nightSurchargePercent: 0.10,
    peakSurchargePercent: 0.15,
  },
  SHOPPING: {
    baseFare: 3000,
    perKmRate: 200,
    perMinuteRate: 0,
    minimumFare: 5000,
    platformCommissionPercent: 0.12,
    serviceFeePercent: 0.03,
    nightSurchargePercent: 0.10,
    peakSurchargePercent: 0.15,
  },
  ITEM_DELIVERY: {
    baseFare: 1000,
    perKmRate: 100,
    perMinuteRate: 0,
    perKgRate: 50,
    minimumFare: 2000,
    platformCommissionPercent: 0.10,
    serviceFeePercent: 0.02,
    nightSurchargePercent: 0.10,
    peakSurchargePercent: 0.15,
  },
};

/**
 * Calculate pricing for a task based on type and parameters
 */
export function calculatePricing(input: PricingInput): PricingBreakdown {
  const config = PRICING_CONFIG[input.taskType];
  
  // Base calculations
  const baseFare = config.baseFare;
  const distanceFare = Math.round(input.distanceKm * config.perKmRate);
  const timeFare = input.durationMinutes 
    ? Math.round(input.durationMinutes * config.perMinuteRate) 
    : 0;
  
  // Item delivery specific: weight-based pricing
  let deliveryFee = 0;
  if (input.taskType === 'ITEM_DELIVERY' && input.itemWeight) {
    deliveryFee = Math.round(input.itemWeight * (config.perKgRate || 50));
  }
  
  // Calculate subtotal before surcharges
  let subtotal = baseFare + distanceFare + timeFare + deliveryFee;
  
  // Apply surcharges
  const nightSurcharge = input.isNightTime 
    ? Math.round(subtotal * config.nightSurchargePercent) 
    : 0;
  const peakSurcharge = input.isPeakHours 
    ? Math.round(subtotal * config.peakSurchargePercent) 
    : 0;
  
  // Calculate service fee
  const totalBeforeFees = subtotal + nightSurcharge + peakSurcharge;
  const serviceFee = Math.round(totalBeforeFees * config.serviceFeePercent);
  
  // Calculate total
  let totalAmount = totalBeforeFees + serviceFee;
  
  // Apply minimum fare
  totalAmount = Math.max(totalAmount, config.minimumFare);
  
  // Calculate commission and rider earnings
  const platformCommission = Math.round(totalAmount * config.platformCommissionPercent);
  const riderEarnings = totalAmount - platformCommission;
  
  return {
    baseFare,
    distanceFare,
    timeFare,
    deliveryFee,
    serviceFee,
    nightSurcharge,
    peakSurcharge,
    totalAmount,
    platformCommission,
    riderEarnings,
  };
}

/**
 * Estimate fare for a ride (for client app display)
 */
export function estimateFare(
  taskType: TaskType,
  distanceKm: number,
  durationMinutes: number
): { minFare: number; maxFare: number } {
  const normalPricing = calculatePricing({
    taskType,
    distanceKm,
    durationMinutes,
    isNightTime: false,
    isPeakHours: false,
  });
  
  const peakPricing = calculatePricing({
    taskType,
    distanceKm,
    durationMinutes,
    isNightTime: true,
    isPeakHours: true,
  });
  
  return {
    minFare: normalPricing.totalAmount,
    maxFare: peakPricing.totalAmount,
  };
}

/**
 * Get pricing config for a service type
 */
export function getPricingConfig(taskType: TaskType) {
  return PRICING_CONFIG[taskType];
}

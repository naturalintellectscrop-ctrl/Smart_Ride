import { TaskType } from '@prisma/client';
import { db } from '@/lib/db';

interface PricingInput {
  taskType: TaskType;
  distanceKm: number;
  durationMinutes?: number;
  waitingMinutes?: number;
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
  waitingCharge: number;
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
    // Waiting charge: after 3 free minutes, 100 UGX/min while the rider waits.
    freeWaitingMin: 3,
    waitingChargePerMin: 100,
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
    // Waiting charge: after 5 free minutes, 200 UGX/min while the driver waits.
    freeWaitingMin: 5,
    waitingChargePerMin: 200,
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

type RateConfig = {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  perKgRate?: number;
  freeWaitingMin?: number;
  waitingChargePerMin?: number;
  minimumFare: number;
  maximumFare?: number;
  platformCommissionPercent: number;
  serviceFeePercent: number;
  nightSurchargePercent: number;
  peakSurchargePercent: number;
};

// ---- Admin-configurable pricing (DB PricingConfig) with hardcoded fallback ----
// calculatePricing() stays synchronous and uses the hardcoded defaults (safe,
// used by tests / any sync caller). calculatePricingAsync() merges the
// admin-editable PricingConfig rows over those defaults so changing fares in the
// dashboard actually changes what riders are charged. Results are cached briefly
// to avoid a DB hit on every fare calculation.

const CONFIG_TTL_MS = 60_000;
let configCache: { map: Record<string, Partial<RateConfig>>; expires: number } | null = null;

// Percent fields may be stored as a fraction (0.15) or a whole number (15).
const normPct = (v: number | null | undefined): number | undefined =>
  v == null ? undefined : v > 1 ? v / 100 : v;

async function loadDbPricing(): Promise<Record<string, Partial<RateConfig>>> {
  if (configCache && configCache.expires > Date.now()) return configCache.map;
  const map: Record<string, Partial<RateConfig>> = {};
  try {
    const rows = await db.pricingConfig.findMany();
    for (const r of rows) {
      map[r.serviceType] = {
        baseFare: Number(r.baseFare),
        perKmRate: Number(r.perKmRate),
        perMinuteRate: r.perMinuteRate != null ? Number(r.perMinuteRate) : undefined,
        minimumFare: Number(r.minimumFare),
        maximumFare: r.maximumFare != null ? Number(r.maximumFare) : undefined,
        platformCommissionPercent: normPct(r.platformCommissionPercent),
        serviceFeePercent: normPct(r.serviceFeePercent),
        nightSurchargePercent: normPct(r.nightSurchargePercent),
        peakSurchargePercent: normPct(r.peakSurchargePercent),
      };
    }
  } catch (e) {
    // DB unavailable / table missing → fall back to hardcoded defaults only.
    console.warn('[pricing] PricingConfig load failed, using defaults:', (e as Error).message);
  }
  configCache = { map, expires: Date.now() + CONFIG_TTL_MS };
  return map;
}

/** Merge admin DB overrides over the hardcoded defaults for a task type. */
function mergeConfig(taskType: TaskType, dbMap: Record<string, Partial<RateConfig>>): RateConfig {
  const base = PRICING_CONFIG[taskType] as RateConfig;
  const override = dbMap[taskType] || {};
  const merged: RateConfig = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v != null && !Number.isNaN(v as number)) (merged as any)[k] = v;
  }
  return merged;
}

/** Force the next fare calc to reload config from the DB (e.g., after admin edit). */
export function invalidatePricingCache(): void {
  configCache = null;
}

/**
 * Admin-aware pricing: uses DB PricingConfig (cached) merged over defaults.
 * Prefer this in API routes so admin fare settings take effect.
 */
export async function calculatePricingAsync(input: PricingInput): Promise<PricingBreakdown> {
  const dbMap = await loadDbPricing();
  return computePricing(input, mergeConfig(input.taskType, dbMap));
}

/**
 * Calculate pricing for a task based on type and parameters (synchronous,
 * hardcoded defaults). Kept for backward compatibility / sync callers.
 */
export function calculatePricing(input: PricingInput): PricingBreakdown {
  return computePricing(input, PRICING_CONFIG[input.taskType] as RateConfig);
}

function computePricing(input: PricingInput, config: RateConfig): PricingBreakdown {
  // Base calculations
  const baseFare = config.baseFare;
  const distanceFare = Math.round(input.distanceKm * config.perKmRate);
  const timeFare = input.durationMinutes
    ? Math.round(input.durationMinutes * config.perMinuteRate)
    : 0;

  // Waiting charge: billed only for waiting time beyond the free grace window,
  // at the service's per-minute waiting rate. Defaults to 0 when the caller
  // doesn't supply waitingMinutes (e.g. up-front estimates), so it never
  // inflates a quote silently — it applies at settlement when wait is known.
  const freeWaitingMin = config.freeWaitingMin ?? 0;
  const waitingChargePerMin = config.waitingChargePerMin ?? 0;
  const billableWaitMin = Math.max(0, (input.waitingMinutes ?? 0) - freeWaitingMin);
  const waitingCharge = Math.round(billableWaitMin * waitingChargePerMin);

  // Item delivery specific: weight-based pricing
  let deliveryFee = 0;
  if (input.taskType === 'ITEM_DELIVERY' && input.itemWeight) {
    deliveryFee = Math.round(input.itemWeight * (config.perKgRate || 50));
  }

  // Calculate subtotal before surcharges
  let subtotal = baseFare + distanceFare + timeFare + waitingCharge + deliveryFee;
  
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
  
  // Apply minimum fare (and optional admin-configured maximum cap)
  totalAmount = Math.max(totalAmount, config.minimumFare);
  if (config.maximumFare && config.maximumFare > 0) {
    totalAmount = Math.min(totalAmount, config.maximumFare);
  }

  // Calculate commission and rider earnings
  const platformCommission = Math.round(totalAmount * config.platformCommissionPercent);
  const riderEarnings = totalAmount - platformCommission;
  
  return {
    baseFare,
    distanceFare,
    timeFare,
    waitingCharge,
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

/**
 * Waiting charge for a service, given the total minutes the rider/driver waited
 * at pickup. Bills only the minutes beyond the service's free grace window at
 * its per-minute waiting rate. Returns 0 for services without a waiting rate.
 *
 *   BODA: 3 free min, then 100 UGX/min   →  computeWaitingCharge('SMART_BODA_RIDE', 8) = 500
 *   CAR : 5 free min, then 200 UGX/min   →  computeWaitingCharge('SMART_CAR_RIDE', 4)  = 0
 */
export function computeWaitingCharge(taskType: TaskType, waitingMinutes: number): number {
  const cfg = PRICING_CONFIG[taskType] as RateConfig | undefined;
  if (!cfg) return 0;
  const freeWaitingMin = cfg.freeWaitingMin ?? 0;
  const waitingChargePerMin = cfg.waitingChargePerMin ?? 0;
  if (waitingChargePerMin <= 0) return 0;
  const billableWaitMin = Math.max(0, (waitingMinutes ?? 0) - freeWaitingMin);
  return Math.round(billableWaitMin * waitingChargePerMin);
}

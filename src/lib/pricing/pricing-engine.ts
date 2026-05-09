// Smart Ride Pricing Engine Core
// Calculates ride fares with multiple factors and adjustments

import {
  PricingInput,
  PricingResult,
  PricingConfig,
  FareBreakdown,
  RideType,
  TrafficCondition,
  WeatherCondition,
  SurgeZoneConfig,
  DEFAULT_PRICING_CONFIG,
  PRICING_CONSTANTS,
} from './types';

// ============================================
// IN-MEMORY STORES (Use Redis in Production)
// ============================================

let pricingConfig: PricingConfig = { ...DEFAULT_PRICING_CONFIG };
const surgeZones = new Map<string, SurgeZoneConfig>();
const demandHistory = new Map<string, Array<{ timestamp: Date; demandRatio: number }>>();

// ============================================
// CONFIGURATION MANAGEMENT
// ============================================

export function getPricingConfig(): PricingConfig {
  return pricingConfig;
}

export function updatePricingConfig(updates: Partial<PricingConfig>): PricingConfig {
  pricingConfig = {
    ...pricingConfig,
    ...updates,
    lastUpdated: new Date(),
  };
  return pricingConfig;
}

export function updateRideTypePricing(
  rideType: RideType,
  pricing: Partial<typeof DEFAULT_PRICING_CONFIG.rideTypePricing[RideType]>
): void {
  pricingConfig.rideTypePricing[rideType] = {
    ...pricingConfig.rideTypePricing[rideType],
    ...pricing,
  };
}

// ============================================
// SURGE PRICING CALCULATION
// ============================================

/**
 * Calculate surge multiplier based on demand/supply ratio
 */
export function calculateSurgeMultiplier(
  rideRequests: number,
  availableDrivers: number,
  zoneId?: string
): { multiplier: number; reason: string } {
  if (!pricingConfig.surgeConfig.enabled) {
    return { multiplier: 1.0, reason: 'Surge pricing disabled' };
  }

  // Check zone-specific surge first
  if (zoneId && surgeZones.has(zoneId)) {
    const zoneSurge = surgeZones.get(zoneId)!;
    if (zoneSurge.isActive) {
      return {
        multiplier: zoneSurge.currentMultiplier,
        reason: `Zone surge active in ${zoneSurge.zoneName || zoneId}`,
      };
    }
  }

  // Calculate demand ratio
  const demandRatio = availableDrivers > 0 
    ? rideRequests / availableDrivers 
    : rideRequests > 0 ? PRICING_CONSTANTS.CRITICAL_DEMAND_RATIO : 0;

  // Apply surge logic
  const { minDemandRatio, maxSurgeMultiplier, surgeStepSize } = pricingConfig.surgeConfig;

  if (demandRatio <= minDemandRatio) {
    return { multiplier: 1.0, reason: 'Normal demand' };
  }

  // Calculate multiplier: 1 + (ratio * step), capped at max
  // Example: ratio=2, step=0.2 -> 1 + (2 * 0.2) = 1.4x
  let surgeMultiplier = 1 + ((demandRatio - 1) * surgeStepSize);
  
  // Cap at maximum
  surgeMultiplier = Math.min(surgeMultiplier, maxSurgeMultiplier);
  
  // Round to 1 decimal place
  surgeMultiplier = Math.round(surgeMultiplier * 10) / 10;

  let reason = 'Normal pricing';
  if (surgeMultiplier >= 2.5) {
    reason = 'High demand - surge pricing active';
  } else if (surgeMultiplier >= 1.5) {
    reason = 'Increased demand - moderate surge';
  } else if (surgeMultiplier > 1.0) {
    reason = 'Slightly higher demand';
  }

  return { multiplier: surgeMultiplier, reason };
}

/**
 * Update surge pricing for a zone
 */
export function updateZoneSurge(
  zoneId: string,
  zoneName: string,
  rideRequests: number,
  availableDrivers: number
): SurgeZoneConfig {
  const { multiplier } = calculateSurgeMultiplier(rideRequests, availableDrivers);
  
  const zoneConfig: SurgeZoneConfig = {
    zoneId,
    zoneName,
    currentMultiplier: multiplier,
    demandRatio: availableDrivers > 0 ? rideRequests / availableDrivers : rideRequests,
    lastUpdated: new Date(),
    isActive: multiplier > 1.0,
  };

  surgeZones.set(zoneId, zoneConfig);
  
  // Store demand history for analytics
  if (!demandHistory.has(zoneId)) {
    demandHistory.set(zoneId, []);
  }
  demandHistory.get(zoneId)!.push({
    timestamp: new Date(),
    demandRatio: zoneConfig.demandRatio,
  });

  // Keep only last 24 hours of history
  const history = demandHistory.get(zoneId)!;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const filteredHistory = history.filter(h => h.timestamp >= oneDayAgo);
  demandHistory.set(zoneId, filteredHistory);

  return zoneConfig;
}

// ============================================
// TRAFFIC ADJUSTMENT
// ============================================

/**
 * Get traffic multipliers based on conditions
 */
export function getTrafficMultiplier(
  trafficCondition: TrafficCondition
): { timeMultiplier: number; overallMultiplier: number } {
  const trafficConfig = pricingConfig.trafficMultipliers.find(
    t => t.condition === trafficCondition
  );
  
  return trafficConfig || { timeMultiplier: 1.0, overallMultiplier: 1.0 };
}

// ============================================
// WEATHER ADJUSTMENT
// ============================================

/**
 * Get weather multiplier based on conditions
 */
export function getWeatherMultiplier(
  weatherCondition: WeatherCondition
): { multiplier: number; description: string } {
  const weatherConfig = pricingConfig.weatherMultipliers.find(
    w => w.condition === weatherCondition
  );
  
  return weatherConfig || { multiplier: 1.0, description: 'Normal conditions' };
}

// ============================================
// PEAK HOUR PRICING
// ============================================

/**
 * Determine if current time is during peak hours
 */
export function getPeakHourMultiplier(
  timeOfDay: Date,
  dayOfWeek: number
): { multiplier: number; reason: string; isPeak: boolean } {
  const { peakHourConfig } = pricingConfig;
  
  if (!peakHourConfig.enabled) {
    return { multiplier: 1.0, reason: 'Peak pricing disabled', isPeak: false };
  }

  const hours = timeOfDay.getHours();
  const minutes = timeOfDay.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes since midnight

  // Parse time strings
  const parseTime = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const morningStart = parseTime(peakHourConfig.morningStart);
  const morningEnd = parseTime(peakHourConfig.morningEnd);
  const eveningStart = parseTime(peakHourConfig.eveningStart);
  const eveningEnd = parseTime(peakHourConfig.eveningEnd);
  const nightStart = parseTime(peakHourConfig.nightStart);
  const nightEnd = parseTime(peakHourConfig.nightEnd);

  // Check morning peak (e.g., 07:00 - 09:00)
  if (currentTime >= morningStart && currentTime <= morningEnd) {
    return {
      multiplier: peakHourConfig.morningMultiplier,
      reason: 'Morning peak hours',
      isPeak: true,
    };
  }

  // Check evening peak (e.g., 17:00 - 20:00)
  if (currentTime >= eveningStart && currentTime <= eveningEnd) {
    return {
      multiplier: peakHourConfig.eveningMultiplier,
      reason: 'Evening peak hours',
      isPeak: true,
    };
  }

  // Check night hours (e.g., 22:00 - 05:00)
  // Night hours span midnight, so we need special handling
  const isNight = currentTime >= nightStart || currentTime <= nightEnd;
  if (isNight) {
    return {
      multiplier: peakHourConfig.nightMultiplier,
      reason: 'Night hours',
      isPeak: false, // Not technically "peak" but has surcharge
    };
  }

  return { multiplier: 1.0, reason: 'Off-peak hours', isPeak: false };
}

// ============================================
// DAY TYPE PRICING
// ============================================

/**
 * Get multiplier based on day type (weekend/holiday)
 */
export function getDayMultiplier(
  dayOfWeek: number,
  isHoliday: boolean,
  rideType: RideType
): { multiplier: number; reason: string } {
  const ridePricing = pricingConfig.rideTypePricing[rideType];
  
  if (isHoliday) {
    return {
      multiplier: ridePricing.holidayMultiplier,
      reason: 'Holiday pricing',
    };
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  if (isWeekend) {
    return {
      multiplier: ridePricing.weekendMultiplier,
      reason: 'Weekend pricing',
    };
  }

  return { multiplier: 1.0, reason: 'Standard weekday pricing' };
}

// ============================================
// CORE FARE CALCULATION
// ============================================

/**
 * Calculate fare for a ride
 */
export function calculateFare(input: PricingInput): PricingResult {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Get ride type pricing
  const ridePricing = pricingConfig.rideTypePricing[input.rideType] || 
    pricingConfig.rideTypePricing.STANDARD;

  // 1. Base Fare
  const baseFare = ridePricing.baseFare;

  // 2. Distance Fare
  const distanceCost = input.estimatedDistanceKm * ridePricing.perKilometerRate;

  // 3. Time Fare (adjusted for traffic)
  const trafficMultipliers = getTrafficMultiplier(input.trafficCondition);
  const adjustedTimeMinutes = input.estimatedTimeMinutes * trafficMultipliers.timeMultiplier;
  const timeCost = adjustedTimeMinutes * ridePricing.perMinuteRate;

  // 4. Surge Pricing
  const { multiplier: surgeMultiplier, reason: surgeReason } = calculateSurgeMultiplier(
    input.currentDemandLevel,
    input.availableDriversNearby,
    input.demandZoneId
  );

  // 5. Peak Hour Pricing
  const { multiplier: peakMultiplier, reason: peakReason, isPeak } = getPeakHourMultiplier(
    input.timeOfDay,
    input.dayOfWeek
  );

  // 6. Day Type Pricing (Weekend/Holiday)
  const { multiplier: dayMultiplier, reason: dayReason } = getDayMultiplier(
    input.dayOfWeek,
    input.isHoliday,
    input.rideType
  );

  // 7. Weather Adjustment
  const { multiplier: weatherMultiplier, description: weatherDesc } = getWeatherMultiplier(
    input.weatherCondition
  );

  // Calculate subtotal before multipliers
  let subtotal = baseFare + distanceCost + timeCost;

  // Apply multipliers (compounded)
  let totalBeforeFees = subtotal;

  // Apply surge first
  const surgeAmount = surgeMultiplier > 1 
    ? subtotal * (surgeMultiplier - 1) 
    : 0;
  totalBeforeFees += surgeAmount;

  // Apply peak/night multiplier
  const peakAmount = peakMultiplier > 1 
    ? (subtotal + surgeAmount) * (peakMultiplier - 1) 
    : 0;
  totalBeforeFees += peakAmount;

  // Apply day multiplier (weekend/holiday)
  const dayAmount = dayMultiplier > 1 
    ? (subtotal + surgeAmount + peakAmount) * (dayMultiplier - 1) 
    : 0;
  totalBeforeFees += dayAmount;

  // Apply weather multiplier
  const weatherAmount = weatherMultiplier > 1 
    ? (subtotal + surgeAmount + peakAmount + dayAmount) * (weatherMultiplier - 1) 
    : 0;
  totalBeforeFees += weatherAmount;

  // Traffic overall adjustment
  const trafficAmount = trafficMultipliers.overallMultiplier > 1
    ? totalBeforeFees * (trafficMultipliers.overallMultiplier - 1)
    : 0;
  totalBeforeFees += trafficAmount;

  // Apply night multiplier separately if applicable
  const { multiplier: nightMultiplier } = getPeakHourMultiplier(input.timeOfDay, input.dayOfWeek);
  const nightAmount = nightMultiplier > 1 && !isPeak
    ? subtotal * (nightMultiplier - 1)
    : 0;
  totalBeforeFees += nightAmount;

  // 8. Service Fee
  let serviceFee = totalBeforeFees * (pricingConfig.serviceFeePercent / 100);
  serviceFee = Math.max(pricingConfig.serviceFeeMinimum, Math.min(serviceFee, pricingConfig.serviceFeeMaximum));

  // 9. Tax
  const taxAmount = pricingConfig.taxIncludedInFare 
    ? 0 
    : (totalBeforeFees + serviceFee) * (pricingConfig.taxPercent / 100);

  // Calculate final fare
  let finalFare = totalBeforeFees + serviceFee + taxAmount;

  // 10. Minimum Fare Enforcement
  const minimumFareApplied = finalFare < ridePricing.minimumFare;
  if (minimumFareApplied) {
    finalFare = ridePricing.minimumFare;
    warnings.push(`Minimum fare of ${ridePricing.minimumFare} applied`);
  }

  // Calculate driver earnings
  const driverEarnings = finalFare * (pricingConfig.driverEarningsPercent / 100);
  const platformEarnings = finalFare * (pricingConfig.platformCommissionPercent / 100);

  // Round final fare
  finalFare = roundFare(finalFare, pricingConfig.decimalPlaces);

  // Build breakdown
  const fareBreakdown: FareBreakdown = {
    baseFare: roundFare(baseFare),
    distanceCost: roundFare(distanceCost),
    timeCost: roundFare(timeCost),
    
    surgeMultiplier,
    surgeAmount: roundFare(surgeAmount),
    
    peakMultiplier,
    peakAmount: roundFare(peakAmount),
    
    trafficMultiplier: trafficMultipliers.overallMultiplier,
    trafficAmount: roundFare(trafficAmount),
    
    weatherMultiplier,
    weatherAmount: roundFare(weatherAmount),
    
    nightMultiplier,
    nightAmount: roundFare(nightAmount),
    
    serviceFee: roundFare(serviceFee),
    taxAmount: roundFare(taxAmount),
    
    subtotal: roundFare(subtotal),
    finalFare,
    minimumFareApplied,
    
    driverEarnings: roundFare(driverEarnings),
    platformEarnings: roundFare(platformEarnings),
    
    currency: pricingConfig.currency,
    calculationTimeMs: Date.now() - startTime,
    validUntil: new Date(Date.now() + PRICING_CONSTANTS.PRICE_VALIDITY_MINUTES * 60 * 1000),
  };

  // Check response time warning
  const calculationTime = Date.now() - startTime;
  if (calculationTime > PRICING_CONSTANTS.MAX_RESPONSE_TIME_MS) {
    warnings.push(`Calculation took ${calculationTime}ms (target: ${PRICING_CONSTANTS.MAX_RESPONSE_TIME_MS}ms)`);
  }

  return {
    success: true,
    fareBreakdown,
    
    estimatedDistanceKm: input.estimatedDistanceKm,
    estimatedTimeMinutes: input.estimatedTimeMinutes,
    rideType: input.rideType,
    
    surgeReason: surgeMultiplier > 1 ? surgeReason : undefined,
    peakReason: peakMultiplier > 1 ? peakReason : undefined,
    weatherReason: weatherMultiplier > 1 ? weatherDesc : undefined,
    
    zoneId: input.demandZoneId,
    zoneSurgeActive: surgeMultiplier > 1,
    
    calculatedAt: new Date(),
    expiresAt: new Date(Date.now() + PRICING_CONSTANTS.PRICE_VALIDITY_MINUTES * 60 * 1000),
    
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Round fare to specified decimal places
 */
function roundFare(amount: number, decimalPlaces: number = 0): number {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(amount * multiplier) / multiplier;
}

/**
 * Format fare for display
 */
export function formatFare(amount: number, currency?: string): string {
  const config = currency ? { ...pricingConfig, currency } : pricingConfig;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  }).format(amount);
}

/**
 * Get surge status for all zones
 */
export function getSurgeStatus(): {
  globalMultiplier: number;
  activeZones: SurgeZoneConfig[];
  lastUpdate: Date;
  nextUpdate: Date;
} {
  const activeZones = Array.from(surgeZones.values()).filter(z => z.isActive);
  const globalMultiplier = activeZones.length > 0
    ? Math.max(...activeZones.map(z => z.currentMultiplier))
    : 1.0;

  const lastUpdate = activeZones.length > 0
    ? new Date(Math.max(...activeZones.map(z => z.lastUpdated.getTime())))
    : new Date();

  return {
    globalMultiplier,
    activeZones,
    lastUpdate,
    nextUpdate: new Date(Date.now() + pricingConfig.surgeConfig.updateIntervalSeconds * 1000),
  };
}

/**
 * Get demand history for a zone
 */
export function getDemandHistory(zoneId: string): Array<{ timestamp: Date; demandRatio: number }> {
  return demandHistory.get(zoneId) || [];
}

/**
 * Estimate fare for display (quick calculation)
 */
export function estimateFare(
  distanceKm: number,
  timeMinutes: number,
  rideType: RideType,
  demandZoneId?: string
): number {
  const ridePricing = pricingConfig.rideTypePricing[rideType];
  
  const baseFare = ridePricing.baseFare;
  const distanceCost = distanceKm * ridePricing.perKilometerRate;
  const timeCost = timeMinutes * ridePricing.perMinuteRate;
  
  let estimate = baseFare + distanceCost + timeCost;
  
  // Apply zone surge if available
  if (demandZoneId && surgeZones.has(demandZoneId)) {
    const zone = surgeZones.get(demandZoneId)!;
    estimate *= zone.currentMultiplier;
  }
  
  // Ensure minimum fare
  estimate = Math.max(estimate, ridePricing.minimumFare);
  
  return roundFare(estimate);
}

// ============================================
// EXPORTS
// ============================================

export {
  surgeZones,
  demandHistory,
};

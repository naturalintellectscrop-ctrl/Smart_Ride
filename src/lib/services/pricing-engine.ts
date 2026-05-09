/**
 * Smart Ride Dynamic Pricing Engine
 * Handles fare calculation with multiple factors including base fare,
 * distance, time, vehicle type, surge pricing, and booking fees
 */

import { VehicleType } from './routing-service';

// ============================================
// Types
// ============================================

export interface PricingConfig {
  baseFare: number;
  pricePerKm: number;
  pricePerMinute: number;
  bookingFee: number;
  minimumFare: number;
}

export interface VehicleMultiplier {
  type: VehicleType;
  name: string;
  multiplier: number;
  description: string;
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  subtotal: number;
  vehicleMultiplier: number;
  surgeMultiplier: number;
  totalAmount: number;
  currency: string;
}

export interface FareEstimate {
  minFare: number;
  maxFare: number;
  breakdown: FareBreakdown;
  vehicleType: VehicleType;
  distanceKm: number;
  durationMinutes: number;
}

export interface SurgeInfo {
  multiplier: number;
  reason: string;
  area?: string;
  expiresAt?: Date;
}

// ============================================
// Constants - Pricing Configuration (in UGX)
// ============================================

// Base pricing configuration
const BASE_PRICING: PricingConfig = {
  baseFare: 2000,        // Starting fare in UGX
  pricePerKm: 150,       // Price per kilometer in UGX
  pricePerMinute: 30,    // Price per minute in UGX
  bookingFee: 500,       // Fixed booking fee in UGX
  minimumFare: 3000,     // Minimum fare in UGX
};

// Vehicle type multipliers
const VEHICLE_MULTIPLIERS: Record<VehicleType, VehicleMultiplier> = {
  moto: {
    type: 'moto',
    name: 'Boda Boda',
    multiplier: 0.7,
    description: 'Fast and affordable motorcycle taxi',
  },
  economy: {
    type: 'economy',
    name: 'Economy Car',
    multiplier: 1.0,
    description: 'Comfortable and budget-friendly car ride',
  },
  premium: {
    type: 'premium',
    name: 'Premium Car',
    multiplier: 1.5,
    description: 'Luxury vehicles with premium service',
  },
  electric: {
    type: 'electric',
    name: 'Electric Vehicle',
    multiplier: 1.3,
    description: 'Eco-friendly electric car ride',
  },
};

// Surge pricing thresholds
const SURGE_THRESHOLDS = {
  LOW_DEMAND: 1.0,      // Normal pricing
  MEDIUM_DEMAND: 1.25,  // 25% increase
  HIGH_DEMAND: 1.5,     // 50% increase
  PEAK_DEMAND: 2.0,     // 100% increase (double)
};

// Peak hours configuration (24-hour format)
const PEAK_HOURS = {
  MORNING: { start: 7, end: 9, multiplier: 1.25 },
  EVENING: { start: 17, end: 19, multiplier: 1.25 },
  LATE_NIGHT: { start: 22, end: 6, multiplier: 1.15 },
};

// ============================================
// Base Fare Calculation
// ============================================

/**
 * Get the base fare amount
 */
export function getBaseFare(): number {
  return BASE_PRICING.baseFare;
}

/**
 * Get the full pricing configuration
 */
export function getPricingConfig(): PricingConfig {
  return { ...BASE_PRICING };
}

/**
 * Update pricing configuration (for admin use)
 */
export function updatePricingConfig(updates: Partial<PricingConfig>): PricingConfig {
  Object.assign(BASE_PRICING, updates);
  return { ...BASE_PRICING };
}

// ============================================
// Distance-Based Pricing
// ============================================

/**
 * Calculate fare based on distance
 * 
 * @param distanceKm - Distance in kilometers
 * @returns Distance fare in UGX
 */
export function calculateDistanceFare(distanceKm: number): number {
  return Math.round(distanceKm * BASE_PRICING.pricePerKm);
}

/**
 * Get price per kilometer
 */
export function getPricePerKm(): number {
  return BASE_PRICING.pricePerKm;
}

// ============================================
// Time-Based Pricing
// ============================================

/**
 * Calculate fare based on travel time
 * 
 * @param minutes - Travel time in minutes
 * @returns Time fare in UGX
 */
export function calculateTimeFare(minutes: number): number {
  return Math.round(minutes * BASE_PRICING.pricePerMinute);
}

/**
 * Get price per minute
 */
export function getPricePerMinute(): number {
  return BASE_PRICING.pricePerMinute;
}

// ============================================
// Booking Fee
// ============================================

/**
 * Get the booking fee
 */
export function getBookingFee(): number {
  return BASE_PRICING.bookingFee;
}

// ============================================
// Vehicle Type Multipliers
// ============================================

/**
 * Get the multiplier for a vehicle type
 */
export function getVehicleMultiplier(vehicleType: VehicleType): number {
  return VEHICLE_MULTIPLIERS[vehicleType].multiplier;
}

/**
 * Get vehicle type information
 */
export function getVehicleInfo(vehicleType: VehicleType): VehicleMultiplier {
  return { ...VEHICLE_MULTIPLIERS[vehicleType] };
}

/**
 * Get all vehicle types with their multipliers
 */
export function getAllVehicleMultipliers(): Record<VehicleType, VehicleMultiplier> {
  const result: Record<VehicleType, VehicleMultiplier> = {} as Record<VehicleType, VehicleMultiplier>;
  for (const [key, value] of Object.entries(VEHICLE_MULTIPLIERS)) {
    result[key as VehicleType] = { ...value };
  }
  return result;
}

// ============================================
// Surge Pricing
// ============================================

/**
 * Calculate surge multiplier based on demand and time
 * 
 * @param demandRatio - Ratio of demand to supply (requests/available drivers)
 * @param currentTime - Current time (optional, defaults to now)
 * @returns Surge multiplier and reason
 */
export function calculateSurgeMultiplier(
  demandRatio: number,
  currentTime: Date = new Date()
): SurgeInfo {
  let multiplier = SURGE_THRESHOLDS.LOW_DEMAND;
  let reason = 'Normal pricing';
  
  // Check time-based surge
  const hour = currentTime.getHours();
  let timeSurge = 1.0;
  let timeReason = '';
  
  // Morning peak hours
  if (hour >= PEAK_HOURS.MORNING.start && hour < PEAK_HOURS.MORNING.end) {
    timeSurge = PEAK_HOURS.MORNING.multiplier;
    timeReason = 'Morning rush hour';
  }
  // Evening peak hours
  else if (hour >= PEAK_HOURS.EVENING.start && hour < PEAK_HOURS.EVENING.end) {
    timeSurge = PEAK_HOURS.EVENING.multiplier;
    timeReason = 'Evening rush hour';
  }
  // Late night surcharge
  else if (hour >= PEAK_HOURS.LATE_NIGHT.start || hour < PEAK_HOURS.LATE_NIGHT.end) {
    timeSurge = PEAK_HOURS.LATE_NIGHT.multiplier;
    timeReason = 'Late night surcharge';
  }
  
  // Check demand-based surge
  let demandSurge = SURGE_THRESHOLDS.LOW_DEMAND;
  let demandReason = '';
  
  if (demandRatio >= 3.0) {
    demandSurge = SURGE_THRESHOLDS.PEAK_DEMAND;
    demandReason = 'Extreme demand';
  } else if (demandRatio >= 2.0) {
    demandSurge = SURGE_THRESHOLDS.HIGH_DEMAND;
    demandReason = 'High demand';
  } else if (demandRatio >= 1.5) {
    demandSurge = SURGE_THRESHOLDS.MEDIUM_DEMAND;
    demandReason = 'Moderate demand';
  }
  
  // Use the higher of time-based or demand-based surge
  if (demandSurge > timeSurge) {
    multiplier = demandSurge;
    reason = demandReason;
  } else if (timeSurge > 1.0) {
    multiplier = timeSurge;
    reason = timeReason;
  }
  
  return {
    multiplier,
    reason,
    expiresAt: new Date(currentTime.getTime() + 30 * 60 * 1000), // Expires in 30 minutes
  };
}

/**
 * Get current surge info for a specific area (mock implementation)
 * In production, this would query real-time demand data
 */
export function getSurgeInfo(area?: string): SurgeInfo {
  // Mock: random demand ratio between 0.8 and 2.5
  const demandRatio = 0.8 + Math.random() * 1.7;
  return calculateSurgeMultiplier(demandRatio);
}

// ============================================
// Complete Fare Calculation
// ============================================

/**
 * Calculate complete fare breakdown
 * 
 * Fare Formula:
 * Fare = (Base Fare + (Distance × Price Per KM) + (Time × Price Per Minute) + Booking Fee) 
 *        × Vehicle Multiplier × Surge Multiplier
 * 
 * @param distanceKm - Distance in kilometers
 * @param durationMinutes - Estimated travel time in minutes
 * @param vehicleType - Type of vehicle
 * @param surgeMultiplier - Surge pricing multiplier (default: 1.0)
 * @returns Complete fare breakdown
 */
export function calculateFare(
  distanceKm: number,
  durationMinutes: number,
  vehicleType: VehicleType = 'economy',
  surgeMultiplier: number = 1.0
): FareBreakdown {
  // Calculate individual components
  const baseFare = BASE_PRICING.baseFare;
  const distanceFare = calculateDistanceFare(distanceKm);
  const timeFare = calculateTimeFare(durationMinutes);
  const bookingFee = BASE_PRICING.bookingFee;
  
  // Calculate subtotal before multipliers
  const subtotal = baseFare + distanceFare + timeFare + bookingFee;
  
  // Get vehicle multiplier
  const vehicleMult = getVehicleMultiplier(vehicleType);
  
  // Calculate total with multipliers
  let totalAmount = Math.round(subtotal * vehicleMult * surgeMultiplier);
  
  // Apply minimum fare
  totalAmount = Math.max(totalAmount, BASE_PRICING.minimumFare);
  
  return {
    baseFare,
    distanceFare,
    timeFare,
    bookingFee,
    subtotal,
    vehicleMultiplier: vehicleMult,
    surgeMultiplier,
    totalAmount,
    currency: 'UGX',
  };
}

/**
 * Calculate fare estimates for all vehicle types
 * 
 * @param distanceKm - Distance in kilometers
 * @param durationMinutes - Estimated travel time in minutes
 * @param surgeMultiplier - Surge pricing multiplier
 * @returns Fare estimates for all vehicle types
 */
export function calculateAllFares(
  distanceKm: number,
  durationMinutes: number,
  surgeMultiplier: number = 1.0
): Record<VehicleType, FareEstimate> {
  const estimates: Record<VehicleType, FareEstimate> = {} as Record<VehicleType, FareEstimate>;
  
  for (const vehicleType of Object.keys(VEHICLE_MULTIPLIERS) as VehicleType[]) {
    const breakdown = calculateFare(distanceKm, durationMinutes, vehicleType, surgeMultiplier);
    
    // Calculate min/max based on surge variance (±20% for estimate range)
    const minSurge = Math.max(1.0, surgeMultiplier - 0.2);
    const maxSurge = surgeMultiplier + 0.2;
    
    const minBreakdown = calculateFare(distanceKm, durationMinutes, vehicleType, minSurge);
    const maxBreakdown = calculateFare(distanceKm, durationMinutes, vehicleType, maxSurge);
    
    estimates[vehicleType] = {
      minFare: minBreakdown.totalAmount,
      maxFare: maxBreakdown.totalAmount,
      breakdown,
      vehicleType,
      distanceKm,
      durationMinutes,
    };
  }
  
  return estimates;
}

/**
 * Calculate fare with automatic surge detection
 * 
 * @param distanceKm - Distance in kilometers
 * @param durationMinutes - Estimated travel time in minutes
 * @param vehicleType - Type of vehicle
 * @param demandRatio - Current demand ratio (requests/available drivers)
 * @returns Fare estimate with surge info
 */
export function calculateFareWithSurge(
  distanceKm: number,
  durationMinutes: number,
  vehicleType: VehicleType = 'economy',
  demandRatio: number = 1.0
): { estimate: FareEstimate; surgeInfo: SurgeInfo } {
  const surgeInfo = calculateSurgeMultiplier(demandRatio);
  const breakdown = calculateFare(distanceKm, durationMinutes, vehicleType, surgeInfo.multiplier);
  
  // Calculate min/max estimate range
  const minBreakdown = calculateFare(distanceKm, durationMinutes, vehicleType, 1.0);
  const maxBreakdown = calculateFare(distanceKm, durationMinutes, vehicleType, surgeInfo.multiplier + 0.3);
  
  const estimate: FareEstimate = {
    minFare: minBreakdown.totalAmount,
    maxFare: maxBreakdown.totalAmount,
    breakdown,
    vehicleType,
    distanceKm,
    durationMinutes,
  };
  
  return { estimate, surgeInfo };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format fare amount for display
 */
export function formatFare(amount: number, currency: string = 'UGX'): string {
  return `${currency} ${amount.toLocaleString()}`;
}

/**
 * Calculate the difference between two fares
 */
export function compareFares(fare1: FareBreakdown, fare2: FareBreakdown): {
  difference: number;
  percentChange: number;
} {
  const difference = fare2.totalAmount - fare1.totalAmount;
  const percentChange = fare1.totalAmount > 0 
    ? Math.round((difference / fare1.totalAmount) * 100) 
    : 0;
  
  return { difference, percentChange };
}

/**
 * Check if a fare is within acceptable range
 */
export function isFareValid(fare: FareBreakdown): boolean {
  return (
    fare.totalAmount >= BASE_PRICING.minimumFare &&
    fare.totalAmount <= 1000000 && // Max 1 million UGX (safety check)
    fare.distanceFare >= 0 &&
    fare.timeFare >= 0 &&
    fare.surgeMultiplier >= 1.0 &&
    fare.surgeMultiplier <= 5.0 // Max 5x surge
  );
}

/**
 * Calculate driver earnings from a fare
 */
export function calculateDriverEarnings(
  fare: FareBreakdown,
  commissionPercent: number = 0.20
): {
  grossFare: number;
  platformCommission: number;
  driverEarnings: number;
} {
  const platformCommission = Math.round(fare.totalAmount * commissionPercent);
  const driverEarnings = fare.totalAmount - platformCommission;
  
  return {
    grossFare: fare.totalAmount,
    platformCommission,
    driverEarnings,
  };
}

/**
 * Get fare breakdown summary for receipts
 */
export function getFareSummary(fare: FareBreakdown): string[] {
  const lines: string[] = [];
  
  lines.push(`Base Fare: ${formatFare(fare.baseFare)}`);
  lines.push(`Distance Fare: ${formatFare(fare.distanceFare)}`);
  lines.push(`Time Fare: ${formatFare(fare.timeFare)}`);
  lines.push(`Booking Fee: ${formatFare(fare.bookingFee)}`);
  
  if (fare.vehicleMultiplier !== 1.0) {
    lines.push(`Vehicle Type Adjustment: ${fare.vehicleMultiplier}x`);
  }
  
  if (fare.surgeMultiplier > 1.0) {
    lines.push(`Surge Pricing: ${fare.surgeMultiplier}x`);
  }
  
  lines.push(`---`);
  lines.push(`Total: ${formatFare(fare.totalAmount)}`);
  
  return lines;
}

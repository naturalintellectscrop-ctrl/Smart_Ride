/**
 * Ride Pricing Utilities for Smart Ride
 * 
 * Pricing Formula:
 * Fare = Base Fare + (Distance × Price Per KM) + (Time × Price Per Minute) + Booking Fee
 */

export type VehicleType = 'smart_boda' | 'economy_car' | 'premium_car' | 'electric_vehicle';

export interface VehiclePricingConfig {
  id: VehicleType;
  name: string;
  description: string;
  icon: string;
  maxPassengers: number;
  multiplier: number;
  baseFare: number;
  pricePerKm: number;
  pricePerMinute: number;
  bookingFee: number;
  minFare: number;
  features: string[];
}

export interface RideDetails {
  pickup: string;
  pickupCoords?: { lat: number; lng: number };
  destination: string;
  destinationCoords?: { lat: number; lng: number };
  passengers: number;
  vehicleType: VehicleType;
  distanceKm: number;
  estimatedTimeMinutes: number;
  paymentMethod: string;
}

export interface PricingBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  subtotal: number;
  multiplierApplied: number;
  totalFare: number;
  formattedFare: string;
}

// Vehicle pricing configurations
export const VEHICLE_CONFIGS: Record<VehicleType, VehiclePricingConfig> = {
  smart_boda: {
    id: 'smart_boda',
    name: 'Smart Boda',
    description: 'Quick motorcycle rides',
    icon: 'Bike',
    maxPassengers: 1,
    multiplier: 0.7,
    baseFare: 2000,
    pricePerKm: 150,
    pricePerMinute: 50,
    bookingFee: 500,
    minFare: 3000,
    features: ['Fast arrival', 'Affordable', 'Ideal for short trips'],
  },
  economy_car: {
    id: 'economy_car',
    name: 'Economy Car',
    description: 'Affordable car rides',
    icon: 'Car',
    maxPassengers: 4,
    multiplier: 1.0,
    baseFare: 5000,
    pricePerKm: 300,
    pricePerMinute: 100,
    bookingFee: 1000,
    minFare: 8000,
    features: ['Comfortable', 'AC available', 'Budget-friendly'],
  },
  premium_car: {
    id: 'premium_car',
    name: 'Premium Car',
    description: 'Luxury car rides',
    icon: 'Crown',
    maxPassengers: 4,
    multiplier: 1.5,
    baseFare: 8000,
    pricePerKm: 500,
    pricePerMinute: 150,
    bookingFee: 1500,
    minFare: 15000,
    features: ['Luxury vehicle', 'Professional driver', 'Premium experience'],
  },
  electric_vehicle: {
    id: 'electric_vehicle',
    name: 'Electric Vehicle',
    description: 'Eco-friendly rides',
    icon: 'Zap',
    maxPassengers: 4,
    multiplier: 1.3,
    baseFare: 6000,
    pricePerKm: 400,
    pricePerMinute: 120,
    bookingFee: 1200,
    minFare: 10000,
    features: ['Zero emissions', 'Quiet ride', 'Modern vehicle'],
  },
};

/**
 * Get available vehicles based on passenger count
 */
export function getAvailableVehicles(passengers: number): VehicleType[] {
  if (passengers === 1) {
    // 1 passenger can use any vehicle
    return ['smart_boda', 'economy_car', 'premium_car', 'electric_vehicle'];
  } else if (passengers >= 2 && passengers <= 4) {
    // 2-4 passengers need a car
    return ['economy_car', 'premium_car', 'electric_vehicle'];
  } else if (passengers >= 5) {
    // 5+ passengers need XL (not implemented yet, fallback to premium)
    return ['premium_car'];
  }
  return ['economy_car'];
}

/**
 * Calculate fare for a ride
 */
export function calculateFare(
  vehicleType: VehicleType,
  distanceKm: number,
  estimatedTimeMinutes: number
): PricingBreakdown {
  const config = VEHICLE_CONFIGS[vehicleType];
  
  // Base fare calculation
  const baseFare = config.baseFare;
  const distanceFare = distanceKm * config.pricePerKm;
  const timeFare = estimatedTimeMinutes * config.pricePerMinute;
  const bookingFee = config.bookingFee;
  
  // Subtotal before multiplier
  const subtotal = baseFare + distanceFare + timeFare + bookingFee;
  
  // Apply vehicle multiplier
  const multiplierApplied = Math.round(subtotal * (config.multiplier - 1));
  
  // Total fare with multiplier applied
  let totalFare = subtotal + multiplierApplied;
  
  // Apply minimum fare
  totalFare = Math.max(totalFare, config.minFare);
  
  return {
    baseFare,
    distanceFare: Math.round(distanceFare),
    timeFare: Math.round(timeFare),
    bookingFee,
    subtotal: Math.round(subtotal),
    multiplierApplied,
    totalFare: Math.round(totalFare),
    formattedFare: formatCurrency(totalFare),
  };
}

/**
 * Calculate all vehicle fares at once
 */
export function calculateAllFares(
  distanceKm: number,
  estimatedTimeMinutes: number,
  passengers: number
): Record<VehicleType, PricingBreakdown | null> {
  const availableVehicles = getAvailableVehicles(passengers);
  
  return {
    smart_boda: availableVehicles.includes('smart_boda') 
      ? calculateFare('smart_boda', distanceKm, estimatedTimeMinutes) 
      : null,
    economy_car: availableVehicles.includes('economy_car') 
      ? calculateFare('economy_car', distanceKm, estimatedTimeMinutes) 
      : null,
    premium_car: availableVehicles.includes('premium_car') 
      ? calculateFare('premium_car', distanceKm, estimatedTimeMinutes) 
      : null,
    electric_vehicle: availableVehicles.includes('electric_vehicle') 
      ? calculateFare('electric_vehicle', distanceKm, estimatedTimeMinutes) 
      : null,
  };
}

/**
 * Estimate distance and time between two points (placeholder)
 * In production, this would use a mapping API like Google Maps
 */
export function estimateRoute(
  pickup: string,
  destination: string
): { distanceKm: number; estimatedTimeMinutes: number } {
  // Placeholder: generate reasonable estimates based on location names
  // In production, this would call a mapping API
  
  // Simulate distance based on string length (just for demo)
  const hash = (pickup + destination).length;
  const distanceKm = Math.max(2, Math.min(20, hash % 15 + 3));
  
  // Assume average speed of 25 km/h in city traffic
  const estimatedTimeMinutes = Math.round(distanceKm * 2.4);
  
  return {
    distanceKm,
    estimatedTimeMinutes,
  };
}

/**
 * Format currency in UGX
 */
export function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

/**
 * Get fare range for display (min - max)
 */
export function getFareRange(
  distanceKm: number,
  estimatedTimeMinutes: number,
  passengers: number
): { min: number; max: number; formatted: string } {
  const fares = calculateAllFares(distanceKm, estimatedTimeMinutes, passengers);
  const validFares = Object.values(fares).filter((f): f is PricingBreakdown => f !== null);
  
  if (validFares.length === 0) {
    return { min: 0, max: 0, formatted: 'N/A' };
  }
  
  const min = Math.min(...validFares.map(f => f.totalFare));
  const max = Math.max(...validFares.map(f => f.totalFare));
  
  return {
    min,
    max,
    formatted: min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`,
  };
}

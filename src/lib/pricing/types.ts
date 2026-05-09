// Smart Ride Pricing Engine Types
// Comprehensive pricing system for ride-hailing platform

// ============================================
// PRICING INPUT TYPES
// ============================================

export type RideType = 
  | 'ECONOMY'
  | 'STANDARD'
  | 'PREMIUM'
  | 'XL'
  | 'LUXURY'
  | 'BODA'        // Motorcycle
  | 'DELIVERY';   // For delivery services

export type TrafficCondition = 
  | 'LIGHT'
  | 'MODERATE'
  | 'HEAVY'
  | 'SEVERE';

export type WeatherCondition = 
  | 'CLEAR'
  | 'CLOUDY'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'STORM'
  | 'EXTREME_HEAT';

export type DayType = 
  | 'WEEKDAY'
  | 'WEEKEND'
  | 'HOLIDAY';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  zoneId?: string;  // For surge zone tracking
}

export interface PricingInput {
  // Locations
  pickupLocation: Location;
  dropoffLocation: Location;
  
  // Trip estimates
  estimatedDistanceKm: number;
  estimatedTimeMinutes: number;
  
  // Demand data
  currentDemandLevel: number;       // Number of ride requests in area
  availableDriversNearby: number;   // Number of available drivers
  demandZoneId?: string;            // Zone identifier for surge tracking
  
  // Conditions
  trafficCondition: TrafficCondition;
  weatherCondition: WeatherCondition;
  
  // Ride details
  rideType: RideType;
  
  // Timing
  timeOfDay: Date;
  dayOfWeek: number;  // 0-6 (Sunday-Saturday)
  isHoliday: boolean;
  
  // Service type
  serviceType?: 'RIDE' | 'FOOD_DELIVERY' | 'ITEM_DELIVERY' | 'HEALTH_DELIVERY';
}

// ============================================
// PRICING CONFIGURATION TYPES
// ============================================

export interface RideTypePricing {
  rideType: RideType;
  baseFare: number;
  perKilometerRate: number;
  perMinuteRate: number;
  minimumFare: number;
  cancellationFee: number;
  waitingFeePerMinute: number;
  
  // Multipliers
  peakHourMultiplier: number;
  nightMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  
  // Capacity
  maxPassengers: number;
  maxLuggagePieces: number;
  
  // Flags
  isActive: boolean;
  requiresPrepayment: boolean;
}

export interface SurgeConfig {
  enabled: boolean;
  updateIntervalSeconds: number;      // How often to update surge (30-60s)
  minDemandRatio: number;             // Minimum ratio to trigger surge
  maxSurgeMultiplier: number;         // Maximum surge cap (e.g., 3.0x)
  surgeStepSize: number;              // How much to increase per ratio step
  
  // Zone-specific surges
  zones: SurgeZoneConfig[];
}

export interface SurgeZoneConfig {
  zoneId: string;
  zoneName: string;
  currentMultiplier: number;
  demandRatio: number;
  lastUpdated: Date;
  isActive: boolean;
}

export interface TrafficMultiplier {
  condition: TrafficCondition;
  timeMultiplier: number;   // How much to increase time fare
  overallMultiplier: number; // Overall fare adjustment
}

export interface WeatherMultiplier {
  condition: WeatherCondition;
  multiplier: number;
  description: string;
}

export interface PeakHourConfig {
  enabled: boolean;
  
  // Morning peak
  morningStart: string;  // HH:MM format
  morningEnd: string;
  morningMultiplier: number;
  
  // Evening peak
  eveningStart: string;
  eveningEnd: string;
  eveningMultiplier: number;
  
  // Night hours
  nightStart: string;
  nightEnd: string;
  nightMultiplier: number;
}

export interface PricingConfig {
  currency: string;
  currencySymbol: string;
  decimalPlaces: number;
  
  // Default rates (can be overridden by ride type)
  defaultBaseFare: number;
  defaultPerKilometerRate: number;
  defaultPerMinuteRate: number;
  defaultMinimumFare: number;
  
  // Ride type specific pricing
  rideTypePricing: Record<RideType, RideTypePricing>;
  
  // Surge configuration
  surgeConfig: SurgeConfig;
  
  // Traffic multipliers
  trafficMultipliers: TrafficMultiplier[];
  
  // Weather multipliers
  weatherMultipliers: WeatherMultiplier[];
  
  // Peak hour configuration
  peakHourConfig: PeakHourConfig;
  
  // Service fee
  serviceFeePercent: number;
  serviceFeeMinimum: number;
  serviceFeeMaximum: number;
  
  // Taxes
  taxPercent: number;
  taxIncludedInFare: boolean;
  
  // Platform commission
  platformCommissionPercent: number;
  driverEarningsPercent: number;
  
  // Processing
  lastUpdated: Date;
  updatedBy?: string;
}

// ============================================
// PRICING OUTPUT TYPES
// ============================================

export interface FareBreakdown {
  // Base components
  baseFare: number;
  distanceCost: number;
  timeCost: number;
  
  // Adjustments
  surgeMultiplier: number;
  surgeAmount: number;
  
  peakMultiplier: number;
  peakAmount: number;
  
  trafficMultiplier: number;
  trafficAmount: number;
  
  weatherMultiplier: number;
  weatherAmount: number;
  
  nightMultiplier: number;
  nightAmount: number;
  
  // Fees
  serviceFee: number;
  taxAmount: number;
  
  // Totals
  subtotal: number;
  finalFare: number;
  minimumFareApplied: boolean;
  
  // Driver earnings
  driverEarnings: number;
  platformEarnings: number;
  
  // Metadata
  currency: string;
  calculationTimeMs: number;
  validUntil: Date;
}

export interface PricingResult {
  success: boolean;
  fareBreakdown: FareBreakdown;
  
  // Trip info
  estimatedDistanceKm: number;
  estimatedTimeMinutes: number;
  rideType: RideType;
  
  // Multiplier explanations
  surgeReason?: string;
  peakReason?: string;
  weatherReason?: string;
  
  // Zone info
  zoneId?: string;
  zoneSurgeActive: boolean;
  
  // Timestamps
  calculatedAt: Date;
  expiresAt: Date;  // Price valid for 5 minutes
  
  // Errors/warnings
  warnings?: string[];
  error?: string;
}

// ============================================
// SURGE PRICING TYPES
// ============================================

export interface SurgeStatus {
  globalMultiplier: number;
  activeZones: SurgeZoneStatus[];
  lastUpdate: Date;
  nextUpdate: Date;
}

export interface SurgeZoneStatus {
  zoneId: string;
  zoneName: string;
  multiplier: number;
  demandRatio: number;
  rideRequests: number;
  availableDrivers: number;
  isActive: boolean;
  isActive24h: boolean;
}

export interface DemandData {
  zoneId: string;
  timestamp: Date;
  rideRequests: number;
  availableDrivers: number;
  averageWaitTime: number;
  averageETA: number;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  currency: 'UGX',
  currencySymbol: 'USh',
  decimalPlaces: 0,
  
  defaultBaseFare: 2500,
  defaultPerKilometerRate: 800,
  defaultPerMinuteRate: 150,
  defaultMinimumFare: 5000,
  
  rideTypePricing: {
    ECONOMY: {
      rideType: 'ECONOMY',
      baseFare: 2000,
      perKilometerRate: 600,
      perMinuteRate: 100,
      minimumFare: 4000,
      cancellationFee: 2000,
      waitingFeePerMinute: 100,
      peakHourMultiplier: 1.2,
      nightMultiplier: 1.3,
      weekendMultiplier: 1.1,
      holidayMultiplier: 1.5,
      maxPassengers: 4,
      maxLuggagePieces: 2,
      isActive: true,
      requiresPrepayment: false,
    },
    STANDARD: {
      rideType: 'STANDARD',
      baseFare: 3000,
      perKilometerRate: 900,
      perMinuteRate: 150,
      minimumFare: 6000,
      cancellationFee: 3000,
      waitingFeePerMinute: 150,
      peakHourMultiplier: 1.3,
      nightMultiplier: 1.4,
      weekendMultiplier: 1.15,
      holidayMultiplier: 1.6,
      maxPassengers: 4,
      maxLuggagePieces: 3,
      isActive: true,
      requiresPrepayment: false,
    },
    PREMIUM: {
      rideType: 'PREMIUM',
      baseFare: 5000,
      perKilometerRate: 1500,
      perMinuteRate: 250,
      minimumFare: 10000,
      cancellationFee: 5000,
      waitingFeePerMinute: 200,
      peakHourMultiplier: 1.4,
      nightMultiplier: 1.5,
      weekendMultiplier: 1.2,
      holidayMultiplier: 1.8,
      maxPassengers: 4,
      maxLuggagePieces: 4,
      isActive: true,
      requiresPrepayment: false,
    },
    XL: {
      rideType: 'XL',
      baseFare: 6000,
      perKilometerRate: 1800,
      perMinuteRate: 300,
      minimumFare: 12000,
      cancellationFee: 6000,
      waitingFeePerMinute: 250,
      peakHourMultiplier: 1.3,
      nightMultiplier: 1.4,
      weekendMultiplier: 1.2,
      holidayMultiplier: 1.7,
      maxPassengers: 6,
      maxLuggagePieces: 6,
      isActive: true,
      requiresPrepayment: false,
    },
    LUXURY: {
      rideType: 'LUXURY',
      baseFare: 10000,
      perKilometerRate: 2500,
      perMinuteRate: 400,
      minimumFare: 20000,
      cancellationFee: 10000,
      waitingFeePerMinute: 300,
      peakHourMultiplier: 1.5,
      nightMultiplier: 1.6,
      weekendMultiplier: 1.25,
      holidayMultiplier: 2.0,
      maxPassengers: 4,
      maxLuggagePieces: 4,
      isActive: true,
      requiresPrepayment: true,
    },
    BODA: {
      rideType: 'BODA',
      baseFare: 1500,
      perKilometerRate: 500,
      perMinuteRate: 80,
      minimumFare: 2500,
      cancellationFee: 1000,
      waitingFeePerMinute: 50,
      peakHourMultiplier: 1.2,
      nightMultiplier: 1.2,
      weekendMultiplier: 1.1,
      holidayMultiplier: 1.4,
      maxPassengers: 1,
      maxLuggagePieces: 1,
      isActive: true,
      requiresPrepayment: false,
    },
    DELIVERY: {
      rideType: 'DELIVERY',
      baseFare: 2000,
      perKilometerRate: 400,
      perMinuteRate: 50,
      minimumFare: 3000,
      cancellationFee: 1500,
      waitingFeePerMinute: 100,
      peakHourMultiplier: 1.15,
      nightMultiplier: 1.2,
      weekendMultiplier: 1.1,
      holidayMultiplier: 1.3,
      maxPassengers: 0,
      maxLuggagePieces: 10,
      isActive: true,
      requiresPrepayment: false,
    },
  },
  
  surgeConfig: {
    enabled: true,
    updateIntervalSeconds: 45,
    minDemandRatio: 1.0,
    maxSurgeMultiplier: 3.0,
    surgeStepSize: 0.2,
    zones: [],
  },
  
  trafficMultipliers: [
    { condition: 'LIGHT', timeMultiplier: 1.0, overallMultiplier: 1.0 },
    { condition: 'MODERATE', timeMultiplier: 1.1, overallMultiplier: 1.05 },
    { condition: 'HEAVY', timeMultiplier: 1.25, overallMultiplier: 1.1 },
    { condition: 'SEVERE', timeMultiplier: 1.5, overallMultiplier: 1.2 },
  ],
  
  weatherMultipliers: [
    { condition: 'CLEAR', multiplier: 1.0, description: 'Clear weather' },
    { condition: 'CLOUDY', multiplier: 1.0, description: 'Cloudy' },
    { condition: 'RAIN', multiplier: 1.1, description: 'Light rain' },
    { condition: 'HEAVY_RAIN', multiplier: 1.25, description: 'Heavy rain' },
    { condition: 'STORM', multiplier: 1.5, description: 'Storm conditions' },
    { condition: 'EXTREME_HEAT', multiplier: 1.15, description: 'Extreme heat' },
  ],
  
  peakHourConfig: {
    enabled: true,
    morningStart: '07:00',
    morningEnd: '09:00',
    morningMultiplier: 1.3,
    eveningStart: '17:00',
    eveningEnd: '20:00',
    eveningMultiplier: 1.4,
    nightStart: '22:00',
    nightEnd: '05:00',
    nightMultiplier: 1.25,
  },
  
  serviceFeePercent: 5,
  serviceFeeMinimum: 200,
  serviceFeeMaximum: 5000,
  
  taxPercent: 18,  // VAT
  taxIncludedInFare: true,
  
  platformCommissionPercent: 20,
  driverEarningsPercent: 80,
  
  lastUpdated: new Date(),
};

// ============================================
// TIME CONSTANTS
// ============================================

export const PRICING_CONSTANTS = {
  // Price validity duration (5 minutes)
  PRICE_VALIDITY_MINUTES: 5,
  
  // Surge update interval range
  SURGE_UPDATE_MIN_SECONDS: 30,
  SURGE_UPDATE_MAX_SECONDS: 60,
  
  // Maximum response time
  MAX_RESPONSE_TIME_MS: 200,
  
  // Surge limits
  MAX_SURGE_MULTIPLIER: 3.0,
  MIN_SURGE_MULTIPLIER: 1.0,
  
  // Demand thresholds
  LOW_DEMAND_RATIO: 0.5,
  HIGH_DEMAND_RATIO: 2.0,
  CRITICAL_DEMAND_RATIO: 3.0,
};

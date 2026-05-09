// Marketplace Balance System Types
// Core types for demand-supply balancing, surge pricing, and incentives

// ============================================
// CORE METRICS
// ============================================

export interface DemandSupplyMetrics {
  zoneId: string;
  zoneName: string;
  recordedAt: Date;
  
  // Demand
  rideRequests: number;
  uniqueRequesters: number;
  avgWaitTimeSeconds: number | null;
  cancellationRate: number | null;
  
  // Supply
  activeDrivers: number;
  availableDrivers: number;
  busyDrivers: number;
  driverAcceptanceRate: number | null;
  
  // Calculated
  demandSupplyRatio: number;
  balanceStatus: BalanceStatus;
}

export type BalanceStatus = 
  | 'OVERSUPPLIED'
  | 'BALANCED'
  | 'HIGH_DEMAND'
  | 'SURGE'
  | 'CRITICAL';

export interface ZoneMetric extends DemandSupplyMetrics {
  surgeMultiplier: number;
  surgeActive: boolean;
  weatherCondition: string | null;
  trafficLevel: string | null;
  predictedDemand: number | null;
  predictedSupply: number | null;
  predictedRatio: number | null;
}

// ============================================
// ZONE DEFINITIONS
// ============================================

export interface GeographicZone {
  id: string;
  name: string;
  code: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  zoneType: ZoneType;
  priority: number;
  isActive: boolean;
}

export type ZoneType = 
  | 'URBAN'
  | 'SUBURBAN'
  | 'RURAL'
  | 'AIRPORT'
  | 'COMMERCIAL'
  | 'ENTERTAINMENT'
  | 'RESIDENTIAL'
  | 'INDUSTRIAL';

// ============================================
// SURGE PRICING
// ============================================

export interface SurgeConfig {
  minRatio: number;              // Minimum ratio to trigger surge
  maxMultiplier: number;         // Maximum surge multiplier (e.g., 3.0)
  minMultiplier: number;         // Minimum surge multiplier (e.g., 1.2)
  ratioPerIncrement: number;     // Ratio increase per 0.1 multiplier increment
  cooldownMinutes: number;       // Minutes between surge changes
  endThreshold: number;          // Ratio below which surge ends
}

export const DEFAULT_SURGE_CONFIG: SurgeConfig = {
  minRatio: 1.3,
  maxMultiplier: 3.0,
  minMultiplier: 1.2,
  ratioPerIncrement: 0.15,
  cooldownMinutes: 5,
  endThreshold: 1.1,
};

export interface SurgeState {
  zoneId: string;
  active: boolean;
  multiplier: number;
  startedAt: Date | null;
  triggerRatio: number;
}

// ============================================
// DRIVER INCENTIVES
// ============================================

export interface DriverIncentive {
  id: string;
  name: string;
  description: string;
  incentiveType: IncentiveType;
  
  rewardAmount: number;
  rewardType: RewardType;
  
  minRides: number | null;
  minEarnings: number | null;
  targetHours: number | null;
  
  startTime: Date;
  endTime: Date;
  
  status: IncentiveStatus;
}

export type IncentiveType = 
  | 'PEAK_HOUR_BONUS'
  | 'RIDE_STREAK'
  | 'ZONE_SPECIFIC'
  | 'GUARANTEED_EARNINGS'
  | 'FIRST_RIDE_BONUS'
  | 'REFERRAL_BONUS'
  | 'COMPLETION_BONUS'
  | 'QUALITY_BONUS';

export type RewardType = 'CASH' | 'CREDIT' | 'BONUS';

export type IncentiveStatus = 
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

// ============================================
// RIDER PROMOTIONS
// ============================================

export interface RiderPromotion {
  id: string;
  name: string;
  description: string;
  promoCode: string;
  promotionType: PromotionType;
  
  discountPercent: number | null;
  discountAmount: number | null;
  maxDiscount: number | null;
  
  startTime: Date;
  endTime: Date;
  
  status: PromotionStatus;
}

export type PromotionType = 
  | 'PERCENT_DISCOUNT'
  | 'FIXED_DISCOUNT'
  | 'FREE_DELIVERY'
  | 'CASHBACK'
  | 'FIRST_RIDE_FREE'
  | 'REFERRAL_DISCOUNT';

export type PromotionStatus = 
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

// ============================================
// DRIVER NOTIFICATIONS
// ============================================

export interface DriverZoneNotification {
  id: string;
  zoneId: string;
  zoneName: string;
  title: string;
  message: string;
  notificationType: DriverNotificationType;
  incentiveAmount: number | null;
  sentAt: Date;
  expiresAt: Date | null;
}

export type DriverNotificationType = 
  | 'HIGH_DEMAND'
  | 'SURGE_ACTIVE'
  | 'INCENTIVE_AVAILABLE'
  | 'REPOSITION'
  | 'EARNINGS_OPPORTUNITY';

// ============================================
// DASHBOARD STATS
// ============================================

export interface MarketplaceDashboardStats {
  recordedAt: Date;
  
  // Overall
  totalRideRequests: number;
  totalActiveDrivers: number;
  overallRatio: number;
  
  // Zone Distribution
  oversuppliedZones: number;
  balancedZones: number;
  highDemandZones: number;
  surgeZones: number;
  criticalZones: number;
  
  // Active Programs
  activeSurges: number;
  activeIncentives: number;
  activePromotions: number;
  
  // Performance
  avgWaitTime: number | null;
  avgCompletionRate: number | null;
  avgDriverUtilization: number | null;
  
  // Revenue
  normalRevenue: number | null;
  surgeRevenue: number | null;
  incentiveCost: number | null;
}

// ============================================
// HEATMAP DATA
// ============================================

export interface HeatmapZone {
  zoneId: string;
  zoneName: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  
  // Heat intensity (0-100)
  demandIntensity: number;
  supplyIntensity: number;
  balanceIntensity: number;
  
  // Status
  status: BalanceStatus;
  surgeActive: boolean;
  surgeMultiplier: number;
  
  // Metrics
  rideRequests: number;
  availableDrivers: number;
  ratio: number;
}

export interface HeatmapData {
  zones: HeatmapZone[];
  lastUpdated: Date;
  refreshInterval: number; // seconds
}

// ============================================
// AUTOMATED RESPONSES
// ============================================

export interface BalanceAction {
  type: 'SURGE_START' | 'SURGE_END' | 'SURGE_UPDATE' | 
        'INCENTIVE_TRIGGER' | 'NOTIFICATION_SEND' | 
        'PROMOTION_TRIGGER';
  zoneId: string;
  reason: string;
  data: Record<string, unknown>;
  triggeredAt: Date;
}

export interface SurgeAction extends BalanceAction {
  type: 'SURGE_START' | 'SURGE_END' | 'SURGE_UPDATE';
  data: {
    oldMultiplier: number;
    newMultiplier: number;
    ratio: number;
  };
}

export interface IncentiveAction extends BalanceAction {
  type: 'INCENTIVE_TRIGGER';
  data: {
    incentiveType: IncentiveType;
    amount: number;
    targetZones: string[];
  };
}

// ============================================
// TIME PERIODS
// ============================================

export interface TimeBucket {
  date: string;        // YYYY-MM-DD
  hour: number;        // 0-23
  dayOfWeek: number;   // 0-6 (Sunday-Saturday)
  isWeekend: boolean;
  isPeakHour: boolean;
}

export const PEAK_HOURS = {
  morning: { start: 7, end: 9 },    // 7AM - 9AM
  evening: { start: 17, end: 20 },  // 5PM - 8PM
  night: { start: 22, end: 24 },    // 10PM - 12AM
};

export function isPeakHour(hour: number): boolean {
  return (
    (hour >= PEAK_HOURS.morning.start && hour < PEAK_HOURS.morning.end) ||
    (hour >= PEAK_HOURS.evening.start && hour < PEAK_HOURS.evening.end) ||
    (hour >= PEAK_HOURS.night.start && hour < PEAK_HOURS.night.end)
  );
}

export function getTimeBucket(date: Date = new Date()): TimeBucket {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  
  return {
    date: date.toISOString().split('T')[0],
    hour,
    dayOfWeek,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isPeakHour: isPeakHour(hour),
  };
}

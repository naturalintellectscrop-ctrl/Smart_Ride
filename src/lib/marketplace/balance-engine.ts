// Marketplace Balance Engine
// Core logic for demand-supply balance calculation and automated responses

import { 
  BalanceStatus, 
  SurgeConfig, 
  BalanceAction,
  TimeBucket,
  getTimeBucket,
  DEFAULT_SURGE_CONFIG as SURGE_CONFIG
} from './types';

// Re-export DEFAULT_SURGE_CONFIG for backwards compatibility
export { DEFAULT_SURGE_CONFIG } from './types';

// ============================================
// RATIO CALCULATION
// ============================================

/**
 * Calculate demand-supply ratio
 * Ratio = ride_requests / available_drivers
 */
export function calculateDemandSupplyRatio(
  rideRequests: number,
  availableDrivers: number
): number {
  if (availableDrivers === 0) {
    // No drivers available - maximum demand signal
    return rideRequests > 0 ? 999 : 0;
  }
  return rideRequests / availableDrivers;
}

/**
 * Calculate demand-supply ratio (alias for backwards compatibility)
 */
export const demandSupplyRatio = calculateDemandSupplyRatio;

/**
 * Determine balance status from ratio
 */
export function getBalanceStatus(ratio: number): BalanceStatus {
  if (ratio < 0.5) return 'OVERSUPPLIED';
  if (ratio < 0.8) return 'BALANCED';
  if (ratio < 1.3) return 'BALANCED';
  if (ratio < 1.8) return 'HIGH_DEMAND';
  if (ratio < 2.5) return 'SURGE';
  return 'CRITICAL';
}

/**
 * Get balance status color for UI
 */
export function getBalanceStatusColor(status: BalanceStatus): string {
  switch (status) {
    case 'OVERSUPPLIED': return 'bg-blue-500';
    case 'BALANCED': return 'bg-emerald-500';
    case 'HIGH_DEMAND': return 'bg-amber-500';
    case 'SURGE': return 'bg-orange-500';
    case 'CRITICAL': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

/**
 * Get balance status background color for UI
 */
export function getBalanceStatusBgColor(status: BalanceStatus): string {
  switch (status) {
    case 'OVERSUPPLIED': return 'bg-blue-50 border-blue-200 text-blue-700';
    case 'BALANCED': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    case 'HIGH_DEMAND': return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'SURGE': return 'bg-orange-50 border-orange-200 text-orange-700';
    case 'CRITICAL': return 'bg-red-50 border-red-200 text-red-700';
    default: return 'bg-gray-50 border-gray-200 text-gray-700';
  }
}

/**
 * Get balance status label
 */
export function getBalanceStatusLabel(status: BalanceStatus): string {
  switch (status) {
    case 'OVERSUPPLIED': return 'Driver Oversupply';
    case 'BALANCED': return 'Balanced';
    case 'HIGH_DEMAND': return 'High Demand';
    case 'SURGE': return 'Surge Active';
    case 'CRITICAL': return 'Critical Shortage';
    default: return 'Unknown';
  }
}

// ============================================
// SURGE PRICING CALCULATION
// ============================================

/**
 * Calculate surge multiplier from demand-supply ratio
 */
export function calculateSurgeMultiplier(
  ratio: number,
  config: SurgeConfig = SURGE_CONFIG
): number {
  // No surge if ratio below threshold
  if (ratio < config.minRatio) {
    return 1.0;
  }
  
  // Calculate multiplier based on how much ratio exceeds threshold
  const excessRatio = ratio - config.minRatio;
  const increments = Math.floor(excessRatio / config.ratioPerIncrement);
  const multiplier = config.minMultiplier + (increments * 0.1);
  
  // Cap at maximum
  return Math.min(multiplier, config.maxMultiplier);
}

/**
 * Determine if surge should start
 */
export function shouldStartSurge(
  ratio: number,
  currentSurgeActive: boolean,
  config: SurgeConfig = SURGE_CONFIG
): boolean {
  return !currentSurgeActive && ratio >= config.minRatio;
}

/**
 * Determine if surge should end
 */
export function shouldEndSurge(
  ratio: number,
  config: SurgeConfig = SURGE_CONFIG
): boolean {
  return ratio < config.endThreshold;
}

/**
 * Format surge multiplier for display
 */
export function formatSurgeMultiplier(multiplier: number): string {
  if (multiplier <= 1.0) return 'No Surge';
  return `${multiplier.toFixed(1)}x Surge`;
}

// ============================================
// AUTOMATED RESPONSE GENERATION
// ============================================

/**
 * Generate recommended actions based on balance status
 */
export function generateBalanceActions(
  zoneId: string,
  zoneName: string,
  ratio: number,
  currentSurgeMultiplier: number,
  config: SurgeConfig = SURGE_CONFIG
): BalanceAction[] {
  const actions: BalanceAction[] = [];
  const status = getBalanceStatus(ratio);
  const now = new Date();
  
  switch (status) {
    case 'CRITICAL':
      // Critical: Maximum surge + send driver notifications + trigger incentives
      actions.push({
        type: 'SURGE_UPDATE',
        zoneId,
        reason: `Critical shortage: ratio ${ratio.toFixed(2)}`,
        data: {
          oldMultiplier: currentSurgeMultiplier,
          newMultiplier: config.maxMultiplier,
          ratio,
        },
        triggeredAt: now,
      });
      actions.push({
        type: 'NOTIFICATION_SEND',
        zoneId,
        reason: 'Critical driver shortage - broadcast to all nearby drivers',
        data: {
          notificationType: 'HIGH_DEMAND',
          message: `🔥 Critical demand in ${zoneName}! Move there for maximum earnings.`,
          incentiveAmount: 5000, // 5,000 UGX bonus incentive
        },
        triggeredAt: now,
      });
      actions.push({
        type: 'INCENTIVE_TRIGGER',
        zoneId,
        reason: 'Critical zone - trigger zone-specific incentive',
        data: {
          incentiveType: 'ZONE_SPECIFIC',
          amount: 10000, // 10,000 UGX
          targetZones: [zoneId],
        },
        triggeredAt: now,
      });
      break;
      
    case 'SURGE':
      // Surge: Increase surge pricing + notify drivers
      const surgeMultiplier = calculateSurgeMultiplier(ratio, config);
      if (surgeMultiplier > currentSurgeMultiplier) {
        actions.push({
          type: 'SURGE_UPDATE',
          zoneId,
          reason: `High demand: ratio ${ratio.toFixed(2)}`,
          data: {
            oldMultiplier: currentSurgeMultiplier,
            newMultiplier: surgeMultiplier,
            ratio,
          },
          triggeredAt: now,
        });
      }
      actions.push({
        type: 'NOTIFICATION_SEND',
        zoneId,
        reason: 'Surge pricing active - notify drivers',
        data: {
          notificationType: 'SURGE_ACTIVE',
          message: `⚡ Surge ${surgeMultiplier.toFixed(1)}x active in ${zoneName}!`,
          incentiveAmount: null,
        },
        triggeredAt: now,
      });
      break;
      
    case 'HIGH_DEMAND':
      // High Demand: Start low surge if not active, or notify drivers
      if (currentSurgeMultiplier < config.minMultiplier && ratio >= config.minRatio) {
        actions.push({
          type: 'SURGE_START',
          zoneId,
          reason: `Demand exceeding supply: ratio ${ratio.toFixed(2)}`,
          data: {
            oldMultiplier: 1.0,
            newMultiplier: config.minMultiplier,
            ratio,
          },
          triggeredAt: now,
        });
      }
      actions.push({
        type: 'NOTIFICATION_SEND',
        zoneId,
        reason: 'High demand zone - suggest driver repositioning',
        data: {
          notificationType: 'REPOSITION',
          message: `📍 High demand in ${zoneName}. Consider moving there for more rides.`,
          incentiveAmount: null,
        },
        triggeredAt: now,
      });
      break;
      
    case 'BALANCED':
      // Balanced: End surge if active and ratio low enough
      if (currentSurgeMultiplier > 1.0 && ratio < config.endThreshold) {
        actions.push({
          type: 'SURGE_END',
          zoneId,
          reason: 'Marketplace balanced',
          data: {
            oldMultiplier: currentSurgeMultiplier,
            newMultiplier: 1.0,
            ratio,
          },
          triggeredAt: now,
        });
      }
      break;
      
    case 'OVERSUPPLIED':
      // Oversupplied: End surge, trigger rider promotions
      if (currentSurgeMultiplier > 1.0) {
        actions.push({
          type: 'SURGE_END',
          zoneId,
          reason: 'Driver oversupply - ending surge',
          data: {
            oldMultiplier: currentSurgeMultiplier,
            newMultiplier: 1.0,
            ratio,
          },
          triggeredAt: now,
        });
      }
      // Only trigger promotion if significantly oversupplied
      if (ratio < 0.5) {
        actions.push({
          type: 'PROMOTION_TRIGGER',
          zoneId,
          reason: 'Low demand - stimulate with promotion',
          data: {
            discountPercent: 10,
            targetZones: [zoneId],
            message: '10% off rides in your area!',
          },
          triggeredAt: now,
        });
      }
      break;
  }
  
  return actions;
}

// ============================================
// HEATMAP INTENSITY CALCULATION
// ============================================

/**
 * Calculate heatmap intensity (0-100) for demand
 */
export function calculateDemandIntensity(
  rideRequests: number,
  maxRequests: number = 50
): number {
  return Math.min(100, Math.round((rideRequests / maxRequests) * 100));
}

/**
 * Calculate heatmap intensity (0-100) for supply
 */
export function calculateSupplyIntensity(
  availableDrivers: number,
  maxDrivers: number = 20
): number {
  return Math.min(100, Math.round((availableDrivers / maxDrivers) * 100));
}

/**
 * Calculate balance intensity for heatmap
 * High intensity = imbalanced (either too much demand or supply)
 */
export function calculateBalanceIntensity(ratio: number): number {
  // Perfect balance at ratio 1.0 = intensity 0
  // Imbalance in either direction = higher intensity
  const deviation = Math.abs(ratio - 1);
  return Math.min(100, Math.round(deviation * 50));
}

// ============================================
// DRIVER UTILIZATION
// ============================================

/**
 * Calculate driver utilization rate
 * Utilization = (busy drivers / total active drivers) * 100
 */
export function calculateDriverUtilization(
  busyDrivers: number,
  activeDrivers: number
): number {
  if (activeDrivers === 0) return 0;
  return (busyDrivers / activeDrivers) * 100;
}

/**
 * Get driver utilization status
 */
export function getUtilizationStatus(utilization: number): string {
  if (utilization < 30) return 'Underutilized';
  if (utilization < 50) return 'Low Activity';
  if (utilization < 70) return 'Moderate';
  if (utilization < 85) return 'Optimal';
  return 'High Demand';
}

// ============================================
// ESTIMATED WAIT TIME
// ============================================

/**
 * Estimate rider wait time based on ratio and zone
 */
export function estimateWaitTime(
  ratio: number,
  avgWaitTimeSeconds: number | null,
  baselineSeconds: number = 300 // 5 minutes baseline
): number {
  if (avgWaitTimeSeconds) {
    // Use actual average if available, adjusted by current ratio
    return Math.round(avgWaitTimeSeconds * Math.max(1, ratio));
  }
  
  // Estimate based on ratio
  if (ratio < 0.5) return baselineSeconds * 0.5;      // 2.5 min
  if (ratio < 1.0) return baselineSeconds * 0.75;     // 3.75 min
  if (ratio < 1.5) return baselineSeconds;            // 5 min
  if (ratio < 2.0) return baselineSeconds * 1.5;      // 7.5 min
  if (ratio < 3.0) return baselineSeconds * 2;        // 10 min
  return baselineSeconds * 3;                          // 15+ min
}

/**
 * Format wait time for display
 */
export function formatWaitTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// ============================================
// ZONE PRIORITY SCORING
// ============================================

/**
 * Calculate priority score for zone (higher = needs more attention)
 */
export function calculateZonePriority(
  ratio: number,
  zonePriority: number,
  timeBucket: TimeBucket = getTimeBucket()
): number {
  let score = 0;
  
  // Base score from ratio deviation
  score += Math.abs(ratio - 1) * 20;
  
  // Zone priority multiplier
  score *= zonePriority;
  
  // Peak hour bonus
  if (timeBucket.isPeakHour) {
    score *= 1.3;
  }
  
  // Weekend adjustment
  if (timeBucket.isWeekend) {
    score *= 1.1;
  }
  
  return Math.round(score);
}

// ============================================
// REVENUE PROJECTIONS
// ============================================

/**
 * Project surge revenue impact
 */
export function projectSurgeRevenue(
  baseFare: number,
  surgeMultiplier: number,
  estimatedRides: number
): {
  normalRevenue: number;
  surgeRevenue: number;
  additionalRevenue: number;
} {
  const normalRevenue = baseFare * estimatedRides;
  const surgeRevenue = baseFare * surgeMultiplier * estimatedRides;
  const additionalRevenue = surgeRevenue - normalRevenue;
  
  return {
    normalRevenue: Math.round(normalRevenue),
    surgeRevenue: Math.round(surgeRevenue),
    additionalRevenue: Math.round(additionalRevenue),
  };
}

/**
 * Calculate incentive ROI
 */
export function calculateIncentiveROI(
  incentiveCost: number,
  additionalRides: number,
  avgFare: number,
  platformCommission: number = 0.15
): {
  revenue: number;
  cost: number;
  netBenefit: number;
  roi: number;
} {
  const revenue = additionalRides * avgFare * platformCommission;
  const netBenefit = revenue - incentiveCost;
  const roi = incentiveCost > 0 ? (netBenefit / incentiveCost) * 100 : 0;
  
  return {
    revenue: Math.round(revenue),
    cost: incentiveCost,
    netBenefit: Math.round(netBenefit),
    roi: Math.round(roi),
  };
}

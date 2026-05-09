// Smart Ride Traffic Intelligence System
// Real-time traffic monitoring, analysis, and prediction

import {
  TrafficData,
  TrafficIncident,
  TrafficSignal,
  CongestionLevel,
  Coordinate,
  RoadSegment,
  EnvironmentalData,
  WeatherCondition,
  HistoricalTraffic,
  IncidentType,
} from './types';

// ============================================
// TRAFFIC STORES (Use Redis in Production)
// ============================================

// Real-time traffic data by segment
const trafficStore = new Map<string, TrafficData>();

// Active incidents
const incidentStore = new Map<string, TrafficIncident>();

// Traffic signals
const signalStore = new Map<string, TrafficSignal>();

// Historical traffic patterns
const historicalStore = new Map<string, HistoricalTraffic>();

// Zone-level traffic summary
const zoneTraffic = new Map<string, {
  averageSpeed: number;
  congestionLevel: CongestionLevel;
  incidentCount: number;
  lastUpdated: Date;
}>();

// Traffic update subscribers
const trafficSubscribers = new Map<string, Set<(data: TrafficData) => void>>();

// ============================================
// TRAFFIC DATA COLLECTION
// ============================================

/**
 * Update traffic data for a road segment
 */
export function updateTrafficData(
  segmentId: string,
  data: {
    currentSpeedKmh: number;
    freeFlowSpeedKmh: number;
    vehicleCount?: number;
  }
): TrafficData {
  const congestionScore = data.currentSpeedKmh / data.freeFlowSpeedKmh;
  const congestionLevel = getCongestionLevelFromScore(congestionScore);

  const delaySeconds = calculateDelay(
    data.freeFlowSpeedKmh,
    data.currentSpeedKmh,
    data.vehicleCount || 0
  );

  const trafficData: TrafficData = {
    segmentId,
    timestamp: new Date(),
    currentSpeedKmh: data.currentSpeedKmh,
    freeFlowSpeedKmh: data.freeFlowSpeedKmh,
    averageSpeedKmh: data.currentSpeedKmh,
    congestionLevel,
    congestionScore,
    vehicleCount: data.vehicleCount,
    delaySeconds,
    delayFactor: delaySeconds > 0 ? 1 + delaySeconds / 60 : 1,
  };

  trafficStore.set(segmentId, trafficData);

  // Notify subscribers
  notifySubscribers(segmentId, trafficData);

  // Update zone summary
  updateZoneTraffic(segmentId);

  return trafficData;
}

/**
 * Process GPS probe data from drivers
 */
export function processGPSProbe(
  driverId: string,
  location: Coordinate,
  speed: number,
  heading: number,
  segmentIds: string[]
): void {
  for (const segmentId of segmentIds) {
    const existing = trafficStore.get(segmentId);
    
    if (existing) {
      // Update with weighted average
      const newSpeed = existing.vehicleCount && existing.vehicleCount > 0
        ? (existing.currentSpeedKmh * existing.vehicleCount + speed) / (existing.vehicleCount + 1)
        : speed;

      updateTrafficData(segmentId, {
        currentSpeedKmh: newSpeed,
        freeFlowSpeedKmh: existing.freeFlowSpeedKmh,
        vehicleCount: (existing.vehicleCount || 0) + 1,
      });
    }
  }
}

/**
 * Get traffic data for a segment
 */
export function getTrafficData(segmentId: string): TrafficData | undefined {
  return trafficStore.get(segmentId);
}

/**
 * Get all traffic data
 */
export function getAllTrafficData(): TrafficData[] {
  return Array.from(trafficStore.values());
}

/**
 * Get traffic data for multiple segments
 */
export function getTrafficForSegments(segmentIds: string[]): Map<string, TrafficData> {
  const result = new Map<string, TrafficData>();
  for (const id of segmentIds) {
    const data = trafficStore.get(id);
    if (data) {
      result.set(id, data);
    }
  }
  return result;
}

// ============================================
// CONGESTION CALCULATION
// ============================================

/**
 * Determine congestion level from score
 */
function getCongestionLevelFromScore(score: number): CongestionLevel {
  if (score >= 0.9) return 'FREE_FLOW';
  if (score >= 0.7) return 'LIGHT';
  if (score >= 0.5) return 'MODERATE';
  if (score >= 0.3) return 'HEAVY';
  if (score >= 0.15) return 'SEVERE';
  return 'GRIDLOCK';
}

/**
 * Calculate delay in seconds
 */
function calculateDelay(
  freeFlowSpeed: number,
  currentSpeed: number,
  vehicleCount: number
): number {
  if (currentSpeed <= 0) return 3600; // 1 hour for stopped traffic

  const speedRatio = currentSpeed / freeFlowSpeed;
  if (speedRatio >= 1) return 0; // No delay

  // Delay increases exponentially as speed drops
  const delayFactor = Math.pow((1 - speedRatio), 2);
  return Math.round(delayFactor * 300); // Max 5 minutes per segment
}

/**
 * Calculate overall congestion score for an area
 */
export function calculateAreaCongestion(
  segmentIds: string[]
): { score: number; level: CongestionLevel; avgSpeed: number } {
  let totalScore = 0;
  let totalSpeed = 0;
  let count = 0;

  for (const id of segmentIds) {
    const data = trafficStore.get(id);
    if (data) {
      totalScore += data.congestionScore;
      totalSpeed += data.currentSpeedKmh;
      count++;
    }
  }

  if (count === 0) {
    return { score: 1, level: 'FREE_FLOW', avgSpeed: 60 };
  }

  const avgScore = totalScore / count;
  const avgSpeed = totalSpeed / count;

  return {
    score: avgScore,
    level: getCongestionLevelFromScore(avgScore),
    avgSpeed,
  };
}

// ============================================
// INCIDENT MANAGEMENT
// ============================================

/**
 * Report a new traffic incident
 */
export function reportIncident(
  incident: Omit<TrafficIncident, 'id' | 'reportedAt' | 'isActive' | 'isVerified'>
): TrafficIncident {
  const id = `INC${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const newIncident: TrafficIncident = {
    ...incident,
    id,
    reportedAt: new Date(),
    isActive: true,
    isVerified: false,
  };

  incidentStore.set(id, newIncident);

  // Update affected segments
  for (const segmentId of incident.affectedSegments) {
    const traffic = trafficStore.get(segmentId);
    if (traffic) {
      // Add incident delay
      const incidentDelay = getIncidentDelay(incident.severity);
      traffic.delaySeconds += incidentDelay;
      traffic.congestionScore = Math.max(0, traffic.congestionScore - 0.3);
      traffic.congestionLevel = getCongestionLevelFromScore(traffic.congestionScore);
    }
  }

  return newIncident;
}

/**
 * Verify an incident report
 */
export function verifyIncident(incidentId: string, verified: boolean): boolean {
  const incident = incidentStore.get(incidentId);
  if (!incident) return false;

  incident.isVerified = verified;
  return true;
}

/**
 * Clear an incident
 */
export function clearIncident(incidentId: string): boolean {
  const incident = incidentStore.get(incidentId);
  if (!incident) return false;

  incident.isActive = false;

  // Recalculate traffic for affected segments
  for (const segmentId of incident.affectedSegments) {
    recalculateSegmentTraffic(segmentId);
  }

  return true;
}

/**
 * Get active incidents
 */
export function getActiveIncidents(): TrafficIncident[] {
  return Array.from(incidentStore.values()).filter(i => i.isActive);
}

/**
 * Get incidents affecting specific segments
 */
export function getIncidentsForSegments(segmentIds: string[]): TrafficIncident[] {
  return Array.from(incidentStore.values()).filter(
    i => i.isActive && i.affectedSegments.some(s => segmentIds.includes(s))
  );
}

/**
 * Get delay in seconds based on incident severity
 */
function getIncidentDelay(severity: TrafficIncident['severity']): number {
  switch (severity) {
    case 'CRITICAL': return 1800; // 30 minutes
    case 'MAJOR': return 900;    // 15 minutes
    case 'MODERATE': return 300; // 5 minutes
    case 'MINOR': return 120;    // 2 minutes
    default: return 60;
  }
}

/**
 * Recalculate traffic for a segment after incident clearance
 */
function recalculateSegmentTraffic(segmentId: string): void {
  const traffic = trafficStore.get(segmentId);
  if (!traffic) return;

  // Get remaining active incidents for this segment
  const activeIncidents = Array.from(incidentStore.values())
    .filter(i => i.isActive && i.affectedSegments.includes(segmentId));

  // Recalculate delay
  let incidentDelay = 0;
  for (const incident of activeIncidents) {
    incidentDelay += getIncidentDelay(incident.severity);
  }

  traffic.delaySeconds = incidentDelay;
  traffic.congestionScore = traffic.currentSpeedKmh / traffic.freeFlowSpeedKmh;
  traffic.congestionLevel = getCongestionLevelFromScore(traffic.congestionScore);
}

// ============================================
// TRAFFIC PREDICTION
// ============================================

/**
 * Predict traffic conditions for a future time
 */
export function predictTraffic(
  segmentId: string,
  targetTime: Date,
  historical: HistoricalTraffic
): TrafficData {
  const current = trafficStore.get(segmentId);
  const now = new Date();

  if (!current) {
    return createDefaultTrafficData(segmentId);
  }

  const hoursAhead = (targetTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // For near-term predictions, use current data
  if (hoursAhead < 0.5) {
    return current;
  }

  // Get hour of day for target time
  const targetHour = targetTime.getHours();
  const isWeekend = targetTime.getDay() === 0 || targetTime.getDay() === 6;

  // Use historical pattern
  const historicalSpeed = isWeekend
    ? historical.weekendSpeeds[targetHour]
    : historical.weekdaySpeeds[targetHour];

  // Blend current and historical
  const blendFactor = Math.min(1, hoursAhead / 2); // More historical as time increases
  const predictedSpeed =
    current.currentSpeedKmh * (1 - blendFactor) +
    (historicalSpeed || current.freeFlowSpeedKmh * 0.7) * blendFactor;

  const congestionScore = predictedSpeed / current.freeFlowSpeedKmh;

  return {
    segmentId,
    timestamp: targetTime,
    currentSpeedKmh: predictedSpeed,
    freeFlowSpeedKmh: current.freeFlowSpeedKmh,
    averageSpeedKmh: predictedSpeed,
    congestionLevel: getCongestionLevelFromScore(congestionScore),
    congestionScore,
    delaySeconds: calculateDelay(current.freeFlowSpeedKmh, predictedSpeed, 0),
    delayFactor: 1,
  };
}

/**
 * Predict traffic for entire route
 */
export function predictRouteTraffic(
  segmentIds: string[],
  departureTime: Date,
  estimatedDurationsMinutes: number[]
): Map<string, TrafficData> {
  const predictions = new Map<string, TrafficData>();
  let currentTime = new Date(departureTime);

  for (let i = 0; i < segmentIds.length; i++) {
    const segmentId = segmentIds[i];
    const historical = historicalStore.get(segmentId);
    const duration = estimatedDurationsMinutes[i] || 5;

    if (historical) {
      predictions.set(segmentId, predictTraffic(segmentId, currentTime, historical));
    } else {
      const current = trafficStore.get(segmentId);
      if (current) {
        predictions.set(segmentId, current);
      }
    }

    // Advance time by segment duration
    currentTime = new Date(currentTime.getTime() + duration * 60 * 1000);
  }

  return predictions;
}

/**
 * Predict congestion 30-60 minutes ahead
 */
export function predictFutureCongestion(
  zoneId: string,
  minutesAhead: number = 30
): {
  predictedLevel: CongestionLevel;
  confidence: number;
  peakTime: Date;
  recommendations: string[];
} {
  const zoneData = zoneTraffic.get(zoneId);
  const now = new Date();

  // Get historical patterns for this time
  const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);
  const hour = futureTime.getHours();

  // Simple prediction based on time of day
  let predictedScore = 0.7; // Default moderate
  let confidence = 0.6;

  // Rush hour patterns
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)) {
    predictedScore = 0.4; // Heavy traffic expected
    confidence = 0.8;
  } else if (hour >= 22 || hour <= 5) {
    predictedScore = 0.95; // Free flow at night
    confidence = 0.9;
  }

  // Factor in current conditions
  if (zoneData) {
    const currentScore = zoneData.congestionLevel === 'FREE_FLOW' ? 0.9 :
      zoneData.congestionLevel === 'LIGHT' ? 0.7 :
      zoneData.congestionLevel === 'MODERATE' ? 0.5 :
      zoneData.congestionLevel === 'HEAVY' ? 0.3 :
      zoneData.congestionLevel === 'SEVERE' ? 0.2 : 0.1;

    predictedScore = predictedScore * 0.6 + currentScore * 0.4;
  }

  const predictedLevel = getCongestionLevelFromScore(predictedScore);

  const recommendations: string[] = [];
  if (predictedLevel === 'HEAVY' || predictedLevel === 'SEVERE' || predictedLevel === 'GRIDLOCK') {
    recommendations.push('Consider alternative routes');
    recommendations.push('Expect significant delays');
  }
  if (hour >= 7 && hour <= 9) {
    recommendations.push('Morning rush hour - plan extra time');
  }
  if (hour >= 17 && hour <= 20) {
    recommendations.push('Evening rush hour - expect delays');
  }

  return {
    predictedLevel,
    confidence,
    peakTime: futureTime,
    recommendations,
  };
}

// ============================================
// TRAFFIC SIGNAL INTEGRATION
// ============================================

/**
 * Register a traffic signal
 */
export function registerTrafficSignal(signal: TrafficSignal): void {
  signalStore.set(signal.id, signal);
}

/**
 * Get expected wait time at intersection
 */
export function getIntersectionWaitTime(
  signalId: string,
  timeOfDay: Date
): number {
  const signal = signalStore.get(signalId);
  if (!signal || !signal.hasTrafficLight) return 0;

  const hour = timeOfDay.getHours();
  
  // Determine which pattern to use
  let pattern = signal.offPeakPattern;
  if (hour >= 7 && hour <= 9) {
    pattern = signal.peakPattern || pattern;
  } else if (hour >= 17 && hour <= 20) {
    pattern = signal.peakPattern || pattern;
  } else if (hour >= 22 || hour <= 5) {
    pattern = signal.nightPattern || pattern;
  }

  if (!pattern) {
    // Use default cycle
    return signal.cycleLengthSeconds / 2;
  }

  // Expected wait is half the red time (average wait)
  return (pattern.cycleLengthSeconds - pattern.greenTimeSeconds) / 2;
}

// ============================================
// ZONE TRAFFIC MANAGEMENT
// ============================================

/**
 * Update zone-level traffic summary
 */
function updateZoneTraffic(segmentId: string): void {
  // Extract zone from segment ID (simplified)
  const zoneId = segmentId.split('_')[0];

  const zoneSegments = Array.from(trafficStore.keys())
    .filter(id => id.startsWith(zoneId));

  const { score, level, avgSpeed } = calculateAreaCongestion(zoneSegments);
  const incidents = Array.from(incidentStore.values())
    .filter(i => i.isActive && i.affectedSegments.some(s => s.startsWith(zoneId)));

  zoneTraffic.set(zoneId, {
    averageSpeed: avgSpeed,
    congestionLevel: level,
    incidentCount: incidents.length,
    lastUpdated: new Date(),
  });
}

/**
 * Get traffic summary for a zone
 */
export function getZoneTrafficSummary(zoneId: string) {
  return zoneTraffic.get(zoneId);
}

/**
 * Get all zones with traffic data
 */
export function getAllZoneTraffic() {
  return Array.from(zoneTraffic.entries()).map(([zoneId, data]) => ({
    zoneId,
    ...data,
  }));
}

// ============================================
// SUBSCRIPTION SYSTEM
// ============================================

/**
 * Subscribe to traffic updates
 */
export function subscribeToTraffic(
  segmentId: string,
  callback: (data: TrafficData) => void
): () => void {
  if (!trafficSubscribers.has(segmentId)) {
    trafficSubscribers.set(segmentId, new Set());
  }
  trafficSubscribers.get(segmentId)!.add(callback);

  // Return unsubscribe function
  return () => {
    trafficSubscribers.get(segmentId)?.delete(callback);
  };
}

/**
 * Notify subscribers of traffic update
 */
function notifySubscribers(segmentId: string, data: TrafficData): void {
  const subscribers = trafficSubscribers.get(segmentId);
  if (subscribers) {
    for (const callback of subscribers) {
      callback(data);
    }
  }
}

// ============================================
// HISTORICAL DATA
// ============================================

/**
 * Store historical traffic pattern
 */
export function storeHistoricalPattern(
  segmentId: string,
  pattern: HistoricalTraffic
): void {
  historicalStore.set(segmentId, pattern);
}

/**
 * Get historical traffic pattern
 */
export function getHistoricalPattern(segmentId: string): HistoricalTraffic | undefined {
  return historicalStore.get(segmentId);
}

/**
 * Update historical data with current observation
 */
export function recordHistoricalObservation(
  segmentId: string,
  speed: number,
  timeOfDay: Date,
  weather: WeatherCondition
): void {
  const historical = historicalStore.get(segmentId);
  const hour = timeOfDay.getHours();
  const isWeekend = timeOfDay.getDay() === 0 || timeOfDay.getDay() === 6;

  if (!historical) {
    // Create new historical record
    const newHistorical: HistoricalTraffic = {
      segmentId,
      hourlySpeeds: Array(24).fill(speed),
      weekdaySpeeds: Array(24).fill(speed),
      weekendSpeeds: Array(24).fill(speed),
      weatherImpact: new Map(),
      seasonalFactors: Array(12).fill(1),
    };
    newHistorical.weatherImpact.set(weather, speed);
    historicalStore.set(segmentId, newHistorical);
    return;
  }

  // Update with exponential moving average
  const alpha = 0.1; // Learning rate
  historical.hourlySpeeds[hour] =
    historical.hourlySpeeds[hour] * (1 - alpha) + speed * alpha;

  if (isWeekend) {
    historical.weekendSpeeds[hour] =
      historical.weekendSpeeds[hour] * (1 - alpha) + speed * alpha;
  } else {
    historical.weekdaySpeeds[hour] =
      historical.weekdaySpeeds[hour] * (1 - alpha) + speed * alpha;
  }

  // Update weather impact
  const currentWeatherSpeed = historical.weatherImpact.get(weather) || speed;
  historical.weatherImpact.set(weather, currentWeatherSpeed * (1 - alpha) + speed * alpha);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function createDefaultTrafficData(segmentId: string): TrafficData {
  return {
    segmentId,
    timestamp: new Date(),
    currentSpeedKmh: 60,
    freeFlowSpeedKmh: 60,
    averageSpeedKmh: 60,
    congestionLevel: 'FREE_FLOW',
    congestionScore: 1,
    delaySeconds: 0,
    delayFactor: 1,
  };
}

/**
 * Calculate traffic impact on ETA
 */
export function calculateTrafficImpact(
  segmentIds: string[],
  baseTimeMinutes: number
): {
  additionalMinutes: number;
  congestionLevel: CongestionLevel;
  criticalSegments: string[];
} {
  let totalDelay = 0;
  const criticalSegments: string[] = [];
  let worstLevel: CongestionLevel = 'FREE_FLOW';

  for (const id of segmentIds) {
    const traffic = trafficStore.get(id);
    if (!traffic) continue;

    totalDelay += traffic.delaySeconds;

    if (traffic.congestionLevel === 'SEVERE' || traffic.congestionLevel === 'GRIDLOCK') {
      criticalSegments.push(id);
    }

    // Track worst congestion
    const levels: CongestionLevel[] = ['FREE_FLOW', 'LIGHT', 'MODERATE', 'HEAVY', 'SEVERE', 'GRIDLOCK'];
    if (levels.indexOf(traffic.congestionLevel) > levels.indexOf(worstLevel)) {
      worstLevel = traffic.congestionLevel;
    }
  }

  return {
    additionalMinutes: Math.ceil(totalDelay / 60),
    congestionLevel: worstLevel,
    criticalSegments,
  };
}

/**
 * Export traffic data for analytics
 */
export function exportTrafficAnalytics() {
  return {
    segments: getAllTrafficData(),
    incidents: getActiveIncidents(),
    zones: getAllZoneTraffic(),
    timestamp: new Date(),
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  trafficStore,
  incidentStore,
  signalStore,
  historicalStore,
  zoneTraffic,
};

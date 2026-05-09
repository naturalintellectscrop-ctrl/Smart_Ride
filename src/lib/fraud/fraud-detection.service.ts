/**
 * Smart Ride Fraud Detection Service
 * Optimized for real-time fraud detection with minimal latency
 */

import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

export interface FraudAnalysisResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alerts: FraudAlertData[];
  breakdown: ScoreBreakdown;
  recommendedAction: RecommendedAction;
}

export interface ScoreBreakdown {
  collusion: number;
  gpsAnomaly: number;
  behavior: number;
  device: number;
  pattern: number;
}

export interface FraudAlertData {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  scoreContribution: number;
}

export type RecommendedAction = 'NONE' | 'FLAG' | 'HOLD_PAYOUT' | 'SUSPEND' | 'INVESTIGATE';

// ============================================
// In-Memory Cache for Performance
// ============================================

const riskScoreCache = new Map<string, { score: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================
// Fraud Detection Rules (Optimized)
// ============================================

const FRAUD_RULES = {
  // Collusion Rules
  COLLUSION: {
    SAME_PAIR_DAILY_THRESHOLD: 10,      // Max rides between same pair per day
    SAME_PAIR_WEEKLY_THRESHOLD: 30,     // Max rides per week
    SHORT_RIDE_THRESHOLD: 0.5,          // km - suspicious short rides
    REPEAT_CLIENT_RATIO: 0.3,           // 30% repeat clients is suspicious
  },
  // GPS Rules
  GPS: {
    MAX_SPEED_BODA: 80,                 // km/h
    MAX_SPEED_CAR: 120,                 // km/h
    MIN_DISTANCE_TRAVELED: 0.1,         // km
    LOCATION_JUMP_THRESHOLD: 1,         // km - sudden jump
    ACCURACY_THRESHOLD: 100,            // meters
  },
  // Behavior Rules
  BEHAVIOR: {
    MIN_RIDE_DURATION: 60,              // seconds
    MAX_RIDES_PER_HOUR: 6,
    CANCELLATION_RATE_THRESHOLD: 0.3,   // 30%
  },
  // Score Weights
  WEIGHTS: {
    COLLUSION: 25,
    GPS_ANOMALY: 30,
    BEHAVIOR: 15,
    DEVICE_REUSE: 10,
    PATTERN: 20,
  },
};

// ============================================
// Main Fraud Detection Service
// ============================================

export class FraudDetectionService {
  /**
   * Analyze a task for fraud - Main entry point
   * Optimized for speed with early exits
   */
  static async analyzeTask(taskId: string): Promise<FraudAnalysisResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cached = riskScoreCache.get(taskId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return this.getCachedResult(cached.score);
    }

    // Fetch task with minimal data
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        taskType: true,
        riderId: true,
        clientId: true,
        distanceKm: true,
        totalAmount: true,
        createdAt: true,
        completedAt: true,
        status: true,
      },
    });

    if (!task || !task.riderId) {
      return this.getDefaultResult();
    }

    // Run parallel analysis for speed
    const [collusionScore, behaviorScore, patternScore] = await Promise.all([
      this.calculateCollusionScore(task.riderId, task.clientId),
      this.calculateBehaviorScore(task.riderId, task),
      this.calculatePatternScore(task.riderId),
    ]);

    // Calculate final score
    const breakdown: ScoreBreakdown = {
      collusion: collusionScore,
      gpsAnomaly: 0, // Calculated separately for completed rides
      behavior: behaviorScore,
      device: 0, // Calculated during device registration
      pattern: patternScore,
    };

    const riskScore = Math.min(100, 
      (breakdown.collusion * FRAUD_RULES.WEIGHTS.COLLUSION / 100) +
      (breakdown.gpsAnomaly * FRAUD_RULES.WEIGHTS.GPS_ANOMALY / 100) +
      (breakdown.behavior * FRAUD_RULES.WEIGHTS.BEHAVIOR / 100) +
      (breakdown.device * FRAUD_RULES.WEIGHTS.DEVICE_REUSE / 100) +
      (breakdown.pattern * FRAUD_RULES.WEIGHTS.PATTERN / 100)
    );

    // Cache result
    riskScoreCache.set(taskId, { score: riskScore, timestamp: Date.now() });

    // Determine risk level and actions
    const riskLevel = this.getRiskLevel(riskScore);
    const alerts = this.generateAlerts(breakdown, riskScore);
    const recommendedAction = this.getRecommendedAction(riskScore);

    // Log if suspicious (async, non-blocking)
    if (riskScore >= 30) {
      this.logFraudScore(taskId, task.riderId, riskScore, breakdown).catch(() => {});
    }

    console.log(`[FraudDetection] Task ${taskId} analyzed in ${Date.now() - startTime}ms, score: ${riskScore}`);

    return { riskScore, riskLevel, alerts, breakdown, recommendedAction };
  }

  /**
   * Calculate collusion score between rider and client
   */
  private static async calculateCollusionScore(riderId: string, clientId: string): Promise<number> {
    // Get interaction count (optimized query)
    const interaction = await db.driverRiderInteraction.findUnique({
      where: { riderId_clientId: { riderId, clientId } },
      select: { totalRides: true, shortRideCount: true, collusionScore: true },
    });

    if (!interaction) return 0;

    let score = 0;

    // High frequency same pair
    if (interaction.totalRides > FRAUD_RULES.COLLUSION.SAME_PAIR_WEEKLY_THRESHOLD) {
      score += 40;
    } else if (interaction.totalRides > FRAUD_RULES.COLLUSION.SAME_PAIR_DAILY_THRESHOLD) {
      score += 25;
    }

    // High short ride ratio
    if (interaction.totalRides > 0) {
      const shortRideRatio = interaction.shortRideCount / interaction.totalRides;
      if (shortRideRatio > 0.5) {
        score += 35;
      } else if (shortRideRatio > 0.3) {
        score += 20;
      }
    }

    // Use existing collusion score if available
    if (interaction.collusionScore > 0) {
      score = Math.max(score, interaction.collusionScore);
    }

    return Math.min(100, score);
  }

  /**
   * Calculate behavior-based fraud score
   */
  private static async calculateBehaviorScore(riderId: string, task: any): Promise<number> {
    let score = 0;

    // Check ride duration
    if (task.completedAt && task.createdAt) {
      const durationSeconds = (task.completedAt.getTime() - task.createdAt.getTime()) / 1000;
      if (durationSeconds < FRAUD_RULES.BEHAVIOR.MIN_RIDE_DURATION) {
        score += 30;
      }
    }

    // Check distance
    if (task.distanceKm && task.distanceKm < FRAUD_RULES.COLLUSION.SHORT_RIDE_THRESHOLD) {
      score += 25;
    }

    // Get rider stats
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      select: { cancelledTrips: true, totalTrips: true },
    });

    if (rider && rider.totalTrips > 0) {
      const cancellationRate = rider.cancelledTrips / rider.totalTrips;
      if (cancellationRate > FRAUD_RULES.BEHAVIOR.CANCELLATION_RATE_THRESHOLD) {
        score += 20;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Calculate pattern-based fraud score
   */
  private static async calculatePatternScore(riderId: string): Promise<number> {
    // Get rider fraud profile if exists
    const profile = await db.riderFraudProfile.findUnique({
      where: { riderId },
      select: {
        repeatClientRatio: true,
        avgRideDistance: true,
        shortRides: true,
        totalRides: true,
      },
    });

    if (!profile) return 0;

    let score = 0;

    // High repeat client ratio
    if (profile.repeatClientRatio > FRAUD_RULES.COLLUSION.REPEAT_CLIENT_RATIO) {
      score += 30;
    }

    // Low average distance
    if (profile.avgRideDistance < FRAUD_RULES.COLLUSION.SHORT_RIDE_THRESHOLD) {
      score += 25;
    }

    // High short ride ratio
    if (profile.totalRides > 0 && profile.shortRides / profile.totalRides > 0.5) {
      score += 25;
    }

    return Math.min(100, score);
  }

  /**
   * Detect GPS anomaly - Called during ride
   */
  static async detectGPSAnomaly(
    riderId: string,
    taskId: string,
    currentLat: number,
    currentLng: number,
    previousLat: number | null,
    previousLng: number | null,
    timestamp: Date
  ): Promise<{ isAnomaly: boolean; anomalyType?: string; scoreAdd: number }> {
    // No previous location - can't detect anomaly yet
    if (!previousLat || !previousLng) {
      return { isAnomaly: false };
    }

    // Get last GPS record
    const lastGPS = await db.gPSAnomaly.findFirst({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, reportedLatitude: true, reportedLongitude: true },
    });

    if (!lastGPS) {
      return { isAnomaly: false };
    }

    // Calculate distance and time
    const distanceKm = this.haversineDistance(
      previousLat, previousLng,
      currentLat, currentLng
    );
    
    const timeDiffSeconds = (timestamp.getTime() - lastGPS.createdAt.getTime()) / 1000;
    
    if (timeDiffSeconds <= 0) {
      return { isAnomaly: false };
    }

    // Calculate speed
    const speedKmh = (distanceKm / timeDiffSeconds) * 3600;

    // Check for impossible speed
    const maxSpeed = FRAUD_RULES.GPS.MAX_SPEED_BODA; // Could be dynamic based on rider type
    if (speedKmh > maxSpeed) {
      await this.recordGPSAnomaly(riderId, taskId, 'IMPOSSIBLE_SPEED', currentLat, currentLng, speedKmh);
      return { isAnomaly: true, anomalyType: 'IMPOSSIBLE_SPEED', scoreAdd: 30 };
    }

    // Check for location jump (teleportation)
    if (distanceKm > FRAUD_RULES.GPS.LOCATION_JUMP_THRESHOLD && timeDiffSeconds < 60) {
      await this.recordGPSAnomaly(riderId, taskId, 'LOCATION_JUMP', currentLat, currentLng, distanceKm);
      return { isAnomaly: true, anomalyType: 'LOCATION_JUMP', scoreAdd: 25 };
    }

    return { isAnomaly: false };
  }

  /**
   * Record GPS anomaly
   */
  private static async recordGPSAnomaly(
    riderId: string,
    taskId: string | undefined,
    type: string,
    lat: number,
    lng: number,
    value: number
  ): Promise<void> {
    await db.gPSAnomaly.create({
      data: {
        riderId,
        taskId,
        anomalyType: type as any,
        reportedLatitude: lat,
        reportedLongitude: lng,
        jumpDistance: value,
        riskScoreAdd: type === 'IMPOSSIBLE_SPEED' ? 30 : 25,
      },
    });
  }

  /**
   * Detect multi-account farming
   */
  static async detectMultiAccountFarming(riderId: string): Promise<{ isFarming: boolean; score: number }> {
    // Get all devices for this rider
    const riderDevices = await db.riderDevice.findMany({
      where: { riderId },
      select: { deviceId: true },
    });

    if (riderDevices.length === 0) return { isFarming: false, score: 0 };

    const deviceIds = riderDevices.map(rd => rd.deviceId);

    // Check if these devices are used by other riders
    const otherRiders = await db.riderDevice.findMany({
      where: {
        deviceId: { in: deviceIds },
        riderId: { not: riderId },
      },
      select: { riderId: true },
      distinct: ['riderId'],
    });

    if (otherRiders.length > 0) {
      // Same device used by multiple riders - suspicious
      return { isFarming: true, score: 40 + (otherRiders.length * 15) };
    }

    // Check device fingerprint
    const flaggedDevices = await db.deviceFingerprint.count({
      where: {
        deviceId: { in: deviceIds },
        isFlagged: true,
      },
    });

    if (flaggedDevices > 0) {
      return { isFarming: true, score: 30 + (flaggedDevices * 10) };
    }

    return { isFarming: false, score: 0 };
  }

  /**
   * Detect promo abuse
   */
  static async detectPromoAbuse(clientId: string, promoCode: string, deviceId?: string): Promise<{ isAbuse: boolean; score: number }> {
    // Check existing uses of this promo
    const existingUses = await db.promoAbuseRecord.count({
      where: {
        promoCode,
        OR: [
          { clientId },
          ...(deviceId ? [{ deviceId }] : []),
        ],
      },
    });

    if (existingUses >= 3) {
      return { isAbuse: true, score: 50 };
    }

    // Check for same device usage
    if (deviceId) {
      const deviceUsers = await db.promoAbuseRecord.findMany({
        where: { promoCode, deviceId },
        select: { clientId: true },
        distinct: ['clientId'],
      });

      if (deviceUsers.length >= 2) {
        return { isAbuse: true, score: 40 };
      }
    }

    return { isAbuse: false, score: 0 };
  }

  /**
   * Create fraud alert
   */
  static async createAlert(data: {
    type: string;
    severity: string;
    riderId?: string;
    clientId?: string;
    taskId?: string;
    title: string;
    description: string;
    riskScore: number;
    evidence?: any;
  }): Promise<void> {
    await db.fraudAlert.create({
      data: {
        alertId: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        alertType: data.type as any,
        severity: data.severity as any,
        riderId: data.riderId,
        clientId: data.clientId,
        taskId: data.taskId,
        title: data.title,
        description: data.description,
        riskScore: data.riskScore,
        evidence: data.evidence ? JSON.stringify(data.evidence) : null,
      },
    });
  }

  /**
   * Get fraud statistics for dashboard
   */
  static async getStatistics(): Promise<{
    totalAlerts: number;
    openAlerts: number;
    highRiskRiders: number;
    avgRiskScore: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
  }> {
    const [totalAlerts, openAlerts, highRiskRiders, recentScores] = await Promise.all([
      db.fraudAlert.count(),
      db.fraudAlert.count({ where: { status: 'OPEN' } }),
      db.riderFraudProfile.count({ where: { overallRiskScore: { gte: 60 } } }),
      db.fraudScoreHistoryRecord.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        select: { riskScore: true },
      }),
    ]);

    const alertsByType = await db.fraudAlert.groupBy({
      by: ['alertType'],
      _count: true,
    });

    const alertsBySeverity = await db.fraudAlert.groupBy({
      by: ['severity'],
      _count: true,
    });

    const avgRiskScore = recentScores.length > 0
      ? recentScores.reduce((sum, s) => sum + s.riskScore, 0) / recentScores.length
      : 0;

    return {
      totalAlerts,
      openAlerts,
      highRiskRiders,
      avgRiskScore: Math.round(avgRiskScore),
      alertsByType: Object.fromEntries(alertsByType.map(a => [a.alertType, a._count])),
      alertsBySeverity: Object.fromEntries(alertsBySeverity.map(a => [a.severity, a._count])),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private static getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  private static getRecommendedAction(score: number): RecommendedAction {
    if (score >= 80) return 'SUSPEND';
    if (score >= 60) return 'INVESTIGATE';
    if (score >= 45) return 'HOLD_PAYOUT';
    if (score >= 30) return 'FLAG';
    return 'NONE';
  }

  private static generateAlerts(breakdown: ScoreBreakdown, totalScore: number): FraudAlertData[] {
    const alerts: FraudAlertData[] = [];

    if (breakdown.collusion >= 40) {
      alerts.push({
        type: 'DRIVER_RIDER_COLLUSION',
        severity: breakdown.collusion >= 60 ? 'HIGH' : 'MEDIUM',
        message: 'Suspicious driver-rider pairing pattern detected',
        scoreContribution: breakdown.collusion,
      });
    }

    if (breakdown.gpsAnomaly >= 30) {
      alerts.push({
        type: 'GPS_SPOOFING',
        severity: 'HIGH',
        message: 'GPS anomaly detected during ride',
        scoreContribution: breakdown.gpsAnomaly,
      });
    }

    if (breakdown.behavior >= 30) {
      alerts.push({
        type: 'SUSPICIOUS_RIDE_PATTERN',
        severity: breakdown.behavior >= 50 ? 'HIGH' : 'MEDIUM',
        message: 'Unusual ride behavior detected',
        scoreContribution: breakdown.behavior,
      });
    }

    if (breakdown.pattern >= 40) {
      alerts.push({
        type: 'FAKE_RIDE_FARMING',
        severity: 'HIGH',
        message: 'Pattern consistent with fake ride farming',
        scoreContribution: breakdown.pattern,
      });
    }

    return alerts;
  }

  private static getDefaultResult(): FraudAnalysisResult {
    return {
      riskScore: 0,
      riskLevel: 'LOW',
      alerts: [],
      breakdown: { collusion: 0, gpsAnomaly: 0, behavior: 0, device: 0, pattern: 0 },
      recommendedAction: 'NONE',
    };
  }

  private static getCachedResult(score: number): FraudAnalysisResult {
    return {
      riskScore: score,
      riskLevel: this.getRiskLevel(score),
      alerts: [],
      breakdown: { collusion: 0, gpsAnomaly: 0, behavior: 0, device: 0, pattern: 0 },
      recommendedAction: this.getRecommendedAction(score),
    };
  }

  private static async logFraudScore(
    taskId: string,
    riderId: string,
    score: number,
    breakdown: ScoreBreakdown
  ): Promise<void> {
    await db.fraudScoreHistoryRecord.create({
      data: {
        entityType: 'TASK',
        entityId: taskId,
        riskScore: score,
        collusionScore: breakdown.collusion,
        gpsAnomalyScore: breakdown.gpsAnomaly,
        behaviorScore: breakdown.behavior,
        deviceScore: breakdown.device,
        patternScore: breakdown.pattern,
        triggerTaskId: taskId,
      },
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Clear cache (for testing or maintenance)
   */
  static clearCache(): void {
    riskScoreCache.clear();
  }
}

export default FraudDetectionService;

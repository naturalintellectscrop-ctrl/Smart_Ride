/**
 * Risk Scoring Engine
 * Weighted scoring system for fraud detection
 * Calculates comprehensive risk scores with breakdown by category
 */

import { db } from '@/lib/db';

// Score thresholds
export const SCORE_THRESHOLDS = {
  NORMAL: { min: 0, max: 30, label: 'Normal', color: 'green' },
  SUSPICIOUS: { min: 30, max: 60, label: 'Suspicious', color: 'yellow' },
  HIGH_RISK: { min: 60, max: 80, label: 'High Risk', color: 'orange' },
  FRAUDULENT: { min: 80, max: 100, label: 'Fraudulent', color: 'red' },
};

// Scoring weights for different risk categories
export const SCORING_WEIGHTS = {
  COLLUSION: {
    weight: 0.25,
    description: 'Driver-Rider Collusion Score',
    factors: {
      repeatClientRatio: 0.3,
      shortRidePattern: 0.2,
      nightRidePattern: 0.15,
      cancelPattern: 0.15,
      fareAnomaly: 0.2,
    },
  },
  GPS_ANOMALY: {
    weight: 0.25,
    description: 'GPS Spoofing/Anomaly Score',
    factors: {
      impossibleSpeed: 0.3,
      locationJump: 0.3,
      accuracyIssue: 0.15,
      spoofingDetected: 0.25,
    },
  },
  BEHAVIOR: {
    weight: 0.25,
    description: 'Behavior Pattern Score',
    factors: {
      cancelRate: 0.25,
      shortRideRatio: 0.25,
      nightRideRatio: 0.15,
      responseTime: 0.1,
      acceptanceRate: 0.15,
      completionRate: 0.1,
    },
  },
  DEVICE: {
    weight: 0.25,
    description: 'Device/Multi-Account Score',
    factors: {
      deviceCount: 0.3,
      linkedAccounts: 0.4,
      deviceChanges: 0.3,
    },
  },
};

// Rule definitions with scoring
const FRAUD_RULES = [
  {
    code: 'HIGH_REPEAT_CLIENT',
    name: 'High Repeat Client Ratio',
    type: 'COLLUSION',
    threshold: 0.3,
    scoreWeight: 25,
    description: 'More than 30% of rides with same client',
  },
  {
    code: 'EXCESSIVE_SHORT_RIDES',
    name: 'Excessive Short Rides',
    type: 'BEHAVIOR',
    threshold: 0.2,
    scoreWeight: 20,
    description: 'More than 20% of rides under 1km',
  },
  {
    code: 'GPS_IMPOSSIBLE_SPEED',
    name: 'Impossible GPS Speed',
    type: 'GPS',
    threshold: 80,
    scoreWeight: 30,
    description: 'GPS speed exceeds vehicle capability',
  },
  {
    code: 'GPS_LOCATION_JUMP',
    name: 'GPS Location Jump',
    type: 'GPS',
    threshold: 500,
    scoreWeight: 25,
    description: 'Sudden jump in GPS location',
  },
  {
    code: 'HIGH_CANCEL_RATE',
    name: 'High Cancellation Rate',
    type: 'BEHAVIOR',
    threshold: 0.3,
    scoreWeight: 15,
    description: 'Cancellation rate exceeds 30%',
  },
  {
    code: 'MULTI_DEVICE',
    name: 'Multiple Device Usage',
    type: 'DEVICE',
    threshold: 3,
    scoreWeight: 20,
    description: 'More than 3 devices linked to account',
  },
  {
    code: 'LINKED_ACCOUNTS',
    name: 'Linked Fraudulent Accounts',
    type: 'DEVICE',
    threshold: 1,
    scoreWeight: 40,
    description: 'Device linked to other fraudulent accounts',
  },
  {
    code: 'NIGHT_RIDE_PATTERN',
    name: 'Suspicious Night Ride Pattern',
    type: 'BEHAVIOR',
    threshold: 0.4,
    scoreWeight: 10,
    description: 'More than 40% rides at night (10pm-5am)',
  },
];

export interface ScoreBreakdown {
  collusionScore: number;
  gpsAnomalyScore: number;
  behaviorScore: number;
  deviceScore: number;
  patternScore: number;
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matchedRules: string[];
}

export interface EntityRiskProfile {
  entityType: 'RIDER' | 'CLIENT' | 'TASK';
  entityId: string;
  currentScore: number;
  scoreHistory: Array<{
    score: number;
    date: Date;
    reason: string;
  }>;
  riskFactors: Array<{
    factor: string;
    value: number;
    contribution: number;
  }>;
  recommendations: string[];
}

/**
 * Risk Scoring Engine Class
 */
export class RiskScoringEngine {
  /**
   * Calculate comprehensive risk score with breakdown
   */
  async calculateComprehensiveScore(
    entityType: 'RIDER' | 'CLIENT' | 'TASK',
    entityId: string
  ): Promise<ScoreBreakdown> {
    try {
      let collusionScore = 0;
      let gpsAnomalyScore = 0;
      let behaviorScore = 0;
      let deviceScore = 0;
      let patternScore = 0;
      const matchedRules: string[] = [];

      if (entityType === 'RIDER') {
        const riderScores = await this.calculateRiderScores(entityId);
        collusionScore = riderScores.collusionScore;
        gpsAnomalyScore = riderScores.gpsAnomalyScore;
        behaviorScore = riderScores.behaviorScore;
        deviceScore = riderScores.deviceScore;
        matchedRules.push(...riderScores.matchedRules);
      } else if (entityType === 'CLIENT') {
        const clientScores = await this.calculateClientScores(entityId);
        behaviorScore = clientScores.behaviorScore;
        deviceScore = clientScores.deviceScore;
        matchedRules.push(...clientScores.matchedRules);
      } else if (entityType === 'TASK') {
        const taskScores = await this.calculateTaskScores(entityId);
        collusionScore = taskScores.collusionScore;
        gpsAnomalyScore = taskScores.gpsAnomalyScore;
        behaviorScore = taskScores.behaviorScore;
        matchedRules.push(...taskScores.matchedRules);
      }

      // Calculate weighted overall score
      const overallScore = Math.round(
        collusionScore * SCORING_WEIGHTS.COLLUSION.weight +
        gpsAnomalyScore * SCORING_WEIGHTS.GPS_ANOMALY.weight +
        behaviorScore * SCORING_WEIGHTS.BEHAVIOR.weight +
        deviceScore * SCORING_WEIGHTS.DEVICE.weight
      );

      // Calculate pattern score (aggregated pattern detection)
      patternScore = Math.round((collusionScore + behaviorScore) / 2);

      const riskLevel = this.getRiskLevel(overallScore);

      // Update or create score record
      await this.updateScoreRecord(entityType, entityId, {
        overallScore,
        collusionScore,
        gpsAnomalyScore,
        behaviorScore,
        deviceScore,
        patternScore,
      });

      return {
        collusionScore,
        gpsAnomalyScore,
        behaviorScore,
        deviceScore,
        patternScore,
        overallScore,
        riskLevel,
        matchedRules,
      };
    } catch (error) {
      console.error('Error calculating comprehensive score:', error);
      throw error;
    }
  }

  /**
   * Get risk level based on score
   */
  getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= SCORE_THRESHOLDS.FRAUDULENT.min) return 'CRITICAL';
    if (score >= SCORE_THRESHOLDS.HIGH_RISK.min) return 'HIGH';
    if (score >= SCORE_THRESHOLDS.SUSPICIOUS.min) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate individual scoring component
   */
  calculateComponentScore(
    componentType: 'COLLUSION' | 'GPS' | 'BEHAVIOR' | 'DEVICE',
    factors: Record<string, number>
  ): number {
    const weights = SCORING_WEIGHTS[componentType].factors;
    let score = 0;

    for (const [factor, value] of Object.entries(factors)) {
      const weight = weights[factor as keyof typeof weights] || 0;
      score += value * weight * 100;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Evaluate fraud rules against entity data
   */
  async evaluateRules(
    entityType: 'RIDER' | 'CLIENT' | 'TASK',
    entityId: string
  ): Promise<Array<{ rule: typeof FRAUD_RULES[0]; matched: boolean; value: number }>> {
    const results: Array<{ rule: typeof FRAUD_RULES[0]; matched: boolean; value: number }> = [];

    for (const rule of FRAUD_RULES) {
      const evaluation = await this.evaluateRule(rule, entityType, entityId);
      results.push({
        rule,
        matched: evaluation.matched,
        value: evaluation.value,
      });
    }

    return results;
  }

  /**
   * Get entity risk profile with history
   */
  async getEntityRiskProfile(
    entityType: 'RIDER' | 'CLIENT' | 'TASK',
    entityId: string
  ): Promise<EntityRiskProfile> {
    try {
      // Get current score
      const scoreBreakdown = await this.calculateComprehensiveScore(entityType, entityId);

      // Get score history
      const scoreHistory = await db.fraudScoreHistoryRecord.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      // Get risk factors
      const riskFactors = this.getRiskFactorsFromScore(scoreBreakdown);

      // Generate recommendations
      const recommendations = this.generateRecommendations(scoreBreakdown);

      return {
        entityType,
        entityId,
        currentScore: scoreBreakdown.overallScore,
        scoreHistory: scoreHistory.map(s => ({
          score: s.riskScore,
          date: s.createdAt,
          reason: s.triggerReason || 'Unknown',
        })),
        riskFactors,
        recommendations,
      };
    } catch (error) {
      console.error('Error getting entity risk profile:', error);
      throw error;
    }
  }

  /**
   * Batch calculate scores for multiple entities
   */
  async batchCalculateScores(
    entities: Array<{ type: 'RIDER' | 'CLIENT' | 'TASK'; id: string }>
  ): Promise<Record<string, ScoreBreakdown>> {
    const results: Record<string, ScoreBreakdown> = {};

    for (const entity of entities) {
      try {
        results[entity.id] = await this.calculateComprehensiveScore(entity.type, entity.id);
      } catch (error) {
        console.error(`Error calculating score for ${entity.type} ${entity.id}:`, error);
        results[entity.id] = {
          collusionScore: 0,
          gpsAnomalyScore: 0,
          behaviorScore: 0,
          deviceScore: 0,
          patternScore: 0,
          overallScore: 0,
          riskLevel: 'LOW',
          matchedRules: [],
        };
      }
    }

    return results;
  }

  /**
   * Update risk score with delta
   */
  async updateScoreWithDelta(
    entityType: 'RIDER' | 'CLIENT' | 'TASK',
    entityId: string,
    delta: number,
    reason: string
  ): Promise<number> {
    try {
      // Get current score
      const currentScore = await this.getOrCreateScoreRecord(entityType, entityId);
      const newScore = Math.max(0, Math.min(100, currentScore + delta));

      // Update score record
      await db.fraudRiskScore.update({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
        data: {
          riskScore: newScore,
          riskLevel: this.getRiskLevel(newScore),
        },
      });

      // Record history
      await db.fraudScoreHistoryRecord.create({
        data: {
          entityType,
          entityId,
          riskScore: newScore,
          previousScore: currentScore,
          triggerReason: reason,
        },
      });

      return newScore;
    } catch (error) {
      console.error('Error updating score with delta:', error);
      throw error;
    }
  }

  // Private helper methods

  private async calculateRiderScores(riderId: string): Promise<{
    collusionScore: number;
    gpsAnomalyScore: number;
    behaviorScore: number;
    deviceScore: number;
    matchedRules: string[];
  }> {
    const matchedRules: string[] = [];

    // Get rider profile and interactions
    const profile = await db.riderFraudProfile.findUnique({
      where: { riderId },
    });

    const interactions = await db.driverRiderInteraction.findMany({
      where: { riderId, isFlagged: true },
    });

    const gpsAnomalies = await db.gPSAnomalyRecord.count({
      where: {
        riderId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const devices = await db.riderDeviceAssociation.count({
      where: { riderId, isActive: true },
    });

    // Calculate collusion score
    let collusionScore = 0;
    if (profile) {
      if (profile.repeatClientRatio > 0.3) {
        collusionScore += 25;
        matchedRules.push('HIGH_REPEAT_CLIENT');
      }
      if (interactions.length > 0) {
        collusionScore += Math.min(interactions.length * 10, 40);
      }
    }

    // Calculate GPS anomaly score
    let gpsAnomalyScore = 0;
    if (gpsAnomalies > 0) {
      gpsAnomalyScore = Math.min(gpsAnomalies * 15, 100);
      matchedRules.push('GPS_IMPOSSIBLE_SPEED');
    }

    // Calculate behavior score
    let behaviorScore = 0;
    if (profile) {
      if (profile.totalRides > 0) {
        const shortRideRatio = profile.shortRides / profile.totalRides;
        if (shortRideRatio > 0.2) {
          behaviorScore += 20;
          matchedRules.push('EXCESSIVE_SHORT_RIDES');
        }

        const cancelRate = profile.cancelledRides / profile.totalRides;
        if (cancelRate > 0.3) {
          behaviorScore += 15;
          matchedRules.push('HIGH_CANCEL_RATE');
        }
      }

      if (profile.avgRideDistance < 1) {
        behaviorScore += 15;
      }
    }

    // Calculate device score
    let deviceScore = 0;
    if (devices > 3) {
      deviceScore += 20;
      matchedRules.push('MULTI_DEVICE');
    }

    // Check for linked accounts
    const linkedAccounts = await this.checkLinkedAccounts(riderId);
    if (linkedAccounts.length > 0) {
      deviceScore += 40;
      matchedRules.push('LINKED_ACCOUNTS');
    }

    return {
      collusionScore: Math.min(collusionScore, 100),
      gpsAnomalyScore: Math.min(gpsAnomalyScore, 100),
      behaviorScore: Math.min(behaviorScore, 100),
      deviceScore: Math.min(deviceScore, 100),
      matchedRules,
    };
  }

  private async calculateClientScores(clientId: string): Promise<{
    behaviorScore: number;
    deviceScore: number;
    matchedRules: string[];
  }> {
    const matchedRules: string[] = [];

    // Get client statistics
    const orders = await db.order.count({
      where: {
        clientId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const cancelledOrders = await db.order.count({
      where: {
        clientId,
        status: 'CANCELLED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const devices = await db.userDeviceAssociation.count({
      where: { userId: clientId, isActive: true },
    });

    // Calculate behavior score
    let behaviorScore = 0;
    if (orders > 0) {
      const cancelRate = cancelledOrders / orders;
      if (cancelRate > 0.3) {
        behaviorScore += 25;
        matchedRules.push('HIGH_CANCEL_RATE');
      }
    }

    // Calculate device score
    let deviceScore = 0;
    if (devices > 3) {
      deviceScore += 20;
      matchedRules.push('MULTI_DEVICE');
    }

    return {
      behaviorScore: Math.min(behaviorScore, 100),
      deviceScore: Math.min(deviceScore, 100),
      matchedRules,
    };
  }

  private async calculateTaskScores(taskId: string): Promise<{
    collusionScore: number;
    gpsAnomalyScore: number;
    behaviorScore: number;
    matchedRules: string[];
  }> {
    const matchedRules: string[] = [];

    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { collusionScore: 0, gpsAnomalyScore: 0, behaviorScore: 0, matchedRules };
    }

    // Get GPS anomalies for task
    const gpsAnomalies = await db.gPSAnomalyRecord.findMany({
      where: { taskId },
    });

    // Calculate collusion score
    let collusionScore = 0;
    if (task.distanceKm && task.distanceKm < 1) {
      collusionScore += 20;
      matchedRules.push('EXCESSIVE_SHORT_RIDES');
    }

    // Calculate GPS anomaly score
    let gpsAnomalyScore = 0;
    if (gpsAnomalies.length > 0) {
      gpsAnomalyScore = Math.min(gpsAnomalies.length * 30, 100);
      matchedRules.push('GPS_IMPOSSIBLE_SPEED');
    }

    // Calculate behavior score
    let behaviorScore = 0;
    if (task.distanceKm && task.distanceKm < 0.5) {
      behaviorScore += 30;
      matchedRules.push('EXCESSIVE_SHORT_RIDES');
    }

    return {
      collusionScore,
      gpsAnomalyScore,
      behaviorScore,
      matchedRules,
    };
  }

  private async evaluateRule(
    rule: typeof FRAUD_RULES[0],
    entityType: 'RIDER' | 'CLIENT' | 'TASK',
    entityId: string
  ): Promise<{ matched: boolean; value: number }> {
    // This is a simplified rule evaluation
    // In a real implementation, this would query the relevant data
    return { matched: false, value: 0 };
  }

  private async checkLinkedAccounts(riderId: string): Promise<string[]> {
    const devices = await db.riderDeviceAssociation.findMany({
      where: { riderId, isActive: true },
    });

    const linkedAccounts: string[] = [];

    for (const device of devices) {
      const otherAccounts = await db.riderDeviceAssociation.findMany({
        where: {
          deviceId: device.deviceId,
          isActive: true,
          riderId: { not: riderId },
        },
        select: { riderId: true },
      });

      linkedAccounts.push(...otherAccounts.map(a => a.riderId));
    }

    return [...new Set(linkedAccounts)];
  }

  private async getOrCreateScoreRecord(
    entityType: 'RIDER' | 'CLIENT' | 'TASK',
    entityId: string
  ): Promise<number> {
    let record = await db.fraudRiskScore.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    if (!record) {
      record = await db.fraudRiskScore.create({
        data: {
          entityType,
          entityId,
          riskScore: 0,
          riskLevel: 'LOW',
        },
      });
    }

    return record.riskScore;
  }

  private async updateScoreRecord(
    entityType: 'RIDER' | 'CLIENT' | 'TASK',
    entityId: string,
    scores: {
      overallScore: number;
      collusionScore: number;
      gpsAnomalyScore: number;
      behaviorScore: number;
      deviceScore: number;
      patternScore: number;
    }
  ): Promise<void> {
    await db.fraudRiskScore.upsert({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
      create: {
        entityType,
        entityId,
        riskScore: scores.overallScore,
        riskLevel: this.getRiskLevel(scores.overallScore),
      },
      update: {
        riskScore: scores.overallScore,
        riskLevel: this.getRiskLevel(scores.overallScore),
      },
    });
  }

  private getRiskFactorsFromScore(score: ScoreBreakdown): Array<{
    factor: string;
    value: number;
    contribution: number;
  }> {
    const factors: Array<{ factor: string; value: number; contribution: number }> = [];

    if (score.collusionScore > 0) {
      factors.push({
        factor: 'Collusion Risk',
        value: score.collusionScore,
        contribution: Math.round(score.collusionScore * SCORING_WEIGHTS.COLLUSION.weight),
      });
    }

    if (score.gpsAnomalyScore > 0) {
      factors.push({
        factor: 'GPS Anomaly',
        value: score.gpsAnomalyScore,
        contribution: Math.round(score.gpsAnomalyScore * SCORING_WEIGHTS.GPS_ANOMALY.weight),
      });
    }

    if (score.behaviorScore > 0) {
      factors.push({
        factor: 'Behavior Pattern',
        value: score.behaviorScore,
        contribution: Math.round(score.behaviorScore * SCORING_WEIGHTS.BEHAVIOR.weight),
      });
    }

    if (score.deviceScore > 0) {
      factors.push({
        factor: 'Device Risk',
        value: score.deviceScore,
        contribution: Math.round(score.deviceScore * SCORING_WEIGHTS.DEVICE.weight),
      });
    }

    return factors.sort((a, b) => b.contribution - a.contribution);
  }

  private generateRecommendations(score: ScoreBreakdown): string[] {
    const recommendations: string[] = [];

    if (score.collusionScore > 50) {
      recommendations.push('Review rider-client interaction history for suspicious patterns');
      recommendations.push('Consider manual verification of recent rides');
    }

    if (score.gpsAnomalyScore > 50) {
      recommendations.push('Verify GPS data integrity');
      recommendations.push('Check for GPS spoofing applications');
    }

    if (score.behaviorScore > 50) {
      recommendations.push('Monitor ride patterns closely');
      recommendations.push('Consider implementing additional verification steps');
    }

    if (score.deviceScore > 50) {
      recommendations.push('Review device associations');
      recommendations.push('Verify account authenticity');
    }

    if (score.overallScore > 80) {
      recommendations.push('Consider temporary account suspension');
      recommendations.push('Escalate to fraud investigation team');
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate action required');
      recommendations.push('Continue monitoring');
    }

    return recommendations;
  }
}

// Export singleton instance
export const riskScoringEngine = new RiskScoringEngine();

/**
 * ML Model Training Pipeline for Smart Ride Fraud Detection System
 * 
 * This module provides:
 * 1. Feature Extraction - Ride patterns, GPS anomalies, collusion, device, temporal features
 * 2. Training Data Generation - Synthetic fraud samples, labeling, balancing
 * 3. Model Training Service - Training, cross-validation, persistence, performance metrics
 * 4. Scheduled Training - Weekly retraining, auto-tuning thresholds
 */

import { db } from '@/lib/db';

// ============================================
// Types and Interfaces
// ============================================

export interface FeatureVector {
  // Ride Pattern Features
  ridesPerHour: number;
  avgRideDistance: number;
  avgRideDuration: number;
  shortRideRatio: number;          // rides < 1km / total rides
  nightRideRatio: number;          // rides 10pm-5am / total rides
  weekendRideRatio: number;        // weekend rides / total rides
  rideDistanceVariance: number;
  rideDurationVariance: number;
  
  // GPS Anomaly Features
  gpsAnomalyCount: number;
  impossibleSpeedCount: number;
  locationJumpCount: number;
  avgSpeedAnomaly: number;
  maxSpeedAnomaly: number;
  gpsAccuracyIssueCount: number;
  
  // Collusion Features
  repeatClientRatio: number;
  topClientConcentration: number;   // rides with top client / total rides
  samePairDailyCount: number;
  samePairWeeklyCount: number;
  collusionFlagCount: number;
  
  // Device Features
  deviceCount: number;
  activeDeviceCount: number;
  multiAccountIndicator: number;    // 0-1 scale
  deviceChangeFrequency: number;
  flaggedDeviceCount: number;
  
  // Temporal Features
  peakHourRideRatio: number;        // 7-9am, 5-7pm / total rides
  offPeakHourRideRatio: number;
  rideTimeVariance: number;
  consecutiveRideRatio: number;     // rides within 5min / total rides
  
  // Behavioral Features
  cancellationRate: number;
  completionRate: number;
  acceptanceRate: number;
  avgResponseTime: number;
  
  // Financial Features
  avgFareAmount: number;
  fareVariance: number;
  cashRideRatio: number;
  
  // Target
  isFraud?: boolean;
  fraudScore?: number;
}

export interface TrainingSample {
  id: string;
  features: FeatureVector;
  label: number;  // 0 = legitimate, 1 = fraud
  weight?: number;
  source: 'historical' | 'synthetic' | 'labeled';
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix: {
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
  };
  featureImportance: Record<string, number>;
}

export interface ModelVersion {
  version: string;
  trainedAt: Date;
  metrics: ModelMetrics;
  featureCount: number;
  sampleCount: number;
  fraudRatio: number;
  hyperparameters: Record<string, number | string>;
  thresholds: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
    criticalRisk: number;
  };
}

export interface TrainingConfig {
  // Data Generation
  syntheticSamplesRatio: number;    // ratio of synthetic to real samples
  fraudSampleRatio: number;         // target ratio of fraud samples
  oversamplingMethod: 'smote' | 'random' | 'none';
  
  // Feature Engineering
  featureSelectionMethod: 'correlation' | 'importance' | 'all';
  normalizeFeatures: boolean;
  
  // Training
  crossValidationFolds: number;
  trainTestSplit: number;           // 0.8 = 80% train, 20% test
  learningRate: number;
  maxIterations: number;
  regularization: number;
  
  // Thresholds
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface TrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
  currentStep: string;
  metrics?: ModelMetrics;
  error?: string;
  modelVersion?: string;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  syntheticSamplesRatio: 0.3,
  fraudSampleRatio: 0.3,
  oversamplingMethod: 'smote',
  featureSelectionMethod: 'all',
  normalizeFeatures: true,
  crossValidationFolds: 5,
  trainTestSplit: 0.8,
  learningRate: 0.01,
  maxIterations: 1000,
  regularization: 0.001,
  riskThresholds: {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90,
  },
};

// ============================================
// Feature Extraction Module
// ============================================

export class FeatureExtractor {
  /**
   * Extract comprehensive feature vector for a rider
   */
  static async extractRiderFeatures(riderId: string, timeWindow: { start: Date; end: Date }): Promise<FeatureVector> {
    const tasks = await db.task.findMany({
      where: {
        riderId,
        createdAt: { gte: timeWindow.start, lte: timeWindow.end },
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      select: {
        id: true,
        taskType: true,
        distanceKm: true,
        totalAmount: true,
        paymentMethod: true,
        createdAt: true,
        completedAt: true,
        cancelledAt: true,
        status: true,
      },
    });

    const profile = await db.riderFraudProfile.findUnique({
      where: { riderId },
    });

    const gpsAnomalies = await db.gPSAnomalyRecord.findMany({
      where: {
        riderId,
        createdAt: { gte: timeWindow.start, lte: timeWindow.end },
      },
    });

    const interactions = await db.driverRiderInteraction.findMany({
      where: { riderId },
    });

    const devices = await db.riderDeviceAssociation.findMany({
      where: { riderId, isActive: true },
      select: { deviceId: true },
    });

    const deviceIds = devices.map(d => d.deviceId);
    const flaggedDevices = deviceIds.length > 0 
      ? await db.deviceFingerprint.count({
          where: { fingerprintHash: { in: deviceIds }, isFlagged: true },
        })
      : 0;

    // Calculate features
    const features: FeatureVector = {
      // Ride Pattern Features
      ridesPerHour: this.calculateRidesPerHour(tasks, timeWindow),
      avgRideDistance: this.calculateAvgDistance(tasks),
      avgRideDuration: this.calculateAvgDuration(tasks),
      shortRideRatio: this.calculateShortRideRatio(tasks),
      nightRideRatio: this.calculateNightRideRatio(tasks),
      weekendRideRatio: this.calculateWeekendRideRatio(tasks),
      rideDistanceVariance: this.calculateDistanceVariance(tasks),
      rideDurationVariance: this.calculateDurationVariance(tasks),
      
      // GPS Anomaly Features
      gpsAnomalyCount: gpsAnomalies.length,
      impossibleSpeedCount: gpsAnomalies.filter(a => a.anomalyType === 'IMPOSSIBLE_SPEED').length,
      locationJumpCount: gpsAnomalies.filter(a => a.anomalyType === 'LOCATION_JUMP').length,
      avgSpeedAnomaly: this.calculateAvgSpeedAnomaly(gpsAnomalies),
      maxSpeedAnomaly: this.calculateMaxSpeedAnomaly(gpsAnomalies),
      gpsAccuracyIssueCount: gpsAnomalies.filter(a => a.anomalyType === 'ACCURACY_ISSUE').length,
      
      // Collusion Features
      repeatClientRatio: profile?.repeatClientRatio ?? 0,
      topClientConcentration: this.calculateTopClientConcentration(interactions),
      samePairDailyCount: this.calculateSamePairDailyCount(interactions),
      samePairWeeklyCount: this.calculateSamePairWeeklyCount(interactions),
      collusionFlagCount: interactions.filter(i => i.isFlagged).length,
      
      // Device Features
      deviceCount: profile?.deviceCount ?? devices.length,
      activeDeviceCount: profile?.activeDeviceCount ?? devices.length,
      multiAccountIndicator: await this.calculateMultiAccountIndicator(riderId, deviceIds),
      deviceChangeFrequency: 0, // Would need historical device data
      flaggedDeviceCount: flaggedDevices,
      
      // Temporal Features
      peakHourRideRatio: this.calculatePeakHourRatio(tasks),
      offPeakHourRideRatio: this.calculateOffPeakHourRatio(tasks),
      rideTimeVariance: this.calculateRideTimeVariance(tasks),
      consecutiveRideRatio: this.calculateConsecutiveRideRatio(tasks),
      
      // Behavioral Features
      cancellationRate: this.calculateCancellationRate(tasks),
      completionRate: this.calculateCompletionRate(tasks),
      acceptanceRate: 1 - this.calculateCancellationRate(tasks), // Simplified
      avgResponseTime: 0, // Would need dispatch data
      
      // Financial Features
      avgFareAmount: this.calculateAvgFare(tasks),
      fareVariance: this.calculateFareVariance(tasks),
      cashRideRatio: this.calculateCashRideRatio(tasks),
    };

    return features;
  }

  /**
   * Extract features for a task
   */
  static async extractTaskFeatures(taskId: string): Promise<Partial<FeatureVector>> {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        riderId: true,
        clientId: true,
        distanceKm: true,
        totalAmount: true,
        paymentMethod: true,
        createdAt: true,
        completedAt: true,
        status: true,
        taskType: true,
      },
    });

    if (!task || !task.riderId) {
      return {};
    }

    const timeWindow = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
    };

    // Get rider's historical features
    const riderFeatures = await this.extractRiderFeatures(task.riderId, timeWindow);

    // Add task-specific features
    const gpsAnomalies = await db.gPSAnomalyRecord.findMany({
      where: { taskId },
    });

    return {
      ...riderFeatures,
      gpsAnomalyCount: gpsAnomalies.length,
      impossibleSpeedCount: gpsAnomalies.filter(a => a.anomalyType === 'IMPOSSIBLE_SPEED').length,
      locationJumpCount: gpsAnomalies.filter(a => a.anomalyType === 'LOCATION_JUMP').length,
    };
  }

  // Private helper methods for feature calculation
  private static calculateRidesPerHour(tasks: any[], timeWindow: { start: Date; end: Date }): number {
    const hours = Math.max(1, (timeWindow.end.getTime() - timeWindow.start.getTime()) / (1000 * 60 * 60));
    return tasks.length / hours;
  }

  private static calculateAvgDistance(tasks: any[]): number {
    const completedTasks = tasks.filter(t => t.distanceKm !== null);
    if (completedTasks.length === 0) return 0;
    return completedTasks.reduce((sum, t) => sum + (t.distanceKm || 0), 0) / completedTasks.length;
  }

  private static calculateAvgDuration(tasks: any[]): number {
    const completedTasks = tasks.filter(t => t.completedAt && t.createdAt);
    if (completedTasks.length === 0) return 0;
    const durations = completedTasks.map(t => 
      (t.completedAt.getTime() - t.createdAt.getTime()) / 1000
    );
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  private static calculateShortRideRatio(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    const shortRides = tasks.filter(t => t.distanceKm !== null && t.distanceKm < 1).length;
    return shortRides / tasks.length;
  }

  private static calculateNightRideRatio(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    const nightRides = tasks.filter(t => {
      const hour = t.createdAt.getHours();
      return hour >= 22 || hour < 5;
    }).length;
    return nightRides / tasks.length;
  }

  private static calculateWeekendRideRatio(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    const weekendRides = tasks.filter(t => {
      const day = t.createdAt.getDay();
      return day === 0 || day === 6;
    }).length;
    return weekendRides / tasks.length;
  }

  private static calculateDistanceVariance(tasks: any[]): number {
    const distances = tasks.filter(t => t.distanceKm !== null).map(t => t.distanceKm);
    if (distances.length < 2) return 0;
    const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
    return variance;
  }

  private static calculateDurationVariance(tasks: any[]): number {
    const completedTasks = tasks.filter(t => t.completedAt && t.createdAt);
    if (completedTasks.length < 2) return 0;
    const durations = completedTasks.map(t => 
      (t.completedAt.getTime() - t.createdAt.getTime()) / 1000
    );
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
    return variance;
  }

  private static calculateAvgSpeedAnomaly(anomalies: any[]): number {
    const speedAnomalies = anomalies.filter(a => a.anomalyType === 'IMPOSSIBLE_SPEED' && a.speedKmh);
    if (speedAnomalies.length === 0) return 0;
    return speedAnomalies.reduce((sum, a) => sum + (a.speedKmh || 0), 0) / speedAnomalies.length;
  }

  private static calculateMaxSpeedAnomaly(anomalies: any[]): number {
    const speedAnomalies = anomalies.filter(a => a.anomalyType === 'IMPOSSIBLE_SPEED' && a.speedKmh);
    if (speedAnomalies.length === 0) return 0;
    return Math.max(...speedAnomalies.map(a => a.speedKmh || 0));
  }

  private static calculateTopClientConcentration(interactions: any[]): number {
    if (interactions.length === 0) return 0;
    const totalRides = interactions.reduce((sum, i) => sum + i.totalRides, 0);
    if (totalRides === 0) return 0;
    const maxRides = Math.max(...interactions.map(i => i.totalRides));
    return maxRides / totalRides;
  }

  private static calculateSamePairDailyCount(interactions: any[]): number {
    return interactions.filter(i => i.totalRides > 10).length;
  }

  private static calculateSamePairWeeklyCount(interactions: any[]): number {
    return interactions.filter(i => i.totalRides > 30).length;
  }

  private static async calculateMultiAccountIndicator(riderId: string, deviceIds: string[]): Promise<number> {
    if (deviceIds.length === 0) return 0;
    const otherAccounts = await db.riderDeviceAssociation.findMany({
      where: {
        deviceId: { in: deviceIds },
        riderId: { not: riderId },
        isActive: true,
      },
    });
    return Math.min(1, otherAccounts.length * 0.3);
  }

  private static calculatePeakHourRatio(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    const peakRides = tasks.filter(t => {
      const hour = t.createdAt.getHours();
      return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    }).length;
    return peakRides / tasks.length;
  }

  private static calculateOffPeakHourRatio(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    const offPeakRides = tasks.filter(t => {
      const hour = t.createdAt.getHours();
      return hour >= 10 && hour <= 16;
    }).length;
    return offPeakRides / tasks.length;
  }

  private static calculateRideTimeVariance(tasks: any[]): number {
    if (tasks.length < 2) return 0;
    const hours = tasks.map(t => t.createdAt.getHours());
    const mean = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    const variance = hours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hours.length;
    return variance;
  }

  private static calculateConsecutiveRideRatio(tasks: any[]): number {
    if (tasks.length < 2) return 0;
    const sortedTasks = [...tasks].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let consecutiveCount = 0;
    for (let i = 1; i < sortedTasks.length; i++) {
      const timeDiff = (sortedTasks[i].createdAt.getTime() - sortedTasks[i-1].createdAt.getTime()) / (1000 * 60);
      if (timeDiff < 5) consecutiveCount++;
    }
    return consecutiveCount / (sortedTasks.length - 1);
  }

  private static calculateCancellationRate(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    const cancelled = tasks.filter(t => t.status === 'CANCELLED').length;
    return cancelled / tasks.length;
  }

  private static calculateCompletionRate(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    return completed / tasks.length;
  }

  private static calculateAvgFare(tasks: any[]): number {
    const completedTasks = tasks.filter(t => t.totalAmount !== null);
    if (completedTasks.length === 0) return 0;
    return completedTasks.reduce((sum, t) => sum + t.totalAmount, 0) / completedTasks.length;
  }

  private static calculateFareVariance(tasks: any[]): number {
    const fares = tasks.filter(t => t.totalAmount !== null).map(t => t.totalAmount);
    if (fares.length < 2) return 0;
    const mean = fares.reduce((sum, f) => sum + f, 0) / fares.length;
    const variance = fares.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / fares.length;
    return variance;
  }

  private static calculateCashRideRatio(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    const cashRides = tasks.filter(t => t.paymentMethod === 'CASH').length;
    return cashRides / tasks.length;
  }
}

// ============================================
// Training Data Generation Module
// ============================================

export class TrainingDataGenerator {
  /**
   * Generate training dataset with historical, labeled, and synthetic samples
   */
  static async generateTrainingDataset(config: TrainingConfig): Promise<TrainingSample[]> {
    const samples: TrainingSample[] = [];

    // 1. Collect historical data with fraud scores
    const historicalSamples = await this.collectHistoricalData();
    samples.push(...historicalSamples);

    // 2. Get explicitly labeled data from admin decisions
    const labeledSamples = await this.collectLabeledData();
    samples.push(...labeledSamples);

    // 3. Generate synthetic fraud samples
    if (config.syntheticSamplesRatio > 0) {
      const syntheticSamples = await this.generateSyntheticSamples(
        samples,
        config.syntheticSamplesRatio,
        config.fraudSampleRatio
      );
      samples.push(...syntheticSamples);
    }

    // 4. Balance dataset
    const balancedSamples = this.balanceDataset(samples, config);

    // 5. Normalize features if configured
    if (config.normalizeFeatures) {
      this.normalizeFeatures(balancedSamples);
    }

    return balancedSamples;
  }

  /**
   * Collect historical data from fraud profiles and alerts
   */
  private static async collectHistoricalData(): Promise<TrainingSample[]> {
    const samples: TrainingSample[] = [];
    const timeWindow = {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      end: new Date(),
    };

    // Get riders with fraud profiles
    const profiles = await db.riderFraudProfile.findMany({
      select: { riderId: true, overallRiskScore: true },
    });

    for (const profile of profiles) {
      try {
        const features = await FeatureExtractor.extractRiderFeatures(profile.riderId, timeWindow);
        const isFraud = profile.overallRiskScore >= 60;
        
        samples.push({
          id: `hist-${profile.riderId}`,
          features,
          label: isFraud ? 1 : 0,
          weight: 1.0,
          source: 'historical',
        });
      } catch (error) {
        console.error(`Error extracting features for rider ${profile.riderId}:`, error);
      }
    }

    return samples;
  }

  /**
   * Collect labeled data from admin decisions
   */
  private static async collectLabeledData(): Promise<TrainingSample[]> {
    const samples: TrainingSample[] = [];
    const timeWindow = {
      start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Last 180 days
      end: new Date(),
    };

    // Get admin fraud actions
    const actions = await db.adminFraudAction.findMany({
      where: {
        mlFeedbackRecorded: false,
        actionType: { in: ['ACCOUNT_SUSPENDED', 'ACCOUNT_BANNED', 'FALSE_POSITIVE'] },
      },
    });

    for (const action of actions) {
      if (action.entityType !== 'RIDER') continue;
      
      try {
        const features = await FeatureExtractor.extractRiderFeatures(action.entityId, timeWindow);
        const isFraud = action.actionType !== 'FALSE_POSITIVE';
        
        samples.push({
          id: `label-${action.id}`,
          features,
          label: isFraud ? 1 : 0,
          weight: 1.5, // Higher weight for explicitly labeled data
          source: 'labeled',
        });

        // Mark as recorded for ML feedback
        await db.adminFraudAction.update({
          where: { id: action.id },
          data: { mlFeedbackRecorded: true },
        });
      } catch (error) {
        console.error(`Error processing admin action ${action.id}:`, error);
      }
    }

    return samples;
  }

  /**
   * Generate synthetic fraud samples using SMOTE-like approach
   */
  private static async generateSyntheticSamples(
    realSamples: TrainingSample[],
    ratio: number,
    fraudRatio: number
  ): Promise<TrainingSample[]> {
    const fraudSamples = realSamples.filter(s => s.label === 1);
    const legitimateSamples = realSamples.filter(s => s.label === 0);

    const syntheticSamples: TrainingSample[] = [];
    const targetSyntheticCount = Math.floor(realSamples.length * ratio);
    const targetFraudCount = Math.floor(targetSyntheticCount * fraudRatio);

    // Generate synthetic fraud samples
    for (let i = 0; i < targetFraudCount; i++) {
      if (fraudSamples.length < 2) break;
      
      // Select two random fraud samples
      const idx1 = Math.floor(Math.random() * fraudSamples.length);
      let idx2 = Math.floor(Math.random() * fraudSamples.length);
      while (idx2 === idx1) idx2 = Math.floor(Math.random() * fraudSamples.length);

      const sample1 = fraudSamples[idx1];
      const sample2 = fraudSamples[idx2];

      // Interpolate features
      const syntheticFeatures = this.interpolateFeatures(
        sample1.features,
        sample2.features,
        Math.random()
      );

      syntheticSamples.push({
        id: `synth-fraud-${i}`,
        features: syntheticFeatures,
        label: 1,
        weight: 0.8, // Lower weight for synthetic data
        source: 'synthetic',
      });
    }

    // Generate synthetic legitimate samples
    const targetLegitimateCount = targetSyntheticCount - targetFraudCount;
    for (let i = 0; i < targetLegitimateCount; i++) {
      if (legitimateSamples.length < 2) break;
      
      const idx1 = Math.floor(Math.random() * legitimateSamples.length);
      let idx2 = Math.floor(Math.random() * legitimateSamples.length);
      while (idx2 === idx1) idx2 = Math.floor(Math.random() * legitimateSamples.length);

      const sample1 = legitimateSamples[idx1];
      const sample2 = legitimateSamples[idx2];

      const syntheticFeatures = this.interpolateFeatures(
        sample1.features,
        sample2.features,
        Math.random()
      );

      syntheticSamples.push({
        id: `synth-legit-${i}`,
        features: syntheticFeatures,
        label: 0,
        weight: 0.8,
        source: 'synthetic',
      });
    }

    return syntheticSamples;
  }

  /**
   * Interpolate between two feature vectors
   */
  private static interpolateFeatures(f1: FeatureVector, f2: FeatureVector, alpha: number): FeatureVector {
    const keys: (keyof FeatureVector)[] = [
      'ridesPerHour', 'avgRideDistance', 'avgRideDuration', 'shortRideRatio',
      'nightRideRatio', 'weekendRideRatio', 'rideDistanceVariance', 'rideDurationVariance',
      'gpsAnomalyCount', 'impossibleSpeedCount', 'locationJumpCount', 'avgSpeedAnomaly',
      'maxSpeedAnomaly', 'gpsAccuracyIssueCount', 'repeatClientRatio', 'topClientConcentration',
      'samePairDailyCount', 'samePairWeeklyCount', 'collusionFlagCount', 'deviceCount',
      'activeDeviceCount', 'multiAccountIndicator', 'deviceChangeFrequency', 'flaggedDeviceCount',
      'peakHourRideRatio', 'offPeakHourRideRatio', 'rideTimeVariance', 'consecutiveRideRatio',
      'cancellationRate', 'completionRate', 'acceptanceRate', 'avgResponseTime',
      'avgFareAmount', 'fareVariance', 'cashRideRatio',
    ];

    const result: any = {};
    for (const key of keys) {
      const v1 = f1[key] as number ?? 0;
      const v2 = f2[key] as number ?? 0;
      result[key] = v1 + alpha * (v2 - v1);
    }

    return result as FeatureVector;
  }

  /**
   * Balance dataset to achieve target fraud ratio
   */
  private static balanceDataset(samples: TrainingSample[], config: TrainingConfig): TrainingSample[] {
    const fraudSamples = samples.filter(s => s.label === 1);
    const legitimateSamples = samples.filter(s => s.label === 0);

    if (fraudSamples.length === 0 || legitimateSamples.length === 0) {
      return samples;
    }

    const targetFraudCount = Math.floor(samples.length * config.fraudSampleRatio);
    const targetLegitCount = samples.length - targetFraudCount;

    // Oversample minority class
    let balancedFraud = [...fraudSamples];
    let balancedLegit = [...legitimateSamples];

    if (config.oversamplingMethod === 'random') {
      // Random oversampling
      while (balancedFraud.length < targetFraudCount) {
        const randomSample = fraudSamples[Math.floor(Math.random() * fraudSamples.length)];
        balancedFraud.push({ ...randomSample, id: `oversample-${balancedFraud.length}` });
      }

      while (balancedLegit.length < targetLegitCount) {
        const randomSample = legitimateSamples[Math.floor(Math.random() * legitimateSamples.length)];
        balancedLegit.push({ ...randomSample, id: `oversample-legit-${balancedLegit.length}` });
      }
    }

    // Trim to target counts
    balancedFraud = balancedFraud.slice(0, targetFraudCount);
    balancedLegit = balancedLegit.slice(0, targetLegitCount);

    // Shuffle
    const balanced = [...balancedFraud, ...balancedLegit];
    return this.shuffleArray(balanced);
  }

  /**
   * Normalize features to [0, 1] range
   */
  private static normalizeFeatures(samples: TrainingSample[]): void {
    const featureKeys: (keyof FeatureVector)[] = [
      'ridesPerHour', 'avgRideDistance', 'avgRideDuration', 'shortRideRatio',
      'nightRideRatio', 'weekendRideRatio', 'rideDistanceVariance', 'rideDurationVariance',
      'gpsAnomalyCount', 'impossibleSpeedCount', 'locationJumpCount', 'avgSpeedAnomaly',
      'maxSpeedAnomaly', 'gpsAccuracyIssueCount', 'repeatClientRatio', 'topClientConcentration',
      'samePairDailyCount', 'samePairWeeklyCount', 'collusionFlagCount', 'deviceCount',
      'activeDeviceCount', 'multiAccountIndicator', 'deviceChangeFrequency', 'flaggedDeviceCount',
      'peakHourRideRatio', 'offPeakHourRideRatio', 'rideTimeVariance', 'consecutiveRideRatio',
      'cancellationRate', 'completionRate', 'acceptanceRate', 'avgResponseTime',
      'avgFareAmount', 'fareVariance', 'cashRideRatio',
    ];

    // Calculate min/max for each feature
    const stats: Record<string, { min: number; max: number }> = {};
    
    for (const key of featureKeys) {
      const values = samples.map(s => (s.features[key] as number) ?? 0);
      stats[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    // Normalize
    for (const sample of samples) {
      for (const key of featureKeys) {
        const value = (sample.features[key] as number) ?? 0;
        const { min, max } = stats[key];
        if (max - min > 0) {
          (sample.features as any)[key] = (value - min) / (max - min);
        } else {
          (sample.features as any)[key] = 0;
        }
      }
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ============================================
// Model Training Service
// ============================================

export class ModelTrainingService {
  private static currentJob: TrainingJob | null = null;
  private static modelRegistry: Map<string, ModelVersion> = new Map();

  /**
   * Start a training job
   */
  static async startTraining(config: TrainingConfig = DEFAULT_TRAINING_CONFIG): Promise<TrainingJob> {
    if (this.currentJob && this.currentJob.status === 'running') {
      throw new Error('Training already in progress');
    }

    const job: TrainingJob = {
      id: `train-${Date.now()}`,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing',
    };

    this.currentJob = job;

    // Run training asynchronously
    this.runTraining(job, config).catch(error => {
      job.status = 'failed';
      job.error = error.message;
      console.error('Training failed:', error);
    });

    return job;
  }

  /**
   * Run the training pipeline
   */
  private static async runTraining(job: TrainingJob, config: TrainingConfig): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();

    try {
      // Step 1: Generate training data (20%)
      job.currentStep = 'Generating training data';
      job.progress = 5;
      const samples = await TrainingDataGenerator.generateTrainingDataset(config);
      job.progress = 20;

      // Step 2: Split data (25%)
      job.currentStep = 'Splitting data';
      const { trainSet, testSet } = this.splitData(samples, config.trainTestSplit);
      job.progress = 25;

      // Step 3: Train model (60%)
      job.currentStep = 'Training model';
      const model = await this.trainModel(trainSet, config);
      job.progress = 60;

      // Step 4: Cross-validation (75%)
      job.currentStep = 'Cross-validation';
      const cvMetrics = await this.crossValidate(trainSet, config);
      job.progress = 75;

      // Step 5: Evaluate on test set (85%)
      job.currentStep = 'Evaluating model';
      const testMetrics = this.evaluateModel(model, testSet);
      job.progress = 85;

      // Step 6: Create model version (95%)
      job.currentStep = 'Saving model version';
      const version = await this.createModelVersion(config, testMetrics, samples.length);
      job.progress = 95;

      // Step 7: Persist model
      await this.persistModel(version, model);
      job.progress = 100;

      // Complete
      job.status = 'completed';
      job.completedAt = new Date();
      job.metrics = testMetrics;
      job.modelVersion = version.version;

      console.log(`[ML Training] Training completed: ${version.version}`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Split data into train and test sets
   */
  private static splitData(samples: TrainingSample[], trainRatio: number): {
    trainSet: TrainingSample[];
    testSet: TrainingSample[];
  } {
    const shuffled = [...samples].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(shuffled.length * trainRatio);
    
    return {
      trainSet: shuffled.slice(0, splitIndex),
      testSet: shuffled.slice(splitIndex),
    };
  }

  /**
   * Train logistic regression model (simplified implementation)
   */
  private static async trainModel(samples: TrainingSample[], config: TrainingConfig): Promise<{
    weights: number[];
    bias: number;
    featureNames: string[];
  }> {
    const featureNames = this.getFeatureNames();
    const X = samples.map(s => this.featureVectorToArray(s.features, featureNames));
    const y = samples.map(s => s.label);
    const weights = samples.map(s => s.weight ?? 1.0);

    // Initialize weights
    let modelWeights = new Array(featureNames.length).fill(0);
    let bias = 0;

    // Gradient descent
    for (let iter = 0; iter < config.maxIterations; iter++) {
      let totalLoss = 0;
      const weightGradients = new Array(featureNames.length).fill(0);
      let biasGradient = 0;

      for (let i = 0; i < X.length; i++) {
        const prediction = this.sigmoid(this.dotProduct(X[i], modelWeights) + bias);
        const error = prediction - y[i];
        
        // Weighted gradients
        const weightedError = error * weights[i];
        
        for (let j = 0; j < featureNames.length; j++) {
          weightGradients[j] += weightedError * X[i][j] + config.regularization * modelWeights[j];
        }
        biasGradient += weightedError;

        // Cross-entropy loss
        totalLoss += -y[i] * Math.log(Math.max(prediction, 1e-10)) - 
                     (1 - y[i]) * Math.log(Math.max(1 - prediction, 1e-10));
      }

      // Update weights
      for (let j = 0; j < featureNames.length; j++) {
        modelWeights[j] -= config.learningRate * weightGradients[j] / X.length;
      }
      bias -= config.learningRate * biasGradient / X.length;

      // Early stopping
      if (totalLoss / X.length < 0.01) {
        console.log(`[ML Training] Converged at iteration ${iter}`);
        break;
      }
    }

    return { weights: modelWeights, bias, featureNames };
  }

  /**
   * Perform k-fold cross-validation
   */
  private static async crossValidate(samples: TrainingSample[], config: TrainingConfig): Promise<ModelMetrics> {
    const folds = config.crossValidationFolds;
    const foldSize = Math.floor(samples.length / folds);
    const metrics: ModelMetrics[] = [];

    for (let i = 0; i < folds; i++) {
      const valStart = i * foldSize;
      const valEnd = valStart + foldSize;
      
      const valSet = samples.slice(valStart, valEnd);
      const trainSet = [...samples.slice(0, valStart), ...samples.slice(valEnd)];

      const model = await this.trainModel(trainSet, config);
      const foldMetrics = this.evaluateModel(model, valSet);
      metrics.push(foldMetrics);
    }

    // Average metrics across folds
    return {
      accuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / folds,
      precision: metrics.reduce((sum, m) => sum + m.precision, 0) / folds,
      recall: metrics.reduce((sum, m) => sum + m.recall, 0) / folds,
      f1Score: metrics.reduce((sum, m) => sum + m.f1Score, 0) / folds,
      auc: metrics.reduce((sum, m) => sum + m.auc, 0) / folds,
      confusionMatrix: {
        truePositives: metrics.reduce((sum, m) => sum + m.confusionMatrix.truePositives, 0),
        trueNegatives: metrics.reduce((sum, m) => sum + m.confusionMatrix.trueNegatives, 0),
        falsePositives: metrics.reduce((sum, m) => sum + m.confusionMatrix.falsePositives, 0),
        falseNegatives: metrics.reduce((sum, m) => sum + m.confusionMatrix.falseNegatives, 0),
      },
      featureImportance: this.averageFeatureImportance(metrics),
    };
  }

  /**
   * Evaluate model on test set
   */
  private static evaluateModel(model: { weights: number[]; bias: number; featureNames: string[] }, samples: TrainingSample[]): ModelMetrics {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    const predictions: { actual: number; predicted: number; probability: number }[] = [];

    for (const sample of samples) {
      const x = this.featureVectorToArray(sample.features, model.featureNames);
      const probability = this.sigmoid(this.dotProduct(x, model.weights) + model.bias);
      const predicted = probability >= 0.5 ? 1 : 0;
      const actual = sample.label;

      predictions.push({ actual, predicted, probability });

      if (actual === 1 && predicted === 1) tp++;
      else if (actual === 0 && predicted === 0) tn++;
      else if (actual === 0 && predicted === 1) fp++;
      else fn++;
    }

    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    const auc = this.calculateAUC(predictions);

    // Feature importance (absolute weight values)
    const featureImportance: Record<string, number> = {};
    for (let i = 0; i < model.featureNames.length; i++) {
      featureImportance[model.featureNames[i]] = Math.abs(model.weights[i]);
    }

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      auc,
      confusionMatrix: {
        truePositives: tp,
        trueNegatives: tn,
        falsePositives: fp,
        falseNegatives: fn,
      },
      featureImportance,
    };
  }

  /**
   * Calculate AUC-ROC
   */
  private static calculateAUC(predictions: { actual: number; probability: number }[]): number {
    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
    let auc = 0;
    let tpCount = 0;
    let fpCount = 0;
    const totalPositives = predictions.filter(p => p.actual === 1).length;
    const totalNegatives = predictions.filter(p => p.actual === 0).length;

    if (totalPositives === 0 || totalNegatives === 0) return 0;

    for (const pred of sorted) {
      if (pred.actual === 1) {
        tpCount++;
      } else {
        fpCount++;
        auc += tpCount;
      }
    }

    return auc / (totalPositives * totalNegatives);
  }

  /**
   * Create model version record
   */
  private static async createModelVersion(config: TrainingConfig, metrics: ModelMetrics, sampleCount: number): Promise<ModelVersion> {
    const version = `v${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString(36)}`;
    const fraudSamples = Math.floor(sampleCount * config.fraudSampleRatio);

    const modelVersion: ModelVersion = {
      version,
      trainedAt: new Date(),
      metrics,
      featureCount: this.getFeatureNames().length,
      sampleCount,
      fraudRatio: fraudSamples / sampleCount,
      hyperparameters: {
        learningRate: config.learningRate,
        maxIterations: config.maxIterations,
        regularization: config.regularization,
        crossValidationFolds: config.crossValidationFolds,
      },
      thresholds: {
        lowRisk: config.riskThresholds.low,
        mediumRisk: config.riskThresholds.medium,
        highRisk: config.riskThresholds.high,
        criticalRisk: config.riskThresholds.critical,
      },
    };

    // Store in registry
    this.modelRegistry.set(version, modelVersion);

    // Persist to database
    await db.fraudSystemConfig.create({
      data: {
        configKey: `model_version_${version}`,
        configValue: JSON.stringify(modelVersion),
        description: `ML Model Version ${version}`,
      },
    });

    // Set as current version
    await db.fraudSystemConfig.upsert({
      where: { configKey: 'current_model_version' },
      create: {
        configKey: 'current_model_version',
        configValue: version,
        description: 'Current active ML model version',
      },
      update: {
        configValue: version,
      },
    });

    return modelVersion;
  }

  /**
   * Persist model weights
   */
  private static async persistModel(version: ModelVersion, model: { weights: number[]; bias: number; featureNames: string[] }): Promise<void> {
    await db.fraudSystemConfig.create({
      data: {
        configKey: `model_weights_${version.version}`,
        configValue: JSON.stringify({
          weights: model.weights,
          bias: model.bias,
          featureNames: model.featureNames,
        }),
        description: `Model weights for ${version.version}`,
      },
    });
  }

  /**
   * Get current training job status
   */
  static getTrainingStatus(): TrainingJob | null {
    return this.currentJob;
  }

  /**
   * Get model version details
   */
  static async getModelVersion(version: string): Promise<ModelVersion | null> {
    // Check registry first
    if (this.modelRegistry.has(version)) {
      return this.modelRegistry.get(version)!;
    }

    // Load from database
    const config = await db.fraudSystemConfig.findUnique({
      where: { configKey: `model_version_${version}` },
    });

    if (!config) return null;

    return JSON.parse(config.configValue) as ModelVersion;
  }

  /**
   * Get current active model version
   */
  static async getCurrentModelVersion(): Promise<ModelVersion | null> {
    const config = await db.fraudSystemConfig.findUnique({
      where: { configKey: 'current_model_version' },
    });

    if (!config) return null;
    return this.getModelVersion(config.configValue);
  }

  /**
   * Predict fraud probability for a feature vector
   */
  static async predict(features: FeatureVector): Promise<{ probability: number; riskLevel: string }> {
    const version = await this.getCurrentModelVersion();
    if (!version) {
      throw new Error('No model version available');
    }

    const modelConfig = await db.fraudSystemConfig.findUnique({
      where: { configKey: `model_weights_${version.version}` },
    });

    if (!modelConfig) {
      throw new Error('Model weights not found');
    }

    const { weights, bias, featureNames } = JSON.parse(modelConfig.configValue);
    const x = this.featureVectorToArray(features, featureNames);
    const probability = this.sigmoid(this.dotProduct(x, weights) + bias);

    // Determine risk level
    let riskLevel = 'LOW';
    if (probability * 100 >= version.thresholds.criticalRisk) riskLevel = 'CRITICAL';
    else if (probability * 100 >= version.thresholds.highRisk) riskLevel = 'HIGH';
    else if (probability * 100 >= version.thresholds.mediumRisk) riskLevel = 'MEDIUM';

    return { probability, riskLevel };
  }

  // Helper methods
  private static getFeatureNames(): string[] {
    return [
      'ridesPerHour', 'avgRideDistance', 'avgRideDuration', 'shortRideRatio',
      'nightRideRatio', 'weekendRideRatio', 'rideDistanceVariance', 'rideDurationVariance',
      'gpsAnomalyCount', 'impossibleSpeedCount', 'locationJumpCount', 'avgSpeedAnomaly',
      'maxSpeedAnomaly', 'gpsAccuracyIssueCount', 'repeatClientRatio', 'topClientConcentration',
      'samePairDailyCount', 'samePairWeeklyCount', 'collusionFlagCount', 'deviceCount',
      'activeDeviceCount', 'multiAccountIndicator', 'deviceChangeFrequency', 'flaggedDeviceCount',
      'peakHourRideRatio', 'offPeakHourRideRatio', 'rideTimeVariance', 'consecutiveRideRatio',
      'cancellationRate', 'completionRate', 'acceptanceRate', 'avgResponseTime',
      'avgFareAmount', 'fareVariance', 'cashRideRatio',
    ];
  }

  private static featureVectorToArray(features: FeatureVector, featureNames: string[]): number[] {
    return featureNames.map(name => (features as any)[name] ?? 0);
  }

  private static sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private static dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  private static averageFeatureImportance(metrics: ModelMetrics[]): Record<string, number> {
    const keys = Object.keys(metrics[0]?.featureImportance || {});
    const result: Record<string, number> = {};
    
    for (const key of keys) {
      result[key] = metrics.reduce((sum, m) => sum + (m.featureImportance[key] || 0), 0) / metrics.length;
    }
    
    return result;
  }
}

// ============================================
// Scheduled Training Service
// ============================================

export class ScheduledTrainingService {
  private static intervalId: NodeJS.Timeout | null = null;
  private static lastTrainingDate: Date | null = null;

  /**
   * Start scheduled training (weekly by default)
   */
  static startScheduledTraining(intervalDays: number = 7): void {
    // Check every hour if training is needed
    this.intervalId = setInterval(() => {
      this.checkAndTrain(intervalDays);
    }, 60 * 60 * 1000); // Check every hour

    // Also run initial check
    this.checkAndTrain(intervalDays);
    
    console.log(`[ML Training] Scheduled training started with ${intervalDays} day interval`);
  }

  /**
   * Stop scheduled training
   */
  static stopScheduledTraining(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[ML Training] Scheduled training stopped');
  }

  /**
   * Check if training is needed and run if so
   */
  private static async checkAndTrain(intervalDays: number): Promise<void> {
    const lastTraining = await this.getLastTrainingDate();
    const now = new Date();

    if (lastTraining) {
      const daysSinceLastTraining = (now.getTime() - lastTraining.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastTraining < intervalDays) {
        return; // Not time yet
      }
    }

    console.log('[ML Training] Starting scheduled training...');
    
    try {
      // Load config from database or use defaults
      const config = await this.loadTrainingConfig();
      const job = await ModelTrainingService.startTraining(config);
      
      this.lastTrainingDate = now;
      await this.saveLastTrainingDate(now);
      
      console.log(`[ML Training] Scheduled training started: ${job.id}`);
    } catch (error) {
      console.error('[ML Training] Scheduled training failed:', error);
    }
  }

  /**
   * Get last training date from database
   */
  private static async getLastTrainingDate(): Promise<Date | null> {
    const config = await db.fraudSystemConfig.findUnique({
      where: { configKey: 'last_training_date' },
    });

    return config ? new Date(config.configValue) : null;
  }

  /**
   * Save last training date to database
   */
  private static async saveLastTrainingDate(date: Date): Promise<void> {
    await db.fraudSystemConfig.upsert({
      where: { configKey: 'last_training_date' },
      create: {
        configKey: 'last_training_date',
        configValue: date.toISOString(),
        description: 'Last ML model training date',
      },
      update: {
        configValue: date.toISOString(),
      },
    });
  }

  /**
   * Load training config from database
   */
  private static async loadTrainingConfig(): Promise<TrainingConfig> {
    const config = await db.fraudSystemConfig.findUnique({
      where: { configKey: 'training_config' },
    });

    if (config) {
      return { ...DEFAULT_TRAINING_CONFIG, ...JSON.parse(config.configValue) };
    }

    return DEFAULT_TRAINING_CONFIG;
  }

  /**
   * Auto-tune thresholds based on recent performance
   */
  static async autoTuneThresholds(): Promise<void> {
    const version = await ModelTrainingService.getCurrentModelVersion();
    if (!version) return;

    // Get recent alerts and their outcomes
    const recentAlerts = await db.fraudAlert.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        status: { in: ['RESOLVED', 'DISMISSED'] },
      },
      select: {
        riskScoreAtDetection: true,
        adminDecision: true,
        isFalsePositive: true,
      },
    });

    if (recentAlerts.length < 10) return;

    // Calculate false positive rate by threshold
    const thresholds = [25, 50, 75, 90];
    const falsePositiveRates: Record<number, number> = {};

    for (const threshold of thresholds) {
      const alertsAtThreshold = recentAlerts.filter(a => a.riskScoreAtDetection >= threshold);
      const falsePositives = alertsAtThreshold.filter(a => a.isFalsePositive || a.adminDecision === 'FALSE_POSITIVE').length;
      
      if (alertsAtThreshold.length > 0) {
        falsePositiveRates[threshold] = falsePositives / alertsAtThreshold.length;
      }
    }

    // Adjust thresholds if false positive rate is too high
    const targetFPR = 0.1; // 10% target false positive rate
    let adjustmentNeeded = false;
    const newThresholds = { ...version.thresholds };

    for (const [threshold, fpr] of Object.entries(falsePositiveRates)) {
      if (fpr > targetFPR + 0.05) {
        // Increase threshold to reduce false positives
        const thresholdNum = parseInt(threshold);
        if (thresholdNum === 25) newThresholds.lowRisk = Math.min(35, newThresholds.lowRisk + 5);
        else if (thresholdNum === 50) newThresholds.mediumRisk = Math.min(65, newThresholds.mediumRisk + 5);
        else if (thresholdNum === 75) newThresholds.highRisk = Math.min(85, newThresholds.highRisk + 5);
        else if (thresholdNum === 90) newThresholds.criticalRisk = Math.min(95, newThresholds.criticalRisk + 5);
        adjustmentNeeded = true;
      }
    }

    if (adjustmentNeeded) {
      // Save new thresholds
      await db.fraudSystemConfig.upsert({
        where: { configKey: `model_version_${version.version}` },
        create: {
          configKey: `model_version_${version.version}`,
          configValue: JSON.stringify({ ...version, thresholds: newThresholds }),
          description: `Updated thresholds for ${version.version}`,
        },
        update: {
          configValue: JSON.stringify({ ...version, thresholds: newThresholds }),
        },
      });

      console.log('[ML Training] Thresholds auto-tuned:', newThresholds);
    }
  }
}

// Export all components
export default {
  FeatureExtractor,
  TrainingDataGenerator,
  ModelTrainingService,
  ScheduledTrainingService,
  DEFAULT_TRAINING_CONFIG,
};

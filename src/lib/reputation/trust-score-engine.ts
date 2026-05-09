/**
 * Smart Ride - Driver Reputation & Trust Score Engine
 * 
 * This engine calculates and manages driver trust scores based on:
 * - Rider Ratings (40% weight)
 * - Ride Completion Rate (20% weight)
 * - Acceptance Rate (15% weight)
 * - Safety Score (15% weight)
 * - Fraud Risk Score (10% weight)
 */

import { db } from '@/lib/db';
import { 
  DriverReputation, 
  DriverReputationHistory, 
  DriverTrustConfig,
  TrustTier,
  ScoreTriggerType,
  DriverPerformanceAlert,
  PerformanceAlertType,
  DriverSafetyEvent,
  SafetyEventType,
  SafetyEventSeverity,
  AlertSeverity
} from '@prisma/client';

// Default configuration values
const DEFAULT_CONFIG = {
  ratingWeight: 0.40,
  completionWeight: 0.20,
  acceptanceWeight: 0.15,
  safetyWeight: 0.15,
  fraudRiskWeight: 0.10,
  
  platinumThreshold: 90.0,
  goldThreshold: 80.0,
  silverThreshold: 70.0,
  warningThreshold: 60.0,
  
  excellentRating: 4.8,
  goodRating: 4.5,
  averageRating: 4.0,
  poorRating: 3.5,
  
  excellentCompletion: 0.95,
  goodCompletion: 0.90,
  averageCompletion: 0.85,
  poorCompletion: 0.80,
  
  excellentAcceptance: 0.90,
  goodAcceptance: 0.80,
  averageAcceptance: 0.70,
  poorAcceptance: 0.60,
  
  speedingPenalty: 5.0,
  routeDeviationPenalty: 10.0,
  unexplainedStopPenalty: 3.0,
  sosPenalty: 0.0,
  criticalSafetyPenalty: 30.0,
  
  gpsSpoofingPenalty: 50.0,
  fakeCompletionPenalty: 40.0,
  suspiciousPatternPenalty: 25.0,
  
  autoSuspendThreshold: 50.0,
  autoSuspendDuration: 7,
  warningThreshold1: 65.0,
  warningThreshold2: 60.0,
  
  streakBonusThreshold: 10,
  streakBonusAmount: 5.0,
  streakBreakPenalty: 3.0,
  
  scoreDecayDays: 30,
  scoreDecayRate: 0.5,
  recentMetricsWindow: 30,
};

// Type definitions
interface TrustScoreComponents {
  ratingScore: number;
  completionScore: number;
  acceptanceScore: number;
  safetyScore: number;
  fraudRiskScore: number;
}

interface ScoreCalculationResult {
  trustScore: number;
  trustTier: TrustTier;
  components: TrustScoreComponents;
  scoreChange: number;
  tierChanged: boolean;
  previousTier: TrustTier;
}

interface RatingData {
  score: number;
  punctualityScore?: number | null;
  professionalismScore?: number | null;
  vehicleConditionScore?: number | null;
  comment?: string | null;
}

interface SafetyEventData {
  eventType: SafetyEventType;
  severity: SafetyEventSeverity;
  taskId?: string;
  latitude?: number;
  longitude?: number;
  speedKmh?: number;
  speedLimitKmh?: number;
  deviationDistance?: number;
  stopDuration?: number;
  detectionSource: string;
  confidence?: number;
}

/**
 * Get or create driver reputation record
 */
export async function getOrCreateReputation(riderId: string): Promise<DriverReputation> {
  let reputation = await db.driverReputation.findUnique({
    where: { riderId }
  });
  
  if (!reputation) {
    reputation = await db.driverReputation.create({
      data: { riderId }
    });
  }
  
  return reputation;
}

/**
 * Get trust score configuration
 */
export async function getTrustConfig(): Promise<DriverTrustConfig> {
  let config = await db.driverTrustConfig.findFirst({
    where: { isActive: true }
  });
  
  if (!config) {
    config = await db.driverTrustConfig.create({
      data: DEFAULT_CONFIG
    });
  }
  
  return config;
}

/**
 * Calculate rating score from average rating (converts 1-5 scale to 0-100)
 */
function calculateRatingScore(averageRating: number, config: DriverTrustConfig): number {
  // Convert 1-5 rating to 0-100 score
  // 5.0 = 100, 4.0 = 80, 3.0 = 60, 2.0 = 40, 1.0 = 20
  if (averageRating >= config.excellentRating) return 100;
  if (averageRating >= config.goodRating) return 90 + ((averageRating - config.goodRating) / (config.excellentRating - config.goodRating)) * 10;
  if (averageRating >= config.averageRating) return 70 + ((averageRating - config.averageRating) / (config.goodRating - config.averageRating)) * 20;
  if (averageRating >= config.poorRating) return 50 + ((averageRating - config.poorRating) / (config.averageRating - config.poorRating)) * 20;
  return Math.max(20, 20 + ((averageRating - 1) / (config.poorRating - 1)) * 30);
}

/**
 * Calculate completion score from completion rate
 */
function calculateCompletionScore(completionRate: number, config: DriverTrustConfig): number {
  if (completionRate >= config.excellentCompletion) return 100;
  if (completionRate >= config.goodCompletion) return 85 + ((completionRate - config.goodCompletion) / (config.excellentCompletion - config.goodCompletion)) * 15;
  if (completionRate >= config.averageCompletion) return 70 + ((completionRate - config.averageCompletion) / (config.goodCompletion - config.averageCompletion)) * 15;
  if (completionRate >= config.poorCompletion) return 50 + ((completionRate - config.poorCompletion) / (config.averageCompletion - config.poorCompletion)) * 20;
  return Math.max(20, completionRate / config.poorCompletion * 50);
}

/**
 * Calculate acceptance score from acceptance rate
 */
function calculateAcceptanceScore(acceptanceRate: number, config: DriverTrustConfig): number {
  if (acceptanceRate >= config.excellentAcceptance) return 100;
  if (acceptanceRate >= config.goodAcceptance) return 85 + ((acceptanceRate - config.goodAcceptance) / (config.excellentAcceptance - config.goodAcceptance)) * 15;
  if (acceptanceRate >= config.averageAcceptance) return 70 + ((acceptanceRate - config.averageAcceptance) / (config.goodAcceptance - config.averageAcceptance)) * 15;
  if (acceptanceRate >= config.poorAcceptance) return 50 + ((acceptanceRate - config.poorAcceptance) / (config.averageAcceptance - config.poorAcceptance)) * 20;
  return Math.max(20, acceptanceRate / config.poorAcceptance * 50);
}

/**
 * Determine trust tier from score
 */
function determineTrustTier(score: number, config: DriverTrustConfig): TrustTier {
  if (score >= config.platinumThreshold) return TrustTier.PLATINUM;
  if (score >= config.goldThreshold) return TrustTier.GOLD;
  if (score >= config.silverThreshold) return TrustTier.SILVER;
  if (score >= config.warningThreshold) return TrustTier.WARNING;
  return TrustTier.SUSPENDED;
}

/**
 * Calculate full trust score from components
 */
export async function calculateTrustScore(
  reputation: DriverReputation,
  config: DriverTrustConfig
): Promise<ScoreCalculationResult> {
  const components: TrustScoreComponents = {
    ratingScore: calculateRatingScore(reputation.averageRating, config),
    completionScore: calculateCompletionScore(reputation.completionRate, config),
    acceptanceScore: calculateAcceptanceScore(reputation.acceptanceRate, config),
    safetyScore: reputation.safetyScore,
    fraudRiskScore: reputation.fraudRiskScore,
  };
  
  // Calculate weighted trust score
  const trustScore = 
    (components.ratingScore * config.ratingWeight) +
    (components.completionScore * config.completionWeight) +
    (components.acceptanceScore * config.acceptanceWeight) +
    (components.safetyScore * config.safetyWeight) +
    (components.fraudRiskScore * config.fraudRiskWeight);
  
  // Clamp to 0-100
  const clampedScore = Math.max(0, Math.min(100, trustScore));
  
  // Determine tier
  const trustTier = determineTrustTier(clampedScore, config);
  const previousTier = reputation.trustTier;
  
  return {
    trustScore: clampedScore,
    trustTier,
    components,
    scoreChange: clampedScore - reputation.trustScore,
    tierChanged: trustTier !== previousTier,
    previousTier,
  };
}

/**
 * Record a new rating and update trust score
 */
export async function recordRating(
  riderId: string,
  taskId: string,
  ratingData: RatingData
): Promise<DriverReputation> {
  const config = await getTrustConfig();
  const reputation = await getOrCreateReputation(riderId);
  
  // Update rating counts
  const ratingCounts = {
    fiveStarRatings: reputation.fiveStarRatings + (ratingData.score === 5 ? 1 : 0),
    fourStarRatings: reputation.fourStarRatings + (ratingData.score === 4 ? 1 : 0),
    threeStarRatings: reputation.threeStarRatings + (ratingData.score === 3 ? 1 : 0),
    twoStarRatings: reputation.twoStarRatings + (ratingData.score === 2 ? 1 : 0),
    oneStarRatings: reputation.oneStarRatings + (ratingData.score === 1 ? 1 : 0),
  };
  
  const totalRatings = reputation.totalRatings + 1;
  
  // Calculate new average rating
  const ratingSum = 
    (ratingCounts.fiveStarRatings * 5) +
    (ratingCounts.fourStarRatings * 4) +
    (ratingCounts.threeStarRatings * 3) +
    (ratingCounts.twoStarRatings * 2) +
    (ratingCounts.oneStarRatings * 1);
  
  const averageRating = ratingSum / totalRatings;
  
  // Check for streak update
  let streakUpdate: Record<string, unknown> = {};
  const isGoodRating = ratingData.score >= 4;
  
  if (isGoodRating) {
    const newStreak = reputation.currentStreak + 1;
    streakUpdate = {
      currentStreak: newStreak,
      longestStreak: Math.max(reputation.longestStreak, newStreak),
      lastStreakUpdateAt: new Date(),
    };
    
    // Streak bonus
    if (newStreak === config.streakBonusThreshold) {
      await createIncentive(reputation.id, 'STREAK_BONUS', `Achieved ${newStreak} ride streak!`, config.streakBonusAmount);
      await createPerformanceAlert(
        reputation.id,
        PerformanceAlertType.STREAK_ACHIEVED,
        AlertSeverity.LOW,
        'Streak Achievement!',
        `Amazing! You've completed ${newStreak} rides with great ratings in a row!`,
        newStreak,
        config.streakBonusThreshold
      );
    }
  } else {
    // Break streak on bad rating
    if (reputation.currentStreak > 0) {
      streakUpdate = {
        currentStreak: 0,
        lastStreakUpdateAt: new Date(),
      };
      
      await createPerformanceAlert(
        reputation.id,
        PerformanceAlertType.STREAK_BROKEN,
        AlertSeverity.LOW,
        'Streak Ended',
        `Your ${reputation.currentStreak}-ride streak has ended. Start a new one!`,
        0,
        reputation.currentStreak
      );
    }
  }
  
  // Check for complaints vs compliments
  let complaintUpdate: Record<string, unknown> = {};
  if (ratingData.score <= 2 && ratingData.comment) {
    complaintUpdate = { totalComplaints: reputation.totalComplaints + 1 };
  } else if (ratingData.score === 5 && ratingData.comment) {
    complaintUpdate = { totalCompliments: reputation.totalCompliments + 1 };
  }
  
  // Update reputation
  const updatedReputation = await db.driverReputation.update({
    where: { id: reputation.id },
    data: {
      averageRating,
      totalRatings,
      ...ratingCounts,
      lastRatingAt: new Date(),
      ...streakUpdate,
      ...complaintUpdate,
    }
  });
  
  // Calculate new trust score
  const scoreResult = await calculateTrustScore(updatedReputation, config);
  
  // Update with new score
  const finalReputation = await updateTrustScore(
    updatedReputation.id,
    scoreResult,
    ScoreTriggerType.RATING_RECEIVED,
    `Received ${ratingData.score}-star rating`,
    taskId
  );
  
  // Create alerts for rating changes
  if (ratingData.score <= 2) {
    await createPerformanceAlert(
      finalReputation.id,
      PerformanceAlertType.RATING_DECLINED,
      AlertSeverity.MEDIUM,
      'Low Rating Received',
      `You received a ${ratingData.score}-star rating. This affects your overall score. Focus on providing excellent service to improve!`,
      averageRating,
      config.goodRating
    );
  } else if (averageRating >= config.excellentRating && reputation.averageRating < config.excellentRating) {
    await createPerformanceAlert(
      finalReputation.id,
      PerformanceAlertType.RATING_IMPROVED,
      AlertSeverity.LOW,
      'Excellent Rating!',
      `Congratulations! Your average rating has reached ${averageRating.toFixed(2)} stars. Keep up the great work!`,
      averageRating,
      config.excellentRating
    );
  }
  
  // Check for rating warning
  if (averageRating < config.poorRating) {
    await createPerformanceAlert(
      finalReputation.id,
      PerformanceAlertType.RATING_WARNING,
      AlertSeverity.HIGH,
      'Rating Warning',
      `Your average rating (${averageRating.toFixed(2)}) is below the acceptable threshold. Your account may be at risk if it doesn't improve.`,
      averageRating,
      config.poorRating,
      'Focus on punctuality, friendly service, and vehicle cleanliness to improve your ratings.'
    );
  }
  
  return finalReputation;
}

/**
 * Record task completion and update metrics
 */
export async function recordTaskCompletion(
  riderId: string,
  taskId: string,
  wasOnTime: boolean,
  delayMinutes: number = 0
): Promise<DriverReputation> {
  const config = await getTrustConfig();
  const reputation = await getOrCreateReputation(riderId);
  
  const totalTasksAssigned = reputation.totalTasksAssigned + 1;
  const totalTasksCompleted = reputation.totalTasksCompleted + 1;
  const completionRate = totalTasksCompleted / totalTasksAssigned;
  
  const onTimeArrivals = reputation.onTimeArrivals + (wasOnTime ? 1 : 0);
  const lateArrivals = reputation.lateArrivals + (wasOnTime ? 0 : 1);
  const totalArrivals = onTimeArrivals + lateArrivals;
  const onTimeRate = totalArrivals > 0 ? onTimeArrivals / totalArrivals : 1;
  
  // Calculate rolling average arrival delay
  const averageArrivalDelay = 
    (reputation.averageArrivalDelay * reputation.lateArrivals + delayMinutes) / 
    (reputation.lateArrivals + (wasOnTime ? 0 : 1));
  
  const updatedReputation = await db.driverReputation.update({
    where: { id: reputation.id },
    data: {
      totalTasksAssigned,
      totalTasksCompleted,
      completionRate,
      onTimeArrivals,
      lateArrivals,
      onTimeRate,
      averageArrivalDelay,
      lastTaskAt: new Date(),
    }
  });
  
  // Calculate new trust score
  const scoreResult = await calculateTrustScore(updatedReputation, config);
  
  const finalReputation = await updateTrustScore(
    updatedReputation.id,
    scoreResult,
    ScoreTriggerType.TASK_COMPLETED,
    'Task completed successfully',
    taskId
  );
  
  // Check for completion rate warning
  if (completionRate < config.poorCompletion) {
    await createPerformanceAlert(
      finalReputation.id,
      PerformanceAlertType.COMPLETION_LOW,
      AlertSeverity.HIGH,
      'Low Completion Rate',
      `Your completion rate (${(completionRate * 100).toFixed(1)}%) is below the acceptable threshold. Canceling rides hurts your score.`,
      completionRate * 100,
      config.poorCompletion * 100,
      'Only accept rides you intend to complete. Canceling affects your reliability score.'
    );
  }
  
  return finalReputation;
}

/**
 * Record task cancellation
 */
export async function recordTaskCancellation(
  riderId: string,
  taskId: string,
  reason?: string
): Promise<DriverReputation> {
  const config = await getTrustConfig();
  const reputation = await getOrCreateReputation(riderId);
  
  const totalTasksAssigned = reputation.totalTasksAssigned + 1;
  const totalTasksCancelled = reputation.totalTasksCancelled + 1;
  const cancellationRate = totalTasksCancelled / totalTasksAssigned;
  const completionRate = reputation.totalTasksCompleted / totalTasksAssigned;
  
  const updatedReputation = await db.driverReputation.update({
    where: { id: reputation.id },
    data: {
      totalTasksAssigned,
      totalTasksCancelled,
      cancellationRate,
      completionRate,
      lastTaskAt: new Date(),
    }
  });
  
  // Calculate new trust score
  const scoreResult = await calculateTrustScore(updatedReputation, config);
  
  const finalReputation = await updateTrustScore(
    updatedReputation.id,
    scoreResult,
    ScoreTriggerType.TASK_CANCELLED,
    reason || 'Task cancelled by driver',
    taskId
  );
  
  // Check for high cancellation rate
  if (cancellationRate > (1 - config.poorCompletion)) {
    await createPerformanceAlert(
      finalReputation.id,
      PerformanceAlertType.CANCELLATION_HIGH,
      AlertSeverity.HIGH,
      'High Cancellation Rate',
      `Your cancellation rate (${(cancellationRate * 100).toFixed(1)}%) is too high. This affects your trust score and may impact your ability to receive rides.`,
      cancellationRate * 100,
      (1 - config.poorCompletion) * 100,
      'Only accept rides you can complete. Consider your availability before accepting.'
    );
  }
  
  return finalReputation;
}

/**
 * Record ride request response
 */
export async function recordRequestResponse(
  riderId: string,
  accepted: boolean,
  ignored: boolean = false
): Promise<DriverReputation> {
  const config = await getTrustConfig();
  const reputation = await getOrCreateReputation(riderId);
  
  const updateData: Record<string, unknown> = {
    totalRequestsReceived: reputation.totalRequestsReceived + 1,
  };
  
  if (accepted) {
    updateData.totalRequestsAccepted = reputation.totalRequestsAccepted + 1;
  } else if (ignored) {
    updateData.totalRequestsIgnored = reputation.totalRequestsIgnored + 1;
  } else {
    updateData.totalRequestsDeclined = reputation.totalRequestsDeclined + 1;
  }
  
  const totalResponded = accepted ? (reputation.totalRequestsAccepted + 1) : reputation.totalRequestsAccepted;
  updateData.acceptanceRate = (updateData.totalRequestsReceived as number) > 0 
    ? totalResponded / (updateData.totalRequestsReceived as number) 
    : 1;
  
  const updatedReputation = await db.driverReputation.update({
    where: { id: reputation.id },
    data: updateData as Partial<DriverReputation>,
  });
  
  // Calculate new trust score
  const scoreResult = await calculateTrustScore(updatedReputation, config);
  
  return updateTrustScore(
    updatedReputation.id,
    scoreResult,
    accepted ? ScoreTriggerType.REQUEST_ACCEPTED : ScoreTriggerType.REQUEST_DECLINED,
    accepted ? 'Ride request accepted' : 'Ride request declined'
  );
}

/**
 * Record safety event
 */
export async function recordSafetyEvent(
  riderId: string,
  eventData: SafetyEventData
): Promise<{ reputation: DriverReputation; safetyEvent: DriverSafetyEvent }> {
  const config = await getTrustConfig();
  const reputation = await getOrCreateReputation(riderId);
  
  // Calculate penalty based on event type and severity
  let penalty = 0;
  switch (eventData.eventType) {
    case SafetyEventType.EXCESSIVE_SPEEDING:
      penalty = config.criticalSafetyPenalty;
      break;
    case SafetyEventType.MODERATE_SPEEDING:
      penalty = config.speedingPenalty;
      break;
    case SafetyEventType.ROUTE_DEVIATION:
      penalty = config.routeDeviationPenalty;
      break;
    case SafetyEventType.UNEXPLAINED_STOP:
      penalty = config.unexplainedStopPenalty;
      break;
    case SafetyEventType.SOS_TRIGGERED:
      penalty = config.sosPenalty; // No penalty for SOS
      break;
    default:
      penalty = eventData.severity === SafetyEventSeverity.CRITICAL ? config.criticalSafetyPenalty :
                eventData.severity === SafetyEventSeverity.HIGH ? 15 :
                eventData.severity === SafetyEventSeverity.MEDIUM ? 5 : 0;
  }
  
  // Apply penalty multiplier based on severity
  const severityMultiplier = 
    eventData.severity === SafetyEventSeverity.CRITICAL ? 2.0 :
    eventData.severity === SafetyEventSeverity.HIGH ? 1.5 :
    eventData.severity === SafetyEventSeverity.MEDIUM ? 1.0 : 0.5;
  
  const finalPenalty = penalty * severityMultiplier;
  const newSafetyScore = Math.max(0, reputation.safetyScore - finalPenalty);
  
  // Create safety event record
  const safetyEvent = await db.driverSafetyEvent.create({
    data: {
      reputationId: reputation.id,
      eventType: eventData.eventType,
      severity: eventData.severity,
      taskId: eventData.taskId,
      latitude: eventData.latitude,
      longitude: eventData.longitude,
      speedKmh: eventData.speedKmh,
      speedLimitKmh: eventData.speedLimitKmh,
      deviationDistance: eventData.deviationDistance,
      stopDuration: eventData.stopDuration,
      detectionSource: eventData.detectionSource,
      confidence: eventData.confidence,
      scoreImpact: finalPenalty,
      trustScoreBefore: reputation.trustScore,
      trustScoreAfter: 0, // Will update after score calculation
    }
  });
  
  // Update safety score
  const updatedReputation = await db.driverReputation.update({
    where: { id: reputation.id },
    data: {
      safetyScore: newSafetyScore,
      totalSafetyEvents: reputation.totalSafetyEvents + 1,
      speedingEvents: reputation.speedingEvents + 
        ([SafetyEventType.EXCESSIVE_SPEEDING, SafetyEventType.MODERATE_SPEEDING].includes(eventData.eventType) ? 1 : 0),
      routeDeviationEvents: reputation.routeDeviationEvents + 
        (eventData.eventType === SafetyEventType.ROUTE_DEVIATION ? 1 : 0),
      unexplainedStopEvents: reputation.unexplainedStopEvents + 
        (eventData.eventType === SafetyEventType.UNEXPLAINED_STOP ? 1 : 0),
      sosAlerts: reputation.sosAlerts + 
        (eventData.eventType === SafetyEventType.SOS_TRIGGERED ? 1 : 0),
    }
  });
  
  // Calculate new trust score
  const scoreResult = await calculateTrustScore(updatedReputation, config);
  
  const finalReputation = await updateTrustScore(
    updatedReputation.id,
    scoreResult,
    ScoreTriggerType.SAFETY_EVENT,
    `Safety event: ${eventData.eventType}`,
    eventData.taskId
  );
  
  // Update safety event with new trust score
  await db.driverSafetyEvent.update({
    where: { id: safetyEvent.id },
    data: { trustScoreAfter: finalReputation.trustScore }
  });
  
  // Create performance alert
  if (eventData.severity !== SafetyEventSeverity.LOW) {
    await createPerformanceAlert(
      finalReputation.id,
      PerformanceAlertType.SAFETY_WARNING,
      eventData.severity === SafetyEventSeverity.CRITICAL ? AlertSeverity.CRITICAL :
      eventData.severity === SafetyEventSeverity.HIGH ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
      'Safety Event Detected',
      `A safety concern was detected: ${eventData.eventType.replace(/_/g, ' ').toLowerCase()}. This affects your trust score.`,
      newSafetyScore,
      100,
      'Follow traffic rules and drive safely. Safety events significantly impact your trust score.'
    );
  }
  
  return { reputation: finalReputation, safetyEvent };
}

/**
 * Record fraud signal
 */
export async function recordFraudSignal(
  riderId: string,
  fraudType: 'GPS_SPOOFING' | 'FAKE_COMPLETION' | 'SUSPICIOUS_PATTERN',
  details: string,
  confidence: number = 1.0
): Promise<DriverReputation> {
  const config = await getTrustConfig();
  const reputation = await getOrCreateReputation(riderId);
  
  let penalty = 0;
  let updateField = '';
  
  switch (fraudType) {
    case 'GPS_SPOOFING':
      penalty = config.gpsSpoofingPenalty * confidence;
      updateField = 'gpsSpoofingFlags';
      break;
    case 'FAKE_COMPLETION':
      penalty = config.fakeCompletionPenalty * confidence;
      updateField = 'fakeCompletionFlags';
      break;
    case 'SUSPICIOUS_PATTERN':
      penalty = config.suspiciousPatternPenalty * confidence;
      updateField = 'suspiciousPatternFlags';
      break;
  }
  
  const newFraudRiskScore = Math.max(0, reputation.fraudRiskScore - penalty);
  
  const updateData: Record<string, unknown> = {
    fraudRiskScore: newFraudRiskScore,
    fraudFlags: reputation.fraudFlags + 1,
    lastFraudCheckAt: new Date(),
  };
  updateData[updateField] = (reputation as Record<string, unknown>)[updateField as keyof DriverReputation] as number + 1;
  
  const updatedReputation = await db.driverReputation.update({
    where: { id: reputation.id },
    data: updateData as Partial<DriverReputation>,
  });
  
  // Calculate new trust score
  const scoreResult = await calculateTrustScore(updatedReputation, config);
  
  const finalReputation = await updateTrustScore(
    updatedReputation.id,
    scoreResult,
    ScoreTriggerType.FRAUD_DETECTED,
    `Fraud signal: ${fraudType} - ${details}`
  );
  
  // High fraud signals may warrant suspension
  if (newFraudRiskScore < 30 || confidence > 0.9) {
    await createPerformanceAlert(
      finalReputation.id,
      PerformanceAlertType.SUSPENSION_WARNING,
      AlertSeverity.CRITICAL,
      'Account Under Review',
      'Your account has been flagged for suspicious activity. Please ensure all rides are completed honestly.',
      newFraudRiskScore,
      50
    );
  }
  
  return finalReputation;
}

/**
 * Update trust score and record history
 */
async function updateTrustScore(
  reputationId: string,
  scoreResult: ScoreCalculationResult,
  triggerType: ScoreTriggerType,
  reason: string,
  triggerReferenceId?: string
): Promise<DriverReputation> {
  // Record history
  await db.driverReputationHistory.create({
    data: {
      reputationId,
      trustScore: scoreResult.trustScore,
      trustTier: scoreResult.trustTier,
      ratingScore: scoreResult.components.ratingScore,
      completionScore: scoreResult.components.completionScore,
      acceptanceScore: scoreResult.components.acceptanceScore,
      safetyScore: scoreResult.components.safetyScore,
      fraudRiskScore: scoreResult.components.fraudRiskScore,
      scoreChange: scoreResult.scoreChange,
      reason,
      triggerType,
      triggerReferenceId,
    }
  });
  
  // Check for tier changes
  if (scoreResult.tierChanged) {
    if (scoreResult.trustTier === TrustTier.PLATINUM && scoreResult.previousTier !== TrustTier.PLATINUM) {
      await createIncentive(reputationId, 'TRUST_TIER_BONUS', 'Achieved Platinum Status!', 50);
      await createPerformanceAlert(
        reputationId,
        PerformanceAlertType.TIER_PROMOTION,
        AlertSeverity.LOW,
        'Platinum Status Achieved!',
        'Congratulations! You\'ve achieved Platinum status. Enjoy priority dispatch and premium benefits!'
      );
    } else if (scoreResult.trustTier === TrustTier.GOLD && 
               [TrustTier.SILVER, TrustTier.WARNING].includes(scoreResult.previousTier)) {
      await createIncentive(reputationId, 'TRUST_TIER_BONUS', 'Achieved Gold Status!', 25);
      await createPerformanceAlert(
        reputationId,
        PerformanceAlertType.TIER_PROMOTION,
        AlertSeverity.LOW,
        'Gold Status Achieved!',
        'Great job! You\'ve reached Gold status. Keep up the excellent service!'
      );
    } else if (scoreResult.trustTier === TrustTier.WARNING) {
      await createPerformanceAlert(
        reputationId,
        PerformanceAlertType.TIER_DEMOTION,
        AlertSeverity.HIGH,
        'Warning Status',
        'Your trust score has dropped. Improve your service quality to regain your previous status.',
        scoreResult.trustScore,
        70
      );
    } else if (scoreResult.trustTier === TrustTier.SUSPENDED) {
      await createPerformanceAlert(
        reputationId,
        PerformanceAlertType.SUSPENSION_NOTICE,
        AlertSeverity.CRITICAL,
        'Account Suspended',
        'Your account has been suspended due to low trust score. Please contact support for reinstatement.',
        scoreResult.trustScore,
        60
      );
    }
  }
  
  // Check for auto-suspension
  const config = await getTrustConfig();
  const shouldSuspend = scoreResult.trustScore < config.autoSuspendThreshold;
  const wasSuspended = scoreResult.previousTier === TrustTier.SUSPENDED;
  
  // Update reputation
  return db.driverReputation.update({
    where: { id: reputationId },
    data: {
      trustScore: scoreResult.trustScore,
      previousTrustScore: scoreResult.scoreChange ? scoreResult.trustScore - scoreResult.scoreChange : scoreResult.trustScore,
      trustTier: scoreResult.trustTier,
      previousTrustTier: scoreResult.previousTier,
      ratingScore: scoreResult.components.ratingScore,
      completionScore: scoreResult.components.completionScore,
      acceptanceScore: scoreResult.components.acceptanceScore,
      lastScoreUpdateAt: new Date(),
      isSuspended: shouldSuspend,
      suspendedAt: shouldSuspend && !wasSuspended ? new Date() : undefined,
      suspensionEndsAt: shouldSuspend && !wasSuspended ? 
        new Date(Date.now() + config.autoSuspendDuration * 24 * 60 * 60 * 1000) : undefined,
      bonusEligible: scoreResult.trustTier === TrustTier.PLATINUM || scoreResult.trustTier === TrustTier.GOLD,
      priorityDispatch: scoreResult.trustTier !== TrustTier.WARNING && scoreResult.trustTier !== TrustTier.SUSPENDED,
      premiumAccess: scoreResult.trustTier === TrustTier.PLATINUM,
    }
  });
}

/**
 * Create a performance alert for the driver
 */
async function createPerformanceAlert(
  reputationId: string,
  alertType: PerformanceAlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  currentValue?: number,
  thresholdValue?: number,
  suggestedAction?: string
): Promise<DriverPerformanceAlert> {
  return db.driverPerformanceAlert.create({
    data: {
      reputationId,
      alertType,
      severity,
      title,
      message,
      currentValue,
      thresholdValue,
      suggestedAction,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }
  });
}

/**
 * Create an incentive earned record
 */
async function createIncentive(
  reputationId: string,
  incentiveType: string,
  name: string,
  amount: number
): Promise<void> {
  await db.driverIncentiveEarned.create({
    data: {
      reputationId,
      incentiveType: incentiveType as 'TRUST_TIER_BONUS' | 'STREAK_BONUS' | 'RATING_BONUS' | 'COMPLETION_BONUS' | 'SAFETY_BONUS' | 'QUALITY_BONUS' | 'PEAK_PERFORMANCE' | 'CUSTOMER_FAVORITE' | 'RELIABILITY_AWARD' | 'PLATINUM_REWARD',
      name,
      rewardAmount: amount,
      rewardType: 'CASH',
      qualifyingMetric: incentiveType,
      qualifyingValue: amount,
    }
  });
  
  // Update total bonus earned
  await db.driverReputation.update({
    where: { id: reputationId },
    data: {
      totalBonusEarned: { increment: amount },
      lastBonusAt: new Date(),
    }
  });
}

/**
 * Get dispatch priority weight for a driver
 * Higher trust scores get higher priority
 */
export async function getDispatchPriorityWeight(riderId: string): Promise<number> {
  const reputation = await db.driverReputation.findUnique({
    where: { riderId }
  });
  
  if (!reputation) return 1.0;
  
  // Base weight from trust tier
  const tierWeights: Record<TrustTier, number> = {
    [TrustTier.PLATINUM]: 2.0,
    [TrustTier.GOLD]: 1.5,
    [TrustTier.SILVER]: 1.0,
    [TrustTier.WARNING]: 0.5,
    [TrustTier.SUSPENDED]: 0.0,
  };
  
  return tierWeights[reputation.trustTier] || 1.0;
}

/**
 * Get driver trust indicators for rider display
 */
export async function getDriverTrustIndicators(riderId: string): Promise<{
  rating: number;
  totalTrips: number;
  trustTier: TrustTier;
  trustBadge: string;
  bonusEligible: boolean;
}> {
  const reputation = await db.driverReputation.findUnique({
    where: { riderId },
    include: { rider: true }
  });
  
  if (!reputation) {
    return {
      rating: 5.0,
      totalTrips: 0,
      trustTier: TrustTier.SILVER,
      trustBadge: 'Silver',
      bonusEligible: false,
    };
  }
  
  const trustBadges: Record<TrustTier, string> = {
    [TrustTier.PLATINUM]: 'Platinum',
    [TrustTier.GOLD]: 'Gold',
    [TrustTier.SILVER]: 'Silver',
    [TrustTier.WARNING]: '',
    [TrustTier.SUSPENDED]: '',
  };
  
  return {
    rating: reputation.averageRating,
    totalTrips: reputation.totalTasksCompleted,
    trustTier: reputation.trustTier,
    trustBadge: trustBadges[reputation.trustTier] || '',
    bonusEligible: reputation.bonusEligible,
  };
}

/**
 * Batch recalculate trust scores (for maintenance/corrections)
 */
export async function batchRecalculateScores(): Promise<{ updated: number; errors: number }> {
  const config = await getTrustConfig();
  const reputations = await db.driverReputation.findMany();
  
  let updated = 0;
  let errors = 0;
  
  for (const reputation of reputations) {
    try {
      const scoreResult = await calculateTrustScore(reputation, config);
      await updateTrustScore(
        reputation.id,
        scoreResult,
        ScoreTriggerType.MANUAL_ADJUSTMENT,
        'Batch recalculation'
      );
      updated++;
    } catch {
      errors++;
    }
  }
  
  return { updated, errors };
}

/**
 * Get driver reputation summary for admin dashboard
 */
export async function getReputationSummary(riderId: string): Promise<{
  reputation: DriverReputation | null;
  recentHistory: DriverReputationHistory[];
  activeAlerts: DriverPerformanceAlert[];
  recentSafetyEvents: DriverSafetyEvent[];
}> {
  const reputation = await db.driverReputation.findUnique({
    where: { riderId }
  });
  
  if (!reputation) {
    return {
      reputation: null,
      recentHistory: [],
      activeAlerts: [],
      recentSafetyEvents: [],
    };
  }
  
  const [recentHistory, activeAlerts, recentSafetyEvents] = await Promise.all([
    db.driverReputationHistory.findMany({
      where: { reputationId: reputation.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.driverPerformanceAlert.findMany({
      where: { 
        reputationId: reputation.id,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.driverSafetyEvent.findMany({
      where: { reputationId: reputation.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  
  return {
    reputation,
    recentHistory,
    activeAlerts,
    recentSafetyEvents,
  };
}

// Export utility functions
export {
  calculateRatingScore,
  calculateCompletionScore,
  calculateAcceptanceScore,
  determineTrustTier,
};

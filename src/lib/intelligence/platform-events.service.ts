/**
 * Smart Ride — Intelligent Platform Event Bus
 *
 * Single entry point that fans real platform events out to the three
 * intelligence engines:
 *
 *   Fraud Intelligence   (lib/fraud)       — risk scoring, abuse detection
 *   Driver Reputation    (lib/reputation)  — trust/safety/reliability scoring
 *   Marketplace          (lib/marketplace) — incentive progress, zone metrics
 *
 * Callers (the task state machine, rating API, dispatch) depend on this module
 * only — they never import the engines directly. That keeps the engines
 * swappable and stops intelligence logic leaking into request handlers.
 *
 * CONTRACT: every method here is non-throwing. Intelligence is a side effect
 * of a business event, never a reason to fail one — a rider must still get
 * paid for a completed trip if the scoring pass errors. Failures are logged
 * and swallowed per-engine so one bad engine cannot starve the others.
 */

import { db } from '@/lib/db';
import { FraudDetectionService } from '@/lib/fraud/fraud-detection.service';
import { FraudPreventionService } from '@/lib/fraud/fraud-prevention.service';
import { riskScoringEngine } from '@/lib/fraud/risk-scoring.engine';
import {
  recordTaskCompletion as reputationRecordCompletion,
  recordTaskCancellation as reputationRecordCancellation,
  recordRating as reputationRecordRating,
  recordRequestResponse as reputationRecordRequestResponse,
  recordFraudSignal as reputationRecordFraudSignal,
} from '@/lib/reputation/trust-score-engine';
import { processTaskCompletion as incentiveProcessTaskCompletion } from '@/lib/marketplace/incentive-fulfillment';
import { toNumber } from '@/lib/decimal-utils';
import { RiskEntityType, RiskLevel } from '@prisma/client';

/** Risk score at or above this marks an entity for restriction. */
const AUTO_RESTRICT_THRESHOLD = 80;
/** Risk score at or above this opens a manual-review alert. */
const REVIEW_THRESHOLD = 60;

function riskLevelFor(score: number): RiskLevel {
  if (score >= 80) return RiskLevel.CRITICAL;
  if (score >= 60) return RiskLevel.HIGH;
  if (score >= 30) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

/** Run an engine call without ever propagating its failure. */
async function safely(engine: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[Intelligence] ${engine} failed:`, err);
  }
}

export class PlatformIntelligence {
  /**
   * A task reached COMPLETED.
   *
   * Drives: reputation completion/punctuality, incentive progress, per-task
   * fraud analysis, the rider↔client interaction ledger used for collusion
   * detection, and the rider's rolling behaviour profile.
   */
  static async onTaskCompleted(taskId: string): Promise<void> {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        taskType: true,
        riderId: true,
        clientId: true,
        riderEarnings: true,
        totalAmount: true,
        distanceKm: true,
        completedAt: true,
        acceptedAt: true,
        arrivedAtPickupAt: true,
      },
    });
    if (!task?.riderId) return;

    const riderId = task.riderId;
    const completedAt = task.completedAt ?? new Date();

    // Punctuality: Task has no scheduled-pickup column, so the real signal is
    // how long the rider took to reach pickup after accepting. Anything over
    // PICKUP_SLA_MINUTES counts as late, and the overshoot is the delay.
    const PICKUP_SLA_MINUTES = 15;
    let wasOnTime = true;
    let delayMinutes = 0;
    if (task.acceptedAt && task.arrivedAtPickupAt) {
      const minutesToPickup =
        (task.arrivedAtPickupAt.getTime() - task.acceptedAt.getTime()) / 60000;
      if (minutesToPickup > PICKUP_SLA_MINUTES) {
        delayMinutes = Math.round(minutesToPickup - PICKUP_SLA_MINUTES);
        wasOnTime = false;
      }
    }

    await safely('reputation.taskCompleted', () =>
      reputationRecordCompletion(riderId, task.id, wasOnTime, delayMinutes)
    );

    await safely('marketplace.incentiveProgress', () =>
      incentiveProcessTaskCompletion({
        riderId,
        taskId: task.id,
        taskType: String(task.taskType),
        earnings: toNumber(task.riderEarnings),
        completedAt,
      })
    );

    await safely('fraud.analyzeTask', async () => {
      const result = await FraudDetectionService.analyzeTask(task.id);
      await PlatformIntelligence.applyRiskScore(
        RiskEntityType.RIDER,
        riderId,
        result.riskScore,
        `Task ${task.id} analysis`
      );
    });

    if (task.clientId) {
      await safely('fraud.interaction', () =>
        PlatformIntelligence.recordInteraction(
          riderId,
          task.clientId,
          toNumber(task.totalAmount),
          task.distanceKm ?? 0
        )
      );
    }

    await safely('fraud.behaviourProfile', () =>
      PlatformIntelligence.refreshRiderBehaviourProfile(riderId)
    );
  }

  /** A task reached CANCELLED — reputation takes the cancellation hit. */
  static async onTaskCancelled(taskId: string, reason?: string): Promise<void> {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, riderId: true, clientId: true },
    });
    if (!task?.riderId) return;

    await safely('reputation.taskCancelled', () =>
      reputationRecordCancellation(task.riderId!, task.id, reason)
    );

    if (task.clientId) {
      await safely('fraud.interactionCancelled', async () => {
        await db.driverRiderInteraction.updateMany({
          where: { riderId: task.riderId!, clientId: task.clientId },
          data: { cancelledRides: { increment: 1 } },
        });
      });
    }
  }

  /** A client rated a completed trip. */
  static async onRatingSubmitted(
    riderId: string,
    taskId: string,
    rating: {
      score: number;
      punctualityScore?: number | null;
      professionalismScore?: number | null;
      vehicleConditionScore?: number | null;
      comment?: string | null;
    }
  ): Promise<void> {
    await safely('reputation.rating', () =>
      reputationRecordRating(riderId, taskId, rating)
    );
  }

  /**
   * A dispatch offer was accepted, declined or timed out. This is what makes
   * acceptance rate — and therefore trust score — reflect reality.
   */
  static async onDispatchOffer(
    riderId: string,
    outcome: 'ACCEPTED' | 'DECLINED' | 'IGNORED'
  ): Promise<void> {
    await safely('reputation.dispatchOffer', () =>
      reputationRecordRequestResponse(
        riderId,
        outcome === 'ACCEPTED',
        outcome === 'IGNORED'
      )
    );
  }

  /** A confirmed fraud signal against a rider feeds back into trust score. */
  static async onFraudSignal(
    riderId: string,
    signal: 'GPS_SPOOFING' | 'FAKE_COMPLETION' | 'SUSPICIOUS_PATTERN',
    details = 'Detected by fraud intelligence'
  ): Promise<void> {
    await safely('reputation.fraudSignal', () =>
      reputationRecordFraudSignal(riderId, signal, details)
    );
  }

  /**
   * Upsert an entity's current risk score, append a history row, and apply
   * automatic restriction / manual-review escalation.
   */
  static async applyRiskScore(
    entityType: RiskEntityType,
    entityId: string,
    score: number,
    reason: string
  ): Promise<void> {
    const existing = await db.fraudRiskScore.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    const previous = existing?.riskScore ?? 0;
    const level = riskLevelFor(score);
    const shouldRestrict = score >= AUTO_RESTRICT_THRESHOLD;

    await db.fraudRiskScore.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      create: {
        entityType,
        entityId,
        riskScore: score,
        riskLevel: level,
        previousScore: previous,
        triggerReason: reason,
        isRestricted: shouldRestrict,
        lastAnalyzedAt: new Date(),
      },
      update: {
        riskScore: score,
        riskLevel: level,
        previousScore: previous,
        triggerReason: reason,
        isRestricted: shouldRestrict,
        lastAnalyzedAt: new Date(),
      },
    });

    await db.fraudScoreHistoryRecord.create({
      data: {
        entityType,
        entityId,
        riskScore: score,
        previousScore: previous,
        triggerReason: reason,
      },
    });

    // Escalate to a reviewable alert once, on the crossing — not on every
    // recalculation, or a persistently risky account floods the queue.
    if (score >= REVIEW_THRESHOLD && previous < REVIEW_THRESHOLD) {
      await db.fraudAlert.create({
        data: {
          entityType,
          entityId,
          riderId: entityType === RiskEntityType.RIDER ? entityId : null,
          userId: entityType === RiskEntityType.CLIENT ? entityId : null,
          alertType: 'UNUSUAL_PATTERN',
          severity: score >= AUTO_RESTRICT_THRESHOLD ? 'CRITICAL' : 'HIGH',
          riskScore: Math.round(score),
          riskScoreAtDetection: score,
          detectionMethod: 'RULE_BASED',
          description: `Risk score crossed review threshold (${previous.toFixed(1)} → ${score.toFixed(1)}): ${reason}`,
        },
      });
    }
  }

  /**
   * Maintain the pairwise rider↔client ledger. A pair that rides together far
   * more than chance would predict — especially on very short trips — is the
   * primary collusion / fare-farming signal.
   */
  static async recordInteraction(
    riderId: string,
    clientId: string,
    value: number,
    distanceKm: number
  ): Promise<void> {
    const isShort = distanceKm > 0 && distanceKm < 1.5;
    const existing = await db.driverRiderInteraction.findUnique({
      where: { riderId_clientId: { riderId, clientId } },
    });

    const totalRides = (existing?.totalRides ?? 0) + 1;
    const shortRideCount = (existing?.shortRideCount ?? 0) + (isShort ? 1 : 0);
    // Score rises with both volume and the share of suspiciously short trips.
    const shortShare = totalRides > 0 ? shortRideCount / totalRides : 0;
    const collusionScore = Math.min(
      100,
      Math.max(0, (totalRides >= 5 ? (totalRides - 4) * 6 : 0) + shortShare * 50)
    );

    await db.driverRiderInteraction.upsert({
      where: { riderId_clientId: { riderId, clientId } },
      create: {
        riderId,
        clientId,
        totalRides: 1,
        totalValue: value,
        shortRideCount: isShort ? 1 : 0,
        collusionScore,
      },
      update: {
        totalRides,
        totalValue: { increment: value },
        shortRideCount,
        collusionScore,
        isFlagged: collusionScore >= 60,
        lastInteractionAt: new Date(),
      },
    });
  }

  /**
   * Recompute a rider's rolling behaviour features from their real task
   * history. This vector is what behaviour scoring and the ML training
   * pipeline consume — it must never be static.
   */
  static async refreshRiderBehaviourProfile(riderId: string): Promise<void> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tasks = await db.task.findMany({
      where: { riderId, createdAt: { gte: since } },
      select: {
        distanceKm: true,
        createdAt: true,
        completedAt: true,
        acceptedAt: true,
        status: true,
        clientId: true,
      },
    });
    if (tasks.length === 0) return;

    const distances = tasks.map(t => t.distanceKm ?? 0);
    const durations = tasks
      .filter(t => t.completedAt && t.acceptedAt)
      .map(t => (t.completedAt!.getTime() - t.acceptedAt!.getTime()) / 60000);

    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const variance = (xs: number[]) => {
      if (xs.length < 2) return 0;
      const m = mean(xs);
      return mean(xs.map(x => (x - m) ** 2));
    };

    const shortRides = distances.filter(d => d > 0 && d < 1.5).length;
    const nightRides = tasks.filter(t => {
      const h = t.createdAt.getHours();
      return h >= 23 || h < 5;
    }).length;
    const weekendRides = tasks.filter(t => [0, 6].includes(t.createdAt.getDay())).length;
    const cancelled = tasks.filter(t => t.status === 'CANCELLED').length;

    // Repeat-client concentration: the share of trips taken with this rider's
    // single most frequent client.
    const perClient = new Map<string, number>();
    for (const t of tasks) {
      if (t.clientId) perClient.set(t.clientId, (perClient.get(t.clientId) ?? 0) + 1);
    }
    const topClientRides = perClient.size ? Math.max(...perClient.values()) : 0;

    const spanHours = Math.max(
      1,
      (Date.now() - Math.min(...tasks.map(t => t.createdAt.getTime()))) / 3_600_000
    );

    const [gpsAnomalyCount, impossibleSpeedCount, locationJumpCount, deviceCount, activeDeviceCount] =
      await Promise.all([
        db.gPSAnomaly.count({ where: { riderId, detectedAt: { gte: since } } }),
        db.gPSAnomaly.count({ where: { riderId, anomalyType: 'IMPOSSIBLE_SPEED', detectedAt: { gte: since } } }),
        db.gPSAnomaly.count({ where: { riderId, anomalyType: 'LOCATION_JUMP', detectedAt: { gte: since } } }),
        db.riderDeviceAssociation.count({ where: { riderId } }),
        db.riderDeviceAssociation.count({ where: { riderId, isActive: true } }),
      ]);

    const data = {
      totalRides: tasks.length,
      shortRides,
      ridesPerHour: tasks.length / spanHours,
      avgRideDistance: mean(distances),
      avgRideDuration: mean(durations),
      rideDistanceVariance: variance(distances),
      rideDurationVariance: variance(durations),
      shortRideRatio: shortRides / tasks.length,
      nightRideRatio: nightRides / tasks.length,
      weekendRideRatio: weekendRides / tasks.length,
      repeatClientRatio: topClientRides / tasks.length,
      cancellationRate: cancelled / tasks.length,
      cancelledRides: cancelled,
      gpsAnomalyCount,
      impossibleSpeedCount,
      locationJumpCount,
      deviceCount,
      activeDeviceCount,
      lastAnalyzedAt: new Date(),
    };

    await db.riderFraudProfile.upsert({
      where: { riderId },
      create: { riderId, ...data },
      update: data,
    });
  }

  /**
   * Periodically re-score recently-active riders and clients with the FULL
   * scoring engine.
   *
   * This closes the gap between the two scorers, which are complementary
   * rather than duplicated:
   *   FraudDetectionService.analyzeTask       cached, per-task, runs on the
   *                                           hot path at every completion
   *   RiskScoringEngine.calculateComprehensive full sub-score breakdown
   *                                           (collusion / gps / behaviour /
   *                                           device / pattern) plus rule
   *                                           matching — too heavy for the hot
   *                                           path, and previously had NO
   *                                           trigger at all.
   *
   * Called from the intelligence cron. Bounded by `limit` so one pass cannot
   * run away on a large active set.
   */
  static async rescoreActiveEntities(
    sinceHours = 24,
    limit = 200
  ): Promise<{ scored: number; escalated: number }> {
    const since = new Date(Date.now() - sinceHours * 3_600_000);

    const recent = await db.task.findMany({
      where: { createdAt: { gte: since } },
      select: { riderId: true, clientId: true },
      take: limit * 4,
    });

    const riders = [...new Set(recent.map(t => t.riderId).filter(Boolean))] as string[];
    const clients = [...new Set(recent.map(t => t.clientId).filter(Boolean))] as string[];

    const entities: Array<{ type: 'RIDER' | 'CLIENT'; id: string }> = [
      ...riders.slice(0, limit).map(id => ({ type: 'RIDER' as const, id })),
      ...clients.slice(0, limit).map(id => ({ type: 'CLIENT' as const, id })),
    ];
    if (entities.length === 0) return { scored: 0, escalated: 0 };

    const breakdowns = await riskScoringEngine.batchCalculateScores(entities);

    let escalated = 0;
    for (const entity of entities) {
      const breakdown = breakdowns[entity.id];
      if (!breakdown) continue;

      const before = await db.fraudRiskScore.findUnique({
        where: {
          entityType_entityId: {
            entityType: entity.type as RiskEntityType,
            entityId: entity.id,
          },
        },
        select: { riskScore: true },
      });

      // Persist the component breakdown the comprehensive engine produces —
      // applyRiskScore only carries the headline number.
      await safely('fraud.rescore', async () => {
        await PlatformIntelligence.applyRiskScore(
          entity.type as RiskEntityType,
          entity.id,
          breakdown.overallScore,
          'Periodic comprehensive re-score'
        );
        await db.fraudRiskScore.update({
          where: {
            entityType_entityId: {
              entityType: entity.type as RiskEntityType,
              entityId: entity.id,
            },
          },
          data: {
            collusionScore: breakdown.collusionScore,
            gpsAnomalyScore: breakdown.gpsAnomalyScore,
            behaviorScore: breakdown.behaviorScore,
            deviceScore: breakdown.deviceScore,
            patternScore: breakdown.patternScore,
            matchedRules: breakdown.matchedRules.length
              ? JSON.stringify(breakdown.matchedRules)
              : null,
          },
        });
      });

      if ((before?.riskScore ?? 0) < REVIEW_THRESHOLD && breakdown.overallScore >= REVIEW_THRESHOLD) {
        escalated++;
      }
    }

    return { scored: entities.length, escalated };
  }

  /**
   * Record a device sighting and detect multi-account farming. Returns the
   * number of distinct accounts sharing the device.
   */
  static async onDeviceSeen(params: {
    deviceId: string;
    fingerprintHash?: string;
    riderId?: string;
    userId?: string;
    platform?: string;
  }): Promise<number> {
    const { deviceId, riderId, userId, platform } = params;
    const fingerprintHash = params.fingerprintHash ?? deviceId;

    await db.deviceFingerprint.upsert({
      where: { deviceId },
      create: { deviceId, fingerprintHash, platform, activityCount: 1 },
      update: { lastSeen: new Date(), lastActivityAt: new Date(), activityCount: { increment: 1 } },
    });

    if (riderId) {
      await db.riderDeviceAssociation.upsert({
        where: { deviceId_riderId: { deviceId, riderId } },
        create: { deviceId, riderId },
        update: { lastSeen: new Date(), useCount: { increment: 1 }, isActive: true },
      });
    }
    if (userId) {
      await db.userDeviceAssociation.upsert({
        where: { deviceId_userId: { deviceId, userId } },
        create: { deviceId, userId },
        update: { lastSeen: new Date(), useCount: { increment: 1 }, isActive: true },
      });
    }

    const [riderCount, userCount] = await Promise.all([
      db.riderDeviceAssociation.count({ where: { deviceId } }),
      db.userDeviceAssociation.count({ where: { deviceId } }),
    ]);
    const accountCount = riderCount + userCount;

    // 3+ accounts on one device is the multi-account farming threshold.
    const flagged = accountCount >= 3;
    await db.deviceFingerprint.update({
      where: { deviceId },
      data: {
        accountCount,
        isFlagged: flagged,
        flagReason: flagged ? `${accountCount} accounts share this device` : null,
        riskScore: Math.min(100, Math.max(0, (accountCount - 1) * 25)),
      },
    });

    if (flagged && riderId) {
      await safely('fraud.deviceFarming', () =>
        PlatformIntelligence.applyRiskScore(
          RiskEntityType.RIDER,
          riderId,
          Math.min(100, accountCount * 25),
          `Device shared with ${accountCount - 1} other account(s)`
        )
      );
    }

    return accountCount;
  }
}

/**
 * Result of a pre-transaction fraud gate.
 *
 * `allowed: false` means the caller MUST NOT proceed with the money movement.
 */
export interface TransactionGateResult {
  allowed: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  /** Safe to show a user — never names the rule that fired. */
  reason?: string;
}

/**
 * Pre-transaction fraud gate.
 *
 * FraudPreventionService ran repeated-failed-payment, cancellation-abuse and
 * dispatch-abuse checks, but nothing called it — so no payment or wallet
 * action was ever gated on fraud risk. This is the gate.
 *
 * Unlike the rest of PlatformIntelligence (which is non-throwing and
 * fire-and-forget), this is a BLOCKING check whose answer the caller must
 * respect. It still fails OPEN: if the risk engine itself errors we allow the
 * transaction rather than take payments offline, and log loudly — a broken
 * detector must not become an outage.
 */
export async function assessTransactionRisk(params: {
  userId?: string;
  riderId?: string;
  /** Used only for the audit trail. */
  context: string;
}): Promise<TransactionGateResult> {
  try {
    const assessment = await FraudPreventionService.assessRisk(params.userId, params.riderId);

    // SUSPEND and HOLD both stop the money. FLAG is recorded but permitted —
    // a medium signal should not block a legitimate customer.
    const blocked =
      assessment.recommendedAction === 'SUSPEND' || assessment.recommendedAction === 'HOLD';

    if (blocked) {
      await safely('fraud.gateAlert', async () => {
        await db.fraudAlert.create({
          data: {
            entityType: params.riderId ? RiskEntityType.RIDER : RiskEntityType.CLIENT,
            entityId: params.riderId ?? params.userId ?? 'unknown',
            riderId: params.riderId ?? null,
            userId: params.userId ?? null,
            alertType: 'SUSPICIOUS_PAYMENT_ATTEMPTS',
            severity: assessment.overallRiskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            riskScore: Math.round(assessment.overallRiskScore),
            riskScoreAtDetection: assessment.overallRiskScore,
            detectionMethod: 'RULE_BASED',
            description: `Transaction blocked by pre-transaction risk gate (${params.context})`,
            evidence: JSON.stringify(assessment.checks),
          },
        });
      });
    }

    return {
      allowed: !blocked,
      riskLevel: assessment.overallRiskLevel,
      riskScore: assessment.overallRiskScore,
      // Deliberately generic: telling someone WHICH rule fired tells them
      // exactly what to change to get around it.
      reason: blocked
        ? 'This transaction could not be completed. Please contact support.'
        : undefined,
    };
  } catch (err) {
    console.error('[Intelligence] transaction risk gate failed open:', err);
    return { allowed: true, riskLevel: 'LOW', riskScore: 0 };
  }
}

export default PlatformIntelligence;

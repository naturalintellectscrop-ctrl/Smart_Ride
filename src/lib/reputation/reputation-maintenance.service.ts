/**
 * Smart Ride — Reputation Maintenance
 *
 * The trust engine reacts to events (ratings, trips, dispatch offers), but
 * three things only happen with the passage of TIME and had no trigger:
 *
 *   applyScoreDecay()        DriverTrustConfig has scoreDecayDays and
 *                            scoreDecayRate, but nothing ever applied them —
 *                            an inactive driver kept a stale high score
 *                            indefinitely and continued to win dispatch.
 *   liftExpiredSuspensions() suspensionEndsAt was set but never acted on, so
 *                            a time-boxed suspension was effectively permanent
 *                            until someone edited the row by hand.
 *   syncTierPrivileges()     priorityDispatch / bonusEligible / premiumAccess
 *                            are what a tier actually buys; they are set on
 *                            tier change but drift if a score moves without
 *                            crossing a boundary.
 *
 * All three are idempotent and safe to run repeatedly.
 */

import { db } from '@/lib/db';
import { getTrustConfig } from './trust-score-engine';
import { TrustTier, ScoreTriggerType } from '@prisma/client';

export interface DecayResult {
  examined: number;
  decayed: number;
  totalPointsRemoved: number;
}

export interface MaintenanceResult {
  decay: DecayResult;
  suspensionsLifted: number;
  privilegesSynced: number;
}

/** Which privileges a tier grants. Single source of truth for the mapping. */
function privilegesForTier(tier: TrustTier) {
  switch (tier) {
    case TrustTier.PLATINUM:
      return { priorityDispatch: true, bonusEligible: true, premiumAccess: true };
    case TrustTier.GOLD:
      return { priorityDispatch: true, bonusEligible: true, premiumAccess: false };
    case TrustTier.SILVER:
      return { priorityDispatch: false, bonusEligible: true, premiumAccess: false };
    // A driver under warning keeps earning but loses dispatch preference.
    case TrustTier.WARNING:
      return { priorityDispatch: false, bonusEligible: true, premiumAccess: false };
    case TrustTier.SUSPENDED:
      return { priorityDispatch: false, bonusEligible: false, premiumAccess: false };
  }
}

export class ReputationMaintenance {
  /**
   * Decay the trust score of drivers who have not completed a task within
   * config.scoreDecayDays, by config.scoreDecayRate points per day of
   * inactivity beyond the threshold.
   *
   * IDEMPOTENT BY CONSTRUCTION. Decay is a function of ELAPSED TIME, so it
   * charges only whole days since `lastDecayAt` (or since the driver first
   * crossed the inactivity threshold, if never decayed). Running this twice in
   * the same hour is a no-op — which matters because the scheduler fires every
   * 15 minutes, and a naive `score -= penalty` would apply a full day's
   * penalty 96 times a day and floor every idle driver within hours.
   *
   * Decay floors at 50 rather than 0: the purpose is to stop a stale score
   * outranking an active driver, not to punish someone back to unusable. A
   * returning driver climbs back on real events.
   */
  static async applyScoreDecay(now = new Date()): Promise<DecayResult> {
    const config = await getTrustConfig();
    const cutoff = new Date(now.getTime() - config.scoreDecayDays * 24 * 60 * 60_000);
    const DECAY_FLOOR = 50;

    const candidates = await db.driverReputation.findMany({
      where: {
        isSuspended: false,
        trustScore: { gt: DECAY_FLOOR },
        OR: [{ lastTaskAt: { lt: cutoff } }, { lastTaskAt: null }],
      },
      select: {
        id: true,
        riderId: true,
        trustScore: true,
        trustTier: true,
        lastTaskAt: true,
        lastDecayAt: true,
        createdAt: true,
      },
    });

    let decayed = 0;
    let totalPointsRemoved = 0;

    for (const rep of candidates) {
      // A driver with no task at all decays from when their record was made,
      // otherwise from their last completed task.
      const reference = rep.lastTaskAt ?? rep.createdAt;
      const inactiveDays = Math.floor((now.getTime() - reference.getTime()) / 86_400_000);
      const daysBeyond = inactiveDays - config.scoreDecayDays;
      if (daysBeyond <= 0) continue;

      // Charge only the days not already charged. The watermark is either the
      // last decay, or the moment this driver first became eligible.
      const becameEligibleAt = new Date(
        reference.getTime() + config.scoreDecayDays * 86_400_000
      );
      const chargedThrough = rep.lastDecayAt ?? becameEligibleAt;
      const daysToCharge = Math.floor((now.getTime() - chargedThrough.getTime()) / 86_400_000);

      // Less than a full day since the last charge — nothing owed. This is
      // what makes repeated scheduler runs safe.
      if (daysToCharge < 1) continue;

      const rawPenalty = daysToCharge * config.scoreDecayRate;
      const newScore = Math.max(DECAY_FLOOR, rep.trustScore - rawPenalty);
      const applied = rep.trustScore - newScore;
      if (applied <= 0) {
        // Already at the floor — still advance the watermark so we do not
        // recompute this driver every run.
        await db.driverReputation.update({
          where: { id: rep.id },
          data: { lastDecayAt: now },
        });
        continue;
      }

      await db.driverReputation.update({
        where: { id: rep.id },
        data: {
          trustScore: newScore,
          previousTrustScore: rep.trustScore,
          lastScoreUpdateAt: now,
          lastDecayAt: now,
        },
      });

      await db.driverReputationHistory.create({
        data: {
          reputationId: rep.id,
          trustScore: newScore,
          previousTrustScore: rep.trustScore,
          scoreChange: -applied,
          trustTier: rep.trustTier,
          previousTrustTier: rep.trustTier,
          triggerType: ScoreTriggerType.SCORE_DECAY,
          reason: `Inactive for ${inactiveDays} days; charged ${daysToCharge} day(s) of decay beyond the ${config.scoreDecayDays}-day threshold`,
        },
      });

      decayed++;
      totalPointsRemoved += applied;
    }

    return { examined: candidates.length, decayed, totalPointsRemoved };
  }

  /**
   * Reinstate drivers whose time-boxed suspension has elapsed. Dispatch
   * already treats a lapsed suspensionEndsAt as servable, but the flag must be
   * cleared or the driver stays visibly suspended everywhere else.
   */
  static async liftExpiredSuspensions(now = new Date()): Promise<number> {
    const expired = await db.driverReputation.findMany({
      where: { isSuspended: true, suspensionEndsAt: { not: null, lte: now } },
      select: { id: true, riderId: true, trustScore: true, trustTier: true },
    });

    for (const rep of expired) {
      // Return them to the tier their current score earns, not automatically
      // to a good standing.
      const config = await getTrustConfig();
      const tier =
        rep.trustScore >= config.platinumThreshold
          ? TrustTier.PLATINUM
          : rep.trustScore >= config.goldThreshold
            ? TrustTier.GOLD
            : rep.trustScore >= config.silverThreshold
              ? TrustTier.SILVER
              : TrustTier.WARNING;

      await db.driverReputation.update({
        where: { id: rep.id },
        data: {
          isSuspended: false,
          suspendedAt: null,
          suspensionEndsAt: null,
          suspensionReason: null,
          trustTier: tier,
          previousTrustTier: TrustTier.SUSPENDED,
          ...privilegesForTier(tier),
        },
      });

      await db.driverReputationHistory.create({
        data: {
          reputationId: rep.id,
          trustScore: rep.trustScore,
          previousTrustScore: rep.trustScore,
          scoreChange: 0,
          trustTier: tier,
          previousTrustTier: TrustTier.SUSPENDED,
          triggerType: ScoreTriggerType.RECOVERY,
          reason: 'Suspension period elapsed; account reinstated',
        },
      });
    }

    return expired.length;
  }

  /**
   * Re-apply tier privileges wherever they disagree with the driver's current
   * tier. Privileges are granted on tier CHANGE, so a row edited elsewhere (or
   * a decay that moved a score without crossing a boundary) can drift.
   */
  static async syncTierPrivileges(): Promise<number> {
    const reps = await db.driverReputation.findMany({
      select: {
        id: true,
        trustTier: true,
        isSuspended: true,
        priorityDispatch: true,
        bonusEligible: true,
        premiumAccess: true,
      },
    });

    let synced = 0;
    for (const rep of reps) {
      // A suspended driver holds no privileges regardless of tier.
      const want = rep.isSuspended
        ? { priorityDispatch: false, bonusEligible: false, premiumAccess: false }
        : privilegesForTier(rep.trustTier);

      if (
        want.priorityDispatch === rep.priorityDispatch &&
        want.bonusEligible === rep.bonusEligible &&
        want.premiumAccess === rep.premiumAccess
      ) {
        continue;
      }

      await db.driverReputation.update({ where: { id: rep.id }, data: want });
      synced++;
    }

    return synced;
  }

  /** Run the full maintenance pass. */
  static async runAll(now = new Date()): Promise<MaintenanceResult> {
    // Order matters: lift suspensions first so reinstated drivers get correct
    // privileges in the same pass, then decay, then reconcile privileges.
    const suspensionsLifted = await ReputationMaintenance.liftExpiredSuspensions(now);
    const decay = await ReputationMaintenance.applyScoreDecay(now);
    const privilegesSynced = await ReputationMaintenance.syncTierPrivileges();
    return { decay, suspensionsLifted, privilegesSynced };
  }
}

export default ReputationMaintenance;

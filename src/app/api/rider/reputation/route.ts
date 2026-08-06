/**
 * GET /api/rider/reputation
 *
 * A driver's own reputation, as shown in the driver app.
 *
 * ROLE BOUNDARY: this is the driver-facing projection, NOT the admin view.
 * It deliberately omits every internal fraud signal — fraudRiskScore,
 * fraudFlags, gpsSpoofingFlags, fakeCompletionFlags, suspiciousPatternFlags —
 * because exposing the detector's internals tells someone gaming the platform
 * exactly which lever they tripped. Drivers see what they can act on: their
 * score, tier, the metrics that move it, and how far they are from the next
 * tier. Admins get the full picture via /api/driver-reputation/[riderId].
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';
import { toNumber } from '@/lib/decimal-utils';

// Mirrors DriverTrustConfig defaults; used to tell a driver how far they are
// from the next tier without exposing the scoring weights themselves.
const TIER_FLOORS: { tier: string; floor: number }[] = [
  { tier: 'PLATINUM', floor: 90 },
  { tier: 'GOLD', floor: 80 },
  { tier: 'SILVER', floor: 70 },
  { tier: 'WARNING', floor: 60 },
];

function nextTierTarget(score: number): { nextTier: string | null; pointsNeeded: number | null } {
  const higher = [...TIER_FLOORS].reverse().find(t => t.floor > score);
  if (!higher) return { nextTier: null, pointsNeeded: null };
  return { nextTier: higher.tier, pointsNeeded: Math.round((higher.floor - score) * 10) / 10 };
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as JWTPayload;

  try {
    const rider = await db.rider.findFirst({
      where: { userId: user.userId },
      select: { id: true, fullName: true, rating: true, completedTrips: true },
    });

    if (!rider) {
      return NextResponse.json(
        { success: false, error: 'Rider profile not found' },
        { status: 404 }
      );
    }

    const reputation = await db.driverReputation.findUnique({
      where: { riderId: rider.id },
      select: {
        trustScore: true,
        trustTier: true,
        previousTrustTier: true,
        lastScoreUpdateAt: true,
        averageRating: true,
        totalRatings: true,
        completionRate: true,
        acceptanceRate: true,
        cancellationRate: true,
        onTimeRate: true,
        safetyScore: true,
        currentStreak: true,
        longestStreak: true,
        totalTasksCompleted: true,
        totalTasksCancelled: true,
        totalCompliments: true,
        totalComplaints: true,
        isSuspended: true,
        suspendedAt: true,
        suspensionEndsAt: true,
        suspensionReason: true,
        bonusEligible: true,
        priorityDispatch: true,
        premiumAccess: true,
        totalBonusEarned: true,
        lastBonusAt: true,
      },
    });

    // A driver with no completed work yet has no reputation row. Return a
    // well-formed "not yet rated" payload rather than 404 — the app should
    // render an empty state, not an error.
    if (!reputation) {
      return NextResponse.json({
        success: true,
        data: {
          hasReputation: false,
          trustScore: null,
          trustTier: null,
          message: 'Complete your first trips to build your reputation.',
          privileges: { bonusEligible: true, priorityDispatch: false, premiumAccess: false },
        },
      });
    }

    const { nextTier, pointsNeeded } = nextTierTarget(reputation.trustScore);

    // Unread performance alerts (tier changes, warnings, streak milestones).
    const alerts = await db.driverPerformanceAlert.findMany({
      where: { reputation: { riderId: rider.id }, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        alertType: true,
        severity: true,
        title: true,
        message: true,
        suggestedAction: true,
        createdAt: true,
      },
    });

    // Score trend so the driver can see direction, not just a number.
    const history = await db.driverReputationHistory.findMany({
      where: { reputation: { riderId: rider.id } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { trustScore: true, scoreChange: true, triggerType: true, reason: true, createdAt: true },
    });

    // Live incentive progress belongs on this screen too — it is the reward
    // half of the same reputation loop.
    const incentives = await db.incentiveParticipation.findMany({
      where: { riderId: rider.id, status: { in: ['ENROLLED', 'IN_PROGRESS'] } },
      orderBy: { enrolledAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        ridesCompleted: true,
        earningsAccumulated: true,
        progressPercent: true,
        incentive: {
          select: { id: true, name: true, incentiveType: true, rewardAmount: true, minRides: true, endTime: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        hasReputation: true,
        trustScore: Math.round(reputation.trustScore * 10) / 10,
        trustTier: reputation.trustTier,
        previousTrustTier: reputation.previousTrustTier,
        lastScoreUpdateAt: reputation.lastScoreUpdateAt,
        nextTier,
        pointsToNextTier: pointsNeeded,

        // The metrics a driver can actually influence
        metrics: {
          averageRating: Math.round(reputation.averageRating * 100) / 100,
          totalRatings: reputation.totalRatings,
          completionRate: Math.round(reputation.completionRate * 1000) / 10,
          acceptanceRate: Math.round(reputation.acceptanceRate * 1000) / 10,
          cancellationRate: Math.round(reputation.cancellationRate * 1000) / 10,
          onTimeRate: Math.round(reputation.onTimeRate * 1000) / 10,
          safetyScore: Math.round(reputation.safetyScore * 10) / 10,
          tripsCompleted: reputation.totalTasksCompleted,
          tripsCancelled: reputation.totalTasksCancelled,
          compliments: reputation.totalCompliments,
          complaints: reputation.totalComplaints,
        },

        streak: {
          current: reputation.currentStreak,
          longest: reputation.longestStreak,
        },

        accountHealth: {
          isSuspended: reputation.isSuspended,
          suspendedAt: reputation.suspendedAt,
          suspensionEndsAt: reputation.suspensionEndsAt,
          suspensionReason: reputation.suspensionReason,
        },

        privileges: {
          bonusEligible: reputation.bonusEligible,
          priorityDispatch: reputation.priorityDispatch,
          premiumAccess: reputation.premiumAccess,
        },

        earnings: {
          totalBonusEarned: toNumber(reputation.totalBonusEarned),
          lastBonusAt: reputation.lastBonusAt,
        },

        alerts,
        history,
        incentives: incentives.map(p => ({
          id: p.id,
          status: p.status,
          name: p.incentive.name,
          type: p.incentive.incentiveType,
          rewardAmount: p.incentive.rewardAmount,
          ridesCompleted: p.ridesCompleted,
          ridesRequired: p.incentive.minRides,
          earningsAccumulated: p.earningsAccumulated,
          progressPercent: Math.round(p.progressPercent * 10) / 10,
          endsAt: p.incentive.endTime,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching rider reputation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reputation' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

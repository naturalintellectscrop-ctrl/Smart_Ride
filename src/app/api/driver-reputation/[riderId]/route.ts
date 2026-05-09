import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/driver-reputation/[riderId] - Get detailed reputation for a specific driver
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ riderId: string }> }
) {
  try {
    const { riderId } = await params;

    const reputation = await db.driverReputation.findUnique({
      where: { riderId },
      include: {
        rider: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            riderRole: true,
            status: true,
            isOnline: true,
            currentLatitude: true,
            currentLongitude: true,
            rating: true,
            totalTrips: true,
            completedTrips: true,
            cancelledTrips: true,
            totalEarnings: true,
            walletBalance: true,
            createdAt: true,
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        safetyEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        performanceAlerts: {
          where: { isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        incentives: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!reputation) {
      return NextResponse.json(
        { success: false, error: 'Driver reputation not found' },
        { status: 404 }
      );
    }

    // Get rating distribution for chart
    const ratingDistribution = {
      five: reputation.fiveStarRatings,
      four: reputation.fourStarRatings,
      three: reputation.threeStarRatings,
      two: reputation.twoStarRatings,
      one: reputation.oneStarRatings,
    };

    // Calculate score trend (last 7 entries)
    const scoreTrend = reputation.history.slice(0, 7).map((h) => ({
      date: h.createdAt,
      score: h.trustScore,
      change: h.scoreChange,
    }));

    // Calculate metrics summary
    const metrics = {
      trustScore: reputation.trustScore,
      trustTier: reputation.trustTier,
      averageRating: reputation.averageRating,
      totalRatings: reputation.totalRatings,
      completionRate: reputation.completionRate * 100,
      acceptanceRate: reputation.acceptanceRate * 100,
      onTimeRate: reputation.onTimeRate * 100,
      safetyScore: reputation.safetyScore,
      fraudRiskScore: reputation.fraudRiskScore,
      currentStreak: reputation.currentStreak,
      longestStreak: reputation.longestStreak,
      totalSafetyEvents: reputation.totalSafetyEvents,
      totalComplaints: reputation.totalComplaints,
      totalCompliments: reputation.totalCompliments,
    };

    // Score breakdown
    const scoreBreakdown = {
      rating: {
        score: reputation.ratingScore,
        weight: 40,
        contribution: reputation.ratingScore * 0.4,
      },
      completion: {
        score: reputation.completionScore,
        weight: 20,
        contribution: reputation.completionScore * 0.2,
      },
      acceptance: {
        score: reputation.acceptanceScore,
        weight: 15,
        contribution: reputation.acceptanceScore * 0.15,
      },
      safety: {
        score: reputation.safetyScore,
        weight: 15,
        contribution: reputation.safetyScore * 0.15,
      },
      fraudRisk: {
        score: reputation.fraudRiskScore,
        weight: 10,
        contribution: reputation.fraudRiskScore * 0.1,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        reputation,
        metrics,
        ratingDistribution,
        scoreTrend,
        scoreBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching driver reputation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch driver reputation' },
      { status: 500 }
    );
  }
}

// PATCH /api/driver-reputation/[riderId] - Manually adjust trust score (admin action)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ riderId: string }> }
) {
  try {
    const { riderId } = await params;
    const body = await request.json();
    const { adjustment, reason, adminId } = body;

    if (typeof adjustment !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Adjustment must be a number' },
        { status: 400 }
      );
    }

    const reputation = await db.driverReputation.findUnique({
      where: { riderId },
    });

    if (!reputation) {
      return NextResponse.json(
        { success: false, error: 'Driver reputation not found' },
        { status: 404 }
      );
    }

    const newScore = Math.max(0, Math.min(100, reputation.trustScore + adjustment));

    // Create history entry
    await db.driverReputationHistory.create({
      data: {
        reputationId: reputation.id,
        trustScore: newScore,
        trustTier: reputation.trustTier,
        ratingScore: reputation.ratingScore,
        completionScore: reputation.completionScore,
        acceptanceScore: reputation.acceptanceScore,
        safetyScore: reputation.safetyScore,
        fraudRiskScore: reputation.fraudRiskScore,
        scoreChange: adjustment,
        reason: `Manual adjustment by admin: ${reason}`,
        triggerType: 'MANUAL_ADJUSTMENT',
        metadata: JSON.stringify({ adminId }),
      },
    });

    // Update reputation
    const updated = await db.driverReputation.update({
      where: { riderId },
      data: {
        trustScore: newScore,
        previousTrustScore: reputation.trustScore,
        lastScoreUpdateAt: new Date(),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        action: 'TRUST_SCORE_ADJUSTMENT',
        entityType: 'DriverReputation',
        entityId: reputation.id,
        description: `Trust score adjusted by ${adjustment} points. Reason: ${reason}`,
        oldValues: JSON.stringify({ trustScore: reputation.trustScore }),
        newValues: JSON.stringify({ trustScore: newScore }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Trust score ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)} points`,
    });
  } catch (error) {
    console.error('Error adjusting trust score:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to adjust trust score' },
      { status: 500 }
    );
  }
}

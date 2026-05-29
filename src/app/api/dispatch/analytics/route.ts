// Smart Ride Dispatch Analytics API
// Provides analytics, metrics, and insights for the dispatch engine
// Queries the DispatchMatch model directly from the database

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dispatch/analytics
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'summary':
      return getSummary();

    case 'by-service':
      return getByServiceType();

    case 'by-provider':
      const providerId = searchParams.get('providerId');
      return getByProvider(providerId);

    case 'recent':
      const limit = parseInt(searchParams.get('limit') || '50');
      return getRecentDispatches(limit);

    case 'performance':
      return getPerformanceMetrics();

    default:
      return NextResponse.json({
        success: true,
        message: 'Smart Ride Dispatch Analytics API',
        endpoints: [
          'GET /api/dispatch/analytics?action=summary - Get overall summary',
          'GET /api/dispatch/analytics?action=by-service - Get metrics by service type',
          'GET /api/dispatch/analytics?action=by-provider&providerId=xxx - Get provider metrics',
          'GET /api/dispatch/analytics?action=recent&limit=50 - Get recent dispatches',
          'GET /api/dispatch/analytics?action=performance - Get performance metrics',
        ],
      });
  }
}

/**
 * Get overall dispatch summary from database
 */
async function getSummary() {
  try {
    const total = await db.dispatchMatch.count();

    const byStatus = await db.dispatchMatch.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusCounts: Record<string, number> = {};
    for (const row of byStatus) {
      statusCounts[row.status] = row._count.status;
    }

    const accepted = statusCounts['ACCEPTED'] || 0;
    const rejected = statusCounts['REJECTED'] || 0;
    const expired = statusCounts['EXPIRED'] || 0;
    const pending = statusCounts['PENDING'] || 0;
    const cancelled = statusCounts['CANCELLED'] || 0;

    const acceptanceRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : '0';
    const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : '0';
    const expirationRate = total > 0 ? ((expired / total) * 100).toFixed(1) : '0';

    // Average match score
    const avgScoreResult = await db.dispatchMatch.aggregate({
      _avg: { matchScore: true },
    });
    const averageMatchScore = avgScoreResult._avg.matchScore
      ? Math.round(avgScoreResult._avg.matchScore * 100) / 100
      : 0;

    // Average dispatch time (createdAt to acceptedAt for ACCEPTED records)
    const acceptedMatches = await db.dispatchMatch.findMany({
      where: {
        status: 'ACCEPTED',
        acceptedAt: { not: null },
      },
      select: {
        createdAt: true,
        acceptedAt: true,
      },
    });

    let averageDispatchTimeMs = 0;
    if (acceptedMatches.length > 0) {
      const totalDispatchTime = acceptedMatches.reduce((sum, m) => {
        if (m.acceptedAt) {
          return sum + (m.acceptedAt.getTime() - m.createdAt.getTime());
        }
        return sum;
      }, 0);
      averageDispatchTimeMs = Math.round(totalDispatchTime / acceptedMatches.length);
    }

    // Today's metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTotal = await db.dispatchMatch.count({
      where: { createdAt: { gte: todayStart } },
    });
    const todayAccepted = await db.dispatchMatch.count({
      where: {
        createdAt: { gte: todayStart },
        status: 'ACCEPTED',
      },
    });

    // Last hour metrics
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lastHourTotal = await db.dispatchMatch.count({
      where: { createdAt: { gte: oneHourAgo } },
    });
    const lastHourAccepted = await db.dispatchMatch.count({
      where: {
        createdAt: { gte: oneHourAgo },
        status: 'ACCEPTED',
      },
    });

    // Active riders in last hour
    const activeRiders = await db.dispatchMatch.findMany({
      where: {
        createdAt: { gte: oneHourAgo },
      },
      select: { riderId: true },
      distinct: ['riderId'],
    });

    return NextResponse.json({
      success: true,
      data: {
        total,
        accepted,
        rejected,
        expired,
        pending,
        cancelled,
        acceptanceRate,
        rejectionRate,
        expirationRate,
        averageMatchScore,
        averageDispatchTimeMs,
        today: {
          total: todayTotal,
          accepted: todayAccepted,
        },
        lastHour: {
          total: lastHourTotal,
          accepted: lastHourAccepted,
        },
        providerMetrics: {
          total: activeRiders.length,
          active: activeRiders.length,
        },
      },
    });
  } catch (error) {
    console.error('Dispatch analytics summary error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dispatch summary' },
      { status: 500 }
    );
  }
}

/**
 * Get dispatch metrics grouped by task type
 */
async function getByServiceType() {
  try {
    // Get all dispatch matches with their task types
    const dispatchesByType = await db.dispatchMatch.findMany({
      select: {
        status: true,
        matchScore: true,
        createdAt: true,
        acceptedAt: true,
        task: {
          select: { taskType: true },
        },
      },
    });

    const serviceTypes = [
      'SMART_BODA_RIDE',
      'SMART_CAR_RIDE',
      'FOOD_DELIVERY',
      'SHOPPING',
      'ITEM_DELIVERY',
      'SMART_HEALTH_DELIVERY',
    ] as const;

    const byType = serviceTypes.map((serviceType) => {
      const metrics = dispatchesByType.filter(
        (d) => d.task?.taskType === serviceType
      );
      const total = metrics.length;
      const accepted = metrics.filter((m) => m.status === 'ACCEPTED').length;
      const rejected = metrics.filter((m) => m.status === 'REJECTED').length;
      const expired = metrics.filter((m) => m.status === 'EXPIRED').length;

      // Average match score for this type
      const avgMatchScore =
        total > 0
          ? Math.round(
              (metrics.reduce((sum, m) => sum + m.matchScore, 0) / total) * 100
            ) / 100
          : 0;

      // Average dispatch time for accepted matches
      const acceptedMetrics = metrics.filter(
        (m) => m.status === 'ACCEPTED' && m.acceptedAt
      );
      const avgDispatchTime =
        acceptedMetrics.length > 0
          ? Math.round(
              acceptedMetrics.reduce((sum, m) => {
                return sum + (m.acceptedAt!.getTime() - m.createdAt.getTime());
              }, 0) / acceptedMetrics.length
            )
          : 0;

      return {
        serviceType,
        total,
        accepted,
        rejected,
        expired,
        acceptanceRate: total > 0 ? ((accepted / total) * 100).toFixed(1) : '0',
        avgMatchScore,
        avgDispatchTimeMs: avgDispatchTime,
      };
    });

    return NextResponse.json({
      success: true,
      data: byType,
    });
  } catch (error) {
    console.error('Dispatch analytics by-service error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dispatch metrics by service type' },
      { status: 500 }
    );
  }
}

/**
 * Get dispatch metrics for a specific rider (provider)
 */
async function getByProvider(providerId: string | null) {
  try {
    if (providerId) {
      const rider = await db.rider.findUnique({
        where: { id: providerId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          riderRole: true,
          totalTrips: true,
          completedTrips: true,
          cancelledTrips: true,
          totalEarnings: true,
          rating: true,
        },
      });

      if (!rider) {
        return NextResponse.json(
          { success: false, error: 'Provider not found' },
          { status: 404 }
        );
      }

      // Get dispatch stats for this rider
      const dispatchStats = await db.dispatchMatch.groupBy({
        by: ['status'],
        where: { riderId: providerId },
        _count: { status: true },
        _avg: { matchScore: true },
      });

      const statusCounts: Record<string, number> = {};
      let avgMatchScore = 0;
      for (const row of dispatchStats) {
        statusCounts[row.status] = row._count.status;
        if (row._avg.matchScore) {
          avgMatchScore = Math.round(row._avg.matchScore * 100) / 100;
        }
      }

      const totalAssigned = statusCounts['ACCEPTED'] || 0;
      const totalRejected = statusCounts['REJECTED'] || 0;
      const totalExpired = statusCounts['EXPIRED'] || 0;
      const totalDispatches = Object.values(statusCounts).reduce((a, b) => a + b, 0);

      // Average response time for this rider
      const acceptedMatches = await db.dispatchMatch.findMany({
        where: {
          riderId: providerId,
          status: 'ACCEPTED',
          acceptedAt: { not: null },
        },
        select: {
          createdAt: true,
          acceptedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      const avgResponseTimeMs =
        acceptedMatches.length > 0
          ? Math.round(
              acceptedMatches.reduce((sum, m) => {
                return sum + (m.acceptedAt!.getTime() - m.createdAt.getTime());
              }, 0) / acceptedMatches.length
            )
          : 0;

      // Recent dispatch history
      const recentDispatches = await db.dispatchMatch.findMany({
        where: { riderId: providerId },
        include: {
          task: {
            select: {
              taskType: true,
              taskNumber: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return NextResponse.json({
        success: true,
        data: {
          providerId: rider.id,
          providerName: rider.fullName,
          providerPhone: rider.phone,
          providerType: rider.riderRole,
          tasksAssigned: totalAssigned,
          tasksCompleted: rider.completedTrips,
          tasksCancelled: rider.cancelledTrips,
          totalEarnings: rider.totalEarnings,
          averageRating: rider.rating,
          averageResponseTimeMs: avgResponseTimeMs,
          acceptanceRate:
            totalDispatches > 0
              ? ((totalAssigned / totalDispatches) * 100).toFixed(1)
              : '0',
          completionRate:
            totalAssigned > 0
              ? ((rider.completedTrips / totalAssigned) * 100).toFixed(1)
              : '0',
          avgMatchScore,
          dispatchHistory: recentDispatches.map((d) => ({
            id: d.id,
            taskType: d.task?.taskType,
            taskNumber: d.task?.taskNumber,
            status: d.status,
            matchScore: d.matchScore,
            createdAt: d.createdAt,
            acceptedAt: d.acceptedAt,
          })),
        },
      });
    }

    // Return all providers with dispatch stats
    const riders = await db.rider.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        fullName: true,
        riderRole: true,
        completedTrips: true,
        totalEarnings: true,
        rating: true,
      },
      orderBy: { completedTrips: 'desc' },
    });

    const providerData = await Promise.all(
      riders.map(async (rider) => {
        const dispatchCount = await db.dispatchMatch.count({
          where: { riderId: rider.id, status: 'ACCEPTED' },
        });

        return {
          providerId: rider.id,
          providerName: rider.fullName,
          providerType: rider.riderRole,
          tasksCompleted: rider.completedTrips,
          totalEarnings: rider.totalEarnings,
          averageRating: rider.rating,
          dispatchesAccepted: dispatchCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: providerData,
      count: providerData.length,
    });
  } catch (error) {
    console.error('Dispatch analytics by-provider error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch provider metrics' },
      { status: 500 }
    );
  }
}

/**
 * Get recent dispatch matches
 */
async function getRecentDispatches(limit: number) {
  try {
    const recent = await db.dispatchMatch.findMany({
      include: {
        task: {
          select: {
            taskType: true,
            taskNumber: true,
            pickupAddress: true,
            dropoffAddress: true,
          },
        },
        rider: {
          select: {
            fullName: true,
            phone: true,
            riderRole: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: recent.map((d) => ({
        id: d.id,
        taskId: d.taskId,
        taskType: d.task?.taskType,
        taskNumber: d.task?.taskNumber,
        riderId: d.riderId,
        riderName: d.rider?.fullName,
        matchScore: d.matchScore,
        distanceKm: d.distanceKm,
        estimatedArrival: d.estimatedArrival,
        matchReason: d.matchReason,
        status: d.status,
        createdAt: d.createdAt,
        acceptedAt: d.acceptedAt,
        rejectedAt: d.rejectedAt,
        expiredAt: d.expiredAt,
      })),
      count: recent.length,
    });
  } catch (error) {
    console.error('Dispatch analytics recent error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent dispatches' },
      { status: 500 }
    );
  }
}

/**
 * Get performance metrics over time intervals
 */
async function getPerformanceMetrics() {
  try {
    const now = new Date();
    const intervals = [
      { label: 'last_15_min', ms: 15 * 60 * 1000 },
      { label: 'last_30_min', ms: 30 * 60 * 1000 },
      { label: 'last_hour', ms: 60 * 60 * 1000 },
      { label: 'last_6_hours', ms: 6 * 60 * 60 * 1000 },
      { label: 'last_24_hours', ms: 24 * 60 * 60 * 1000 },
    ];

    const byInterval = await Promise.all(
      intervals.map(async ({ label, ms }) => {
        const cutoff = new Date(now.getTime() - ms);
        const total = await db.dispatchMatch.count({
          where: { createdAt: { gte: cutoff } },
        });
        const accepted = await db.dispatchMatch.count({
          where: {
            createdAt: { gte: cutoff },
            status: 'ACCEPTED',
          },
        });

        // Average dispatch time for this interval
        const acceptedMatches = await db.dispatchMatch.findMany({
          where: {
            createdAt: { gte: cutoff },
            status: 'ACCEPTED',
            acceptedAt: { not: null },
          },
          select: {
            createdAt: true,
            acceptedAt: true,
          },
        });

        const avgDispatchTimeMs =
          acceptedMatches.length > 0
            ? Math.round(
                acceptedMatches.reduce((sum, m) => {
                  return sum + (m.acceptedAt!.getTime() - m.createdAt.getTime());
                }, 0) / acceptedMatches.length
              )
            : 0;

        return {
          interval: label,
          total,
          accepted,
          acceptanceRate: total > 0 ? ((accepted / total) * 100).toFixed(1) : '0',
          avgDispatchTimeMs,
        };
      })
    );

    // Dispatch time distribution
    const acceptedMatches = await db.dispatchMatch.findMany({
      where: {
        status: 'ACCEPTED',
        acceptedAt: { not: null },
      },
      select: {
        createdAt: true,
        acceptedAt: true,
      },
    });

    const dispatchTimes = acceptedMatches.map((m) =>
      m.acceptedAt!.getTime() - m.createdAt.getTime()
    );

    const durationBuckets = [
      { label: '0-5s', min: 0, max: 5000 },
      { label: '5-15s', min: 5000, max: 15000 },
      { label: '15-30s', min: 15000, max: 30000 },
      { label: '30-60s', min: 30000, max: 60000 },
      { label: '1-2min', min: 60000, max: 120000 },
      { label: '2-5min', min: 120000, max: 300000 },
      { label: '>5min', min: 300000, max: Infinity },
    ];

    const durationDistribution = durationBuckets.map(({ label, min, max }) => ({
      label,
      count: dispatchTimes.filter((t) => t >= min && t < max).length,
    }));

    // Distance distribution
    const distanceMatches = await db.dispatchMatch.findMany({
      where: { distanceKm: { not: null } },
      select: { distanceKm: true },
    });

    const distances = distanceMatches.map((m) => m.distanceKm!);

    const radiusBuckets = [
      { label: '0-5km', min: 0, max: 5 },
      { label: '5-10km', min: 5, max: 10 },
      { label: '10-15km', min: 10, max: 15 },
      { label: '15-20km', min: 15, max: 20 },
      { label: '>20km', min: 20, max: Infinity },
    ];

    const radiusDistribution = radiusBuckets.map(({ label, min, max }) => ({
      label,
      count: distances.filter((d) => d >= min && d < max).length,
    }));

    // Recent dispatch activity grouped by hour (last 24 hours)
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentDispatches = await db.dispatchMatch.findMany({
      where: { createdAt: { gte: last24Hours } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by hour
    const hourlyActivity: Record<string, { total: number; accepted: number }> = {};
    for (const d of recentDispatches) {
      const hourKey = new Date(d.createdAt);
      hourKey.setMinutes(0, 0, 0);
      const key = hourKey.toISOString();

      if (!hourlyActivity[key]) {
        hourlyActivity[key] = { total: 0, accepted: 0 };
      }
      hourlyActivity[key].total++;
      if (d.status === 'ACCEPTED') {
        hourlyActivity[key].accepted++;
      }
    }

    const recentActivity = Object.entries(hourlyActivity)
      .map(([hour, data]) => ({
        hour,
        total: data.total,
        accepted: data.accepted,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return NextResponse.json({
      success: true,
      data: {
        byInterval,
        durationDistribution,
        radiusDistribution,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Dispatch analytics performance error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

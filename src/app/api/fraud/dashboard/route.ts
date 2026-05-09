import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/fraud/dashboard - Get fraud dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 24h, 7d, 30d

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get alert statistics
    const [
      totalAlerts,
      openAlerts,
      criticalAlerts,
      resolvedAlerts,
      falsePositives,
    ] = await Promise.all([
      db.fraudAlert.count({
        where: { createdAt: { gte: startDate } },
      }),
      db.fraudAlert.count({
        where: { createdAt: { gte: startDate }, status: 'OPEN' },
      }),
      db.fraudAlert.count({
        where: { createdAt: { gte: startDate }, severity: 'CRITICAL' },
      }),
      db.fraudAlert.count({
        where: { createdAt: { gte: startDate }, status: 'RESOLVED' },
      }),
      db.fraudAlert.count({
        where: { createdAt: { gte: startDate }, isFalsePositive: true },
      }),
    ]);

    // Get risk distribution
    const [
      lowRiskCount,
      mediumRiskCount,
      highRiskCount,
      criticalRiskCount,
    ] = await Promise.all([
      db.fraudRiskScore.count({ where: { riskLevel: 'LOW' } }),
      db.fraudRiskScore.count({ where: { riskLevel: 'MEDIUM' } }),
      db.fraudRiskScore.count({ where: { riskLevel: 'HIGH' } }),
      db.fraudRiskScore.count({ where: { riskLevel: 'CRITICAL' } }),
    ]);

    // Get flagged accounts
    const totalFlaggedAccounts = await db.fraudRiskScore.count({
      where: { hasSuspiciousActivity: true },
    });

    // Get suspended/frozen accounts
    const suspendedAccounts = await db.fraudRiskScore.count({
      where: { isRestricted: true },
    });

    // Get recent alerts
    const recentAlerts = await db.fraudAlert.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get alerts by type
    const alertsByType = await db.fraudAlert.groupBy({
      by: ['alertType'],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    // Get alerts by entity type
    const alertsByEntityType = await db.fraudAlert.groupBy({
      by: ['entityType'],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    // Get detection method breakdown
    const detectionMethods = await db.fraudAlert.groupBy({
      by: ['detectionMethod'],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    // Calculate detection accuracy
    const totalReviewed = resolvedAlerts + falsePositives;
    const detectionAccuracy = totalReviewed > 0 
      ? (resolvedAlerts - falsePositives) / totalReviewed 
      : null;
    const falsePositiveRate = totalReviewed > 0 
      ? falsePositives / totalReviewed 
      : null;

    // Get daily trend (last 7 days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const count = await db.fraudAlert.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });
      
      dailyTrend.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      });
    }

    // Save stats to cache
    await db.fraudDashboardStats.create({
      data: {
        totalAlerts,
        openAlerts,
        criticalAlerts,
        resolvedAlerts,
        falsePositives,
        totalFlaggedAccounts,
        suspendedAccounts,
        frozenAccounts: 0,
        ruleBasedDetections: detectionMethods.find(d => d.detectionMethod === 'RULE_BASED')?._count || 0,
        mlDetections: detectionMethods.find(d => d.detectionMethod === 'ML_MODEL')?._count || 0,
        manualReviews: detectionMethods.find(d => d.detectionMethod === 'MANUAL_REVIEW')?._count || 0,
        detectionAccuracy,
        falsePositiveRate,
        lowRiskCount,
        mediumRiskCount,
        highRiskCount,
        criticalRiskCount,
      },
    });

    return NextResponse.json({
      period,
      summary: {
        totalAlerts,
        openAlerts,
        criticalAlerts,
        resolvedAlerts,
        falsePositives,
        totalFlaggedAccounts,
        suspendedAccounts,
      },
      riskDistribution: {
        low: lowRiskCount,
        medium: mediumRiskCount,
        high: highRiskCount,
        critical: criticalRiskCount,
      },
      alertsByType: alertsByType.map(a => ({
        type: a.alertType,
        count: a._count,
      })),
      alertsByEntityType: alertsByEntityType.map(a => ({
        type: a.entityType,
        count: a._count,
      })),
      detectionMethods: detectionMethods.map(d => ({
        method: d.detectionMethod,
        count: d._count,
      })),
      performance: {
        detectionAccuracy,
        falsePositiveRate,
      },
      dailyTrend,
      recentAlerts,
    });
  } catch (error) {
    console.error('Error fetching fraud dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

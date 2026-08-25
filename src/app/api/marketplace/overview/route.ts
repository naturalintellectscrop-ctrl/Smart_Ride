import { NextRequest, NextResponse } from 'next/server';
import { allAdminsGuard } from '@/lib/auth/admin-guards';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api/response';
import { 
  calculateDemandSupplyRatio, 
  getBalanceStatus,
  calculateSurgeMultiplier,
  DEFAULT_SURGE_CONFIG,
  getBalanceStatusColor,
  getBalanceStatusLabel,
} from '@/lib/marketplace/balance-engine';

/**
 * GET /api/marketplace/overview
 * Get overall marketplace balance overview
 */
export async function GET(request: NextRequest) {
  // SECURITY: this route answered an unauthenticated GET with real data.
  // Verified against a running server before this guard was added.
  const guard = allAdminsGuard(request);
  if (!guard.success) {
    return NextResponse.json(
      { success: false, error: guard.error },
      { status: guard.statusCode || 401 }
    );
  }

  await setServiceRoleContext();
  try {
    // Get all active zones with latest metrics
    const zones = await db.geographicZone.findMany({
      where: { isActive: true },
      include: {
        zoneMetrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        surgeRecords: {
          where: { status: 'ACTIVE' },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    // Calculate overall stats
    let totalRideRequests = 0;
    let totalActiveDrivers = 0;
    let totalAvailableDrivers = 0;
    let oversuppliedZones = 0;
    let balancedZones = 0;
    let highDemandZones = 0;
    let surgeZones = 0;
    let criticalZones = 0;
    let activeSurges = 0;

    const zoneStats = zones.map(zone => {
      const latestMetric = zone.zoneMetrics[0];
      const activeSurge = zone.surgeRecords[0];
      
      const rideRequests = latestMetric?.rideRequests || 0;
      const availableDrivers = latestMetric?.availableDrivers || 0;
      const ratio = calculateDemandSupplyRatio(rideRequests, availableDrivers);
      const status = getBalanceStatus(ratio);
      
      totalRideRequests += rideRequests;
      totalActiveDrivers += latestMetric?.activeDrivers || 0;
      totalAvailableDrivers += availableDrivers;
      
      // Count by status
      switch (status) {
        case 'OVERSUPPLIED': oversuppliedZones++; break;
        case 'BALANCED': balancedZones++; break;
        case 'HIGH_DEMAND': highDemandZones++; break;
        case 'SURGE': surgeZones++; break;
        case 'CRITICAL': criticalZones++; break;
      }
      
      if (activeSurge || status === 'SURGE' || status === 'CRITICAL') {
        activeSurges++;
      }
      
      return {
        id: zone.id,
        name: zone.name,
        code: zone.code,
        zoneType: zone.zoneType,
        centerLatitude: zone.centerLatitude,
        centerLongitude: zone.centerLongitude,
        rideRequests,
        activeDrivers: latestMetric?.activeDrivers || 0,
        availableDrivers,
        ratio: Math.round(ratio * 100) / 100,
        status,
        statusColor: getBalanceStatusColor(status),
        statusLabel: getBalanceStatusLabel(status),
        surgeActive: !!activeSurge,
        surgeMultiplier: activeSurge?.startMultiplier || 1.0,
        recordedAt: latestMetric?.recordedAt || null,
      };
    });

    // Get active incentives count
    const activeIncentives = await db.driverIncentive.count({
      where: { status: 'ACTIVE' },
    });

    // Recent demand-supply history, for the ratio sparkline on the dashboard.
    //
    // ZoneMetric already records demandSupplyRatio against a timeBucket, so the
    // trend is real data that was being thrown away — the query above takes
    // only the newest row per zone. This averages every zone's ratio within
    // each bucket to get the marketplace-wide ratio over time. Read-only: it
    // adds a field to the response and changes nothing about how the numbers
    // are produced.
    const TREND_BUCKETS = 24;
    const trendRows = await db.zoneMetric.findMany({
      where: {
        timeBucket: { gte: new Date(Date.now() - TREND_BUCKETS * 60 * 60 * 1000) },
      },
      select: { timeBucket: true, demandSupplyRatio: true },
      orderBy: { timeBucket: 'asc' },
    });

    const bucketTotals = new Map<string, { sum: number; count: number }>();
    for (const row of trendRows) {
      const key = row.timeBucket.toISOString();
      const entry = bucketTotals.get(key) || { sum: 0, count: 0 };
      entry.sum += row.demandSupplyRatio;
      entry.count += 1;
      bucketTotals.set(key, entry);
    }

    const ratioTrend = Array.from(bucketTotals.entries())
      .map(([t, { sum, count }]) => ({
        t,
        ratio: Math.round((sum / count) * 100) / 100,
      }))
      .slice(-TREND_BUCKETS);

    // Calculate overall ratio
    const overallRatio = calculateDemandSupplyRatio(totalRideRequests, totalAvailableDrivers);

    const overview = {
      // Overall Metrics
      totalRideRequests,
      totalActiveDrivers,
      totalAvailableDrivers,
      overallRatio: Math.round(overallRatio * 100) / 100,
      overallStatus: getBalanceStatus(overallRatio),
      overallStatusLabel: getBalanceStatusLabel(getBalanceStatus(overallRatio)),
      
      // Zone Distribution
      totalZones: zones.length,
      oversuppliedZones,
      balancedZones,
      highDemandZones,
      surgeZones,
      criticalZones,
      
      // Active Programs
      activeSurges,
      activeIncentives,
      
      // Zone Details
      zones: zoneStats,

      // Demand-supply ratio over the last 24 hourly buckets. Empty when the
      // metrics collector has not run yet; the dashboard hides the sparkline
      // rather than drawing a flat invented line.
      ratioTrend,
      
      // Timestamp
      recordedAt: new Date(),
    };

    return successResponse(overview);
  } catch (error) {
    console.error('Error fetching marketplace overview:', error);
    return serverErrorResponse('Failed to fetch marketplace overview');
  } finally {
    await resetRLSContext();
  }
}

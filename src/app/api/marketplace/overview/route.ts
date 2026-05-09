import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
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
      
      // Timestamp
      recordedAt: new Date(),
    };

    return successResponse(overview);
  } catch (error) {
    console.error('Error fetching marketplace overview:', error);
    return serverErrorResponse('Failed to fetch marketplace overview');
  }
}

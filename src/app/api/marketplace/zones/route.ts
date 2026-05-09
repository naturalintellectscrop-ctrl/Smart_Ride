import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { 
  calculateDemandSupplyRatio, 
  getBalanceStatus,
  getBalanceStatusColor,
  getBalanceStatusLabel,
  calculateSurgeMultiplier,
  generateBalanceActions,
  DEFAULT_SURGE_CONFIG,
} from '@/lib/marketplace/balance-engine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/marketplace/zones
 * Get all zones with current balance status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const zoneType = searchParams.get('zoneType');

    // Build filter
    const where: Record<string, unknown> = { isActive: true };
    if (zoneType) {
      where.zoneType = zoneType;
    }

    const zones = await db.geographicZone.findMany({
      where,
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
      orderBy: { priority: 'desc' },
    });

    const zonesWithStats = zones.map(zone => {
      const latestMetric = zone.zoneMetrics[0];
      const activeSurge = zone.surgeRecords[0];
      
      const rideRequests = latestMetric?.rideRequests || 0;
      const availableDrivers = latestMetric?.availableDrivers || 0;
      const ratio = calculateDemandSupplyRatio(rideRequests, availableDrivers);
      const balanceStatus = getBalanceStatus(ratio);
      
      // Calculate recommended surge multiplier
      const surgeMultiplier = calculateSurgeMultiplier(ratio, DEFAULT_SURGE_CONFIG);
      
      // Generate recommended actions
      const actions = generateBalanceActions(
        zone.id,
        zone.name,
        ratio,
        activeSurge?.startMultiplier || 1.0,
        DEFAULT_SURGE_CONFIG
      );
      
      return {
        id: zone.id,
        name: zone.name,
        code: zone.code,
        zoneType: zone.zoneType,
        priority: zone.priority,
        center: {
          lat: zone.centerLatitude,
          lng: zone.centerLongitude,
        },
        radiusKm: zone.radiusKm,
        
        // Current Metrics
        metrics: {
          rideRequests,
          uniqueRequesters: latestMetric?.uniqueRequesters || 0,
          activeDrivers: latestMetric?.activeDrivers || 0,
          availableDrivers,
          busyDrivers: latestMetric?.busyDrivers || 0,
          avgWaitTimeSeconds: latestMetric?.avgWaitTimeSeconds || null,
          cancellationRate: latestMetric?.cancellationRate || null,
          driverAcceptanceRate: latestMetric?.driverAcceptanceRate || null,
        },
        
        // Balance Status
        balance: {
          ratio: Math.round(ratio * 100) / 100,
          status: balanceStatus,
          statusColor: getBalanceStatusColor(balanceStatus),
          statusLabel: getBalanceStatusLabel(balanceStatus),
        },
        
        // Surge Status
        surge: {
          active: !!activeSurge,
          multiplier: activeSurge?.startMultiplier || 1.0,
          recommendedMultiplier: surgeMultiplier,
          startedAt: activeSurge?.startedAt || null,
          durationMinutes: activeSurge ? 
            Math.round((Date.now() - new Date(activeSurge.startedAt).getTime()) / 60000) : 0,
        },
        
        // External Factors
        external: {
          weatherCondition: latestMetric?.weatherCondition || null,
          trafficLevel: latestMetric?.trafficLevel || null,
          specialEvent: latestMetric?.specialEvent || null,
        },
        
        // Predictions
        predictions: {
          predictedDemand: latestMetric?.predictedDemand || null,
          predictedSupply: latestMetric?.predictedSupply || null,
          predictedRatio: latestMetric?.predictedRatio || null,
        },
        
        // Recommended Actions
        recommendedActions: actions.slice(0, 3),
        
        // Timestamps
        recordedAt: latestMetric?.recordedAt || null,
      };
    });

    // Filter by status if provided
    const filteredZones = status 
      ? zonesWithStats.filter(z => z.balance.status === status)
      : zonesWithStats;

    return successResponse({
      zones: filteredZones,
      total: filteredZones.length,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Error fetching zones:', error);
    return serverErrorResponse('Failed to fetch zones');
  }
}

/**
 * POST /api/marketplace/zones
 * Create a new geographic zone
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const zone = await db.geographicZone.create({
      data: {
        name: body.name,
        code: body.code,
        centerLatitude: body.centerLatitude,
        centerLongitude: body.centerLongitude,
        radiusKm: body.radiusKm || 5,
        zoneType: body.zoneType || 'URBAN',
        priority: body.priority || 1,
        boundaries: body.boundaries || null,
      },
    });

    return successResponse(zone, 'Zone created successfully', 201);
  } catch (error) {
    console.error('Error creating zone:', error);
    return serverErrorResponse('Failed to create zone');
  }
}

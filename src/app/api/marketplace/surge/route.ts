import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { 
  calculateDemandSupplyRatio, 
  getBalanceStatus,
  calculateSurgeMultiplier,
  DEFAULT_SURGE_CONFIG,
} from '@/lib/marketplace/balance-engine';
import {
  notifySurgeActivation,
  warnClientsAboutSurge
} from '@/lib/services/notification.service';

/**
 * GET /api/marketplace/surge
 * Get all active surge pricing zones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const zoneId = searchParams.get('zoneId');

    // Build filter
    const where: Record<string, unknown> = {};
    if (activeOnly) {
      where.status = 'ACTIVE';
    }
    if (zoneId) {
      where.zoneId = zoneId;
    }

    const surgeRecords = await db.surgeRecord.findMany({
      where,
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            code: true,
            zoneType: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const formattedRecords = surgeRecords.map(record => ({
      id: record.id,
      zone: record.zone,
      status: record.status,
      multiplier: record.startMultiplier,
      peakMultiplier: record.peakMultiplier,
      avgMultiplier: record.avgMultiplier,
      triggerRatio: record.triggerRatio,
      triggerReason: record.triggerReason,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      durationMinutes: record.durationMinutes,
      impact: {
        driversBefore: record.driversBefore,
        driversAfter: record.driversAfter,
        demandBefore: record.demandBefore,
        demandAfter: record.demandAfter,
      },
      revenue: {
        normalRevenue: record.normalRevenue,
        surgeRevenue: record.surgeRevenue,
        revenueIncrease: record.revenueIncrease,
      },
    }));

    return successResponse({
      surges: formattedRecords,
      total: formattedRecords.length,
      activeCount: surgeRecords.filter(r => r.status === 'ACTIVE').length,
    });
  } catch (error) {
    console.error('Error fetching surge records:', error);
    return serverErrorResponse('Failed to fetch surge records');
  }
}

/**
 * POST /api/marketplace/surge
 * Manually start surge pricing for a zone
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zoneId, multiplier, reason } = body;

    if (!zoneId) {
      return errorResponse('Zone ID is required');
    }

    // Check if zone exists
    const zone = await db.geographicZone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      return errorResponse('Zone not found');
    }

    // Check for existing active surge
    const existingSurge = await db.surgeRecord.findFirst({
      where: { zoneId, status: 'ACTIVE' },
    });

    if (existingSurge) {
      return errorResponse('Active surge already exists for this zone');
    }

    // Get current zone metrics
    const latestMetric = await db.zoneMetric.findFirst({
      where: { zoneId },
      orderBy: { recordedAt: 'desc' },
    });

    const rideRequests = latestMetric?.rideRequests || 0;
    const availableDrivers = latestMetric?.availableDrivers || 0;
    const ratio = calculateDemandSupplyRatio(rideRequests, availableDrivers);

    // Calculate or use provided multiplier
    const surgeMultiplier = multiplier || calculateSurgeMultiplier(ratio, DEFAULT_SURGE_CONFIG);

    // Create surge record
    const surge = await db.surgeRecord.create({
      data: {
        zoneId,
        startMultiplier: surgeMultiplier,
        triggerRatio: ratio,
        triggerReason: reason || 'Manual trigger by admin',
        status: 'ACTIVE',
        driversBefore: availableDrivers,
        demandBefore: rideRequests,
      },
    });

    // Update zone metric
    await db.zoneMetric.create({
      data: {
        zoneId,
        timeBucket: new Date().toISOString().slice(0, 13).replace('T', '-'),
        rideRequests,
        activeDrivers: latestMetric?.activeDrivers || 0,
        availableDrivers,
        busyDrivers: latestMetric?.busyDrivers || 0,
        demandSupplyRatio: ratio,
        balanceStatus: getBalanceStatus(ratio),
        surgeActive: true,
        surgeMultiplier,
      },
    });

    // Send notifications to riders and clients
    let riderNotificationResult = null;
    let clientNotificationResult = null;
    
    try {
      // Notify all online riders about surge opportunity
      riderNotificationResult = await notifySurgeActivation(
        zoneId,
        zone.name,
        surgeMultiplier,
        reason || 'High demand in this area'
      );
      
      // Warn clients in the zone about surge pricing
      clientNotificationResult = await warnClientsAboutSurge(
        zoneId,
        zone.name,
        surgeMultiplier
      );
    } catch (notifError) {
      console.error('Failed to send surge notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    return successResponse({
      surge: {
        id: surge.id,
        zoneId,
        zoneName: zone.name,
        multiplier: surgeMultiplier,
        triggerRatio: ratio,
        reason: surge.triggerReason,
        startedAt: surge.startedAt,
      },
      notifications: {
        ridersNotified: riderNotificationResult?.recipientCount || 0,
        clientsNotified: clientNotificationResult?.recipientCount || 0,
      },
    }, 'Surge pricing activated successfully', 201);
  } catch (error) {
    console.error('Error starting surge:', error);
    return serverErrorResponse('Failed to start surge pricing');
  }
}

/**
 * PATCH /api/marketplace/surge
 * End surge pricing for a zone
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { surgeId, reason } = body;

    if (!surgeId) {
      return errorResponse('Surge ID is required');
    }

    const surge = await db.surgeRecord.findUnique({
      where: { id: surgeId },
      include: { zone: true },
    });

    if (!surge) {
      return errorResponse('Surge record not found');
    }

    if (surge.status !== 'ACTIVE') {
      return errorResponse('Surge is not active');
    }

    // Calculate duration
    const endedAt = new Date();
    const durationMinutes = Math.round(
      (endedAt.getTime() - new Date(surge.startedAt).getTime()) / 60000
    );

    // Update surge record
    const updatedSurge = await db.surgeRecord.update({
      where: { id: surgeId },
      data: {
        status: 'ENDED',
        endedAt,
        durationMinutes,
      },
    });

    return successResponse({
      surge: {
        id: updatedSurge.id,
        zoneId: surge.zoneId,
        zoneName: surge.zone.name,
        status: 'ENDED',
        endedAt,
        durationMinutes,
        endReason: reason,
      },
    }, 'Surge pricing ended successfully');
  } catch (error) {
    console.error('Error ending surge:', error);
    return serverErrorResponse('Failed to end surge pricing');
  }
}

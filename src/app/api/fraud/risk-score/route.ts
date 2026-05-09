import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/fraud/risk-score - Get risk score for an entity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as 'CLIENT' | 'RIDER' | 'MERCHANT' | 'PHARMACY';
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const riskScore = await db.fraudRiskScore.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    if (!riskScore) {
      // Create default risk score
      const newRiskScore = await db.fraudRiskScore.create({
        data: {
          entityType,
          entityId,
          riskScore: 0,
          riskLevel: 'LOW',
        },
      });
      return NextResponse.json(newRiskScore);
    }

    return NextResponse.json(riskScore);
  } catch (error) {
    console.error('Error fetching risk score:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk score' },
      { status: 500 }
    );
  }
}

// POST /api/fraud/risk-score - Calculate and update risk score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    // Calculate risk score based on activity
    const score = await calculateRiskScore(entityType as 'CLIENT' | 'RIDER' | 'MERCHANT' | 'PHARMACY', entityId);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (score >= 76) {
      riskLevel = 'CRITICAL';
    } else if (score >= 51) {
      riskLevel = 'HIGH';
    } else if (score >= 26) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Update or create risk score
    const riskScore = await db.fraudRiskScore.upsert({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
      update: {
        riskScore: score,
        riskLevel,
        lastAnalyzedAt: new Date(),
      },
      create: {
        entityType,
        entityId,
        riskScore: score,
        riskLevel,
        lastAnalyzedAt: new Date(),
      },
    });

    // Check if automatic actions should be taken
    if (riskLevel === 'CRITICAL') {
      await handleCriticalRisk(entityType, entityId);
    } else if (riskLevel === 'HIGH') {
      await handleHighRisk(entityType, entityId);
    }

    return NextResponse.json(riskScore);
  } catch (error) {
    console.error('Error calculating risk score:', error);
    return NextResponse.json(
      { error: 'Failed to calculate risk score' },
      { status: 500 }
    );
  }
}

// Calculate risk score based on entity type and activity
async function calculateRiskScore(
  entityType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'PHARMACY',
  entityId: string
): Promise<number> {
  let score = 0;

  try {
    if (entityType === 'CLIENT') {
      // Get user's orders and tasks
      const orders = await db.order.count({
        where: { clientId: entityId },
      });
      const cancelledOrders = await db.order.count({
        where: { clientId: entityId, status: 'CANCELLED' },
      });
      const tasks = await db.task.count({
        where: { clientId: entityId },
      });
      const cancelledTasks = await db.task.count({
        where: { clientId: entityId, status: 'CANCELLED' },
      });

      const totalActivities = orders + tasks;
      const totalCancellations = cancelledOrders + cancelledTasks;
      const cancellationRate = totalActivities > 0 ? totalCancellations / totalActivities : 0;

      // Calculate score components
      if (cancellationRate > 0.5) score += 30;
      else if (cancellationRate > 0.3) score += 20;
      else if (cancellationRate > 0.15) score += 10;

      // Check for high frequency orders (possible promotion abuse)
      const recentOrders = await db.order.count({
        where: {
          clientId: entityId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (recentOrders > 10) score += 25;
      else if (recentOrders > 5) score += 15;

      // Check refund requests
      const refunds = await db.payment.count({
        where: {
          userId: entityId,
          status: 'REFUNDED',
        },
      });
      if (refunds > 5) score += 20;
      else if (refunds > 2) score += 10;

    } else if (entityType === 'RIDER') {
      const rider = await db.rider.findUnique({
        where: { id: entityId },
        select: {
          totalTrips: true,
          cancelledTrips: true,
          completedTrips: true,
        },
      });

      if (rider) {
        const cancellationRate = rider.totalTrips > 0 
          ? rider.cancelledTrips / rider.totalTrips 
          : 0;

        if (cancellationRate > 0.3) score += 30;
        else if (cancellationRate > 0.15) score += 15;

        // Check completion rate
        const completionRate = rider.totalTrips > 0
          ? rider.completedTrips / rider.totalTrips
          : 1;
        if (completionRate < 0.5) score += 25;
        else if (completionRate < 0.7) score += 15;
      }

      // Check for location anomalies (impossible travel)
      const recentHeartbeats = await db.heartbeatLog.findMany({
        where: {
          riderId: entityId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (recentHeartbeats.length >= 2) {
        for (let i = 1; i < recentHeartbeats.length; i++) {
          const prev = recentHeartbeats[i - 1];
          const curr = recentHeartbeats[i];
          const distance = calculateDistance(
            prev.latitude, prev.longitude,
            curr.latitude, curr.longitude
          );
          const timeDiff = (prev.createdAt.getTime() - curr.createdAt.getTime()) / 1000 / 3600; // hours
          if (timeDiff > 0 && distance / timeDiff > 200) { // > 200 km/h
            score += 30; // Impossible travel detected
            break;
          }
        }
      }

    } else if (entityType === 'MERCHANT') {
      const orders = await db.order.count({
        where: { merchantId: entityId },
      });
      const cancelledOrders = await db.order.count({
        where: { merchantId: entityId, status: 'CANCELLED' },
      });

      const cancellationRate = orders > 0 ? cancelledOrders / orders : 0;
      if (cancellationRate > 0.3) score += 30;
      else if (cancellationRate > 0.15) score += 15;

      // Check for high rejection rate
      const rejectedOrders = await db.order.count({
        where: { merchantId: entityId, status: 'REJECTED' },
      });
      const rejectionRate = orders > 0 ? rejectedOrders / orders : 0;
      if (rejectionRate > 0.2) score += 25;

    } else if (entityType === 'PHARMACY') {
      // Check prescription rejection rate
      const prescriptions = await db.prescription.count({
        where: { verifiedBy: entityId },
      });
      const rejectedPrescriptions = await db.prescription.count({
        where: { verifiedBy: entityId, status: 'REJECTED' },
      });

      const rejectionRate = prescriptions > 0 ? rejectedPrescriptions / prescriptions : 0;
      if (rejectionRate > 0.3) score += 20;
    }

    // Cap score at 100
    return Math.min(score, 100);
  } catch (error) {
    console.error('Error in calculateRiskScore:', error);
    return 0;
  }
}

// Handle critical risk level
async function handleCriticalRisk(entityType: string, entityId: string) {
  // Create fraud alert
  await db.fraudAlert.create({
    data: {
      alertNumber: `FRA-${Date.now()}`,
      entityType: entityType as any,
      entityId,
      alertType: 'ABNORMAL_ORDER_FREQUENCY',
      severity: 'CRITICAL',
      detectionMethod: 'RULE_BASED',
      riskScoreAtDetection: 76,
      evidence: JSON.stringify({ automaticAction: 'temporary_suspension' }),
    },
  });

  // Apply restrictions based on entity type
  if (entityType === 'CLIENT') {
    await db.user.update({
      where: { id: entityId },
      data: { status: 'SUSPENDED' },
    });
  } else if (entityType === 'RIDER') {
    await db.rider.update({
      where: { id: entityId },
      data: { status: 'SUSPENDED' },
    });
  } else if (entityType === 'MERCHANT') {
    await db.merchant.update({
      where: { id: entityId },
      data: { status: 'SUSPENDED' },
    });
  }

  // Update risk score with restriction
  await db.fraudRiskScore.update({
    where: {
      entityType_entityId: {
        entityType: entityType as any,
        entityId,
      },
    },
    data: {
      isRestricted: true,
      restrictionsApplied: JSON.stringify(['account_suspended']),
    },
  });
}

// Handle high risk level
async function handleHighRisk(entityType: string, entityId: string) {
  // Create fraud alert
  await db.fraudAlert.create({
    data: {
      alertNumber: `FRA-${Date.now()}`,
      entityType: entityType as any,
      entityId,
      alertType: 'ABNORMAL_ORDER_FREQUENCY',
      severity: 'HIGH',
      detectionMethod: 'RULE_BASED',
      riskScoreAtDetection: 51,
      evidence: JSON.stringify({ automaticAction: 'flagged_for_review' }),
    },
  });

  // Flag for monitoring
  await db.fraudRiskScore.update({
    where: {
      entityType_entityId: {
        entityType: entityType as any,
        entityId,
      },
    },
    data: {
      isRestricted: true,
      restrictionsApplied: JSON.stringify(['order_frequency_limit', 'requires_monitoring']),
    },
  });
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Fraud Detection API Endpoints
 * Admin-only access for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { FraudDetectionService } from '@/lib/fraud/fraud-detection.service';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';

// ============================================
// GET - Fetch fraud data (Admin only)
// ============================================

export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const user = authResult as JWTPayload;
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'alerts':
        return await getAlerts(searchParams);
      case 'alert':
        return await getAlert(searchParams.get('id'));
      case 'statistics':
        return await getStatistics();
      case 'rider-profile':
        return await getRiderProfile(searchParams.get('riderId'));
      case 'high-risk':
        return await getHighRiskEntities(searchParams);
      case 'recent-anomalies':
        return await getRecentAnomalies(searchParams);
      default:
        return getDashboardData();
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// POST - Analyze and create (Admin only)
// ============================================

export async function POST(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const user = authResult as JWTPayload;
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'analyze':
        return await analyzeTask(body.taskId);
      case 'gps-check':
        return await checkGPS(body);
      case 'create-alert':
        return await createAlert(body);
      case 'update-interaction':
        return await updateInteraction(body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// PUT - Update/Resolve (Admin only)
// ============================================

export async function PUT(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const user = authResult as JWTPayload;
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'resolve-alert':
        return await resolveAlert(body, user.userId);
      case 'update-profile':
        return await updateRiderProfile(body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// Action Handlers
// ============================================

async function getAlerts(params: URLSearchParams) {
  const status = params.get('status');
  const severity = params.get('severity');
  const type = params.get('type');
  const limit = parseInt(params.get('limit') || '50');
  const offset = parseInt(params.get('offset') || '0');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (type) where.alertType = type;

  const [alerts, total] = await Promise.all([
    db.fraudAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: true,
      },
    }),
    db.fraudAlert.count({ where }),
  ]);

  return NextResponse.json({ alerts, total, hasMore: offset + alerts.length < total });
}

async function getAlert(id: string | null) {
  if (!id) {
    return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
  }

  const alert = await db.fraudAlert.findUnique({
    where: { id },
  });

  if (!alert) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  return NextResponse.json({ alert });
}

async function getStatistics() {
  const stats = await FraudDetectionService.getStatistics();
  return NextResponse.json(stats);
}

async function getRiderProfile(riderId: string | null) {
  if (!riderId) {
    return NextResponse.json({ error: 'Rider ID required' }, { status: 400 });
  }

  const profile = await db.riderFraudProfile.findUnique({
    where: { riderId },
  });

  const recentHistory = await db.fraudScoreHistoryRecord.findMany({
    where: { entityType: 'RIDER', entityId: riderId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json({ profile, recentHistory });
}

async function getHighRiskEntities(params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '20');

  const [highRiskRiders, highRiskAlerts] = await Promise.all([
    db.riderFraudProfile.findMany({
      where: { overallRiskScore: { gte: 60 } },
      orderBy: { overallRiskScore: 'desc' },
      take: limit,
    }),
    db.fraudAlert.findMany({
      where: { 
        status: 'OPEN',
        severity: { in: ['HIGH', 'CRITICAL'] }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  return NextResponse.json({ highRiskRiders, highRiskAlerts });
}

async function getRecentAnomalies(params: URLSearchParams) {
  const hours = parseInt(params.get('hours') || '24');
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const anomalies = await db.gPSAnomaly.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const anomaliesByType = await db.gPSAnomaly.groupBy({
    by: ['anomalyType'],
    where: { createdAt: { gte: since } },
    _count: true,
  });

  return NextResponse.json({ 
    anomalies, 
    summary: Object.fromEntries(anomaliesByType.map(a => [a.anomalyType, a._count]))
  });
}

async function getDashboardData() {
  // Parallel fetch for speed
  const [stats, recentAlerts, highRiskCount, recentAnomalies] = await Promise.all([
    FraudDetectionService.getStatistics(),
    db.fraudAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.riderFraudProfile.count({ where: { overallRiskScore: { gte: 60 } } }),
    db.gPSAnomaly.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return NextResponse.json({
    ...stats,
    highRiskCount,
    recentAnomalies24h: recentAnomalies,
    recentAlerts,
  });
}

async function analyzeTask(taskId: string) {
  if (!taskId) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
  }

  const result = await FraudDetectionService.analyzeTask(taskId);
  
  // Create alert if high risk
  if (result.riskScore >= 60 && result.alerts.length > 0) {
    const topAlert = result.alerts[0];
    await FraudDetectionService.createAlert({
      type: topAlert.type,
      severity: topAlert.severity,
      taskId,
      title: `High Risk Task Detected (Score: ${result.riskScore})`,
      description: topAlert.message,
      riskScore: result.riskScore,
      evidence: result.breakdown,
    });
  }

  return NextResponse.json(result);
}

async function checkGPS(data: {
  riderId: string;
  taskId?: string;
  currentLat: number;
  currentLng: number;
  previousLat: number | null;
  previousLng: number | null;
  timestamp: string;
}) {
  if (!data.riderId) {
    return NextResponse.json({ error: 'Rider ID required' }, { status: 400 });
  }

  const result = await FraudDetectionService.detectGPSAnomaly(
    data.riderId,
    data.taskId || '',
    data.currentLat,
    data.currentLng,
    data.previousLat,
    data.previousLng,
    new Date(data.timestamp)
  );

  return NextResponse.json(result);
}

async function createAlert(data: Record<string, unknown>) {
  await FraudDetectionService.createAlert(data);
  return NextResponse.json({ success: true });
}

async function updateInteraction(data: { riderId: string; clientId: string; taskData?: unknown }) {
  const { riderId, clientId } = data;
  
  // Upsert interaction record
  const existing = await db.driverRiderInteraction.findUnique({
    where: { riderId_clientId: { riderId, clientId } },
  });

  if (existing) {
    await db.driverRiderInteraction.update({
      where: { id: existing.id },
      data: {
        totalRides: { increment: 1 },
        lastInteractionAt: new Date(),
      },
    });
  } else {
    await db.driverRiderInteraction.create({
      data: {
        riderId,
        clientId,
        totalRides: 1,
      },
    });
  }

  return NextResponse.json({ success: true });
}

async function resolveAlert(data: { alertId: string; resolution: string }, resolvedBy: string) {
  const { alertId, resolution } = data;

  const alert = await db.fraudAlert.update({
    where: { id: alertId },
    data: {
      status: 'RESOLVED',
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, alert });
}

async function updateRiderProfile(data: { riderId: string; updates: Record<string, unknown> }) {
  const { riderId, updates } = data;

  const profile = await db.riderFraudProfile.upsert({
    where: { riderId },
    update: updates,
    create: { riderId, ...updates },
  });

  return NextResponse.json({ success: true, profile });
}

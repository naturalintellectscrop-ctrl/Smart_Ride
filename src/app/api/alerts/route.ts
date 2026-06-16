import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { requireAuth, requireAdmin } from '@/lib/auth/guards';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';

// GET /api/alerts - Get connection alerts
export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get('rider_id');
    const taskId = searchParams.get('task_id');
    const unacknowledged = searchParams.get('unacknowledged') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Prisma.ConnectionAlertWhereInput = {};
    
    if (riderId) {
      where.riderId = riderId;
    }
    
    if (taskId) {
      where.taskId = taskId;
    }
    
    if (unacknowledged) {
      where.isAcknowledged = false;
    }

    const alerts = await db.connectionAlert.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Get counts by severity
    const counts = await db.connectionAlert.groupBy({
      by: ['severity'],
      where: { isAcknowledged: false },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      alerts,
      counts: counts.reduce((acc, c) => {
        acc[c.severity] = c._count.id;
        return acc;
      }, {} as Record<string, number>),
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST /api/alerts - Create a new alert (usually done by monitoring service)
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.standard);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.standard);
  }

  // Require admin authentication for creating alerts
  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  await setServiceRoleContext();
  try {
    const body = await request.json();
    
    const {
      riderId,
      taskId,
      alertType,
      severity,
      message,
    } = body;

    if (!riderId || !alertType || !severity || !message) {
      return NextResponse.json({ success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const alert = await db.connectionAlert.create({
      data: {
        id: randomUUID(),
        riderId,
        taskId: taskId || null,
        alertType,
        severity,
        message,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(alert, { status: 201 });

  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// PATCH /api/alerts - Acknowledge an alert
export async function PATCH(request: NextRequest) {
  // Require authentication
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { alertId, acknowledgedBy, resolutionNotes, isResolved } = body;

    if (!alertId) {
      return NextResponse.json({ success: false, error: 'Missing alertId' },
        { status: 400 }
      );
    }

    const updateData: Prisma.ConnectionAlertUpdateInput = {};
    
    if (acknowledgedBy) {
      updateData.isAcknowledged = true;
      updateData.acknowledgedAt = new Date();
      updateData.acknowledgedBy = acknowledgedBy;
    }
    
    if (isResolved) {
      updateData.isResolved = true;
      updateData.resolvedAt = new Date();
    }
    
    if (resolutionNotes) {
      updateData.resolutionNotes = resolutionNotes;
    }

    const alert = await db.connectionAlert.update({
      where: { id: alertId },
      data: updateData,
    });

    return NextResponse.json(alert);

  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

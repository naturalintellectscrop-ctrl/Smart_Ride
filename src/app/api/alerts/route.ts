import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/alerts - Get connection alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get('rider_id');
    const taskId = searchParams.get('task_id');
    const unacknowledged = searchParams.get('unacknowledged') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create a new alert (usually done by monitoring service)
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const alert = await db.connectionAlert.create({
      data: {
        riderId,
        taskId: taskId || null,
        alertType,
        severity,
        message,
      },
    });

    return NextResponse.json(alert, { status: 201 });

  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/alerts - Acknowledge an alert
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, acknowledgedBy, resolutionNotes, isResolved } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'Missing alertId' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

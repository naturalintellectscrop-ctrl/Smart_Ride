import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

// GET /api/sos - List SOS alerts (admin only)
export async function GET(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }

    const alerts = await db.sOSAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.sOSAlert.count({ where });

    return NextResponse.json({
      alerts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + alerts.length < total,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch SOS alerts' },
      { status: 500 }
    );
  }
}

// POST /api/sos - Create new SOS alert (authenticated users/riders)
export async function POST(request: NextRequest) {
  // Require authentication (any authenticated user can trigger SOS)
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const user = authResult as JWTPayload;

  try {
    const body = await request.json();
    const {
      riderId,
      taskId,
      latitude,
      longitude,
      locationAddress,
    } = body;

    // Validate required fields
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    // Generate alert number
    const alertNumber = `SOS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Get user info
    const userInfo = await db.user.findUnique({
      where: { id: user.userId },
      select: { name: true, phone: true },
    });

    // Get rider info if applicable
    let riderInfo = null;
    if (riderId) {
      riderInfo = await db.rider.findUnique({
        where: { id: riderId },
        select: { fullName: true, phone: true, vehicle: true },
      });
    }

    // Create SOS alert
    const alert = await db.sOSAlert.create({
      data: {
        alertNumber,
        userId: user.userId,
        riderId: riderId || null,
        userType: riderId ? 'RIDER' : 'CLIENT',
        userName: userInfo?.name || 'Unknown',
        userPhone: userInfo?.phone || '',
        riderName: riderInfo?.fullName || null,
        riderPhone: riderInfo?.phone || null,
        vehicleInfo: riderInfo?.vehicle 
          ? `${riderInfo.vehicle.make} ${riderInfo.vehicle.model} - ${riderInfo.vehicle.plateNumber}` 
          : null,
        taskId: taskId || null,
        latitude,
        longitude,
        locationAddress: locationAddress || null,
        status: 'ACTIVE',
      },
    });

    // Create notification for admin safety team
    await db.notification.create({
      data: {
        userId: user.userId,
        title: 'SOS Alert Triggered',
        message: `Emergency alert ${alertNumber} triggered by ${userInfo?.name || 'Unknown User'}`,
        type: 'SOS_ALERT',
        referenceId: alert.id,
        referenceType: 'SOS_ALERT',
      },
    });

    // Create audit log for SOS trigger
    try {
      await createAuditLog({
        action: AuditActions.SOS_TRIGGERED,
        entityType: EntityTypes.SOS,
        entityId: alert.id,
        actorType: riderId ? 'RIDER' : 'USER',
        actorId: riderId || user.userId,
        userId: user.userId,
        riderId: riderId || undefined,
        taskId: taskId || undefined,
        description: `SOS alert ${alertNumber} triggered by ${userInfo?.name || 'Unknown User'}${riderId ? ' (Rider)' : ''} at ${locationAddress || `${latitude},${longitude}`}`,
        source: 'MOBILE_APP',
      });
    } catch (auditError) {
      console.error('Audit log failed for SOS trigger:', auditError);
    }

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create SOS alert' },
      { status: 500 }
    );
  }
}

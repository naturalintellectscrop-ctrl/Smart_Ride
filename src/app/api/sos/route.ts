import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/sos - List SOS alerts (admin view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }
    if (severity) {
      where.severity = severity;
    }

    const alerts = await db.sOSAlert.findMany({
      where,
      include: {
        locationUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        incidentReport: true,
      },
      orderBy: { triggeredAt: 'desc' },
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
    console.error('Error fetching SOS alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOS alerts' },
      { status: 500 }
    );
  }
}

// POST /api/sos - Create new SOS alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      riderId,
      userType,
      taskId,
      orderId,
      healthOrderId,
      latitude,
      longitude,
      address,
      accuracy,
      alertType = 'MANUAL',
      tripData,
    } = body;

    // Validate required fields
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    if (!userId && !riderId) {
      return NextResponse.json(
        { error: 'User ID or Rider ID is required' },
        { status: 400 }
      );
    }

    // Generate alert number
    const alertNumber = `SOS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create SOS alert
    const alert = await db.sOSAlert.create({
      data: {
        alertNumber,
        userId: userId || null,
        riderId: riderId || null,
        userType: userType || (riderId ? 'RIDER' : 'CLIENT'),
        taskId: taskId || null,
        orderId: orderId || null,
        healthOrderId: healthOrderId || null,
        latitude,
        longitude,
        address: address || null,
        accuracy: accuracy || null,
        alertType,
        severity: 'HIGH',
        status: 'ACTIVE',
        tripData: tripData ? JSON.stringify(tripData) : null,
      },
      include: {
        locationUpdates: true,
      },
    });

    // Create initial location update
    await db.sOSLocationUpdate.create({
      data: {
        sosAlertId: alert.id,
        latitude,
        longitude,
        accuracy: accuracy || null,
      },
    });

    // Create incident report
    await db.incidentReport.create({
      data: {
        reportNumber: `INC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        sosAlertId: alert.id,
        userId: userId || null,
        riderId: riderId || null,
        status: 'OPEN',
      },
    });

    // Get emergency contacts for notification
    const emergencyContacts = await db.emergencyContact.findMany({
      where: {
        userId: userId || riderId,
        userType: userType || (riderId ? 'RIDER' : 'CLIENT'),
        receiveSOSAlerts: true,
      },
    });

    // Log notifications for each contact
    for (const contact of emergencyContacts) {
      await db.sOSNotificationLog.create({
        data: {
          sosAlertId: alert.id,
          recipientType: 'EMERGENCY_CONTACT',
          recipientId: contact.id,
          recipientPhone: contact.phone,
          recipientEmail: contact.email,
          channel: 'SMS',
          status: 'PENDING',
        },
      });
    }

    // Log notification for safety team
    await db.sOSNotificationLog.create({
      data: {
        sosAlertId: alert.id,
        recipientType: 'ADMIN_SAFETY_TEAM',
        channel: 'IN_APP',
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      alert: {
        ...alert,
        emergencyContactsNotified: emergencyContacts.length,
      },
    });
  } catch (error) {
    console.error('Error creating SOS alert:', error);
    return NextResponse.json(
      { error: 'Failed to create SOS alert' },
      { status: 500 }
    );
  }
}

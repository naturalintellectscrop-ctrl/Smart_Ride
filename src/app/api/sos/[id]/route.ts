import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/sos/[id] - Get single SOS alert
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const alert = await db.sOSAlert.findUnique({
      where: { id },
      include: {
        locationUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        incidentReport: true,
      },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'SOS alert not found' },
        { status: 404 }
      );
    }

    // Get notification logs
    const notifications = await db.sOSNotificationLog.findMany({
      where: { sosAlertId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Get user/rider info
    let userInfo = null;
    if (alert.userId) {
      const user = await db.user.findUnique({
        where: { id: alert.userId },
        select: { id: true, name: true, phone: true, email: true },
      });
      userInfo = user;
    }
    if (alert.riderId) {
      const rider = await db.rider.findUnique({
        where: { id: alert.riderId },
        select: {
          id: true,
          fullName: true,
          phone: true,
          riderRole: true,
          vehicle: {
            select: { make: true, model: true, plateNumber: true, color: true },
          },
        },
      });
      userInfo = rider;
    }

    // Get task info if available
    let taskInfo = null;
    if (alert.taskId) {
      taskInfo = await db.task.findUnique({
        where: { id: alert.taskId },
        select: {
          taskNumber: true,
          taskType: true,
          status: true,
          pickupAddress: true,
          dropoffAddress: true,
        },
      });
    }

    return NextResponse.json({
      alert,
      notifications,
      userInfo,
      taskInfo,
    });
  } catch (error) {
    console.error('Error fetching SOS alert:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOS alert' },
      { status: 500 }
    );
  }
}

// PATCH /api/sos/[id] - Update SOS alert (acknowledge, resolve, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      acknowledgedBy,
      resolvedBy,
      resolutionNotes,
      escalationLevel,
      locationShared,
      emergencyServicesCalled,
      safetyTeamAlerted,
      contactsNotified,
      recordingStarted,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      if (status === 'RESOLVED' || status === 'FALSE_ALARM' || status === 'CANCELLED') {
        updateData.resolvedAt = new Date();
      }
    }
    if (acknowledgedBy) {
      updateData.acknowledgedAt = new Date();
    }
    if (resolvedBy) {
      updateData.resolvedBy = resolvedBy;
    }
    if (resolutionNotes !== undefined) {
      updateData.resolutionNotes = resolutionNotes;
    }
    if (escalationLevel !== undefined) {
      updateData.escalationLevel = escalationLevel;
    }
    if (locationShared !== undefined) {
      updateData.locationShared = locationShared;
    }
    if (emergencyServicesCalled !== undefined) {
      updateData.emergencyServicesCalled = emergencyServicesCalled;
    }
    if (safetyTeamAlerted !== undefined) {
      updateData.safetyTeamAlerted = safetyTeamAlerted;
    }
    if (contactsNotified !== undefined) {
      updateData.contactsNotified = contactsNotified;
    }
    if (recordingStarted !== undefined) {
      updateData.recordingStarted = recordingStarted;
    }

    const alert = await db.sOSAlert.update({
      where: { id },
      data: updateData,
    });

    // Update incident report if resolving
    if (status === 'RESOLVED' || status === 'FALSE_ALARM') {
      await db.incidentReport.updateMany({
        where: { sosAlertId: id },
        data: {
          status: 'RESOLVED',
          closedAt: new Date(),
          closureNotes: resolutionNotes,
        },
      });
    }

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Error updating SOS alert:', error);
    return NextResponse.json(
      { error: 'Failed to update SOS alert' },
      { status: 500 }
    );
  }
}

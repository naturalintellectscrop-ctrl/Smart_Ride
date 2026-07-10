import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { requireAuth } from '@/lib/auth-utils';
import { isAdmin, JWTPayload } from '@/lib/auth/jwt';
import { Prisma, SOSStatus } from '@prisma/client';

// GET /api/sos/[id] - Get single SOS alert
// SECURITY: Admin-only access required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const admin = authResult.user!;

  await setRLSContext(admin);
  try {
    const { id } = await params;

    const alert = await db.sOSAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      return NextResponse.json({ success: false, error: 'SOS alert not found' },
        { status: 404 }
      );
    }

    // Get user/rider info
    let userInfo: unknown = null;
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
    let taskInfo: unknown = null;
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
      userInfo,
      taskInfo,
    });
  } catch (error) {
    console.error('Error fetching SOS alert:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch SOS alert' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// Dashboard sends { action: 'acknowledge' | 'resolve' | 'false_alarm' }
const ACTION_TO_STATUS: Record<string, SOSStatus> = {
  acknowledge: SOSStatus.ACKNOWLEDGED,
  resolve: SOSStatus.RESOLVED,
  false_alarm: SOSStatus.FALSE_ALARM,
};

// PATCH /api/sos/[id] - Update SOS alert
// SECURITY: Admins can change status/notes; the alert's owner may only
// update their own response-action flags (locationShared etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // requireAuth (auth-utils) accepts Bearer header or accessToken cookie
  // and sets RLS context (service role for admins, user-scoped otherwise)
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult as JWTPayload;
  const userIsAdmin = isAdmin(user.role);

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      action,
      status,
      resolutionNotes,
      escalationLevel,
      locationShared,
      emergencyServicesCalled,
      safetyTeamAlerted,
      contactsNotified,
      recordingStarted,
    } = body;

    const existing = await db.sOSAlert.findUnique({
      where: { id },
      select: { userId: true, actionsTaken: true },
    });
    // 404 (not 403) for foreign alerts so non-admins can't probe alert IDs
    if (!existing || (!userIsAdmin && existing.userId !== user.userId)) {
      return NextResponse.json({ success: false, error: 'SOS alert not found' },
        { status: 404 }
      );
    }

    // Resolve the requested status (from the `action` alias or explicit `status`).
    let nextStatus: SOSStatus | undefined;
    if (action !== undefined) {
      nextStatus = ACTION_TO_STATUS[action];
      if (!nextStatus) {
        return NextResponse.json({ success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
      }
    } else if (status !== undefined) {
      if (!Object.values(SOSStatus).includes(status)) {
        return NextResponse.json({ success: false, error: `Invalid status: ${status}` },
          { status: 400 }
        );
      }
      nextStatus = status as SOSStatus;
    }

    // Permission model:
    //  - Admins: any status change + escalation + notes.
    //  - Owner: may STAND DOWN their OWN alert (RESOLVED / FALSE_ALARM) and set
    //    their own response flags (locationShared, etc.), but may NOT
    //    acknowledge it (a dispatcher action) or change escalation level.
    if (!userIsAdmin) {
      const ownerAllowedStatus =
        nextStatus === undefined ||
        nextStatus === SOSStatus.RESOLVED ||
        nextStatus === SOSStatus.FALSE_ALARM;
      if (!ownerAllowedStatus || escalationLevel !== undefined) {
        return NextResponse.json(
          { success: false, error: 'You can only stand down your own alert' },
          { status: 403 }
        );
      }
    }

    const updateData: Prisma.SOSAlertUpdateInput = {};

    if (nextStatus) {
      updateData.status = nextStatus;
      if (nextStatus === SOSStatus.ACKNOWLEDGED) {
        updateData.acknowledgedAt = new Date();
        updateData.acknowledgedBy = user.userId;
      }
      if (nextStatus === SOSStatus.RESOLVED || nextStatus === SOSStatus.FALSE_ALARM) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = user.userId;
      }
    }

    if (resolutionNotes !== undefined) {
      updateData.resolutionNotes = resolutionNotes;
    }

    // SOSAlert has no dedicated columns for these response-action flags;
    // they accumulate in the actionsTaken JSON blob.
    const flags: Record<string, unknown> = {
      escalationLevel,
      locationShared,
      emergencyServicesCalled,
      safetyTeamAlerted,
      contactsNotified,
      recordingStarted,
    };
    const providedFlags = Object.fromEntries(
      Object.entries(flags).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(providedFlags).length > 0) {
      let currentActions: Record<string, unknown> = {};
      if (existing.actionsTaken) {
        try {
          currentActions = JSON.parse(existing.actionsTaken);
        } catch {
          // Unparseable legacy value — start fresh
        }
      }
      updateData.actionsTaken = JSON.stringify({ ...currentActions, ...providedFlags });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const alert = await db.sOSAlert.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Error updating SOS alert:', error);
    return NextResponse.json({ success: false, error: 'Failed to update SOS alert' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

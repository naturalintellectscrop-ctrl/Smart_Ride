/**
 * GET  /api/admin/riders/verify — riders awaiting a decision
 * POST /api/admin/riders/verify — approve / reject / suspend / reactivate
 *
 * Registration puts every new rider in PENDING_APPROVAL, and dispatch only
 * offers work to APPROVED riders. But no route ever set a rider to APPROVED:
 * merchants and health providers each had a verify endpoint, riders did not.
 * Fraud handling could SUSPEND a rider, so the only status transition that
 * existed moved them the wrong way.
 *
 * The effect was that a rider who registered through the app could never be
 * activated by any supported path — including the delivery providers and car
 * drivers the device QA matrix needs, neither of which exists in the database
 * today (BE-021).
 *
 * Mirrors the merchant verify route deliberately: same auth shape, same action
 * vocabulary, same response envelope, so an admin surface can treat the three
 * provider types uniformly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { createNotification } from '@/lib/services/notification.service';
import { RiderStatus } from '@prisma/client';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'];

/** action -> the status it lands the rider in. */
const ACTION_STATUS: Record<string, RiderStatus> = {
  approve: RiderStatus.APPROVED,
  reject: RiderStatus.REJECTED,
  suspend: RiderStatus.SUSPENDED,
  activate: RiderStatus.APPROVED,
};

function requireAdminToken(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }
  const decoded = verifyAccessToken(token);
  if (!decoded || !ADMIN_ROLES.includes(decoded.role)) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }
  return { decoded };
}

export async function GET(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth.error) return auth.error;

  await setRLSContext(auth.decoded!);
  try {
    const status = new URL(request.url).searchParams.get('status') || 'PENDING_APPROVAL';

    const riders = await db.rider.findMany({
      where: { status: status as RiderStatus },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        riderRole: true,
        vehicleType: true,
        status: true,
        physicalAddress: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
        // Onboarding uploads, so an admin can see what they are approving
        // rather than approving a name.
        documents: {
          select: { id: true, documentType: true, fileUrl: true, status: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: { riders, count: riders.length } });
  } catch (error) {
    console.error('[admin/riders/verify GET] failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load riders' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth.error) return auth.error;
  const decoded = auth.decoded!;

  await setRLSContext(decoded);
  try {
    const { riderId, action, notes, rejectionReason } = await request.json();

    if (!riderId || !action) {
      return NextResponse.json(
        { success: false, error: 'riderId and action are required' },
        { status: 400 }
      );
    }
    if (!ACTION_STATUS[action]) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Must be one of: ${Object.keys(ACTION_STATUS).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const rider = await db.rider.findUnique({
      where: { id: riderId },
      select: { id: true, fullName: true, status: true, riderRole: true, userId: true },
    });
    if (!rider) {
      return NextResponse.json({ success: false, error: 'Rider not found' }, { status: 404 });
    }

    const newStatus = ACTION_STATUS[action];

    const updated = await db.rider.update({
      where: { id: riderId },
      data: {
        status: newStatus,
        // Taking a rider offline is part of the decision, not a follow-up: a
        // suspended rider left online would keep receiving dispatch offers.
        ...(newStatus === RiderStatus.APPROVED ? {} : { isOnline: false }),
      },
      select: { id: true, fullName: true, status: true, riderRole: true, isOnline: true },
    });

    await createAuditLog({
      action:
        newStatus === RiderStatus.APPROVED
          ? AuditActions.RIDER_APPROVED
          : AuditActions.RIDER_SUSPENDED,
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      actorType: 'ADMIN',
      actorId: decoded.userId,
      riderId,
      description: `Admin ${action}d rider ${rider.fullName} (${rider.riderRole})`,
      oldValues: { status: rider.status },
      newValues: { status: newStatus, notes, rejectionReason },
    });

    // The rider has been waiting on this decision — tell them.
    if (rider.userId) {
      const message =
        newStatus === RiderStatus.APPROVED
          ? 'Your account is approved. You can go online and start receiving work.'
          : newStatus === RiderStatus.REJECTED
            ? `Your application was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`
            : 'Your account has been suspended. Please contact support.';

      await createNotification({
        userId: rider.userId,
        type: 'VERIFICATION',
        title:
          newStatus === RiderStatus.APPROVED ? 'Account approved' : 'Account status changed',
        message,
        referenceId: riderId,
        referenceType: 'RIDER',
      }).catch(err => console.error('[admin/riders/verify] notify failed:', err));
    }

    return NextResponse.json({
      success: true,
      data: { rider: updated },
      message: `Rider ${action}d`,
    });
  } catch (error) {
    console.error('[admin/riders/verify POST] failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update rider status' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

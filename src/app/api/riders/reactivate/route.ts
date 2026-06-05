import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { createNotification } from '@/lib/services/notification.service';
import { requireAdmin } from '@/lib/auth/guards';

/**
 * POST /api/riders/reactivate
 * Reactivate a suspended rider — sets status back to APPROVED
 * SECURITY: Admin-only access required
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const admin = authResult.user!;

    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get('riderId');

    if (!riderId) {
      return errorResponse('Rider ID is required');
    }

    // Find the rider
    const rider = await db.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      return notFoundResponse('Rider');
    }

    if (rider.status !== 'SUSPENDED') {
      return errorResponse('Rider is not suspended');
    }

    // Update rider status to APPROVED
    const updatedRider = await db.rider.update({
      where: { id: riderId },
      data: {
        status: 'APPROVED',
      },
    });

    // Create notification for rider (auto-emits socket event)
    await createNotification({
      userId: rider.userId,
      title: 'Account Reactivated',
      message: 'Your rider account has been reactivated. You can now go online and start accepting tasks.',
      type: 'SYSTEM',
      referenceId: riderId,
      referenceType: 'RIDER',
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.RIDER_APPROVED,
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      actorType: 'ADMIN',
      actorId: admin.userId,
      riderId: riderId,
      description: `Rider reactivated: ${rider.fullName}`,
      oldValues: { status: 'SUSPENDED' },
      newValues: { status: 'APPROVED' },
    });

    return successResponse(updatedRider, 'Rider reactivated successfully');
  } catch (error) {
    console.error('Error reactivating rider:', error);
    return serverErrorResponse('Failed to reactivate rider');
  }
}

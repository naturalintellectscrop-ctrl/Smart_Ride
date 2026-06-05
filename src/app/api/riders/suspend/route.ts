import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { createNotification } from '@/lib/services/notification.service';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';

const suspendSchema = z.object({
  reason: z.string().min(1, 'Suspension reason is required'),
});

/**
 * POST /api/riders/suspend
 * Suspend a rider account — forces offline and sets status to SUSPENDED
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

    const body = await request.json();
    const validatedData = suspendSchema.parse(body);
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

    if (rider.status === 'SUSPENDED') {
      return errorResponse('Rider is already suspended');
    }

    // Update rider status to SUSPENDED and force offline
    const updatedRider = await db.rider.update({
      where: { id: riderId },
      data: {
        status: 'SUSPENDED',
        isOnline: false,
      },
    });

    // Create notification for rider (auto-emits socket event)
    await createNotification({
      userId: rider.userId,
      title: 'Account Suspended',
      message: `Your rider account has been suspended. Reason: ${validatedData.reason}`,
      type: 'SYSTEM',
      referenceId: riderId,
      referenceType: 'RIDER',
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.RIDER_SUSPENDED,
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      actorType: 'ADMIN',
      actorId: admin.userId,
      riderId: riderId,
      description: `Rider suspended: ${rider.fullName}. Reason: ${validatedData.reason}`,
      oldValues: { status: rider.status, isOnline: rider.isOnline },
      newValues: { status: 'SUSPENDED', isOnline: false },
    });

    return successResponse(updatedRider, 'Rider suspended successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error suspending rider:', error);
    return serverErrorResponse('Failed to suspend rider');
  }
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { z } from 'zod';

const rejectSchema = z.object({
  adminId: z.string(), // ID of admin performing rejection
  reason: z.string().min(5, 'Rejection reason is required'),
});

/**
 * POST /api/riders/reject
 * Reject a pending rider application
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = rejectSchema.parse(body);
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

    if (rider.status !== 'PENDING_APPROVAL') {
      return errorResponse('Rider is not pending approval');
    }

    // Update rider status
    const updatedRider = await db.rider.update({
      where: { id: riderId },
      data: {
        status: 'REJECTED',
        verifiedAt: new Date(),
        verifiedBy: validatedData.adminId,
        verificationNotes: validatedData.reason,
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.RIDER_REJECTED,
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      actorType: 'ADMIN',
      actorId: validatedData.adminId,
      riderId: riderId,
      description: `Rider rejected: ${rider.fullName}. Reason: ${validatedData.reason}`,
      newValues: {
        status: 'REJECTED',
        reason: validatedData.reason,
      },
    });

    return successResponse(updatedRider, 'Rider application rejected');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error rejecting rider:', error);
    return serverErrorResponse('Failed to reject rider');
  }
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { z } from 'zod';

const approveSchema = z.object({
  adminId: z.string(), // ID of admin performing approval
  hasReflectorVest: z.boolean().default(false),
  hasHelmet: z.boolean().default(false),
  hasInsulatedBox: z.boolean().default(false),
  notes: z.string().optional(),
});

/**
 * POST /api/riders/approve
 * Approve a pending rider after physical verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = approveSchema.parse(body);
    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get('riderId');

    if (!riderId) {
      return errorResponse('Rider ID is required');
    }

    // Find the rider
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      include: { vehicle: true },
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
        status: 'APPROVED',
        verifiedAt: new Date(),
        verifiedBy: validatedData.adminId,
        verificationNotes: validatedData.notes || null,
        hasReflectorVest: validatedData.hasReflectorVest,
        hasHelmet: validatedData.hasHelmet,
        hasInsulatedBox: validatedData.hasInsulatedBox,
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.RIDER_APPROVED,
      entityType: EntityTypes.RIDER,
      entityId: riderId,
      actorType: 'ADMIN',
      actorId: validatedData.adminId,
      riderId: riderId,
      description: `Rider approved: ${rider.fullName}. Equipment issued: vest=${validatedData.hasReflectorVest}, helmet=${validatedData.hasHelmet}, box=${validatedData.hasInsulatedBox}`,
      newValues: {
        status: 'APPROVED',
        equipment: {
          hasReflectorVest: validatedData.hasReflectorVest,
          hasHelmet: validatedData.hasHelmet,
          hasInsulatedBox: validatedData.hasInsulatedBox,
        },
      },
    });

    return successResponse(updatedRider, 'Rider approved successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error approving rider:', error);
    return serverErrorResponse('Failed to approve rider');
  }
}

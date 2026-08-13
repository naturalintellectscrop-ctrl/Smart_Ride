/**
 * POST /api/tasks/[id]/proof — capture proof of delivery
 * GET  /api/tasks/[id]/proof — read the recorded proof
 *
 * A delivery had no evidence it ever happened. A courier could mark a parcel
 * DELIVERED from anywhere, and a customer disputing "I never received it" left
 * the platform with nothing to adjudicate on (BE-005).
 *
 * The handover code is the important asymmetry here: it is issued to the
 * CUSTOMER and never returned to the courier, so producing it is evidence of
 * having been face to face with the recipient. Any endpoint that leaked it to
 * the assigned courier would make the whole mechanism decorative.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, notFoundResponse, serverErrorResponse, successResponse } from '@/lib/api/response';
import { submitProofOfDelivery } from '@/lib/delivery/delivery-service';
import { ProofOfDeliveryType } from '@prisma/client';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const proofSchema = z.object({
  proofType: z.enum(['CODE', 'PHOTO', 'SIGNATURE', 'LEFT_WITH_NOTE']),
  code: z.string().trim().max(10).optional(),
  photoUrl: z.string().trim().max(2000).optional(),
  signatureUrl: z.string().trim().max(2000).optional(),
  recipientName: z.string().trim().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }
  const user = auth.user!;

  // Capturing proof writes to a task the courier does not own under
  // client-scoped RLS, and validating the code requires reading a column the
  // courier must never be able to SELECT. Elevate, then enforce ownership
  // explicitly inside submitProofOfDelivery.
  await setServiceRoleContext();
  try {
    const { id: taskId } = await params;

    const rider = await db.rider.findFirst({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!rider) {
      return NextResponse.json(
        { success: false, error: 'Only a delivery provider can submit proof' },
        { status: 403 }
      );
    }

    const parsed = proofSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid proof submission');
    }

    const result = await submitProofOfDelivery(taskId, rider.id, {
      ...parsed.data,
      proofType: parsed.data.proofType as ProofOfDeliveryType,
    });

    if (!result.success) {
      // 409 rather than 400: the submission is well-formed, the state or the
      // evidence is what is wrong, and the courier can retry with better
      // evidence.
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          distanceFromDropoffKm: result.distanceFromDropoffKm,
        },
        { status: 409 }
      );
    }

    return successResponse(
      {
        proofCaptured: true,
        distanceFromDropoffKm: result.distanceFromDropoffKm,
      },
      'Proof of delivery recorded'
    );
  } catch (error) {
    console.error('[tasks/proof] failed:', error);
    return serverErrorResponse('Failed to record proof of delivery');
  } finally {
    await resetRLSContext();
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }
  const user = auth.user!;

  await setServiceRoleContext();
  try {
    const { id: taskId } = await params;

    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        clientId: true,
        riderId: true,
        deliveryCode: true,
        proofType: true,
        proofPhotoUrl: true,
        proofSignatureUrl: true,
        proofRecipientName: true,
        proofCapturedAt: true,
        proofLatitude: true,
        proofLongitude: true,
        rider: { select: { userId: true } },
      },
    });
    if (!task) return notFoundResponse('Task');

    const isClient = task.clientId === user.userId;
    const isCourier = !!task.rider?.userId && task.rider.userId === user.userId;
    if (!isClient && !isCourier) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this delivery' },
        { status: 403 }
      );
    }

    return successResponse({
      proofType: task.proofType,
      proofPhotoUrl: task.proofPhotoUrl,
      proofSignatureUrl: task.proofSignatureUrl,
      proofRecipientName: task.proofRecipientName,
      proofCapturedAt: task.proofCapturedAt,
      proofLatitude: task.proofLatitude,
      proofLongitude: task.proofLongitude,
      // ONLY the customer sees the handover code. Returning it to the courier
      // would let them "prove" a delivery they never made, which is the exact
      // thing the code exists to prevent.
      deliveryCode: isClient ? task.deliveryCode : undefined,
    });
  } catch (error) {
    console.error('[tasks/proof GET] failed:', error);
    return serverErrorResponse('Failed to load proof of delivery');
  } finally {
    await resetRLSContext();
  }
}

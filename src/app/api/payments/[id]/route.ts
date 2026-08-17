/**
 * Payment Status API
 * GET /api/payments/[id] - Get payment status
 * PUT /api/payments/[id] - Update payment (for admin)
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { checkPaymentStatus } from '@/lib/payments';
import { requireAuth } from '@/lib/auth/guards';
import { allAdminsGuard } from '@/lib/auth/admin-guards';
import { isAdminRole } from '@/lib/auth/rbac';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]
 * Get payment details and current status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // SECURITY: this ran under setServiceRoleContext() with no guard at all, so
  // anyone holding a payment id could read the payer's name, the amount and the
  // linked task. Demonstrated returning 200 to an unauthenticated caller.
  const auth = requireAuth(request);
  if (!auth.success) {
    return errorResponse(auth.error || 'Authentication required', auth.statusCode || 401);
  }

  await setServiceRoleContext();
  try {
    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            taskNumber: true,
            taskType: true,
            status: true,
            client: {
              // PRIVACY: no phone/email — this endpoint is fetch-by-id.
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          // PRIVACY: no phone/email — this endpoint is fetch-by-id.
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!payment) {
      return notFoundResponse('Payment not found');
    }

    // Ownership: a payer may read their own payment; anyone else must be an
    // admin. Checked after the lookup so the answer does not depend on a
    // body-supplied id.
    if (payment.userId !== auth.user!.id && !isAdminRole(auth.user!.role)) {
      return errorResponse('You do not have access to this payment', 403);
    }

    // If payment is still processing, check with provider
    if (payment.status === PaymentStatus.PROCESSING && payment.paymentReference) {
      const providerStatus = await checkPaymentStatus(payment.id);
      
      if (providerStatus.success && providerStatus.status !== payment.status) {
        // Refresh payment data
        const updatedPayment = await db.payment.findUnique({
          where: { id },
          include: {
            task: {
              select: {
                id: true,
                taskNumber: true,
                taskType: true,
                status: true,
                client: {
                  // PRIVACY: no phone/email — fetch-by-id endpoint.
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            user: {
              // PRIVACY: no phone/email — fetch-by-id endpoint.
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return successResponse(updatedPayment);
      }
    }

    return successResponse(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return serverErrorResponse('Failed to fetch payment');
  } finally {
    await resetRLSContext();
  }
}

/**
 * PUT /api/payments/[id]
 * Update payment status (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // SECURITY: the docstring above already said "admin only". Nothing enforced
  // it, and an unauthenticated PUT was demonstrated moving a PENDING payment to
  // COMPLETED — settling a payment nobody made.
  const guard = allAdminsGuard(request);
  if (!guard.success) {
    return errorResponse(guard.error || 'Admin access required', guard.statusCode || 401);
  }

  await setServiceRoleContext();
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { status, failureReason, transactionId } = body;
    
    // Validate status
    if (status && !Object.values(PaymentStatus).includes(status)) {
      return errorResponse('Invalid payment status');
    }

    // Check payment exists
    const existingPayment = await db.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return notFoundResponse('Payment not found');
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (status) {
      updateData.status = status;
      
      if (status === PaymentStatus.COMPLETED) {
        updateData.processedAt = new Date();
      }
    }
    
    if (failureReason) {
      updateData.failureReason = failureReason;
    }
    
    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    // Update payment
    const payment = await db.payment.update({
      where: { id },
      data: updateData,
    });

    return successResponse(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    return serverErrorResponse('Failed to update payment');
  } finally {
    await resetRLSContext();
  }
}

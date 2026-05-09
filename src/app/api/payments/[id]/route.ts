/**
 * Payment Status API
 * GET /api/payments/[id] - Get payment status
 * PUT /api/payments/[id] - Update payment (for admin)
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { checkPaymentStatus } from '@/lib/payments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]
 * Get payment details and current status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!payment) {
      return notFoundResponse('Payment not found');
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
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
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
  }
}

/**
 * PUT /api/payments/[id]
 * Update payment status (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
  }
}

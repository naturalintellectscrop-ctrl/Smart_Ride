/**
 * Airtel Money Payment Callback
 * POST /api/payments/airtel-callback
 * 
 * This endpoint receives payment status updates from Airtel Money
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Airtel Money Callback received:', JSON.stringify(body, null, 2));

    // Extract callback data
    const {
      transactionId,
      status,
      amount,
      currency,
      errorCode,
      errorMessage,
      reference,
      transaction,
    } = body;

    // Extract reference from various possible locations
    const referenceId = reference || transaction?.reference || transaction?.id;

    // Find payment by reference
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          { paymentReference: referenceId },
          { id: referenceId },
        ],
      },
    });

    if (!payment) {
      console.error('Payment not found for callback:', { referenceId });
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Map Airtel status to internal status
    let newStatus: PaymentStatus;
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'SUCCESSFUL':
      case 'COMPLETED':
        newStatus = PaymentStatus.COMPLETED;
        break;
      case 'FAILED':
      case 'ERROR':
        newStatus = PaymentStatus.FAILED;
        break;
      case 'PENDING':
        newStatus = PaymentStatus.PROCESSING;
        break;
      case 'REVERSED':
      case 'CANCELLED':
        newStatus = PaymentStatus.REFUNDED;
        break;
      default:
        newStatus = PaymentStatus.PROCESSING;
    }

    // Update payment
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        transactionId: transactionId || transaction?.id || payment.transactionId,
        providerResponse: JSON.stringify(body),
        processedAt: newStatus === PaymentStatus.COMPLETED ? new Date() : null,
        failureReason: newStatus === PaymentStatus.FAILED 
          ? (errorMessage || errorCode || 'Payment failed') 
          : null,
      },
    });

    // If payment completed, update related task/order
    if (newStatus === PaymentStatus.COMPLETED && payment.taskId) {
      // Update task payment status
      await db.task.update({
        where: { id: payment.taskId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });

      // Create notification for user
      await db.notification.create({
        data: {
          userId: payment.userId,
          title: 'Payment Successful',
          message: `Your payment of ${amount || payment.amount} ${currency || payment.currency} was successful.`,
          type: 'PAYMENT',
          referenceId: payment.id,
          referenceType: 'PAYMENT',
        },
      });
    }

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Airtel Money callback error:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}

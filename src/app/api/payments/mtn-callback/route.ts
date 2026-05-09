/**
 * MTN MoMo Payment Callback
 * POST /api/payments/mtn-callback
 * 
 * This endpoint receives payment status updates from MTN MoMo
 * SECURITY: Validates webhook signature to prevent fraudulent callbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import { verifyMtnSignature } from '@/lib/auth/guards';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    
    console.log('MTN MoMo Callback received:', JSON.stringify(body, null, 2));

    // SECURITY: Verify webhook signature
    // Skip verification in development if no secret is configured
    const skipSignatureCheck = process.env.NODE_ENV !== 'production' && !process.env.MTN_MOMO_SECRET_KEY;
    
    if (!skipSignatureCheck) {
      const isValidSignature = verifyMtnSignature(request, rawBody);
      if (!isValidSignature) {
        console.error('MTN MoMo callback: Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      console.warn('MTN MoMo callback: Signature verification skipped (development mode)');
    }

    // Extract callback data
    const {
      transactionId,
      status,
      amount,
      currency,
      payerMessage,
      payeeNote,
      externalId,
      referenceId,
    } = body;

    // Find payment by reference
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          { paymentReference: referenceId },
          { paymentReference: externalId },
          { id: externalId },
        ],
      },
    });

    if (!payment) {
      console.error('Payment not found for callback:', { referenceId, externalId });
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Map MTN status to internal status
    let newStatus: PaymentStatus;
    switch (status) {
      case 'SUCCESSFUL':
        newStatus = PaymentStatus.COMPLETED;
        break;
      case 'FAILED':
      case 'REJECTED':
        newStatus = PaymentStatus.FAILED;
        break;
      case 'TIMEOUT':
        newStatus = PaymentStatus.FAILED;
        break;
      default:
        newStatus = PaymentStatus.PROCESSING;
    }

    // Update payment
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        transactionId: transactionId || payment.transactionId,
        providerResponse: JSON.stringify(body),
        processedAt: newStatus === PaymentStatus.COMPLETED ? new Date() : null,
        failureReason: newStatus === PaymentStatus.FAILED ? payeeNote : null,
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
          message: `Your payment of ${amount} ${currency} was successful.`,
          type: 'PAYMENT',
          referenceId: payment.id,
          referenceType: 'PAYMENT',
        },
      });
    }

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MTN MoMo callback error:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}

/**
 * Airtel Money Payment Callback
 * POST /api/payments/airtel-callback
 *
 * This endpoint receives payment status updates from Airtel Money
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import { isWebhookProcessed, recordWebhookProcessed } from '@/lib/security/webhook-protection';
import { sendPaymentNotification } from '@/lib/services/notification.service';
import { handleSuccessfulPayment } from '@/lib/payments/payment-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Airtel Money Callback received:', JSON.stringify(body, null, 2));

    // SECURITY: Verify webhook signature if secret is configured
    const AIRTEL_SECRET = process.env.AIRTEL_MONEY_WEBHOOK_SECRET;
    if (AIRTEL_SECRET) {
      const signature = request.headers.get('X-Airtel-Signature');
      if (!signature || signature !== AIRTEL_SECRET) {
        console.error('Airtel callback: Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('Airtel callback: No webhook secret configured, signature verification skipped');
    }

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

    // Check for duplicate webhook
    const webhookTransactionId = transactionId || transaction?.id || referenceId;
    if (webhookTransactionId) {
      const isDuplicate = await isWebhookProcessed('AIRTEL', webhookTransactionId);
      if (isDuplicate) {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }
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

    // Race condition guard: only update if payment is still in a non-final state
    const updateResult = await db.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
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

    if (updateResult.count === 0) {
      console.warn('Airtel Money callback: payment already processed, skipping', {
        paymentId: payment.id,
        newStatus,
      });
      return NextResponse.json({ success: true, message: 'Payment already processed' });
    }

    // If payment completed, update related task/order and process financial records
    if (newStatus === PaymentStatus.COMPLETED && payment.taskId) {
      // Race condition guard for task update
      await db.task.updateMany({
        where: {
          id: payment.taskId,
          paymentStatus: { in: ['PENDING', 'PROCESSING'] },
        },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });

      // Call handleSuccessfulPayment to create FinanceLog, credit rider earnings, etc.
      try {
        await handleSuccessfulPayment(payment.id);
      } catch (financeError) {
        console.error('Airtel Money callback: handleSuccessfulPayment failed:', financeError);
        // Don't fail the callback — payment status is already updated
        // Finance reconciliation can be retried later
      }
    }

    // Send notification via notification service (handles socket emission and preference checking)
    await sendPaymentNotification(
      payment.userId,
      payment.id,
      payment.amount,
      newStatus === PaymentStatus.COMPLETED ? 'COMPLETED' :
      newStatus === PaymentStatus.FAILED ? 'FAILED' : 'REFUNDED'
    );

    // Create audit log for payment callback
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'PAYMENT_CALLBACK_PROCESSED',
          entityType: 'Payment',
          entityId: payment.id,
          taskId: payment.taskId,
          description: `Airtel Money callback: payment ${payment.paymentReference} → ${newStatus}`,
          newValues: JSON.stringify({
            status: newStatus,
            transactionId: transactionId || transaction?.id,
            amount,
            currency,
          }),
        },
      });
    } catch (auditError) {
      console.error('Airtel Money callback: audit log creation failed:', auditError);
    }

    // Record webhook as processed
    if (webhookTransactionId) {
      await recordWebhookProcessed('AIRTEL', webhookTransactionId, payment.id, newStatus, body);
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

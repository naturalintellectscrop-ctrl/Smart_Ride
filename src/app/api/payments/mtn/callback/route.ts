/**
 * MTN Mobile Money Callback Handler (Alternate Route)
 * POST /api/payments/mtn/callback
 *
 * Delegates to the primary /api/payments/mtn-callback handler
 * to avoid code duplication. Both routes exist because different
 * MTN API configurations may use different callback URLs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import { verifyMtnSignature } from '@/lib/auth/guards';
import { isWebhookProcessed, recordWebhookProcessed } from '@/lib/security/webhook-protection';
import { sendPaymentNotification } from '@/lib/services/notification.service';
import { handleSuccessfulPayment } from '@/lib/payments/payment-service';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    console.log('MTN MoMo Callback received (alternate route):', JSON.stringify(body, null, 2));

    // SECURITY: Verify webhook signature
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

    // Extract callback data (MTN API format with financialTransactionId, externalId, etc.)
    const {
      transactionId,
      status,
      amount,
      currency,
      payerMessage,
      payeeNote,
      externalId,
      referenceId,
      financialTransactionId,
      reason,
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

    // Check for duplicate webhook
    const webhookTransactionId = financialTransactionId || transactionId || referenceId || externalId;
    if (webhookTransactionId) {
      const isDuplicate = await isWebhookProcessed('MTN', webhookTransactionId);
      if (isDuplicate) {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }
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

    // Race condition guard: only update if payment is still in a non-final state
    const updateResult = await db.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: newStatus,
        transactionId: financialTransactionId || transactionId || payment.transactionId,
        providerResponse: JSON.stringify(body),
        processedAt: newStatus === PaymentStatus.COMPLETED ? new Date() : null,
        failureReason: newStatus === PaymentStatus.FAILED ? (reason?.message || payeeNote) : null,
      },
    });

    if (updateResult.count === 0) {
      console.warn('MTN MoMo callback: payment already processed, skipping', {
        paymentId: payment.id,
        newStatus,
      });
      return NextResponse.json({ success: true, message: 'Payment already processed' });
    }

    // If payment completed, update related task/order and process financial records
    if (newStatus === PaymentStatus.COMPLETED && payment.taskId) {
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
        console.error('MTN MoMo callback: handleSuccessfulPayment failed:', financeError);
      }
    }

    // Send notification
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
          description: `MTN MoMo callback (alternate route): payment ${payment.paymentReference} → ${newStatus}`,
          newValues: JSON.stringify({
            status: newStatus,
            transactionId: financialTransactionId || transactionId,
            amount,
            currency,
          }),
        },
      });
    } catch (auditError) {
      console.error('MTN MoMo callback: audit log creation failed:', auditError);
    }

    // Record webhook as processed
    if (webhookTransactionId) {
      await recordWebhookProcessed('MTN', webhookTransactionId, payment.id, newStatus, body);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MTN MoMo callback error (alternate route):', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}

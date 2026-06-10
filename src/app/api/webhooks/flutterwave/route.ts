/**
 * Flutterwave Webhook Handler
 * Processes payment callbacks from Flutterwave
 * 
 * IMPORTANT: This endpoint must be publicly accessible
 * Webhook signature verification is MANDATORY — requests without valid signatures are rejected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { flutterwaveService } from '@/lib/payments/flutterwave-service';
import { paymentLogger } from '@/lib/logging/logger';

/**
 * POST /api/webhooks/flutterwave
 * Handle Flutterwave payment webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Check if webhook secret is configured — MANDATORY for security
    if (!flutterwaveService.isWebhookConfigured()) {
      paymentLogger.error('CRITICAL: FLUTTERWAVE_WEBHOOK_SECRET is not set. Webhook requests cannot be verified and are being rejected. Set the FLUTTERWAVE_WEBHOOK_SECRET environment variable to fix this.');
      return NextResponse.json(
        { success: false, error: 'Webhook secret not configured. Payment callbacks cannot be processed safely.' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('verif-hash') || '';
    
    // Verify signature using the service
    if (!flutterwaveService.verifyWebhookSignature(rawBody, signature)) {
      paymentLogger.warn('Flutterwave webhook: invalid signature', {
        hasSignature: Boolean(signature),
      });
      return NextResponse.json({ success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    await setServiceRoleContext();
    
    const payload = JSON.parse(rawBody);
    
    // Only process successful charges
    if (payload.event !== 'charge.completed') {
      return NextResponse.json({ status: 'ignored' });
    }
    
    const data = payload.data;
    
    if (!data || data.status !== 'successful') {
      return NextResponse.json({ status: 'ignored' });
    }
    
    const txRef = data.tx_ref;
    const transactionId = data.id?.toString();
    
    // Find the payment record
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          { paymentReference: txRef },
          { transactionId: transactionId },
        ],
      },
    });
    
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Prevent duplicate processing
    if (payment.status === 'COMPLETED') {
      return NextResponse.json({ status: 'already_processed' });
    }
    
    // Update payment status
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        transactionId: transactionId,
        providerResponse: JSON.stringify(data),
        processedAt: new Date(),
      },
    });
    
    // Update related task/order payment status
    const meta = data.meta || {};
    
    if (meta.task_id) {
      await db.task.update({
        where: { id: meta.task_id },
        data: { paymentStatus: 'COMPLETED' },
      });
    }
    
    if (meta.order_id) {
      await db.order.update({
        where: { id: meta.order_id },
        data: { paymentStatus: 'COMPLETED' },
      });
    }
    
    // Create notification for user
    await db.notification.create({
      data: {
        userId: payment.userId,
        title: 'Payment Successful',
        message: `Your payment of ${payment.currency} ${payment.amount.toLocaleString()} was successful.`,
        type: 'PAYMENT',
        referenceId: payment.id,
        referenceType: 'PAYMENT',
      },
    });
    
    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'PAYMENT_COMPLETED',
        entityType: 'Payment',
        entityId: payment.id,
        description: `Payment ${txRef} completed via Flutterwave webhook`,
      },
    });
    
    return NextResponse.json({ 
      status: 'success',
      paymentId: payment.id,
    });
    
  } catch (error) {
    paymentLogger.error('Flutterwave webhook processing error:', { error: String(error) });
    // Log error but return 200 to prevent retries for invalid data
    return NextResponse.json({ success: false, error: 'Processing failed' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// Reject other methods
export async function GET() {
  await setServiceRoleContext();
  try {
    return NextResponse.json({ success: false, error: 'Method not allowed' },
      { status: 405 }
    );
  } finally {
    await resetRLSContext();
  }
}

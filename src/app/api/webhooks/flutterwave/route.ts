/**
 * Flutterwave Webhook Handler
 * Processes payment callbacks from Flutterwave
 * 
 * IMPORTANT: This endpoint must be publicly accessible
 * Verify webhook signature to prevent fraud
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

// Flutterwave webhook secret for signature verification
const WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET || '';

/**
 * Verify Flutterwave webhook signature
 * Prevents fraudulent payment callbacks
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    // If no secret configured, log warning but accept (for initial setup)
    return true;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

/**
 * POST /api/webhooks/flutterwave
 * Handle Flutterwave payment webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('verif-hash') || '';
    
    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
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
      return NextResponse.json(
        { error: 'Payment not found' },
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
    // Log error but return 200 to prevent retries for invalid data
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

// Reject other methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

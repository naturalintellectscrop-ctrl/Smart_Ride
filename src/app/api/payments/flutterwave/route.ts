/**
 * Flutterwave Payment Integration
 * Supports Mobile Money (MTN, Airtel) for Uganda
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { z } from 'zod';

// Flutterwave API configuration
const FLUTTERWAVE_BASE_URL = process.env.FLUTTERWAVE_ENVIRONMENT === 'production'
  ? 'https://api.flutterwave.com/v3'
  : 'https://api.flutterwave.com/v3';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

// Validation schemas
const initiatePaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('UGX'),
  paymentMethod: z.enum(['mtn_ug', 'airtel_ug', 'card', 'bank_transfer']),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  taskId: z.string().optional(),
  orderId: z.string().optional(),
  description: z.string().optional(),
});

// Generate unique transaction reference
function generateTxRef(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SR-${timestamp}-${random}`;
}

// ============================================
// POST - Initiate Payment
// ============================================
export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!FLUTTERWAVE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Payment gateway not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const validatedData = initiatePaymentSchema.parse(body);
    
    // Get user info
    const user = await db.user.findUnique({
      where: { id: authResult.userId },
      select: { id: true, email: true, phone: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const txRef = generateTxRef();

    // Prepare Flutterwave payload
    const payload: Record<string, unknown> = {
      tx_ref: txRef,
      amount: validatedData.amount,
      currency: validatedData.currency,
      customer: {
        email: validatedData.email || user.email,
        phonenumber: validatedData.phoneNumber || user.phone,
        name: user.name,
      },
      customizations: {
        title: 'Smart Ride Payment',
        description: validatedData.description || 'Service payment',
      },
      meta: {
        user_id: user.id,
        task_id: validatedData.taskId,
        order_id: validatedData.orderId,
      },
    };

    // Mobile Money specific payload
    if (['mtn_ug', 'airtel_ug'].includes(validatedData.paymentMethod)) {
      const phoneNumber = validatedData.phoneNumber || user.phone;
      if (!phoneNumber) {
        return NextResponse.json(
          { error: 'Phone number is required for mobile money payments' },
          { status: 400 }
        );
      }

      // Format phone number for Flutterwave (256 for Uganda)
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '256' + formattedPhone.substring(1);
      }

      payload.payment_options = 'mobilemoneyuganda';
      payload.redirect_url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/callback`;
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        paymentReference: txRef,
        userId: user.id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        paymentMethod: validatedData.paymentMethod === 'mtn_ug' ? 'MTN_MOMO' :
                      validatedData.paymentMethod === 'airtel_ug' ? 'AIRTEL_MONEY' :
                      validatedData.paymentMethod === 'card' ? 'VISA' : 'CASH',
        status: 'PENDING',
      },
    });

    // Call Flutterwave API
    const response = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      // Update payment status to failed
      await db.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'FAILED',
          failureReason: result.message || 'Payment initiation failed',
        },
      });

      return NextResponse.json(
        { error: result.message || 'Failed to initiate payment' },
        { status: 400 }
      );
    }

    // Update payment with Flutterwave reference
    await db.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: result.data?.id?.toString(),
        providerResponse: JSON.stringify(result.data),
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        reference: txRef,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: 'PENDING',
      },
      flutterwave: {
        link: result.data?.link,
        transactionId: result.data?.id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Verify Payment Status
// ============================================
export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!FLUTTERWAVE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Payment gateway not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const txRef = searchParams.get('txRef');

    if (!transactionId && !txRef) {
      return NextResponse.json(
        { error: 'Transaction ID or reference is required' },
        { status: 400 }
      );
    }

    // Verify with Flutterwave
    const verifyUrl = transactionId
      ? `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`
      : `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${txRef}`;

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok || result.status !== 'success') {
      return NextResponse.json(
        { error: 'Failed to verify payment' },
        { status: 400 }
      );
    }

    const data = result.data;
    
    // Update local payment record
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          { paymentReference: data.tx_ref },
          { transactionId: data.id?.toString() },
        ],
      },
    });

    if (payment) {
      const newStatus = data.status === 'successful' ? 'COMPLETED' :
                       data.status === 'failed' ? 'FAILED' :
                       data.status === 'cancelled' ? 'FAILED' : 'PROCESSING';

      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          transactionId: data.id?.toString(),
          providerResponse: JSON.stringify(data),
          processedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
        },
      });

      // If payment successful, update related task/order
      if (newStatus === 'COMPLETED') {
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
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        reference: data.tx_ref,
        transactionId: data.id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        paidAt: data.paid_at,
        customer: {
          email: data.customer?.email,
          phone: data.customer?.phone_number,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

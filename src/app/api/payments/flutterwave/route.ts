/**
 * Flutterwave Payment Integration
 * Supports Mobile Money (MTN, Airtel) for Uganda
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { z } from 'zod';
import { flutterwaveService } from '@/lib/payments/flutterwave-service';
import { paymentLogger } from '@/lib/logging/logger';

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

// ============================================
// POST - Initiate Payment
// ============================================
export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!flutterwaveService.isConfigured()) {
    return NextResponse.json({ success: false, error: 'Payment gateway not configured' },
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
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Create payment record first
    const payment = await db.payment.create({
      data: {
        paymentReference: `SR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        userId: user.id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        paymentMethod: validatedData.paymentMethod === 'mtn_ug' ? 'MTN_MOMO' :
                      validatedData.paymentMethod === 'airtel_ug' ? 'AIRTEL_MONEY' :
                      validatedData.paymentMethod === 'card' ? 'VISA' : 'CASH',
        status: 'PENDING',
        orderId: validatedData.orderId || null,
      },
    });

    // Use Flutterwave service to initiate payment
    const result = await flutterwaveService.initiatePayment({
      txRef: payment.paymentReference,
      amount: validatedData.amount,
      currency: validatedData.currency,
      paymentMethod: validatedData.paymentMethod,
      phoneNumber: validatedData.phoneNumber || user.phone || undefined,
      email: validatedData.email || user.email || undefined,
      customerName: user.name || undefined,
      description: validatedData.description,
      taskId: validatedData.taskId,
      orderId: validatedData.orderId,
      userId: user.id,
    });

    if (!result.success) {
      // Update payment status to failed
      await db.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'FAILED',
          failureReason: result.error || 'Payment initiation failed',
        },
      });

      return NextResponse.json({ success: false, error: result.error || 'Failed to initiate payment' },
        { status: 400 }
      );
    }

    // Update payment with Flutterwave reference
    await db.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: result.transactionId || null,
        providerResponse: JSON.stringify(result),
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        reference: result.txRef,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: 'PENDING',
      },
      flutterwave: {
        link: result.link,
        transactionId: result.transactionId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    paymentLogger.error('Flutterwave payment initiation error:', { error: String(error) });
    return NextResponse.json({ success: false, error: 'Failed to initiate payment' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
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

  if (!flutterwaveService.isConfigured()) {
    return NextResponse.json({ success: false, error: 'Payment gateway not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const txRef = searchParams.get('txRef');

    if (!transactionId && !txRef) {
      return NextResponse.json({ success: false, error: 'Transaction ID or reference is required' },
        { status: 400 }
      );
    }

    // Use Flutterwave service to verify
    let result;
    if (txRef) {
      result = await flutterwaveService.verifyTransaction(txRef);
    } else {
      // If only transactionId provided, use getTransactionStatus
      result = await flutterwaveService.getTransactionStatus(transactionId!);
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to verify payment' },
        { status: 400 }
      );
    }

    const mappedStatus = flutterwaveService.mapStatus(result.status || '');

    // Update local payment record
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          { paymentReference: result.txRef },
          { transactionId: result.transactionId },
        ],
      },
    });

    if (payment) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: mappedStatus,
          transactionId: result.transactionId || payment.transactionId,
          providerResponse: JSON.stringify(result),
          processedAt: mappedStatus === 'COMPLETED' ? new Date() : undefined,
        },
      });

      // If payment successful, update related task/order
      if (mappedStatus === 'COMPLETED') {
        const meta = (result as { meta?: Record<string, unknown> }).meta || {};
        if (meta.task_id) {
          await db.task.update({
            where: { id: meta.task_id as string },
            data: { paymentStatus: 'COMPLETED' },
          });
        }
        if (meta.order_id) {
          await db.order.update({
            where: { id: meta.order_id as string },
            data: { paymentStatus: 'COMPLETED' },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        reference: result.txRef,
        transactionId: result.transactionId,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        paidAt: 'paidAt' in result ? (result as { paidAt?: string }).paidAt : undefined,
        customer: {
          email: 'customerEmail' in result ? (result as { customerEmail?: string }).customerEmail : undefined,
          phone: 'customerPhone' in result ? (result as { customerPhone?: string }).customerPhone : undefined,
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

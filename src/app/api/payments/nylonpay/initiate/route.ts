/**
 * NylonPay — initiate a payment collection
 * POST /api/payments/nylonpay/initiate
 *
 * Server-side only. The mobile app / browser posts { amount, phoneNumber, ... }
 * here; this route uses the NylonPay SDK to fire the STK push. Terminal status
 * arrives later via /api/payments/nylonpay/callback (webhook).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import {
  isNylonPayConfigured,
  getNylonPayClient,
  generateNylonPayReference,
} from '@/lib/payments/nylonpay';
import { paymentLogger } from '@/lib/logging/logger';
import { z } from 'zod';

export const runtime = 'nodejs'; // not edge — we need raw SDK + node:crypto

const schema = z.object({
  amount: z
    .number()
    .int()
    .min(500, 'Minimum collection is 500 UGX'),
  currency: z.literal('UGX').default('UGX'),
  description: z.string().min(1).max(200).default('Smart Ride Payment'),
  customerName: z.string().min(1).max(120).optional(),
  customerPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  customerEmail: z.string().email().optional(),
  taskId: z.string().optional(),
  orderId: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit — same bucket as the legacy /api/payments/initiate flow
  const rate = checkRateLimit(request, RATE_LIMITS.payment.initiate);
  if (!rate.success) return rateLimitResponse(rate, RATE_LIMITS.payment.initiate);

  // Auth
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }
  const decoded = verifyAccessToken(authHeader.split(' ')[1]);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: 'Invalid token' },
      { status: 401 },
    );
  }

  // Service availability
  if (!isNylonPayConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'NylonPay not configured. Set NYLONPAY_API_KEY and NYLONPAY_API_SECRET.',
      },
      { status: 503 },
    );
  }

  await setRLSContext(decoded);
  try {
    const body = schema.parse(await request.json());

    // Generate reference BEFORE creating the DB row so we can use it as a
    // unique constraint. NylonPay requires 13–15 chars; our generator
    // produces 14 (2-char prefix + 12 hex chars).
    const reference = generateNylonPayReference('SR');

    // Create the Payment row in PENDING state
    const payment = await db.payment.create({
      data: {
        paymentReference: reference,
        userId: decoded.userId,
        amount: body.amount,
        currency: body.currency,
        paymentMethod: 'NYLON_PAY',
        status: 'PENDING',
        phoneNumber: body.customerPhone,
        taskId: body.taskId || null,
        orderId: body.orderId || null,
      },
    });

    // Initiate the collection via the SDK
    const nylonpay = getNylonPayClient();
    const instance = await nylonpay.collectPayment({
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      customer: {
        name: body.customerName || 'Smart Ride Customer',
        phoneNumber: body.customerPhone,
        ...(body.customerEmail ? { email: body.customerEmail } : {}),
      },
      reference,
      metadata: {
        paymentId: payment.id,
        userId: decoded.userId,
        purpose: 'service_payment',
        ...(body.metadata ?? {}),
      },
    });

    // Wire up async event handlers — DO NOT await these.
    // The webhook (/api/payments/nylonpay/callback) is authoritative.
    instance
      .on('processing', () => {
        db.payment
          .updateMany({
            where: { id: payment.id, status: 'PENDING' },
            data: { status: 'PROCESSING' },
          })
          .catch((e) =>
            paymentLogger.error('nylonpay.initiate processing update failed', {
              error: String(e),
            }),
          );
      })
      .on('success', ({ transaction }) => {
        paymentLogger.info('nylonpay.initiate success (sdk event)', {
          reference,
          operatorTid: transaction?.operatorTid,
        });
      })
      .on('failed', () => {
        paymentLogger.warn('nylonpay.initiate failed (sdk event)', { reference });
      })
      .on('error', ({ error, category, retryable }) => {
        paymentLogger.error('nylonpay.initiate error (sdk event)', {
          reference,
          category,
          error,
          retryable,
        });
      });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        reference,
        status: 'PENDING',
        sdkReference: instance.reference,
        message: 'Payment initiated. Customer will receive a prompt on their phone.',
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: err.flatten() },
        { status: 400 },
      );
    }
    paymentLogger.error('nylonpay/initiate error', { error: String(err) });
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Initiation failed',
      },
      { status: 500 },
    );
  } finally {
    await resetRLSContext();
  }
}

/**
 * GET — quick availability check (used by mobile app to decide whether to
 * show the NylonPay payment option in the checkout UI).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }
  const decoded = verifyAccessToken(authHeader.split(' ')[1]);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: 'Invalid token' },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    available: isNylonPayConfigured(),
    mode: (process.env.NYLONPAY_API_KEY || '').startsWith('npk_live_') ? 'live' : 'sandbox',
  });
}

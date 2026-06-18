/**
 * NylonPay — verify / check payment status
 * GET /api/payments/nylonpay/verify?reference=SR...
 *
 * One-shot status check. Used by the mobile app to poll for the terminal state
 * of a payment when the webhook hasn't fired yet (or was missed). The webhook
 * remains authoritative; this is a fallback for UX.
 */

import { NextRequest, NextResponse } from 'next/server';
import { setRLSContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { isNylonPayConfigured, getNylonPayClient, mapNylonPayStatus } from '@/lib/payments/nylonpay';
import { handleSuccessfulPayment } from '@/lib/payments/payment-service';
import { db } from '@/lib/db';
import { paymentLogger } from '@/lib/logging/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Rate limit (use the same bucket as payment status checks)
  const rate = checkRateLimit(request, RATE_LIMITS.payment.initiate);
  if (!rate.success) return rateLimitResponse(rate, RATE_LIMITS.payment.initiate);

  // Auth
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const decoded = verifyAccessToken(authHeader.split(' ')[1]);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }

  if (!isNylonPayConfigured()) {
    return NextResponse.json(
      { success: false, error: 'NylonPay not configured' },
      { status: 503 },
    );
  }

  await setRLSContext(decoded);
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'reference query param is required' },
        { status: 400 },
      );
    }

    // Find the local payment record (and ensure it belongs to the caller)
    const payment = await db.payment.findFirst({
      where: { paymentReference: reference, userId: decoded.userId },
    });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 },
      );
    }

    // If already terminal, return without hitting NylonPay
    if (['COMPLETED', 'FAILED', 'REFUNDED'].includes(payment.status)) {
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          reference: payment.paymentReference,
          status: payment.status,
          message: `Payment is ${payment.status.toLowerCase()}`,
        },
      });
    }

    // Ask NylonPay for the current status
    const nylonpay = getNylonPayClient();
    const result = await nylonpay.getStatus({ reference });

    if (result.isErr) {
      paymentLogger.warn('nylonpay/verify: getStatus failed', {
        reference,
        error: result.error,
      });
      // Return the current DB status — don't fail the request
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          reference: payment.paymentReference,
          status: payment.status,
          message: 'Status check unavailable; returning last known status',
        },
      });
    }

    const mappedStatus = mapNylonPayStatus(result.value.status);

    // Race-condition guard: only update if still non-terminal
    const updateResult = await db.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: mappedStatus,
        processedAt: mappedStatus === 'COMPLETED' ? new Date() : null,
      },
    });

    // If we just transitioned to COMPLETED, fire fulfillment
    if (mappedStatus === 'COMPLETED' && updateResult.count > 0) {
      try {
        await handleSuccessfulPayment(payment.id);
      } catch (financeError) {
        paymentLogger.error('nylonpay/verify: handleSuccessfulPayment failed', {
          error: String(financeError),
        });
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        reference: payment.paymentReference,
        status: mappedStatus,
        message: `Payment is ${mappedStatus.toLowerCase()}`,
        providerStatus: result.value.status,
      },
    });
  } catch (error) {
    paymentLogger.error('nylonpay/verify error', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Status check failed' },
      { status: 500 },
    );
  } finally {
    await resetRLSContext();
  }
}

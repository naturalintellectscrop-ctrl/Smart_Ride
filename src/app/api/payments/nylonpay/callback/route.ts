/**
 * NylonPay — webhook receiver
 * POST /api/payments/nylonpay/callback
 *
 * NylonPay pushes transaction status updates here. This is the AUTHORITATIVE
 * source of payment status — the SDK's event handlers only provide fast UX
 * feedback, but a webhook delivery is what marks the payment COMPLETED and
 * triggers downstream fulfillment (task update, finance log, rider earnings).
 *
 * SECURITY:
 * - Verifies HMAC-SHA256 signature over the RAW payload (not parsed JSON).
 * - Rejects replays older than 5 minutes via the embedded timestamp.
 * - Dedupes on (reference, event) for at-least-once delivery.
 *
 * CONFIGURE THIS URL IN THE NYLONPAY DASHBOARD:
 *   https://smartrideug.vercel.app/api/payments/nylonpay/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import {
  isNylonPayConfigured,
  verifyNylonPayWebhook,
} from '@/lib/payments/nylonpay';
import { handleNylonPayCallback } from '@/lib/payments/payment-service';
import { sendPaymentNotification } from '@/lib/services/notification.service';
import { isWebhookProcessed, recordWebhookProcessed } from '@/lib/security/webhook-protection';
import { toNumber } from '@/lib/decimal-utils';
import { paymentLogger } from '@/lib/logging/logger';
import type { WebhookPayload, Transaction } from '@nile-squad/nylonpay-ts';

export const runtime = 'nodejs'; // NOT edge — signature verify needs raw body bytes
// Next.js App Router gives us the raw body via request.text() — no body parser
// middleware interferes.

export async function POST(request: NextRequest) {
  // CRITICAL: capture raw body BEFORE any JSON parsing — signature is over the
  // raw bytes, not the re-serialized JSON.
  const rawBody = await request.text();

  let body: WebhookPayload;
  try {
    body = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON' },
      { status: 400 },
    );
  }

  // Metadata-only logging — never dump full body (PII: phone numbers, names)
  paymentLogger.info('nylonpay/callback received', {
    event: body.event,
    reference: body.data?.reference,
    status: body.data?.status,
    amount: body.data?.amount,
    currency: body.data?.currency,
  });

  // Service availability check
  if (!isNylonPayConfigured()) {
    paymentLogger.error('nylonpay/callback: NylonPay not configured', {});
    return NextResponse.json(
      { success: false, error: 'NylonPay not configured' },
      { status: 500 },
    );
  }

  // Signature + replay verification (HMAC-SHA256 over raw body, 5-min freshness)
  // The signature comes from the JSON body's `signature` field (per SDK spec),
  // but some HTTP clients send it in a header — check both.
  const headerSignature =
    request.headers.get('x-nylon-signature') ||
    request.headers.get('x-nylonpay-signature') ||
    request.headers.get('x-webhook-signature') ||
    '';

  const signature = body.signature || headerSignature;
  if (!signature) {
    paymentLogger.error('nylonpay/callback: no signature present', {
      reference: body.data?.reference,
    });
    return NextResponse.json(
      { success: false, error: 'Missing signature' },
      { status: 401 },
    );
  }

  const isValid = verifyNylonPayWebhook({
    payload: rawBody,
    signature,
    secret: process.env.NYLONPAY_WEBHOOK_SECRET,
    toleranceSeconds: 300,
  });
  if (!isValid) {
    paymentLogger.error('nylonpay/callback: signature verification failed', {
      reference: body.data?.reference,
    });
    return NextResponse.json(
      { success: false, error: 'Invalid signature' },
      { status: 401 },
    );
  }

  await setServiceRoleContext();
  try {
    const { event, data } = body as { event: string; data: Transaction };
    const txnReference = data?.reference;

    if (!txnReference) {
      paymentLogger.error('nylonpay/callback: missing reference in payload', {
        event,
      });
      return NextResponse.json(
        { success: false, error: 'Missing reference' },
        { status: 400 },
      );
    }

    // Idempotency: dedupe on (reference, event) — even though verifyWebhookSignature
    // rejects stale replays, we still need to dedupe within the 5-min window for
    // at-least-once delivery.
    const dedupeKey = `${txnReference}:${event}`;
    const isDuplicate = await isWebhookProcessed('NYLONPAY', dedupeKey);
    if (isDuplicate) {
      paymentLogger.info('nylonpay/callback: duplicate webhook, skipping', {
        reference: txnReference,
        event,
      });
      return NextResponse.json({
        success: true,
        message: 'Already processed',
      });
    }

    // Defense in depth: re-verify with getStatus() before fulfilling on
    // collection.completed events. This catches webhook forgery even if our
    // webhook secret leaked.
    if (event === 'collection.completed') {
      try {
        // Lazy import to avoid circular dep at module load
        const { getNylonPayClient } = await import('@/lib/payments/nylonpay');
        const nylonpay = getNylonPayClient();
        const verify = await nylonpay.getStatus({ reference: txnReference });
        if (verify.isErr || verify.value.status !== 'successful') {
          paymentLogger.error('nylonpay/callback: re-verify mismatch', {
            reference: txnReference,
            webhookStatus: data.status,
            getStatusStatus: verify.isOk ? verify.value.status : verify.error,
          });
          // Don't fulfill — surface to support
          return NextResponse.json(
            { success: false, error: 'Status mismatch' },
            { status: 400 },
          );
        }
      } catch (verifyErr) {
        // Don't fail the webhook if the re-verify call itself errors (network,
        // rate limit) — the signature already proved authenticity. Log and proceed.
        paymentLogger.warn('nylonpay/callback: getStatus re-verify failed (non-blocking)', {
          reference: txnReference,
          error: String(verifyErr),
        });
      }
    }

    // Find the local payment record
    const payment = await db.payment.findFirst({
      where: { paymentReference: txnReference },
    });
    if (!payment) {
      paymentLogger.error('nylonpay/callback: payment not found', {
        reference: txnReference,
      });
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 },
      );
    }

    // Delegate to the payment service — handles status update, race-condition
    // guard, handleSuccessfulPayment (task + finance log), audit log.
    await handleNylonPayCallback({
      reference: txnReference,
      status: data.status,
      transactionId: data.id,
      operatorTid: data.operatorTid,
      amount: data.amount,
      currency: data.currency,
      failureReason: data.failureReason,
      event,
      rawPayload: body,
    });

    // Send user notification (socket emission + preference-checked push)
    try {
      await sendPaymentNotification(
        payment.userId,
        payment.id,
        toNumber(payment.amount),
        data.status === 'successful'
          ? 'COMPLETED'
          : data.status === 'failed' || data.status === 'cancelled'
            ? 'FAILED'
            : 'REFUNDED',
      );
    } catch (notifErr) {
      paymentLogger.error('nylonpay/callback: sendPaymentNotification failed', {
        error: String(notifErr),
      });
    }

    // Record webhook as processed (for dedup)
    await recordWebhookProcessed('NYLONPAY', dedupeKey, payment.id, data.status, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    paymentLogger.error('nylonpay/callback error', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Callback failed' },
      { status: 500 },
    );
  } finally {
    await resetRLSContext();
  }
}

/**
 * GET — health check. Lets the NylonPay dashboard verify the endpoint is
 * reachable before saving the webhook URL.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    provider: 'nylonpay',
    configured: isNylonPayConfigured(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * NylonPay SDK singleton — server-side only.
 *
 * NylonPay is the merchant-of-record payment gateway for Smart Ride. It
 * abstracts MTN MoMo, Airtel Money, bank transfers, and (with KYC L2) cards
 * behind a single API. Customer payments land in our NylonPay collection
 * account; rider/merchant payouts draw from that balance.
 *
 * Docs: https://docs.nylonpay.nilesquad.com/docs
 * SDK:  @nile-squad/nylonpay-ts
 *
 * NEVER import this file from client-side code (Expo app or browser bundles).
 * The mobile app talks to our own /api/payments/nylonpay/* routes; only those
 * routes import this module.
 */

import {
  createNylonPay,
  verifyWebhookSignature,
  type NylonPaySdk,
  type NylonPayConfig,
  type CollectPaymentInput,
  type MakePayoutInput,
  type Transaction,
  type TransactionStatus,
  type WebhookPayload,
} from '@nile-squad/nylonpay-ts';
import { randomBytes } from 'node:crypto';
import { paymentLogger } from '@/lib/logging/logger';

// ==========================================
// Configuration
// ==========================================

/**
 * Check whether NylonPay credentials are present in the environment.
 * Used by payment-service.ts to decide whether to advertise NYLON_PAY as an
 * available payment method. Returns false in cash-only deployments.
 */
export function isNylonPayConfigured(): boolean {
  return Boolean(
    process.env.NYLONPAY_API_KEY &&
      process.env.NYLONPAY_API_SECRET &&
      process.env.NYLONPAY_API_KEY.length >= 16 &&
      process.env.NYLONPAY_API_SECRET.length >= 16,
  );
}

/** Boolean export for quick checks (snapshot at module load). */
export const nylonPayConfigured = isNylonPayConfigured();

/** Structured unavailability message for logs / API responses. */
export const NYLONPAY_UNAVAILABLE_MESSAGE =
  'NylonPay not configured. Set NYLONPAY_API_KEY and NYLONPAY_API_SECRET environment variables.';

// ==========================================
// Singleton
// ==========================================

let client: NylonPaySdk | null = null;

/**
 * Get the shared NylonPay SDK client. Throws if not configured so callers
 * fail fast instead of silently degrading — guard with isNylonPayConfigured()
 * before calling if you want graceful fallback.
 */
export function getNylonPayClient(): NylonPaySdk {
  if (!isNylonPayConfigured()) {
    throw new Error(NYLONPAY_UNAVAILABLE_MESSAGE);
  }
  if (!client) {
    const config: NylonPayConfig = {
      apiKey: process.env.NYLONPAY_API_KEY!,
      apiSecret: process.env.NYLONPAY_API_SECRET!,
      baseUrl: process.env.NYLONPAY_BASE_URL || undefined, // SDK default if unset
      timeoutMs: 30_000,
      maxRetries: 3,
      maxPollDurationMs: 300_000,
      hooks: {
        beforeCollect: {
          fn: (input) => {
            paymentLogger.info('nylonpay.collect.before', { reference: input.reference });
            return input;
          },
          onError: (err) =>
            paymentLogger.error('nylonpay.collect.before hook failed', { error: String(err) }),
        },
        afterCollect: {
          fn: (result, input) => {
            if (result.isOk) {
              paymentLogger.info('nylonpay.collect.after', {
                reference: result.value.reference,
                amount: input.amount,
              });
            } else {
              paymentLogger.error('nylonpay.collect.after failed', {
                error: result.error,
                amount: input.amount,
              });
            }
          },
          onError: (err) =>
            paymentLogger.error('nylonpay.collect.after hook failed', { error: String(err) }),
        },
        beforePayout: {
          fn: (input) => {
            paymentLogger.info('nylonpay.payout.before', { reference: input.reference });
            return input;
          },
          onError: (err) =>
            paymentLogger.error('nylonpay.payout.before hook failed', { error: String(err) }),
        },
        afterPayout: {
          fn: (result, input) => {
            if (result.isOk) {
              paymentLogger.info('nylonpay.payout.after', {
                reference: result.value.reference,
                amount: input.amount,
              });
            } else {
              paymentLogger.error('nylonpay.payout.after failed', {
                error: result.error,
                amount: input.amount,
              });
            }
          },
          onError: (err) =>
            paymentLogger.error('nylonpay.payout.after hook failed', { error: String(err) }),
        },
      },
    };
    client = createNylonPay(config);
  }
  return client;
}

// ==========================================
// Reference + status helpers
// ==========================================

/**
 * Generate a 14-char hex reference that fits NylonPay's 13–15 char requirement.
 * Prefix identifies the payment purpose (SR=service, WT=wallet top-up, PO=payout, IN=invoice).
 */
export function generateNylonPayReference(prefix = 'SR'): string {
  // prefix(2) + 12 hex chars = 14 chars total
  const ref = `${prefix}${randomBytes(6).toString('hex')}`;
  return ref.slice(0, 15);
}

/**
 * Map a NylonPay TransactionStatus (lowercase string from the SDK) to the
 * Prisma PaymentStatus enum used by Smart Ride.
 *
 * Note: NylonPay has `cancelled` but Prisma has no CANCELLED — we map it to
 * FAILED and rely on the failureReason field to distinguish.
 */
export function mapNylonPayStatus(
  status: TransactionStatus | string,
): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' {
  switch (status) {
    case 'pending':
      return 'PENDING';
    case 'processing':
      return 'PROCESSING';
    case 'successful':
      return 'COMPLETED';
    case 'failed':
      return 'FAILED';
    case 'cancelled':
      return 'FAILED'; // no CANCELLED in Prisma — log reason
    default:
      return 'PROCESSING';
  }
}

/**
 * Verify a NylonPay webhook signature. Wraps the SDK's standalone verifier so
 * the callback route doesn't need to import the SDK directly.
 *
 * Two checks (both must pass):
 * 1. Authenticity — HMAC-SHA256 over raw payload bytes matches `signature`.
 * 2. Freshness — the timestamp embedded in the signed body is within
 *    `toleranceSeconds` of now (default 300s = 5 minutes).
 */
export function verifyNylonPayWebhook(params: {
  payload: string | Uint8Array;
  signature: string;
  secret?: string;
  toleranceSeconds?: number;
}): boolean {
  const secret = params.secret ?? process.env.NYLONPAY_WEBHOOK_SECRET;
  if (!secret) {
    paymentLogger.error('nylonpay.webhook.verify', {
      error: 'NYLONPAY_WEBHOOK_SECRET not set',
    });
    return false;
  }
  try {
    return verifyWebhookSignature({
      payload: params.payload,
      signature: params.signature,
      secret,
      toleranceSeconds: params.toleranceSeconds ?? 300,
    });
  } catch (err) {
    paymentLogger.error('nylonpay.webhook.verify threw', { error: String(err) });
    return false;
  }
}

// ==========================================
// Type re-exports (for route handlers)
// ==========================================

export type {
  NylonPaySdk,
  CollectPaymentInput,
  MakePayoutInput,
  Transaction,
  TransactionStatus,
  WebhookPayload,
} from '@nile-squad/nylonpay-ts';

// ==========================================
// Convenience: one-shot collect (blocks until terminal)
// ==========================================

/**
 * Initiate a collection and block until the transaction reaches a terminal
 * state. Use for CLI tools, serverless functions, or simple scripts that
 * don't need event-driven updates.
 *
 * For the web flow, prefer the event-driven `collectPayment` + webhook pattern
 * — see /api/payments/nylonpay/initiate/route.ts.
 */
export async function collectPaymentAndResolve(
  input: CollectPaymentInput,
): Promise<{ ok: true; transaction: Transaction } | { ok: false; error: string }> {
  try {
    const nylonpay = getNylonPayClient();
    const result = await nylonpay.collectPaymentAndResolve(input);
    if (result.isOk) {
      return { ok: true, transaction: result.value };
    }
    return { ok: false, error: result.error };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'NylonPay collect failed',
    };
  }
}

// ==========================================
// Default export
// ==========================================

export const NylonPayService = {
  isConfigured: isNylonPayConfigured,
  getClient: getNylonPayClient,
  generateReference: generateNylonPayReference,
  mapStatus: mapNylonPayStatus,
  verifyWebhook: verifyNylonPayWebhook,
  collectPaymentAndResolve,
};

export default NylonPayService;

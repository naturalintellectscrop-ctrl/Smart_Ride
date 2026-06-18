// ============================================
// SMART RIDE - WALLET TOP-UP API
// ============================================
// POST /api/wallet/topup
// Initiates a wallet top-up via MTN MoMo / Airtel Money.
//
// SECURITY: This endpoint does NOT credit the wallet balance. It only creates
// a PENDING WalletTransaction. The balance is credited exclusively by the
// payment-provider webhook (/api/payments/mtn-callback or /api/payments/
// airtel-callback) after verifying the provider's signature and a
// SUCCESSFUL payment status. This prevents the "free-money" exploit where
// a top-up request instantly credited balance without any real payment.
//
// Until a real payment gateway (MTN MoMo / Airtel Money) is configured with
// valid API credentials and webhook secrets, top-ups will remain PENDING and
// the balance will NOT change. This is intentional and correct.
// ============================================

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/api/response';
import { toNumber } from '@/lib/decimal-utils';
import { z } from 'zod';

const schema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['MTN_MOMO', 'AIRTEL_MONEY']),
  phoneNumber: z.string().min(10, 'Valid phone number required'),
});

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validated = schema.parse(body);

    // Verify a payment provider is actually configured before accepting the
    // top-up request. Without provider credentials we cannot initiate a real
    // collection, so we refuse rather than silently creating a stuck PENDING.
    const providerConfigured =
      validated.paymentMethod === 'MTN_MOMO'
        ? !!(process.env.MTN_MOMO_API_USER && process.env.MTN_MOMO_API_KEY && process.env.MTN_MOMO_SUBSCRIPTION_KEY)
        : !!(process.env.AIRTEL_MONEY_CLIENT_ID && process.env.AIRTEL_MONEY_CLIENT_SECRET && process.env.AIRTEL_MONEY_WEBHOOK_SECRET);

    if (!providerConfigured) {
      return errorResponse(
        'Wallet top-up is not available yet. Payment provider is not configured. Please use Cash on Delivery for now.',
        503
      );
    }

    // Get the user's wallet (USER-owned). Create if missing.
    let wallet = await db.wallet.findFirst({
      where: { ownerId: decoded.userId, ownerType: 'USER' },
    });

    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          ownerId: decoded.userId,
          ownerType: 'USER',
          balance: 0,
          pendingBalance: 0,
          currency: 'UGX',
          status: 'ACTIVE',
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalSpent: 0,
          totalReceived: 0,
        },
      });
    }

    // Create a PENDING transaction. Balance is NOT credited here.
    // The webhook handler will flip this to COMPLETED and credit the wallet
    // only after a verified SUCCESSFUL payment notification from the provider.
    const reference = `TOPUP-${Date.now()}`;
    const transaction = await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionType: 'DEPOSIT',
        amount: validated.amount,
        balanceBefore: toNumber(wallet.balance),
        balanceAfter: toNumber(wallet.balance), // unchanged until webhook confirms
        externalProvider: validated.paymentMethod,
        description: `Wallet top-up via ${validated.paymentMethod} (pending provider confirmation)`,
        status: 'PENDING',
        metadata: JSON.stringify({
          paymentMethod: validated.paymentMethod,
          phoneNumber: validated.phoneNumber,
          reference,
          userId: decoded.userId,
          // Explicitly mark that this is awaiting real payment confirmation.
          // The DEMO_AUTO_COMPLETE mode has been removed to prevent free-money.
          mode: 'PENDING_PROVIDER_CONFIRMATION',
        }),
      },
    });

    // TODO (integration): When MTN MoMo / Airtel Money SDK is wired up, call
    // the provider's "request to pay" API here using the reference above and
    // the user's phoneNumber. The provider will then trigger the webhook at
    // /api/payments/{mtn,airtel}-callback which verifies the signature and
    // credits the wallet. Until then the transaction stays PENDING.

    return successResponse(
      {
        transactionId: transaction.id,
        reference,
        amount: validated.amount,
        status: 'PENDING',
        paymentMethod: validated.paymentMethod,
        newBalance: toNumber(wallet.balance),
        message:
          'Top-up initiated. Your balance will update once the payment is confirmed by the provider.',
      },
      'Top-up initiated successfully'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || 'Validation error');
    }
    console.error('Error processing top-up:', error);
    return serverErrorResponse('Failed to process top-up');
  } finally {
    await resetRLSContext();
  }
}

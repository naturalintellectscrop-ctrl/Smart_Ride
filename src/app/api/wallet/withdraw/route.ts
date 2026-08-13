// ============================================
// SMART RIDE - WALLET WITHDRAW API
// ============================================
// Allows riders to withdraw from their wallet
// to a mobile money account (MTN MoMo or Airtel Money).
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRLS } from '@/lib/auth/guards';
import { db, resetRLSContext } from '@/lib/db';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { withdrawFromWallet } from '@/lib/wallet/wallet-service';
import { isProvider } from '@/lib/auth/jwt';

const VALID_PROVIDERS = ['MTN_MOMO', 'AIRTEL_MONEY'];

// POST /api/wallet/withdraw - Withdraw from wallet
export async function POST(request: NextRequest) {
  // Rate limiting check — 5 payment requests per minute
  const rateLimitResult = checkRateLimit(request, RATE_LIMITS.payment.initiate);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult, RATE_LIMITS.payment.initiate);
  }

  const authResult = await requireAuthWithRLS(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }

  const user = authResult.user;

  // Only riders can withdraw
  if (!isProvider(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Only providers can withdraw from wallet' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { amount, phone, provider } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate phone
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate provider
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Provider must be MTN_MOMO or AIRTEL_MONEY' },
        { status: 400 }
      );
    }

    // Ensure the wallet exists. A rider who has never transacted has no row,
    // and "no wallet" is not a withdrawal error — it is a zero balance.
    const wallet = await db.wallet.upsert({
      where: { ownerId_ownerType: { ownerId: user.userId, ownerType: 'USER' } },
      create: {
        ownerId: user.userId,
        ownerType: 'USER',
        balance: 0,
        pendingBalance: 0,
        status: 'ACTIVE',
      },
      update: {},
    });

    // Delegate to the shared wallet service rather than hand-rolling the
    // debit (BE-003). This route previously read the balance OUTSIDE the
    // transaction and then wrote `balance = staleRead - amount`, so two
    // concurrent withdrawals could each pass the sufficiency check and the
    // second would overwrite the first — the wallet paying out twice and
    // losing the amount only once.
    //
    // PENDING, not COMPLETED: the balance is debited immediately so the money
    // cannot be spent twice, but a mobile-money payout is not settled until
    // the provider confirms it.
    // A retry of a withdrawal must not debit twice. The client sends the same
    // key when it retries; without one, a dropped response on a flaky mobile
    // connection is indistinguishable from a failure and the user taps again.
    const idempotencyKey =
      request.headers.get('idempotency-key') ||
      (typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined);

    const result = await withdrawFromWallet({
      ownerId: user.userId,
      ownerType: 'USER',
      amount,
      externalProvider: provider,
      description: `Withdrawal to ${provider} (${phone})`,
      status: 'PENDING',
      idempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Withdrawal failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        amount,
        provider,
        phone,
        status: 'PENDING',
        newBalance: result.newBalance,
        // Tells the client this response replays an earlier withdrawal rather
        // than describing a new one, so it can avoid double-counting.
        idempotentReplay: result.idempotentReplay === true,
      },
    });
  } catch (error: unknown) {
    console.error('Wallet withdraw error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

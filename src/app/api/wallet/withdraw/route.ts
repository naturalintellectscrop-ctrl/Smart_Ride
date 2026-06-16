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
import { toNumber } from '@/lib/decimal-utils';

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
  if (user.role !== 'RIDER') {
    return NextResponse.json(
      { success: false, error: 'Only riders can withdraw from wallet' },
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

    // Find or create wallet
    let wallet = await db.wallet.findFirst({
      where: { ownerId: user.userId, ownerType: 'USER' },
    });

    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          ownerId: user.userId,
          ownerType: 'USER',
          balance: 0,
          pendingBalance: 0,
          status: 'ACTIVE',
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalSpent: 0,
          totalReceived: 0,
        },
      });
    }

    // Check sufficient balance
    if (toNumber(wallet.balance) < amount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    // Check wallet is active
    if (wallet.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Wallet is not active' },
        { status: 400 }
      );
    }

    // Execute withdrawal in a transaction
    const result = await db.$transaction(async (tx) => {
      // Deduct from wallet balance
      const newBalance = toNumber(wallet!.balance) - amount;
      const newWithdrawn = toNumber(wallet!.totalWithdrawn) + amount;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet!.id },
        data: {
          balance: newBalance,
          totalWithdrawn: newWithdrawn,
          lastWithdrawalAt: new Date(),
          lastTransactionAt: new Date(),
        },
      });

      // Create WalletTransaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          transactionType: 'WITHDRAWAL',
          amount,
          balanceBefore: wallet!.balance,
          balanceAfter: newBalance,
          externalProvider: provider,
          description: `Withdrawal to ${provider} (${phone})`,
          status: 'PENDING',
          metadata: JSON.stringify({
            phone,
            provider,
            userId: user.userId,
            requestedAt: new Date().toISOString(),
          }),
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    return NextResponse.json({
      success: true,
      data: {
        transactionId: result.transaction.id,
        amount,
        provider,
        phone,
        status: 'PENDING',
        newBalance: result.wallet.balance,
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

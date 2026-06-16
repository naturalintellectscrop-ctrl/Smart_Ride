// ============================================
// SMART RIDE - WALLET TOP-UP API
// ============================================
// POST /api/wallet/topup
// Initiates a wallet top-up via MTN MoMo / Airtel Money.
// In demo mode (no payment provider configured) the top-up
// is auto-completed so the user sees the balance update.
// In production, this should be replaced by a real payment
// gateway integration with a confirmation callback.
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

    // Execute the top-up atomically (demo mode — auto-complete).
    // TODO: Replace with real payment gateway integration when MoR is ready.
    const result = await db.$transaction(async (tx) => {
      const balanceBefore = toNumber(wallet!.balance);
      const balanceAfter = balanceBefore + validated.amount;
      const newDeposited = toNumber(wallet!.totalDeposited) + validated.amount;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet!.id },
        data: {
          balance: balanceAfter,
          totalDeposited: newDeposited,
          lastDepositAt: new Date(),
          lastTransactionAt: new Date(),
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          transactionType: 'DEPOSIT',
          amount: validated.amount,
          balanceBefore,
          balanceAfter,
          externalProvider: validated.paymentMethod,
          description: `Wallet top-up via ${validated.paymentMethod}`,
          status: 'COMPLETED',
          metadata: JSON.stringify({
            paymentMethod: validated.paymentMethod,
            phoneNumber: validated.phoneNumber,
            reference: `TOPUP-${Date.now()}`,
            userId: decoded.userId,
            mode: 'DEMO_AUTO_COMPLETE',
          }),
        },
      });

      return { updatedWallet, transaction };
    });

    return successResponse(
      {
        transactionId: result.transaction.id,
        amount: validated.amount,
        status: 'COMPLETED',
        paymentMethod: validated.paymentMethod,
        newBalance: toNumber(result.updatedWallet.balance),
        message: 'Top-up completed successfully',
      },
      'Top-up processed successfully'
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

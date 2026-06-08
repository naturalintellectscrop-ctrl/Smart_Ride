// ============================================
// SMART RIDE - WALLET BALANCE API
// ============================================
// Returns the wallet balance for the authenticated user.
// Finds or creates a wallet for the user.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db, resetRLSContext } from '@/lib/db';

// GET /api/wallet/balance - Get wallet balance
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }

  const user = authResult.user;

  try {
    // Find or create wallet for the user
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

    return NextResponse.json({
      success: true,
      data: {
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
      },
    });
  } catch (error: unknown) {
    console.error('Get wallet balance error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// ============================================
// SMART RIDE - WALLET TRANSACTIONS API
// ============================================
// Returns paginated transaction history for
// the authenticated user's wallet.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { db, resetRLSContext } from '@/lib/db';

// GET /api/wallet/transactions - Get wallet transaction history
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
    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Find the wallet
    const wallet = await db.wallet.findFirst({
      where: { ownerId: user.userId, ownerType: 'USER' },
    });

    if (!wallet) {
      // No wallet yet — return empty list
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Get total count
    const totalCount = await db.walletTransaction.count({
      where: { walletId: wallet.id },
    });

    // Get paginated transactions
    const transactions = await db.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Get wallet transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOwnershipOrAdmin } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';

// GET /api/wallet - Get wallet balance and info
export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const user = authResult as JWTPayload;

  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // If requesting specific user's wallet, verify ownership or admin
    if (requestedUserId && requestedUserId !== user.userId) {
      const ownershipResult = await requireOwnershipOrAdmin(request, requestedUserId);
      if (ownershipResult instanceof NextResponse) {
        return ownershipResult;
      }
    }

    const userId = requestedUserId || user.userId;

    // Get or create wallet
    let wallet = await db.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await db.wallet.create({
        data: {
          userId,
          balance: 0,
          pendingBalance: 0,
          status: 'ACTIVE',
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalSpent: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    // Get user payment methods
    const paymentMethods = await db.userPaymentMethod.findMany({
      where: { userId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        status: wallet.status,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        totalSpent: wallet.totalSpent,
      },
      transactions: wallet.transactions.map(t => ({
        id: t.id,
        type: t.transactionType,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt,
        referenceType: t.referenceType,
      })),
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type,
        name: pm.name,
        accountNumber: pm.accountNumber,
        isDefault: pm.isDefault,
        cardLastFour: pm.cardLastFour,
        cardBrand: pm.cardBrand,
        phoneNumber: pm.phoneNumber,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}

// POST /api/wallet - Top up wallet
export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const user = authResult as JWTPayload;

  try {
    const body = await request.json();
    const { amount, paymentMethod, phoneNumber } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    // Users can only top up their own wallet
    const userId = user.userId;

    // Get or create wallet
    let wallet = await db.wallet.findUnique({ where: { userId } });
    
    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          userId,
          balance: 0,
          pendingBalance: 0,
          status: 'ACTIVE',
        },
      });
    }

    // Create transaction
    const newBalance = wallet.balance + amount;
    
    await db.$transaction(async (tx) => {
      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet!.id },
        data: {
          balance: newBalance,
          totalDeposited: wallet!.totalDeposited + amount,
        },
      });

      // Create transaction record
      await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          transactionType: 'DEPOSIT',
          amount,
          balanceAfter: newBalance,
          paymentMethod,
          description: `Wallet top-up via ${paymentMethod}`,
          status: 'COMPLETED',
        },
      });
    });

    // Refetch updated wallet
    const updatedWallet = await db.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return NextResponse.json({
      success: true,
      wallet: updatedWallet,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to top up wallet' }, { status: 500 });
  }
}

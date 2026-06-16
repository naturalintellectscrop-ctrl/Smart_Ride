import { NextRequest, NextResponse } from 'next/server';
import { db, resetRLSContext } from '@/lib/db';
import { requireAuth, requireOwnershipOrAdmin } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { checkRateLimit, paymentRateLimit } from '@/lib/security/rate-limit';
import { PaymentService } from '@/lib/payments/payment-service';

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

    // Get or create wallet (Wallet model uses ownerId/ownerType)
    let wallet = await db.wallet.findFirst({
      where: { ownerId: userId, ownerType: 'USER' },
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
          ownerId: userId,
          ownerType: 'USER',
          balance: 0,
          pendingBalance: 0,
          status: 'ACTIVE',
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalSpent: 0,
          totalReceived: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    // Get user payment methods
    let paymentMethods: unknown[] = [];
    try {
      paymentMethods = await db.userPaymentMethod.findMany({
        where: { userId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });
    } catch {
      // UserPaymentMethod table may not exist yet
    }

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch wallet' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

// POST /api/wallet - Top up wallet via payment gateway
// Wallet top-up must go through a real payment provider (MTN MoMo or Airtel Money).
// Money is NOT added directly — a PENDING transaction is created and the payment
// gateway is invoked. The balance is only incremented after the payment callback
// confirms success.
export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResult = checkRateLimit(request, paymentRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

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
      return NextResponse.json({ success: false, error: 'Valid amount is required' }, { status: 400 });
    }

    // Payment method is required — we must go through a real payment gateway
    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Wallet top-up requires a payment method. Please add a payment method first.' },
        { status: 400 }
      );
    }

    // Only mobile money providers are supported for wallet top-up
    const supportedMethods = ['MTN_MOMO', 'AIRTEL_MONEY'];
    if (!supportedMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Wallet top-up requires a payment method. Please add a payment method first.' },
        { status: 400 }
      );
    }

    // Phone number is required for mobile money
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required for mobile money top-up' },
        { status: 400 }
      );
    }

    // Check if the payment provider is configured
    const isProviderConfigured = paymentMethod === 'MTN_MOMO'
      ? PaymentService.isMTNConfigured()
      : PaymentService.isAirtelConfigured();

    if (!isProviderConfigured) {
      return NextResponse.json(
        { success: false, error: 'Wallet top-up requires a payment method. Please add a payment method first.' },
        { status: 400 }
      );
    }

    // Users can only top up their own wallet
    const userId = user.userId;

    // Get or create wallet (Wallet model uses ownerId/ownerType)
    let wallet = await db.wallet.findFirst({ where: { ownerId: userId, ownerType: 'USER' } });
    
    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          ownerId: userId,
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

    // Create a PENDING wallet transaction — balance is NOT updated yet
    // The transaction will be marked COMPLETED only after the payment gateway confirms success
    const pendingTransaction = await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionType: 'DEPOSIT',
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance, // unchanged until payment confirmed
        description: `Wallet top-up via ${paymentMethod} (pending)`,
        status: 'PENDING',
      },
    });

    // Initiate the payment through the payment gateway
    const paymentResult = await PaymentService.initiatePayment({
      userId,
      amount,
      currency: 'UGX',
      paymentMethod,
      phoneNumber,
      description: `Wallet top-up UGX ${amount.toLocaleString()}`,
      metadata: {
        walletTransactionId: pendingTransaction.id,
        walletId: wallet.id,
        topUp: true,
      },
    });

    if (!paymentResult.success) {
      // Mark the transaction as FAILED since the payment initiation failed
      await db.walletTransaction.update({
        where: { id: pendingTransaction.id },
        data: {
          status: 'FAILED',
          description: `Wallet top-up via ${paymentMethod} (failed: ${paymentResult.message})`,
        },
      });

      return NextResponse.json(
        { success: false, error: paymentResult.message || 'Payment initiation failed' },
        { status: 400 }
      );
    }

    // Create audit log for wallet top-up initiation
    try {
      await createAuditLog({
        action: AuditActions.WALLET_TOPUP,
        entityType: EntityTypes.WALLET,
        entityId: wallet.id,
        actorType: 'USER',
        actorId: user.userId,
        userId: user.userId,
        description: `Wallet top-up of ${amount} initiated via ${paymentMethod} (payment pending)`,
        source: 'MOBILE_APP',
      });
    } catch (auditError) {
      console.error('Audit log failed for wallet top-up:', auditError);
    }

    // Return payment pending status — the client should poll or wait for callback
    return NextResponse.json({
      success: true,
      data: {
        transaction: {
          id: pendingTransaction.id,
          status: 'PENDING',
          amount,
          paymentMethod,
        },
        payment: {
          id: paymentResult.paymentId,
          reference: paymentResult.reference,
          status: paymentResult.status,
          message: paymentResult.message,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to top up wallet' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

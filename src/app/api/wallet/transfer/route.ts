import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';

// POST /api/wallet/transfer - Transfer money to another user
export async function POST(request: NextRequest) {
  // Rate limiting check — 5 payment requests per minute
  const rateLimitResult = checkRateLimit(request, RATE_LIMITS.payment.initiate);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult, RATE_LIMITS.payment.initiate);
  }

  // Require authentication - sender must be the authenticated user
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const user = authResult as JWTPayload;

  try {
    const body = await request.json();
    const { recipientPhone, amount, note } = body;

    if (!recipientPhone || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Recipient phone and valid amount are required' },
        { status: 400 }
      );
    }

    // Use authenticated user as sender
    const senderId = user.userId;

    // Calculate transfer fee (1.5%)
    const fee = Math.ceil(amount * 0.015);
    const totalAmount = amount + fee;

    // Find sender's wallet — Wallet model uses ownerId/ownerType composite key
    const senderWallet = await db.wallet.findFirst({
      where: { ownerId: senderId, ownerType: 'USER' },
    });

    if (!senderWallet) {
      return NextResponse.json({ success: false, error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // balance is a Prisma Decimal — compare via the Decimal API. A plain
    // `<` relies on JS coercion and can wrongly pass this guard.
    if (senderWallet.balance.lessThan(totalAmount)) {
      return NextResponse.json({ success: false, error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Find recipient by phone
    const recipientUser = await db.user.findFirst({
      where: { phone: recipientPhone.replace(/\s+/g, '') },
    });

    if (!recipientUser) {
      return NextResponse.json({ success: false, error: 'Recipient not found. Please verify the phone number.' },
        { status: 404 }
      );
    }

    // Prevent self-transfer
    if (recipientUser.id === senderId) {
      return NextResponse.json({ success: false, error: 'Cannot transfer to yourself' },
        { status: 400 }
      );
    }

    // Find or create recipient's wallet — Wallet model uses ownerId/ownerType composite key
    let recipientWallet = await db.wallet.findFirst({
      where: { ownerId: recipientUser.id, ownerType: 'USER' },
    });

    if (!recipientWallet) {
      recipientWallet = await db.wallet.create({
        data: {
          ownerId: recipientUser.id,
          ownerType: 'USER',
          balance: 0,
          pendingBalance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalSpent: 0,
          totalReceived: 0,
          status: 'ACTIVE',
        },
      });
    }

    // Perform the transfer in a transaction
    const result = await db.$transaction(async (tx) => {
      const senderBalanceBefore = senderWallet.balance;
      const recipientBalanceBefore = recipientWallet!.balance;

      // Deduct from sender
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: { decrement: totalAmount },
          totalSpent: { increment: amount },
        },
      });

      // Add to recipient
      await tx.wallet.update({
        where: { id: recipientWallet!.id },
        data: {
          balance: { increment: amount },
          totalDeposited: { increment: amount },
        },
      });

      // Create sender transaction — balanceBefore and balanceAfter are both required
      const senderTransaction = await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          transactionType: 'TRANSFER_OUT',
          description: note || `Transfer to ${recipientUser.name || recipientPhone}`,
          amount: -amount,
          balanceBefore: senderBalanceBefore,
          balanceAfter: senderBalanceBefore.minus(totalAmount),
          status: 'COMPLETED',
        },
      });

      // Create fee transaction for sender
      await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          transactionType: 'FEE',
          description: 'Transfer fee',
          amount: -fee,
          balanceBefore: senderBalanceBefore.minus(totalAmount).plus(amount),
          balanceAfter: senderBalanceBefore.minus(totalAmount),
          status: 'COMPLETED',
        },
      });

      // Create recipient transaction
      await tx.walletTransaction.create({
        data: {
          walletId: recipientWallet!.id,
          transactionType: 'TRANSFER_IN',
          description: note || `Received from ${user.name || 'Smart Ride user'}`,
          amount: amount,
          balanceBefore: recipientBalanceBefore,
          balanceAfter: recipientBalanceBefore.plus(amount),
          status: 'COMPLETED',
        },
      });

      return senderTransaction;
    });

    // Create notification for recipient
    await db.notification.create({
      data: {
        userId: recipientUser.id,
        title: 'Money Received',
        message: `You received UGX ${amount.toLocaleString()} from ${user.name || 'a Smart Ride user'}`,
        type: 'PAYMENT',
        referenceId: result.id,
        referenceType: 'WALLET_TRANSACTION',
      },
    });

    // Create audit log for wallet transfer
    try {
      await createAuditLog({
        action: AuditActions.WALLET_TRANSFER,
        entityType: EntityTypes.WALLET,
        entityId: senderWallet.id,
        actorType: 'USER',
        actorId: user.userId,
        userId: user.userId,
        description: `Wallet transfer of ${amount} to ${recipientUser.name || recipientPhone} (fee: ${fee})`,
        newValues: {
          amount,
          fee,
          totalAmount,
          recipientId: recipientUser.id,
          recipientPhone,
        },
        source: 'MOBILE_APP',
      });
    } catch (auditError) {
      console.error('Audit log failed for wallet transfer:', auditError);
    }

    return NextResponse.json({
      success: true,
      transaction: result,
      fee,
      totalAmount,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process transfer' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

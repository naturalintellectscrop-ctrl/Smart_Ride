import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { JWTPayload } from '@/lib/auth/jwt';

// POST /api/wallet/transfer - Transfer money to another user
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Recipient phone and valid amount are required' },
        { status: 400 }
      );
    }

    // Use authenticated user as sender
    const senderId = user.userId;

    // Calculate transfer fee (1.5%)
    const fee = Math.ceil(amount * 0.015);
    const totalAmount = amount + fee;

    // Find sender's wallet
    const senderWallet = await db.wallet.findFirst({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    if (senderWallet.balance < totalAmount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Find recipient by phone
    const recipientUser = await db.user.findFirst({
      where: { phone: recipientPhone.replace(/\s+/g, '') },
    });

    if (!recipientUser) {
      return NextResponse.json(
        { error: 'Recipient not found. Please verify the phone number.' },
        { status: 404 }
      );
    }

    // Prevent self-transfer
    if (recipientUser.id === senderId) {
      return NextResponse.json(
        { error: 'Cannot transfer to yourself' },
        { status: 400 }
      );
    }

    // Find or create recipient's wallet
    let recipientWallet = await db.wallet.findFirst({
      where: { userId: recipientUser.id },
    });

    if (!recipientWallet) {
      recipientWallet = await db.wallet.create({
        data: {
          userId: recipientUser.id,
          balance: 0,
          pendingBalance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalSpent: 0,
          status: 'ACTIVE',
        },
      });
    }

    // Perform the transfer in a transaction
    const result = await db.$transaction(async (tx) => {
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

      // Create sender transaction
      const senderTransaction = await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          transactionType: 'TRANSFER_OUT',
          description: note || `Transfer to ${recipientUser.name || recipientPhone}`,
          amount: -amount,
          balanceAfter: senderWallet.balance - totalAmount,
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
          balanceAfter: senderWallet.balance - totalAmount,
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
          balanceAfter: recipientWallet!.balance + amount,
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

    return NextResponse.json({
      success: true,
      transaction: result,
      fee,
      totalAmount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process transfer' },
      { status: 500 }
    );
  }
}

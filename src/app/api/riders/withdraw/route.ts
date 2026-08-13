/**
 * POST /api/riders/withdraw
 * Rider requests a withdrawal from their wallet to mobile money (MTN/Airtel)
 *
 * Uses the existing wallet-service for atomic wallet operations.
 * Debits the wallet and tracks the payout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { db } from '@/lib/db';
import { withdrawFromWallet } from '@/lib/wallet/wallet-service';
import { createNotification } from '@/lib/services/notification.service';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { z } from 'zod';

const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  provider: z.enum(['MTN', 'AIRTEL'], { error: () => 'Provider must be MTN or AIRTEL' }),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.userId;

    // Validate request body
    const body = await request.json();
    const validated = withdrawSchema.safeParse(body);

    if (!validated.success) {
      const errorMessage = validated.error.issues.map(i => i.message).join(', ');
      return errorResponse(errorMessage, 400);
    }

    const { amount, phoneNumber, provider } = validated.data;

    // Get rider profile
    const rider = await db.rider.findFirst({ where: { userId } });
    if (!rider) {
      return errorResponse('Rider profile not found', 404);
    }

    // Check minimum withdrawal (UGX 1,000)
    if (amount < 1000) {
      return errorResponse('Minimum withdrawal is UGX 1,000', 400);
    }

    // Check maximum withdrawal (UGX 5,000,000)
    if (amount > 5000000) {
      return errorResponse('Maximum withdrawal is UGX 5,000,000', 400);
    }

    // Withdraw from the USER wallet.
    //
    // This used to address `ownerType: 'RIDER'` keyed on rider.id. No such
    // wallet has ever existed — every Wallet row in the database is USER-owned
    // — so every withdrawal from the earnings screen failed with "Wallet not
    // found" (BE-003). A person has one balance; splitting it by which screen
    // they withdrew from was the accident, not the design.
    //
    // PENDING because the mobile-money payout is not settled until the
    // provider confirms; the debit itself is immediate.
    const result = await withdrawFromWallet({
      ownerId: userId,
      ownerType: 'USER',
      amount,
      externalProvider: provider,
      description: `Withdrawal to ${provider} (${phoneNumber})`,
      status: 'PENDING',
      idempotencyKey:
        request.headers.get('idempotency-key') ||
        (typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : undefined),
    });

    if (!result.success) {
      return errorResponse(result.error || 'Withdrawal failed', 400);
    }

    // A replay is not a new event. Re-running the audit log and the
    // notification would tell the driver they withdrew twice.
    if (result.idempotentReplay) {
      return successResponse({
        message: 'Withdrawal already processed',
        newBalance: result.newBalance,
        transactionId: result.transactionId,
        provider,
        amount,
        idempotentReplay: true,
      });
    }

    // Create audit log
    await createAuditLog({
      action: AuditActions.WALLET_WITHDRAWAL,
      entityType: EntityTypes.WALLET,
      entityId: rider.id,
      actorType: 'RIDER',
      actorId: userId,
      riderId: rider.id,
      description: `Rider withdrawal of UGX ${amount.toLocaleString()} via ${provider}`,
      newValues: { amount, provider, phoneNumber, newBalance: result.newBalance },
    });

    // Notify rider
    await createNotification({
      userId,
      title: 'Withdrawal Initiated',
      message: `UGX ${amount.toLocaleString()} withdrawal to ${provider} is being processed`,
      type: 'PAYMENT',
      referenceType: 'WALLET',
    });

    // In production, this would initiate a mobile money payout via MTN/Airtel API
    // For now, the wallet is debited and the payout is tracked

    return successResponse({
      message: 'Withdrawal initiated',
      newBalance: result.newBalance,
      transactionId: result.transactionId,
      provider,
      amount,
      idempotentReplay: false,
    });
  } catch (error) {
    console.error('Error processing rider withdrawal:', error);
    return serverErrorResponse('Failed to process withdrawal');
  }
}

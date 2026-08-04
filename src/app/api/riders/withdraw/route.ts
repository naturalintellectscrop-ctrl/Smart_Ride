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

    // Withdraw from wallet atomically
    const result = await withdrawFromWallet({
      ownerId: rider.id,
      ownerType: 'RIDER',
      amount,
      externalProvider: provider,
      description: `Withdrawal to ${provider} (${phoneNumber})`,
    });

    if (!result.success) {
      return errorResponse(result.error || 'Withdrawal failed', 400);
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
    });
  } catch (error) {
    console.error('Error processing rider withdrawal:', error);
    return serverErrorResponse('Failed to process withdrawal');
  }
}

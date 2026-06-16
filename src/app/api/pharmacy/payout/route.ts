// ============================================
// SMART RIDE - PHARMACY PAYOUT API
// ============================================
// POST /api/pharmacy/payout
// Allows a pharmacy provider to request a payout of their
// accumulated earnings. Mirrors the merchant payout flow
// but operates on the HealthProvider model.
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
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(10_000_000, 'Payout amount is too large'),
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
    const amount = validated.amount;

    // Find the provider owned by this user. HealthProvider.userId is
    // @unique, so there's at most one record per user.
    const provider = await db.healthProvider.findFirst({
      where: { userId: decoded.userId },
    });

    if (!provider) {
      return errorResponse(
        'No pharmacy profile found for this account. Please complete provider onboarding first.',
        404
      );
    }

    if (provider.verificationStatus !== 'APPROVED') {
      return errorResponse(
        'Your pharmacy is not yet approved for payouts.',
        403
      );
    }

    // Use pendingPayout as the source of truth for the available balance.
    const availableBalance = toNumber(provider.pendingPayout);

    if (amount > availableBalance) {
      return errorResponse(
        `Insufficient available balance. You can withdraw up to UGX ${availableBalance.toLocaleString()}.`,
        400
      );
    }

    // Execute the payout atomically.
    const result = await db.$transaction(async (tx) => {
      const remaining = availableBalance - amount;

      const updatedProvider = await tx.healthProvider.update({
        where: { id: provider.id },
        data: {
          pendingPayout: remaining,
        },
      });

      const payout = await tx.financeLog.create({
        data: {
          transactionType: 'MERCHANT_PAYOUT', // reused for health-provider payouts
          referenceId: provider.id,
          amount,
          merchantId: provider.id, // store provider id in merchantId for finance filter
          status: 'PENDING',
          description: `Payout to ${provider.businessName}`,
          metadata: JSON.stringify({
            providerId: provider.id,
            providerName: provider.businessName,
            providerType: provider.providerType,
            requestedBy: decoded.userId,
            requestedAt: new Date().toISOString(),
            payoutMethod: provider.mobileMoneyProvider || provider.bankName || 'UNSPECIFIED',
            destination:
              provider.mobileMoneyNumber ||
              provider.bankAccountNumber ||
              'UNSPECIFIED',
            kind: 'PHARMACY_PAYOUT',
          }),
        },
      });

      return { updatedProvider, payout };
    });

    return successResponse(
      {
        payoutId: result.payout.id,
        providerId: provider.id,
        providerName: provider.businessName,
        amount,
        status: 'PENDING',
        remainingBalance: toNumber(result.updatedProvider.pendingPayout),
        message: 'Payout request submitted successfully',
      },
      'Payout request submitted successfully'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || 'Validation error');
    }
    console.error('Pharmacy payout error:', error);
    return serverErrorResponse('Failed to process payout request');
  } finally {
    await resetRLSContext();
  }
}

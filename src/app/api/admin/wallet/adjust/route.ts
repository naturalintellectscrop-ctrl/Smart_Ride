import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { createNotification } from '@/lib/services/notification.service';
import { depositToWallet, withdrawFromWallet, getWalletBalance } from '@/lib/wallet/wallet-service';
import { requireAdmin } from '@/lib/auth/guards';
import { z } from 'zod';

const adjustSchema = z.object({
  ownerId: z.string().min(1, 'Owner ID is required'),
  ownerType: z.enum(['USER', 'RIDER', 'MERCHANT', 'PROVIDER']),
  amount: z.number().positive('Amount must be positive'),
  adjustmentType: z.enum(['CREDIT', 'DEBIT']),
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * POST /api/admin/wallet/adjust
 * Admin wallet adjustment — credit or debit a wallet
 * SECURITY: Admin-only access required
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const admin = authResult.user!;

    const body = await request.json();
    const validatedData = adjustSchema.parse(body);

    // Validate that the wallet exists before adjusting
    const wallet = await getWalletBalance(validatedData.ownerId, validatedData.ownerType as any);
    if (!wallet) {
      return errorResponse('Wallet not found for the specified owner');
    }

    let result;

    if (validatedData.adjustmentType === 'CREDIT') {
      result = await depositToWallet({
        ownerId: validatedData.ownerId,
        ownerType: validatedData.ownerType as any,
        amount: validatedData.amount,
        description: `Admin credit: ${validatedData.reason}`,
      });
    } else {
      // DEBIT
      result = await withdrawFromWallet({
        ownerId: validatedData.ownerId,
        ownerType: validatedData.ownerType as any,
        amount: validatedData.amount,
        description: `Admin debit: ${validatedData.reason}`,
      });
    }

    if (!result.success) {
      return errorResponse(result.error || `Wallet ${validatedData.adjustmentType.toLowerCase()} failed`, 400);
    }

    // Resolve the userId for notification — for RIDER/MERCHANT/PROVIDER, find the associated user
    let notifyUserId = validatedData.ownerId;
    if (validatedData.ownerType === 'RIDER') {
      const { db } = await import('@/lib/db');
      const rider = await db.rider.findUnique({ where: { id: validatedData.ownerId }, select: { userId: true } });
      if (rider) notifyUserId = rider.userId;
    } else if (validatedData.ownerType === 'MERCHANT') {
      const { db } = await import('@/lib/db');
      const merchant = await db.merchant.findUnique({ where: { id: validatedData.ownerId }, select: { userId: true } });
      if (merchant?.userId) notifyUserId = merchant.userId;
    } else if (validatedData.ownerType === 'PROVIDER') {
      const { db } = await import('@/lib/db');
      const provider = await db.healthProvider.findUnique({ where: { id: validatedData.ownerId }, select: { userId: true } });
      if (provider?.userId) notifyUserId = provider.userId;
    }

    // Create notification for the wallet owner
    await createNotification({
      userId: notifyUserId,
      title: validatedData.adjustmentType === 'CREDIT' ? 'Wallet Credited' : 'Wallet Debited',
      message: validatedData.adjustmentType === 'CREDIT'
        ? `Your wallet has been credited with UGX ${validatedData.amount.toLocaleString()}. Reason: ${validatedData.reason}`
        : `Your wallet has been debited by UGX ${validatedData.amount.toLocaleString()}. Reason: ${validatedData.reason}`,
      type: 'WALLET',
      referenceId: result.transactionId || '',
      referenceType: 'WALLET',
    });

    // Create audit log with admin identity
    await createAuditLog({
      action: validatedData.adjustmentType === 'CREDIT' ? AuditActions.WALLET_TOPUP : AuditActions.WALLET_WITHDRAWAL,
      entityType: EntityTypes.WALLET,
      entityId: validatedData.ownerId,
      actorType: 'ADMIN',
      actorId: admin.userId,
      userId: validatedData.ownerType === 'USER' ? validatedData.ownerId : undefined,
      description: `Admin ${validatedData.adjustmentType.toLowerCase()} of UGX ${validatedData.amount.toLocaleString()} for ${validatedData.ownerType} ${validatedData.ownerId}. Reason: ${validatedData.reason}`,
      newValues: {
        adjustmentType: validatedData.adjustmentType,
        amount: validatedData.amount,
        ownerType: validatedData.ownerType,
        newBalance: result.newBalance,
      },
      source: 'ADMIN_DASHBOARD',
    });

    return successResponse({
      transactionId: result.transactionId,
      newBalance: result.newBalance,
      adjustmentType: validatedData.adjustmentType,
      amount: validatedData.amount,
    }, `Wallet ${validatedData.adjustmentType.toLowerCase()} successful`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error adjusting wallet:', error);
    return serverErrorResponse('Failed to adjust wallet');
  }
}

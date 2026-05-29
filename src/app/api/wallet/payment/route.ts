import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { payFromWallet, refundToWallet, hasSufficientBalance, getWalletBalance } from '@/lib/wallet/wallet-service';
import { requireAuth } from '@/lib/auth/guards';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const paymentSchema = z.object({
  ownerId: z.string(),
  ownerType: z.enum(['USER', 'RIDER', 'MERCHANT']),
  amount: z.number().positive(),
  referenceId: z.string(),
  referenceType: z.string(),
  description: z.string().optional(),
});

const refundSchema = z.object({
  ownerId: z.string(),
  ownerType: z.enum(['USER', 'RIDER', 'MERCHANT']),
  amount: z.number().positive(),
  referenceId: z.string(),
  referenceType: z.string(),
  description: z.string().optional(),
});

// ============================================
// POST /api/wallet/payment
// ============================================

export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'pay';

    switch (action) {
      case 'pay':
        const paymentData = paymentSchema.parse(body);
        
        // First check if wallet has sufficient balance
        const wallet = await getWalletBalance(paymentData.ownerId, paymentData.ownerType);
        
        if (!wallet) {
          return errorResponse('Wallet not found');
        }
        
        if (wallet.balance < paymentData.amount) {
          return errorResponse(
            `Insufficient wallet balance. Current: ${wallet.balance}, Required: ${paymentData.amount}`
          );
        }
        
        const paymentResult = await payFromWallet(paymentData);
        
        if (!paymentResult.success) {
          return errorResponse(paymentResult.error || 'Payment failed');
        }
        
        return successResponse({
          transactionId: paymentResult.transactionId,
          newBalance: paymentResult.newBalance,
          referenceId: paymentData.referenceId,
        }, 'Payment successful');

      case 'refund':
        const refundData = refundSchema.parse(body);
        const refundResult = await refundToWallet(refundData);
        
        if (!refundResult.success) {
          return errorResponse(refundResult.error || 'Refund failed');
        }
        
        return successResponse({
          transactionId: refundResult.transactionId,
          newBalance: refundResult.newBalance,
          referenceId: refundData.referenceId,
        }, 'Refund successful');

      default:
        return errorResponse('Invalid action. Use ?action=pay or ?action=refund');
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    console.error('Error in wallet payment:', error);
    return serverErrorResponse('Failed to process wallet payment');
  }
}

// ============================================
// GET /api/wallet/payment - Validate payment capability
// ============================================

export async function GET(request: NextRequest) {
  // Require authentication
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const ownerType = searchParams.get('ownerType');
    const amount = parseFloat(searchParams.get('amount') || '0');

    if (!ownerId || !ownerType) {
      return errorResponse('ownerId and ownerType are required');
    }

    if (!['USER', 'RIDER', 'MERCHANT'].includes(ownerType)) {
      return errorResponse('Invalid ownerType');
    }

    if (amount <= 0) {
      return errorResponse('Amount must be positive');
    }

    const wallet = await getWalletBalance(ownerId, ownerType as 'USER' | 'RIDER' | 'MERCHANT');
    const sufficient = await hasSufficientBalance(ownerId, ownerType as 'USER' | 'RIDER' | 'MERCHANT', amount);

    return successResponse({
      canPay: sufficient,
      currentBalance: wallet?.balance || 0,
      pendingBalance: wallet?.pendingBalance || 0,
      requiredAmount: amount,
      shortBy: sufficient ? 0 : amount - (wallet?.balance || 0),
      walletStatus: wallet?.status || 'NOT_FOUND',
    });
  } catch (error) {
    console.error('Error validating wallet payment:', error);
    return serverErrorResponse('Failed to validate wallet payment');
  }
}

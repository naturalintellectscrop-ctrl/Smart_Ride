/**
 * Merchant Verification API
 * POST /api/merchants/verify - Verify (approve/reject) a merchant
 *
 * Note: An admin verify route also exists at /api/admin/merchants/verify.
 * This route provides the same functionality at the merchant API path.
 */

import { NextRequest, NextResponse } from 'next/server';
import { MerchantOnboardingService } from '@/lib/merchant/merchant-onboarding.service';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !['ADMIN', 'SUPER_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { merchantId, action, notes, reason } = body;

    if (!merchantId || !action) {
      return NextResponse.json(
        { error: 'merchantId and action are required' },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    const updatedMerchant = await MerchantOnboardingService.verifyMerchant({
      merchantId,
      adminId: decoded.userId,
      action,
      notes,
      reason,
    });

    return NextResponse.json({
      success: true,
      merchant: updatedMerchant,
      message: `Merchant ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Merchant verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify merchant';
    const status = message.includes('not found') || message.includes('Cannot verify')
      ? 400
      : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

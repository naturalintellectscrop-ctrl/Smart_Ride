/**
 * Merchant Availability API
 * PATCH /api/merchants/[id]/availability - Update merchant availability
 *
 * Body options:
 * - { isOpen: boolean } - Open or close store
 * - { action: 'pause', reason?: string } - Pause merchant (still APPROVED but isOpen=false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { MerchantOnboardingService } from '@/lib/merchant/merchant-onboarding.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { setRLSContext, resetRLSContext } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify authentication
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }

  // Allow merchants to update their own availability, or admins
  const isMerchant = decoded.role === 'MERCHANT';
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(decoded.role);

  if (!isMerchant && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const { id } = await params;
    const body = await request.json();

    let updatedMerchant;

    if (body.action === 'pause') {
      // Pause merchant
      updatedMerchant = await MerchantOnboardingService.pauseMerchant({
        merchantId: id,
        reason: body.reason,
      });
    } else if (typeof body.isOpen === 'boolean') {
      // Toggle open/close
      updatedMerchant = await MerchantOnboardingService.updateMerchantAvailability({
        merchantId: id,
        isOpen: body.isOpen,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid request body. Provide { isOpen: boolean } or { action: "pause", reason?: string }' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      merchant: {
        id: updatedMerchant.id,
        name: updatedMerchant.name,
        status: updatedMerchant.status,
        isOpen: updatedMerchant.isOpen,
      },
    });
  } catch (error: unknown) {
    console.error('Merchant availability error:', error);
    const isClientError = error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot'));
    const status = isClientError ? 400 : 500;
    return NextResponse.json(
      { success: false, error: isClientError ? 'Invalid availability update' : 'An internal error occurred' },
      { status }
    );
  } finally {
    await resetRLSContext();
  }
}

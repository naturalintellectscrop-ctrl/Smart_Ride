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
import { db, setRLSContext, resetRLSContext, setServiceRoleContext } from '@/lib/db';
import { announceMerchantAvailability } from '@/lib/realtime/storefront';

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

  // A pharmacy IS a merchant here — type PHARMACY — but its owner signs in as
  // PHARMACIST, and this gate accepted only MERCHANT. So the OPEN/CLOSED pill
  // on the pharmacist dashboard answered 403 on every tap, which on screen
  // looked like a dead control. Same shape as the role splits already fixed
  // elsewhere: the distinction that matters is provider vs customer, not which
  // kind of shop.
  const isStoreOwner = decoded.role === 'MERCHANT' || decoded.role === 'PHARMACIST';
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(decoded.role);

  if (!isStoreOwner && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const { id } = await params;
    const body = await request.json();

    // And it must be YOUR shop.
    //
    // The role was the only thing checked, so any signed-in merchant could open
    // or close any other merchant's store by putting their id in the URL —
    // closing a competitor mid-service, or reopening a store its owner had
    // deliberately shut. The role said what kind of user you are; nothing said
    // which shop was yours.
    if (!isAdmin) {
      await setServiceRoleContext();
      const own = await db.merchant.findFirst({
        where: { userId: decoded.userId },
        select: { id: true },
      });
      if (!own || own.id !== id) {
        return NextResponse.json(
          { success: false, error: 'That store belongs to another owner' },
          { status: 403 }
        );
      }
    }

    // The service-role context set above is deliberately kept for the update.
    // MerchantOnboardingService re-reads the merchant, and under the owner's own
    // RLS context that read came back empty — so a legitimate owner toggling
    // their own store got "Merchant not found" surfaced as a 400. Elevating is
    // safe here precisely because the block above has already proved this store
    // belongs to the caller; the finally below resets the context either way.
    await setServiceRoleContext();

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

    // Same reason as the pharmacy pill: a shop that closes has to disappear
    // from the customer's list without them doing anything.
    announceMerchantAvailability({
      merchantId: updatedMerchant.id,
      isOpen: updatedMerchant.isOpen,
      name: updatedMerchant.name,
      status: updatedMerchant.status,
    });

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

/**
 * GET /api/merchants/profile
 * Returns the merchant owned by the authenticated user (by userId link).
 * Used by the merchant dashboard to load "my store" + approval status.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const decoded = token ? verifyAccessToken(token) : null;
  if (!decoded?.userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  await setServiceRoleContext();
  try {
    const merchant = await db.merchant.findUnique({
      where: { userId: decoded.userId },
    });

    if (!merchant) {
      // Not an error — the user simply hasn't completed merchant onboarding.
      return NextResponse.json({ success: true, data: null, registered: false });
    }

    // Document has merchantId but Merchant has no inverse relation field, so
    // fetch the docs separately rather than via include.
    const documents = await db.document.findMany({ where: { merchantId: merchant.id } });
    // Pharmacy (only present for type=PHARMACY merchants) carries its own status.
    const pharmacy = await db.pharmacy.findUnique({ where: { merchantId: merchant.id } });

    return NextResponse.json({ success: true, data: { ...merchant, documents, pharmacy }, registered: true });
  } catch (error) {
    console.error('[merchants/profile] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load merchant profile' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

/**
 * Merchant Analytics API
 * GET /api/merchants/[id]/analytics - Get merchant analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { MerchantOnboardingService } from '@/lib/merchant/merchant-onboarding.service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { setRLSContext, resetRLSContext } from '@/lib/db';

export async function GET(
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

  // Allow merchants to view their own analytics, or admins
  const isMerchant = decoded.role === 'MERCHANT';
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role);

  if (!isMerchant && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const { id } = await params;
    const analytics = await MerchantOnboardingService.getMerchantAnalytics(id);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: unknown) {
    console.error('Merchant analytics error:', error);
    const isNotFound = error instanceof Error && error.message.includes('not found');
    const status = isNotFound ? 404 : 500;
    return NextResponse.json(
      { success: false, error: isNotFound ? 'Merchant analytics not found' : 'An internal error occurred' },
      { status }
    );
  } finally {
    await resetRLSContext();
  }
}

/**
 * Merchant Analytics API
 * GET /api/merchants/[id]/analytics - Get merchant analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { MerchantOnboardingService } from '@/lib/merchant/merchant-onboarding.service';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Allow merchants to view their own analytics, or admins
    const isMerchant = decoded.role === 'MERCHANT';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'COMPLIANCE_ADMIN'].includes(decoded.role);

    if (!isMerchant && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const analytics = await MerchantOnboardingService.getMerchantAnalytics(id);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Merchant analytics error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get merchant analytics';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

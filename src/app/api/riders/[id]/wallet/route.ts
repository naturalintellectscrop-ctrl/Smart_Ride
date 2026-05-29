/**
 * Rider Wallet API
 * GET /api/riders/[id]/wallet - Get rider wallet details
 *
 * Returns: wallet balance, pending balance, recent transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { RiderOnboardingService } from '@/lib/rider/rider-onboarding.service';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Allow riders to view their own wallet, or admins
    const { id } = await params;
    const isRider = decoded.role === 'RIDER';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role);

    if (!isRider && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const wallet = await RiderOnboardingService.getRiderWallet(id);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error('Rider wallet error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get rider wallet';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

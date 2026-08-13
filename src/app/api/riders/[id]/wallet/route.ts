/**
 * Rider Wallet API
 * GET /api/riders/[id]/wallet - Get rider wallet details
 *
 * Returns: wallet balance, pending balance, recent transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { RiderOnboardingService } from '@/lib/rider/rider-onboarding.service';
import { verifyAccessToken, isProvider } from '@/lib/auth/jwt';
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

  // Allow riders to view their own wallet, or admins
  const isRider = isProvider(decoded.role);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role);

  if (!isRider && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const { id } = await params;
    const wallet = await RiderOnboardingService.getRiderWallet(id);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error: unknown) {
    console.error('Rider wallet error:', error);
    const isNotFound = error instanceof Error && error.message.includes('not found');
    const status = isNotFound ? 404 : 500;
    return NextResponse.json(
      { success: false, error: isNotFound ? 'Rider wallet not found' : 'An internal error occurred' },
      { status }
    );
  } finally {
    await resetRLSContext();
  }
}

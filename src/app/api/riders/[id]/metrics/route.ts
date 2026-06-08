/**
 * Rider Metrics API
 * GET /api/riders/[id]/metrics - Get rider operational metrics
 *
 * Returns: acceptance rate, cancellation rate, completion rate,
 * average rating, total online hours, trip counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { RiderOnboardingService } from '@/lib/rider/rider-onboarding.service';
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

  // Allow riders to view their own metrics, or admins
  const isRider = decoded.role === 'RIDER';
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(decoded.role);

  if (!isRider && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await setRLSContext(decoded);
  try {
    const { id } = await params;
    const metrics = await RiderOnboardingService.getRiderMetrics(id);

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error: unknown) {
    console.error('Rider metrics error:', error);
    const isNotFound = error instanceof Error && error.message.includes('not found');
    const status = isNotFound ? 404 : 500;
    return NextResponse.json(
      { success: false, error: isNotFound ? 'Rider metrics not found' : 'An internal error occurred' },
      { status }
    );
  } finally {
    await resetRLSContext();
  }
}

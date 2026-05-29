/**
 * Rider Verification API
 * POST /api/riders/[id]/verify - Verify (approve/reject) a rider
 *
 * Body: { action: 'APPROVE'|'REJECT', notes?, reason? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { RiderOnboardingService } from '@/lib/rider/rider-onboarding.service';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { action, notes, reason } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (APPROVE or REJECT)' },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    const updatedRider = await RiderOnboardingService.verifyRider({
      riderId: id,
      adminId: decoded.userId,
      action,
      notes,
      reason,
    });

    return NextResponse.json({
      success: true,
      rider: {
        id: updatedRider.id,
        fullName: updatedRider.fullName,
        status: updatedRider.status,
        verifiedAt: updatedRider.verifiedAt,
        verifiedBy: updatedRider.verifiedBy,
      },
      message: `Rider ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Rider verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify rider';
    const status = message.includes('not found') || message.includes('Cannot verify') ? 400 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

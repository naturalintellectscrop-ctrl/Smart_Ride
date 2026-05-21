// ============================================
// SMART RIDE - DISPATCH REJECT API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/dispatch/[id]/reject - Rider rejects dispatch
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: matchId } = await params;
    const body = await request.json();
    const { reason } = body;
    
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get rider ID from user
    const rider = await db.rider.findFirst({
      where: { userId: user.id },
    });

    if (!rider) {
      return NextResponse.json(
        { success: false, error: 'Rider profile not found' },
        { status: 400 }
      );
    }

    const result = await DispatchService.rejectMatch(matchId, rider.id, reason);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Dispatch rejected, finding another rider',
    });
  } catch (error: any) {
    console.error('Dispatch reject error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

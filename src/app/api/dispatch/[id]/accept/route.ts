// ============================================
// SMART RIDE - DISPATCH ACCEPT API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/dispatch/[id]/accept - Rider accepts dispatch
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: matchId } = await params;
    
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

    const result = await DispatchService.acceptMatch(matchId, rider.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { taskId: result.taskId },
    });
  } catch (error: any) {
    console.error('Dispatch accept error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

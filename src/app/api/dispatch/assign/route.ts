// ============================================
// SMART RIDE - DISPATCH ASSIGN API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService, DispatchRequest } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';

// POST /api/dispatch/assign - Find and assign rider
export async function POST(request: NextRequest) {
  try {
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { taskId, taskType, pickupLatitude, pickupLongitude, excludeRiderIds, priority } = body;

    if (!taskId || !taskType || pickupLatitude === undefined || pickupLongitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: taskId, taskType, pickupLatitude, pickupLongitude' },
        { status: 400 }
      );
    }

    const dispatchRequest: DispatchRequest = {
      taskId,
      taskType,
      pickupLatitude,
      pickupLongitude,
      excludeRiderIds,
      priority,
    };

    const result = await DispatchService.findAndAssign(dispatchRequest);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, noRidersAvailable: result.noRidersAvailable },
        { status: result.noRidersAvailable ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.match,
    });
  } catch (error: any) {
    console.error('Dispatch assign error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

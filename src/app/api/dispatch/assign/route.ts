// ============================================
// SMART RIDE - DISPATCH ASSIGN API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService, DispatchRequest } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

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

    // Create audit log for dispatch assignment
    try {
      await createAuditLog({
        action: AuditActions.DISPATCH_ASSIGNED,
        entityType: EntityTypes.DISPATCH,
        entityId: taskId,
        actorType: 'SYSTEM',
        userId: user.id,
        taskId,
        description: `Dispatch assigned rider for task ${taskId} of type ${taskType}`,
        source: 'SYSTEM',
      });
    } catch (auditError) {
      console.error('Audit log failed for dispatch assignment:', auditError);
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

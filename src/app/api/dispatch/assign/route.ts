// ============================================
// SMART RIDE - DISPATCH ASSIGN API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService, DispatchRequest } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { setRLSContext, resetRLSContext } from '@/lib/db';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { z } from 'zod';

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

    await setRLSContext({ userId: user.userId, role: user.role });

    const body = await request.json();

    const dispatchAssignSchema = z.object({
      taskId: z.string().min(1),
      taskType: z.string().min(1),
      pickupLatitude: z.number().min(-90).max(90),
      pickupLongitude: z.number().min(-180).max(180),
      excludeRiderIds: z.array(z.string()).optional(),
      priority: z.number().int().min(0).max(10).optional(),
    });
    const parsed = dispatchAssignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { taskId, taskType, pickupLatitude, pickupLongitude, excludeRiderIds, priority } = parsed.data;

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
  } catch (error: unknown) {
    console.error('Dispatch assign error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

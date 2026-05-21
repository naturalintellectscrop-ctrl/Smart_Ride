// ============================================
// SMART RIDE - TASK TRANSITION API
// ============================================
// API endpoint for transitioning task states
// with validation, persistence, and audit logging
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TaskStatus } from '@prisma/client';
import { EnhancedTaskStateMachine, TransitionContext } from '@/lib/services/enhanced-task-state-machine.service';
import { authGuard } from '@/lib/auth/guards';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id]/history - Get task state history
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;

    const history = await EnhancedTaskStateMachine.getTaskHistory(taskId);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Get task history error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/transition - Transition task state
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { toStatus, riderId, reason, metadata, latitude, longitude } = body;

    // Validate status
    if (!Object.values(TaskStatus).includes(toStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build transition context
    const context: TransitionContext = {
      userId: user.id,
      riderId,
      triggeredByType: user.role === 'RIDER' ? 'RIDER' : 
                        user.role === 'ADMIN' ? 'ADMIN' : 'CLIENT',
      reason,
      metadata,
      latitude,
      longitude,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    // Execute transition
    const result = await EnhancedTaskStateMachine.transition(
      taskId,
      toStatus as TaskStatus,
      context
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Create audit log for task state transition
    try {
      const taskAuditActionMap: Record<string, string> = {
        ASSIGNED: AuditActions.TASK_ASSIGNED,
        ACCEPTED: AuditActions.TASK_ACCEPTED,
        IN_PROGRESS: AuditActions.TASK_STARTED,
        COMPLETED: AuditActions.TASK_COMPLETED,
        CANCELLED: AuditActions.TASK_CANCELLED,
      };
      const auditAction = taskAuditActionMap[toStatus] || AuditActions.TASK_STARTED;
      const actorType = context.triggeredByType === 'RIDER' ? 'RIDER' as const :
                        context.triggeredByType === 'ADMIN' ? 'ADMIN' as const : 'USER' as const;
      const auditSource = actorType === 'ADMIN' ? 'ADMIN_DASHBOARD' as const :
                          actorType === 'RIDER' ? 'MOBILE_APP' as const : 'MOBILE_APP' as const;
      await createAuditLog({
        action: auditAction,
        entityType: EntityTypes.TASK,
        entityId: taskId,
        actorType,
        actorId: user.id,
        userId: user.id,
        riderId: riderId || undefined,
        taskId,
        description: `Task ${taskId} transitioned to ${toStatus}${reason ? `: ${reason}` : ''}`,
        source: auditSource,
      });
    } catch (auditError) {
      console.error('Audit log failed for task transition:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: {
        task: result.task,
        transition: result.transition,
      },
    });
  } catch (error: any) {
    console.error('Task transition error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

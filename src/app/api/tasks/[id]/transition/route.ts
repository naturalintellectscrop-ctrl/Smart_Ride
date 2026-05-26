// ============================================
// SMART RIDE - TASK TRANSITION API
// ============================================
// API endpoint for transitioning task states
// with validation, persistence, audit logging, and notifications
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TaskStatus } from '@prisma/client';
import { EnhancedTaskStateMachine, TransitionContext } from '@/lib/services/enhanced-task-state-machine.service';
import { authGuard } from '@/lib/auth/guards';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { sendTaskUpdateNotification } from '@/lib/services/notification.service';
import { db } from '@/lib/db';

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

    // Send notifications for important status changes
    try {
      const notificationStatuses = ['ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
      if (notificationStatuses.includes(toStatus) && result.task) {
        const task = result.task;
        // Notify the client (customer)
        if (task.clientId) {
          await sendTaskUpdateNotification(
            task.clientId,
            taskId,
            task.taskNumber || taskId,
            toStatus
          );
        }
        // Notify the rider for certain status changes
        const riderNotificationStatuses = ['ASSIGNED', 'COMPLETED', 'CANCELLED'];
        if (riderNotificationStatuses.includes(toStatus) && task.riderId) {
          // Get rider's userId for notification
          const riderRecord = await db.rider.findUnique({
            where: { id: task.riderId },
            select: { userId: true },
          });
          if (riderRecord?.userId && riderRecord.userId !== task.clientId) {
            await sendTaskUpdateNotification(
              riderRecord.userId,
              taskId,
              task.taskNumber || taskId,
              toStatus
            );
          }
        }

        // Emit real-time socket event for task status change
        // Internal HTTP emit API runs on port 3002 (Socket.io WebSocket is on 3001)
        const socketPort = process.env.SOCKET_PORT || '3002';
        const internalKey = process.env.JWT_SECRET || 'internal';
        await fetch(`http://localhost:${socketPort}/emit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': internalKey,
          },
          body: JSON.stringify({
            room: `task:${taskId}`,
            event: 'task:status:update',
            data: {
              taskId,
              status: toStatus,
              timestamp: new Date().toISOString(),
            },
          }),
        }).catch(() => {}); // Non-blocking
      }
    } catch (notificationError) {
      console.error('Notification failed for task transition (non-blocking):', notificationError);
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

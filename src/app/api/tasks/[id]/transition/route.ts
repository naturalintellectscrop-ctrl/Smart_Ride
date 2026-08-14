// ============================================
import { requireAuth, isAdmin } from '@/lib/auth/guards';
// SMART RIDE - TASK TRANSITION API
// ============================================
// API endpoint for transitioning task states
// with validation, persistence, audit logging, and notifications
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { isProvider } from '@/lib/auth/jwt';
import type { UserRole } from '@prisma/client';
import { TaskStatus } from '@prisma/client';
import { EnhancedTaskStateMachine, TransitionContext } from '@/lib/services/enhanced-task-state-machine.service';
import { authGuard } from '@/lib/auth/guards';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { sendTaskUpdateNotification } from '@/lib/services/notification.service';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { canCompleteDelivery } from '@/lib/delivery/delivery-service';
import { broadcastToTask } from '@/lib/realtime-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id]/history - Get task state history
export async function GET(request: NextRequest, { params }: RouteParams) {
  // SECURITY: this returns the full state history of any task to anyone who
  // knows its id — every transition, who triggered it and when. Restricted to
  // the two parties on the task, plus admins.
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const { id: taskId } = await params;

    if (!isAdmin(auth.user.role)) {
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { clientId: true, rider: { select: { userId: true } } },
      });
      if (!task) {
        return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      }
      const isParty =
        task.clientId === auth.user.userId || task.rider?.userId === auth.user.userId;
      if (!isParty) {
        return NextResponse.json(
          { success: false, error: 'Not authorized to view this task' },
          { status: 403 }
        );
      }
    }

    const history = await EnhancedTaskStateMachine.getTaskHistory(taskId);

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error: unknown) {
    console.error('Get task history error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
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

    // Run as service role: task/rider reads happen with the app enforcing
    // authorization below. Under user-scoped RLS the assigned RIDER cannot
    // SELECT their own task (policy keys on clientId), so the read returned
    // "Task not found" and no driver could progress a trip. Mirrors the
    // service-role pattern used by POST /tasks/[id] and the dispatch routes.
    await setServiceRoleContext();

    // SECURITY: Ownership validation - verify user is authorized to transition this task
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { clientId: true, riderId: true, status: true },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Determine user's rider ID (if applicable).
    // NOTE: authGuard returns `userId` (JWTPayload), not `id`.
    // isProvider, not === 'RIDER': a DRIVER (the app's "Smart Car" signup)
    // never had a rider profile looked up here, so isAssignedRider was always
    // false and a driver could not progress ANY task they had been assigned —
    // every transition returned "Not authorized to transition this task" on
    // their own job.
    const userRider = isProvider(user.role as UserRole)
      ? await db.rider.findFirst({ where: { userId: user.userId }, select: { id: true } })
      : null;

    // Check authorization: user must be the client, the assigned rider, or an admin
    const isClient = task.clientId === user.userId;
    const isAssignedRider = userRider && task.riderId === userRider.id;
    const userIsAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ||
                        user.role === 'OPERATIONS_ADMIN' || user.role === 'COMPLIANCE_ADMIN' ||
                        user.role === 'FINANCE_ADMIN';

    if (!isClient && !isAssignedRider && !userIsAdmin) {
      // Audit unauthorized transition attempt
      try {
        await createAuditLog({
          action: AuditActions.TASK_CANCELLED, // Closest action for unauthorized access
          entityType: EntityTypes.TASK,
          entityId: taskId,
          actorType: isProvider(user.role as UserRole) ? 'RIDER' : user.role === 'ADMIN' ? 'ADMIN' : 'USER',
          actorId: user.userId,
          userId: user.userId,
          taskId,
          description: `UNAUTHORIZED: User ${user.userId} (role: ${user.role}) attempted to transition task ${taskId} to ${toStatus}`,
          source: 'API',
        });
      } catch {}

      return NextResponse.json(
        { success: false, error: 'Not authorized to transition this task' },
        { status: 403 }
      );
    }

    // Role-based transition restrictions:
    // - Clients can only cancel
    // - Riders can only update status for their assigned tasks (ARRIVED, PICKED_UP, etc.)
    // - Admins can perform any transition
    if (isClient && !userIsAdmin) {
      // Clients can only cancel their own tasks
      const clientAllowedTransitions: TaskStatus[] = [TaskStatus.CANCELLED];
      if (!clientAllowedTransitions.includes(toStatus as TaskStatus)) {
        return NextResponse.json(
          { success: false, error: 'Clients can only cancel tasks' },
          { status: 403 }
        );
      }
    }

    // BUSINESS RULE: a ride cannot be cancelled once it is in transit.
    // Blocks both client and rider self-cancellation when the passenger is
    // aboard / the item is in custody (PICKED_UP, IN_TRANSIT, IN_PROGRESS);
    // only an admin may override. Mirrors the guard in the cancel handler of
    // PATCH /api/tasks/[id] so every cancel path is covered.
    if (toStatus === TaskStatus.CANCELLED && !userIsAdmin) {
      const inTransit: TaskStatus[] = [
        TaskStatus.PICKED_UP,
        TaskStatus.IN_TRANSIT,
        TaskStatus.IN_PROGRESS,
      ];
      if (inTransit.includes(task.status as TaskStatus)) {
        return NextResponse.json(
          { success: false, error: 'This ride is already in transit and can no longer be cancelled.' },
          { status: 409 }
        );
      }
    }

    // Build transition context.
    // Map all admin-tier roles (SUPER_ADMIN, OPERATIONS_ADMIN, COMPLIANCE_ADMIN,
    // FINANCE_ADMIN, ADMIN) to triggeredByType='ADMIN' so the state machine's
    // role checks accept them. Previously only 'ADMIN' was mapped, which left
    // SUPER_ADMIN/OPERATIONS_ADMIN/COMPLIANCE_ADMIN/FINANCE_ADMIN falling through
    // to 'CLIENT' — the state machine then rejected their transitions.
    const ADMIN_TIER_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];
    const triggeredByType: 'RIDER' | 'ADMIN' | 'CLIENT' =
      isProvider(user.role as UserRole) ? 'RIDER' :
      ADMIN_TIER_ROLES.includes(user.role) ? 'ADMIN' :
      'CLIENT';

    const context: TransitionContext = {
      userId: user.userId,
      riderId,
      triggeredByType,
      reason,
      metadata,
      latitude,
      longitude,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    // A delivery cannot complete without proof (BE-005).
    //
    // This gate already existed on /tasks/[id]/status — but the MOBILE APP
    // calls /tasks/[id]/transition, so the only path a real courier uses was
    // the one path that did not check. Gating one of two routes to the same
    // state machine is not a gate.
    //
    // Admins may override: a genuine delivery whose photo upload failed still
    // has to be closable by a human.
    if (
      (toStatus === TaskStatus.DELIVERED || toStatus === TaskStatus.COMPLETED) &&
      !userIsAdmin
    ) {
      const gate = await canCompleteDelivery(taskId);
      if (!gate.allowed) {
        return NextResponse.json(
          { success: false, error: gate.reason, code: 'PROOF_REQUIRED' },
          { status: 409 }
        );
      }
    }

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
        actorId: user.userId,
        userId: user.userId,
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
      const notificationStatuses = [
        'SEARCHING', 'MATCHING', 'ASSIGNED', 'REASSIGNED', 'ACCEPTED', 'ARRIVING',
        'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'IN_TRANSIT', 'DELIVERED',
        'COMPLETED', 'CANCELLED', 'FAILED',
      ];
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
        const riderNotificationStatuses = ['ASSIGNED', 'REASSIGNED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED'];
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

        // Emit real-time event via Supabase broadcast for task status change
        try {
          await broadcastToTask(taskId, 'task:status:update', {
            taskId,
            status: toStatus,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Non-blocking: broadcast failure shouldn't fail the transition
        }
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
  } catch (error: unknown) {
    console.error('Task transition error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

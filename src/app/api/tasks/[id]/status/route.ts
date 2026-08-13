// ============================================
// SMART RIDE - TASK STATUS UPDATE API
// ============================================
// Simplified status transition endpoint.
// Alias for /tasks/[id]/transition but with a
// simpler request body: { status, riderId, reason?, metadata? }
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TaskStatus } from '@prisma/client';
import { EnhancedTaskStateMachine } from '@/lib/services/enhanced-task-state-machine.service';
import { requireAuthWithRLS } from '@/lib/auth/guards';
import { db, resetRLSContext, setServiceRoleContext } from '@/lib/db';
import { canCompleteDelivery } from '@/lib/delivery/delivery-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/tasks/[id]/status - Update task status (simplified transition)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuthWithRLS(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }

  const user = authResult.user;

  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { status, riderId, reason, metadata } = body;

    // Validate status
    if (!status || !Object.values(TaskStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status is required' },
        { status: 400 }
      );
    }

    // Determine the actor type based on user role
    const triggeredByType = user.role === 'RIDER' ? 'RIDER' as const :
                            user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'ADMIN' as const :
                            'CLIENT' as const;

    // Resolve rider ID. SECURITY: for a RIDER actor this MUST come from their
    // own token, never the request body — otherwise a rider could pass another
    // rider's id and pass the ownership check below on someone else's task.
    let effectiveRiderId: string | undefined = triggeredByType === 'RIDER' ? undefined : riderId;
    if (triggeredByType === 'RIDER') {
      const rider = await db.rider.findFirst({
        where: { userId: user.userId },
        select: { id: true },
      });
      effectiveRiderId = rider?.id;
    }

    // Task status transitions are a SYSTEM operation: the state machine writes
    // the client's Task row on behalf of a rider action, and rider-scoped RLS
    // cannot see or update a task it doesn't own (there is no rider read/update
    // policy on Task). Elevate to service role so the lookup + SM writes work,
    // then enforce ownership explicitly below. Mirrors DispatchService.acceptMatch.
    await setServiceRoleContext();

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, clientId: true, riderId: true },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // IDOR guard: only the owning client, the assigned rider, or an admin may
    // transition this task. Without this, elevation would let any authenticated
    // user drive any task's state machine.
    const isOwningClient = triggeredByType === 'CLIENT' && task.clientId === user.userId;
    const isAssignedRider = triggeredByType === 'RIDER' && !!effectiveRiderId && task.riderId === effectiveRiderId;
    const isAdmin = triggeredByType === 'ADMIN';
    if (!isOwningClient && !isAssignedRider && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to transition this task' },
        { status: 403 }
      );
    }

    // A delivery cannot complete without proof (BE-005). Enforced here rather
    // than in the client, because if completion were still possible without
    // proof then capturing it would be optional in practice — and the
    // deliveries missing proof would be exactly the disputed ones.
    // Admins may override: a genuine delivery whose photo upload failed still
    // has to be closable by a human.
    if (
      (status === TaskStatus.DELIVERED || status === TaskStatus.COMPLETED) &&
      !isAdmin
    ) {
      const gate = await canCompleteDelivery(taskId);
      if (!gate.allowed) {
        return NextResponse.json(
          { success: false, error: gate.reason, code: 'PROOF_REQUIRED' },
          { status: 409 }
        );
      }
    }

    // Execute transition via state machine
    const result = await EnhancedTaskStateMachine.transition(taskId, status as TaskStatus, {
      triggeredByType,
      riderId: effectiveRiderId,
      userId: user.userId,
      reason,
      metadata,
      ipAddress: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Fetch the updated task
    const updatedTask = await db.task.findUnique({
      where: { id: taskId },
      include: {
        rider: {
          select: {
            id: true,
            fullName: true,
            rating: true,
            totalTrips: true,
            riderRole: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (error: unknown) {
    console.error('Task status update error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

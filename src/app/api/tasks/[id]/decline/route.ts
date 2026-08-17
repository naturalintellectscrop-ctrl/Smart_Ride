// ============================================
// SMART RIDE - TASK DECLINE API
// ============================================
// Rider declines a task. Transitions task back
// to MATCHING or SEARCHING so other riders can pick it up.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TaskStatus } from '@prisma/client';
import { EnhancedTaskStateMachine } from '@/lib/services/enhanced-task-state-machine.service';
import { requireAuthWithRLS } from '@/lib/auth/guards';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { isProvider } from '@/lib/auth/jwt';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/tasks/[id]/decline - Rider declines a task
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuthWithRLS(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }

  const user = authResult.user;

  // Only riders can decline tasks
  if (!isProvider(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Only providers can decline tasks' },
      { status: 403 }
    );
  }

  try {
    const { id: taskId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Find the rider profile
    const rider = await db.rider.findFirst({
      where: { userId: user.userId },
      select: { id: true },
    });

    if (!rider) {
      return NextResponse.json(
        { success: false, error: 'Rider profile not found' },
        { status: 404 }
      );
    }

    // Task carries no rider SELECT policy — only users_read_own_tasks
    // (clientId = me), admin_read and service_role_access. Under the caller's
    // own RLS context this lookup returned NOTHING for the assigned rider, so
    // every decline answered 404 "Task not found" and a driver could not
    // release a job they had been given. Same fix as /tasks/[id]/accept and
    // /tasks/available; this route was missed when those were repaired.
    //
    // Ownership is asserted explicitly below, because service role sees every
    // task and the handler previously had no owner check at all.
    await setServiceRoleContext();

    // Find the task to determine current status
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, riderId: true },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // A rider may only decline a task that is actually theirs. Checked after
    // the lookup, against the stored row — never against a body-supplied id.
    if (task.riderId && task.riderId !== rider.id) {
      return NextResponse.json(
        { success: false, error: 'This task is not assigned to you' },
        { status: 403 }
      );
    }

    // Determine the target status: transition back to MATCHING or SEARCHING
    // If the task was ASSIGNED, we go to SEARCHING to find another rider
    // If the task was already in MATCHING, keep it in MATCHING
    let targetStatus: TaskStatus;

    if (task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.ACCEPTED) {
      // Task was assigned/accepted by this rider — put it back to searching
      targetStatus = TaskStatus.SEARCHING;
    } else if (task.status === TaskStatus.MATCHING || task.status === TaskStatus.SEARCHING) {
      // Task is already in dispatch — keep it there
      targetStatus = task.status;
    } else {
      return NextResponse.json(
        { success: false, error: `Cannot decline task in ${task.status} status` },
        { status: 400 }
      );
    }

    // Only proceed if the transition is needed
    if (task.status !== targetStatus) {
      // ORDER MATTERS. The state machine releases the rider by reading
      // `task.riderId` as previousRiderId and clearing their currentTaskId on
      // an active -> dispatch transition. Nulling riderId FIRST (as this route
      // used to) made previousRiderId null, so that branch never ran: the
      // declining driver stayed pinned to the task they had just refused, and
      // `getEligibleRiders` filters on currentTaskId = null — so they went
      // invisible to dispatch and were offered nothing further.
      //
      // Transition first, so the rider is released; clear the assignment after.
      const result = await EnhancedTaskStateMachine.transition(taskId, targetStatus, {
        triggeredByType: 'RIDER',
        riderId: rider.id,
        userId: user.userId,
        reason: reason || 'Rider declined the task',
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      // Now detach the task from the rider who refused it, so dispatch offers
      // it onward rather than back to them.
      await db.task.update({
        where: { id: taskId },
        data: { riderId: null },
      });
    }

    return NextResponse.json({
      success: true,
      data: { taskId, status: targetStatus },
    });
  } catch (error: unknown) {
    console.error('Task decline error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

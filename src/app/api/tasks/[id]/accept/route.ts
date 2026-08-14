// ============================================
// SMART RIDE - TASK ACCEPT API
// ============================================
// Rider accepts a task. Transitions task to ACCEPTED
// and assigns the rider to the task.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedTaskStateMachine } from '@/lib/services/enhanced-task-state-machine.service';
import { requireAuthWithRLS } from '@/lib/auth/guards';
import { db, resetRLSContext, setServiceRoleContext } from '@/lib/db';
import { claimTask, releaseClaim } from '@/lib/delivery/delivery-service';
import { isProvider } from '@/lib/auth/jwt';
import { TaskStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/tasks/[id]/accept - Rider accepts a task
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuthWithRLS(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }

  const user = authResult.user;

  // Only riders can accept tasks
  if (!isProvider(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Only providers can accept tasks' },
      { status: 403 }
    );
  }

  // Accepting an offer is a system read, not an ownership read.
  //
  // requireAuthWithRLS leaves the caller's own RLS context in place, and Task
  // carries no rider SELECT policy — only users_read_own_tasks (clientId = me)
  // and admin_read. A provider is not the client, so the task they were just
  // offered is invisible to them: findUnique returned null and this route
  // answered "Task not found" for every accept, by every provider, always.
  // Measured against the live database — the same row is NULL under a rider's
  // context and VISIBLE under the client's.
  //
  // Elevating changes no access: the handler already refuses non-providers
  // above, and the claim below is a conditional UPDATE that only succeeds if
  // the task is genuinely unclaimed, so the authorization lives in the write
  // rather than in what the reader happens to be able to see.
  await setServiceRoleContext();

  try {
    const { id: taskId } = await params;

    // Find the rider profile
    const rider = await db.rider.findFirst({
      where: { userId: user.userId },
      select: { id: true, status: true },
    });

    if (!rider) {
      return NextResponse.json(
        { success: false, error: 'Rider profile not found' },
        { status: 404 }
      );
    }

    if (rider.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Rider account not approved' },
        { status: 403 }
      );
    }

    // Find the task
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

    // Claim the task BEFORE transitioning it.
    //
    // This route used to read the task, then let the state machine write its
    // own riderId unconditionally — a read-then-write, so two providers
    // accepting the same offer within the dispatch window both passed the
    // check and both wrote. The second silently won and the first spent the
    // trip believing they held a job that had been reassigned under them
    // (BE-005). The claim is now one conditional UPDATE, so the loser is told.
    const claim = await claimTask(taskId, rider.id);
    if (!claim.success) {
      return NextResponse.json(
        { success: false, error: claim.error },
        { status: 409 }
      );
    }

    // A task can arrive here two ways, and only one of them was handled.
    //
    // PUSH: dispatch offers the job to a chosen provider and moves it to
    // ASSIGNED itself, so this route only had to make the final
    // ASSIGNED -> ACCEPTED hop. That is the path the device QA exercised.
    //
    // PULL: a provider takes an unclaimed job from /tasks/available, where it
    // is still MATCHING or SEARCHING. The lifecycle requires
    // MATCHING -> ASSIGNED -> ACCEPTED, so jumping straight to ACCEPTED was
    // rejected as an invalid transition and NOTHING on the open-market list
    // could ever be accepted — the endpoint returned jobs that could not be
    // taken.
    //
    // The claim above has already set riderId, which is exactly the field the
    // ASSIGNED transition requires, so the missing hop can simply be made.
    const preAssignment: TaskStatus[] = [
      TaskStatus.CREATED,
      TaskStatus.REQUESTED,
      TaskStatus.MATCHING,
      TaskStatus.SEARCHING,
    ];
    if (preAssignment.includes(task.status)) {
      const assign = await EnhancedTaskStateMachine.transition(taskId, 'ASSIGNED', {
        triggeredByType: 'RIDER',
        riderId: rider.id,
        userId: user.userId,
      });
      if (!assign.success) {
        if (claim.claimed) await releaseClaim(taskId, rider.id);
        return NextResponse.json({ success: false, error: assign.error }, { status: 400 });
      }
    }

    // Use the state machine to transition to ACCEPTED
    const result = await EnhancedTaskStateMachine.transition(taskId, 'ACCEPTED', {
      triggeredByType: 'RIDER',
      riderId: rider.id,
      userId: user.userId,
    });

    if (!result.success) {
      // The claim succeeded but the transition did not. Releasing it puts the
      // job back in the pool instead of stranding it against a provider who
      // never actually accepted it.
      if (claim.claimed) await releaseClaim(taskId, rider.id);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // The claim above already set riderId atomically; no second write is
    // needed, and an unconditional one here would reintroduce the race.

    // Fetch the updated task with rider relation
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
    console.error('Task accept error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

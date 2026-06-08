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
import { db, resetRLSContext } from '@/lib/db';

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
  if (user.role !== 'RIDER') {
    return NextResponse.json(
      { success: false, error: 'Only riders can decline tasks' },
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
      // Clear the rider assignment and transition back
      await db.task.update({
        where: { id: taskId },
        data: { riderId: null },
      });

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

// ============================================
// SMART RIDE - TASK ACCEPT API
// ============================================
// Rider accepts a task. Transitions task to ACCEPTED
// and assigns the rider to the task.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedTaskStateMachine } from '@/lib/services/enhanced-task-state-machine.service';
import { requireAuthWithRLS } from '@/lib/auth/guards';
import { db, resetRLSContext } from '@/lib/db';

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
  if (user.role !== 'RIDER') {
    return NextResponse.json(
      { success: false, error: 'Only riders can accept tasks' },
      { status: 403 }
    );
  }

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

    // Use the state machine to transition to ACCEPTED
    const result = await EnhancedTaskStateMachine.transition(taskId, 'ACCEPTED', {
      triggeredByType: 'RIDER',
      riderId: rider.id,
      userId: user.userId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Also update the task's riderId if the state machine didn't already set it
    // (the state machine sets riderId in context, but let's ensure it's set)
    if (task.riderId !== rider.id) {
      await db.task.update({
        where: { id: taskId },
        data: { riderId: rider.id },
      });
    }

    // Fetch the updated task with rider relation
    const updatedTask = await db.task.findUnique({
      where: { id: taskId },
      include: {
        rider: {
          select: {
            id: true,
            fullName: true,
            phone: true,
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

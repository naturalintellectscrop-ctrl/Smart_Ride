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
import { db, resetRLSContext } from '@/lib/db';

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

    // Determine the actor type based on user role
    const triggeredByType = user.role === 'RIDER' ? 'RIDER' as const :
                            user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'ADMIN' as const :
                            'CLIENT' as const;

    // Resolve rider ID: if user is a rider, find their rider profile
    let effectiveRiderId = riderId;
    if (user.role === 'RIDER' && !effectiveRiderId) {
      const rider = await db.rider.findFirst({
        where: { userId: user.userId },
        select: { id: true },
      });
      if (rider) {
        effectiveRiderId = rider.id;
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
    console.error('Task status update error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

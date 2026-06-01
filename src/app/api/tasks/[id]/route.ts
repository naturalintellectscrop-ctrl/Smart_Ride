import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@prisma/client';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { isValidTransition, canRiderPerformTask, EnhancedTaskStateMachine } from '@/lib/services/enhanced-task-state-machine.service';
import { z } from 'zod';
import { requireAuth, isAdmin, AuthenticatedRequest } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]
 * Get a specific task by ID
 * SECURITY: Requires authentication and ownership verification (IDOR protection)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // SECURITY: Require authentication
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const user = authResult.user!;

    const { id } = await params;
    const task = await db.task.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, phone: true, email: true },
        },
        rider: {
          select: { 
            id: true, 
            fullName: true, 
            phone: true, 
            riderRole: true,
            currentLatitude: true,
            currentLongitude: true,
          },
        },
        order: {
          include: {
            merchant: true,
            items: true,
          },
        },
        payment: true,
        rating: true,
      },
    });

    if (!task) {
      return notFoundResponse('Task');
    }

    // SECURITY: IDOR protection - verify ownership
    if (!isAdmin(user.role)) {
      const isClient = task.clientId === user.userId;
      let isRider = false;
      
      if (user.role === 'RIDER') {
        const rider = await db.rider.findUnique({
          where: { userId: user.userId },
          select: { id: true },
        });
        isRider = rider?.id === task.riderId;
      }

      if (!isClient && !isRider) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this task' },
          { status: 403 }
        );
      }
    }

    return successResponse(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return serverErrorResponse('Failed to fetch task');
  }
}

// Schema for rider accepting task
const acceptSchema = z.object({
  riderId: z.string(),
});

/**
 * POST /api/tasks/[id]/accept
 * Rider accepts a task assignment
 * SECURITY: Requires authentication, rider must be the authenticated user
 *
 * Phase 2: Status transition delegated to EnhancedTaskStateMachine.
 * SM handles: status update, acceptedAt, riderId, transition record,
 * audit log, currentTaskId, notifications, socket events.
 */
async function handleAccept(taskId: string, body: Record<string, unknown>, user: { userId: string; role: string }) {
  const validatedData = acceptSchema.parse(body);
  
  // SECURITY: Verify rider is the authenticated user
  const rider = await db.rider.findUnique({
    where: { id: validatedData.riderId },
  });

  if (!rider || rider.status !== 'APPROVED') {
    return errorResponse('Invalid or unapproved rider');
  }

  // SECURITY: IDOR protection - rider must be the authenticated user (or admin)
  if (!isAdmin(user.role as any)) {
    if (rider.userId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot accept tasks for other riders' },
        { status: 403 }
      );
    }
  }
  
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { rider: true },
  });

  if (!task) {
    return notFoundResponse('Task');
  }

  // Pre-check for better error message (SM also validates)
  if (!isValidTransition(task.status, TaskStatus.ACCEPTED)) {
    return errorResponse(`Cannot accept task in ${task.status} status`);
  }

  if (!canRiderPerformTask(rider.riderRole, task.taskType)) {
    return errorResponse('Rider cannot perform this task type');
  }

  // ── Delegate to state machine ──────────────────────────────
  // SM handles: status → ACCEPTED, acceptedAt, riderId,
  // transition record, audit log, currentTaskId, notifications, socket events
  const result = await EnhancedTaskStateMachine.riderAccept(taskId, validatedData.riderId, {
    userId: user.userId,
  });

  if (!result.success) {
    return errorResponse(result.error || 'Failed to accept task');
  }

  return successResponse(result.task, 'Task accepted');
}

// Schema for starting task
const startSchema = z.object({
  riderId: z.string(),
});

/**
 * Rider starts a task (IN_PROGRESS).
 *
 * Phase 2: Status transition delegated to EnhancedTaskStateMachine.
 * SM handles: status update, inProgressAt, transition record, audit log,
 * currentTaskId management, notifications, socket events.
 * Route retains: pickedUpAt update (business logic not in SM).
 */
async function handleStart(taskId: string, body: Record<string, unknown>, user: { userId: string; role: string }) {
  const validatedData = startSchema.parse(body);
  
  const task = await db.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return notFoundResponse('Task');
  }

  // SECURITY: IDOR protection - only assigned rider can start
  if (!isAdmin(user.role as any)) {
    const rider = await db.rider.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!rider || task.riderId !== rider.id) {
      return NextResponse.json(
        { success: false, error: 'Only the assigned rider can start this task' },
        { status: 403 }
      );
    }
  }

  // Pre-check for better error message (SM also validates)
  if (!isValidTransition(task.status, 'IN_PROGRESS')) {
    return errorResponse(`Cannot start task in ${task.status} status`);
  }

  // ── Delegate to state machine ──────────────────────────────
  // SM handles: status → IN_PROGRESS, inProgressAt, transition record,
  // audit log, currentTaskId, analytics, notifications, socket events
  const result = await EnhancedTaskStateMachine.startTrip(taskId, validatedData.riderId as string, {
    userId: user.userId,
  });

  if (!result.success) {
    return errorResponse(result.error || 'Failed to start task');
  }

  // Route-specific business logic: set pickedUpAt (not handled by SM)
  try {
    await db.task.update({
      where: { id: taskId },
      data: { pickedUpAt: new Date() },
    });
  } catch (err) {
    console.error('[Task Start] Failed to set pickedUpAt:', err);
    // Non-critical: task is already IN_PROGRESS
  }

  return successResponse(result.task, 'Task started');
}

// Schema for completing task
const completeSchema = z.object({
  riderId: z.string(),
  actualDuration: z.number().optional(),
});

/**
 * Rider completes a task.
 *
 * Phase 2: Status transition delegated to EnhancedTaskStateMachine.
 * SM handles: status update, completedAt, transition record, audit log,
 * currentTaskId clear, analytics, finance ledger, notifications, socket events.
 * Route retains: actualDuration update, rider stats update, payment response formatting.
 */
async function handleComplete(taskId: string, body: Record<string, unknown>, user: { userId: string; role: string }) {
  const validatedData = completeSchema.parse(body);
  
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      payment: true,
      client: {
        select: { id: true, name: true, phone: true, email: true },
      },
      rider: {
        select: { id: true, fullName: true, phone: true },
      },
    },
  });

  if (!task) {
    return notFoundResponse('Task');
  }

  // SECURITY: IDOR protection - only assigned rider can complete
  if (!isAdmin(user.role as any)) {
    const rider = await db.rider.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!rider || task.riderId !== rider.id) {
      return NextResponse.json(
        { success: false, error: 'Only the assigned rider can complete this task' },
        { status: 403 }
      );
    }
  }

  // Pre-check for better error message (SM also validates)
  if (!isValidTransition(task.status, 'COMPLETED')) {
    return errorResponse(`Cannot complete task in ${task.status} status`);
  }

  // ── Delegate to state machine ──────────────────────────────
  // SM handles: status → COMPLETED, completedAt, transition record, audit log,
  // currentTaskId clear, analytics, finance ledger, notifications, socket events
  const result = await EnhancedTaskStateMachine.completeTask(taskId, validatedData.riderId as string, {
    userId: user.userId,
  });

  if (!result.success) {
    return errorResponse(result.error || 'Failed to complete task');
  }

  // ── Route-specific post-transition logic ──────────────────────
  // These are business operations NOT handled by the state machine:
  // 1. actualDuration (optional field specific to this route)
  // 2. Rider stats increment (completedTrips, totalTrips, totalEarnings)
  // 3. Payment details response formatting

  // Update actualDuration if provided
  if (validatedData.actualDuration !== undefined) {
    try {
      await db.task.update({
        where: { id: taskId },
        data: { actualDuration: validatedData.actualDuration },
      });
    } catch (err) {
      console.error('[Task Complete] Failed to set actualDuration:', err);
    }
  }

  // Update rider stats
  if (task.riderId) {
    try {
      await db.rider.update({
        where: { id: task.riderId },
        data: {
          completedTrips: { increment: 1 },
          totalTrips: { increment: 1 },
          totalEarnings: { increment: task.riderEarnings || 0 },
        },
      });
    } catch (err) {
      console.error('[Task Complete] Failed to update rider stats:', err);
    }
  }

  // Fetch the updated task with relations for the response
  const updatedTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      payment: true,
      client: {
        select: { id: true, name: true, phone: true, email: true },
      },
      rider: {
        select: { id: true, fullName: true, phone: true },
      },
    },
  });

  // Return payment details for frontend to display
  return successResponse({
    ...updatedTask,
    paymentDetails: {
      fare: task.totalAmount,
      currency: 'UGX',
      paymentMethod: task.paymentMethod || 'CASH',
      paymentStatus: task.payment?.status || 'PENDING',
      riderEarnings: task.riderEarnings,
    },
  }, 'Task completed');
}

// Schema for cancelling task
const cancelSchema = z.object({
  cancelledBy: z.string(),
  reasonCode: z.string(),
  reason: z.string().optional(),
});

/**
 * Cancel a task (client or rider).
 *
 * Phase 2: Status transition delegated to EnhancedTaskStateMachine.
 * SM handles: status update, cancelledAt, transition record, audit log,
 * currentTaskId clear, analytics, finance ledger, notifications, socket events.
 * Route retains: cancelledBy/cancellationCode/cancellationReason task fields,
 * rider stats update.
 */
async function handleCancel(taskId: string, body: Record<string, unknown>, user: { userId: string; role: string }) {
  const validatedData = cancelSchema.parse(body);
  
  const task = await db.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return notFoundResponse('Task');
  }

  // SECURITY: IDOR protection - only client or assigned rider can cancel
  if (!isAdmin(user.role as any)) {
    const isClient = task.clientId === user.userId;
    let isRider = false;
    
    if (user.role === 'RIDER') {
      const rider = await db.rider.findUnique({
        where: { userId: user.userId },
        select: { id: true },
      });
      isRider = rider?.id === task.riderId;
    }

    if (!isClient && !isRider) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to cancel this task' },
        { status: 403 }
      );
    }
  }

  // Pre-check for better error message (SM also validates)
  if (!isValidTransition(task.status, 'CANCELLED')) {
    return errorResponse(`Cannot cancel task in ${task.status} status`);
  }

  // Determine actor type for SM validation
  const cancelledByStr = validatedData.cancelledBy as string;
  let triggeredByType: 'CLIENT' | 'RIDER' | 'SYSTEM' | 'ADMIN';
  if (isAdmin(user.role as any)) {
    triggeredByType = 'ADMIN';
  } else if (cancelledByStr.includes('rider')) {
    triggeredByType = 'RIDER';
  } else if (cancelledByStr.includes('client')) {
    triggeredByType = 'CLIENT';
  } else {
    triggeredByType = 'SYSTEM';
  }

  const reasonStr = (validatedData.reason || validatedData.reasonCode) as string;

  // ── Delegate to state machine ──────────────────────────────
  // SM handles: status → CANCELLED, cancelledAt, transition record, audit log,
  // currentTaskId clear, analytics, finance ledger, notifications, socket events
  const result = await EnhancedTaskStateMachine.cancelTask(
    taskId,
    user.userId,
    reasonStr,
    {
      triggeredByType,
      metadata: {
        cancelledBy: cancelledByStr,
        cancellationCode: validatedData.reasonCode,
      },
    }
  );

  if (!result.success) {
    return errorResponse(result.error || 'Failed to cancel task');
  }

  // ── Route-specific post-transition logic ──────────────────────
  // These are business operations NOT handled by the state machine:
  // 1. Task-level cancellation fields (cancelledBy, cancellationCode, cancellationReason)
  // 2. Rider stats increment (cancelledTrips, totalTrips)

  // Update cancellation fields on the task record
  try {
    await db.task.update({
      where: { id: taskId },
      data: {
        cancelledBy: cancelledByStr,
        cancellationCode: validatedData.reasonCode,
        cancellationReason: validatedData.reason || validatedData.reasonCode,
      },
    });
  } catch (err) {
    console.error('[Task Cancel] Failed to update cancellation fields:', err);
  }

  // Update rider stats if was assigned
  if (task.riderId) {
    try {
      await db.rider.update({
        where: { id: task.riderId },
        data: {
          cancelledTrips: { increment: 1 },
          totalTrips: { increment: 1 },
        },
      });
    } catch (err) {
      console.error('[Task Cancel] Failed to update rider stats:', err);
    }
  }

  // Fetch the updated task for the response
  const updatedTask = await db.task.findUnique({
    where: { id: taskId },
  });

  return successResponse(updatedTask, 'Task cancelled');
}

/**
 * POST /api/tasks/[id]
 * Action dispatcher: routes to the appropriate handler based on ?action= query param.
 * SECURITY: Requires authentication for all actions.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // SECURITY: Require authentication
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const user = authResult.user!;

    const { id } = await params;
    const body = await request.json();
    
    // Check if this is an accept action
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'accept') {
      return handleAccept(id, body, user);
    } else if (action === 'start') {
      return handleStart(id, body, user);
    } else if (action === 'complete') {
      return handleComplete(id, body, user);
    } else if (action === 'cancel') {
      return handleCancel(id, body, user);
    }

    return errorResponse('Invalid action');
  } catch (error) {
    console.error('Error handling task action:', error);
    return serverErrorResponse('Failed to handle task action');
  }
}

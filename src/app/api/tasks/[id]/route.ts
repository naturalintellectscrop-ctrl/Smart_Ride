import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@prisma/client';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { isValidTransition, canRiderPerformTask } from '@/lib/services/enhanced-task-state-machine.service';
import { sendTaskUpdateNotification } from '@/lib/services/notification.service';
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

  if (!isValidTransition(task.status, TaskStatus.ACCEPTED)) {
    return errorResponse(`Cannot accept task in ${task.status} status`);
  }

  if (!canRiderPerformTask(rider.riderRole, task.taskType)) {
    return errorResponse('Rider cannot perform this task type');
  }

  // Update task
  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.ACCEPTED,
      riderId: validatedData.riderId,
      acceptedAt: new Date(),
    },
  });

  await createAuditLog({
    action: AuditActions.TASK_ACCEPTED,
    entityType: EntityTypes.TASK,
    entityId: taskId,
    actorType: 'RIDER',
    riderId: validatedData.riderId as string,
    taskId: taskId,
    description: `Task accepted by rider: ${rider.fullName}`,
  });

  // Emit socket notification to client about task acceptance
  try {
    const socketPort = process.env.SOCKET_PORT || '3002';
    const internalKey = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
    await fetch(`http://localhost:${socketPort}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({
        room: `user:${task.clientId}`,
        event: 'task:status:update',
        data: {
          taskId,
          status: 'ACCEPTED',
          riderId: validatedData.riderId,
          riderName: rider.fullName,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch (socketError) {
    console.error('[Task Accept] Failed to emit socket notification:', socketError);
  }

  // Send DB notification to the client about the acceptance
  try {
    await sendTaskUpdateNotification(
      task.clientId,
      taskId,
      task.taskNumber || taskId,
      'ACCEPTED'
    );
  } catch (notifError) {
    console.error('[Task Accept] Failed to send notification:', notifError);
  }

  return successResponse(updatedTask, 'Task accepted');
}

// Schema for starting task
const startSchema = z.object({
  riderId: z.string(),
});

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

  if (!isValidTransition(task.status, 'IN_PROGRESS')) {
    return errorResponse(`Cannot start task in ${task.status} status`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: 'IN_PROGRESS',
      inProgressAt: new Date(),
      pickedUpAt: new Date(),
    },
  });

  await createAuditLog({
    action: AuditActions.TASK_STARTED,
    entityType: EntityTypes.TASK,
    entityId: taskId,
    actorType: 'RIDER',
    riderId: validatedData.riderId as string,
    taskId: taskId,
    description: 'Task started - rider is on the way',
  });

  return successResponse(updatedTask, 'Task started');
}

// Schema for completing task
const completeSchema = z.object({
  riderId: z.string(),
  actualDuration: z.number().optional(),
});

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

  if (!isValidTransition(task.status, 'COMPLETED')) {
    return errorResponse(`Cannot complete task in ${task.status} status`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      actualDuration: validatedData.actualDuration || null,
    },
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

  // Update rider stats
  if (task.riderId) {
    await db.rider.update({
      where: { id: task.riderId },
      data: {
        completedTrips: { increment: 1 },
        totalTrips: { increment: 1 },
        totalEarnings: { increment: task.riderEarnings || 0 },
      },
    });
  }

  await createAuditLog({
    action: AuditActions.TASK_COMPLETED,
    entityType: EntityTypes.TASK,
    entityId: taskId,
    actorType: 'RIDER',
    riderId: validatedData.riderId as string,
    taskId: taskId,
    description: 'Task completed successfully',
  });

  // FIX: Return payment details for frontend to display
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

  if (!isValidTransition(task.status, 'CANCELLED')) {
    return errorResponse(`Cannot cancel task in ${task.status} status`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy: validatedData.cancelledBy,
      cancellationCode: validatedData.reasonCode,
      cancellationReason: validatedData.reason || validatedData.reasonCode,
    },
  });

  // Update rider stats if was assigned
  if (task.riderId) {
    await db.rider.update({
      where: { id: task.riderId },
      data: {
        cancelledTrips: { increment: 1 },
        totalTrips: { increment: 1 },
      },
    });
  }

  await createAuditLog({
    action: AuditActions.TASK_CANCELLED,
    entityType: EntityTypes.TASK,
    entityId: taskId,
    actorType: validatedData.cancelledBy.includes('client') ? 'USER' : 
               validatedData.cancelledBy.includes('rider') ? 'RIDER' : 'SYSTEM',
    taskId: taskId,
    description: `Task cancelled: ${validatedData.reasonCode}${validatedData.reason ? ` - ${validatedData.reason}` : ''}`,
  });

  return successResponse(updatedTask, 'Task cancelled');
}

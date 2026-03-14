import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { isValidTransition, canRiderPerformTask } from '@/lib/api/state-machine';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]
 * Get a specific task by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if this is an accept action
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'accept') {
      return handleAccept(id, body);
    } else if (action === 'start') {
      return handleStart(id, body);
    } else if (action === 'complete') {
      return handleComplete(id, body);
    } else if (action === 'cancel') {
      return handleCancel(id, body);
    }

    return errorResponse('Invalid action');
  } catch (error) {
    console.error('Error handling task action:', error);
    return serverErrorResponse('Failed to handle task action');
  }
}

async function handleAccept(taskId: string, body: Record<string, unknown>) {
  const validatedData = acceptSchema.parse(body);
  
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { rider: true },
  });

  if (!task) {
    return notFoundResponse('Task');
  }

  if (!isValidTransition(task.status, 'RIDER_ACCEPTED')) {
    return errorResponse(`Cannot accept task in ${task.status} status`);
  }

  // Get rider
  const rider = await db.rider.findUnique({
    where: { id: validatedData.riderId },
  });

  if (!rider || rider.status !== 'APPROVED') {
    return errorResponse('Invalid or unapproved rider');
  }

  if (!canRiderPerformTask(rider.riderRole, task.taskType)) {
    return errorResponse('Rider cannot perform this task type');
  }

  // Update task
  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: 'RIDER_ACCEPTED',
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

  return successResponse(updatedTask, 'Task accepted');
}

// Schema for starting task
const startSchema = z.object({
  riderId: z.string(),
});

async function handleStart(taskId: string, body: Record<string, unknown>) {
  const validatedData = startSchema.parse(body);
  
  const task = await db.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return notFoundResponse('Task');
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

async function handleComplete(taskId: string, body: Record<string, unknown>) {
  const validatedData = completeSchema.parse(body);
  
  const task = await db.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return notFoundResponse('Task');
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
  });

  // Update rider stats
  await db.rider.update({
    where: { id: task.riderId || '' },
    data: {
      completedTrips: { increment: 1 },
      totalTrips: { increment: 1 },
      totalEarnings: { increment: task.riderEarnings || 0 },
    },
  });

  await createAuditLog({
    action: AuditActions.TASK_COMPLETED,
    entityType: EntityTypes.TASK,
    entityId: taskId,
    actorType: 'RIDER',
    riderId: validatedData.riderId as string,
    taskId: taskId,
    description: 'Task completed successfully',
  });

  return successResponse(updatedTask, 'Task completed');
}

// Schema for cancelling task
const cancelSchema = z.object({
  cancelledBy: z.string(),
  reasonCode: z.string(),
  reason: z.string().optional(),
});

async function handleCancel(taskId: string, body: Record<string, unknown>) {
  const validatedData = cancelSchema.parse(body);
  
  const task = await db.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return notFoundResponse('Task');
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

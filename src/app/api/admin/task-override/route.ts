// ============================================
// SMART RIDE - ADMIN TASK OVERRIDE API
// ============================================
// Allows admins to perform emergency operations on tasks:
// - force_redispatch: Send task back to SEARCHING, clear rider
// - force_cancel: Force-cancel with admin reason
// - force_complete: Force-complete with admin reason
// - emergency_reassign: Reassign to specific rider
// - force_assign: Assign to specific rider directly
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { EnhancedTaskStateMachine } from '@/lib/services/enhanced-task-state-machine.service';
import { sendTaskUpdateNotification } from '@/lib/services/notification.service';
import { TaskStatus, DispatchMatchStatus } from '@prisma/client';

// ============================================
// SOCKET EMISSION HELPER
// ============================================

async function emitSocketEvent(
  room: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const socketPort = process.env.SOCKET_PORT || '3002';
    const internalKey =
      process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
    await fetch(`http://localhost:${socketPort}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({ room, event, data }),
    });
  } catch (error) {
    console.error('[AdminOverride] Socket emission failed:', error);
  }
}

// ============================================
// ADMIN AUTH VERIFICATION
// ============================================

function verifyAdmin(request: NextRequest): {
  decoded: { userId: string; email: string; role: string; name: string } | null;
  error: NextResponse | null;
} {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      decoded: null,
      error: NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 }),
    };
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return {
      decoded: null,
      error: NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 }),
    };
  }

  if (!['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(decoded.role)) {
    return {
      decoded: null,
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    };
  }

  return { decoded, error: null };
}

// ============================================
// REQUEST BODY TYPE
// ============================================

interface TaskOverrideRequest {
  taskId: string;
  action: 'force_redispatch' | 'force_cancel' | 'force_complete' | 'emergency_reassign' | 'force_assign';
  reason: string;
  riderId?: string;
}

// ============================================
// ACTION HANDLERS
// ============================================

/**
 * force_redispatch: Transition task back to SEARCHING, clear current riderId,
 * mark rider as available.
 */
async function handleForceRedispatch(
  taskId: string,
  adminId: string,
  reason: string
) {
  // Fetch the task with current rider info
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true, userId: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found', status: 404 };
  }

  // Only allow redispatch from states where a rider is assigned
  const allowedStatuses: TaskStatus[] = [
    TaskStatus.ASSIGNED,
    TaskStatus.ACCEPTED,
    TaskStatus.ARRIVING,
    TaskStatus.ARRIVED,
    TaskStatus.PICKED_UP,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_TRANSIT,
    TaskStatus.MATCHING,
    TaskStatus.SEARCHING,
  ];

  if (!allowedStatuses.includes(task.status)) {
    return {
      success: false,
      error: `Cannot redispatch task in ${task.status} status. Allowed: ${allowedStatuses.join(', ')}`,
      status: 400,
    };
  }

  const previousRiderId = task.riderId;
  const previousStatus = task.status;

  // Transition task to SEARCHING via state machine
  const transitionResult = await EnhancedTaskStateMachine.transition(taskId, TaskStatus.SEARCHING, {
    triggeredByType: 'ADMIN',
    userId: adminId,
    reason: `Admin force redispatch: ${reason}`,
    metadata: {
      previousRiderId,
      previousStatus,
      adminAction: 'force_redispatch',
    },
  });

  if (!transitionResult.success) {
    return {
      success: false,
      error: `State machine transition failed: ${transitionResult.error}`,
      status: 400,
    };
  }

  // Clear riderId on the task and mark rider as available
  const updatePromises: Promise<unknown>[] = [];

  updatePromises.push(
    db.task.update({
      where: { id: taskId },
      data: { riderId: null },
    })
  );

  if (previousRiderId) {
    // Release the rider: clear currentTaskId and keep them online
    updatePromises.push(
      db.rider.update({
        where: { id: previousRiderId },
        data: { currentTaskId: null },
      })
    );
  }

  // Cancel any pending dispatch matches for this task
  updatePromises.push(
    db.dispatchMatch.updateMany({
      where: {
        taskId,
        status: DispatchMatchStatus.PENDING,
      },
      data: {
        status: DispatchMatchStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    })
  );

  await Promise.all(updatePromises);

  // Create audit log with ADMIN actor type and ADMIN_DASHBOARD source
  await db.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'ADMIN',
      taskId,
      action: 'ADMIN_FORCE_REDISPATCH',
      entityType: 'Task',
      entityId: taskId,
      description: `Admin force-redispatched task ${task.taskNumber}: ${reason}`,
      oldValues: JSON.stringify({ status: previousStatus, riderId: previousRiderId }),
      newValues: JSON.stringify({ status: 'SEARCHING', riderId: null }),
      source: 'ADMIN_DASHBOARD',
    },
  });

  // Notify client
  await sendTaskUpdateNotification(
    task.clientId,
    taskId,
    task.taskNumber,
    'SEARCHING'
  ).catch((err) => console.error('[AdminOverride] Client notification failed:', err));

  // Emit socket events
  await emitSocketEvent(`task:${taskId}`, 'task:status:update', {
    taskId,
    status: 'SEARCHING',
    previousStatus,
    reason: 'Force redispatched by admin',
  });

  await emitSocketEvent('admin:dashboard', 'admin:task-override', {
    action: 'force_redispatch',
    taskId,
    taskNumber: task.taskNumber,
    previousStatus,
    previousRiderId,
    reason,
    adminId,
  });

  // Notify previous rider that task was unassigned
  if (previousRiderId && task.rider) {
    await emitSocketEvent(`rider:${previousRiderId}`, 'task:unassigned', {
      taskId,
      taskNumber: task.taskNumber,
      reason: 'Task reassigned by admin',
    });
  }

  // Fetch updated task for response
  const updatedTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return { success: true, task: updatedTask };
}

/**
 * force_cancel: Force-cancel a task with admin reason.
 */
async function handleForceCancel(
  taskId: string,
  adminId: string,
  reason: string
) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found', status: 404 };
  }

  // Cannot cancel terminal states
  const terminalStatuses: TaskStatus[] = [
    TaskStatus.CANCELLED,
    TaskStatus.FAILED,
    TaskStatus.CLOSED,
  ];

  if (terminalStatuses.includes(task.status)) {
    return {
      success: false,
      error: `Cannot cancel task already in ${task.status} status`,
      status: 400,
    };
  }

  const previousStatus = task.status;
  const previousRiderId = task.riderId;

  // Transition via state machine
  const transitionResult = await EnhancedTaskStateMachine.transition(taskId, TaskStatus.CANCELLED, {
    triggeredByType: 'ADMIN',
    userId: adminId,
    reason: `Admin force cancel: ${reason}`,
    metadata: {
      previousStatus,
      previousRiderId,
      adminAction: 'force_cancel',
    },
  });

  if (!transitionResult.success) {
    return {
      success: false,
      error: `State machine transition failed: ${transitionResult.error}`,
      status: 400,
    };
  }

  // Release rider if assigned
  const updatePromises: Promise<unknown>[] = [];

  if (previousRiderId) {
    updatePromises.push(
      db.rider.update({
        where: { id: previousRiderId },
        data: { currentTaskId: null },
      })
    );
  }

  // Update task cancellation details
  updatePromises.push(
    db.task.update({
      where: { id: taskId },
      data: {
        cancellationReason: `Admin: ${reason}`,
        cancelledBy: adminId,
      },
    })
  );

  // Cancel any pending dispatch matches
  updatePromises.push(
    db.dispatchMatch.updateMany({
      where: {
        taskId,
        status: DispatchMatchStatus.PENDING,
      },
      data: {
        status: DispatchMatchStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    })
  );

  // If there's an associated order, cancel it too
  if (task.orderId) {
    updatePromises.push(
      db.order.update({
        where: { id: task.orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: `Admin: Task force-cancelled - ${reason}`,
        },
      }).catch((err) => console.error('[AdminOverride] Order cancel failed:', err))
    );
  }

  await Promise.all(updatePromises);

  // Create audit log
  await db.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'ADMIN',
      taskId,
      orderId: task.orderId,
      action: 'ADMIN_FORCE_CANCEL',
      entityType: 'Task',
      entityId: taskId,
      description: `Admin force-cancelled task ${task.taskNumber}: ${reason}`,
      oldValues: JSON.stringify({ status: previousStatus, riderId: previousRiderId }),
      newValues: JSON.stringify({ status: 'CANCELLED', riderId: null, cancellationReason: `Admin: ${reason}` }),
      source: 'ADMIN_DASHBOARD',
    },
  });

  // Notify client
  await sendTaskUpdateNotification(
    task.clientId,
    taskId,
    task.taskNumber,
    'CANCELLED'
  ).catch((err) => console.error('[AdminOverride] Client notification failed:', err));

  // Emit socket events
  await emitSocketEvent(`task:${taskId}`, 'task:status:update', {
    taskId,
    status: 'CANCELLED',
    previousStatus,
    reason: `Force cancelled by admin: ${reason}`,
  });

  await emitSocketEvent('admin:dashboard', 'admin:task-override', {
    action: 'force_cancel',
    taskId,
    taskNumber: task.taskNumber,
    previousStatus,
    reason,
    adminId,
  });

  // Notify rider
  if (previousRiderId) {
    await emitSocketEvent(`rider:${previousRiderId}`, 'task:cancelled', {
      taskId,
      taskNumber: task.taskNumber,
      reason: 'Task cancelled by admin',
    });
  }

  const updatedTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return { success: true, task: updatedTask };
}

/**
 * force_complete: Force-complete a task with admin reason.
 */
async function handleForceComplete(
  taskId: string,
  adminId: string,
  reason: string
) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found', status: 404 };
  }

  // Can only force-complete from active states
  const allowedStatuses: TaskStatus[] = [
    TaskStatus.ASSIGNED,
    TaskStatus.ACCEPTED,
    TaskStatus.ARRIVING,
    TaskStatus.ARRIVED,
    TaskStatus.PICKED_UP,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_TRANSIT,
    TaskStatus.DELIVERED,
  ];

  if (!allowedStatuses.includes(task.status)) {
    return {
      success: false,
      error: `Cannot force-complete task in ${task.status} status. Allowed: ${allowedStatuses.join(', ')}`,
      status: 400,
    };
  }

  const previousStatus = task.status;

  // Transition via state machine
  const transitionResult = await EnhancedTaskStateMachine.transition(taskId, TaskStatus.COMPLETED, {
    triggeredByType: 'ADMIN',
    userId: adminId,
    riderId: task.riderId ?? undefined,
    reason: `Admin force complete: ${reason}`,
    metadata: {
      previousStatus,
      adminAction: 'force_complete',
    },
  });

  if (!transitionResult.success) {
    return {
      success: false,
      error: `State machine transition failed: ${transitionResult.error}`,
      status: 400,
    };
  }

  // Release rider
  const updatePromises: Promise<unknown>[] = [];

  if (task.riderId) {
    updatePromises.push(
      db.rider.update({
        where: { id: task.riderId },
        data: { currentTaskId: null },
      })
    );
  }

  await Promise.all(updatePromises);

  // Create audit log
  await db.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'ADMIN',
      taskId,
      orderId: task.orderId,
      riderId: task.riderId,
      action: 'ADMIN_FORCE_COMPLETE',
      entityType: 'Task',
      entityId: taskId,
      description: `Admin force-completed task ${task.taskNumber}: ${reason}`,
      oldValues: JSON.stringify({ status: previousStatus }),
      newValues: JSON.stringify({ status: 'COMPLETED' }),
      source: 'ADMIN_DASHBOARD',
    },
  });

  // Notify client
  await sendTaskUpdateNotification(
    task.clientId,
    taskId,
    task.taskNumber,
    'COMPLETED'
  ).catch((err) => console.error('[AdminOverride] Client notification failed:', err));

  // Emit socket events
  await emitSocketEvent(`task:${taskId}`, 'task:status:update', {
    taskId,
    status: 'COMPLETED',
    previousStatus,
    reason: `Force completed by admin: ${reason}`,
  });

  await emitSocketEvent('admin:dashboard', 'admin:task-override', {
    action: 'force_complete',
    taskId,
    taskNumber: task.taskNumber,
    previousStatus,
    reason,
    adminId,
  });

  const updatedTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return { success: true, task: updatedTask };
}

/**
 * emergency_reassign: Reassign task to a specific rider.
 * Transitions current task back to SEARCHING, clears old rider,
 * then assigns to the new rider.
 */
async function handleEmergencyReassign(
  taskId: string,
  adminId: string,
  reason: string,
  newRiderId: string
) {
  // Validate the new rider
  const newRider = await db.rider.findUnique({
    where: { id: newRiderId },
    include: { user: { select: { id: true, name: true, status: true } } },
  });

  if (!newRider) {
    return { success: false, error: 'Target rider not found', status: 404 };
  }

  if (newRider.status !== 'APPROVED') {
    return {
      success: false,
      error: `Rider is not approved (status: ${newRider.status})`,
      status: 400,
    };
  }

  if (newRider.currentTaskId && newRider.currentTaskId !== taskId) {
    return {
      success: false,
      error: `Rider already has an active task (${newRider.currentTaskId})`,
      status: 400,
    };
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true, userId: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found', status: 404 };
  }

  // Task must be in a state where reassignment makes sense
  const allowedStatuses: TaskStatus[] = [
    TaskStatus.MATCHING,
    TaskStatus.SEARCHING,
    TaskStatus.ASSIGNED,
    TaskStatus.ACCEPTED,
    TaskStatus.ARRIVING,
    TaskStatus.ARRIVED,
  ];

  if (!allowedStatuses.includes(task.status)) {
    return {
      success: false,
      error: `Cannot reassign task in ${task.status} status. Allowed: ${allowedStatuses.join(', ')}`,
      status: 400,
    };
  }

  const previousRiderId = task.riderId;
  const previousStatus = task.status;

  // Step 1: If task has a rider, first transition to SEARCHING to clear the rider
  if (previousRiderId && previousRiderId !== newRiderId) {
    const redispatchResult = await EnhancedTaskStateMachine.transition(taskId, TaskStatus.SEARCHING, {
      triggeredByType: 'ADMIN',
      userId: adminId,
      reason: `Admin emergency reassign (preparing): ${reason}`,
      metadata: {
        previousRiderId,
        previousStatus,
        adminAction: 'emergency_reassign_step1',
      },
    });

    if (!redispatchResult.success) {
      return {
        success: false,
        error: `Failed to transition task to SEARCHING before reassignment: ${redispatchResult.error}`,
        status: 400,
      };
    }

    // Clear riderId and release old rider
    await Promise.all([
      db.task.update({
        where: { id: taskId },
        data: { riderId: null },
      }),
      db.rider.update({
        where: { id: previousRiderId },
        data: { currentTaskId: null },
      }),
    ]);
  }

  // Step 2: Assign to the new rider
  const assignResult = await EnhancedTaskStateMachine.transition(taskId, TaskStatus.ASSIGNED, {
    triggeredByType: 'ADMIN',
    userId: adminId,
    riderId: newRiderId,
    reason: `Admin emergency reassign: ${reason}`,
    metadata: {
      previousRiderId,
      previousStatus,
      newRiderId,
      adminAction: 'emergency_reassign',
    },
  });

  if (!assignResult.success) {
    return {
      success: false,
      error: `Failed to assign task to new rider: ${assignResult.error}`,
      status: 400,
    };
  }

  // Update new rider's currentTaskId and set them online
  await db.rider.update({
    where: { id: newRiderId },
    data: { currentTaskId: taskId, isOnline: true },
  });

  // Cancel any other pending dispatch matches for this task
  await db.dispatchMatch.updateMany({
    where: {
      taskId,
      status: DispatchMatchStatus.PENDING,
    },
    data: {
      status: DispatchMatchStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'ADMIN',
      taskId,
      riderId: newRiderId,
      action: 'ADMIN_EMERGENCY_REASSIGN',
      entityType: 'Task',
      entityId: taskId,
      description: `Admin emergency-reassigned task ${task.taskNumber} from rider ${previousRiderId || 'none'} to ${newRider.fullName}: ${reason}`,
      oldValues: JSON.stringify({ status: previousStatus, riderId: previousRiderId }),
      newValues: JSON.stringify({ status: 'ASSIGNED', riderId: newRiderId }),
      source: 'ADMIN_DASHBOARD',
    },
  });

  // Notify client
  await sendTaskUpdateNotification(
    task.clientId,
    taskId,
    task.taskNumber,
    'ASSIGNED'
  ).catch((err) => console.error('[AdminOverride] Client notification failed:', err));

  // Emit socket events
  await emitSocketEvent(`task:${taskId}`, 'task:status:update', {
    taskId,
    status: 'ASSIGNED',
    previousStatus,
    newRiderId,
    reason: `Emergency reassigned by admin: ${reason}`,
  });

  await emitSocketEvent('admin:dashboard', 'admin:task-override', {
    action: 'emergency_reassign',
    taskId,
    taskNumber: task.taskNumber,
    previousStatus,
    previousRiderId,
    newRiderId,
    newRiderName: newRider.fullName,
    reason,
    adminId,
  });

  // Notify old rider
  if (previousRiderId && previousRiderId !== newRiderId) {
    await emitSocketEvent(`rider:${previousRiderId}`, 'task:unassigned', {
      taskId,
      taskNumber: task.taskNumber,
      reason: 'Task reassigned to another rider by admin',
    });
  }

  // Notify new rider
  await emitSocketEvent(`rider:${newRiderId}`, 'dispatch:assignment', {
    taskId,
    taskNumber: task.taskNumber,
    taskType: task.taskType,
    pickupAddress: task.pickupAddress,
    dropoffAddress: task.dropoffAddress,
    reason: 'Emergency assigned by admin',
  });

  const updatedTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return { success: true, task: updatedTask };
}

/**
 * force_assign: Assign task to a specific rider directly.
 * For tasks that don't have a rider yet (CREATED, MATCHING, SEARCHING).
 */
async function handleForceAssign(
  taskId: string,
  adminId: string,
  reason: string,
  riderId: string
) {
  // Validate the rider
  const rider = await db.rider.findUnique({
    where: { id: riderId },
    include: { user: { select: { id: true, name: true, status: true } } },
  });

  if (!rider) {
    return { success: false, error: 'Rider not found', status: 404 };
  }

  if (rider.status !== 'APPROVED') {
    return {
      success: false,
      error: `Rider is not approved (status: ${rider.status})`,
      status: 400,
    };
  }

  if (rider.currentTaskId && rider.currentTaskId !== taskId) {
    return {
      success: false,
      error: `Rider already has an active task (${rider.currentTaskId})`,
      status: 400,
    };
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return { success: false, error: 'Task not found', status: 404 };
  }

  // Task must not already have a rider or be in a terminal state
  if (task.riderId) {
    return {
      success: false,
      error: 'Task already has a rider assigned. Use emergency_reassign instead.',
      status: 400,
    };
  }

  const allowedStatuses: TaskStatus[] = [
    TaskStatus.CREATED,
    TaskStatus.MATCHING,
    TaskStatus.SEARCHING,
  ];

  if (!allowedStatuses.includes(task.status)) {
    return {
      success: false,
      error: `Cannot force-assign task in ${task.status} status. Allowed: ${allowedStatuses.join(', ')}`,
      status: 400,
    };
  }

  const previousStatus = task.status;

  // Transition via state machine to ASSIGNED
  const transitionResult = await EnhancedTaskStateMachine.transition(taskId, TaskStatus.ASSIGNED, {
    triggeredByType: 'ADMIN',
    userId: adminId,
    riderId,
    reason: `Admin force assign: ${reason}`,
    metadata: {
      previousStatus,
      adminAction: 'force_assign',
    },
  });

  if (!transitionResult.success) {
    return {
      success: false,
      error: `State machine transition failed: ${transitionResult.error}`,
      status: 400,
    };
  }

  // Update rider's currentTaskId and set online
  await db.rider.update({
    where: { id: riderId },
    data: { currentTaskId: taskId, isOnline: true },
  });

  // Cancel any pending dispatch matches
  await db.dispatchMatch.updateMany({
    where: {
      taskId,
      status: DispatchMatchStatus.PENDING,
    },
    data: {
      status: DispatchMatchStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      actorId: adminId,
      actorType: 'ADMIN',
      taskId,
      riderId,
      action: 'ADMIN_FORCE_ASSIGN',
      entityType: 'Task',
      entityId: taskId,
      description: `Admin force-assigned task ${task.taskNumber} to rider ${rider.fullName}: ${reason}`,
      oldValues: JSON.stringify({ status: previousStatus, riderId: null }),
      newValues: JSON.stringify({ status: 'ASSIGNED', riderId }),
      source: 'ADMIN_DASHBOARD',
    },
  });

  // Notify client
  await sendTaskUpdateNotification(
    task.clientId,
    taskId,
    task.taskNumber,
    'ASSIGNED'
  ).catch((err) => console.error('[AdminOverride] Client notification failed:', err));

  // Emit socket events
  await emitSocketEvent(`task:${taskId}`, 'task:status:update', {
    taskId,
    status: 'ASSIGNED',
    previousStatus,
    riderId,
    reason: `Force assigned to rider by admin: ${reason}`,
  });

  await emitSocketEvent('admin:dashboard', 'admin:task-override', {
    action: 'force_assign',
    taskId,
    taskNumber: task.taskNumber,
    previousStatus,
    riderId,
    riderName: rider.fullName,
    reason,
    adminId,
  });

  // Notify rider
  await emitSocketEvent(`rider:${riderId}`, 'dispatch:assignment', {
    taskId,
    taskNumber: task.taskNumber,
    taskType: task.taskType,
    pickupAddress: task.pickupAddress,
    dropoffAddress: task.dropoffAddress,
    reason: 'Assigned by admin',
  });

  const updatedTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      rider: { select: { id: true, fullName: true } },
      client: { select: { id: true, name: true } },
    },
  });

  return { success: true, task: updatedTask };
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { decoded, error: authError } = verifyAdmin(request);
    if (authError || !decoded) return authError!;

    // Parse and validate request body
    const body: TaskOverrideRequest = await request.json();
    const { taskId, action, reason, riderId } = body;

    // Validate required fields
    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions: TaskOverrideRequest['action'][] = [
      'force_redispatch',
      'force_cancel',
      'force_complete',
      'emergency_reassign',
      'force_assign',
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'reason is required for all admin override actions' },
        { status: 400 }
      );
    }

    // Validate riderId for actions that require it
    if ((action === 'emergency_reassign' || action === 'force_assign') && !riderId) {
      return NextResponse.json(
        { error: `riderId is required for ${action} action` },
        { status: 400 }
      );
    }

    // Dispatch to handler
    let result: { success: boolean; task?: unknown; error?: string; status?: number };

    switch (action) {
      case 'force_redispatch':
        result = await handleForceRedispatch(taskId, decoded.userId, reason);
        break;
      case 'force_cancel':
        result = await handleForceCancel(taskId, decoded.userId, reason);
        break;
      case 'force_complete':
        result = await handleForceComplete(taskId, decoded.userId, reason);
        break;
      case 'emergency_reassign':
        result = await handleEmergencyReassign(taskId, decoded.userId, reason, riderId!);
        break;
      case 'force_assign':
        result = await handleForceAssign(taskId, decoded.userId, reason, riderId!);
        break;
      default:
        result = { success: false, error: 'Unknown action', status: 400 };
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      task: result.task,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AdminOverride] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error during task override' },
      { status: 500 }
    );
  }
}

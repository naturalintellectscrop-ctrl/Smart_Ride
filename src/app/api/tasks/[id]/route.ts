import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext, setServiceRoleContext } from '@/lib/db';
import { TaskStatus } from '@prisma/client';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { isValidTransition, canRiderPerformTask, EnhancedTaskStateMachine } from '@/lib/services/enhanced-task-state-machine.service';
import { z } from 'zod';
import { requireAuth, isAdmin, AuthenticatedRequest } from '@/lib/auth/guards';
import { redactPerson, redactBusiness } from '@/lib/privacy/public-contact';
import { ensureReceiptForTask } from '@/lib/receipts/receipt-service';
import { sendReceiptEmail } from '@/lib/receipts/send-receipt-email';

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

    // Fetch under the service role and authorize MANUALLY below. Under the
    // caller's RLS context a rider who has only a PENDING dispatch offer (not
    // yet assigned) cannot see the task row at all, so the request card's
    // task fetch 404'd with 'Task not found' — runtime-verified failure.
    await setServiceRoleContext();

    const { id } = await params;
    const task = await db.task.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true },
        },
        rider: {
          select: {
            id: true,
            fullName: true,
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

    // SECURITY: IDOR protection - verify ownership (manual, since we fetched
    // under the service role). A rider may read the task if they are assigned
    // OR currently hold a dispatch offer for it (PENDING/ACCEPTED match) —
    // they need pickup/dropoff to decide on the request card.
    if (!isAdmin(user.role)) {
      const isClient = task.clientId === user.userId;
      let isRider = false;

      if (user.role === 'RIDER') {
        const rider = await db.rider.findUnique({
          where: { userId: user.userId },
          select: { id: true },
        });
        if (rider) {
          isRider = rider.id === task.riderId;
          if (!isRider) {
            const offer = await db.dispatchMatch.findFirst({
              where: { taskId: id, riderId: rider.id, status: { in: ['PENDING', 'ACCEPTED'] } },
              select: { id: true },
            });
            isRider = !!offer;
          }
        }
      }

      if (!isClient && !isRider) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this task' },
          { status: 403 }
        );
      }
    }

    // PRIVACY: non-admin callers see first names only, never phone/email.
    if (!isAdmin(user.role)) {
      redactPerson(task.client, 'name');
      redactPerson(task.rider, 'fullName');
      redactBusiness((task as { order?: { merchant?: Record<string, unknown> } }).order?.merchant);
    }

    return successResponse(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return serverErrorResponse('Failed to fetch task');
  } finally {
    await resetRLSContext();
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

  // PRIVACY: never return the client's phone to the rider.
  if (!isAdmin(user.role as any)) {
    redactPerson((result.task as { client?: Record<string, unknown> })?.client, 'name');
    redactPerson((result.task as { rider?: Record<string, unknown> })?.rider, 'fullName');
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

  // PRIVACY: never return the client's phone to the rider.
  if (!isAdmin(user.role as any)) {
    redactPerson((result.task as { client?: Record<string, unknown> })?.client, 'name');
    redactPerson((result.task as { rider?: Record<string, unknown> })?.rider, 'fullName');
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
        select: { id: true, name: true },
      },
      rider: {
        select: { id: true, fullName: true },
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
        select: { id: true, name: true },
      },
      rider: {
        select: { id: true, fullName: true },
      },
    },
  });

  // PRIVACY: first names only, never phone/email.
  redactPerson((updatedTask as { client?: Record<string, unknown> })?.client, 'name');
  redactPerson((updatedTask as { rider?: Record<string, unknown> })?.rider, 'fullName');

  // Auto-generate the receipt for this completed transaction and email it
  // (idempotent; email is fire-and-forget so it never blocks completion).
  let receiptNumber: string | undefined;
  try {
    const receipt = await ensureReceiptForTask(taskId);
    if (receipt) {
      receiptNumber = receipt.receiptNumber;
      if (!receipt.emailedAt) sendReceiptEmail(receipt.id).catch(() => {});
    }
  } catch (err) {
    console.error('[Task Complete] receipt generation failed (non-blocking):', err);
  }

  // Return payment details for frontend to display
  return successResponse({
    ...updatedTask,
    receiptNumber,
    paymentDetails: {
      fare: task.totalAmount,
      currency: 'UGX',
      paymentMethod: task.paymentMethod || 'CASH',
      paymentStatus: task.payment?.status || 'PENDING',
      riderEarnings: task.riderEarnings,
    },
  }, 'Task completed');
}

// Schema for cancelling task. The mobile app sends just { reason } — both
// cancelledBy and reasonCode are derived server-side from the authenticated
// caller when omitted (they used to be required, which made EVERY app cancel
// throw a ZodError → HTTP 500).
const cancelSchema = z.object({
  cancelledBy: z.string().optional(),
  reasonCode: z.string().optional(),
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

  // BUSINESS RULE: a ride cannot be cancelled once it is in transit.
  // Once the passenger is aboard / the item is in the rider's custody
  // (PICKED_UP, IN_TRANSIT, IN_PROGRESS), neither the client nor the rider may
  // self-cancel — they must complete the trip or escalate (e.g. SOS). Only an
  // admin can override (support/emergency). This mirrors the guard in
  // POST /api/tasks/[id]/transition so every client cancel path is covered.
  const IN_TRANSIT_STATES: TaskStatus[] = [
    TaskStatus.PICKED_UP,
    TaskStatus.IN_TRANSIT,
    TaskStatus.IN_PROGRESS,
  ];
  if (!isAdmin(user.role as any) && IN_TRANSIT_STATES.includes(task.status)) {
    return errorResponse(
      'This ride is already in transit and can no longer be cancelled.',
      409
    );
  }

  // Pre-check for better error message (SM also validates)
  if (!isValidTransition(task.status, 'CANCELLED')) {
    return errorResponse(`Cannot cancel task in ${task.status} status`);
  }

  // Determine actor type for SM validation. Prefer the AUTHENTICATED caller's
  // role — the body's cancelledBy (if present) is only a fallback hint.
  const cancelledByStr = validatedData.cancelledBy
    || (user.role === 'RIDER' ? 'rider' : 'client');
  let triggeredByType: 'CLIENT' | 'RIDER' | 'SYSTEM' | 'ADMIN';
  if (isAdmin(user.role as any)) {
    triggeredByType = 'ADMIN';
  } else if (user.role === 'RIDER' || cancelledByStr.includes('rider')) {
    triggeredByType = 'RIDER';
  } else {
    triggeredByType = 'CLIENT';
  }

  const reasonStr = validatedData.reason || validatedData.reasonCode || 'Cancelled';

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
        cancellationReason: reasonStr,
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

    // Service role, matching the GET handler: the task RLS SELECT policies
    // don't cover every legitimate actor here (e.g. a client cancelling their
    // own still-searching task read as "Task not found"). Authorization is
    // enforced explicitly inside each action handler (IDOR checks on
    // clientId / assigned riderId) — same pattern as GET and the dispatch routes.
    await setServiceRoleContext();

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
  } finally {
    await resetRLSContext();
  }
}

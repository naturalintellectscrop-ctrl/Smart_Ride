import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { nextTaskNumber } from '@/lib/tasks/task-number';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import {
  generateKOTNumber,
  EnhancedTaskStateMachine,
} from '@/lib/services/enhanced-task-state-machine.service';
import { sendOrderUpdateNotification } from '@/lib/services/notification.service';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { calculatePricing } from '@/lib/api/pricing';
import { redactPerson, redactBusiness } from '@/lib/privacy/public-contact';
import { ensureReceiptForTask } from '@/lib/receipts/receipt-service';
import { sendReceiptEmail } from '@/lib/receipts/send-receipt-email';
import { TaskStatus } from '@prisma/client';
import { z } from 'zod';
import { broadcastEvent, broadcastToUser } from '@/lib/realtime-server';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import { verifyAccessToken } from '@/lib/auth/jwt';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Role-based action permissions for order PATCH.
// MERCHANT-only: accept, reject, preparing, ready
// RIDER-only: pickup, deliver
// CLIENT (order owner) + MERCHANT: cancel
// ADMIN: any action
const ACTION_ROLE_MATRIX: Record<string, string[]> = {
  'confirm-payment': ['CLIENT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'],
  'accept':          ['MERCHANT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'],
  'reject':          ['MERCHANT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'],
  'preparing':       ['MERCHANT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'],
  'ready':           ['MERCHANT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'],
  'pickup':          ['RIDER', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'],
  'deliver':         ['RIDER', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'],
  'cancel':          ['CLIENT', 'MERCHANT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'],
};

// Schema for confirming payment
const confirmPaymentSchema = z.object({
  paymentReference: z.string().optional(),
});

// Schema for merchant accepting order
const acceptOrderSchema = z.object({
  merchantId: z.string(),
  estimatedPrepTime: z.number().optional(),
});

// Schema for merchant rejecting order
const rejectOrderSchema = z.object({
  merchantId: z.string(),
  reason: z.string().min(5, 'Rejection reason is required'),
});

// Schema for marking order ready
const readySchema = z.object({
  merchantId: z.string(),
});

// Schema for rider pickup
const pickupSchema = z.object({
  riderId: z.string().optional(),
});

// Schema for delivery confirmation
const deliverSchema = z.object({
  riderId: z.string().optional(),
});

/**
 * Emit a realtime event via Supabase broadcast.
 * Routes to the appropriate broadcast helper based on room prefix.
 */
async function emitSocketEvent(room: string, event: string, data: Record<string, unknown>): Promise<void> {
  try {
    if (room.startsWith('user:')) {
      const userId = room.replace('user:', '');
      await broadcastToUser(userId, event, data);
    } else {
      await broadcastEvent(room, event, data);
    }
  } catch {
    // Broadcast might fail - don't block the request
    console.log('[Orders] Realtime broadcast skipped (service unavailable)');
  }
}

/**
 * GET /api/orders/[id]
 * Get a specific order by ID
 * SECURITY: Requires authentication + ownership verification
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // SECURITY: Require authentication
  const authResult = requireAuth(request);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }
  const user = authResult.user;

  await setServiceRoleContext();
  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        merchant: true,
        client: {
          select: { id: true, name: true },
        },
        items: true,
        kot: true,
        task: {
          include: {
            rider: {
              select: { id: true, fullName: true, riderRole: true },
            },
          },
        },
      },
    });

    if (!order) {
      return notFoundResponse('Order');
    }

    // SECURITY: Verify the user has access to this order
    if (!isAdmin(user.role)) {
      const isClient = order.clientId === user.userId;
      let isMerchant = false;
      let isRider = false;

      // MERCH-6: a merchant could not read their own order.
      //
      // This branch was hard-coded to false, on a comment asserting that
      // `Merchant` has no `userId` column. It does — `userId String? @unique`
      // with a relation to User, and the availability and registration routes
      // both resolve a merchant by it. So the assertion was simply wrong, and
      // the effect was that a merchant opening one of their own orders fell
      // through every branch to "Access denied".
      if (order.merchantId && (user.role === 'MERCHANT' || user.role === 'PHARMACIST')) {
        const own = await db.merchant.findFirst({
          where: { userId: user.userId },
          select: { id: true },
        });
        isMerchant = !!own && own.id === order.merchantId;
      }

      // Check if user is the assigned rider
      if (order.task?.riderId) {
        const rider = await db.rider.findUnique({
          where: { id: order.task.riderId },
          select: { userId: true },
        });
        isRider = rider?.userId === user.userId;
      }

      if (!isClient && !isMerchant && !isRider) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this order' },
          { status: 403 }
        );
      }
    }

    // PRIVACY: non-admin callers see first names only, never phone/email.
    if (!isAdmin(user.role)) {
      redactPerson(order.client, 'name');
      redactBusiness(order.merchant as Record<string, unknown>);
      const taskRider = (order as { task?: { rider?: Record<string, unknown> } }).task?.rider;
      if (taskRider) redactPerson(taskRider, 'fullName');
    }

    return successResponse(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return serverErrorResponse('Failed to fetch order');
  } finally {
    await resetRLSContext();
  }
}

/**
 * PATCH /api/orders/[id]
 * Update order status (for merchant workflow + rider delivery)
 * Actions: confirm-payment, accept, reject, preparing, ready, pickup, deliver, cancel
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // ============================================================
  // SECURITY: Authentication + role-based authorization
  // Previously this endpoint had NO auth check — anyone (even
  // unauthenticated) could drive an order through its full lifecycle.
  // Now: every PATCH requires a valid access token, and the action
  // must be permitted for the user's role per ACTION_ROLE_MATRIX.
  // ============================================================
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!action || !ACTION_ROLE_MATRIX[action]) {
    return errorResponse('Invalid action. Use: confirm-payment, accept, reject, preparing, ready, pickup, deliver, or cancel');
  }

  // Role check
  const allowedRoles = ACTION_ROLE_MATRIX[action];
  if (!allowedRoles.includes(decoded.role)) {
    // Audit unauthorized attempt
    try {
      await setServiceRoleContext();
      await createAuditLog({
        action: AuditActions.ORDER_CANCELLED, // closest action for unauthorized access log
        entityType: EntityTypes.ORDER,
        entityId: id,
        actorType: 'USER',
        actorId: decoded.userId,
        userId: decoded.userId,
        orderId: id,
        description: `UNAUTHORIZED: User ${decoded.userId} (role: ${decoded.role}) attempted action '${action}' on order ${id}`,
        source: 'API',
      });
    } catch { /* non-blocking */ }
    await resetRLSContext();
    return NextResponse.json(
      { success: false, error: `Role '${decoded.role}' is not permitted to perform action '${action}' on orders` },
      { status: 403 }
    );
  }

  await setServiceRoleContext();
  try {
    const body = await request.json();

    // ============================================================
    // SECURITY: role is not ownership.
    //
    // The matrix above answers "may a MERCHANT accept orders?" — it never
    // asked "is this merchant's order?". `handleAccept` looked like it did,
    // but it compared order.merchantId against body.merchantId, a value the
    // caller supplies and which is not secret (it is returned by the public
    // merchant listing and echoed in every order). The other five handlers
    // did not check at all.
    //
    // So any signed-in merchant could accept, reject, start preparing or mark
    // ready any other merchant's order — taking over a competitor's kitchen
    // queue and firing status notifications at their customers — and any
    // signed-in rider could mark any order picked up or delivered, including
    // deliveries assigned to someone else.
    //
    // Ownership is now resolved from the token before any handler runs, and
    // is never read from the body.
    // ============================================================
    const ownership = await assertOrderOwnership(id, action, decoded);
    if (ownership) return ownership;

    switch (action) {
      case 'confirm-payment':
        return handleConfirmPayment(id, body, decoded);
      case 'accept':
        return handleAccept(id, body, decoded);
      case 'reject':
        return handleReject(id, body, decoded);
      case 'preparing':
        return handlePreparing(id, body, decoded);
      case 'ready':
        return handleReady(id, body, decoded);
      case 'pickup':
        return handlePickup(id, body, decoded);
      case 'deliver':
        return handleDeliver(id, body, decoded);
      case 'cancel':
        return handleCancel(id, body, decoded);
      default:
        return errorResponse('Invalid action. Use: confirm-payment, accept, reject, preparing, ready, pickup, deliver, or cancel');
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return serverErrorResponse('Failed to update order');
  } finally {
    await resetRLSContext();
  }
}

/** Roles that are allowed to act across tenants by definition. */
const CROSS_TENANT_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN'];

/** Which party an action belongs to, derived from the same matrix above. */
const MERCHANT_ACTIONS = new Set(['accept', 'reject', 'preparing', 'ready']);
const RIDER_ACTIONS = new Set(['pickup', 'deliver']);
const CLIENT_ACTIONS = new Set(['confirm-payment']);

/**
 * Refuse an action on an order the caller has no stake in.
 *
 * Returns a response to send when the caller is not entitled, or null to let
 * the action proceed. Identity comes only from the verified token — nothing
 * here reads the request body, which is the whole point.
 */
async function assertOrderOwnership(
  orderId: string,
  action: string,
  decoded: { userId: string; role: string }
): Promise<NextResponse | null> {
  if (CROSS_TENANT_ROLES.includes(decoded.role)) return null;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, clientId: true, merchantId: true },
  });
  if (!order) return notFoundResponse('Order');

  const deny = (why: string) =>
    NextResponse.json({ success: false, error: why }, { status: 403 });

  if (MERCHANT_ACTIONS.has(action)) {
    const merchant = await db.merchant.findUnique({
      where: { userId: decoded.userId },
      select: { id: true },
    });
    if (!merchant || merchant.id !== order.merchantId) {
      return deny('This order belongs to another merchant');
    }
    return null;
  }

  if (RIDER_ACTIONS.has(action)) {
    const rider = await db.rider.findFirst({
      where: { userId: decoded.userId },
      select: { id: true },
    });
    if (!rider) return deny('No delivery profile for this account');

    // An order carries no riderId of its own — the delivery leg lives on the
    // Task that references it, so that is where the assignment is checked.
    const task = await db.task.findFirst({
      where: { orderId: order.id },
      select: { riderId: true },
    });
    if (!task || task.riderId !== rider.id) {
      return deny('You are not assigned to this delivery');
    }
    return null;
  }

  if (CLIENT_ACTIONS.has(action) && order.clientId !== decoded.userId) {
    return deny('This order belongs to another customer');
  }

  // `cancel` is shared: whoever is genuinely party to the order may cancel it.
  if (action === 'cancel') {
    if (order.clientId === decoded.userId) return null;
    const merchant = await db.merchant.findUnique({
      where: { userId: decoded.userId },
      select: { id: true },
    });
    if (merchant && merchant.id === order.merchantId) return null;
    return deny('You are not party to this order');
  }

  return null;
}

/**
 * Handle payment confirmation - creates KOT, notifies merchant and client
 */
async function handleConfirmPayment(orderId: string, body: Record<string, unknown>, decoded: { userId: string; role: string }) {
  const validatedData = confirmPaymentSchema.parse(body);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, merchant: true },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  if (order.status !== 'ORDER_CREATED') {
    return errorResponse('Order must be in ORDER_CREATED status');
  }

  // Update order and create KOT
  const [updatedOrder, kot] = await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status: 'PAYMENT_CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentReference: validatedData.paymentReference || null,
        confirmedAt: new Date(),
      },
    }),
    db.kOT.create({
      data: {
        kotNumber: generateKOTNumber(),
        orderId: orderId,
        merchantId: order.merchantId!,
        items: JSON.stringify(order.items),
        specialInstructions: order.items.map(i => i.specialInstructions).filter(Boolean).join('; ') || null,
        estimatedPrepTime: order.merchant?.averagePrepTime || 15,
        status: 'GENERATED',
      },
    }),
  ]);

  // Notify client about payment confirmation
  await sendOrderUpdateNotification(
    order.clientId,
    orderId,
    order.orderNumber,
    'PAYMENT_CONFIRMED'
  ).catch(err => console.error('[Order] Failed to send PAYMENT_CONFIRMED notification:', err));

  // Notify merchant about new order via socket
  if (order.merchantId) {
    const merchant = await db.merchant.findUnique({
      where: { id: order.merchantId },
      select: { id: true, name: true, phone: true },
    });

    // Find the merchant's user for socket targeting
    // Merchants may have a linked user account
    const merchantUser = await db.user.findFirst({
      where: {
        role: 'MERCHANT',
        phone: merchant?.phone,
      },
      select: { id: true },
    });

    if (merchantUser) {
      await emitSocketEvent(`user:${merchantUser.id}`, 'merchant:order:new', {
        orderId,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
        clientName: (await db.user.findUnique({ where: { id: order.clientId }, select: { name: true } }))?.name,
        status: 'PAYMENT_CONFIRMED',
        createdAt: order.createdAt,
      });
    }

    // Also notify merchant via DB notification
    if (merchantUser) {
      await sendOrderUpdateNotification(
        merchantUser.id,
        orderId,
        order.orderNumber,
        'PAYMENT_CONFIRMED'
      ).catch(err => console.error('[Order] Failed to notify merchant:', err));
    }
  }

  await createAuditLog({
    action: AuditActions.KOT_GENERATED,
    entityType: EntityTypes.KOT,
    entityId: kot.id,
    actorType: 'SYSTEM',
    orderId: orderId,
    description: `Payment confirmed and KOT ${kot.kotNumber} generated for order ${order.orderNumber}`,
  });

  return successResponse({ order: updatedOrder, kot }, 'Payment confirmed and KOT generated');
}

/**
 * Handle merchant accepting order
 */
async function handleAccept(orderId: string, body: Record<string, unknown>, decoded: { userId: string; role: string }) {
  const validatedData = acceptOrderSchema.parse(body);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { kot: true },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  if (order.status !== 'PAYMENT_CONFIRMED') {
    return errorResponse('Order must be in PAYMENT_CONFIRMED status');
  }

  // Verify merchant owns this order
  if (order.merchantId !== validatedData.merchantId) {
    return errorResponse('Merchant does not own this order');
  }

  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: 'MERCHANT_ACCEPTED',
      acceptedAt: new Date(),
    },
  });

  // Update KOT status
  if (order.kot) {
    await db.kOT.update({
      where: { id: order.kot.id },
      data: { status: 'PRINTED' },
    });
  }

  // Notify client that merchant accepted
  await sendOrderUpdateNotification(
    order.clientId,
    orderId,
    order.orderNumber,
    'MERCHANT_ACCEPTED'
  ).catch(err => console.error('[Order] Failed to send MERCHANT_ACCEPTED notification:', err));

  // Emit realtime update to client
  await emitSocketEvent(`user:${order.clientId}`, 'order:status:update', {
    orderId,
    orderNumber: order.orderNumber,
    status: 'MERCHANT_ACCEPTED',
    estimatedPrepTime: validatedData.estimatedPrepTime || 15,
  });

  await createAuditLog({
    action: AuditActions.ORDER_ACCEPTED,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    actorType: 'MERCHANT',
    merchantId: validatedData.merchantId as string,
    orderId: orderId,
    description: `Order accepted by merchant. Estimated prep: ${validatedData.estimatedPrepTime || 15} mins`,
  });

  return successResponse(updatedOrder, 'Order accepted');
}

/**
 * Handle merchant rejecting order
 */
async function handleReject(orderId: string, body: Record<string, unknown>, decoded: { userId: string; role: string }) {
  const validatedData = rejectOrderSchema.parse(body);

  const order = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  if (!['PAYMENT_CONFIRMED', 'ORDER_CREATED'].includes(order.status)) {
    return errorResponse('Order cannot be rejected at this stage');
  }

  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: 'REJECTED',
      cancelledAt: new Date(),
      cancellationReason: validatedData.reason,
    },
  });

  // Refund payment if already paid
  if (order.paymentStatus === 'COMPLETED') {
    await db.payment.updateMany({
      where: { orderId: orderId },
      data: { status: 'REFUNDED' },
    });
  }

  // Notify client about rejection
  await sendOrderUpdateNotification(
    order.clientId,
    orderId,
    order.orderNumber,
    'CANCELLED'
  ).catch(err => console.error('[Order] Failed to send CANCELLED notification:', err));

  // Emit realtime update to client
  await emitSocketEvent(`user:${order.clientId}`, 'order:status:update', {
    orderId,
    orderNumber: order.orderNumber,
    status: 'REJECTED',
    reason: validatedData.reason,
  });

  await createAuditLog({
    action: AuditActions.ORDER_CANCELLED,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    actorType: 'MERCHANT',
    merchantId: validatedData.merchantId as string,
    orderId: orderId,
    description: `Order rejected by merchant: ${validatedData.reason}`,
  });

  return successResponse(updatedOrder, 'Order rejected and refund initiated');
}

/**
 * Handle order starting preparation
 */
async function handlePreparing(orderId: string, body: Record<string, unknown>, decoded: { userId: string; role: string }) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { kot: true },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  if (order.status !== 'MERCHANT_ACCEPTED') {
    return errorResponse('Order must be accepted first');
  }

  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: 'PREPARING',
      preparingAt: new Date(),
    },
  });

  // Update KOT status
  if (order.kot) {
    await db.kOT.update({
      where: { id: order.kot.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  // Notify client that order is being prepared
  await sendOrderUpdateNotification(
    order.clientId,
    orderId,
    order.orderNumber,
    'PREPARING'
  ).catch(err => console.error('[Order] Failed to send PREPARING notification:', err));

  // Emit realtime update to client
  await emitSocketEvent(`user:${order.clientId}`, 'order:status:update', {
    orderId,
    orderNumber: order.orderNumber,
    status: 'PREPARING',
    estimatedPrepTime: order.kot?.estimatedPrepTime || 15,
  });

  await createAuditLog({
    action: AuditActions.ORDER_PREPARING,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    actorType: 'MERCHANT',
    orderId: orderId,
    description: 'Order preparation started',
  });

  return successResponse(updatedOrder, 'Order preparation started');
}

/**
 * Handle order ready for pickup - creates FOOD_DELIVERY task and dispatches rider
 */
async function handleReady(orderId: string, body: Record<string, unknown>, decoded: { userId: string; role: string }) {
  const validatedData = readySchema.parse(body);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { kot: true, merchant: true },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  if (order.status !== 'PREPARING') {
    return errorResponse('Order must be in PREPARING status');
  }

  // Check if a task already exists for this order
  const existingTask = await db.task.findUnique({
    where: { orderId: orderId },
  });

  // Update order and KOT
  // Build the batch conditionally: $transaction([...]) takes PrismaPromises
  // only, and a `Promise.resolve(null)` placeholder is not one.
  const orderUpdate = db.order.update({
    where: { id: orderId },
    data: {
      status: 'READY_FOR_PICKUP',
      readyAt: new Date(),
    },
  });

  const [updatedOrder] = order.kot
    ? await db.$transaction([
        orderUpdate,
        db.kOT.update({
          where: { id: order.kot.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        }),
      ])
    : await db.$transaction([orderUpdate]);

  // Create FOOD_DELIVERY task and dispatch rider if no task exists yet
  let task = existingTask;
  if (!existingTask) {
    const merchantAddress = order.merchant?.address || 'Merchant Location';
    const merchantLat = order.merchant?.latitude || 0.347596; // Default Kampala
    const merchantLng = order.merchant?.longitude || 32.582520;

    // Calculate distance from merchant to delivery location
    const deliveryLat = order.deliveryLatitude || 0.347596;
    const deliveryLng = order.deliveryLongitude || 32.582520;
    const distanceKm = calculateDistance(merchantLat, merchantLng, deliveryLat, deliveryLng);

    // Use the order's type to determine task type
    const taskType = order.orderType === 'SHOPPING' ? 'SHOPPING' as const : 'FOOD_DELIVERY' as const;

    // Calculate pricing for delivery
    const pricing = calculatePricing({
      taskType,
      distanceKm,
    });

    // Create the delivery task
    task = await db.task.create({
      data: {
        taskNumber: await nextTaskNumber(db),
        taskType,
        clientId: order.clientId,
        orderId: orderId,
        status: 'CREATED',

        pickupAddress: merchantAddress,
        pickupLatitude: merchantLat,
        pickupLongitude: merchantLng,
        pickupContactName: order.merchant?.name || 'Merchant',
        pickupContactPhone: order.merchant?.phone || '',

        dropoffAddress: order.deliveryAddress,
        dropoffLatitude: deliveryLat,
        dropoffLongitude: deliveryLng,
        dropoffContactName: order.recipientName || null,
        dropoffContactPhone: order.recipientPhone || null,

        distanceKm,

        baseFare: pricing.baseFare,
        distanceFare: pricing.distanceFare,
        deliveryFee: pricing.deliveryFee,
        serviceFee: pricing.serviceFee,
        totalAmount: pricing.totalAmount,
        platformCommission: pricing.platformCommission,
        riderEarnings: pricing.riderEarnings,

        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,

        itemDescription: taskType === 'SHOPPING' ? `Shopping Order ${order.orderNumber}` : `Food Order ${order.orderNumber}`,
      },
    });

    await createAuditLog({
      action: AuditActions.TASK_CREATED,
      entityType: EntityTypes.TASK,
      entityId: task.id,
      actorType: 'SYSTEM',
      orderId: orderId,
      taskId: task.id,
      description: `Delivery task ${task.taskNumber} created for order ${order.orderNumber}`,
    });

    // Move task to MATCHING via state machine and auto-dispatch
    const matchResult = await EnhancedTaskStateMachine.transition(
      task.id,
      TaskStatus.MATCHING,
      { triggeredByType: 'SYSTEM', reason: 'Food/shopping order ready, starting dispatch' }
    );
    if (!matchResult.success) {
      console.error(`[Order] Failed to transition task ${task.id} to MATCHING:`, matchResult.error);
    }

    // Dispatch rider asynchronously - don't block the response
    const dispatchTaskType = order.orderType === 'SHOPPING' ? 'SHOPPING' as const : 'FOOD_DELIVERY' as const;
    DispatchService.findAndAssign({
      taskId: task.id,
      taskType: dispatchTaskType,
      pickupLatitude: merchantLat,
      pickupLongitude: merchantLng,
    }).then(async (result) => {
      if (result.success && result.match) {
        await createAuditLog({
          action: AuditActions.DISPATCH_ASSIGNED,
          entityType: EntityTypes.DISPATCH,
          entityId: result.match.id,
          actorType: 'SYSTEM',
          taskId: task!.id,
          description: `Dispatch match created for ${dispatchTaskType.toLowerCase()} task ${task!.taskNumber}, awaiting rider acceptance`,
        });
      } else if (result.noRidersAvailable) {
        // Transition to SEARCHING via state machine
        EnhancedTaskStateMachine.transition(
          task!.id,
          TaskStatus.SEARCHING,
          { triggeredByType: 'SYSTEM', reason: 'No riders available for order delivery' }
        ).catch(err => console.error('[Order] Failed to transition to SEARCHING:', err));
      }
    }).catch((error) => {
      console.error('[Order] Auto-dispatch error (non-blocking):', error);
    });
  }

  // Notify client that order is ready for pickup
  await sendOrderUpdateNotification(
    order.clientId,
    orderId,
    order.orderNumber,
    'READY_FOR_PICKUP'
  ).catch(err => console.error('[Order] Failed to send READY_FOR_PICKUP notification:', err));

  // Emit realtime update to client
  await emitSocketEvent(`user:${order.clientId}`, 'order:status:update', {
    orderId,
    orderNumber: order.orderNumber,
    status: 'READY_FOR_PICKUP',
    taskNumber: task?.taskNumber,
    message: 'Your order is ready for pickup. Searching for a rider...',
  });

  await createAuditLog({
    action: AuditActions.ORDER_READY,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    actorType: 'MERCHANT',
    merchantId: validatedData.merchantId as string,
    orderId: orderId,
    description: `Order ready for pickup. Delivery task ${task?.taskNumber || 'N/A'} created.`,
  });

  return successResponse({ order: updatedOrder, task }, 'Order ready for pickup. Delivery task created and rider dispatch started.');
}

/**
 * Handle rider pickup - updates both order and task
 */
async function handlePickup(orderId: string, body: Record<string, unknown>, decoded: { userId: string; role: string }) {
  const validatedData = pickupSchema.parse(body || {});

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { task: true },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  if (order.status !== 'READY_FOR_PICKUP') {
    return errorResponse('Order must be ready for pickup');
  }

  // Update order status
  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: 'PICKED_UP',
      pickedUpAt: new Date(),
    },
  });

  // Update task status via state machine if task exists
  if (order.task) {
    const pickupResult = await EnhancedTaskStateMachine.transition(
      order.task.id,
      TaskStatus.PICKED_UP,
      {
        riderId: validatedData.riderId || undefined,
        triggeredByType: validatedData.riderId ? 'RIDER' : 'SYSTEM',
        reason: 'Rider picked up food order',
      }
    );
    if (!pickupResult.success) {
      console.error(`[Order] Failed to transition task ${order.task.id} to PICKED_UP:`, pickupResult.error);
    }
  }

  // Notify client
  await sendOrderUpdateNotification(
    order.clientId,
    orderId,
    order.orderNumber,
    'PICKED_UP'
  ).catch(err => console.error('[Order] Failed to send PICKED_UP notification:', err));

  // Emit realtime update to client
  await emitSocketEvent(`user:${order.clientId}`, 'order:status:update', {
    orderId,
    orderNumber: order.orderNumber,
    status: 'PICKED_UP',
    message: 'Your order has been picked up by the rider and is on its way!',
  });

  await createAuditLog({
    action: AuditActions.ORDER_PICKED_UP,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    actorType: 'RIDER',
    orderId: orderId,
    description: 'Order picked up by rider',
  });

  return successResponse(updatedOrder, 'Order picked up');
}

/**
 * Handle delivery confirmation - updates both order and task
 */
async function handleDeliver(orderId: string, body: Record<string, unknown>, decoded: { userId: string; role: string }) {
  const validatedData = deliverSchema.parse(body || {});

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { task: true },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  if (order.status !== 'PICKED_UP') {
    return errorResponse('Order must be picked up before delivery');
  }

  // Update order status
  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  });

  // Update task status via state machine if task exists
  if (order.task) {
    const deliverResult = await EnhancedTaskStateMachine.transition(
      order.task.id,
      TaskStatus.DELIVERED,
      {
        riderId: validatedData.riderId || undefined,
        triggeredByType: validatedData.riderId ? 'RIDER' : 'SYSTEM',
        reason: 'Food order delivered to customer',
      }
    );
    if (!deliverResult.success) {
      console.error(`[Order] Failed to transition task ${order.task.id} to DELIVERED:`, deliverResult.error);
    }
  }

  // Notify client about delivery
  await sendOrderUpdateNotification(
    order.clientId,
    orderId,
    order.orderNumber,
    'DELIVERED'
  ).catch(err => console.error('[Order] Failed to send DELIVERED notification:', err));

  // Emit realtime update to client
  await emitSocketEvent(`user:${order.clientId}`, 'order:status:update', {
    orderId,
    orderNumber: order.orderNumber,
    status: 'DELIVERED',
    message: 'Your order has been delivered!',
  });

  await createAuditLog({
    action: AuditActions.ORDER_DELIVERED,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    actorType: 'RIDER',
    orderId: orderId,
    description: 'Order delivered to customer',
  });

  // Auto-generate + email the receipt for this delivered order (idempotent,
  // via the linked delivery task). Non-blocking.
  if (order.task?.id) {
    try {
      const receipt = await ensureReceiptForTask(order.task.id);
      if (receipt && !receipt.emailedAt) sendReceiptEmail(receipt.id).catch(() => {});
    } catch (err) {
      console.error('[Order] receipt generation failed (non-blocking):', err);
    }
  }

  return successResponse(updatedOrder, 'Order delivered successfully');
}

/**
 * Handle order cancellation by customer
 */
async function handleCancel(orderId: string, body: Record<string, unknown>, decoded: { userId: string; role: string }) {
  const cancelSchema = z.object({
    reason: z.string().min(3, 'Cancellation reason is required'),
    cancelledBy: z.enum(['CUSTOMER', 'MERCHANT', 'SYSTEM']).default('CUSTOMER'),
  });

  const validatedData = cancelSchema.parse(body);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { task: true },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  // Can only cancel if not yet delivered or already cancelled
  const cancellableStatuses = ['ORDER_CREATED', 'PAYMENT_CONFIRMED', 'MERCHANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'];
  if (!cancellableStatuses.includes(order.status)) {
    return errorResponse(`Order cannot be cancelled at status: ${order.status}`);
  }

  // Update order
  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: validatedData.reason,
    },
  });

  // Cancel the associated task via state machine if it exists
  if (order.task && !['COMPLETED', 'CANCELLED', 'CLOSED'].includes(order.task.status)) {
    const cancelResult = await EnhancedTaskStateMachine.transition(
      order.task.id,
      TaskStatus.CANCELLED,
      {
        triggeredByType: validatedData.cancelledBy === 'CUSTOMER' ? 'CLIENT' : validatedData.cancelledBy === 'MERCHANT' ? 'RIDER' : 'SYSTEM',
        reason: `Order cancelled: ${validatedData.reason}`,
        metadata: {
          cancellationCode: validatedData.cancelledBy === 'CUSTOMER' ? 'CUSTOMER_CANCELLED' : 'MERCHANT_CANCELLED',
          cancelledBy: validatedData.cancelledBy,
        },
      }
    );
    if (!cancelResult.success) {
      console.error(`[Order] Failed to transition task ${order.task.id} to CANCELLED:`, cancelResult.error);
    }
  }

  // Refund payment if already paid
  if (order.paymentStatus === 'COMPLETED') {
    await db.payment.updateMany({
      where: { orderId: orderId },
      data: { status: 'REFUNDED' },
    });
  }

  // Notify client about cancellation
  await sendOrderUpdateNotification(
    order.clientId,
    orderId,
    order.orderNumber,
    'CANCELLED'
  ).catch(err => console.error('[Order] Failed to send CANCELLED notification:', err));

  // Emit realtime update
  await emitSocketEvent(`user:${order.clientId}`, 'order:status:update', {
    orderId,
    orderNumber: order.orderNumber,
    status: 'CANCELLED',
    reason: validatedData.reason,
  });

  // If merchant should be notified
  if (order.merchantId) {
    const merchant = await db.merchant.findUnique({
      where: { id: order.merchantId },
      select: { phone: true },
    });
    const merchantUser = await db.user.findFirst({
      where: { role: 'MERCHANT', phone: merchant?.phone },
      select: { id: true },
    });
    if (merchantUser) {
      await emitSocketEvent(`user:${merchantUser.id}`, 'merchant:order:cancelled', {
        orderId,
        orderNumber: order.orderNumber,
        reason: validatedData.reason,
      });
    }
  }

  await createAuditLog({
    action: AuditActions.ORDER_CANCELLED,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    // cancelledBy is SYSTEM | MERCHANT | CUSTOMER; ActorType has no
    // CUSTOMER member — the platform calls that role USER.
    actorType: validatedData.cancelledBy === 'CUSTOMER' ? 'USER' : validatedData.cancelledBy,
    orderId: orderId,
    description: `Order cancelled by ${validatedData.cancelledBy}: ${validatedData.reason}`,
  });

  return successResponse(updatedOrder, 'Order cancelled');
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

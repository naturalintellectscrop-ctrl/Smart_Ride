import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import {
  generateKOTNumber,
  generateTaskNumber,
} from '@/lib/services/enhanced-task-state-machine.service';
import { sendOrderUpdateNotification } from '@/lib/services/notification.service';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { calculatePricing } from '@/lib/api/pricing';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * Emit a socket event to a specific room via the realtime service
 */
async function emitSocketEvent(room: string, event: string, data: Record<string, unknown>): Promise<void> {
  try {
    const socketPort = process.env.SOCKET_PORT || '3002';
    const internalKey = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
    await fetch(`http://localhost:${socketPort}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({ room, event, data }),
    });
  } catch {
    // Socket service might not be running - don't fail the request
    console.log('[Orders] Socket emission skipped (service unavailable)');
  }
}

/**
 * GET /api/orders/[id]
 * Get a specific order by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        merchant: true,
        client: {
          select: { id: true, name: true, phone: true, email: true },
        },
        items: true,
        kot: true,
        task: {
          include: {
            rider: {
              select: { id: true, fullName: true, phone: true, riderRole: true },
            },
          },
        },
      },
    });

    if (!order) {
      return notFoundResponse('Order');
    }

    return successResponse(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return serverErrorResponse('Failed to fetch order');
  }
}

/**
 * PATCH /api/orders/[id]
 * Update order status (for merchant workflow + rider delivery)
 * Actions: confirm-payment, accept, reject, preparing, ready, pickup, deliver, cancel
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'confirm-payment':
        return handleConfirmPayment(id, body);
      case 'accept':
        return handleAccept(id, body);
      case 'reject':
        return handleReject(id, body);
      case 'preparing':
        return handlePreparing(id, body);
      case 'ready':
        return handleReady(id, body);
      case 'pickup':
        return handlePickup(id, body);
      case 'deliver':
        return handleDeliver(id, body);
      case 'cancel':
        return handleCancel(id, body);
      default:
        return errorResponse('Invalid action. Use: confirm-payment, accept, reject, preparing, ready, pickup, deliver, or cancel');
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return serverErrorResponse('Failed to update order');
  }
}

/**
 * Handle payment confirmation - creates KOT, notifies merchant and client
 */
async function handleConfirmPayment(orderId: string, body: Record<string, unknown>) {
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
async function handleAccept(orderId: string, body: Record<string, unknown>) {
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
async function handleReject(orderId: string, body: Record<string, unknown>) {
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
async function handlePreparing(orderId: string, body: Record<string, unknown>) {
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
async function handleReady(orderId: string, body: Record<string, unknown>) {
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
  const [updatedOrder, _] = await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status: 'READY_FOR_PICKUP',
        readyAt: new Date(),
      },
    }),
    order.kot ? db.kOT.update({
      where: { id: order.kot.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    }) : Promise.resolve(null),
  ]);

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

    // Calculate pricing for delivery
    const pricing = calculatePricing({
      taskType: 'FOOD_DELIVERY',
      distanceKm,
    });

    // Create the delivery task
    task = await db.task.create({
      data: {
        taskNumber: generateTaskNumber(),
        taskType: 'FOOD_DELIVERY',
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

        itemDescription: `Food Order ${order.orderNumber}`,
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

    // Move task to MATCHING and auto-dispatch
    await db.task.update({
      where: { id: task.id },
      data: {
        status: 'MATCHING',
        matchingStartedAt: new Date(),
      },
    });

    // Dispatch rider asynchronously - don't block the response
    DispatchService.findAndAssign({
      taskId: task.id,
      taskType: 'FOOD_DELIVERY',
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
          description: `Dispatch match created for food delivery task ${task!.taskNumber}, awaiting rider acceptance`,
        });
      } else if (result.noRidersAvailable) {
        await db.task.update({
          where: { id: task!.id },
          data: { status: 'SEARCHING' },
        });
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
async function handlePickup(orderId: string, body: Record<string, unknown>) {
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

  // Update task status if it exists
  if (order.task) {
    await db.task.update({
      where: { id: order.task.id },
      data: {
        status: 'PICKED_UP',
        pickedUpAt: new Date(),
      },
    });

    // Create task state transition
    await db.taskStateTransition.create({
      data: {
        taskId: order.task.id,
        fromStatus: order.task.status,
        toStatus: 'PICKED_UP',
        changedBy: validatedData.riderId || 'SYSTEM',
        changeReason: 'Rider picked up food order',
      },
    }).catch(() => {/* Ignore if transition record fails */});
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
async function handleDeliver(orderId: string, body: Record<string, unknown>) {
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

  // Update task status if it exists
  if (order.task) {
    await db.task.update({
      where: { id: order.task.id },
      data: {
        status: 'DELIVERED',
        deliveringAt: new Date(),
      },
    });

    // Create task state transition
    await db.taskStateTransition.create({
      data: {
        taskId: order.task.id,
        fromStatus: order.task.status,
        toStatus: 'DELIVERED',
        changedBy: validatedData.riderId || 'SYSTEM',
        changeReason: 'Food order delivered to customer',
      },
    }).catch(() => {/* Ignore if transition record fails */});
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

  return successResponse(updatedOrder, 'Order delivered successfully');
}

/**
 * Handle order cancellation by customer
 */
async function handleCancel(orderId: string, body: Record<string, unknown>) {
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

  // Cancel the associated task if it exists
  if (order.task && !['COMPLETED', 'CANCELLED', 'CLOSED'].includes(order.task.status)) {
    await db.task.update({
      where: { id: order.task.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: `Order cancelled: ${validatedData.reason}`,
        cancellationCode: validatedData.cancelledBy === 'CUSTOMER' ? 'CUSTOMER_CANCELLED' : 'MERCHANT_CANCELLED',
      },
    });
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
    actorType: validatedData.cancelledBy,
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

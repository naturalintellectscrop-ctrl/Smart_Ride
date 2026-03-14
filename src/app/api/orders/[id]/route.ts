import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { generateKOTNumber } from '@/lib/api/state-machine';
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
 * Update order status (for merchant workflow)
 * Actions: confirm-payment, accept, reject, preparing, ready
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
      default:
        return errorResponse('Invalid action. Use: confirm-payment, accept, reject, preparing, ready, or pickup');
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return serverErrorResponse('Failed to update order');
  }
}

/**
 * Handle payment confirmation - creates KOT
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
        merchantId: order.merchantId,
        items: JSON.stringify(order.items),
        specialInstructions: order.items.map(i => i.specialInstructions).filter(Boolean).join('; ') || null,
        estimatedPrepTime: order.merchant.averagePrepTime,
        status: 'GENERATED',
      },
    }),
  ]);

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

  await createAuditLog({
    action: AuditActions.ORDER_ACCEPTED,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    actorType: 'MERCHANT',
    merchantId: validatedData.merchantId as string,
    orderId: orderId,
    description: `Order accepted by merchant. Estimated prep: ${validatedData.estimatedPrepTime || order.merchant?.averagePrepTime || 15} mins`,
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
 * Handle order ready for pickup - creates delivery task
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

  // Update order and KOT, create delivery task
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

  await createAuditLog({
    action: AuditActions.ORDER_READY,
    entityType: EntityTypes.ORDER,
    entityId: orderId,
    actorType: 'MERCHANT',
    merchantId: validatedData.merchantId as string,
    orderId: orderId,
    description: 'Order ready for pickup. Delivery task will be created.',
  });

  // Note: In a real system, we would create a delivery task here
  // and start the rider matching process

  return successResponse(updatedOrder, 'Order ready for pickup');
}

/**
 * Handle rider pickup
 */
async function handlePickup(orderId: string, body: Record<string, unknown>) {
  const order = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return notFoundResponse('Order');
  }

  if (order.status !== 'READY_FOR_PICKUP') {
    return errorResponse('Order must be ready for pickup');
  }

  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: 'PICKED_UP',
      pickedUpAt: new Date(),
    },
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

/**
 * Health provider (pharmacy) orders.
 *
 * SECURITY: none of the three handlers in this file authenticated the caller,
 * and all of them ran under setServiceRoleContext(), which elevates past RLS.
 * `providerId` came from the query string, so an anonymous request could list
 * any pharmacy's order book — patient names, phone numbers, delivery
 * addresses and what medicine each person ordered. PATCH could also advance
 * another pharmacy's orders.
 *
 * Every handler now authenticates first, and the provider is resolved from the
 * caller's own account rather than from the request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { enumParam, requireEnumParam } from '@/lib/api/enum-params';
import { ProviderOrderStatus, HealthOrderType } from '@prisma/client';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import {
  dispatchProviderOrder,
  settleProviderOrderDelivery,
} from '@/lib/health/provider-order-delivery';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Resolve which provider this caller may act for.
 *
 * Returns the allowed providerId, or a response to send instead. An admin may
 * name any provider; anyone else gets their own and only their own, and asking
 * for someone else's is refused outright rather than silently redirected — a
 * pharmacy that requests a competitor's order book should be told no.
 */
async function resolveProvider(
  request: NextRequest,
  requestedId: string | null
): Promise<{ providerId: string } | { error: NextResponse }> {
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return {
      error: NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: auth.statusCode || 401 }
      ),
    };
  }

  if (isAdmin(auth.user.role)) {
    if (!requestedId) {
      return {
        error: NextResponse.json(
          { success: false, error: 'providerId is required' },
          { status: 400 }
        ),
      };
    }
    return { providerId: requestedId };
  }

  const own = await db.healthProvider.findUnique({
    where: { userId: auth.user.userId },
    select: { id: true },
  });
  if (!own) {
    return {
      error: NextResponse.json(
        { success: false, error: 'No health provider account for this user' },
        { status: 403 }
      ),
    };
  }
  if (requestedId && requestedId !== own.id) {
    return {
      error: NextResponse.json(
        { success: false, error: 'These orders belong to another provider' },
        { status: 403 }
      ),
    };
  }
  return { providerId: own.id };
}

// GET /api/health-provider/orders - Get orders for provider
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resolved = await resolveProvider(request, searchParams.get('providerId'));
  if ('error' in resolved) return resolved.error;

  await setServiceRoleContext();
  try {
    const providerId = resolved.providerId;
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!providerId) {
      return NextResponse.json({ success: false, error: 'providerId is required' },
        { status: 400 }
      );
    }

    const where: Prisma.ProviderOrderWhereInput = { providerId };
    // Unrecognised filter values are dropped rather than thrown by Prisma.
    const statusFilter = enumParam(ProviderOrderStatus, status);
    if (statusFilter) where.status = statusFilter;
    const typeFilter = enumParam(HealthOrderType, orderType);
    if (typeFilter) where.orderType = typeFilter;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const orders = await db.providerOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.providerOrder.count({ where });

    // Get order statistics
    const stats = await db.providerOrder.aggregate({
      where: { providerId },
      _count: true,
      _sum: {
        totalAmount: true,
        providerEarnings: true,
      },
    });

    const statusCounts = await db.providerOrder.groupBy({
      by: ['status'],
      where: { providerId },
      _count: true,
    });

    // Get pending prescription verifications
    const pendingPrescriptions = await db.providerOrder.count({
      where: {
        providerId,
        orderType: 'PRESCRIPTION_MEDICINE',
        prescriptionVerified: false,
        status: 'ORDER_RECEIVED',
      },
    });

    return NextResponse.json({
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + orders.length < total,
      },
      stats: {
        totalOrders: stats._count,
        totalRevenue: stats._sum.totalAmount || 0,
        totalEarnings: stats._sum.providerEarnings || 0,
        statusCounts: statusCounts.reduce((acc, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {} as Record<string, number>),
        pendingPrescriptions,
      },
    });
  } catch (error) {
    console.error('Error fetching provider orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST /api/health-provider/orders - Create new order
export async function POST(request: NextRequest) {
  // Placing an order committed a named customer to a purchase. Unauthenticated,
  // anyone could create orders in someone else's name at any pharmacy.
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.statusCode || 401 }
    );
  }
  const caller = auth.user;

  await setServiceRoleContext();
  try {
    const body = await request.json();

    const healthOrderSchema = z.object({
      providerId: z.string().min(1),
      customerId: z.string().min(1),
      customerName: z.string().max(200).optional(),
      customerPhone: z.string().max(20).optional(),
      // Required: ProviderOrder.orderType is non-nullable.
      orderType: z.enum(['OTC_MEDICINE', 'PRESCRIPTION_MEDICINE', 'HEALTH_CONSULTATION']),
      prescriptionId: z.string().optional(),
      items: z.union([
        z.string(),
        z.array(z.object({
          price: z.number().positive(),
          quantity: z.number().int().positive(),
        }).passthrough()),
      ]),
      deliveryAddress: z.string().min(1),
      deliveryLatitude: z.number().min(-90).max(90).optional(),
      deliveryLongitude: z.number().min(-180).max(180).optional(),
      deliveryInstructions: z.string().max(500).optional(),
      paymentMethod: z.string().min(1),
      customerNotes: z.string().max(500).optional(),
    });

    const parsed = healthOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const {
      providerId,
      customerId,
      customerName,
      customerPhone,
      orderType,
      prescriptionId,
      items,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      deliveryInstructions,
      paymentMethod,
      customerNotes,
    } = parsed.data;

    // The order is placed for whoever is holding the token. An admin may place
    // one on a customer's behalf (phone orders); nobody else may name someone
    // other than themselves.
    if (customerId !== caller.userId && !isAdmin(caller.role)) {
      return NextResponse.json(
        { success: false, error: 'Cannot place an order on behalf of another customer' },
        { status: 403 }
      );
    }

    // Verify provider is active
    const provider = await db.healthProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider || provider.verificationStatus !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'Provider not found or not verified' },
        { status: 404 }
      );
    }

    // Calculate pricing
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    let subtotal = 0;
    
    for (const item of parsedItems) {
      subtotal += item.price * item.quantity;
    }

    const deliveryFee = provider.supportsDelivery ? 5000 : 0; // Base delivery fee
    const serviceFee = subtotal * 0.02; // 2% service fee
    const totalAmount = subtotal + deliveryFee + serviceFee;
    const providerEarnings = subtotal * (1 - provider.commissionRate);

    // Generate order number
    const orderNumber = `HPO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create order
    const order = await db.providerOrder.create({
      data: {
        orderNumber,
        providerId,
        customerId,
        customerName,
        customerPhone,
        orderType,
        prescriptionId,
        items: typeof items === 'string' ? items : JSON.stringify(items),
        subtotal,
        deliveryFee,
        serviceFee,
        totalAmount,
        providerEarnings,
        deliveryAddress,
        deliveryLatitude,
        deliveryLongitude,
        deliveryInstructions,
        paymentMethod,
        paymentStatus: 'PENDING',
        status: 'ORDER_RECEIVED',
        // customerNotes maps to the order's provider-visible note field.
        providerNotes: customerNotes,
      },
    });

    // Log to fraud detection
    await fetch('/api/fraud/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'HEALTH_PROVIDER',
        entityId: providerId,
        activityType: 'ORDER_CREATED',
        activityCategory: 'TRANSACTION',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderType,
          totalAmount,
          itemCount: parsedItems.length,
        },
      }),
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'USER',
        userId: customerId,
        action: 'ORDER_CREATED',
        entityType: 'ProviderOrder',
        entityId: order.id,
        description: `Health order created: ${orderNumber}`,
      },
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// PATCH /api/health-provider/orders - Update order status
export async function PATCH(request: NextRequest) {
  // Unauthenticated, this drove another pharmacy's order book — including
  // VERIFY_PRESCRIPTION, which is the control that says a pharmacist checked a
  // prescription before medicine was dispensed against it.
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Authentication required' },
      { status: auth.statusCode || 401 }
    );
  }
  const caller = auth.user;

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { orderId, action, notes, rejectionReason, riderId } = body;

    if (!orderId || !action) {
      return NextResponse.json({ success: false, error: 'orderId and action are required' },
        { status: 400 }
      );
    }

    const order = await db.providerOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // The order must belong to the caller's own pharmacy.
    if (!isAdmin(caller.role)) {
      const own = await db.healthProvider.findUnique({
        where: { userId: caller.userId },
        select: { id: true },
      });
      if (!own || own.id !== order.providerId) {
        return NextResponse.json(
          { success: false, error: 'This order belongs to another provider' },
          { status: 403 }
        );
      }
    }

    // ── PHARM-2: an action has to be legal from where the order actually is ──
    //
    // The switch below maps an action straight onto a new status. Nothing ever
    // read `order.status`, so any action applied from any state: an order at
    // READY_FOR_PICKUP accepted ACCEPT and went backwards to ACCEPTED
    // (reproduced against production), a DELIVERED order could be re-accepted,
    // a CANCELLED one could be marched forward again, and DELIVER on an
    // already-delivered order re-stamped deliveredAt and paymentStatus.
    //
    // ProviderOrder has no state machine anywhere — ProviderOrderStatus is
    // referenced only in this file — so this is the FIRST definition of that
    // lifecycle, not a second one competing with an existing authority. It
    // stays next to the switch it guards, which is the only code that moves a
    // provider order.
    const LEGAL_FROM: Record<string, ProviderOrderStatus[]> = {
      ACCEPT: ['ORDER_RECEIVED'],
      REJECT: ['ORDER_RECEIVED'],
      START_PREPARING: ['ACCEPTED'],
      READY: ['PREPARING'],
      ASSIGN_RIDER: ['READY_FOR_PICKUP'],
      PICKED_UP: ['READY_FOR_PICKUP', 'RIDER_ASSIGNED'],
      DELIVER: ['OUT_FOR_DELIVERY'],
      // Cancellable right up until the courier has it.
      CANCEL: ['ORDER_RECEIVED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED'],
    };

    // Prescription decisions do not move the order; they are legal while it is
    // still live, and meaningless once it has finished.
    const TERMINAL: ProviderOrderStatus[] = ['DELIVERED', 'CANCELLED', 'REJECTED'];

    const allowedFrom = LEGAL_FROM[action];
    if (allowedFrom && !allowedFrom.includes(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot ${action} an order that is ${order.status}`,
        },
        { status: 409 }
      );
    }
    if (!allowedFrom && TERMINAL.includes(order.status)) {
      return NextResponse.json(
        { success: false, error: `This order is already ${order.status}` },
        { status: 409 }
      );
    }

    const updateData: Prisma.ProviderOrderUpdateInput = {};
    const now = new Date();

    switch (action) {
      case 'ACCEPT':
        updateData.status = 'ACCEPTED';
        updateData.acceptedAt = now;
        break;

      case 'VERIFY_PRESCRIPTION':
        updateData.prescriptionVerified = true;
        updateData.prescriptionVerifiedAt = now;
        break;

      case 'REJECT_PRESCRIPTION':
        updateData.prescriptionVerified = false;
        updateData.prescriptionRejectedReason = rejectionReason;
        break;

      case 'START_PREPARING':
        updateData.status = 'PREPARING';
        updateData.preparingAt = now;
        break;

      case 'READY':
        updateData.status = 'READY_FOR_PICKUP';
        updateData.readyAt = now;
        break;

      case 'ASSIGN_RIDER':
        updateData.status = 'RIDER_ASSIGNED';
        updateData.riderId = riderId;
        updateData.riderAssignedAt = now;
        break;

      case 'PICKED_UP':
        updateData.status = 'OUT_FOR_DELIVERY';
        updateData.pickedUpAt = now;
        break;

      case 'DELIVER': {
        // Settlement lives in one place so the pharmacy cannot be paid twice
        // for one order — once here and once when the courier's task
        // completes. settleProviderOrderDelivery claims the row with a
        // conditional update and only then moves money.
        const settled = await settleProviderOrderDelivery(orderId, {
          riderId: riderId ?? order.riderId,
        });
        if (!settled.settled) {
          return NextResponse.json(
            { success: false, error: 'This order is already DELIVERED' },
            { status: 409 }
          );
        }
        const delivered = await db.providerOrder.findUnique({ where: { id: orderId } });
        return NextResponse.json({ success: true, order: delivered });
      }

      case 'CANCEL':
        updateData.status = 'CANCELLED';
        updateData.cancelledAt = now;
        updateData.cancellationReason = rejectionReason;
        break;

      case 'REJECT':
        updateData.status = 'REJECTED';
        updateData.cancelledAt = now;
        updateData.cancellationReason = rejectionReason;
        break;

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (notes) {
      updateData.providerNotes = notes;
    }

    const updatedOrder = await db.providerOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    // ── PHARM-8: a ready pharmacy order now asks for a courier ──────────────
    //
    // This is the step the pharmacy chain was missing entirely. The merchant
    // flow has done it since it was written (orders/[id] handleReady), so a
    // food order that goes READY starts a rider search; a pharmacy order that
    // went READY simply stopped, and the prepared medicine sat on the counter
    // with nothing on the platform asking for it to be moved.
    //
    // Deliberately not awaited for its result beyond task creation: the
    // pharmacist's "Mark ready" has already succeeded and must not fail
    // because no rider happens to be online.
    let deliveryTask: { taskId?: string; taskNumber?: string } | undefined;
    if (action === 'READY') {
      const dispatch = await dispatchProviderOrder(orderId);
      if (dispatch.taskId) {
        deliveryTask = { taskId: dispatch.taskId, taskNumber: dispatch.taskNumber };
      } else if (dispatch.reason && dispatch.reason !== 'Order is not a delivery') {
        console.error(`[HealthProviderOrders] dispatch for ${orderId}: ${dispatch.reason}`);
      }
    }

    if (action === 'CANCEL' || action === 'REJECT') {
      await db.healthProvider.update({
        where: { id: order.providerId },
        data: {
          totalOrders: { increment: 1 },
          cancelledOrders: { increment: 1 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      deliveryTask,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

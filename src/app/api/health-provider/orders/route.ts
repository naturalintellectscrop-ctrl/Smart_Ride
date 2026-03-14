import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/health-provider/orders - Get orders for provider
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const status = searchParams.get('status');
    const orderType = searchParams.get('orderType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!providerId) {
      return NextResponse.json(
        { error: 'providerId is required' },
        { status: 400 }
      );
    }

    const where: any = { providerId };
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
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
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/health-provider/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    } = body;

    // Validate required fields
    if (!providerId || !customerId || !items || !deliveryAddress || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify provider is active
    const provider = await db.healthProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider || provider.verificationStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Provider not found or not verified' },
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
        customerNotes,
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
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// PATCH /api/health-provider/orders - Update order status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, action, notes, rejectionReason, riderId } = body;

    if (!orderId || !action) {
      return NextResponse.json(
        { error: 'orderId and action are required' },
        { status: 400 }
      );
    }

    const order = await db.providerOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    const now = new Date();

    switch (action) {
      case 'ACCEPT':
        updateData.status = 'ORDER_ACCEPTED';
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

      case 'DELIVER':
        updateData.status = 'DELIVERED';
        updateData.deliveredAt = now;
        updateData.paymentStatus = 'COMPLETED';
        break;

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
        return NextResponse.json(
          { error: 'Invalid action' },
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

    // Update provider stats if order completed
    if (action === 'DELIVER') {
      await db.healthProvider.update({
        where: { id: order.providerId },
        data: {
          totalOrders: { increment: 1 },
          completedOrders: { increment: 1 },
          totalEarnings: { increment: order.providerEarnings },
        },
      });
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
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

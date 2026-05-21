import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  serverErrorResponse,
  paginatedResponse,
  getPaginationParams 
} from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { generateOrderNumber, generateKOTNumber } from '@/lib/services/enhanced-task-state-machine.service';
import { OrderType, OrderStatus, PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, isAdmin } from '@/lib/auth/guards';

/**
 * GET /api/orders
 * List all orders with pagination
 * SECURITY: Requires authentication. Non-admins see only their own orders.
 */
export async function GET(request: NextRequest) {
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

    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const orderType = searchParams.get('orderType');
    const status = searchParams.get('status');
    const merchantId = searchParams.get('merchantId');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    // SECURITY: Non-admin users can only see their own orders (or merchant's orders)
    if (!isAdmin(user.role)) {
      if (user.role === 'MERCHANT' || user.role === 'PHARMACIST') {
        // Merchants can see orders for their business
        const merchant = await db.merchant.findFirst({
          where: { userId: user.userId },
          select: { id: true },
        });
        if (merchant) {
          where.merchantId = merchant.id;
        } else {
          return paginatedResponse([], page, limit, 0);
        }
      } else if (user.role === 'RIDER') {
        // Riders can see orders assigned to them
        const rider = await db.rider.findUnique({
          where: { userId: user.userId },
          select: { id: true },
        });
        if (rider) {
          where.riderId = rider.id;
        } else {
          return paginatedResponse([], page, limit, 0);
        }
      } else {
        // Clients see their own orders
        where.clientId = user.userId;
      }
    }
    
    if (orderType) where.orderType = orderType;
    if (status) where.status = status;
    if (merchantId && isAdmin(user.role)) where.merchantId = merchantId;
    if (clientId && isAdmin(user.role)) where.clientId = clientId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: {
            select: { id: true, name: true, type: true },
          },
          client: {
            select: { id: true, name: true, phone: true },
          },
          items: true,
          kot: true,
          task: {
            select: { id: true, taskNumber: true, status: true, rider: { select: { fullName: true } } },
          },
        },
      }),
      db.order.count({ where }),
    ]);

    return paginatedResponse(orders, page, limit, total);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return serverErrorResponse('Failed to fetch orders');
  }
}

// Order creation schema
const createOrderSchema = z.object({
  clientId: z.string(),
  merchantId: z.string(),
  orderType: z.enum(['FOOD_DELIVERY', 'SHOPPING']),
  items: z.array(z.object({
    menuItemId: z.string().optional(),
    itemName: z.string(),
    itemDescription: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    specialInstructions: z.string().optional(),
  })),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  serviceFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY_MTN', 'MOBILE_MONEY_AIRTEL', 'VISA', 'MASTERCARD', 'CREDIT_CARD', 'DEBIT_CARD']),
  deliveryAddress: z.string(),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  deliveryInstructions: z.string().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
});

/**
 * POST /api/orders
 * Create a new order (Food Delivery or Shopping)
 * SECURITY: Requires authentication. Client must be the authenticated user.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // SECURITY: IDOR prevention - client must be the authenticated user
    // Admins can create orders for other users
    if (!isAdmin(user.role)) {
      if (validatedData.clientId !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'Cannot create orders for other users' },
          { status: 403 }
        );
      }
    }

    // Verify client exists
    const client = await db.user.findUnique({
      where: { id: validatedData.clientId },
    });
    if (!client) {
      return notFoundResponse('Client');
    }

    // Verify merchant exists and is open
    const merchant = await db.merchant.findUnique({
      where: { id: validatedData.merchantId },
    });
    if (!merchant) {
      return notFoundResponse('Merchant');
    }
    if (merchant.status !== 'APPROVED') {
      return errorResponse('Merchant is not active');
    }

    // Create order with items
    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        orderType: validatedData.orderType as OrderType,
        clientId: validatedData.clientId,
        merchantId: validatedData.merchantId,
        status: 'ORDER_CREATED',
        subtotal: validatedData.subtotal,
        deliveryFee: validatedData.deliveryFee,
        serviceFee: validatedData.serviceFee || 0,
        discount: validatedData.discount || 0,
        totalAmount: validatedData.totalAmount,
        paymentMethod: validatedData.paymentMethod,
        paymentStatus: 'PENDING',
        deliveryAddress: validatedData.deliveryAddress,
        deliveryLatitude: validatedData.deliveryLatitude || null,
        deliveryLongitude: validatedData.deliveryLongitude || null,
        deliveryInstructions: validatedData.deliveryInstructions || null,
        recipientName: validatedData.recipientName || null,
        recipientPhone: validatedData.recipientPhone || null,
        items: {
          create: validatedData.items.map(item => ({
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            specialInstructions: item.specialInstructions,
          })),
        },
      },
      include: {
        items: true,
        merchant: true,
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.ORDER_CREATED,
      entityType: EntityTypes.ORDER,
      entityId: order.id,
      actorType: 'USER',
      userId: validatedData.clientId,
      orderId: order.id,
      description: `Order ${order.orderNumber} created for ${merchant.name}`,
    });

    return successResponse(order, 'Order created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error creating order:', error);
    return serverErrorResponse('Failed to create order');
  }
}

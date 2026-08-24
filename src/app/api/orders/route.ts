import { NextRequest, NextResponse } from 'next/server';
import { isProvider } from '@/lib/auth/jwt';
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
import { redactPerson } from '@/lib/privacy/public-contact';
import { resetRLSContext } from '@/lib/auth-utils';
import { quoteOrder, priceItemsFromCatalogue } from '@/lib/api/order-pricing';

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
      } else if (isProvider(user.role)) {
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
    // A merchant tab covers a phase, not a single status — "New" is everything
    // awaiting acceptance, "Preparing" is accepted-or-cooking. Accepting a
    // comma-separated list lets one request answer a tab; a single value still
    // behaves exactly as before.
    if (status) {
      const wanted = status.split(',').map(s => s.trim()).filter(Boolean);
      if (wanted.length > 1) where.status = { in: wanted };
      else if (wanted.length === 1) where.status = wanted[0];
    }
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
            select: { id: true, name: true },
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

    // PRIVACY: counterparties shown by first name only, never phone.
    for (const o of orders as Array<{ client?: Record<string, unknown>; task?: { rider?: Record<string, unknown> } }>) {
      redactPerson(o.client, 'name');
      if (o.task?.rider) redactPerson(o.task.rider, 'fullName');
    }

    return paginatedResponse(orders, page, limit, total);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return serverErrorResponse('Failed to fetch orders');
  } finally {
    await resetRLSContext();
  }
}

// Order creation schema
const createOrderSchema = z.object({
  // clientId is OPTIONAL — auto-filled from the auth token to prevent IDOR.
  clientId: z.string().optional(),
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
  // Money fields are accepted for backward compatibility with existing
  // clients but are NOT trusted — the server re-prices the order below via
  // quoteOrder and writes its own figures. A client cannot set its own
  // delivery fee or total.
  subtotal: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  serviceFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  // ── CASH is not a payment method for a merchant order ────────────────────
  //
  // A merchant order is three-sided: the customer owes for the goods AND the
  // delivery, the merchant is owed for the goods, and the courier is owed for
  // the trip. Cash puts the whole sum in the courier's hand at the door and
  // leaves the platform to chase them for the merchant's share — on the live
  // code that reconciliation did not exist, so a courier could collect the
  // customer's food money and nothing recorded that they were holding it.
  //
  // Business decision, 2026-08-24: merchant, food, retail and pharmacy orders
  // are collected up front by Smart Ride. The merchant is paid from money the
  // platform holds, and the courier is settled after delivery from that same
  // collected money. Rides are unaffected and keep cash — a ride is two-sided
  // and the existing cash settlement for it is verified.
  paymentMethod: z.enum(['MTN_MOMO', 'AIRTEL_MONEY', 'VISA', 'MASTERCARD', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET'], {
    message:
      'Cash on delivery is not available for merchant orders. Pay with mobile money, card or wallet.',
  }),
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

    // SECURITY: Auto-fill clientId from the auth token if not provided.
    // Prevents IDOR — non-admins cannot create orders for other users.
    const effectiveClientId = validatedData.clientId || user.userId;
    if (!isAdmin(user.role)) {
      if (validatedData.clientId && validatedData.clientId !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'Cannot create orders for other users' },
          { status: 403 }
        );
      }
    }

    // Verify client exists
    const client = await db.user.findUnique({
      where: { id: effectiveClientId },
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

    // Price every LINE from the merchant's catalogue before pricing the order.
    // The request's `unitPrice` is advisory only — it is used to detect a stale
    // cart, never to decide what is charged (BE-002).
    const priced = await priceItemsFromCatalogue(
      validatedData.merchantId,
      validatedData.items
    );

    if (priced.rejected.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some items are no longer available',
          code: 'ITEMS_UNAVAILABLE',
          // Per-item so the cart can mark exactly which lines to fix rather
          // than making the customer guess.
          items: priced.rejected,
        },
        { status: 409 }
      );
    }
    if (priced.items.length === 0) {
      return errorResponse('Order must contain at least one item');
    }

    // A price rise between building the cart and checking out means charging
    // more than the customer agreed to. Stop and let them re-confirm rather
    // than silently taking the difference.
    if (priced.increased.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prices have changed since you added these items',
          code: 'PRICE_CHANGED',
          items: priced.increased,
        },
        { status: 409 }
      );
    }

    // Price the order server-side. The request body's subtotal/fees/total are
    // ignored: this route used to write whatever the client sent, so a
    // modified client could zero its own delivery fee.
    const pricing = await quoteOrder({
      orderType: validatedData.orderType,
      items: priced.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      merchant: { latitude: (merchant as any).latitude, longitude: (merchant as any).longitude },
      delivery: {
        latitude: validatedData.deliveryLatitude,
        longitude: validatedData.deliveryLongitude,
      },
      discount: validatedData.discount,
    });

    // Create order + items atomically in a transaction.
    //
    // MERCH-7: this transaction also used to create the delivery Task and put
    // it straight into MATCHING. Three things were wrong with that, and the
    // third was fatal:
    //
    //  1. It dispatched before the merchant had accepted, so a courier could be
    //     offered a job for food nobody had agreed to cook.
    //  2. The task carried the WHOLE order total as its fare and no
    //     commission/earnings split at all, so the courier was owed nothing and
    //     the merchant's payout absorbed the customer's delivery and service
    //     fees.
    //  3. `handleReady` — the path that prices the courier leg and actually
    //     calls dispatch — is guarded by `if (!existingTask)`. A task already
    //     existing meant that block never ran, so no merchant order was EVER
    //     dispatched to a courier. Confirmed end to end against production:
    //     order placed, paid, accepted, prepared, marked ready — zero
    //     DispatchMatch rows, task still MATCHING, no rider.
    //
    // The task is created when the merchant marks the order ready, which is
    // the only point at which there is something to collect.
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          orderType: validatedData.orderType as OrderType,
          clientId: effectiveClientId,
          merchantId: validatedData.merchantId,
          status: 'ORDER_CREATED',
          subtotal: pricing.subtotal,
          deliveryFee: pricing.deliveryFee,
          serviceFee: pricing.serviceFee,
          discount: pricing.discount,
          totalAmount: pricing.totalAmount,
          paymentMethod: validatedData.paymentMethod,
          paymentStatus: 'PENDING',
          deliveryAddress: validatedData.deliveryAddress,
          deliveryLatitude: validatedData.deliveryLatitude || null,
          deliveryLongitude: validatedData.deliveryLongitude || null,
          deliveryInstructions: validatedData.deliveryInstructions || null,
          recipientName: validatedData.recipientName || null,
          recipientPhone: validatedData.recipientPhone || null,
          items: {
            // Catalogue values, not the request's. Name and description come
            // from the menu too: a client that could relabel a line could buy
            // a cheap item under an expensive item's name, which matters once
            // a human is picking the order.
            create: priced.items.map(item => ({
              menuItemId: item.menuItemId,
              itemName: item.itemName,
              itemDescription: item.itemDescription,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              specialInstructions: item.specialInstructions,
            })),
          },
        },
        include: {
          items: true,
          merchant: true,
        },
      });

      return { order };
    });

    const { order } = result;

    // Create audit log (outside transaction — non-critical)
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
      return errorResponse(zodError.issues[0]?.message || 'Validation error');
    }
    console.error('Error creating order:', error);
    return serverErrorResponse('Failed to create order');
  } finally {
    await resetRLSContext();
  }
}

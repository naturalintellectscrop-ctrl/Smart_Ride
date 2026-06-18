import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  paginatedResponse,
  getPaginationParams,
  unauthorizedResponse,
} from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { generateHealthOrderNumber, generatePOTNumber } from '@/lib/api/health-state-machine';
import { HealthOrderType, HealthOrderStatus, PaymentStatus } from '@prisma/client';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { z } from 'zod';

/**
 * GET /api/health-orders
 * List health orders with pagination.
 * SECURITY: Requires authentication. Non-admin users only see their own
 * orders (patient privacy). Admins can see all + filter by clientId.
 */
export async function GET(request: NextRequest) {
  // SECURITY: Require authentication.
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  // Admin roles can view all orders; everyone else is scoped to their own.
  const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN'];
  const isAdmin = adminRoles.includes(decoded.role);

  await setServiceRoleContext();
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const pharmacyId = searchParams.get('pharmacyId');
    const orderType = searchParams.get('orderType');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    // Non-admins are always scoped to their own orders, regardless of any
    // clientId query param they try to pass.
    if (!isAdmin) {
      where.clientId = decoded.userId;
    } else {
      const clientIdParam = searchParams.get('clientId');
      if (clientIdParam) where.clientId = clientIdParam;
    }

    if (status) where.status = status;
    if (pharmacyId) where.pharmacyId = pharmacyId;
    if (orderType) where.orderType = orderType;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.healthOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          pharmacy: {
            select: { id: true, merchantId: true },
          },
          prescription: {
            select: { id: true, prescriptionNumber: true, status: true },
          },
          items: true,
          pot: true,
          task: {
            select: { id: true, taskNumber: true, status: true, rider: { select: { fullName: true } } },
          },
        },
      }),
      db.healthOrder.count({ where }),
    ]);

    return paginatedResponse(orders, page, limit, total);
  } catch (error) {
    console.error('Error fetching health orders:', error);
    return serverErrorResponse('Failed to fetch health orders');
  } finally {
    await resetRLSContext();
  }
}

// Health order creation schema.
// SECURITY: clientId is NOT accepted from the body — it is derived from the
// authenticated user's JWT to prevent IDOR (creating orders on behalf of
// other users).
const createHealthOrderSchema = z.object({
  pharmacyId: z.string(),
  orderType: z.enum(['PRESCRIPTION_MEDICINE', 'OVER_THE_COUNTER']),
  
  // For prescription orders
  prescriptionId: z.string().optional(),
  doctorName: z.string().optional(),
  prescriptionNotes: z.string().optional(),
  
  // Items
  items: z.array(z.object({
    medicineCatalogId: z.string().optional(),
    medicineName: z.string(),
    medicineDescription: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    dosageInstructions: z.string().optional(),
    specialInstructions: z.string().optional(),
  })),
  
  // Pricing
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  serviceFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  
  // Payment
  paymentMethod: z.enum(['CASH', 'MTN_MOMO', 'AIRTEL_MONEY', 'VISA', 'MASTERCARD', 'CREDIT_CARD', 'DEBIT_CARD']),
  
  // Delivery
  deliveryAddress: z.string(),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  deliveryInstructions: z.string().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  
  // Handling
  isFragile: z.boolean().optional(),
  isTemperatureSensitive: z.boolean().optional(),
  handlingInstructions: z.string().optional(),
});

/**
 * POST /api/health-orders
 * Create a new health order
 * SECURITY: Requires authentication. clientId is derived from the JWT.
 */
export async function POST(request: NextRequest) {
  // SECURITY: Require authentication BEFORE any DB access.
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse('Authentication required');

  const decoded = verifyAccessToken(token);
  if (!decoded) return unauthorizedResponse('Invalid or expired token');

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validatedData = createHealthOrderSchema.parse(body);

    // Derive clientId from the JWT — never trust the request body.
    const clientId = decoded.userId;

    // Verify pharmacy exists and is open
    const pharmacy = await db.pharmacy.findUnique({
      where: { id: validatedData.pharmacyId },
    });
    
    if (!pharmacy) {
      return notFoundResponse('Pharmacy');
    }
    if (pharmacy.status !== 'APPROVED') {
      return errorResponse('Pharmacy is not active');
    }
    if (!pharmacy.isOpen) {
      return errorResponse('Pharmacy is currently closed');
    }

    // For prescription orders, verify prescription exists
    if (validatedData.orderType === 'PRESCRIPTION_MEDICINE' && validatedData.prescriptionId) {
      const prescription = await db.prescription.findUnique({
        where: { id: validatedData.prescriptionId },
      });
      if (!prescription) {
        return notFoundResponse('Prescription');
      }
      if (prescription.status === 'REJECTED' || prescription.status === 'EXPIRED') {
        return errorResponse('Prescription is not valid');
      }
    }

    // Create health order with items
    const order = await db.healthOrder.create({
      data: {
        orderNumber: generateHealthOrderNumber(),
        orderType: validatedData.orderType as HealthOrderType,
        clientId,
        pharmacyId: validatedData.pharmacyId,
        prescriptionId: validatedData.prescriptionId || null,
        status: validatedData.orderType === 'PRESCRIPTION_MEDICINE' ? 'PHARMACY_REVIEW' : 'ORDER_PLACED',
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
        isFragile: validatedData.isFragile || false,
        isTemperatureSensitive: validatedData.isTemperatureSensitive || false,
        handlingInstructions: validatedData.handlingInstructions || null,
        items: {
          create: validatedData.items.map(item => ({
            medicineCatalogId: item.medicineCatalogId,
            medicineName: item.medicineName,
            medicineDescription: item.medicineDescription,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            dosageInstructions: item.dosageInstructions,
            specialInstructions: item.specialInstructions,
          })),
        },
      },
      include: {
        items: true,
        pharmacy: true,
      },
    });

    // Create Pharmacy Order Ticket (POT)
    // NOTE: PharmacyOrderTicket schema does not have a pharmacyId column —
    // the pharmacy is reachable via healthOrder.pharmacyId. We intentionally
    // omit pharmacyId here.
    await db.pharmacyOrderTicket.create({
      data: {
        potNumber: generatePOTNumber(),
        healthOrderId: order.id,
        items: JSON.stringify(validatedData.items),
        prescriptionRef: validatedData.prescriptionId || null,
        preparationNotes: validatedData.prescriptionNotes || null,
        hasFragileItems: validatedData.isFragile || false,
        hasTemperatureSensitive: validatedData.isTemperatureSensitive || false,
        estimatedPrepTime: 15, // Default 15 minutes
      },
    });

    // Update pharmacy order count
    await db.pharmacy.update({
      where: { id: validatedData.pharmacyId },
      data: { totalOrders: { increment: 1 } },
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.ORDER_CREATED,
      entityType: 'HEALTH_ORDER',
      entityId: order.id,
      actorType: 'USER',
      userId: clientId,
      healthOrderId: order.id,
      description: `Health order ${order.orderNumber} created`,
    });

    return successResponse(order, 'Health order created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.issues[0]?.message || 'Validation error');
    }
    console.error('Error creating health order:', error);
    return serverErrorResponse('Failed to create health order');
  } finally {
    await resetRLSContext();
  }
}

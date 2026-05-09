import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  serverErrorResponse 
} from '@/lib/api/response';
import { createAuditLog, AuditActions } from '@/lib/api/audit';
import { 
  isValidHealthOrderTransition, 
  getRequiredRiderRoleForHealthDelivery 
} from '@/lib/api/health-state-machine';
import { calculatePricing } from '@/lib/api/pricing';
import { HealthOrderStatus, TaskStatus, TaskType } from '@prisma/client';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/health-orders/[id]
 * Get a specific health order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const order = await db.healthOrder.findUnique({
      where: { id },
      include: {
        pharmacy: true,
        prescription: true,
        items: {
          include: {
            medicineCatalog: {
              select: { id: true, name: true, category: true },
            },
          },
        },
        pot: true,
        task: {
          include: {
            rider: {
              select: { id: true, fullName: true, phone: true },
            },
          },
        },
        prescriptionAccessLogs: {
          select: { id: true, action: true, createdAt: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return notFoundResponse('Health order');
    }

    return successResponse(order);
  } catch (error) {
    console.error('Error fetching health order:', error);
    return serverErrorResponse('Failed to fetch health order');
  }
}

// Order status update schema
const updateStatusSchema = z.object({
  status: z.enum([
    'ORDER_PLACED', 'PHARMACY_REVIEW', 'PRESCRIPTION_VERIFIED', 
    'PREPARING_ORDER', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED'
  ]),
  actorId: z.string(),
  actorType: z.enum(['USER', 'PHARMACY_STAFF', 'ADMIN', 'SYSTEM']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

/**
 * PATCH /api/health-orders/[id]
 * Update health order status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateStatusSchema.parse(body);

    const order = await db.healthOrder.findUnique({
      where: { id },
      include: { pharmacy: true, items: true },
    });

    if (!order) {
      return notFoundResponse('Health order');
    }

    // Validate state transition
    if (!isValidHealthOrderTransition(order.status, validatedData.status as HealthOrderStatus)) {
      return errorResponse(`Cannot transition from ${order.status} to ${validatedData.status}`);
    }

    // Special handling for specific statuses
    const updateData: Record<string, unknown> = {
      status: validatedData.status,
    };

    switch (validatedData.status) {
      case 'PREPARING_ORDER':
        updateData.preparingAt = new Date();
        // Update POT status
        await db.pharmacyOrderTicket.updateMany({
          where: { healthOrderId: id },
          data: { status: 'IN_PROGRESS' },
        });
        break;
        
      case 'READY_FOR_PICKUP':
        updateData.readyAt = new Date();
        // Update POT status
        await db.pharmacyOrderTicket.updateMany({
          where: { healthOrderId: id },
          data: { status: 'COMPLETED' },
        });
        // Start rider matching process
        await startRiderMatching(id, order);
        break;
        
      case 'RIDER_ASSIGNED':
        updateData.readyAt = updateData.readyAt || order.readyAt;
        break;
        
      case 'OUT_FOR_DELIVERY':
        updateData.pickedUpAt = new Date();
        break;
        
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        updateData.paymentStatus = 'COMPLETED';
        break;
        
      case 'CANCELLED':
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = validatedData.notes;
        break;
        
      case 'REJECTED':
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = validatedData.rejectionReason;
        break;
    }

    // Update order
    const updatedOrder = await db.healthOrder.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.ORDER_UPDATED,
      entityType: 'HEALTH_ORDER',
      entityId: id,
      actorType: validatedData.actorType,
      userId: validatedData.actorType === 'USER' ? validatedData.actorId : undefined,
      healthOrderId: id,
      description: `Health order status changed from ${order.status} to ${validatedData.status}`,
      newValues: JSON.stringify({ status: validatedData.status }),
    });

    return successResponse(updatedOrder, 'Health order updated');
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error updating health order:', error);
    return serverErrorResponse('Failed to update health order');
  }
}

/**
 * Start rider matching for health order delivery
 */
async function startRiderMatching(healthOrderId: string, order: { id: string; deliveryAddress: string; pharmacy: { merchantId: string }; totalAmount: number; paymentMethod: string }) {
  try {
    // Get pharmacy location from merchant
    const merchant = await db.merchant.findUnique({
      where: { id: order.pharmacy.merchantId },
    });
    
    if (!merchant) return;

    // Create a delivery task
    const taskNumber = `TASK-${Date.now().toString(36).toUpperCase()}`;
    
    const task = await db.task.create({
      data: {
        taskNumber,
        taskType: 'SMART_HEALTH_DELIVERY',
        clientId: 'SYSTEM', // System creates this task
        healthOrderId: healthOrderId,
        status: 'MATCHING',
        matchingStartedAt: new Date(),
        
        pickupAddress: merchant.address,
        pickupLatitude: merchant.latitude,
        pickupLongitude: merchant.longitude,
        pickupContactName: merchant.name,
        pickupContactPhone: merchant.phone,
        
        dropoffAddress: order.deliveryAddress,
        dropoffLatitude: null, // Would be geocoded
        dropoffLongitude: null,
        
        // Calculate pricing
        baseFare: 2000,
        deliveryFee: 3000,
        totalAmount: 5000,
        platformCommission: 500,
        riderEarnings: 4500,
        
        paymentMethod: order.paymentMethod as 'CASH' | 'MOBILE_MONEY_MTN' | 'MOBILE_MONEY_AIRTEL' | 'VISA' | 'MASTERCARD' | 'CREDIT_CARD' | 'DEBIT_CARD',
        paymentStatus: 'PENDING',
        
        itemDescription: 'Pharmacy order delivery',
      },
    });

    // Find available delivery personnel nearby
    const availableRiders = await db.rider.findMany({
      where: {
        riderRole: 'DELIVERY_PERSONNEL',
        isOnline: true,
        status: 'APPROVED',
        connectionStatus: 'ACTIVE',
        currentTaskId: null,
      },
      take: 5,
    });

    // In production, we would send notifications to nearby riders
    // For now, we just update the task status
    if (availableRiders.length > 0) {
      // Auto-assign to first available rider for demo
      const assignedRider = availableRiders[0];
      
      await db.task.update({
        where: { id: task.id },
        data: {
          riderId: assignedRider.id,
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
      });
      
      // Update health order status
      await db.healthOrder.update({
        where: { id: healthOrderId },
        data: { status: 'RIDER_ASSIGNED' },
      });
    }
  } catch (error) {
    console.error('Error starting rider matching:', error);
  }
}

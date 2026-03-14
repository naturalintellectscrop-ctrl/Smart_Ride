import { NextRequest } from 'next/server';
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
import { 
  calculatePricing, 
} from '@/lib/api/pricing';
import { 
  generateTaskNumber,
  isValidTransition,
  canRiderPerformTask,
  CancellationReasonCode,
} from '@/lib/api/state-machine';
import { TaskType, TaskStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/tasks
 * List all tasks with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const taskType = searchParams.get('taskType');
    const status = searchParams.get('status');
    const riderId = searchParams.get('riderId');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    if (taskType) where.taskType = taskType;
    if (status) where.status = status;
    if (riderId) where.riderId = riderId;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { taskNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, name: true, phone: true },
          },
          rider: {
            select: { id: true, fullName: true, phone: true, riderRole: true },
          },
          order: true,
        },
      }),
      db.task.count({ where }),
    ]);

    return paginatedResponse(tasks, page, limit, total);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return serverErrorResponse('Failed to fetch tasks');
  }
}

// Task creation schema
const createTaskSchema = z.object({
  taskType: z.enum(['SMART_BODA_RIDE', 'SMART_CAR_RIDE', 'FOOD_DELIVERY', 'SHOPPING', 'ITEM_DELIVERY']),
  clientId: z.string(),
  
  // Location
  pickupAddress: z.string(),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  dropoffAddress: z.string(),
  dropoffLatitude: z.number().optional(),
  dropoffLongitude: z.number().optional(),
  
  // Distance (calculated or provided)
  distanceKm: z.number(),
  
  // Payment
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY_MTN', 'MOBILE_MONEY_AIRTEL', 'VISA', 'MASTERCARD', 'CREDIT_CARD', 'DEBIT_CARD']),
  
  // Optional details
  pickupContactName: z.string().optional(),
  pickupContactPhone: z.string().optional(),
  dropoffContactName: z.string().optional(),
  dropoffContactPhone: z.string().optional(),
  passengerCount: z.number().optional(),
  passengerNames: z.string().optional(),
  itemDescription: z.string().optional(),
  itemWeight: z.number().optional(),
  itemValue: z.number().optional(),
  orderId: z.string().optional(),
  
  // Pricing override (optional)
  customPricing: z.object({
    baseFare: z.number(),
    totalAmount: z.number(),
  }).optional(),
});

/**
 * POST /api/tasks
 * Create a new task (ride, delivery, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Verify client exists
    const client = await db.user.findUnique({
      where: { id: validatedData.clientId },
    });

    if (!client) {
      return notFoundResponse('Client');
    }

    // Calculate pricing
    const pricing = calculatePricing({
      taskType: validatedData.taskType as TaskType,
      distanceKm: validatedData.distanceKm,
      itemWeight: validatedData.itemWeight,
    });

    // Create task
    const task = await db.task.create({
      data: {
        taskNumber: generateTaskNumber(),
        taskType: validatedData.taskType as TaskType,
        clientId: validatedData.clientId,
        orderId: validatedData.orderId || null,
        status: 'CREATED',
        
        pickupAddress: validatedData.pickupAddress,
        pickupLatitude: validatedData.pickupLatitude || null,
        pickupLongitude: validatedData.pickupLongitude || null,
        pickupContactName: validatedData.pickupContactName || null,
        pickupContactPhone: validatedData.pickupContactPhone || null,
        
        dropoffAddress: validatedData.dropoffAddress,
        dropoffLatitude: validatedData.dropoffLatitude || null,
        dropoffLongitude: validatedData.dropoffLongitude || null,
        dropoffContactName: validatedData.dropoffName || null,
        dropoffContactPhone: validatedData.dropoffContactPhone || null,
        
        distanceKm: validatedData.distanceKm,
        
        baseFare: validatedData.customPricing?.baseFare || pricing.baseFare,
        distanceFare: pricing.distanceFare,
        deliveryFee: pricing.deliveryFee,
        serviceFee: pricing.serviceFee,
        totalAmount: validatedData.customPricing?.totalAmount || pricing.totalAmount,
        platformCommission: pricing.platformCommission,
        riderEarnings: pricing.riderEarnings,
        
        paymentMethod: validatedData.paymentMethod,
        paymentStatus: 'PENDING',
        
        passengerCount: validatedData.passengerCount || null,
        passengerNames: validatedData.passengerNames || null,
        itemDescription: validatedData.itemDescription || null,
        itemWeight: validatedData.itemWeight || null,
        itemValue: validatedData.itemValue || null,
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.TASK_CREATED,
      entityType: EntityTypes.TASK,
      entityId: task.id,
      actorType: 'USER',
      userId: validatedData.clientId,
      taskId: task.id,
      description: `Task created: ${task.taskNumber} (${validatedData.taskType})`,
    });

    // Start matching process (in background - would normally be a job queue)
    // For now, we just update status to MATCHING
    const matchingTask = await db.task.update({
      where: { id: task.id },
      data: {
        status: 'MATCHING',
        matchingStartedAt: new Date(),
      },
    });

    return successResponse(matchingTask, 'Task created and matching started', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error creating task:', error);
    return serverErrorResponse('Failed to create task');
  }
}

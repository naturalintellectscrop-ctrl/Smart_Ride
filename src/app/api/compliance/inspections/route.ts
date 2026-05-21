import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse, paginatedResponse } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth/guards';
import {
  inspectionService,
  getRequiredEquipment,
  validateEquipmentStatus,
  InspectionChecklistItem,
  EquipmentStatus,
} from '@/lib/compliance/inspection-service';

// ============================================================================
// Validation Schemas
// ============================================================================

const scheduleInspectionSchema = z.object({
  riderId: z.string(),
  inspectionType: z.enum(['INITIAL', 'ROUTINE', 'RE_INSPECTION', 'COMPLAINT_BASED']),
  scheduledAt: z.string(), // ISO date string
  notes: z.string().optional(),
});

const completeInspectionSchema = z.object({
  inspectorId: z.string(),
  checklist: z.array(z.object({
    id: z.string(),
    category: z.enum(['VEHICLE', 'EQUIPMENT', 'DOCUMENTS']),
    name: z.string(),
    description: z.string(),
    required: z.boolean(),
    status: z.enum(['PASS', 'FAIL', 'NA', 'PENDING']),
    notes: z.string().optional(),
  })),
  equipmentStatus: z.object({
    hasHelmet: z.boolean(),
    helmetCondition: z.enum(['GOOD', 'FAIR', 'POOR', 'NOT_APPLICABLE']),
    hasReflectorVest: z.boolean(),
    reflectorVestCondition: z.enum(['GOOD', 'FAIR', 'POOR', 'NOT_APPLICABLE']),
    hasInsulatedBox: z.boolean(),
    insulatedBoxCondition: z.enum(['GOOD', 'FAIR', 'POOR', 'NOT_APPLICABLE']),
    additionalEquipment: z.array(z.string()),
  }),
  notes: z.string().optional(),
  reInspectionRequired: z.boolean().optional(),
  reInspectionDeadline: z.string().optional(),
});

const performInspectionSchema = z.object({
  riderId: z.string(),
  inspectorId: z.string(),
  checklist: z.array(z.object({
    id: z.string(),
    category: z.enum(['VEHICLE', 'EQUIPMENT', 'DOCUMENTS']),
    name: z.string(),
    description: z.string(),
    required: z.boolean(),
    status: z.enum(['PASS', 'FAIL', 'NA', 'PENDING']),
    notes: z.string().optional(),
  })),
  equipmentStatus: z.object({
    hasHelmet: z.boolean(),
    helmetCondition: z.enum(['GOOD', 'FAIR', 'POOR', 'NOT_APPLICABLE']),
    hasReflectorVest: z.boolean(),
    reflectorVestCondition: z.enum(['GOOD', 'FAIR', 'POOR', 'NOT_APPLICABLE']),
    hasInsulatedBox: z.boolean(),
    insulatedBoxCondition: z.enum(['GOOD', 'FAIR', 'POOR', 'NOT_APPLICABLE']),
    additionalEquipment: z.array(z.string()),
  }),
  notes: z.string().optional(),
});

// ============================================================================
// GET /api/compliance/inspections - Get inspection data
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get('riderId');
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Get inspection statistics
    if (action === 'stats') {
      const stats = await inspectionService.getInspectionStats();
      return successResponse({ stats });
    }

    // Get riders needing re-inspection
    if (action === 'needing-inspection') {
      const riders = await inspectionService.getRidersNeedingReInspection();
      return successResponse({ riders, total: riders.length });
    }

    // Get inspection history for a rider
    if (action === 'history' && riderId) {
      const history = await inspectionService.getInspectionHistory(riderId, limit);
      return successResponse({ history, riderId });
    }

    // Get required equipment for a role
    if (action === 'required-equipment') {
      const role = searchParams.get('role') || 'BIKE_RIDER';
      const equipment = getRequiredEquipment(role);
      return successResponse({ role, requiredEquipment: equipment });
    }

    // Get checklist template for a rider
    if (action === 'checklist' && riderId) {
      const rider = await db.rider.findUnique({
        where: { id: riderId },
        include: { vehicle: true },
      });

      if (!rider) {
        return notFoundResponse('Rider');
      }

      const checklist = inspectionService.generateChecklist(rider);
      return successResponse({
        riderId,
        riderName: rider.fullName,
        riderRole: rider.riderRole,
        vehicleInfo: rider.vehicle
          ? `${rider.vehicle.make} ${rider.vehicle.model} (${rider.vehicle.plateNumber})`
          : null,
        checklist,
      });
    }

    // Get pending inspections
    if (action === 'pending') {
      const pendingRiders = await db.rider.findMany({
        where: {
          status: 'PENDING_APPROVAL',
        },
        include: { vehicle: true },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: (page - 1) * limit,
      });

      const total = await db.rider.count({
        where: { status: 'PENDING_APPROVAL' },
      });

      return paginatedResponse(
        pendingRiders.map((rider) => ({
          riderId: rider.id,
          riderName: rider.fullName,
          riderPhone: rider.phone,
          riderRole: rider.riderRole,
          vehicleInfo: rider.vehicle
            ? `${rider.vehicle.make} ${rider.vehicle.model} (${rider.vehicle.plateNumber})`
            : null,
          createdAt: rider.createdAt,
        })),
        page,
        limit,
        total
      );
    }

    return errorResponse('Missing required parameters. Provide action and/or riderId.');
  } catch (error) {
    console.error('Error getting inspection data:', error);
    return serverErrorResponse('Failed to get inspection data');
  }
}

// ============================================================================
// POST /api/compliance/inspections - Schedule or perform inspection
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const admin = authResult.user!;

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'schedule';

    // Schedule an inspection
    if (action === 'schedule') {
      const validatedData = scheduleInspectionSchema.parse(body);

      const result = await inspectionService.scheduleInspection(
        {
          riderId: validatedData.riderId,
          inspectionType: validatedData.inspectionType,
          scheduledAt: new Date(validatedData.scheduledAt),
          notes: validatedData.notes,
        },
        admin.userId
      );

      if (!result.success) {
        return errorResponse(result.message);
      }

      return successResponse({
        inspection: result.inspection,
        message: result.message,
      });
    }

    // Perform on-the-spot inspection
    if (action === 'perform') {
      const validatedData = performInspectionSchema.parse(body);

      // Validate equipment status
      const rider = await db.rider.findUnique({
        where: { id: validatedData.riderId },
      });

      if (!rider) {
        return notFoundResponse('Rider');
      }

      const equipmentValidation = validateEquipmentStatus(
        validatedData.equipmentStatus,
        rider.riderRole
      );

      const result = await inspectionService.performInspection(
        validatedData.riderId,
        {
          inspectorId: validatedData.inspectorId,
          checklist: validatedData.checklist as InspectionChecklistItem[],
          equipmentStatus: validatedData.equipmentStatus as EquipmentStatus,
          notes: validatedData.notes,
        }
      );

      if (!result.success) {
        return errorResponse(result.message);
      }

      return successResponse({
        inspection: result.inspection,
        message: result.message,
        equipmentValidation: equipmentValidation.valid
          ? null
          : { missing: equipmentValidation.missing },
      });
    }

    // Complete a scheduled inspection
    if (action === 'complete') {
      const inspectionId = searchParams.get('inspectionId');
      if (!inspectionId) {
        return errorResponse('Inspection ID is required');
      }

      const validatedData = completeInspectionSchema.parse(body);

      const result = await inspectionService.completeInspection({
        inspectionId,
        inspectorId: validatedData.inspectorId,
        checklist: validatedData.checklist as InspectionChecklistItem[],
        equipmentStatus: validatedData.equipmentStatus as EquipmentStatus,
        notes: validatedData.notes,
        reInspectionRequired: validatedData.reInspectionRequired,
        reInspectionDeadline: validatedData.reInspectionDeadline
          ? new Date(validatedData.reInspectionDeadline)
          : undefined,
      });

      if (!result.success) {
        return errorResponse(result.message);
      }

      return successResponse({
        inspection: result.inspection,
        message: result.message,
      });
    }

    return errorResponse('Invalid action. Use: schedule, perform, or complete.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0]?.message || 'Validation error');
    }
    console.error('Error processing inspection:', error);
    return serverErrorResponse('Failed to process inspection');
  }
}

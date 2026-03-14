import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  serverErrorResponse 
} from '@/lib/api/response';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/prescriptions/[id]
 * Get a specific prescription
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const prescription = await db.prescription.findUnique({
      where: { id },
      include: {
        healthOrders: {
          select: { 
            id: true, 
            orderNumber: true, 
            status: true,
            pharmacy: { select: { id: true, merchantId: true } },
          },
        },
        accessLogs: {
          select: {
            id: true,
            accessedBy: true,
            accessedByType: true,
            action: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!prescription) {
      return notFoundResponse('Prescription');
    }

    return successResponse(prescription);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    return serverErrorResponse('Failed to fetch prescription');
  }
}

// Verification schema
const verifySchema = z.object({
  verifiedBy: z.string(),
  action: z.enum(['VERIFY', 'REJECT']),
  verificationNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  healthOrderId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

/**
 * PATCH /api/prescriptions/[id]
 * Verify or reject a prescription
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = verifySchema.parse(body);

    const prescription = await db.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      return notFoundResponse('Prescription');
    }

    if (prescription.status !== 'PENDING') {
      return errorResponse('Prescription has already been processed');
    }

    // Update prescription status
    const updatedPrescription = await db.prescription.update({
      where: { id },
      data: {
        status: validatedData.action === 'VERIFY' ? 'VERIFIED' : 'REJECTED',
        verifiedBy: validatedData.verifiedBy,
        verifiedAt: new Date(),
        verificationNotes: validatedData.verificationNotes || null,
        rejectionReason: validatedData.action === 'REJECT' ? validatedData.rejectionReason : null,
      },
    });

    // Create access log
    await db.prescriptionAccessLog.create({
      data: {
        prescriptionId: id,
        accessedBy: validatedData.verifiedBy,
        accessedByType: 'PHARMACY_STAFF',
        healthOrderId: validatedData.healthOrderId || null,
        action: validatedData.action === 'VERIFY' ? 'VERIFY' : 'REJECT',
        ipAddress: validatedData.ipAddress || null,
        userAgent: validatedData.userAgent || null,
      },
    });

    // If verified and healthOrderId provided, update health order status
    if (validatedData.action === 'VERIFY' && validatedData.healthOrderId) {
      await db.healthOrder.update({
        where: { id: validatedData.healthOrderId },
        data: {
          status: 'PRESCRIPTION_VERIFIED',
          verifiedAt: new Date(),
        },
      });
    }

    return successResponse(updatedPrescription, 
      validatedData.action === 'VERIFY' ? 'Prescription verified' : 'Prescription rejected'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error updating prescription:', error);
    return serverErrorResponse('Failed to update prescription');
  }
}

/**
 * DELETE /api/prescriptions/[id]
 * Delete a prescription (soft delete by setting status to expired)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const prescription = await db.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      return notFoundResponse('Prescription');
    }

    // Soft delete by setting status to expired
    const deletedPrescription = await db.prescription.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });

    return successResponse(deletedPrescription, 'Prescription deleted');
  } catch (error) {
    console.error('Error deleting prescription:', error);
    return serverErrorResponse('Failed to delete prescription');
  }
}

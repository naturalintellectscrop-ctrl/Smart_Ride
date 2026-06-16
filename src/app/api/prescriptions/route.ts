import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  paginatedResponse,
  getPaginationParams 
} from '@/lib/api/response';
import { requireAuth } from '@/lib/auth-utils';
import { isAdmin, JWTPayload } from '@/lib/auth/jwt';
import { generatePrescriptionNumber } from '@/lib/api/health-state-machine';
import { PrescriptionStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/prescriptions
 * - CLIENT users: list only their own prescriptions
 * - PHARMACIST/ADMIN users: list all prescriptions with optional filters
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as JWTPayload;

  await setServiceRoleContext();
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    // Scope by role: clients only see their own prescriptions
    const userIsAdmin = isAdmin(user.role);
    if (!userIsAdmin && user.role !== 'PHARMACIST') {
      where.clientId = user.userId;
    } else {
      // Admins/pharmacists may pass an explicit clientId filter
      const clientId = searchParams.get('clientId');
      if (clientId) where.clientId = clientId;
    }

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { prescriptionNumber: { contains: search, mode: 'insensitive' } },
        { doctorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [prescriptions, total] = await Promise.all([
      db.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          healthOrders: {
            select: { id: true, orderNumber: true, status: true },
          },
          accessLogs: {
            select: { id: true, action: true, createdAt: true },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      db.prescription.count({ where }),
    ]);

    return paginatedResponse(prescriptions, page, limit, total);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return serverErrorResponse('Failed to fetch prescriptions');
  } finally {
    await resetRLSContext();
  }
}

// Prescription upload schema — imageUrl is the primary field; doctorName and notes optional
const uploadPrescriptionSchema = z.object({
  clientId: z.string().optional(),
  
  // Image URL (uploaded separately via /uploads/documents)
  imageUrl: z.string().optional(),
  // Legacy: base64 data URL
  imageData: z.string().optional(),
  
  // Doctor info
  doctorName: z.string().optional(),
  doctorLicense: z.string().optional(),
  clinicName: z.string().optional(),
  prescriptionDate: z.string().optional(),
  expiryDate: z.string().optional(),
  
  // Medicines from prescription
  medicines: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/prescriptions
 * Authenticated clients can upload a new prescription.
 * The authenticated user's id is used as the clientId.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as JWTPayload;

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validatedData = uploadPrescriptionSchema.parse(body);

    // Use authenticated user's id as the client id, but allow admins to specify a different one
    const userIsAdmin = isAdmin(user.role);
    const clientId = userIsAdmin && validatedData.clientId
      ? validatedData.clientId
      : user.userId;

    if (!clientId) {
      return errorResponse('Unable to determine client for prescription');
    }
    
    const imageUrl = validatedData.imageUrl || validatedData.imageData;
    if (!imageUrl) {
      return errorResponse('Prescription image is required');
    }
    
    // Create prescription
    const prescription = await db.prescription.create({
      data: {
        prescriptionNumber: generatePrescriptionNumber(),
        clientId,
        imageUrl,
        imageHash: Date.now().toString(36), // Simple hash for demo
        doctorName: validatedData.doctorName || null,
        doctorLicense: validatedData.doctorLicense || null,
        clinicName: validatedData.clinicName || null,
        prescriptionDate: validatedData.prescriptionDate ? new Date(validatedData.prescriptionDate) : null,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        medicines: validatedData.medicines ? JSON.stringify(validatedData.medicines) : null,
        status: PrescriptionStatus.PENDING,
      },
    });

    return successResponse(prescription, 'Prescription uploaded successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.issues[0]?.message || 'Validation error');
    }
    console.error('Error uploading prescription:', error);
    return serverErrorResponse('Failed to upload prescription');
  } finally {
    await resetRLSContext();
  }
}

// Prescription verification schema (kept for backwards compatibility with pharmacist flow)
export const verifyPrescriptionSchema = z.object({
  prescriptionId: z.string(),
  verifiedBy: z.string(),
  action: z.enum(['VERIFY', 'REJECT']),
  verificationNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

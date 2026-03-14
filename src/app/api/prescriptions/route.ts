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
import { generatePrescriptionNumber } from '@/lib/api/health-state-machine';
import { PrescriptionStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/prescriptions
 * List all prescriptions with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
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
  }
}

// Prescription upload schema
const uploadPrescriptionSchema = z.object({
  clientId: z.string(),
  
  // Image data (base64 or URL)
  imageData: z.string().optional(),
  imageUrl: z.string().optional(),
  
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
 * Upload a new prescription
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = uploadPrescriptionSchema.parse(body);

    // In production, we would:
    // 1. Validate and process the image
    // 2. Encrypt the image for secure storage
    // 3. Store in secure cloud storage (S3, etc.)
    // For now, we'll use the provided URL or a placeholder
    
    const imageUrl = validatedData.imageUrl || validatedData.imageData || '/prescriptions/placeholder.jpg';
    
    // Create prescription
    const prescription = await db.prescription.create({
      data: {
        prescriptionNumber: generatePrescriptionNumber(),
        clientId: validatedData.clientId,
        imageUrl: imageUrl,
        imageHash: Date.now().toString(36), // Simple hash for demo
        doctorName: validatedData.doctorName || null,
        doctorLicense: validatedData.doctorLicense || null,
        clinicName: validatedData.clinicName || null,
        prescriptionDate: validatedData.prescriptionDate ? new Date(validatedData.prescriptionDate) : null,
        expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
        medicines: validatedData.medicines ? JSON.stringify(validatedData.medicines) : null,
        status: 'PENDING',
      },
    });

    return successResponse(prescription, 'Prescription uploaded successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error uploading prescription:', error);
    return serverErrorResponse('Failed to upload prescription');
  }
}

// Prescription verification schema
const verifyPrescriptionSchema = z.object({
  prescriptionId: z.string(),
  verifiedBy: z.string(),
  action: z.enum(['VERIFY', 'REJECT']),
  verificationNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

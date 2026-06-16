import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  serverErrorResponse,
  paginatedResponse,
  getPaginationParams 
} from '@/lib/api/response';
import { MedicineCategory } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '@/lib/auth/guards';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';

/**
 * GET /api/medicine-catalog
 * List all medicines with pagination and filtering
 *
 * SECURITY: Public for search (rate limited), no auth required
 */
export async function GET(request: NextRequest) {
  // Rate limiting for public search endpoint
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.search);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.search);
  }

  await setServiceRoleContext();
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const pharmacyId = searchParams.get('pharmacyId');
    const category = searchParams.get('category');
    const requiresPrescription = searchParams.get('requiresPrescription');
    const isAvailable = searchParams.get('isAvailable');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    if (pharmacyId) where.pharmacyId = pharmacyId;
    if (category) where.category = category;
    if (requiresPrescription !== null) where.requiresPrescription = requiresPrescription === 'true';
    if (isAvailable !== null) where.isAvailable = isAvailable === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [medicines, total] = await Promise.all([
      db.medicineCatalog.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
          pharmacy: {
            select: { id: true, merchantId: true, isOpen: true },
          },
        },
      }),
      db.medicineCatalog.count({ where }),
    ]);

    return paginatedResponse(medicines, page, limit, total);
  } catch (error) {
    console.error('Error fetching medicine catalog:', error);
    return serverErrorResponse('Failed to fetch medicine catalog');
  } finally {
    await resetRLSContext();
  }
}

// Medicine creation schema
const createMedicineSchema = z.object({
  pharmacyId: z.string(),
  name: z.string(),
  genericName: z.string().optional(),
  description: z.string().optional(),
  category: z.enum([
    'PAINKILLERS', 'ANTIBIOTICS', 'VITAMINS', 'COLD_FLU', 
    'DIGESTIVE', 'CARDIOVASCULAR', 'DIABETES', 'HYGIENE', 
    'FIRST_AID', 'MOTHER_BABY', 'OTHER'
  ]),
  manufacturer: z.string().optional(),
  price: z.number().min(0),
  isAvailable: z.boolean().default(true),
  stockQuantity: z.number().optional(),
  requiresPrescription: z.boolean().default(false),
  storageCondition: z.string().optional(),
  handlingInstructions: z.string().optional(),
  imageUrl: z.string().optional(),
});

/**
 * POST /api/medicine-catalog
 * Add a new medicine to catalog
 *
 * SECURITY: Requires auth + admin role
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.write);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.write);
  }

  // Require admin authentication
  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return errorResponse(authResult.error || 'Admin access required', authResult.statusCode || 403);
  }

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validatedData = createMedicineSchema.parse(body);

    // Verify pharmacy exists
    const pharmacy = await db.pharmacy.findUnique({
      where: { id: validatedData.pharmacyId },
    });
    
    if (!pharmacy) {
      return notFoundResponse('Pharmacy');
    }
    if (pharmacy.status !== 'APPROVED') {
      return errorResponse('Pharmacy is not active');
    }

    // Create medicine
    const medicine = await db.medicineCatalog.create({
      data: {
        pharmacyId: validatedData.pharmacyId,
        name: validatedData.name,
        genericName: validatedData.genericName || null,
        description: validatedData.description || null,
        category: validatedData.category as MedicineCategory,
        manufacturer: validatedData.manufacturer || null,
        price: validatedData.price,
        isAvailable: validatedData.isAvailable,
        stockQuantity: validatedData.stockQuantity || null,
        requiresPrescription: validatedData.requiresPrescription,
        storageCondition: validatedData.storageCondition || null,
        handlingInstructions: validatedData.handlingInstructions || null,
        imageUrl: validatedData.imageUrl || null,
      },
    });

    return successResponse(medicine, 'Medicine added to catalog', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.issues[0]?.message || 'Validation error');
    }
    console.error('Error creating medicine:', error);
    return serverErrorResponse('Failed to create medicine');
  } finally {
    await resetRLSContext();
  }
}

/**
 * PUT /api/medicine-catalog
 * Update stock quantity
 *
 * SECURITY: Requires auth + admin role
 */
export async function PUT(request: NextRequest) {
  // Rate limiting
  const rateResult = checkRateLimit(request, RATE_LIMITS.api.write);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, RATE_LIMITS.api.write);
  }

  // Require admin authentication
  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return errorResponse(authResult.error || 'Admin access required', authResult.statusCode || 403);
  }

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { medicineId, stockQuantity, isAvailable } = body;

    if (!medicineId) {
      return errorResponse('Medicine ID is required');
    }

    const medicine = await db.medicineCatalog.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      return notFoundResponse('Medicine');
    }

    const updateData: Record<string, unknown> = {};
    if (stockQuantity !== undefined) updateData.stockQuantity = stockQuantity;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const updatedMedicine = await db.medicineCatalog.update({
      where: { id: medicineId },
      data: updateData,
    });

    return successResponse(updatedMedicine, 'Medicine updated');
  } catch (error) {
    console.error('Error updating medicine:', error);
    return serverErrorResponse('Failed to update medicine');
  } finally {
    await resetRLSContext();
  }
}

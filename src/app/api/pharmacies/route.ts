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
import { PharmacyStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/pharmacies
 * List all pharmacies with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const isOpen = searchParams.get('isOpen');
    const supportsPrescription = searchParams.get('supportsPrescription');
    const search = searchParams.get('search');
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const radius = searchParams.get('radius');

    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (isOpen !== null) where.isOpen = isOpen === 'true';
    if (supportsPrescription !== null) where.supportsPrescription = supportsPrescription === 'true';
    if (search) {
      where.OR = [
        { pharmacyLicense: { contains: search, mode: 'insensitive' } },
        { pharmacistInCharge: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [pharmacies, total] = await Promise.all([
      db.pharmacy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          medicineCatalog: {
            where: { isAvailable: true },
            select: { id: true, name: true, category: true, price: true },
            take: 10,
          },
        },
      }),
      db.pharmacy.count({ where }),
    ]);

    // If location provided, filter by delivery radius
    let filteredPharmacies = pharmacies;
    if (latitude && longitude && radius) {
      const clientLat = parseFloat(latitude);
      const clientLng = parseFloat(longitude);
      const maxRadius = parseFloat(radius);

      filteredPharmacies = pharmacies.filter(pharmacy => {
        // In production, we would calculate actual distance
        // For now, we use a simple delivery radius check
        return pharmacy.deliveryRadius >= maxRadius;
      });
    }

    return paginatedResponse(filteredPharmacies, page, limit, total);
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    return serverErrorResponse('Failed to fetch pharmacies');
  }
}

// Pharmacy creation schema
const createPharmacySchema = z.object({
  merchantId: z.string(),
  pharmacyLicense: z.string(),
  pharmacyLicenseUrl: z.string().optional(),
  pharmacistInCharge: z.string(),
  pharmacistLicense: z.string(),
  operatingHours: z.string().optional(),
  supportsPrescription: z.boolean().default(true),
  supportsOTC: z.boolean().default(true),
  deliveryRadius: z.number().default(10),
});

/**
 * POST /api/pharmacies
 * Create a new pharmacy (register as pharmacy merchant)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPharmacySchema.parse(body);

    // Verify merchant exists and is of type PHARMACY
    const merchant = await db.merchant.findUnique({
      where: { id: validatedData.merchantId },
    });
    
    if (!merchant) {
      return notFoundResponse('Merchant');
    }
    if (merchant.type !== 'PHARMACY') {
      return errorResponse('Merchant must be of type PHARMACY');
    }

    // Check if pharmacy already exists for this merchant
    const existingPharmacy = await db.pharmacy.findUnique({
      where: { merchantId: validatedData.merchantId },
    });
    
    if (existingPharmacy) {
      return errorResponse('Pharmacy already registered for this merchant');
    }

    // Create pharmacy
    const pharmacy = await db.pharmacy.create({
      data: {
        merchantId: validatedData.merchantId,
        pharmacyLicense: validatedData.pharmacyLicense,
        pharmacyLicenseUrl: validatedData.pharmacyLicenseUrl || null,
        pharmacistInCharge: validatedData.pharmacistInCharge,
        pharmacistLicense: validatedData.pharmacistLicense,
        operatingHours: validatedData.operatingHours || null,
        supportsPrescription: validatedData.supportsPrescription,
        supportsOTC: validatedData.supportsOTC,
        deliveryRadius: validatedData.deliveryRadius,
        status: 'PENDING_APPROVAL',
        isOpen: false,
      },
    });

    return successResponse(pharmacy, 'Pharmacy registered successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error creating pharmacy:', error);
    return serverErrorResponse('Failed to create pharmacy');
  }
}

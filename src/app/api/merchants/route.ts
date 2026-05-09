import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  paginatedResponse,
  getPaginationParams 
} from '@/lib/api/response';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { z } from 'zod';

/**
 * GET /api/merchants
 * List all merchants with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const isOpen = searchParams.get('isOpen');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (isOpen !== null) where.isOpen = isOpen === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [merchants, total] = await Promise.all([
      db.merchant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { menuItems: true, orders: true },
          },
        },
      }),
      db.merchant.count({ where }),
    ]);

    return paginatedResponse(merchants, page, limit, total);
  } catch (error) {
    console.error('Error fetching merchants:', error);
    return serverErrorResponse('Failed to fetch merchants');
  }
}

const merchantSchema = z.object({
  name: z.string().min(2, 'Business name is required'),
  type: z.enum(['RESTAURANT', 'SUPERMARKET', 'RETAIL_STORE', 'PHARMACY', 'GROCERY']),
  description: z.string().optional(),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().nullable(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  averagePrepTime: z.number().default(15),
  commissionRate: z.number().min(0).max(1).default(0.15),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
});

/**
 * POST /api/merchants
 * Register a new merchant
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = merchantSchema.parse(body);

    const merchant = await db.merchant.create({
      data: {
        ...validatedData,
        status: 'PENDING_APPROVAL',
        isOpen: false,
      },
    });

    await createAuditLog({
      action: AuditActions.MERCHANT_REGISTERED,
      entityType: EntityTypes.MERCHANT,
      entityId: merchant.id,
      actorType: 'SYSTEM',
      description: `New ${validatedData.type} registered: ${validatedData.name}`,
    });

    return successResponse(merchant, 'Merchant registration submitted. Awaiting approval.', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error registering merchant:', error);
    return serverErrorResponse('Failed to register merchant');
  }
}

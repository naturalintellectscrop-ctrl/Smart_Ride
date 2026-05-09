import { NextRequest, NextResponse } from 'next/server';
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
import { z } from 'zod';
import { requireAuth, requireAdmin, isAdmin } from '@/lib/auth/guards';

/**
 * GET /api/riders
 * List all riders with pagination and filtering
 * SECURITY: Requires authentication. Non-admins can only see their own profile.
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const user = authResult.user!;

    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const isOnline = searchParams.get('isOnline');
    const search = searchParams.get('search');

    // Build filter
    const where: Record<string, unknown> = {};
    
    // SECURITY: Non-admin users can only see their own rider profile
    if (!isAdmin(user.role)) {
      where.userId = user.userId;
    }
    
    if (role) {
      where.riderRole = role;
    }
    if (status) {
      where.status = status;
    }
    if (isOnline !== null) {
      where.isOnline = isOnline === 'true';
    }
    if (search && isAdmin(user.role)) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [riders, total] = await Promise.all([
      db.rider.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          vehicle: true,
        },
      }),
      db.rider.count({ where }),
    ]);

    return paginatedResponse(riders, page, limit, total);
  } catch (error) {
    console.error('Error fetching riders:', error);
    return serverErrorResponse('Failed to fetch riders');
  }
}

// Rider registration schema
const riderRegisterSchema = z.object({
  userId: z.string().optional(),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10, 'Valid phone number is required'),
  physicalAddress: z.string().min(5, 'Physical address is required'),
  riderRole: z.enum(['SMART_BODA_RIDER', 'SMART_CAR_DRIVER', 'DELIVERY_PERSONNEL']),
  vehicleType: z.enum(['BODA', 'CAR', 'BICYCLE', 'SCOOTER']).optional(),
  
  // Vehicle information
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().optional(),
  vehicleColor: z.string().optional(),
  vehiclePlateNumber: z.string().optional(),
  
  // Document URLs (will be uploaded separately)
  facePhotoUrl: z.string().optional(),
  nationalIdFrontUrl: z.string().optional(),
  nationalIdBackUrl: z.string().optional(),
  driverLicenseUrl: z.string().optional(),
});

/**
 * POST /api/riders
 * Register a new rider
 * SECURITY: Requires authentication. Users can only register themselves as riders.
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const user = authResult.user!;

    const body = await request.json();
    const validatedData = riderRegisterSchema.parse(body);

    // SECURITY: IDOR prevention - users can only register themselves as riders
    // Admins can register riders for other users
    if (!isAdmin(user.role)) {
      if (validatedData.userId && validatedData.userId !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'Cannot register another user as rider' },
          { status: 403 }
        );
      }
    }

    // Validate vehicle type based on role
    if (validatedData.riderRole === 'SMART_BODA_RIDER' && !validatedData.vehicleType) {
      validatedData.vehicleType = 'BODA';
    } else if (validatedData.riderRole === 'SMART_CAR_DRIVER' && !validatedData.vehicleType) {
      validatedData.vehicleType = 'CAR';
    }

    // Check for existing rider with same phone
    const existingRider = await db.rider.findUnique({
      where: { phone: validatedData.phone },
    });

    if (existingRider) {
      return errorResponse('A rider with this phone number already exists');
    }

    // SECURITY: Check if user already has a rider profile
    const existingRiderProfile = await db.rider.findUnique({
      where: { userId: validatedData.userId || user.userId },
    });
    if (existingRiderProfile) {
      return errorResponse('User already has a rider profile');
    }

    // Use authenticated user's ID if not provided by admin
    let userId = validatedData.userId || user.userId;
    if (!isAdmin(user.role)) {
      userId = user.userId;
    }

    // Create rider with pending status
    const rider = await db.rider.create({
      data: {
        userId: userId!,
        fullName: validatedData.fullName,
        email: validatedData.email || null,
        phone: validatedData.phone,
        physicalAddress: validatedData.physicalAddress,
        riderRole: validatedData.riderRole,
        vehicleType: validatedData.vehicleType,
        facePhotoUrl: validatedData.facePhotoUrl || null,
        nationalIdFrontUrl: validatedData.nationalIdFrontUrl || null,
        nationalIdBackUrl: validatedData.nationalIdBackUrl || null,
        driverLicenseUrl: validatedData.driverLicenseUrl || null,
        status: 'PENDING_APPROVAL',
      },
    });

    // Create vehicle if info provided
    if (validatedData.vehiclePlateNumber) {
      await db.vehicle.create({
        data: {
          riderId: rider.id,
          make: validatedData.vehicleMake || 'Unknown',
          model: validatedData.vehicleModel || 'Unknown',
          year: validatedData.vehicleYear,
          color: validatedData.vehicleColor || 'Unknown',
          plateNumber: validatedData.vehiclePlateNumber,
        },
      });
    }

    // Create audit log
    await createAuditLog({
      action: AuditActions.RIDER_REGISTERED,
      entityType: EntityTypes.RIDER,
      entityId: rider.id,
      actorType: 'USER',
      userId: userId!,
      riderId: rider.id,
      description: `New ${validatedData.riderRole} registered: ${validatedData.fullName}`,
    });

    return successResponse(rider, 'Rider registration submitted. Awaiting approval.', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error registering rider:', error);
    return serverErrorResponse('Failed to register rider');
  }
}

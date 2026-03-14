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
import { z } from 'zod';

/**
 * GET /api/users
 * List all users with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build filter
    const where: Record<string, unknown> = {};
    
    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: { orders: true, tasks: true },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return paginatedResponse(users, page, limit, total);
  } catch (error) {
    console.error('Error fetching users:', error);
    return serverErrorResponse('Failed to fetch users');
  }
}

/**
 * POST /api/users
 * Create a new user (admin use)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const userSchema = z.object({
      name: z.string().min(2),
      email: z.string().email().optional(),
      phone: z.string().min(10),
      role: z.enum(['CLIENT', 'ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN']).default('CLIENT'),
    });
    
    const validatedData = userSchema.parse(body);

    // Check for existing user
    const existing = await db.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { phone: validatedData.phone },
        ].filter(Boolean) as { email?: string; phone?: string }[],
      },
    });

    if (existing) {
      return errorResponse('User with this email or phone already exists');
    }

    const user = await db.user.create({
      data: {
        ...validatedData,
        status: 'ACTIVE',
      },
    });

    return successResponse(user, 'User created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return errorResponse(zodError.errors[0]?.message || 'Validation error');
    }
    console.error('Error creating user:', error);
    return serverErrorResponse('Failed to create user');
  }
}

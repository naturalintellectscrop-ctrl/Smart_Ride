import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse,
  paginatedResponse,
  getPaginationParams 
} from '@/lib/api/response';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'];

/**
 * GET /api/admin-users
 * List all admin users (non-CLIENT roles)
 */
export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build filter - only admin roles
    const where: Record<string, unknown> = {
      role: { in: ADMIN_ROLES }
    };
    
    if (role && ADMIN_ROLES.includes(role)) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

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
          lastLoginAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return paginatedResponse(users, page, limit, total);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return serverErrorResponse('Failed to fetch admin users');
  }
}

// Admin user creation schema
const adminUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/admin-users
 * Create a new admin user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = adminUserSchema.parse(body);

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return errorResponse('A user with this email already exists');
    }

    // Check if phone already exists (if provided)
    if (validatedData.phone) {
      const existingPhone = await db.user.findUnique({
        where: { phone: validatedData.phone },
      });

      if (existingPhone) {
        return errorResponse('A user with this phone number already exists');
      }
    }

    // Hash password
    const passwordHash = await hash(validatedData.password, 10);

    // Create admin user
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        role: validatedData.role,
        status: 'ACTIVE',
        passwordHash,
        authProvider: 'email',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'ADMIN_USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        description: `Admin user created: ${user.name} (${user.role})`,
      },
    });

    return successResponse({ user }, 'Admin user created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    console.error('Error creating admin user:', error);
    return serverErrorResponse('Failed to create admin user');
  }
}

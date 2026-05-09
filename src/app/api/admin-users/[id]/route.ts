import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse,
  serverErrorResponse 
} from '@/lib/api/response';
import { hash } from 'bcryptjs';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin-users/[id]
 * Get a single admin user by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
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

    if (!user) {
      return notFoundResponse('Admin user not found');
    }

    return successResponse(user);
  } catch (error) {
    console.error('Error fetching admin user:', error);
    return serverErrorResponse('Failed to fetch admin user');
  }
}

// Update schema
const updateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

/**
 * PATCH /api/admin-users/[id]
 * Update an admin user
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse('Admin user not found');
    }

    // If email is being changed, check for duplicates
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email: validatedData.email },
      });
      if (emailExists) {
        return errorResponse('A user with this email already exists');
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.password) {
      updateData.passwordHash = await hash(validatedData.password, 10);
    }

    // Update user
    const user = await db.user.update({
      where: { id },
      data: updateData,
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
        actorType: 'ADMIN',
        action: 'ADMIN_USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        description: `Admin user updated: ${user.name}`,
        newValues: JSON.stringify({
          ...updateData,
          password: validatedData.password ? '[CHANGED]' : undefined
        }),
      },
    });

    return successResponse(user, 'Admin user updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    console.error('Error updating admin user:', error);
    return serverErrorResponse('Failed to update admin user');
  }
}

/**
 * DELETE /api/admin-users/[id]
 * Delete an admin user
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse('Admin user not found');
    }

    // Prevent deleting the last super admin
    if (existingUser.role === 'SUPER_ADMIN') {
      const superAdminCount = await db.user.count({
        where: { role: 'SUPER_ADMIN' },
      });
      
      if (superAdminCount <= 1) {
        return errorResponse('Cannot delete the last super admin');
      }
    }

    // Delete user
    await db.user.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        action: 'ADMIN_USER_DELETED',
        entityType: 'User',
        entityId: id,
        description: `Admin user deleted: ${existingUser.name} (${existingUser.role})`,
      },
    });

    return successResponse(null, 'Admin user deleted successfully');
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return serverErrorResponse('Failed to delete admin user');
  }
}

/**
 * POST /api/admin/users/create
 * 
 * Create a new admin user (SUPER_ADMIN only)
 * Passwords are hashed with bcrypt before storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { getAuthUser } from '@/lib/auth/middleware';
import { z } from 'zod';

const createAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum([
    'SUPER_ADMIN',
    'ADMIN',
    'OPERATIONS_ADMIN',
    'COMPLIANCE_ADMIN',
    'FINANCE_ADMIN',
  ]).default('ADMIN'),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify the requester is authenticated
    const user = getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN can create new admins
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only Super Admins can create new admin accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = createAdminSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { email, password, name, role, phone } = validationResult.data;

    // Validate password strength
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json(
        { success: false, error: passwordError },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (12 salt rounds)
    const passwordHash = await hashPassword(password);

    // Create the admin user
    const newAdmin = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        status: 'ACTIVE',
        authProvider: 'email',
        phone: phone || null,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'ADMIN_CREATED',
        entityType: 'USER',
        entityId: newAdmin.id,
        actorType: 'ADMIN',
        actorId: user.id,
        userId: user.id,
        description: `Admin ${user.name} created new admin: ${name} (${role})`,
        newValues: JSON.stringify({
          email,
          name,
          role,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}

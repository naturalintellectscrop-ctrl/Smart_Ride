/**
 * POST /api/admin/login
 * Admin authentication endpoint
 * 
 * Separate from mobile authentication.
 * Uses email/password instead of phone number.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { isAdminRole } from '@/lib/config/mobile-access';
import { z } from 'zod';

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = adminLoginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is an admin
    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Account is not active. Contact super admin.' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Update user with refresh token
    await db.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        lastLoginAt: new Date(),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'ADMIN_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        actorType: 'ADMIN',
        actorId: user.id,
        userId: user.id,
        description: `Admin ${user.name} (${user.role}) logged in`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Return success with tokens
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });

    // SECURITY: Set admin-session cookie with access token
    // This is required for the /api/auth/session endpoint to verify the admin session
    response.cookies.set('admin-session', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days (match JWT expiry)
      path: '/',
    });

    // Set refresh token as HTTP-only cookie
    response.cookies.set('admin_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/admin',
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = 'Login failed. Please try again.';
    let debugInfo: string | undefined;
    
    if (error instanceof Error) {
      debugInfo = error.message;
      
      // Database connection errors
      if (error.message.includes('P1001') || error.message.includes('Can\'t reach database')) {
        errorMessage = 'Database connection failed. Please check your DATABASE_URL or set DB_HOST/DB_USER/DB_PASSWORD on Vercel.';
      } else if (error.message.includes('P1003') || error.message.includes('does not exist')) {
        errorMessage = 'Database tables not found. Please run database migrations first.';
      } else if (error.message.includes('Authentication failed') || error.message.includes('credentials')) {
        errorMessage = 'Database authentication failed. The DATABASE_URL password may have URL encoding issues. Try setting DB_HOST, DB_USER, DB_PASSWORD, DB_NAME as separate env vars on Vercel.';
      } else if (error.message.includes('Prisma Client') || error.message.includes('prisma')) {
        errorMessage = 'Database client not initialized. Please check your configuration.';
      } else if (error.message.includes('DATABASE_URL must be a PostgreSQL')) {
        errorMessage = 'Database URL is not configured correctly. Please set a PostgreSQL connection string or individual DB_HOST/DB_USER/DB_PASSWORD vars.';
      } else if (error.message.includes('JWT_SECRET')) {
        errorMessage = 'Server configuration error. JWT_SECRET is not set.';
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        // Always include debug in non-production for troubleshooting
        ...(process.env.NODE_ENV !== 'production' ? { debug: debugInfo } : {}),
      },
      { status: 500 }
    );
  }
}

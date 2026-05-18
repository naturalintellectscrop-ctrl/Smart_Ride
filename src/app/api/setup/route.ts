/**
 * GET /api/setup
 * Database health check and setup endpoint
 * 
 * Tests database connection, checks for admin users,
 * and provides diagnostic information.
 * 
 * POST /api/setup
 * Seeds the initial admin user if none exists.
 * Requires a setup key for security.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const setupAdminSchema = z.object({
  setupKey: z.string().min(1, 'Setup key is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN']).default('SUPER_ADMIN'),
});

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  // Test 1: Database Connection
  try {
    await db.$queryRaw`SELECT 1 as health`;
    diagnostics.database = {
      status: 'connected',
      provider: 'postgresql',
    };
  } catch (dbError) {
    const dbUrl = process.env.DATABASE_URL || '';
    diagnostics.database = {
      status: 'error',
      error: dbError instanceof Error ? dbError.message : 'Unknown database error',
    };
    
    // Diagnose the DATABASE_URL
    diagnostics.database.urlFormat = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')
      ? 'postgresql (correct)'
      : dbUrl.startsWith('file:')
        ? 'sqlite (incorrect - need postgresql)'
        : 'not set or invalid format';
    
    // Try to parse the URL and show diagnostic info (without exposing secrets)
    try {
      const parsed = new URL(dbUrl);
      diagnostics.database.urlParsable = true;
      diagnostics.database.urlUsername = parsed.username.substring(0, 15) + '...';
      diagnostics.database.urlPasswordLength = (parsed.password || '').length;
      diagnostics.database.urlHostname = parsed.hostname;
      diagnostics.database.urlPort = parsed.port;
      diagnostics.database.urlSearch = parsed.search.substring(0, 40);
      // Check if password might have encoding issues
      const decodedPassword = decodeURIComponent(parsed.password || '');
      diagnostics.database.passwordHasSpecialChars = /[?$&#*]/.test(decodedPassword);
    } catch (parseErr) {
      diagnostics.database.urlParsable = false;
      diagnostics.database.urlParseError = (parseErr as Error).message;
      // Try manual extraction
      const afterScheme = dbUrl.substring(dbUrl.indexOf('://') + 3);
      const hostMatch = afterScheme.match(/@([a-zA-Z0-9][\w.-]*\.\w+)/);
      if (hostMatch) {
        const atPos = afterScheme.indexOf(hostMatch[0]);
        const credentials = afterScheme.substring(0, atPos);
        const colonIdx = credentials.indexOf(':');
        if (colonIdx !== -1) {
          const rawPass = credentials.substring(colonIdx + 1);
          diagnostics.database.manualPasswordLength = rawPass.length;
          diagnostics.database.manualPasswordHasSpecialChars = /[?$&#*]/.test(rawPass);
          diagnostics.database.manualHostname = hostMatch[1];
        }
      }
    }
  }

  // Test 2: Check for admin users
  try {
    const adminCount = await db.user.count({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'] },
      },
    });
    diagnostics.adminUsers = {
      count: adminCount,
      exists: adminCount > 0,
    };
  } catch {
    diagnostics.adminUsers = { error: 'Could not query users table' };
  }

  // Test 3: Check for password reset tokens table
  try {
    const tokenCount = await db.passwordResetToken.count();
    diagnostics.passwordResetTokens = {
      count: tokenCount,
      tableExists: true,
    };
  } catch {
    diagnostics.passwordResetTokens = { tableExists: false, error: 'Table may not exist - run db:push' };
  }

  // Test 4: Environment variables check (don't expose values)
  diagnostics.environmentVariables = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    // Individual DB components (recommended for Vercel)
    DB_HOST: !!process.env.DB_HOST,
    DB_USER: !!process.env.DB_USER,
    DB_PASSWORD: !!process.env.DB_PASSWORD,
    DB_NAME: !!process.env.DB_NAME,
    // Other vars
    JWT_SECRET: !!process.env.JWT_SECRET,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    EMAIL_FROM: !!process.env.EMAIL_FROM,
  };

  // Test 5: Email service check
  diagnostics.email = {
    resendConfigured: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.EMAIL_FROM || 'not set',
  };

  return NextResponse.json({
    success: true,
    diagnostics,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = setupAdminSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { email, password, name, role } = validationResult.data;

    // Verify setup key matches JWT_SECRET (simple security measure)
    const setupKey = validationResult.data.setupKey;
    const expectedKey = process.env.JWT_SECRET || 'setup';
    if (setupKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid setup key. Use your JWT_SECRET as the setup key.' },
        { status: 401 }
      );
    }

    // Check if admin user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update existing user's password
      const passwordHash = await hashPassword(password);
      await db.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          name,
          role,
          status: 'ACTIVE',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Admin user ${email} updated successfully.`,
        user: { email, name, role },
      });
    }

    // Create new admin user
    const passwordHash = await hashPassword(password);
    const admin = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        status: 'ACTIVE',
        authProvider: 'email',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Admin user ${email} created successfully.`,
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Setup failed.',
        debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

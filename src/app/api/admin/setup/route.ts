/**
 * GET /api/admin/setup
 * Seeds the default admin user if it doesn't exist
 * This endpoint helps set up admin on Vercel/Production
 * 
 * SECURITY: All credentials come from environment variables only.
 * No hardcoded defaults. If env vars are missing, returns 500.
 * Setup key is never exposed in error messages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function GET(request: NextRequest) {
  await setServiceRoleContext();
  try {
    // SECURITY: Require setup key from environment variable
    const setupKey = request.nextUrl.searchParams.get('key');
    const requiredSetupKey = process.env.ADMIN_SETUP_KEY;
    
    if (!requiredSetupKey) {
      console.error('[Admin Setup] ADMIN_SETUP_KEY environment variable is not configured');
      return NextResponse.json(
        { success: false, error: 'Setup is not configured on this server' },
        { status: 500 }
      );
    }

    if (!setupKey || setupKey !== requiredSetupKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // SECURITY: All admin credentials must come from environment variables.
    // Primary env var names are SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (consistent
    // with prisma/seed-production-admin.ts and PRODUCTION_SETUP_RUNBOOK.md).
    // ADMIN_SETUP_EMAIL / ADMIN_SETUP_PASSWORD are accepted as a backward-compat
    // fallback so existing Vercel configurations keep working.
    const adminEmail = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_SETUP_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_SETUP_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error(
        '[Admin Setup] SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables are not configured'
      );
      return NextResponse.json(
        { success: false, error: 'Setup is not configured on this server' },
        { status: 500 }
      );
    }

    const adminConfig = {
      email: adminEmail,
      password: adminPassword,
      name: 'System Administrator',
      role: 'SUPER_ADMIN' as const,
      phone: '+256700000000',
    };

    console.log('Checking admin user:', adminConfig.email);
    
    // Check if admin exists
    const existing = await db.user.findUnique({
      where: { email: adminConfig.email },
      select: { id: true, email: true, name: true, role: true, status: true, passwordHash: true }
    });
    
    if (existing) {
      console.log('Admin exists, updating password...');
      
      // Update password and ensure correct role/status
      const passwordHash = await bcrypt.hash(adminConfig.password, SALT_ROUNDS);
      const updated = await db.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: adminConfig.role,
          status: 'ACTIVE',
        },
        select: { id: true, email: true, name: true, role: true, status: true }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Admin user updated',
        user: updated,
      });
    }
    
    // Create new admin
    console.log('Creating admin user...');
    const passwordHash = await bcrypt.hash(adminConfig.password, SALT_ROUNDS);
    
    const admin = await db.user.create({
      data: {
        email: adminConfig.email,
        passwordHash: passwordHash,
        name: adminConfig.name,
        role: adminConfig.role,
        status: 'ACTIVE',
        authProvider: 'email',
        phone: adminConfig.phone,
      },
      select: { id: true, email: true, name: true, role: true, status: true }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Admin user created',
      user: admin,
    });
    
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

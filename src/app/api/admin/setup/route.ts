/**
 * GET /api/admin/setup
 * Seeds the default admin user if it doesn't exist
 * This endpoint helps set up admin on Vercel/Production
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

// Default admin credentials
const DEFAULT_ADMIN = {
  email: 'naturalintellectscrop@gmail.com',
  password: 'Admin@123',
  name: 'System Administrator',
  role: 'SUPER_ADMIN' as const,
  phone: '+256700000000',
};

export async function GET(request: NextRequest) {
  try {
    // Only allow in development or with secret key
    const setupKey = request.nextUrl.searchParams.get('key');
    
    // Simple security check - use a setup key or allow in dev
    const isDev = process.env.NODE_ENV === 'development';
    const validKey = setupKey === 'smartride-setup-2024';
    
    if (!isDev && !validKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Use ?key=smartride-setup-2024' },
        { status: 401 }
      );
    }

    console.log('Checking admin user:', DEFAULT_ADMIN.email);
    
    // Check if admin exists
    const existing = await db.user.findUnique({
      where: { email: DEFAULT_ADMIN.email },
      select: { id: true, email: true, name: true, role: true, status: true, passwordHash: true }
    });
    
    if (existing) {
      console.log('Admin exists, updating password...');
      
      // Update password and ensure correct role/status
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, SALT_ROUNDS);
      const updated = await db.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: DEFAULT_ADMIN.role,
          status: 'ACTIVE',
        },
        select: { id: true, email: true, name: true, role: true, status: true }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Admin user updated',
        user: updated,
        credentials: {
          email: DEFAULT_ADMIN.email,
          password: DEFAULT_ADMIN.password,
        }
      });
    }
    
    // Create new admin
    console.log('Creating admin user...');
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, SALT_ROUNDS);
    
    const admin = await db.user.create({
      data: {
        email: DEFAULT_ADMIN.email,
        passwordHash: passwordHash,
        name: DEFAULT_ADMIN.name,
        role: DEFAULT_ADMIN.role,
        status: 'ACTIVE',
        authProvider: 'email',
        phone: DEFAULT_ADMIN.phone,
      },
      select: { id: true, email: true, name: true, role: true, status: true }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Admin user created',
      user: admin,
      credentials: {
        email: DEFAULT_ADMIN.email,
        password: DEFAULT_ADMIN.password,
      }
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
  }
}

/**
 * Seed Admin User to Production Database
 *
 * Run this script to create the admin user on Vercel/Production.
 *
 * SECURITY: Admin credentials MUST be provided via env vars:
 *   SEED_ADMIN_EMAIL     (required)
 *   SEED_ADMIN_PASSWORD  (required, min 8 chars)
 *   SEED_ADMIN_NAME      (optional, default 'System Administrator')
 *   SEED_ADMIN_PHONE     (optional)
 *
 * Usage: bun prisma/seed-production-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('=================================');
  console.log('Smart Ride - Production Admin Seed');
  console.log('=================================');

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';
  const adminPhone = process.env.SEED_ADMIN_PHONE || null;

  if (!adminEmail || !adminPassword) {
    console.error(
      'ERROR: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars must be set. ' +
        'Refusing to seed with hardcoded credentials.'
    );
    process.exit(1);
  }
  if (adminPassword.length < 8) {
    console.error('ERROR: SEED_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }
  
  console.log(`\nChecking if admin exists: ${adminEmail}`);
  
  // Check if admin exists
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  
  if (existing) {
    console.log(`✓ Admin already exists: ${existing.email} (${existing.role})`);
    console.log(`  Status: ${existing.status}`);
    console.log(`  Has password: ${!!existing.passwordHash}`);
    
    // Update password just in case
    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: existing.id },
      data: { 
        passwordHash,
        status: 'ACTIVE',
        role: 'SUPER_ADMIN'
      },
    });
    console.log('✅ Password updated successfully!');
  } else {
    console.log('Creating new admin user...');
    
    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    
    // Create admin
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: passwordHash,
        name: adminName,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        authProvider: 'email',
        phone: adminPhone,
      },
    });
    
    console.log(`✅ Created admin: ${admin.email} (${admin.role})`);
  }
  
  // Verify
  const verify = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, name: true, role: true, status: true, passwordHash: true }
  });

  console.log('=================================');
  console.log('Verification:');
  console.log(JSON.stringify(verify, null, 2));
  console.log('=================================');
  console.log('\n✅ Admin credentials:');
  console.log(`   Email: ${adminEmail}`);
  console.log('   Password: (set via SEED_ADMIN_PASSWORD env var — not printed)');
  console.log('=================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

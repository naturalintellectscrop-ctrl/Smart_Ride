/**
 * Seed Admin User to Production Database
 * 
 * Run this script to create the admin user on Vercel/Production
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
  
  const adminEmail = 'naturalintellectscrop@gmail.com';
  const adminPassword = 'Admin@123';
  
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
        name: 'System Administrator',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        authProvider: 'email',
        phone: '+256700000000',
      },
    });
    
    console.log(`✅ Created admin: ${admin.email} (${admin.role})`);
  }
  
  // Verify
  const verify = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, name: true, role: true, status: true, passwordHash: true }
  });
  
  console.log('\n=================================');
  console.log('Verification:');
  console.log(JSON.stringify(verify, null, 2));
  console.log('=================================');
  console.log('\n✅ Admin credentials:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
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

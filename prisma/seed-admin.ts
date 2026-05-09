/**
 * Admin Seed Script
 * 
 * Creates admin users with properly hashed passwords.
 * Run with: bunx prisma db seed
 * 
 * Or create individual admin:
 * bun prisma/seed-admin.ts admin@example.com "Password123" SUPER_ADMIN
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

interface AdminData {
  email: string;
  password: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATIONS_ADMIN' | 'COMPLIANCE_ADMIN' | 'FINANCE_ADMIN';
  phone?: string;
}

// Default admins to create
const DEFAULT_ADMINS: AdminData[] = [
  {
    email: 'naturalintellectscrop@gmail.com',
    password: 'Admin@123',
    name: 'System Administrator',
    role: 'SUPER_ADMIN',
    phone: '+256700000000',
  },
];

async function createAdmin(adminData: AdminData) {
  console.log(`\nChecking admin: ${adminData.email}`);
  
  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: adminData.email },
  });
  
  if (existing) {
    console.log(`✓ Admin already exists: ${adminData.email} (${existing.role})`);
    return existing;
  }
  
  // Validate password strength
  if (adminData.password.length < 8) {
    throw new Error(`Password for ${adminData.email} must be at least 8 characters`);
  }
  
  // Hash password with bcrypt
  const passwordHash = await bcrypt.hash(adminData.password, SALT_ROUNDS);
  
  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: adminData.email,
      passwordHash: passwordHash,
      name: adminData.name,
      role: adminData.role,
      status: 'ACTIVE',
      authProvider: 'email',
      phone: adminData.phone || null,
    },
  });
  
  console.log(`✅ Created admin: ${admin.email} (${admin.role})`);
  return admin;
}

async function main() {
  console.log('=================================');
  console.log('Smart Ride - Admin Seed Script');
  console.log('=================================');
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  
  if (args.length >= 3) {
    // Create admin from command line args
    const [email, password, role, name] = args;
    await createAdmin({
      email,
      password,
      name: name || 'Admin User',
      role: role as AdminData['role'],
    });
  } else {
    // Create default admins
    console.log('\nCreating default admins...\n');
    
    for (const adminData of DEFAULT_ADMINS) {
      await createAdmin(adminData);
    }
  }
  
  console.log('\n=================================');
  console.log('Seed completed successfully!');
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

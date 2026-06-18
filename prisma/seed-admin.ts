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

// SECURITY: No default admins are hardcoded. Admins must be created via:
//   1. CLI args:  bun prisma/seed-admin.ts <email> <password> <role> [name]
//   2. Env vars:  SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_ROLE,
//                 SEED_ADMIN_NAME (optional)
// Running with no args and no env vars will refuse to seed.

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
    // SECURITY: No hardcoded defaults. Fall back to env vars, or refuse.
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const role = (process.env.SEED_ADMIN_ROLE as AdminData['role']) || 'ADMIN';
    const name = process.env.SEED_ADMIN_NAME || 'Admin User';

    if (!email || !password) {
      console.error(
        '\nERROR: No admin credentials provided.\n' +
          'Provide admin details via CLI args:\n' +
          '  bun prisma/seed-admin.ts <email> <password> <role> [name]\n' +
          'Or via env vars:\n' +
          '  SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_ROLE (optional), SEED_ADMIN_NAME (optional)\n' +
          'Refusing to seed with hardcoded credentials.'
      );
      process.exit(1);
    }

    await createAdmin({ email, password, role, name });
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

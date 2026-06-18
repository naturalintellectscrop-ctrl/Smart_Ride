import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * SECURITY: Admin credentials MUST be provided via env vars. There are NO
 * hardcoded fallbacks. If the env vars are unset, the seed refuses to run.
 *
 * Required env vars:
 *   SEED_ADMIN_EMAIL    e.g. admin@smartride.com
 *   SEED_ADMIN_PASSWORD (plain text — hashed with bcrypt before storage)
 *   SEED_ADMIN_NAME     e.g. Admin User
 *
 * Optional:
 *   SEED_ADMIN_ROLE     default ADMIN (SUPER_ADMIN | ADMIN | OPERATIONS_ADMIN ...)
 */
async function main() {
  console.log('Starting seed...');

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Admin User';
  const role = (process.env.SEED_ADMIN_ROLE as UserRole) || UserRole.ADMIN;

  if (!email || !password) {
    console.error(
      'ERROR: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars must be set. ' +
        'Refusing to seed with hardcoded credentials.'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ERROR: SEED_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  // Upsert admin user (create or update)
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role,
    },
    create: {
      email,
      name,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      authProvider: 'email',
    },
  });

  console.log('Admin user ready:');
  console.log('  Email:', admin.email);
  console.log('  Name:', admin.name);
  console.log('  Role:', admin.role);
  console.log('  Password: (set via SEED_ADMIN_PASSWORD env var — not printed)');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * One-off utility: reset the SUPER_ADMIN password to the value configured
 * via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=naturalintellectscrop@gmail.com \
 *   SEED_ADMIN_PASSWORD='intellects@nrtcorp' \
 *   DATABASE_URL='postgresql://...' \
 *   bun run fix-admin-password.ts
 *
 * SECURITY: No credentials are hardcoded in this file. All values must come
 * from the environment. If the env vars are missing, the script aborts.
 */

import pkg from '@prisma/client';
import bcrypt from 'bcryptjs';

const { PrismaClient } = pkg;

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const SALT_ROUNDS = 12;

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      'ABORT: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars must both be set. ' +
        'No credentials are hardcoded in this script for security reasons.'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ABORT: SEED_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    // Try to update an existing admin user first.
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      const updated = await prisma.user.update({
        where: { email },
        data: {
          passwordHash: hash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
        select: { id: true, email: true, name: true, role: true, status: true },
      });
      console.log('OK: password reset for existing admin:', updated.email, '| role:', updated.role);
      return;
    }

    // Otherwise create the admin user.
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name: 'System Administrator',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        authProvider: 'email',
        phone: '+256700000000',
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    console.log('OK: created new SUPER_ADMIN:', created.email);
  } catch (error: any) {
    console.error('Error resetting admin password:', error.message);
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

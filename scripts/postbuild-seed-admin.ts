/**
 * Post-build admin seed script — runs during Vercel build step.
 *
 * This script automatically syncs the admin user's password with the
 * SEED_ADMIN_PASSWORD env var on every deployment, so the admin password
 * always matches what's configured in Vercel — no manual curl needed.
 *
 * BEHAVIOR:
 * - If SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are set: creates or updates
 *   the admin user with SUPER_ADMIN role.
 * - If env vars are NOT set: logs a warning and exits 0 (does NOT fail the build).
 * - If DATABASE_URL is not set or DB is unreachable: logs a warning and exits 0
 *   (does NOT fail the build — Vercel build should not depend on DB availability).
 *
 * SECURITY: No credentials are hardcoded. All from env vars only.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';
  const adminPhone = process.env.SEED_ADMIN_PHONE || null;
  const databaseUrl = process.env.DATABASE_URL;

  // If env vars not set, skip gracefully
  if (!adminEmail || !adminPassword) {
    console.log('[postbuild-seed] SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set — skipping admin seed.');
    console.log('[postbuild-seed] Set these in Vercel env vars to auto-seed the admin account.');
    return;
  }

  if (!databaseUrl) {
    console.log('[postbuild-seed] DATABASE_URL not set — skipping admin seed.');
    return;
  }

  if (adminPassword.length < 8) {
    console.warn('[postbuild-seed] SEED_ADMIN_PASSWORD is less than 8 chars — skipping (too short).');
    return;
  }

  console.log('[postbuild-seed] Connecting to database...');
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log(`[postbuild-seed] Checking for admin: ${adminEmail}`);

    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, email: true, role: true, status: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log(`[postbuild-seed] ✅ Admin password updated for: ${existing.email}`);
    } else {
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: adminName,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          authProvider: 'email',
          phone: adminPhone,
        },
      });
      console.log(`[postbuild-seed] ✅ Admin user created: ${adminEmail}`);
    }
  } catch (error) {
    // Don't fail the build if DB is unreachable — Vercel builds shouldn't
    // depend on DB availability. The /api/admin/setup endpoint can still
    // be called manually later.
    console.warn('[postbuild-seed] Could not connect to database — skipping admin seed.');
    console.warn('[postbuild-seed] You can still seed manually via: /api/admin/setup?key=<ADMIN_SETUP_KEY>');
    if (error instanceof Error) {
      console.warn(`[postbuild-seed] Error: ${error.message}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  // Never fail the build — just warn
  console.warn('[postbuild-seed] Unexpected error — build will continue.');
  process.exit(0);
});

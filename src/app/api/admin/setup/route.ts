/**
 * GET /api/admin/setup?key=<ADMIN_SETUP_KEY>
 * POST /api/admin/setup  (body: { key: <ADMIN_SETUP_KEY> })
 *
 * Seeds or updates the default admin user from environment variables.
 *
 * SECURITY:
 *   - All credentials come from environment variables only (no hardcoding).
 *   - Requires the ADMIN_SETUP_KEY env var to be set AND the request to
 *     supply a matching `key` parameter.
 *   - If ADMIN_SETUP_KEY is not set on the server, returns 500 with a
 *     helpful message telling the operator to set it.
 *   - If the key is set but the request supplies the wrong/no key, returns
 *     401 with a message explaining where to find the correct key.
 *
 * USAGE (after setting env vars on Vercel):
 *   curl "https://smartrideug.vercel.app/api/admin/setup?key=YOUR_ACTUAL_KEY_VALUE"
 *
 * NOTE: "YOUR_ADMIN_SETUP_KEY" is a PLACEHOLDER string used in docs.
 *       Do NOT send the literal word "YOUR_ADMIN_SETUP_KEY" — you must
 *       send the actual value you set as the ADMIN_SETUP_KEY env var in
 *       Vercel → Settings → Environment Variables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Shared core: validate key, read env vars, upsert admin user.
 * Returns a NextResponse suitable for both GET and POST handlers.
 */
async function runSetup(providedKey: string | null | undefined) {
  await setServiceRoleContext();
  try {
    const requiredSetupKey = process.env.ADMIN_SETUP_KEY;

    if (!requiredSetupKey) {
      console.error('[Admin Setup] ADMIN_SETUP_KEY environment variable is not configured');
      return NextResponse.json(
        {
          success: false,
          error:
            'Setup is not configured on this server. Set the ADMIN_SETUP_KEY environment variable in Vercel → Settings → Environment Variables, then redeploy and retry.',
        },
        { status: 500 }
      );
    }

    // Common mistake: user sent the literal placeholder string from the docs.
    if (
      !providedKey ||
      providedKey.trim() === '' ||
      providedKey === 'YOUR_ADMIN_SETUP_KEY' ||
      providedKey === 'replace_with_strong_random_string'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized. You must pass the ACTUAL value of the ADMIN_SETUP_KEY env var (not the placeholder text). Find it in Vercel → your project → Settings → Environment Variables → ADMIN_SETUP_KEY. Then call: /api/admin/setup?key=<that_value>',
        },
        { status: 401 }
      );
    }

    if (providedKey !== requiredSetupKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized. The key you supplied does not match the ADMIN_SETUP_KEY env var on this server. Double-check the value in Vercel → Settings → Environment Variables.',
        },
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
        {
          success: false,
          error:
            'Admin credentials are not configured. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars in Vercel (e.g. naturalintellectscrop@gmail.com / intellects@nrtcorp), redeploy, then retry.',
        },
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
      select: { id: true, email: true, name: true, role: true, status: true, passwordHash: true },
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
        select: { id: true, email: true, name: true, role: true, status: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Admin user updated. You can now log in at /intellects/admin with the SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD credentials.',
        user: updated,
        loginUrl: '/intellects/admin',
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
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin user created. You can now log in at /intellects/admin with the SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD credentials.',
      user: admin,
      loginUrl: '/intellects/admin',
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

export async function GET(request: NextRequest) {
  const setupKey = request.nextUrl.searchParams.get('key');
  return runSetup(setupKey);
}

export async function POST(request: NextRequest) {
  let body: { key?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional / invalid JSON — treat as missing key.
  }
  return runSetup(body.key);
}

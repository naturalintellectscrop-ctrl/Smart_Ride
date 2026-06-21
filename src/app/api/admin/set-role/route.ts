/**
 * POST /api/admin/set-role
 *
 * Admin tool to directly change ANY user's role. Useful when:
 *   - A user accidentally selected the wrong role during onboarding
 *   - A user is stuck on the rider/driver/merchant onboarding screen
 *     and can't get back to the main app
 *   - Admin needs to promote/demote a user
 *
 * SECURITY:
 *   - Requires the ADMIN_SETUP_KEY env var to be set AND the request to
 *     supply a matching `key` in the request body.
 *   - Same key used by /api/admin/setup and /api/admin/force-reset-password.
 *   - All actions are recorded in the audit log.
 *
 * USAGE:
 *   curl -X POST https://smartrideug.vercel.app/api/admin/set-role \
 *     -H "Content-Type: application/json" \
 *     -d '{"key":"YOUR_ADMIN_SETUP_KEY","email":"user@example.com","role":"CLIENT"}'
 *
 * Valid roles: CLIENT, RIDER, DRIVER, MERCHANT, PHARMACIST,
 *              ADMIN, SUPER_ADMIN, OPERATIONS_ADMIN, COMPLIANCE_ADMIN, FINANCE_ADMIN
 *
 * NOTE: Admin roles (ADMIN, SUPER_ADMIN, etc.) are protected — they can only
 * be set if the target user is ALREADY an admin. This prevents privilege
 * escalation via this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { isAdminRole } from '@/lib/config/mobile-access';
import { z } from 'zod';

const ALL_VALID_ROLES = [
  'CLIENT',
  'RIDER',
  'DRIVER',
  'MERCHANT',
  'PHARMACIST',
  'ADMIN',
  'SUPER_ADMIN',
  'OPERATIONS_ADMIN',
  'COMPLIANCE_ADMIN',
  'FINANCE_ADMIN',
] as const;

const setRoleSchema = z.object({
  key: z.string().min(1, 'Admin key is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(ALL_VALID_ROLES),
});

export async function POST(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const body = await request.json();
    const validationResult = setRoleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const { key, email, role } = validationResult.data;

    // Verify admin key
    const requiredKey = process.env.ADMIN_SETUP_KEY;
    if (!requiredKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Admin set-role is not configured. Set ADMIN_SETUP_KEY in Vercel → Settings → Environment Variables.',
        },
        { status: 500 }
      );
    }

    if (key !== requiredKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: invalid admin key.' },
        { status: 401 }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: `No user found with email: ${email}` },
        { status: 404 }
      );
    }

    // Anti-escalation: cannot GRANT admin role to a non-admin user via this endpoint.
    // Admin roles can only be set if the user is already an admin (e.g., role correction).
    if (isAdminRole(role) && !isAdminRole(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Cannot grant admin role to a non-admin user via this endpoint. Admin roles must be granted through the admin setup process.',
        },
        { status: 403 }
      );
    }

    const previousRole = user.role;

    // Skip if no change
    if (previousRole === role) {
      return NextResponse.json({
        success: true,
        message: `User ${user.email} already has role ${role}. No change made.`,
      });
    }

    // Update the user's role
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { role },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        actorType: 'ADMIN',
        action: 'ADMIN_ROLE_CHANGE',
        entityType: 'USER',
        entityId: user.id,
        userId: user.id,
        description: `Admin changed role for ${user.email} from ${previousRole} to ${role}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Role updated successfully for ${user.email}: ${previousRole} → ${role}. The user should log out and log back in for the change to take effect in the app.`,
      data: {
        userId: updatedUser.id,
        email: updatedUser.email,
        previousRole,
        newRole: role,
      },
    });
  } catch (error) {
    console.error('Set role error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update role. Please try again.' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

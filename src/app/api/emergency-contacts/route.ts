/**
 * Emergency contacts.
 *
 * SECURITY: every handler took `userId` from the query string with no
 * authentication, under setServiceRoleContext(). Anyone who could reach the URL
 * could read, add, edit or delete any user's next of kin — names and phone
 * numbers of the people a rider has nominated to be called if something happens
 * to them. Verified reachable without a token before this was added.
 *
 * The owner is now the token holder. The query parameter is accepted only from
 * an admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import { z } from 'zod';
import { phoneSchema } from '@/lib/validation/api-schemas';

/**
 * Whose contacts the caller may touch: their own, or anyone's if they are an
 * admin. Returns the owning id, or a response to send instead.
 */
function resolveOwner(
  request: NextRequest,
  requested: string | null
): { ownerId: string } | { error: NextResponse } {
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return {
      error: NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: auth.statusCode || 401 }
      ),
    };
  }
  if (isAdmin(auth.user.role)) {
    return { ownerId: requested || auth.user.userId };
  }
  if (requested && requested !== auth.user.userId) {
    return {
      error: NextResponse.json(
        { success: false, error: 'These contacts belong to another user' },
        { status: 403 }
      ),
    };
  }
  return { ownerId: auth.user.userId };
}

// GET /api/emergency-contacts - List emergency contacts for a user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = resolveOwner(request, searchParams.get('userId') || searchParams.get('riderId'));
  if ('error' in owner) return owner.error;

  await setServiceRoleContext();
  try {
    const userId = owner.ownerId;
    const riderId = null;
    const userType = searchParams.get('userType') || 'CLIENT';

    const contacts = await db.emergencyContact.findMany({
      where: {
        userId: userId || riderId || undefined,
        userType: userType as 'CLIENT' | 'RIDER',
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch emergency contacts' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST /api/emergency-contacts - Add new emergency contact
export async function POST(request: NextRequest) {
  const owner = resolveOwner(request, null);
  if ('error' in owner) return owner.error;

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const {
      userId,
      riderId,
      userType,
      name,
      phone,
      email,
      relationship,
      isPrimary,
    } = body;

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // The owner is the authenticated caller. A body-supplied userId would let
    // anyone attach a contact to someone else's account — which for an SOS
    // contact means redirecting the call for help.
    void userId;
    void riderId;
    const ownerId = owner.ownerId;

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await db.emergencyContact.updateMany({
        where: {
          userId: ownerId,
          userType: userType || 'CLIENT',
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    // Generate verification code
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const contact = await db.emergencyContact.create({
      data: {
        userId: ownerId,
        userType: userType || 'CLIENT',
        name,
        phone,
        email: email || null,
        relationship: relationship || 'Other',
        isPrimary: isPrimary || false,
        verificationCode,
      },
    });

    return NextResponse.json({
      success: true,
      contact,
      message: 'Emergency contact added. Verification needed.',
    });
  } catch (error) {
    console.error('Error creating emergency contact:', error);
    return NextResponse.json({ success: false, error: 'Failed to create emergency contact' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// PUT /api/emergency-contacts - Update emergency contact
export async function PUT(request: NextRequest) {
  const owner = resolveOwner(request, null);
  if ('error' in owner) return owner.error;

  await setServiceRoleContext();
  try {
    const body = await request.json();

    const updateContactSchema = z.object({
      id: z.string().min(1),
      name: z.string().max(100).optional(),
      phone: phoneSchema.optional(),
      email: z.string().email().optional(),
      relationship: z.string().max(50).optional(),
      isPrimary: z.boolean().optional(),
    });

    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Ownership is checked against the stored row, not against anything the
    // caller sent: an id alone must not be enough to edit someone's contact.
    const existing = await db.emergencyContact.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }
    if (existing.userId !== owner.ownerId) {
      return NextResponse.json(
        { success: false, error: 'This contact belongs to another user' },
        { status: 403 }
      );
    }

    // If setting as primary, unset other primary contacts
    if (updateData.isPrimary) {
      const contact = await db.emergencyContact.findUnique({
        where: { id },
      });
      if (contact) {
        await db.emergencyContact.updateMany({
          where: {
            userId: contact.userId,
            userType: contact.userType,
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }
    }

    const contact = await db.emergencyContact.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return NextResponse.json({ success: false, error: 'Failed to update emergency contact' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// DELETE /api/emergency-contacts - Delete emergency contact
export async function DELETE(request: NextRequest) {
  const owner = resolveOwner(request, null);
  if ('error' in owner) return owner.error;

  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.emergencyContact.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }
    if (existing.userId !== owner.ownerId) {
      return NextResponse.json(
        { success: false, error: 'This contact belongs to another user' },
        { status: 403 }
      );
    }

    await db.emergencyContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete emergency contact' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

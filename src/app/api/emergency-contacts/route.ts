import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/emergency-contacts - List emergency contacts for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const riderId = searchParams.get('riderId');
    const userType = searchParams.get('userType') || 'CLIENT';

    if (!userId && !riderId) {
      return NextResponse.json(
        { error: 'User ID or Rider ID is required' },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: 'Failed to fetch emergency contacts' },
      { status: 500 }
    );
  }
}

// POST /api/emergency-contacts - Add new emergency contact
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    if (!userId && !riderId) {
      return NextResponse.json(
        { error: 'User ID or Rider ID is required' },
        { status: 400 }
      );
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await db.emergencyContact.updateMany({
        where: {
          userId: userId || riderId,
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
        userId: userId || riderId,
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
    return NextResponse.json(
      { error: 'Failed to create emergency contact' },
      { status: 500 }
    );
  }
}

// PUT /api/emergency-contacts - Update emergency contact
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
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
    return NextResponse.json(
      { error: 'Failed to update emergency contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/emergency-contacts - Delete emergency contact
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    await db.emergencyContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete emergency contact' },
      { status: 500 }
    );
  }
}

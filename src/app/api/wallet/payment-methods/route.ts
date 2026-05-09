import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/wallet/payment-methods - Get user payment methods
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const paymentMethods = await db.userPaymentMethod.findMany({
      where: { userId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}

// POST /api/wallet/payment-methods - Add new payment method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, name, accountNumber, cardLastFour, cardBrand, phoneNumber } = body;

    if (!userId || !type || !name) {
      return NextResponse.json({ error: 'userId, type, and name are required' }, { status: 400 });
    }

    // Check if this is the first payment method (make it default)
    const existingCount = await db.userPaymentMethod.count({
      where: { userId, isActive: true },
    });

    const paymentMethod = await db.userPaymentMethod.create({
      data: {
        userId,
        type,
        name,
        accountNumber,
        cardLastFour,
        cardBrand,
        phoneNumber,
        isDefault: existingCount === 0,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, paymentMethod });
  } catch (error) {
    console.error('Error adding payment method:', error);
    return NextResponse.json({ error: 'Failed to add payment method' }, { status: 500 });
  }
}

// PUT /api/wallet/payment-methods - Set default payment method
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, paymentMethodId } = body;

    if (!userId || !paymentMethodId) {
      return NextResponse.json({ error: 'userId and paymentMethodId are required' }, { status: 400 });
    }

    // Verify the payment method belongs to the user
    const paymentMethod = await db.userPaymentMethod.findFirst({
      where: { id: paymentMethodId, userId, isActive: true },
    });

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Update all payment methods for this user
    await db.$transaction([
      // Remove default from all
      db.userPaymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      // Set the selected one as default
      db.userPaymentMethod.update({
        where: { id: paymentMethodId },
        data: { isDefault: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return NextResponse.json({ error: 'Failed to set default payment method' }, { status: 500 });
  }
}

// DELETE /api/wallet/payment-methods - Remove payment method
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const paymentMethodId = searchParams.get('paymentMethodId');

    if (!userId || !paymentMethodId) {
      return NextResponse.json({ error: 'userId and paymentMethodId are required' }, { status: 400 });
    }

    // Verify the payment method belongs to the user
    const paymentMethod = await db.userPaymentMethod.findFirst({
      where: { id: paymentMethodId, userId, isActive: true },
    });

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await db.userPaymentMethod.update({
      where: { id: paymentMethodId },
      data: { isActive: false },
    });

    // If the removed one was default, set another as default
    if (paymentMethod.isDefault) {
      const nextDefault = await db.userPaymentMethod.findFirst({
        where: { userId, isActive: true },
      });

      if (nextDefault) {
        await db.userPaymentMethod.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing payment method:', error);
    return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 });
  }
}

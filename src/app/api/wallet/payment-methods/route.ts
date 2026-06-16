import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';
import { z } from 'zod';

// GET /api/wallet/payment-methods - Get user payment methods
// SECURITY: Requires authentication - users can only access their own payment methods
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const user = authResult.user!;

  await setRLSContext(user);
  try {
    const paymentMethods = await db.userPaymentMethod.findMany({
      where: { userId: user.userId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payment methods' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

// POST /api/wallet/payment-methods - Add new payment method
// SECURITY: Requires authentication - userId derived from token, not request body
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const user = authResult.user!;

  await setRLSContext(user);
  try {
    const body = await request.json();
    const { type, name, accountNumber, cardLastFour, cardBrand, phoneNumber } = body;

    if (!type || !name) {
      return NextResponse.json({ success: false, error: 'type and name are required' }, { status: 400 });
    }

    // Check if this is the first payment method (make it default)
    const existingCount = await db.userPaymentMethod.count({
      where: { userId: user.userId, isActive: true },
    });

    const paymentMethod = await db.userPaymentMethod.create({
      data: {
        userId: user.userId, // Use authenticated user's ID
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
    return NextResponse.json({ success: false, error: 'Failed to add payment method' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

const putPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});

// PUT /api/wallet/payment-methods - Set default payment method
// SECURITY: Requires authentication - userId derived from token
export async function PUT(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const user = authResult.user!;

  await setRLSContext(user);
  try {
    const body = await request.json();
    const parsed = putPaymentMethodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }
    const { paymentMethodId } = parsed.data;

    // Verify the payment method belongs to the authenticated user
    const paymentMethod = await db.userPaymentMethod.findFirst({
      where: { id: paymentMethodId, userId: user.userId, isActive: true },
    });

    if (!paymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment method not found' }, { status: 404 });
    }

    // Update all payment methods for this user
    await db.$transaction([
      // Remove default from all
      db.userPaymentMethod.updateMany({
        where: { userId: user.userId },
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
    return NextResponse.json({ success: false, error: 'Failed to set default payment method' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

const deletePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});

// DELETE /api/wallet/payment-methods - Remove payment method
// SECURITY: Requires authentication - userId derived from token
export async function DELETE(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const user = authResult.user!;

  await setRLSContext(user);
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      paymentMethodId: searchParams.get('paymentMethodId') || '',
    };
    const parsed = deletePaymentMethodSchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }
    const { paymentMethodId } = parsed.data;

    // Verify the payment method belongs to the authenticated user
    const paymentMethod = await db.userPaymentMethod.findFirst({
      where: { id: paymentMethodId, userId: user.userId, isActive: true },
    });

    if (!paymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment method not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await db.userPaymentMethod.update({
      where: { id: paymentMethodId },
      data: { isActive: false },
    });

    // If the removed one was default, set another as default
    if (paymentMethod.isDefault) {
      const nextDefault = await db.userPaymentMethod.findFirst({
        where: { userId: user.userId, isActive: true },
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
    return NextResponse.json({ success: false, error: 'Failed to remove payment method' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

/**
 * Payment API Route
 * Handles payment initiation and status checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments/payment-service';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      amount,
      paymentMethod,
      phoneNumber,
      taskId,
      orderId,
      description,
      currency,
    } = body;

    // Validate required fields
    if (!amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Amount and payment method are required' },
        { status: 400 }
      );
    }

    // Validate phone number for mobile money
    if (['MTN_MOMO', 'AIRTEL_MONEY'].includes(paymentMethod) && !phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required for mobile money payments' },
        { status: 400 }
      );
    }

    // Initiate payment
    const result = await PaymentService.initiatePayment({
      userId: decoded.userId,
      amount: parseFloat(amount),
      currency: currency || 'UGX',
      paymentMethod,
      phoneNumber,
      taskId,
      orderId,
      description,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        payment: {
          id: result.paymentId,
          reference: result.reference,
          status: result.status,
          message: result.message,
        },
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get payment ID from query params
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Check payment status
    const result = await PaymentService.checkPaymentStatus(paymentId);

    return NextResponse.json({
      success: true,
      payment: {
        id: result.paymentId,
        reference: result.reference,
        status: result.status,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}

/**
 * Payment API Route
 * Handles payment initiation and status checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments/payment-service';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { db, setRLSContext, resetRLSContext, setServiceRoleContext } from '@/lib/db';
import { paymentLogger } from '@/lib/logging/logger';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting check — 5 payment requests per minute
  const rateLimitResult = checkRateLimit(request, RATE_LIMITS.payment.initiate);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult, RATE_LIMITS.payment.initiate);
  }

  // Verify authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Invalid token' },
      { status: 401 }
    );
  }

  await setRLSContext(decoded);
  try {
    // Parse request body
    const body = await request.json();
    const {
      amount,
      paymentMethod,
      phoneNumber,
      taskId,
      orderId,
      providerOrderId,
      description,
      currency,
    } = body;

    if (!paymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Validate phone number for mobile money
    if (['MTN_MOMO', 'AIRTEL_MONEY'].includes(paymentMethod) && !phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number is required for mobile money payments' },
        { status: 400 }
      );
    }

    // ── BE-041: what a customer owes is the server's to decide ──────────────
    //
    // This route used to take `amount` from the request body and write it
    // straight to the payment record. Nothing looked the obligation up, so the
    // client was the sole authority on how much it was settling: a UGX 50,000
    // fare could be paid off with 100, an obligation could be settled for zero
    // or a negative number, and a payment could be attached to a task
    // belonging to someone else entirely. The mobile client's own comment
    // conceded it — "the endpoint trusts the amount it is given".
    //
    // The amount is now DERIVED from the task or order being settled, and the
    // caller must own it. The client's number is treated as a claim to check,
    // never as an instruction to follow.
    if (!taskId && !orderId && !providerOrderId) {
      // Nothing to derive an amount from. A wallet top-up is the one case
      // where a user-chosen amount is legitimate, and it has its own route.
      return NextResponse.json(
        {
          success: false,
          error: 'A payment must reference the task or order it settles. Use /api/wallet/topup to add funds.',
        },
        { status: 400 }
      );
    }

    // Read the obligation with service-role authority, then check ownership
    // explicitly. Doing the ownership test ourselves — rather than leaning on
    // RLS to hide the row — keeps the refusal reason unambiguous and does not
    // depend on which policies happen to exist for each model.
    await setServiceRoleContext();

    // Initialised so the compiler can see that every path either assigns them
    // or has already returned; the guard below catches an unassigned amount.
    let derivedAmount = 0;
    let settledLabel = '';

    if (taskId) {
      const task = await db.task.findUnique({
        where: { id: String(taskId) },
        select: { clientId: true, totalAmount: true, paymentStatus: true, taskNumber: true },
      });
      if (!task) {
        return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      }
      if (task.clientId !== decoded.userId) {
        paymentLogger.error('Payment initiate refused: caller does not own the task', {
          userId: decoded.userId,
          taskId: String(taskId),
        });
        return NextResponse.json(
          { success: false, error: 'You cannot pay for a task that is not yours' },
          { status: 403 }
        );
      }
      if (task.paymentStatus === 'COMPLETED') {
        // Stale screen or a replayed request — the obligation is already gone.
        return NextResponse.json(
          { success: false, error: 'This task has already been paid' },
          { status: 409 }
        );
      }
      derivedAmount = Number(task.totalAmount);
      settledLabel = `task ${task.taskNumber}`;
    } else if (orderId) {
      const order = await db.order.findUnique({
        where: { id: String(orderId) },
        select: { clientId: true, totalAmount: true, paymentStatus: true, orderNumber: true },
      });
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      if (order.clientId !== decoded.userId) {
        paymentLogger.error('Payment initiate refused: caller does not own the order', {
          userId: decoded.userId,
          orderId: String(orderId),
        });
        return NextResponse.json(
          { success: false, error: 'You cannot pay for an order that is not yours' },
          { status: 403 }
        );
      }
      if (order.paymentStatus === 'COMPLETED') {
        return NextResponse.json(
          { success: false, error: 'This order has already been paid' },
          { status: 409 }
        );
      }
      derivedAmount = Number(order.totalAmount);
      settledLabel = `order ${order.orderNumber}`;
    }

    // Pharmacy/health orders. They live in their own model, and until the
    // `Payment.providerOrderId` column existed there was nowhere to record
    // that one had been paid for — so this branch could not be written and the
    // pharmacy's payment state was a string nothing backed. Same rules as the
    // two above: the customer must own it, the amount is the server's, and an
    // already-paid order is refused rather than charged twice.
    else if (providerOrderId) {
      const po = await db.providerOrder.findUnique({
        where: { id: String(providerOrderId) },
        select: { customerId: true, totalAmount: true, paymentStatus: true, orderNumber: true },
      });
      if (!po) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      if (po.customerId !== decoded.userId) {
        paymentLogger.error('Payment initiate refused: caller does not own the pharmacy order', {
          userId: decoded.userId,
          providerOrderId: String(providerOrderId),
        });
        return NextResponse.json(
          { success: false, error: 'You cannot pay for an order that is not yours' },
          { status: 403 }
        );
      }
      if (po.paymentStatus === 'COMPLETED') {
        return NextResponse.json(
          { success: false, error: 'This order has already been paid' },
          { status: 409 }
        );
      }
      derivedAmount = Number(po.totalAmount);
      settledLabel = `pharmacy order ${po.orderNumber}`;
    }

    if (!Number.isFinite(derivedAmount) || derivedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'This item has no amount due' },
        { status: 409 }
      );
    }

    // A disagreement between what the client thinks it owes and what it
    // actually owes is refused outright rather than quietly corrected. Silently
    // charging the right amount would hide a client that has drifted out of
    // sync — or one that is probing — and both are worth seeing.
    // Omitting `amount` is fine — the server already knows the figure. Sending
    // one that is not a finite number is not: it means the caller believes it
    // is settling something, and we cannot tell what. Refuse rather than
    // charge the derived amount against a request we could not read.
    const claimed = amount === undefined || amount === null
      ? derivedAmount
      : (typeof amount === 'number' ? amount : parseFloat(amount));

    if (!Number.isFinite(claimed)) {
      paymentLogger.error('Payment initiate refused: unreadable amount', {
        userId: decoded.userId,
        settling: settledLabel,
        received: String(amount),
      });
      return NextResponse.json(
        { success: false, error: 'Payment amount is not a valid number' },
        { status: 400 }
      );
    }

    if (Math.round(claimed) !== Math.round(derivedAmount)) {
      paymentLogger.error('Payment amount mismatch — refusing', {
        userId: decoded.userId,
        settling: settledLabel,
        claimed: Math.round(claimed),
        actual: Math.round(derivedAmount),
      });
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount does not match the amount due (UGX ${Math.round(derivedAmount).toLocaleString()}).`,
        },
        { status: 400 }
      );
    }

    // ── BE-043: creating the payment is a system write ─────────────────────
    //
    // The service-role context set above is deliberately kept for the insert.
    // `Payment` has three RLS policies — service_role_access (ALL), admin_read
    // (SELECT) and users_read_own_payments (SELECT) — and NOT ONE of them
    // permits INSERT for an ordinary user. A customer can read their own
    // payments and never create one, so every attempt to pay for a task under
    // the caller's own context died on
    //   "new row violates row-level security policy for table Payment".
    // Recording a payment is the platform acting on the customer's behalf, not
    // the customer writing a row, and the policy set says exactly that.
    //
    // Elevating here is safe precisely because authorization is no longer
    // implicit: the block above has already proved the caller owns the
    // obligation and that the amount is the server's own figure. The `finally`
    // below resets the context, so the elevation cannot outlive this request.

    // Initiate payment — with the amount the SERVER derived, never the client's.
    const result = await PaymentService.initiatePayment({
      userId: decoded.userId,
      amount: derivedAmount,
      currency: currency || 'UGX',
      paymentMethod,
      phoneNumber,
      taskId,
      orderId,
      providerOrderId,
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
      return NextResponse.json({ success: false, error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to initiate payment' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Invalid token' },
      { status: 401 }
    );
  }

  await setRLSContext(decoded);
  try {
    // Get payment ID from query params
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Payment ID is required' },
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
    return NextResponse.json({ success: false, error: 'Failed to check payment status' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

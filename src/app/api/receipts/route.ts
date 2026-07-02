/**
 * POST /api/receipts   { taskId }  → generate (idempotent) the receipt for a
 *                                     completed task, email it, return it.
 * GET  /api/receipts               → list the authenticated user's receipts.
 *
 * Receipts are privacy-safe by construction (first names only, no phone numbers).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import { ensureReceiptForTask } from '@/lib/receipts/receipt-service';
import { sendReceiptEmail } from '@/lib/receipts/send-receipt-email';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }
  const user = auth.user!;
  await setRLSContext({ userId: user.userId, role: user.role });
  try {
    const body = await request.json().catch(() => ({}));
    const taskId = body?.taskId as string | undefined;
    if (!taskId) {
      return NextResponse.json({ success: false, error: 'taskId is required' }, { status: 400 });
    }

    // Ownership: the caller must be the task's client or the assigned rider (or admin).
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { clientId: true, riderId: true },
    });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
    if (!isAdmin(user.role)) {
      let allowed = task.clientId === user.userId;
      if (!allowed && task.riderId) {
        const rider = await db.rider.findUnique({ where: { id: task.riderId }, select: { userId: true } });
        allowed = rider?.userId === user.userId;
      }
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    const receipt = await ensureReceiptForTask(taskId);
    if (!receipt) {
      return NextResponse.json(
        { success: false, error: 'Receipt not available yet — the transaction is not completed.' },
        { status: 409 }
      );
    }

    // Fire-and-forget email (never blocks the response).
    if (!receipt.emailedAt) {
      sendReceiptEmail(receipt.id).catch(() => {});
    }

    return NextResponse.json({ success: true, data: receipt });
  } catch (error) {
    console.error('[receipts POST] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate receipt' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }
  const user = auth.user!;
  await setRLSContext({ userId: user.userId, role: user.role });
  try {
    const receipts = await db.receipt.findMany({
      where: { userId: user.userId },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ success: true, data: receipts });
  } catch (error) {
    console.error('[receipts GET] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load receipts' }, { status: 500 });
  } finally {
    await resetRLSContext();
  }
}

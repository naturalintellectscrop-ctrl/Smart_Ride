/**
 * POST /api/dispatch/[id]/expire
 *
 * Rider-reported offer expiry. The driver app runs a local countdown from the
 * match's expiresAt; when it hits zero this endpoint marks the match EXPIRED
 * and IMMEDIATELY re-dispatches the task to the next eligible rider — so the
 * offer rotates through the pool in seconds instead of waiting for the
 * external cron sweep (which stays as the backstop for closed/killed apps).
 *
 * Security: rider-authenticated; only the rider the match was offered to can
 * expire it, only while PENDING, and only once the server-side expiresAt has
 * actually passed (small clock-skew grace) — a rider cannot dodge offers early.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { db, resetRLSContext, setServiceRoleContext } from '@/lib/db';

// Allow expiry reports this many ms BEFORE server expiresAt (clock skew).
const EXPIRY_GRACE_MS = 3_000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await setServiceRoleContext();

    const rider = await db.rider.findFirst({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!rider) {
      return NextResponse.json({ success: false, error: 'Rider profile not found' }, { status: 404 });
    }

    const match = await db.dispatchMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        riderId: true,
        taskId: true,
        status: true,
        expiresAt: true,
        task: { select: { taskType: true, pickupLatitude: true, pickupLongitude: true } },
      },
    });
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }
    if (match.riderId !== rider.id) {
      return NextResponse.json({ success: false, error: 'Not your dispatch offer' }, { status: 403 });
    }
    if (match.status !== 'PENDING') {
      // Already accepted/rejected/expired elsewhere — nothing to do.
      return NextResponse.json({ success: true, data: { status: match.status } });
    }
    if (match.expiresAt && match.expiresAt.getTime() - EXPIRY_GRACE_MS > Date.now()) {
      return NextResponse.json(
        { success: false, error: 'Offer has not expired yet' },
        { status: 400 }
      );
    }

    await DispatchService.expireMatch(matchId);

    // Rotate AFTER responding — the reporting driver's app shouldn't wait.
    // rotateAfterExpiry re-dispatches (excluding this rider while fresh
    // candidates exist) OR, after maxRetryAttempts failed offers, cancels the
    // task and notifies the client instead of looping forever.
    const task = match.task;
    if (task?.pickupLatitude != null && task?.pickupLongitude != null) {
      const taskId = match.taskId;
      after(async () => {
        try {
          await setServiceRoleContext();
          await DispatchService.rotateAfterExpiry(
            taskId,
            task.taskType,
            task.pickupLatitude!,
            task.pickupLongitude!,
          );
        } catch (e) {
          console.error('[dispatch/expire] rotation failed:', e);
        } finally {
          await resetRLSContext().catch(() => {});
        }
      });
    }

    return NextResponse.json({ success: true, data: { status: 'EXPIRED' } });
  } catch (error) {
    console.error('Dispatch expire error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

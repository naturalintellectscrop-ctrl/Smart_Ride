// ============================================
// SMART RIDE - DISPATCH REJECT API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { PlatformIntelligence } from '@/lib/intelligence/platform-events.service';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { db, setRLSContext, resetRLSContext, setServiceRoleContext } from '@/lib/db';
import { broadcastToTask } from '@/lib/realtime-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/dispatch/[id]/reject - Rider rejects dispatch
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: matchId } = await params;
    const body = await request.json();
    const { reason } = body;
    
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Service-role context: DispatchMatch has no rider-read RLS policy, so the
    // rider's own context can't see the match (same runtime failure as accept).
    // Authorization is the explicit riderId comparison below.
    await setServiceRoleContext();

    // Get rider ID from user (was `user.id` — undefined; authGuard returns userId)
    const rider = await db.rider.findFirst({
      where: { userId: user.userId },
    });

    if (!rider) {
      return NextResponse.json(
        { success: false, error: 'Rider profile not found' },
        { status: 400 }
      );
    }

    // Verify the match exists and belongs to this rider before rejecting
    const match = await db.dispatchMatch.findUnique({
      where: { id: matchId },
      include: {
        task: {
          select: {
            id: true,
            taskNumber: true,
            taskType: true,
            pickupLatitude: true,
            pickupLongitude: true,
            clientId: true,
            status: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Dispatch match not found' },
        { status: 404 }
      );
    }

    if (match.riderId !== rider.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to reject this dispatch' },
        { status: 403 }
      );
    }

    // Record the declined offer against the driver's acceptance rate.
    await PlatformIntelligence.onDispatchOffer(rider.id, 'DECLINED');

    // Create audit log for rejection BEFORE processing (for traceability)
    await db.auditLog.create({
      data: {
        actorId: rider.id,
        actorType: 'RIDER',
        userId: user.userId,
        taskId: match.taskId,
        action: 'DISPATCH_REJECTED',
        entityType: 'DispatchMatch',
        entityId: matchId,
        description: `Rider rejected dispatch for task ${match.task?.taskNumber || match.taskId}${reason ? `: ${reason}` : ''}`,
        source: 'MOBILE_APP',
        newValues: JSON.stringify({
          matchScore: match.matchScore,
          distanceKm: match.distanceKm,
          rejectionReason: reason || 'RIDER_DECLINED',
          retryCount: match.retryCount,
          taskStatus: match.task?.status,
        }),
      },
    });

    // Reject the match and trigger reassignment
    const result = await DispatchService.rejectMatch(matchId, rider.id, reason);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Emit realtime broadcast to task room if task is going back to SEARCHING
    // (i.e., retries remain and a new rider will be searched)
    const maxRetryAttempts = 3; // must match DISPATCH_CONFIG.maxRetryAttempts
    const nextRetryCount = match.retryCount + 1;
    if (nextRetryCount < maxRetryAttempts && match.taskId) {
      try {
        await broadcastToTask(match.taskId, 'task:status:update', {
          taskId: match.taskId,
          status: 'SEARCHING',
          reason: 'RIDER_REJECTED',
          message: 'Rider declined the task. Searching for another rider...',
          retryAttempt: nextRetryCount,
          maxRetries: maxRetryAttempts,
          timestamp: new Date().toISOString(),
        });
      } catch (broadcastError) {
        console.error('Realtime broadcast to task room failed (non-blocking):', broadcastError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dispatch rejected, finding another rider',
    });
  } catch (error: unknown) {
    console.error('Dispatch reject error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

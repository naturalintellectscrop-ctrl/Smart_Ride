// ============================================
// SMART RIDE - DISPATCH REJECT API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { db } from '@/lib/db';

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

    // Get rider ID from user
    const rider = await db.rider.findFirst({
      where: { userId: user.id },
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

    // Create audit log for rejection BEFORE processing (for traceability)
    await db.auditLog.create({
      data: {
        actorId: rider.id,
        actorType: 'RIDER',
        userId: user.id,
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

    // Emit socket event to task room if task is going back to SEARCHING
    // (i.e., retries remain and a new rider will be searched)
    const maxRetryAttempts = 3; // must match DISPATCH_CONFIG.maxRetryAttempts
    const nextRetryCount = match.retryCount + 1;
    if (nextRetryCount < maxRetryAttempts && match.taskId) {
      try {
        const socketPort = process.env.SOCKET_PORT || '3002';
        const internalKey = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';

        await fetch(`http://localhost:${socketPort}/emit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': internalKey,
          },
          body: JSON.stringify({
            room: `task:${match.taskId}`,
            event: 'task:status:update',
            data: {
              taskId: match.taskId,
              status: 'SEARCHING',
              reason: 'RIDER_REJECTED',
              message: 'Rider declined the task. Searching for another rider...',
              retryAttempt: nextRetryCount,
              maxRetries: maxRetryAttempts,
              timestamp: new Date().toISOString(),
            },
          }),
        });
      } catch (socketError) {
        console.error('Socket emission to task room failed (non-blocking):', socketError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dispatch rejected, finding another rider',
    });
  } catch (error: any) {
    console.error('Dispatch reject error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

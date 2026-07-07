// ============================================
// SMART RIDE - DISPATCH ACCEPT API
// ============================================

import { NextRequest, NextResponse, after } from 'next/server';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { db, setRLSContext, resetRLSContext, setServiceRoleContext } from '@/lib/db';
import { sendTaskUpdateNotification } from '@/lib/services/notification.service';
import { firstNameOf } from '@/lib/privacy/public-contact';
import { broadcastToUser, broadcastToTask } from '@/lib/realtime-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/dispatch/[id]/accept - Rider accepts dispatch
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: matchId } = await params;
    
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // SECURITY: Verify user is a rider
    if (user.role !== 'RIDER') {
      return NextResponse.json(
        { success: false, error: 'Only riders can accept dispatches' },
        { status: 403 }
      );
    }

    // Service-role context: DispatchMatch has no rider-read RLS policy
    // (service_role_access only), so under the rider's context the match
    // pre-check below always 404'd and accepts never went through
    // (runtime-verified). Authorization is the explicit riderId comparison.
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

    // SECURITY: Verify the dispatch match belongs to this rider BEFORE accepting
    const match = await db.dispatchMatch.findUnique({
      where: { id: matchId },
      select: { riderId: true, status: true },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Dispatch match not found' },
        { status: 404 }
      );
    }

    if (match.riderId !== rider.id) {
      // Audit unauthorized accept attempt
      try {
        await db.auditLog.create({
          data: {
            actorId: rider.id,
            actorType: 'RIDER',
            action: 'DISPATCH_UNAUTHORIZED_ACCEPT',
            entityType: 'DispatchMatch',
            entityId: matchId,
            description: `Rider ${rider.id} attempted to accept dispatch ${matchId} assigned to rider ${match.riderId}`,
            source: 'MOBILE_APP',
          },
        });
      } catch {}

      return NextResponse.json(
        { success: false, error: 'Not authorized to accept this dispatch' },
        { status: 403 }
      );
    }

    const result = await DispatchService.acceptMatch(matchId, rider.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // LATENCY: respond the moment the acceptance is committed. Broadcasts,
    // push notifications and audit logging happen AFTER the response via
    // next/server after() — Vercel keeps the lambda alive for them. Awaiting
    // them inline used to add 5-15s (cold Supabase channels), which burned
    // most of the 30s window and made accepts look like they failed.
    if (result.taskId) {
      const taskId = result.taskId;
      after(async () => {
        try {
          await setServiceRoleContext();
          const task = await db.task.findUnique({
            where: { id: taskId },
            select: { clientId: true, taskNumber: true },
          });
          if (!task) return;

          // 1. Notify CLIENT that a rider was assigned
          await broadcastToUser(task.clientId, 'rider:task:matched', {
            taskId,
            rider: {
              id: rider.id,
              name: firstNameOf(rider.fullName),
              rating: rider.rating,
            },
          }).catch((e) => console.error('Broadcast to client failed (non-blocking):', e));

          // 2. Notify TASK ROOM that the task status changed
          await broadcastToTask(taskId, 'task:status:update', {
            taskId,
            status: 'ASSIGNED',
            rider: {
              id: rider.id,
              name: firstNameOf(rider.fullName),
              rating: rider.rating,
            },
            timestamp: new Date().toISOString(),
          }).catch((e) => console.error('Broadcast to task room failed (non-blocking):', e));

          // 3. Notify RIDER that their acceptance was confirmed
          await broadcastToUser(user.userId, 'dispatch:assignment', {
            taskId,
            taskNumber: task.taskNumber,
            status: 'ASSIGNED',
            matchId,
            timestamp: new Date().toISOString(),
          }).catch((e) => console.error('Broadcast to rider failed (non-blocking):', e));

          // 4. Send DB notification to client about rider assignment
          await sendTaskUpdateNotification(
            task.clientId,
            taskId,
            task.taskNumber || taskId,
            'ASSIGNED'
          ).catch((e) => console.error('Notification failed (non-blocking):', e));

          // 5. Create audit log for dispatch acceptance at route level
          await db.auditLog.create({
            data: {
              actorId: rider.id,
              actorType: 'RIDER',
              userId: user.userId,
              taskId,
              action: 'DISPATCH_ACCEPTED',
              entityType: 'DispatchMatch',
              entityId: matchId,
              description: `Rider ${rider.fullName || rider.id} accepted dispatch for task ${task.taskNumber || taskId}`,
              source: 'MOBILE_APP',
              newValues: JSON.stringify({
                matchId,
                taskId,
                riderId: rider.id,
                riderName: rider.fullName,
                status: 'ASSIGNED',
              }),
            },
          }).catch((e) => console.error('Audit log creation failed (non-blocking):', e));
        } catch (e) {
          console.error('[dispatch/accept] post-response side effects failed:', e);
        } finally {
          await resetRLSContext().catch(() => {});
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: { taskId: result.taskId },
    });
  } catch (error: unknown) {
    console.error('Dispatch accept error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

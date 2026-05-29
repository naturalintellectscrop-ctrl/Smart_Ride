// ============================================
// SMART RIDE - DISPATCH ACCEPT API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { authGuard } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { sendTaskUpdateNotification } from '@/lib/services/notification.service';

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

    // Emit real-time socket events and notifications after successful acceptance
    if (result.taskId) {
      const task = await db.task.findUnique({
        where: { id: result.taskId },
        select: { clientId: true, taskNumber: true },
      });

      if (task) {
        const socketPort = process.env.SOCKET_PORT || '3002';
        const internalKey = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';

        try {
          // 1. Notify CLIENT that a rider was assigned
          await fetch(`http://localhost:${socketPort}/emit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Key': internalKey,
            },
            body: JSON.stringify({
              room: `user:${task.clientId}`,
              event: 'rider:task:matched',
              data: {
                taskId: result.taskId,
                rider: {
                  id: rider.id,
                  name: rider.fullName,
                  phone: rider.phone,
                  rating: rider.rating,
                },
              },
            }),
          });
        } catch (socketError) {
          console.error('Socket emission to client failed (non-blocking):', socketError);
        }

        try {
          // 2. Notify TASK ROOM that the task status changed
          await fetch(`http://localhost:${socketPort}/emit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Key': internalKey,
            },
            body: JSON.stringify({
              room: `task:${result.taskId}`,
              event: 'task:status:update',
              data: {
                taskId: result.taskId,
                status: 'ASSIGNED',
                rider: {
                  id: rider.id,
                  name: rider.fullName,
                  phone: rider.phone,
                  rating: rider.rating,
                },
                timestamp: new Date().toISOString(),
              },
            }),
          });
        } catch (socketError) {
          console.error('Socket emission to task room failed (non-blocking):', socketError);
        }

        try {
          // 3. Notify RIDER that their acceptance was confirmed
          await fetch(`http://localhost:${socketPort}/emit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Key': internalKey,
            },
            body: JSON.stringify({
              room: `user:${user.id}`,
              event: 'dispatch:assignment',
              data: {
                taskId: result.taskId,
                taskNumber: task.taskNumber,
                status: 'ASSIGNED',
                matchId,
                timestamp: new Date().toISOString(),
              },
            }),
          });
        } catch (socketError) {
          console.error('Socket emission to rider failed (non-blocking):', socketError);
        }

        // 4. Send DB notification to client about rider assignment
        try {
          await sendTaskUpdateNotification(
            task.clientId,
            result.taskId!,
            task.taskNumber || result.taskId!,
            'ASSIGNED'
          );
        } catch (notificationError) {
          console.error('Notification failed (non-blocking):', notificationError);
        }

        // 5. Create audit log for dispatch acceptance at route level
        try {
          await db.auditLog.create({
            data: {
              actorId: rider.id,
              actorType: 'RIDER',
              userId: user.id,
              taskId: result.taskId,
              action: 'DISPATCH_ACCEPTED',
              entityType: 'DispatchMatch',
              entityId: matchId,
              description: `Rider ${rider.fullName || rider.id} accepted dispatch for task ${task.taskNumber || result.taskId}`,
              source: 'MOBILE_APP',
              newValues: JSON.stringify({
                matchId,
                taskId: result.taskId,
                riderId: rider.id,
                riderName: rider.fullName,
                status: 'ASSIGNED',
              }),
            },
          });
        } catch (auditError) {
          console.error('Audit log creation failed (non-blocking):', auditError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { taskId: result.taskId },
    });
  } catch (error: any) {
    console.error('Dispatch accept error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

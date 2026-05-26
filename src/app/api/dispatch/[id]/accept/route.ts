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

    const result = await DispatchService.acceptMatch(matchId, rider.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Emit real-time event to task room so client gets notified
    if (result.taskId) {
      try {
        const task = await db.task.findUnique({
          where: { id: result.taskId },
          select: { clientId: true, taskNumber: true },
        });
        if (task) {
          // Internal HTTP emit API runs on port 3002 (Socket.io WebSocket is on 3001)
          const socketPort = process.env.SOCKET_PORT || '3002';
          const internalKey = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
          
          // Notify client that rider accepted
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

          // Also notify task room
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
                timestamp: new Date().toISOString(),
              },
            }),
          });
        }
      } catch (socketError) {
        console.error('Socket emission failed (non-blocking):', socketError);
      }

      // Send DB notification to client about rider assignment
      try {
        if (task) {
          await sendTaskUpdateNotification(
            task.clientId,
            result.taskId!,
            task.taskNumber || result.taskId!,
            'ASSIGNED'
          );
        }
      } catch (notificationError) {
        console.error('Notification failed (non-blocking):', notificationError);
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

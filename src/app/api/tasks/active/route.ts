// ============================================
// SMART RIDE - ACTIVE TASK API
// ============================================
// Returns the current active task for the authenticated user.
// For CLIENT: finds tasks where clientId = userId and status is active.
// For RIDER: finds tasks where riderId = rider.id and status is active.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TaskStatus } from '@prisma/client';
import { requireAuthWithRLS } from '@/lib/auth/guards';
import { redactPerson } from '@/lib/privacy/public-contact';
import { db, resetRLSContext } from '@/lib/db';

const ACTIVE_STATUSES: TaskStatus[] = [
  TaskStatus.CREATED,
  TaskStatus.MATCHING,
  TaskStatus.SEARCHING,
  TaskStatus.ASSIGNED,
  TaskStatus.ACCEPTED,
  TaskStatus.ARRIVING,
  TaskStatus.ARRIVED,
  TaskStatus.PICKED_UP,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_TRANSIT,
  TaskStatus.DELIVERING,
];

// GET /api/tasks/active - Get the current active task for the user
export async function GET(request: NextRequest) {
  const authResult = await requireAuthWithRLS(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }

  const user = authResult.user;

  try {
    let activeTask = null;

    if (user.role === 'CLIENT') {
      // Client: find tasks where clientId = userId AND active status
      activeTask = await db.task.findFirst({
        where: {
          clientId: user.userId,
          status: { in: ACTIVE_STATUSES },
        },
        include: {
          rider: {
            select: {
              id: true,
              fullName: true,
              rating: true,
              totalTrips: true,
              riderRole: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'RIDER') {
      // Rider: find their rider profile first, then find active tasks
      const rider = await db.rider.findFirst({
        where: { userId: user.userId },
        select: { id: true },
      });

      if (rider) {
        activeTask = await db.task.findFirst({
          where: {
            riderId: rider.id,
            status: { in: ACTIVE_STATUSES },
          },
          include: {
            rider: {
              select: {
                id: true,
                fullName: true,
                rating: true,
                totalTrips: true,
                riderRole: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    } else {
      // Admin or other roles are not supported on this mobile endpoint
      return NextResponse.json(
        { success: false, error: 'No active task' },
        { status: 404 }
      );
    }

    if (!activeTask) {
      return NextResponse.json(
        { success: false, error: 'No active task' },
        { status: 404 }
      );
    }

    // PRIVACY: counterparty shown by first name only (tracking screen).
    redactPerson((activeTask as { rider?: Record<string, unknown> }).rider, 'fullName');

    return NextResponse.json({
      success: true,
      data: activeTask,
    });
  } catch (error: unknown) {
    console.error('Get active task error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

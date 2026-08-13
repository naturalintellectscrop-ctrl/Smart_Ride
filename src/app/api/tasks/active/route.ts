// ============================================
// SMART RIDE - ACTIVE TASK API
// ============================================
// Returns the current active task for the authenticated user.
// For CLIENT: finds tasks where clientId = userId and status is active.
// For RIDER: finds tasks where riderId = rider.id and status is active.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TaskStatus } from '@prisma/client';
import { requireAuthWithRLS } from '@/lib/auth/guards';
import { redactPerson } from '@/lib/privacy/public-contact';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';

// NOTE: there is no TaskStatus.DELIVERING in the Prisma enum — the in-flight
// delivery state is IN_TRANSIT. This list previously included
// TaskStatus.DELIVERING, which is `undefined` at runtime; that undefined
// poisoned the `status: { in: [...] }` filter and made Prisma throw, so EVERY
// call to this endpoint returned 500 and no client or rider could ever restore
// an in-progress task. (tsc flags it, but next.config.ts sets
// ignoreBuildErrors: true, so it shipped.)
const ACTIVE_STATUSES: TaskStatus[] = [
  TaskStatus.CREATED,
  TaskStatus.REQUESTED,
  TaskStatus.MATCHING,
  TaskStatus.SEARCHING,
  TaskStatus.ASSIGNED,
  TaskStatus.ACCEPTED,
  TaskStatus.ARRIVING,
  TaskStatus.ARRIVED,
  TaskStatus.PICKED_UP,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_TRANSIT,
];

const ACTIVE_TASK_INCLUDE = {
  rider: {
    select: {
      id: true,
      fullName: true,
      rating: true,
      totalTrips: true,
      riderRole: true,
    },
  },
} satisfies Prisma.TaskInclude;

type ActiveTask = Prisma.TaskGetPayload<{ include: typeof ACTIVE_TASK_INCLUDE }>;

// GET /api/tasks/active - Get the current active task for the user
export async function GET(request: NextRequest) {
  const authResult = await requireAuthWithRLS(request);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Authentication required' },
      { status: authResult.statusCode || 401 }
    );
  }

  // Same reason as /tasks/available: Task has no rider SELECT policy, so the
  // rider branch below (riderId = me) returned nothing under the caller's own
  // context — a courier mid-delivery reopening the app saw no active task.
  // Both branches are scoped explicitly by the caller's own id, so elevating
  // widens no access.
  await setServiceRoleContext();

  const user = authResult.user;

  try {
    let activeTask: ActiveTask | null = null;

    if (user.role === 'CLIENT') {
      // Client: find tasks where clientId = userId AND active status
      activeTask = await db.task.findFirst({
        where: {
          clientId: user.userId,
          status: { in: ACTIVE_STATUSES },
        },
        include: ACTIVE_TASK_INCLUDE,
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
          include: ACTIVE_TASK_INCLUDE,
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

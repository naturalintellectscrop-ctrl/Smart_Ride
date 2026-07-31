/**
 * POST /api/tasks/[id]/rate
 * Submit a rating for a completed task
 *
 * The client (rider) rates the driver after a completed ride.
 * Creates or updates a Rating record and recalculates the
 * rider's average rating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, notFoundResponse, serverErrorResponse, successResponse } from '@/lib/api/response';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const rateTaskSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }
    const user = authResult.user!;

    // Rating is a SYSTEM write that spans two owners: the client inserts a
    // Rating row and the *rider's* aggregate score is recomputed. Under
    // client-scoped RLS every one of those steps fails:
    //   - Rating INSERT -> 42501 (no client INSERT policy reaches the row)
    //   - task.rider    -> invisible (riders_read_own is rider-scoped), so
    //                      toUserId silently became null
    //   - Rating SELECT -> users_read_own_ratings filters to the caller's own
    //                      rows, so the average was computed from one client
    //   - Rider UPDATE  -> riders_update_own matches 0 rows -> P2025
    // Elevate to service role, then enforce ownership explicitly below.
    // Mirrors /api/tasks/[id]/status.
    await setServiceRoleContext();

    const { id } = await params;
    const body = await request.json();
    const validated = rateTaskSchema.parse(body);

    // Verify task exists and is completed
    const task = await db.task.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        riderId: true,
        clientId: true,
        rider: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!task) {
      return notFoundResponse('Task');
    }

    // Only finished tasks can be rated. PAID/CLOSED are post-completion
    // terminal states (reachable via settlement or admin override), and a ride
    // that has settled is still rateable — keying on COMPLETED alone would
    // silently make those rides unratable.
    const RATEABLE_STATUSES = ['COMPLETED', 'PAID', 'CLOSED'];
    if (!RATEABLE_STATUSES.includes(task.status)) {
      return errorResponse('Can only rate completed tasks');
    }

    // IDOR protection: only the client of this task can rate it
    if (task.clientId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Only the task client can submit a rating' },
        { status: 403 }
      );
    }

    // Create or update rating (one rating per task)
    await db.rating.upsert({
      where: { taskId: id },
      update: {
        score: validated.rating,
        comment: validated.comment,
      },
      create: {
        taskId: id,
        fromUserId: user.userId,
        toUserId: task.rider?.userId ?? null,
        toRiderId: task.riderId,
        score: validated.rating,
        comment: validated.comment,
      },
    });

    // Update rider's average rating
    if (task.riderId) {
      const agg = await db.rating.aggregate({
        where: { toRiderId: task.riderId },
        _avg: { score: true },
      });

      if (agg._avg.score !== null) {
        await db.rider.update({
          where: { id: task.riderId },
          data: { rating: Math.round(agg._avg.score * 10) / 10 },
        });
      }
    }

    return successResponse({ message: 'Rating submitted' }, 'Rating submitted');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || 'Validation error');
    }
    console.error('Rating error:', error);
    return serverErrorResponse('Failed to submit rating');
  } finally {
    await resetRLSContext();
  }
}

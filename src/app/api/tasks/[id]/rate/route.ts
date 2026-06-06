/**
 * POST /api/tasks/[id]/rate
 * Submit a rating for a completed task
 *
 * The client (rider) rates the driver after a completed ride.
 * Creates or updates a Rating record and recalculates the
 * rider's average rating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
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

    await setRLSContext({ userId: user.userId, role: user.role });

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

    // Only completed tasks can be rated
    if (task.status !== 'COMPLETED') {
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
      const ratings = await db.rating.findMany({
        where: { toRiderId: task.riderId },
        select: { score: true },
      });
      const avgRating = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;

      await db.rider.update({
        where: { id: task.riderId },
        data: { rating: Math.round(avgRating * 10) / 10 },
      });
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

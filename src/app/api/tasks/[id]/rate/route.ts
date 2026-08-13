/**
 * POST /api/tasks/[id]/rate
 * Submit a rating for a completed task — in EITHER direction.
 *
 * The client rates the driver, and the driver rates the passenger. Only the
 * first of those existed: the route rejected anyone but the client, and
 * `Rating.taskId` was `@unique`, so a trip could physically hold one rating
 * and it was always the client's. A passenger with a history of no-shows or
 * abuse accumulated nothing a driver could ever see (BE-012).
 *
 * Cached averages are derived from the Rating rows by
 * `rating-reconciliation.service`, never computed inline here, so the three
 * stores that hold a driver's score cannot drift apart (BE-013).
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlatformIntelligence } from '@/lib/intelligence/platform-events.service';
import {
  syncRiderRating,
  syncPassengerRating,
} from '@/lib/ratings/rating-reconciliation.service';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';
import { errorResponse, notFoundResponse, serverErrorResponse, successResponse } from '@/lib/api/response';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const rateTaskSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  // Declared on the model since it was written, and written by nothing until
  // now. Only meaningful when a client rates a driver — a passenger has no
  // vehicle to score.
  punctualityScore: z.number().min(1).max(5).optional(),
  professionalismScore: z.number().min(1).max(5).optional(),
  vehicleConditionScore: z.number().min(1).max(5).optional(),
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

    // IDOR protection, and the direction of the rating, are the same question:
    // whoever the caller is on this task decides who they are rating.
    const isClient = task.clientId === user.userId;
    const isDriver = !!task.rider?.userId && task.rider.userId === user.userId;

    if (!isClient && !isDriver) {
      return NextResponse.json(
        { success: false, error: 'Only participants in this task can rate it' },
        { status: 403 }
      );
    }

    if (isDriver && !task.clientId) {
      return errorResponse('This task has no passenger to rate');
    }
    if (isClient && !task.riderId) {
      return errorResponse('This task has no driver to rate');
    }

    // A passenger has no vehicle and no punctuality obligation, so the
    // driver-facing sub-scores are only accepted from a client. Silently
    // storing them on a passenger rating would put meaningless numbers in the
    // column the reputation engine reads.
    const subScores = isClient
      ? {
          punctualityScore: validated.punctualityScore ?? null,
          professionalismScore: validated.professionalismScore ?? null,
          vehicleConditionScore: validated.vehicleConditionScore ?? null,
        }
      : {
          punctualityScore: null,
          professionalismScore: null,
          vehicleConditionScore: null,
        };

    // One rating per task PER RATER. Re-submitting updates your own rating and
    // cannot touch the other party's.
    await db.rating.upsert({
      where: { taskId_fromUserId: { taskId: id, fromUserId: user.userId } },
      update: {
        score: validated.rating,
        comment: validated.comment,
        ...subScores,
      },
      create: {
        taskId: id,
        fromUserId: user.userId,
        // toRiderId is what distinguishes the two directions: a driver rating
        // carries it, a passenger rating does not.
        toUserId: isClient ? (task.rider?.userId ?? null) : task.clientId,
        toRiderId: isClient ? task.riderId : null,
        score: validated.rating,
        comment: validated.comment,
        ...subScores,
      },
    });

    if (isClient && task.riderId) {
      // Derive both caches from the Rating rows rather than computing an
      // average here. Two call sites computing the same number independently
      // is how the three stores drifted apart in the first place.
      await syncRiderRating(task.riderId);

      // Feed the reputation engine. Ratings are the heaviest input to trust
      // score (40%), and drive streaks, tier changes and complaint counts.
      await PlatformIntelligence.onRatingSubmitted(task.riderId, id, {
        score: validated.rating,
        comment: validated.comment ?? null,
        punctualityScore: validated.punctualityScore ?? null,
        professionalismScore: validated.professionalismScore ?? null,
        vehicleConditionScore: validated.vehicleConditionScore ?? null,
      });
    } else if (isDriver && task.clientId) {
      // Passenger ratings are STORED but deliberately feed nothing automated.
      // Whether a passenger's score should affect what they are shown, what
      // they are charged, or whether drivers see it at dispatch is a product
      // decision, not one to make by wiring it up quietly. Recorded as the
      // open question under BE-012.
      await syncPassengerRating(task.clientId);
    }

    return successResponse(
      {
        message: 'Rating submitted',
        direction: isClient ? 'client_rated_driver' : 'driver_rated_passenger',
      },
      'Rating submitted'
    );
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

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { 
  enrollInIncentive, 
  getDriverIncentiveProgress,
} from '@/lib/marketplace/incentive-fulfillment';
import { z } from 'zod';
import { requireAuth, isAdmin } from '@/lib/auth/guards';
import { NextResponse } from 'next/server';

/**
 * The rider acting here is the token holder.
 *
 * SECURITY: riderId came from the query string and the request body with no
 * authentication at all. A driver could read another driver's incentive
 * progress, enrol them in campaigns, or withdraw them from one they were
 * winning — and an anonymous caller could do the same.
 */
async function resolveRider(
  request: NextRequest,
  requested: string | null | undefined
): Promise<{ riderId: string } | { error: NextResponse }> {
  const auth = requireAuth(request);
  if (!auth.success || !auth.user) {
    return {
      error: NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: auth.statusCode || 401 }
      ),
    };
  }
  if (isAdmin(auth.user.role)) {
    if (!requested) {
      return {
        error: NextResponse.json(
          { success: false, error: 'Rider ID is required' },
          { status: 400 }
        ),
      };
    }
    return { riderId: requested };
  }

  const own = await db.rider.findFirst({
    where: { userId: auth.user.userId },
    select: { id: true },
  });
  if (!own) {
    return {
      error: NextResponse.json(
        { success: false, error: 'No driver profile for this account' },
        { status: 403 }
      ),
    };
  }
  if (requested && requested !== own.id) {
    return {
      error: NextResponse.json(
        { success: false, error: 'This enrolment belongs to another driver' },
        { status: 403 }
      ),
    };
  }
  return { riderId: own.id };
}

// Schema for enrollment
const enrollSchema = z.object({
  incentiveId: z.string(),
  // Optional: the driver enrolling is whoever holds the token. Retained so an
  // admin can enrol someone on their behalf.
  riderId: z.string().optional(),
});

/**
 * GET /api/marketplace/incentives/participate
 * Get driver's incentive progress
 * Query params: riderId
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const actor = await resolveRider(request, searchParams.get('riderId'));
  if ('error' in actor) return actor.error;

  await setServiceRoleContext();
  try {
    const riderId = actor.riderId;

    // Verify rider exists
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      select: { id: true },
    });

    if (!rider) {
      return errorResponse('Rider not found');
    }

    // Get progress
    const progress = await getDriverIncentiveProgress(riderId);

    // Separate into enrolled and available
    const enrolled = progress.filter(p => p.status !== 'ENROLLED' || p.progressPercent > 0);
    const available = progress.filter(p => p.status === 'ENROLLED' && p.progressPercent === 0);

    // Calculate stats
    const totalRewardsEarned = progress
      .filter(p => p.status === 'REWARDED')
      .reduce((sum, p) => sum + p.rewardAmount, 0);

    const inProgress = progress.filter(p => 
      p.status === 'IN_PROGRESS' || p.status === 'ENROLLED'
    ).length;

    return successResponse({
      progress,
      enrolled,
      available,
      stats: {
        totalActive: progress.length,
        inProgress,
        completed: progress.filter(p => p.status === 'REWARDED').length,
        totalRewardsEarned,
      },
    });
  } catch (error) {
    console.error('Error fetching incentive progress:', error);
    return serverErrorResponse('Failed to fetch incentive progress');
  } finally {
    await resetRLSContext();
  }
}

/**
 * POST /api/marketplace/incentives/participate
 * Enroll a driver in an incentive
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const validatedData = enrollSchema.parse(body);

  const actor = await resolveRider(request, validatedData.riderId);
  if ('error' in actor) return actor.error;

  await setServiceRoleContext();
  try {
    const result = await enrollInIncentive(validatedData.incentiveId, actor.riderId);

    if (!result.success) {
      return errorResponse(result.error || 'Failed to enroll in incentive');
    }

    return successResponse({
      participation: {
        id: result.participation?.id,
        incentiveId: result.participation?.incentiveId,
        status: result.participation?.status,
        enrolledAt: result.participation?.joinedAt,
      },
    }, 'Successfully enrolled in incentive', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message);
    }
    console.error('Error enrolling in incentive:', error);
    return serverErrorResponse('Failed to enroll in incentive');
  } finally {
    await resetRLSContext();
  }
}

/**
 * DELETE /api/marketplace/incentives/participate
 * Opt out of an incentive
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const actor = await resolveRider(request, searchParams.get('riderId'));
  if ('error' in actor) return actor.error;

  await setServiceRoleContext();
  try {
    const participationId = searchParams.get('participationId');
    const riderId = actor.riderId;

    if (!participationId) {
      return errorResponse('Participation ID is required');
    }

    // Verify participation belongs to this rider
    const participation = await db.incentiveParticipation.findFirst({
      where: {
        id: participationId,
        riderId,
      },
    });

    if (!participation) {
      return errorResponse('Participation not found');
    }

    // Check if already rewarded
    if (participation.status === 'REWARDED') {
      return errorResponse('Cannot opt out of a completed incentive');
    }

    // Update status to cancelled
    await db.incentiveParticipation.update({
      where: { id: participationId },
      data: { status: 'CANCELLED' },
    });

    // Update incentive participant count
    await db.driverIncentive.update({
      where: { id: participation.incentiveId },
      data: { currentParticipants: { decrement: 1 } },
    });

    return successResponse({}, 'Successfully opted out of incentive');
  } catch (error) {
    console.error('Error opting out of incentive:', error);
    return serverErrorResponse('Failed to opt out of incentive');
  } finally {
    await resetRLSContext();
  }
}

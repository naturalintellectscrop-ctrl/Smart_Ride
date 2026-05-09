import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { 
  enrollInIncentive, 
  getDriverIncentiveProgress,
} from '@/lib/marketplace/incentive-fulfillment';
import { z } from 'zod';

// Schema for enrollment
const enrollSchema = z.object({
  incentiveId: z.string(),
  riderId: z.string(),
});

/**
 * GET /api/marketplace/incentives/participate
 * Get driver's incentive progress
 * Query params: riderId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get('riderId');

    if (!riderId) {
      return errorResponse('Rider ID is required');
    }

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
  }
}

/**
 * POST /api/marketplace/incentives/participate
 * Enroll a driver in an incentive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = enrollSchema.parse(body);

    const result = await enrollInIncentive(validatedData.incentiveId, validatedData.riderId);

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
      return errorResponse(error.errors[0].message);
    }
    console.error('Error enrolling in incentive:', error);
    return serverErrorResponse('Failed to enroll in incentive');
  }
}

/**
 * DELETE /api/marketplace/incentives/participate
 * Opt out of an incentive
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participationId = searchParams.get('participationId');
    const riderId = searchParams.get('riderId');

    if (!participationId || !riderId) {
      return errorResponse('Participation ID and Rider ID are required');
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
  }
}

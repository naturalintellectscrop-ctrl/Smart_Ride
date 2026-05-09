import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';
import { notifyNewIncentive } from '@/lib/notifications/notification-service';
import { z } from 'zod';

// Incentive creation schema
const incentiveSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  incentiveType: z.enum([
    'PEAK_HOUR_BONUS',
    'RIDE_STREAK',
    'ZONE_SPECIFIC',
    'GUARANTEED_EARNINGS',
    'FIRST_RIDE_BONUS',
    'REFERRAL_BONUS',
    'COMPLETION_BONUS',
    'QUALITY_BONUS',
  ]),
  rewardAmount: z.number().positive(),
  rewardType: z.enum(['CASH', 'CREDIT', 'BONUS']).default('CASH'),
  zoneId: z.string().optional(),
  minRides: z.number().int().optional(),
  minEarnings: z.number().optional(),
  targetHours: z.number().int().optional(),
  streakDays: z.number().int().optional(),
  targetZones: z.array(z.string()).optional(),
  startTime: z.string().transform(v => new Date(v)),
  endTime: z.string().transform(v => new Date(v)),
  validDays: z.array(z.string()).optional(),
  validHoursStart: z.number().int().min(0).max(23).optional(),
  validHoursEnd: z.number().int().min(0).max(23).optional(),
  minRating: z.number().min(1).max(5).optional(),
  minCompletionRate: z.number().min(0).max(1).optional(),
  vehicleTypes: z.array(z.string()).optional(),
  maxParticipants: z.number().int().optional(),
  maxPayout: z.number().optional(),
});

/**
 * GET /api/marketplace/incentives
 * Get all driver incentives
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const zoneId = searchParams.get('zoneId');

    // Build filter
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.incentiveType = type;
    }
    if (zoneId) {
      where.zoneId = zoneId;
    }

    const incentives = await db.driverIncentive.findMany({
      where,
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const formattedIncentives = incentives.map(incentive => ({
      id: incentive.id,
      name: incentive.name,
      description: incentive.description,
      type: incentive.incentiveType,
      reward: {
        amount: incentive.rewardAmount,
        type: incentive.rewardType,
      },
      zone: incentive.zone,
      requirements: {
        minRides: incentive.minRides,
        minEarnings: incentive.minEarnings,
        targetHours: incentive.targetHours,
        streakDays: incentive.streakDays,
        targetZones: incentive.targetZones ? JSON.parse(incentive.targetZones) : null,
        minRating: incentive.minRating,
        minCompletionRate: incentive.minCompletionRate,
        vehicleTypes: incentive.vehicleTypes ? JSON.parse(incentive.vehicleTypes) : null,
      },
      timing: {
        startTime: incentive.startTime,
        endTime: incentive.endTime,
        validDays: incentive.validDays ? JSON.parse(incentive.validDays) : null,
        validHoursStart: incentive.validHoursStart,
        validHoursEnd: incentive.validHoursEnd,
      },
      caps: {
        maxParticipants: incentive.maxParticipants,
        currentParticipants: incentive.currentParticipants,
        maxPayout: incentive.maxPayout,
        currentPayout: incentive.currentPayout,
      },
      status: incentive.status,
      performance: {
        totalRidesCompleted: incentive.totalRidesCompleted,
        totalRewardsPaid: incentive.totalRewardsPaid,
      },
      createdAt: incentive.createdAt,
    }));

    return successResponse({
      incentives: formattedIncentives,
      total: formattedIncentives.length,
      activeCount: incentives.filter(i => i.status === 'ACTIVE').length,
    });
  } catch (error) {
    console.error('Error fetching incentives:', error);
    return serverErrorResponse('Failed to fetch incentives');
  }
}

/**
 * POST /api/marketplace/incentives
 * Create a new driver incentive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = incentiveSchema.parse(body);

    // Check if zone exists if zoneId provided
    if (validatedData.zoneId) {
      const zone = await db.geographicZone.findUnique({
        where: { id: validatedData.zoneId },
      });
      if (!zone) {
        return errorResponse('Zone not found');
      }
    }

    // Determine status based on timing
    const now = new Date();
    const status = validatedData.startTime <= now && validatedData.endTime > now
      ? 'ACTIVE'
      : 'SCHEDULED';

    const incentive = await db.driverIncentive.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        incentiveType: validatedData.incentiveType,
        rewardAmount: validatedData.rewardAmount,
        rewardType: validatedData.rewardType,
        zoneId: validatedData.zoneId || null,
        minRides: validatedData.minRides || null,
        minEarnings: validatedData.minEarnings || null,
        targetHours: validatedData.targetHours || null,
        streakDays: validatedData.streakDays || null,
        targetZones: validatedData.targetZones ? JSON.stringify(validatedData.targetZones) : null,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        validDays: validatedData.validDays ? JSON.stringify(validatedData.validDays) : null,
        validHoursStart: validatedData.validHoursStart || null,
        validHoursEnd: validatedData.validHoursEnd || null,
        minRating: validatedData.minRating || null,
        minCompletionRate: validatedData.minCompletionRate || null,
        vehicleTypes: validatedData.vehicleTypes ? JSON.stringify(validatedData.vehicleTypes) : null,
        maxParticipants: validatedData.maxParticipants || null,
        maxPayout: validatedData.maxPayout || null,
        status,
      },
      include: {
        zone: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Send notification to riders about the new incentive (only if active)
    let notificationResult = null;
    if (status === 'ACTIVE') {
      try {
        notificationResult = await notifyNewIncentive(
          incentive.id,
          incentive.name,
          incentive.rewardAmount,
          incentive.zone?.name,
          incentive.minRides || undefined
        );
      } catch (notifError) {
        console.error('Failed to send incentive notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return successResponse({
      incentive: {
        id: incentive.id,
        name: incentive.name,
        type: incentive.incentiveType,
        rewardAmount: incentive.rewardAmount,
        zone: incentive.zone,
        startTime: incentive.startTime,
        endTime: incentive.endTime,
        status: incentive.status,
      },
      notificationSent: notificationResult ? notificationResult.recipientCount > 0 : false,
      notificationRecipients: notificationResult?.recipientCount || 0,
    }, 'Incentive created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message);
    }
    console.error('Error creating incentive:', error);
    return serverErrorResponse('Failed to create incentive');
  }
}

/**
 * PATCH /api/marketplace/incentives
 * Update an incentive status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { incentiveId, status, currentParticipants, currentPayout, totalRidesCompleted, totalRewardsPaid } = body;

    if (!incentiveId) {
      return errorResponse('Incentive ID is required');
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (currentParticipants !== undefined) updateData.currentParticipants = currentParticipants;
    if (currentPayout !== undefined) updateData.currentPayout = currentPayout;
    if (totalRidesCompleted !== undefined) updateData.totalRidesCompleted = totalRidesCompleted;
    if (totalRewardsPaid !== undefined) updateData.totalRewardsPaid = totalRewardsPaid;

    const incentive = await db.driverIncentive.update({
      where: { id: incentiveId },
      data: updateData,
    });

    return successResponse({
      incentive: {
        id: incentive.id,
        name: incentive.name,
        status: incentive.status,
      },
    }, 'Incentive updated successfully');
  } catch (error) {
    console.error('Error updating incentive:', error);
    return serverErrorResponse('Failed to update incentive');
  }
}

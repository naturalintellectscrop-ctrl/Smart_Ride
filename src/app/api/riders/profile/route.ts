/**
 * GET /api/riders/profile
 * Get the current rider's profile
 * SECURITY: Requires authentication. Returns only the authenticated user's rider profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.userId;

    // Get rider profile for this user
    const rider = await db.rider.findFirst({
      where: { userId },
      include: {
        vehicle: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!rider) {
      return errorResponse('Rider profile not found. Please register as a driver first.', 404);
    }

    // Get earnings summary
    const earnings = await db.task.aggregate({
      where: {
        riderId: rider.id,
        status: 'COMPLETED',
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Get today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEarnings = await db.task.aggregate({
      where: {
        riderId: rider.id,
        status: 'COMPLETED',
        completedAt: {
          gte: today,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    return successResponse({
      ...rider,
      earnings: {
        total: earnings._sum.totalAmount || 0,
        totalTrips: earnings._count,
        today: todayEarnings._sum.totalAmount || 0,
        todayTrips: todayEarnings._count,
      },
    });
  } catch (error) {
    console.error('Error fetching rider profile:', error);
    return serverErrorResponse('Failed to fetch rider profile');
  }
}

/**
 * PUT /api/riders/profile
 * Update the current rider's profile
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.userId;

    // Get rider profile
    const existingRider = await db.rider.findFirst({
      where: { userId },
    });

    if (!existingRider) {
      return errorResponse('Rider profile not found', 404);
    }

    const body = await request.json();
    const { fullName, phone, email, physicalAddress } = body;

    // Update rider profile
    const updatedRider = await db.rider.update({
      where: { id: existingRider.id },
      data: {
        fullName: fullName || existingRider.fullName,
        phone: phone || existingRider.phone,
        email: email !== undefined ? email : existingRider.email,
        physicalAddress: physicalAddress || existingRider.physicalAddress,
      },
      include: {
        vehicle: true,
      },
    });

    return successResponse(updatedRider);
  } catch (error) {
    console.error('Error updating rider profile:', error);
    return serverErrorResponse('Failed to update rider profile');
  }
}

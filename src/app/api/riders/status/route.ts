/**
 * POST /api/riders/status
 * Toggle rider online/offline status
 * SECURITY: Requires authentication. Riders can only update their own status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.userId;

    // Get rider profile
    const rider = await db.rider.findFirst({
      where: { userId },
    });

    if (!rider) {
      return errorResponse('Rider profile not found. Please register as a driver first.', 404);
    }

    // Check if rider is approved
    if (rider.status !== 'APPROVED') {
      return errorResponse('Your driver account is not yet approved. Please wait for approval.', 403);
    }

    const body = await request.json();
    const { isOnline } = body;

    if (typeof isOnline !== 'boolean') {
      return errorResponse('isOnline must be a boolean value');
    }

    // Update rider status
    const updatedRider = await db.rider.update({
      where: { id: rider.id },
      data: {
        isOnline,
        lastOnlineAt: isOnline ? new Date() : rider.lastOnlineAt,
        lastOfflineAt: !isOnline ? new Date() : rider.lastOfflineAt,
      },
    });

    // Create audit log for status change
    await db.auditLog.create({
      data: {
        action: isOnline ? 'RIDER_ONLINE' : 'RIDER_OFFLINE',
        entityType: 'RIDER',
        entityId: rider.id,
        actorType: 'RIDER',
        riderId: rider.id,
        description: `Driver went ${isOnline ? 'online' : 'offline'}`,
        metadata: JSON.stringify({
          previousStatus: rider.isOnline,
          newStatus: isOnline,
        }),
      },
    });

    return successResponse({
      id: updatedRider.id,
      isOnline: updatedRider.isOnline,
      status: updatedRider.status,
      lastOnlineAt: updatedRider.lastOnlineAt,
      lastOfflineAt: updatedRider.lastOfflineAt,
    });
  } catch (error) {
    console.error('Error updating rider status:', error);
    return serverErrorResponse('Failed to update rider status');
  }
}

/**
 * GET /api/riders/status
 * Get current rider status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.userId;

    // Get rider profile
    const rider = await db.rider.findFirst({
      where: { userId },
      select: {
        id: true,
        isOnline: true,
        status: true,
        lastOnlineAt: true,
        lastOfflineAt: true,
        lastHeartbeatAt: true,
        connectionStatus: true,
      },
    });

    if (!rider) {
      return errorResponse('Rider profile not found', 404);
    }

    return successResponse(rider);
  } catch (error) {
    console.error('Error fetching rider status:', error);
    return serverErrorResponse('Failed to fetch rider status');
  }
}

/**
 * POST /api/riders/status
 * Toggle rider online/offline status
 * SECURITY: Requires authentication. Riders can only update their own status.
 * 
 * Body: { isOnline: boolean, latitude?: number, longitude?: number }
 * - When going online: optionally updates location coordinates
 * - When going offline: clears isOnline flag
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
    const { isOnline, latitude, longitude } = body;

    if (typeof isOnline !== 'boolean') {
      return errorResponse('isOnline must be a boolean value');
    }

    // Build update data based on online/offline status
    const updateData: Record<string, unknown> = {
      isOnline,
    };

    if (isOnline) {
      // When going online, update location if provided
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        updateData.currentLatitude = latitude;
        updateData.currentLongitude = longitude;
        updateData.lastLocationUpdate = new Date();
      }
      updateData.lastHeartbeatAt = new Date();
      updateData.connectionStatus = 'ACTIVE';
    } else {
      // When going offline, update connection status
      updateData.connectionStatus = 'DISCONNECTED';
    }

    // Update rider status
    const updatedRider = await db.rider.update({
      where: { id: rider.id },
      data: updateData,
    });

    // Create audit log for status change
    await db.auditLog.create({
      data: {
        action: isOnline ? 'RIDER_ONLINE' : 'RIDER_OFFLINE',
        entityType: 'RIDER',
        entityId: rider.id,
        actorType: 'RIDER',
        riderId: rider.id,
        description: `Driver went ${isOnline ? 'online' : 'offline'}${isOnline && latitude && longitude ? ` at (${latitude}, ${longitude})` : ''}`,
        source: 'MOBILE_APP',
        metadata: JSON.stringify({
          previousStatus: rider.isOnline,
          newStatus: isOnline,
          locationUpdated: isOnline && typeof latitude === 'number' && typeof longitude === 'number',
        }),
      },
    });

    // If going online, notify the realtime dispatch service so it knows about this rider
    if (isOnline) {
      try {
        const socketPort = process.env.SOCKET_PORT || '3002';
        const internalKey = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';
        await fetch(`http://localhost:${socketPort}/emit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': internalKey,
          },
          body: JSON.stringify({
            room: 'dispatch',
            event: 'rider:status:update',
            data: {
              riderId: rider.id,
              isOnline: true,
              latitude: latitude || rider.currentLatitude,
              longitude: longitude || rider.currentLongitude,
              riderRole: rider.riderRole,
            },
          }),
        });
      } catch {
        // Socket service might not be running - don't fail the status update
        console.log(`[RiderStatus] Socket notification skipped for rider ${rider.id}`);
      }
    }

    return successResponse({
      id: updatedRider.id,
      isOnline: updatedRider.isOnline,
      status: updatedRider.status,
      currentLatitude: updatedRider.currentLatitude,
      currentLongitude: updatedRider.currentLongitude,
      lastLocationUpdate: updatedRider.lastLocationUpdate,
      connectionStatus: updatedRider.connectionStatus,
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

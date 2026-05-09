import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Heartbeat configuration
const HEARTBEAT_CONFIG = {
  INTERVAL_SECONDS: 10,        // Expected heartbeat every 10-15 seconds
  UNSTABLE_THRESHOLD: 30,      // Mark UNSTABLE after 30 seconds
  DISCONNECT_THRESHOLD: 60,    // Mark DISCONNECTED after 60 seconds
  LONG_DISCONNECT_THRESHOLD: 120, // Escalate after 120 seconds
};

// Rate limiting - simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 heartbeats per minute per rider

function checkRateLimit(riderId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(riderId);
  
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(riderId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Task states that require heartbeat monitoring
const HEARTBEAT_ACTIVE_STATES = [
  'RIDER_ACCEPTED',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_PROGRESS',
  'DELIVERING',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const {
      rider_id,
      task_id,
      latitude,
      longitude,
      speed,
      battery_level,
      heading,
      accuracy,
      is_charging,
      network_type,
    } = body;

    if (!rider_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: rider_id, latitude, longitude' },
        { status: 400 }
      );
    }

    // Rate limiting check
    if (!checkRateLimit(rider_id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Too many heartbeat requests.' },
        { status: 429 }
      );
    }

    // Verify rider exists
    const rider = await db.rider.findUnique({
      where: { id: rider_id },
      include: {
        vehicle: true,
      },
    });

    if (!rider) {
      return NextResponse.json(
        { error: 'Rider not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const connectionStatus = 'ACTIVE';

    // Start transaction for atomic updates
    const result = await db.$transaction(async (tx) => {
      // Update rider's last known location and heartbeat
      const updatedRider = await tx.rider.update({
        where: { id: rider_id },
        data: {
          lastHeartbeatAt: now,
          connectionStatus: connectionStatus as any,
          lastKnownLatitude: latitude,
          lastKnownLongitude: longitude,
          lastKnownSpeed: speed ?? null,
          lastKnownBattery: battery_level ?? null,
          lastKnownHeading: heading ?? null,
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationUpdate: now,
          isOnline: true,
        },
      });

      // If task_id is provided, update task tracking
      let updatedTask = null;
      if (task_id) {
        const task = await tx.task.findUnique({
          where: { id: task_id },
        });

        if (task && HEARTBEAT_ACTIVE_STATES.includes(task.status)) {
          updatedTask = await tx.task.update({
            where: { id: task_id },
            data: {
              lastHeartbeatAt: now,
              lastKnownLatitude: latitude,
              lastKnownLongitude: longitude,
              connectionStatus: connectionStatus as any,
            },
          });
        }
      }

      // Create heartbeat log entry
      const heartbeatLog = await tx.heartbeatLog.create({
        data: {
          riderId: rider_id,
          taskId: task_id || null,
          latitude: latitude,
          longitude: longitude,
          speed: speed ?? null,
          heading: heading ?? null,
          accuracy: accuracy ?? null,
          batteryLevel: battery_level ?? null,
          isCharging: is_charging ?? null,
          networkType: network_type ?? null,
          connectionStatus: connectionStatus as any,
          metadata: JSON.stringify({
            timestamp: now.toISOString(),
            riderRole: rider.riderRole,
          }),
        },
      });

      return { rider: updatedRider, task: updatedTask, heartbeatLog };
    });

    // Broadcast location update via WebSocket (will be handled by monitoring service)
    // This endpoint returns the data that the monitoring service will stream

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      connection_status: connectionStatus,
      rider: {
        id: result.rider.id,
        lastHeartbeatAt: result.rider.lastHeartbeatAt,
        connectionStatus: result.rider.connectionStatus,
      },
      task: result.task ? {
        id: result.task.id,
        status: result.task.status,
      } : null,
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check rider connection status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riderId = searchParams.get('rider_id');
    const taskId = searchParams.get('task_id');

    if (!riderId) {
      return NextResponse.json(
        { error: 'Missing rider_id parameter' },
        { status: 400 }
      );
    }

    const rider = await db.rider.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        connectionStatus: true,
        lastHeartbeatAt: true,
        lastKnownLatitude: true,
        lastKnownLongitude: true,
        lastKnownBattery: true,
        currentTaskId: true,
        isOnline: true,
      },
    });

    if (!rider) {
      return NextResponse.json(
        { error: 'Rider not found' },
        { status: 404 }
      );
    }

    // Calculate actual connection status based on last heartbeat
    let calculatedStatus = rider.connectionStatus;
    if (rider.lastHeartbeatAt) {
      const secondsSinceHeartbeat = (Date.now() - rider.lastHeartbeatAt.getTime()) / 1000;
      
      if (secondsSinceHeartbeat > HEARTBEAT_CONFIG.DISCONNECT_THRESHOLD) {
        calculatedStatus = 'DISCONNECTED';
      } else if (secondsSinceHeartbeat > HEARTBEAT_CONFIG.UNSTABLE_THRESHOLD) {
        calculatedStatus = 'UNSTABLE';
      } else {
        calculatedStatus = 'ACTIVE';
      }
    }

    // Get recent heartbeat logs if task_id provided
    let recentLogs = null;
    if (taskId) {
      recentLogs = await db.heartbeatLog.findMany({
        where: {
          riderId: riderId,
          taskId: taskId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });
    }

    return NextResponse.json({
      rider: {
        ...rider,
        connectionStatus: calculatedStatus,
      },
      recentLogs,
      config: HEARTBEAT_CONFIG,
    });

  } catch (error) {
    console.error('Get heartbeat status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

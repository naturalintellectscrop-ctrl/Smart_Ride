import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, resetRLSContext } from '@/lib/auth-utils';
import { encodeGeohash } from '@/lib/geo/geohash';
import { z } from 'zod';

// Heartbeat configuration
const HEARTBEAT_CONFIG = {
  INTERVAL_SECONDS: 10,        // Expected heartbeat every 10-15 seconds
  UNSTABLE_THRESHOLD: 30,      // Mark UNSTABLE after 30 seconds
  DISCONNECT_THRESHOLD: 60,    // Mark DISCONNECTED after 60 seconds
  LONG_DISCONNECT_THRESHOLD: 120, // Escalate after 120 seconds
};

// Task states that require heartbeat monitoring — aligned with Prisma TaskStatus enum
const HEARTBEAT_ACTIVE_STATES = [
  'ACCEPTED',
  'ARRIVING',
  'ARRIVED',
  'PICKED_UP',
  'IN_PROGRESS',
  'IN_TRANSIT',
];

// Zod schema for heartbeat POST
/**
 * Telemetry beyond the position itself is NULLISH, not merely optional.
 *
 * `.optional()` accepts a missing key but rejects an explicit null, and null is
 * exactly what the platform reports: Android's location provider returns
 * `heading: null` and `speed: null` whenever the device is not moving. The
 * driver app forwards `location.coords` straight through, so every heartbeat
 * from a STATIONARY rider was rejected with
 *   400 "Invalid input: expected number, received null"
 * and thrown away by the caller's `.catch(() => {})`.
 *
 * Dispatch only offers work to riders whose lastHeartbeatAt is within 90s, so
 * the effect was that a driver parked at a stage waiting for a job — the normal
 * case, and the one the keep-alive timer was added to protect — went stale and
 * disappeared from the eligible pool. A rider in motion heartbeat fine, which
 * is why this survived: it only bites when the rider is standing still.
 *
 * Position stays strictly required; there is no useful heartbeat without it.
 */
const heartbeatSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  speed: z.number().nullish(),
  battery_level: z.number().nullish(),
  heading: z.number().nullish(),
  accuracy: z.number().nullish(),
  is_charging: z.boolean().nullish(),
  network_type: z.string().nullish(),
  task_id: z.string().nullish(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - get user from token
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }
    
    const userId = authResult.userId;
    
    // Get rider profile for this user
    const rider = await db.rider.findFirst({
      where: { userId },
      include: { vehicle: true },
    });

    if (!rider) {
      return NextResponse.json({ success: false, error: 'Rider profile not found. Please register as a driver first.' },
        { status: 404 }
      );
    }

    const riderId = rider.id;
    
    // Parse request body
    const body = await request.json();
    const validated = heartbeatSchema.parse(body);
    const {
      latitude,
      longitude,
      speed,
      battery_level,
      heading,
      accuracy,
      is_charging,
      network_type,
      task_id,
    } = validated;

    const now = new Date();
    const connectionStatus = 'ACTIVE';

    // Start transaction for atomic updates
    const result = await db.$transaction(async (tx) => {
      // Update rider's last known location and heartbeat
      const updatedRider = await tx.rider.update({
        where: { id: riderId },
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
      // Widen from the `null` initialiser so the task row can be assigned.
      let updatedTask: Awaited<ReturnType<typeof tx.task.update>> | null = null;
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
          riderId: riderId,
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

    // Best-effort geohash update (separate from the transaction so it can't
    // break heartbeats if the `geohash` column hasn't been added yet via
    // `prisma db push`). Once the column exists, this populates it for the
    // geohash-prefix proximity path in /api/riders/nearby.
    try {
      await db.$executeRawUnsafe(
        `UPDATE "Rider" SET "geohash" = $1 WHERE "id" = $2`,
        encodeGeohash(latitude, longitude, 7),
        riderId,
      );
    } catch {
      // column not present yet — ignore
    }

    // Broadcast location update via realtime if a task is associated
    if (task_id && result.task) {
      try {
        const { broadcastToTask } = await import('@/lib/realtime-server');
        await broadcastToTask(task_id, 'location:update', {
          riderId: authResult.userId,
          latitude,
          longitude,
          heading: heading ?? null,
          speed: speed ?? null,
          timestamp: now.toISOString(),
        });
      } catch (e) {
        console.warn('[HEARTBEAT] Failed to broadcast location:', e);
      }
    }

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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Heartbeat error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// GET endpoint to check rider connection status
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
      return NextResponse.json({ success: false, error: 'Rider not found' },
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

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    // Get recent heartbeat logs if task_id provided
    let recentLogs: Awaited<ReturnType<typeof db.heartbeatLog.findMany>> | null = null;
    if (taskId) {
      recentLogs = await db.heartbeatLog.findMany({
        where: {
          riderId: rider.id,
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
    return NextResponse.json({ success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

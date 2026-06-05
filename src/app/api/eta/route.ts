// ============================================
// SMART RIDE - LIVE ETA API (PHASE 9A)
// ============================================
// GET /api/eta?taskId=xxx
// Calculates live ETA for any active task using:
// - Rider's current GPS position (from heartbeat/driver location)
// - Destination coordinates (pickup or dropoff based on status)
// - Route distance (Haversine with road factor)
// - Average speed (from recent GPS heartbeats, or fallback defaults)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus, TaskType } from '@prisma/client';
import {
  calculateLiveETA,
  calculateAverageSpeedFromHeartbeats,
  type ServiceType,
  type LiveETAResult,
} from '@/lib/tracking/eta-calculator';
import { driverLocationStore } from '@/lib/tracking/driver-location-store';

// ============================================
// Types
// ============================================

interface ETAResponse {
  success: boolean;
  data?: LiveETAResult & {
    taskId: string;
    taskNumber: string;
    taskType: TaskType;
    taskStatus: string;
    riderId: string;
    riderLocation: { latitude: number; longitude: number } | null;
    destination: { latitude: number; longitude: number; address: string };
    averageSpeedKmh: number | null;
    usingFallbackSpeed: boolean;
  };
  error?: string;
}

// ============================================
// Task statuses where ETA is relevant
// ============================================

// Rider is heading to pickup
const PICKUP_PHASE_STATUSES: TaskStatus[] = [
  TaskStatus.ACCEPTED,
  TaskStatus.ARRIVING,
  TaskStatus.ARRIVED,
];

// Rider is heading to dropoff
const DROPOFF_PHASE_STATUSES: TaskStatus[] = [
  TaskStatus.PICKED_UP,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_TRANSIT,
  TaskStatus.DELIVERING,
];

// All active statuses where ETA makes sense
const ACTIVE_STATUSES: TaskStatus[] = [
  ...PICKUP_PHASE_STATUSES,
  ...DROPOFF_PHASE_STATUSES,
];

// ============================================
// Map Prisma TaskType to ServiceType
// ============================================

function taskTypeToServiceType(taskType: TaskType): ServiceType {
  switch (taskType) {
    case TaskType.SMART_BODA_RIDE:
    case TaskType.SMART_CAR_RIDE:
      return 'ride';
    case TaskType.FOOD_DELIVERY:
      return 'food';
    case TaskType.SHOPPING:
      return 'shopping';
    case TaskType.ITEM_DELIVERY:
      return 'delivery';
    case TaskType.SMART_HEALTH_DELIVERY:
      return 'health';
    default:
      return 'ride';
  }
}

// ============================================
// GET /api/eta?taskId=xxx
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId query parameter is required' },
        { status: 400 }
      );
    }

    // Look up the task
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        taskNumber: true,
        taskType: true,
        status: true,
        riderId: true,
        pickupLatitude: true,
        pickupLongitude: true,
        pickupAddress: true,
        dropoffLatitude: true,
        dropoffLongitude: true,
        dropoffAddress: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: `Task not found: ${taskId}` },
        { status: 404 }
      );
    }

    // Check if task is in an active status
    if (!ACTIVE_STATUSES.includes(task.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Task status "${task.status}" is not active. ETA is only available for statuses: ${ACTIVE_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check that the task has a rider assigned
    if (!task.riderId) {
      return NextResponse.json(
        { success: false, error: 'No rider assigned to this task' },
        { status: 400 }
      );
    }

    // Determine the phase (to_pickup or to_dropoff) and destination
    const isPickupPhase = PICKUP_PHASE_STATUSES.includes(task.status);
    const phase = isPickupPhase ? 'to_pickup' : 'to_dropoff';

    let destLat: number | null;
    let destLng: number | null;
    let destAddress: string;

    if (isPickupPhase) {
      destLat = task.pickupLatitude;
      destLng = task.pickupLongitude;
      destAddress = task.pickupAddress || 'Pickup location';
    } else {
      destLat = task.dropoffLatitude;
      destLng = task.dropoffLongitude;
      destAddress = task.dropoffAddress || 'Dropoff location';
    }

    // Validate destination coordinates
    if (destLat === null || destLng === null) {
      return NextResponse.json(
        {
          success: false,
          error: `Destination coordinates (${phase}) are not set for this task`,
        },
        { status: 400 }
      );
    }

    // Get rider's current location from the driver location store (in-memory)
    const driverLocation = driverLocationStore.getDriver(task.riderId);

    let riderLat: number | null = null;
    let riderLng: number | null = null;
    let averageSpeed: number | null = null;

    // Source 1: In-memory driver location store (from real-time heartbeats)
    if (driverLocation) {
      riderLat = driverLocation.latitude;
      riderLng = driverLocation.longitude;
      // Use the speed from the driver location store if available
      if (driverLocation.speed > 0) {
        averageSpeed = driverLocation.speed;
      }
    }

    // Source 2: Fall back to the rider record's last known location
    if (riderLat === null || riderLng === null) {
      const rider = await db.rider.findUnique({
        where: { id: task.riderId },
        select: {
          currentLatitude: true,
          currentLongitude: true,
          lastKnownSpeed: true,
        },
      });

      if (rider?.currentLatitude != null && rider?.currentLongitude != null) {
        riderLat = rider.currentLatitude;
        riderLng = rider.currentLongitude;
        if (!averageSpeed && rider.lastKnownSpeed && rider.lastKnownSpeed > 0) {
          averageSpeed = rider.lastKnownSpeed;
        }
      }
    }

    // Source 3: Fall back to the task's last known location
    if (riderLat === null || riderLng === null) {
      const taskLocation = await db.task.findUnique({
        where: { id: taskId },
        select: {
          lastKnownLatitude: true,
          lastKnownLongitude: true,
        },
      });

      if (taskLocation?.lastKnownLatitude != null && taskLocation?.lastKnownLongitude != null) {
        riderLat = taskLocation.lastKnownLatitude;
        riderLng = taskLocation.lastKnownLongitude;
      }
    }

    // If we still don't have rider location, return an error
    if (riderLat === null || riderLng === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rider location is not available. The rider may not have started sending heartbeats yet.',
        },
        { status: 404 }
      );
    }

    // Try to compute average speed from recent heartbeat logs
    if (!averageSpeed) {
      const recentHeartbeats = await db.heartbeatLog.findMany({
        where: {
          riderId: task.riderId,
          taskId: taskId,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          latitude: true,
          longitude: true,
          speed: true,
          createdAt: true,
        },
      });

      if (recentHeartbeats.length >= 2) {
        // Reverse to get oldest first
        const heartbeats = recentHeartbeats.reverse().map(hb => ({
          latitude: hb.latitude,
          longitude: hb.longitude,
          timestamp: new Date(hb.createdAt).getTime(),
          speed: hb.speed ?? undefined,
        }));

        const computedSpeed = calculateAverageSpeedFromHeartbeats(heartbeats, 5);
        if (computedSpeed !== null) {
          averageSpeed = computedSpeed;
        }
      }
    }

    // Calculate live ETA
    const serviceType = taskTypeToServiceType(task.taskType);
    const etaResult = calculateLiveETA(
      riderLat,
      riderLng,
      destLat,
      destLng,
      averageSpeed,
      serviceType,
      phase
    );

    // Build response
    const response: ETAResponse = {
      success: true,
      data: {
        ...etaResult,
        taskId: task.id,
        taskNumber: task.taskNumber,
        taskType: task.taskType,
        taskStatus: task.status,
        riderId: task.riderId,
        riderLocation: { latitude: riderLat, longitude: riderLng },
        destination: { latitude: destLat, longitude: destLng, address: destAddress },
        averageSpeedKmh: averageSpeed,
        usingFallbackSpeed: etaResult.confidence === 'LOW',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[ETA API] Error calculating live ETA:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error calculating ETA',
      },
      { status: 500 }
    );
  }
}

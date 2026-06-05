// ============================================
// SMART RIDE - LIVE ETA API
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
  calculateETA,
  calculateDistance,
  formatDuration,
  formatDistance,
  type Location,
  type RouteInfo,
} from '@/lib/tracking/eta-calculator';
import { driverLocationStore } from '@/lib/tracking/driver-location-store';

// ============================================
// Types
// ============================================

interface LiveETAResult {
  phase: 'to_pickup' | 'to_dropoff';
  toPickup: RouteInfo | null;
  toDropoff: RouteInfo | null;
  totalMinutes: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  formattedDuration: string;
  formattedDistance: string;
}

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
];

// All active statuses where ETA makes sense
const ACTIVE_STATUSES: TaskStatus[] = [
  ...PICKUP_PHASE_STATUSES,
  ...DROPOFF_PHASE_STATUSES,
];

// ============================================
// Map TaskType to vehicle type for speed estimation
// ============================================

function taskTypeToVehicleType(taskType: TaskType): 'boda' | 'car' | 'bicycle' | 'walking' {
  switch (taskType) {
    case TaskType.SMART_BODA_RIDE:
      return 'boda';
    case TaskType.SMART_CAR_RIDE:
      return 'car';
    case TaskType.FOOD_DELIVERY:
    case TaskType.SHOPPING:
    case TaskType.ITEM_DELIVERY:
      return 'boda';
    case TaskType.SMART_HEALTH_DELIVERY:
      return 'boda';
    default:
      return 'boda';
  }
}

// ============================================
// Estimate average speed from heartbeat data
// ============================================

function estimateSpeedFromHeartbeats(
  heartbeats: Array<{ latitude: number; longitude: number; speed?: number | null; createdAt: Date }>
): number | null {
  if (heartbeats.length < 2) return null;

  // If recent heartbeats have speed data, use that
  const speeds = heartbeats
    .map(h => h.speed)
    .filter((s): s is number => s != null && s > 0);
  
  if (speeds.length >= 2) {
    const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    // Convert m/s to km/h if the speed appears to be in m/s (typically < 50)
    return avgSpeed < 50 ? avgSpeed * 3.6 : avgSpeed;
  }

  // Calculate speed from position changes
  let totalDistance = 0;
  let totalTime = 0;
  
  for (let i = 1; i < heartbeats.length; i++) {
    const prev = heartbeats[i - 1];
    const curr = heartbeats[i];
    
    const dist = calculateDistance(
      { latitude: prev.latitude, longitude: prev.longitude },
      { latitude: curr.latitude, longitude: curr.longitude }
    );
    
    const timeDiff = (new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 1000 / 3600; // hours
    
    if (timeDiff > 0) {
      totalDistance += dist;
      totalTime += timeDiff;
    }
  }

  if (totalTime > 0) {
    return totalDistance / totalTime; // km/h
  }

  return null;
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
    let usingFallbackSpeed = false;
    if (!averageSpeed) {
      try {
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
          const computedSpeed = estimateSpeedFromHeartbeats(recentHeartbeats.reverse());
          if (computedSpeed !== null) {
            averageSpeed = computedSpeed;
          }
        }
      } catch {
        // HeartbeatLog table might not have data
      }
    }

    // Use fallback speed based on vehicle type if no computed speed
    if (!averageSpeed) {
      const vehicleType = taskTypeToVehicleType(task.taskType);
      const fallbackSpeeds: Record<string, number> = {
        boda: 35,
        car: 25,
        bicycle: 15,
        walking: 5,
      };
      averageSpeed = fallbackSpeeds[vehicleType] || 35;
      usingFallbackSpeed = true;
    }

    // Calculate ETA using the existing calculateETA function
    const vehicleType = taskTypeToVehicleType(task.taskType);
    const toPickup = calculateETA(
      { latitude: riderLat, longitude: riderLng },
      { latitude: task.pickupLatitude || riderLat, longitude: task.pickupLongitude || riderLng },
      vehicleType,
      averageSpeed,
      1.0
    );

    let toDropoff: RouteInfo | null = null;
    if (task.dropoffLatitude && task.dropoffLongitude) {
      const dropoffOrigin = isPickupPhase
        ? { latitude: task.pickupLatitude || riderLat, longitude: task.pickupLongitude || riderLng }
        : { latitude: riderLat, longitude: riderLng };
      
      toDropoff = calculateETA(
        dropoffOrigin,
        { latitude: task.dropoffLatitude, longitude: task.dropoffLongitude },
        vehicleType,
        averageSpeed,
        1.0
      );
    }

    // Calculate total ETA
    let totalMinutes: number;
    if (isPickupPhase) {
      totalMinutes = toPickup.duration + (toDropoff?.duration || 0);
    } else {
      totalMinutes = toDropoff?.duration || toPickup.duration;
    }

    // Determine confidence level
    const confidence: 'HIGH' | 'MEDIUM' | 'LOW' = usingFallbackSpeed ? 'LOW' :
      (driverLocation ? 'HIGH' : 'MEDIUM');

    // Build live ETA result
    const etaResult: LiveETAResult = {
      phase,
      toPickup,
      toDropoff,
      totalMinutes,
      confidence,
      formattedDuration: formatDuration(totalMinutes),
      formattedDistance: formatDistance(
        isPickupPhase ? toPickup.distance : (toDropoff?.distance || toPickup.distance)
      ),
    };

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
        usingFallbackSpeed,
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

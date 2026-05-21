// ============================================
// SMART RIDE - CAPABILITY ENFORCEMENT SERVICE
// ============================================
// Enforces which task types each rider role can handle:
// - Smart Boda Riders: ride requests, item delivery only
// - Smart Car Drivers: passenger rides only
// - Delivery Personnel: food delivery, shopping delivery, item delivery
// ============================================

import { db } from '@/lib/db';
import { RiderRole, TaskType, Rider } from '@prisma/client';

// ============================================
// CAPABILITY DEFINITIONS
// ============================================

// Default capabilities for each rider role
const DEFAULT_CAPABILITIES: Record<RiderRole, TaskType[]> = {
  SMART_BODA_RIDER: [
    TaskType.SMART_BODA_RIDE,
    TaskType.ITEM_DELIVERY,
  ],
  SMART_CAR_DRIVER: [
    TaskType.SMART_CAR_RIDE,
  ],
  DELIVERY_PERSONNEL: [
    TaskType.FOOD_DELIVERY,
    TaskType.SHOPPING,
    TaskType.ITEM_DELIVERY,
    TaskType.SMART_HEALTH_DELIVERY,
  ],
};

// Vehicle requirements for each task type
const VEHICLE_REQUIREMENTS: Partial<Record<TaskType, { vehicleTypes?: string[]; requiresInsulatedBox?: boolean }>> = {
  [TaskType.SMART_CAR_RIDE]: {
    vehicleTypes: ['CAR'],
  },
  [TaskType.FOOD_DELIVERY]: {
    requiresInsulatedBox: true,
  },
  [TaskType.SMART_HEALTH_DELIVERY]: {
    requiresInsulatedBox: true,
  },
};

// ============================================
// CAPABILITY SERVICE
// ============================================

export interface CapabilityCheckResult {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
}

export class CapabilityService {
  /**
   * Check if a rider can handle a specific task type
   */
  static async canHandleTaskType(
    rider: Rider,
    taskType: TaskType
  ): Promise<CapabilityCheckResult> {
    const warnings: string[] = [];

    // Check database capabilities first
    const capability = await db.riderCapability.findUnique({
      where: {
        riderRole_taskType: {
          riderRole: rider.riderRole,
          taskType,
        },
      },
    });

    // If not in database, use defaults
    const isAllowed = capability?.isAllowed ?? 
      DEFAULT_CAPABILITIES[rider.riderRole]?.includes(taskType) ?? 
      false;

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Rider role ${rider.riderRole} is not authorized for task type ${taskType}`,
      };
    }

    // Check vehicle requirements
    const vehicleReq = VEHICLE_REQUIREMENTS[taskType];
    if (vehicleReq) {
      // Check vehicle type if required
      if (vehicleReq.vehicleTypes?.length && rider.vehicleType) {
        if (!vehicleReq.vehicleTypes.includes(rider.vehicleType)) {
          return {
            allowed: false,
            reason: `This task requires one of these vehicle types: ${vehicleReq.vehicleTypes.join(', ')}`,
          };
        }
      }

      // Check insulated box requirement
      if (vehicleReq.requiresInsulatedBox && !rider.hasInsulatedBox) {
        warnings.push('Insulated box is recommended for this task type');
      }
    }

    // Check if rider is approved
    if (rider.status !== 'APPROVED') {
      return {
        allowed: false,
        reason: `Rider status is ${rider.status}. Only APPROVED riders can accept tasks.`,
      };
    }

    // Check if rider is online
    if (!rider.isOnline) {
      return {
        allowed: false,
        reason: 'Rider is currently offline',
      };
    }

    // Check if rider already has an active task
    if (rider.currentTaskId) {
      return {
        allowed: false,
        reason: 'Rider already has an active task',
      };
    }

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get all task types a rider role can handle
   */
  static async getAllowedTaskTypes(riderRole: RiderRole): Promise<TaskType[]> {
    const capabilities = await db.riderCapability.findMany({
      where: {
        riderRole,
        isAllowed: true,
      },
    });

    if (capabilities.length > 0) {
      return capabilities.map((c) => c.taskType);
    }

    // Fall back to defaults
    return DEFAULT_CAPABILITIES[riderRole] || [];
  }

  /**
   * Get all riders that can handle a specific task type
   */
  static async getEligibleRiders(
    taskType: TaskType,
    options: {
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
      limit?: number;
    } = {}
  ): Promise<Rider[]> {
    const { latitude, longitude, radiusKm = 10, limit = 20 } = options;

    // Find rider roles that can handle this task type
    const capabilities = await db.riderCapability.findMany({
      where: {
        taskType,
        isAllowed: true,
      },
    });

    const eligibleRoles = capabilities.length > 0
      ? capabilities.map((c) => c.riderRole)
      : this.getDefaultRolesForTaskType(taskType);

    if (eligibleRoles.length === 0) {
      return [];
    }

    // Build query for eligible riders
    const whereClause: any = {
      riderRole: { in: eligibleRoles },
      status: 'APPROVED',
      isOnline: true,
      currentTaskId: null,
    };

    // Add location filter if provided
    if (latitude !== undefined && longitude !== undefined) {
      // For SQLite, we can't use PostGIS, so we'll fetch and filter in JS
      // In production with PostgreSQL, use PostGIS functions
      const riders = await db.rider.findMany({
        where: whereClause,
        take: limit * 3, // Fetch more to filter by distance
      });

      // Filter by distance
      const ridersWithDistance = riders
        .filter((r) => r.currentLatitude && r.currentLongitude)
        .map((r) => ({
          ...r,
          distance: this.calculateDistance(
            latitude,
            longitude,
            r.currentLatitude!,
            r.currentLongitude!
          ),
        }))
        .filter((r) => r.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      return ridersWithDistance.map((r) => {
        const { distance, ...rider } = r;
        return rider;
      });
    }

    return db.rider.findMany({
      where: whereClause,
      take: limit,
    });
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get default roles for a task type
   */
  private static getDefaultRolesForTaskType(taskType: TaskType): RiderRole[] {
    const roleMap: Record<TaskType, RiderRole[]> = {
      [TaskType.SMART_BODA_RIDE]: [RiderRole.SMART_BODA_RIDER],
      [TaskType.SMART_CAR_RIDE]: [RiderRole.SMART_CAR_DRIVER],
      [TaskType.FOOD_DELIVERY]: [RiderRole.DELIVERY_PERSONNEL],
      [TaskType.SHOPPING]: [RiderRole.DELIVERY_PERSONNEL],
      [TaskType.ITEM_DELIVERY]: [RiderRole.SMART_BODA_RIDER, RiderRole.DELIVERY_PERSONNEL],
      [TaskType.SMART_HEALTH_DELIVERY]: [RiderRole.DELIVERY_PERSONNEL],
    };
    return roleMap[taskType] || [];
  }

  /**
   * Seed default capabilities into database
   */
  static async seedDefaultCapabilities(): Promise<void> {
    const roles = Object.keys(DEFAULT_CAPABILITIES) as RiderRole[];

    for (const role of roles) {
      const taskTypes = DEFAULT_CAPABILITIES[role];
      for (const taskType of taskTypes) {
        await db.riderCapability.upsert({
          where: {
            riderRole_taskType: {
              riderRole: role,
              taskType,
            },
          },
          update: {
            isAllowed: true,
          },
          create: {
            riderRole: role,
            taskType,
            isAllowed: true,
            requiresVehicle: taskType === TaskType.SMART_CAR_RIDE,
            requiresInsulatedBox: [TaskType.FOOD_DELIVERY, TaskType.SMART_HEALTH_DELIVERY].includes(taskType),
          },
        });
      }
    }

    console.log('Default capabilities seeded successfully');
  }

  /**
   * Validate rider for specific task assignment
   */
  static async validateForAssignment(
    riderId: string,
    taskType: TaskType
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const rider = await db.rider.findUnique({
      where: { id: riderId },
      include: { vehicle: true },
    });

    if (!rider) {
      return { valid: false, errors: ['Rider not found'] };
    }

    const check = await this.canHandleTaskType(rider, taskType);
    if (!check.allowed) {
      errors.push(check.reason || 'Not authorized for this task type');
    }

    // Additional checks for vehicle requirements
    const vehicleReq = VEHICLE_REQUIREMENTS[taskType];
    if (vehicleReq?.requiresInsulatedBox && !rider.hasInsulatedBox) {
      errors.push('Insulated box required for this task type');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default CapabilityService;

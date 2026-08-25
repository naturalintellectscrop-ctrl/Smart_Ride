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
// HEARTBEAT FRESHNESS
// ============================================
// `isOnline` alone is a STALE flag — nothing flips it back to false when a
// rider closes the app or loses connection (recovery only handles riders that
// already hold an active task, and no cron sweeps idle riders). So dispatch
// would offer tasks to "ghost" riders whose app is closed but whose flag is
// stuck online; they can't accept, the offer expires, rotates, and the client
// never matches. The app heartbeats every 5-10s while genuinely online, and
// going online sets lastHeartbeatAt immediately, so a heartbeat older than 90s
// (≈9-18 missed beats) reliably means the rider is gone. Eligibility must
// require a fresh heartbeat, not just isOnline=true.
export const RIDER_HEARTBEAT_STALE_MS = 90_000;

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

/**
 * Every rider role, so eligibility can be resolved role by role rather than
 * from whatever rows happen to exist.
 */
const ALL_RIDER_ROLES: RiderRole[] = [
  RiderRole.SMART_BODA_RIDER,
  RiderRole.SMART_CAR_DRIVER,
  RiderRole.DELIVERY_PERSONNEL,
];

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
    // ── OPS-1: "all disabled" is not the same as "unconfigured" ────────────
    //
    // This queried `isAllowed: true` and then fell back to the hardcoded
    // defaults when the result was empty. Those two cases are not the same
    // thing, and collapsing them means an explicit decision is read as an
    // absence of one: an admin who disables every task type for a role gets an
    // empty result, which the fallback then answers with the full default set.
    // The disablement is not just ignored, it is inverted.
    //
    // Read every row for the role, and only fall back when there genuinely are
    // none. Rows that exist and are all disabled correctly yield nothing.
    const capabilities = await db.riderCapability.findMany({ where: { riderRole } });

    if (capabilities.length > 0) {
      return capabilities.filter((c) => c.isAllowed).map((c) => c.taskType);
    }

    // No configuration at all for this role — the code defaults are the model.
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

    // Find rider roles that can handle this task type.
    //
    // ── OPS-1 ─────────────────────────────────────────────────────────────
    // Resolved per ROLE, exactly as `canHandleTaskType` resolves it per rider:
    // a row decides, and only the absence of a row falls back to the default.
    // The two paths used to disagree, and the disagreement was dangerous in
    // both directions.
    //
    // It read `findMany({ taskType, isAllowed: true })` and fell back whenever
    // the result was empty, which produced two wrong answers:
    //
    //   Disabling a service for every role emptied the list, the fallback read
    //   that as "nobody has configured this", and the riders just excluded were
    //   offered the work anyway. An explicit decision inverted into its
    //   opposite.
    //
    //   And a PARTIAL configuration silently narrowed the pool. Onboarding
    //   upserts rows for the onboarding rider's role only, so the first courier
    //   to sign up would create DELIVERY_PERSONNEL rows for ITEM_DELIVERY —
    //   after which any row existing for that task type replaced the defaults
    //   wholesale and boda riders stopped being offered parcels, though the
    //   model says both may carry them. Nothing would have reported this; the
    //   pool would just have been quietly smaller.
    //
    // Resolving per role removes both, and means a half-configured table
    // behaves the same as an empty one for the roles it does not mention.
    const capabilities = await db.riderCapability.findMany({ where: { taskType } });
    const configured = new Map(capabilities.map((c) => [c.riderRole, c.isAllowed]));
    const defaultRoles = this.getDefaultRolesForTaskType(taskType);

    const eligibleRoles = ALL_RIDER_ROLES.filter((role) =>
      configured.has(role) ? configured.get(role)! : defaultRoles.includes(role)
    );

    if (eligibleRoles.length === 0) {
      return [];
    }

    // Build query for eligible riders.
    // NOTE: isOnline=true is necessary but NOT sufficient — it can be stale.
    // Require a heartbeat within RIDER_HEARTBEAT_STALE_MS so we never dispatch
    // to a rider who isn't actually connected (the "ghost rider" that made the
    // client search forever without ever matching). See the constant above.
    const whereClause: any = {
      riderRole: { in: eligibleRoles },
      status: 'APPROVED',
      isOnline: true,
      currentTaskId: null,
      lastHeartbeatAt: { gte: new Date(Date.now() - RIDER_HEARTBEAT_STALE_MS) },
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
            requiresInsulatedBox: ([TaskType.FOOD_DELIVERY, TaskType.SMART_HEALTH_DELIVERY] as TaskType[]).includes(taskType),
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

// ============================================
// SMART RIDE - ENHANCED TASK STATE MACHINE
// ============================================
// Production-grade state machine with:
// - DB persistence for all transitions
// - Validation rules for each transition
// - Timestamps and audit trail
// - Business logic hooks
// ============================================

import { db } from '@/lib/db';
import { TaskStatus, TaskType, RiderRole } from '@prisma/client';

// ============================================
// UTILITY FUNCTIONS (consolidated from state-machine.ts)
// ============================================

/**
 * Generate a task number
 */
export function generateTaskNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `TASK-${year}-${timestamp}`;
}

/**
 * Generate an order number
 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `SR-${year}-${timestamp}`;
}

/**
 * Generate a KOT number
 */
export function generateKOTNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = Date.now().toString(36).toUpperCase();
  return `KOT-${dateStr}-${timestamp}`;
}

/**
 * Check if a rider can perform a task based on their role
 */
export function canRiderPerformTask(riderRole: RiderRole, taskType: TaskType): boolean {
  const CAPABILITY_MAP: Record<RiderRole, TaskType[]> = {
    SMART_BODA_RIDER: ['SMART_BODA_RIDE', 'ITEM_DELIVERY'],
    SMART_CAR_DRIVER: ['SMART_CAR_RIDE', 'ITEM_DELIVERY'],
    DELIVERY_PERSONNEL: ['FOOD_DELIVERY', 'SHOPPING', 'ITEM_DELIVERY', 'SMART_HEALTH_DELIVERY'],
  };
  
  return CAPABILITY_MAP[riderRole]?.includes(taskType) ?? false;
}

/**
 * Get required rider roles for a task type
 */
export function getRequiredRiderRoles(taskType: TaskType): RiderRole[] {
  const ROLE_MAP: Record<TaskType, RiderRole[]> = {
    SMART_BODA_RIDE: ['SMART_BODA_RIDER'],
    SMART_CAR_RIDE: ['SMART_CAR_DRIVER'],
    FOOD_DELIVERY: ['DELIVERY_PERSONNEL'],
    SHOPPING: ['DELIVERY_PERSONNEL'],
    ITEM_DELIVERY: ['SMART_BODA_RIDER', 'SMART_CAR_DRIVER', 'DELIVERY_PERSONNEL'],
    SMART_HEALTH_DELIVERY: ['DELIVERY_PERSONNEL'],
  };
  
  return ROLE_MAP[taskType] || [];
}

/**
 * System timer configurations (in seconds)
 */
export const SYSTEM_TIMERS = {
  MATCHING_TIMEOUT: 300,
  RIDER_RESPONSE_TIMEOUT: 60,
  HEARTBEAT_INTERVAL: 30,
  PICKUP_WAIT_TIMEOUT: 600,
  ORDER_ACCEPT_TIMEOUT: 180,
  ORDER_PREPARATION_DEFAULT: 900,
} as const;

/**
 * Check if a timer has expired
 */
export function isTimerExpired(startTime: Date, timeoutSeconds: number): boolean {
  const elapsedMs = Date.now() - startTime.getTime();
  return elapsedMs / 1000 > timeoutSeconds;
}

/**
 * Get remaining time in seconds
 */
export function getRemainingTime(startTime: Date, timeoutSeconds: number): number {
  const elapsedMs = Date.now() - startTime.getTime();
  return Math.max(0, Math.round(timeoutSeconds - elapsedMs / 1000));
}

/**
 * Check if a transition is valid (simple check using state machine)
 */
export function isValidTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  // Simple validation - will be enhanced by the full state machine
  const VALID_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
    [TaskStatus.CREATED]: [TaskStatus.SEARCHING, TaskStatus.MATCHING, TaskStatus.CANCELLED],
    [TaskStatus.SEARCHING]: [TaskStatus.ASSIGNED, TaskStatus.MATCHING, TaskStatus.CANCELLED, TaskStatus.FAILED],
    [TaskStatus.MATCHING]: [TaskStatus.ASSIGNED, TaskStatus.SEARCHING, TaskStatus.CANCELLED, TaskStatus.FAILED],
    [TaskStatus.ASSIGNED]: [TaskStatus.ACCEPTED, TaskStatus.MATCHING, TaskStatus.CANCELLED],
    [TaskStatus.ACCEPTED]: [TaskStatus.ARRIVING, TaskStatus.ARRIVED, TaskStatus.CANCELLED],
    [TaskStatus.ARRIVING]: [TaskStatus.ARRIVED, TaskStatus.CANCELLED],
    [TaskStatus.ARRIVED]: [TaskStatus.PICKED_UP, TaskStatus.CANCELLED],
    [TaskStatus.PICKED_UP]: [TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT, TaskStatus.CANCELLED],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
    [TaskStatus.IN_TRANSIT]: [TaskStatus.DELIVERED, TaskStatus.CANCELLED],
    [TaskStatus.DELIVERED]: [TaskStatus.COMPLETED],
    [TaskStatus.COMPLETED]: [TaskStatus.PAID],
    [TaskStatus.PAID]: [TaskStatus.CLOSED],
    [TaskStatus.CANCELLED]: [],
    [TaskStatus.FAILED]: [],
    [TaskStatus.CLOSED]: [],
    [TaskStatus.REQUESTED]: [TaskStatus.SEARCHING, TaskStatus.CANCELLED],
  };
  
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Cancellation reason codes
 */
export const CancellationReasonCode = {
  CLIENT_CANCELLED: 'CLIENT_CANCELLED',
  CLIENT_NO_SHOW: 'CLIENT_NO_SHOW',
  CLIENT_WRONG_ADDRESS: 'CLIENT_WRONG_ADDRESS',
  RIDER_CANCELLED: 'RIDER_CANCELLED',
  RIDER_VEHICLE_BREAKDOWN: 'RIDER_VEHICLE_BREAKDOWN',
  RIDER_EMERGENCY: 'RIDER_EMERGENCY',
  MERCHANT_CANCELLED: 'MERCHANT_CANCELLED',
  MERCHANT_OUT_OF_STOCK: 'MERCHANT_OUT_OF_STOCK',
  SYSTEM_TIMEOUT: 'SYSTEM_TIMEOUT',
  NO_RIDER_AVAILABLE: 'NO_RIDER_AVAILABLE',
  MATCHING_TIMEOUT: 'MATCHING_TIMEOUT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;

// ============================================
// STATE MACHINE CONFIGURATION
// ============================================

// Define valid transitions for each task type
interface TransitionConfig {
  from: TaskStatus | TaskStatus[];
  to: TaskStatus;
  requiredFields?: string[];
  validate?: (task: any, context?: any) => Promise<boolean>;
  beforeTransition?: (task: any, context?: any) => Promise<void>;
  afterTransition?: (task: any, context?: any) => Promise<void>;
}

// Ride lifecycle: REQUESTED → SEARCHING → ASSIGNED → ARRIVING → PICKED_UP → IN_PROGRESS → COMPLETED → PAID → CLOSED
const RIDE_TRANSITIONS: TransitionConfig[] = [
  { from: TaskStatus.CREATED, to: TaskStatus.REQUESTED },
  { from: TaskStatus.REQUESTED, to: TaskStatus.SEARCHING },
  { 
    from: TaskStatus.SEARCHING, 
    to: TaskStatus.ASSIGNED,
    requiredFields: ['riderId'],
  },
  { from: TaskStatus.ASSIGNED, to: TaskStatus.ACCEPTED },
  { from: TaskStatus.ACCEPTED, to: TaskStatus.ARRIVING },
  { from: TaskStatus.ARRIVING, to: TaskStatus.ARRIVED },
  { from: TaskStatus.ARRIVED, to: TaskStatus.PICKED_UP },
  { from: TaskStatus.PICKED_UP, to: TaskStatus.IN_PROGRESS },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.COMPLETED },
  { 
    from: TaskStatus.COMPLETED, 
    to: TaskStatus.PAID,
    requiredFields: ['paymentStatus'],
  },
  { from: TaskStatus.PAID, to: TaskStatus.CLOSED },
  // Cancel from any active state
  { 
    from: [TaskStatus.REQUESTED, TaskStatus.SEARCHING, TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.ARRIVING, TaskStatus.ARRIVED, TaskStatus.PICKED_UP, TaskStatus.IN_PROGRESS],
    to: TaskStatus.CANCELLED,
    requiredFields: ['cancellationReason'],
  },
  { from: TaskStatus.SEARCHING, to: TaskStatus.FAILED },
];

// Food delivery lifecycle: CREATED → RESTAURANT_ACCEPTED → KOT_GENERATED → PREPARING → READY → RIDER_ASSIGNED → PICKED_UP → DELIVERED
// Note: We map these to existing TaskStatus enum
const FOOD_DELIVERY_TRANSITIONS: TransitionConfig[] = [
  { from: TaskStatus.CREATED, to: TaskStatus.ASSIGNED }, // Restaurant accepts
  { from: TaskStatus.ASSIGNED, to: TaskStatus.IN_PROGRESS }, // Preparing
  { 
    from: TaskStatus.IN_PROGRESS, 
    to: TaskStatus.SEARCHING, // Ready for rider
  },
  { 
    from: TaskStatus.SEARCHING, 
    to: TaskStatus.ASSIGNED,
    requiredFields: ['riderId'],
  },
  { from: TaskStatus.ASSIGNED, to: TaskStatus.PICKED_UP },
  { from: TaskStatus.PICKED_UP, to: TaskStatus.DELIVERED },
  { from: TaskStatus.DELIVERED, to: TaskStatus.COMPLETED },
];

// Shopping lifecycle: CREATED → ASSIGNED → IN_PROGRESS (shopping) → PICKED_UP → DELIVERED
const SHOPPING_TRANSITIONS: TransitionConfig[] = [
  { 
    from: TaskStatus.CREATED, 
    to: TaskStatus.SEARCHING, // Looking for shopper
  },
  { 
    from: TaskStatus.SEARCHING, 
    to: TaskStatus.ASSIGNED,
    requiredFields: ['riderId'],
  },
  { from: TaskStatus.ASSIGNED, to: TaskStatus.IN_PROGRESS }, // Shopping in progress
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.PICKED_UP }, // Items picked up
  { from: TaskStatus.PICKED_UP, to: TaskStatus.DELIVERED },
];

// Item delivery lifecycle
const ITEM_DELIVERY_TRANSITIONS: TransitionConfig[] = [
  { from: TaskStatus.CREATED, to: TaskStatus.MATCHING },
  { from: TaskStatus.MATCHING, to: TaskStatus.SEARCHING },
  { from: TaskStatus.CREATED, to: TaskStatus.SEARCHING },
  { 
    from: [TaskStatus.SEARCHING, TaskStatus.MATCHING], 
    to: TaskStatus.ASSIGNED,
    requiredFields: ['riderId'],
  },
  { from: TaskStatus.ASSIGNED, to: TaskStatus.ACCEPTED },
  { from: TaskStatus.ACCEPTED, to: TaskStatus.ARRIVING },
  { from: TaskStatus.ARRIVING, to: TaskStatus.PICKED_UP },
  { from: TaskStatus.PICKED_UP, to: TaskStatus.IN_TRANSIT },
  { from: TaskStatus.IN_TRANSIT, to: TaskStatus.DELIVERED },
  { from: TaskStatus.DELIVERED, to: TaskStatus.COMPLETED },
  // Cancel from any active state
  { 
    from: [TaskStatus.MATCHING, TaskStatus.SEARCHING, TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.ARRIVING, TaskStatus.PICKED_UP, TaskStatus.IN_TRANSIT],
    to: TaskStatus.CANCELLED,
    requiredFields: ['cancellationReason'],
  },
];

// Health delivery lifecycle
const HEALTH_DELIVERY_TRANSITIONS: TransitionConfig[] = [
  { from: TaskStatus.CREATED, to: TaskStatus.SEARCHING },
  { 
    from: TaskStatus.SEARCHING, 
    to: TaskStatus.ASSIGNED,
    requiredFields: ['riderId'],
  },
  { from: TaskStatus.ASSIGNED, to: TaskStatus.PICKED_UP },
  { from: TaskStatus.PICKED_UP, to: TaskStatus.IN_TRANSIT },
  { from: TaskStatus.IN_TRANSIT, to: TaskStatus.DELIVERED },
  { from: TaskStatus.DELIVERED, to: TaskStatus.COMPLETED },
];

// Get transitions for task type
function getTransitionsForTaskType(taskType: TaskType): TransitionConfig[] {
  switch (taskType) {
    case TaskType.SMART_BODA_RIDE:
    case TaskType.SMART_CAR_RIDE:
      return RIDE_TRANSITIONS;
    case TaskType.FOOD_DELIVERY:
      return FOOD_DELIVERY_TRANSITIONS;
    case TaskType.SHOPPING:
      return SHOPPING_TRANSITIONS;
    case TaskType.ITEM_DELIVERY:
      return ITEM_DELIVERY_TRANSITIONS;
    case TaskType.SMART_HEALTH_DELIVERY:
      return HEALTH_DELIVERY_TRANSITIONS;
    default:
      return RIDE_TRANSITIONS;
  }
}

// ============================================
// STATE MACHINE SERVICE
// ============================================

export interface TransitionContext {
  userId?: string;
  riderId?: string;
  triggeredByType?: 'CLIENT' | 'RIDER' | 'SYSTEM' | 'ADMIN';
  reason?: string;
  metadata?: Record<string, any>;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface TransitionResult {
  success: boolean;
  task?: any;
  transition?: any;
  error?: string;
}

export class EnhancedTaskStateMachine {
  /**
   * Idempotency window in seconds.
   * If a transition from the same fromStatus → toStatus was created within
   * this window for the same task, we return the existing result instead of
   * creating a duplicate.
   */
  private static readonly IDEMPOTENCY_WINDOW_SECONDS = 5;

  /**
   * Generate an idempotency key for a transition.
   * Key = taskId + fromStatus + toStatus + timestamp-rounded-to-5s
   * The 5-second rounding means two calls within the same 5-second bucket
   * produce the same key, allowing deduplication.
   */
  private static generateTransitionId(
    taskId: string,
    fromStatus: TaskStatus,
    toStatus: TaskStatus
  ): string {
    const bucket = Math.floor(Date.now() / (this.IDEMPOTENCY_WINDOW_SECONDS * 1000));
    return `${taskId}:${fromStatus}:${toStatus}:${bucket}`;
  }

  /**
   * Attempt to transition a task to a new status.
   * Includes idempotency check: if the same transition was already recorded
   * within the last 5 seconds, returns the existing result.
   */
  static async transition(
    taskId: string,
    toStatus: TaskStatus,
    context: TransitionContext = {}
  ): Promise<TransitionResult> {
    try {
      // Fetch the task
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: {
          rider: { include: { user: true } },
          client: true,
          order: true,
        },
      });

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      const fromStatus = task.status;
      const taskType = task.taskType;

      // ── Idempotency check ─────────────────────────────────────
      // If a transition from the same fromStatus → toStatus was created within
      // the last 5 seconds for this task, return the existing result.
      const recentTransition = await db.taskStateTransition.findFirst({
        where: {
          taskId,
          fromStatus,
          toStatus,
          createdAt: {
            gte: new Date(Date.now() - this.IDEMPOTENCY_WINDOW_SECONDS * 1000),
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentTransition) {
        // The task was already transitioned — verify the task status matches
        if (task.status === toStatus) {
          console.log(
            `[StateMachine] Idempotent transition detected: ${taskId} ${fromStatus} → ${toStatus}, returning existing result`
          );
          return {
            success: true,
            task,
            transition: recentTransition,
          };
        }
        // If task status doesn't match (edge case: race condition where task
        // was updated again), fall through to perform the transition normally.
      }

      // Check if transition is valid
      const transitions = getTransitionsForTaskType(taskType);
      const transitionConfig = transitions.find(
        (t) => 
          t.to === toStatus && 
          (Array.isArray(t.from) ? t.from.includes(fromStatus) : t.from === fromStatus)
      );

      if (!transitionConfig) {
        return { 
          success: false, 
          error: `Invalid transition from ${fromStatus} to ${toStatus} for task type ${taskType}` 
        };
      }

      // Check required fields
      if (transitionConfig.requiredFields) {
        const missingFields = transitionConfig.requiredFields.filter(
          (field) => {
            const value = (task as any)[field] || (context as any)[field];
            return value === undefined || value === null;
          }
        );
        if (missingFields.length > 0) {
          return { 
            success: false, 
            error: `Missing required fields: ${missingFields.join(', ')}` 
          };
        }
      }

      // Run custom validation if defined
      if (transitionConfig.validate) {
        const isValid = await transitionConfig.validate(task, context);
        if (!isValid) {
          return { success: false, error: 'Validation failed for this transition' };
        }
      }

      // Run before transition hook
      if (transitionConfig.beforeTransition) {
        await transitionConfig.beforeTransition(task, context);
      }

      // Generate the transition ID for this attempt
      const transitionId = this.generateTransitionId(taskId, fromStatus, toStatus);

      // Execute transition in transaction
      const result = await db.$transaction(async (tx) => {
        // Double-check idempotency inside the transaction to prevent race conditions
        const existingInTx = await tx.taskStateTransition.findFirst({
          where: {
            taskId,
            fromStatus,
            toStatus,
            createdAt: {
              gte: new Date(Date.now() - this.IDEMPOTENCY_WINDOW_SECONDS * 1000),
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (existingInTx) {
          // Another concurrent request already created this transition
          const currentTask = await tx.task.findUnique({ where: { id: taskId } });
          return { task: currentTask, transition: existingInTx, idempotent: true };
        }

        // Update task status
        const updatedTask = await tx.task.update({
          where: { id: taskId },
          data: {
            status: toStatus,
            ...this.getStatusTimestampUpdate(toStatus),
            riderId: context.riderId ?? task.riderId,
          },
        });

        // Create state transition record with metadata that includes the transitionId
        const transition = await tx.taskStateTransition.create({
          data: {
            taskId,
            fromStatus,
            toStatus,
            triggeredBy: context.userId,
            triggeredByType: context.triggeredByType,
            reason: context.reason,
            metadata: JSON.stringify({
              ...(context.metadata || {}),
              _transitionId: transitionId,
              _idempotencyWindow: this.IDEMPOTENCY_WINDOW_SECONDS,
            }),
            latitude: context.latitude,
            longitude: context.longitude,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            actorId: context.userId,
            actorType: this.getActorType(context.triggeredByType),
            taskId,
            action: 'STATUS_CHANGE',
            entityType: 'Task',
            entityId: taskId,
            description: `Task status changed from ${fromStatus} to ${toStatus}`,
            oldValues: JSON.stringify({ status: fromStatus }),
            newValues: JSON.stringify({ status: toStatus }),
          },
        });

        return { task: updatedTask, transition, idempotent: false };
      });

      // Run after transition hook (only if this was not an idempotent result)
      if (!result.idempotent && transitionConfig.afterTransition) {
        await transitionConfig.afterTransition(result.task, context);
      }

      return { 
        success: true, 
        task: result.task, 
        transition: result.transition 
      };
    } catch (error: any) {
      console.error('Task state transition error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to transition task state' 
      };
    }
  }

  /**
   * Get timestamp field to update based on new status
   */
  private static getStatusTimestampUpdate(status: TaskStatus): Record<string, Date> {
    const timestampFields: Record<TaskStatus, string> = {
      [TaskStatus.CREATED]: 'createdAt',
      [TaskStatus.REQUESTED]: 'createdAt',
      [TaskStatus.SEARCHING]: 'matchingStartedAt',
      [TaskStatus.MATCHING]: 'matchingStartedAt',
      [TaskStatus.ASSIGNED]: 'assignedAt',
      [TaskStatus.ACCEPTED]: 'acceptedAt',
      [TaskStatus.ARRIVED]: 'arrivedAtPickupAt',
      [TaskStatus.ARRIVING]: 'arrivedAtPickupAt',
      [TaskStatus.PICKED_UP]: 'pickedUpAt',
      [TaskStatus.IN_PROGRESS]: 'inProgressAt',
      [TaskStatus.IN_TRANSIT]: 'inProgressAt',
      [TaskStatus.DELIVERED]: 'completedAt',
      [TaskStatus.COMPLETED]: 'completedAt',
      [TaskStatus.PAID]: 'completedAt',
      [TaskStatus.CLOSED]: 'completedAt',
      [TaskStatus.CANCELLED]: 'cancelledAt',
      [TaskStatus.FAILED]: 'cancelledAt',
    };

    const field = timestampFields[status];
    if (field) {
      return { [field]: new Date() };
    }
    return {};
  }

  /**
   * Map triggered by type to ActorType enum
   */
  private static getActorType(type?: string): string {
    switch (type) {
      case 'CLIENT':
        return 'USER';
      case 'RIDER':
        return 'RIDER';
      case 'ADMIN':
        return 'ADMIN';
      default:
        return 'SYSTEM';
    }
  }

  /**
   * Get valid next statuses for a task
   */
  static getValidNextStatuses(taskType: TaskType, currentStatus: TaskStatus): TaskStatus[] {
    const transitions = getTransitionsForTaskType(taskType);
    const validTransitions = transitions.filter(
      (t) => Array.isArray(t.from) ? t.from.includes(currentStatus) : t.from === currentStatus
    );
    return validTransitions.map((t) => t.to);
  }

  /**
   * Get task history (state transitions)
   */
  static async getTaskHistory(taskId: string) {
    return db.taskStateTransition.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Cancel a task with reason
   */
  static async cancelTask(
    taskId: string,
    cancelledBy: string,
    reason: string,
    context: TransitionContext = {}
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.CANCELLED, {
      ...context,
      userId: cancelledBy,
      reason,
      metadata: { cancellationReason: reason },
    });
  }

  /**
   * Auto-assign task (system-triggered)
   */
  static async autoAssign(
    taskId: string, 
    riderId: string
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.ASSIGNED, {
      riderId,
      triggeredByType: 'SYSTEM',
      reason: 'Auto-assigned by dispatch system',
    });
  }

  /**
   * Rider accepts task
   */
  static async riderAccept(
    taskId: string, 
    riderId: string
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.ACCEPTED, {
      riderId,
      triggeredByType: 'RIDER',
    });
  }

  /**
   * Rider arrives at pickup
   */
  static async riderArrive(
    taskId: string, 
    riderId: string,
    latitude?: number,
    longitude?: number
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.ARRIVED, {
      riderId,
      triggeredByType: 'RIDER',
      latitude,
      longitude,
    });
  }

  /**
   * Mark task as picked up
   */
  static async pickedUp(
    taskId: string, 
    riderId: string
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.PICKED_UP, {
      riderId,
      triggeredByType: 'RIDER',
    });
  }

  /**
   * Start trip/delivery
   */
  static async startTrip(
    taskId: string, 
    riderId: string
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.IN_PROGRESS, {
      riderId,
      triggeredByType: 'RIDER',
    });
  }

  /**
   * Complete task
   */
  static async completeTask(
    taskId: string, 
    riderId: string
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.COMPLETED, {
      riderId,
      triggeredByType: 'RIDER',
    });
  }
}

export default EnhancedTaskStateMachine;

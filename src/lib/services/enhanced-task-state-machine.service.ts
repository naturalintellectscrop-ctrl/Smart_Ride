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
import { TaskAnalyticsUpdater } from './analytics-updater.service';
import { FinanceLedgerService } from './finance-ledger.service';
import { sendTaskUpdateNotification } from './notification.service';
import { SocketReliabilityService } from '@/lib/realtime/socket-reliability.service';

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
  // Comprehensive validation covering all task types (ride, food delivery,
  // shopping, item delivery, health delivery) and cancellation from any
  // active state.
  const VALID_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
    [TaskStatus.CREATED]: [TaskStatus.SEARCHING, TaskStatus.MATCHING, TaskStatus.ASSIGNED, TaskStatus.REQUESTED, TaskStatus.CANCELLED],
    [TaskStatus.REQUESTED]: [TaskStatus.SEARCHING, TaskStatus.CANCELLED],
    [TaskStatus.SEARCHING]: [TaskStatus.ASSIGNED, TaskStatus.MATCHING, TaskStatus.CANCELLED, TaskStatus.FAILED],
    [TaskStatus.MATCHING]: [TaskStatus.ASSIGNED, TaskStatus.SEARCHING, TaskStatus.CANCELLED, TaskStatus.FAILED],
    [TaskStatus.ASSIGNED]: [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS, TaskStatus.PICKED_UP, TaskStatus.MATCHING, TaskStatus.CANCELLED],
    [TaskStatus.ACCEPTED]: [TaskStatus.ARRIVING, TaskStatus.ARRIVED, TaskStatus.CANCELLED],
    [TaskStatus.ARRIVING]: [TaskStatus.ARRIVED, TaskStatus.CANCELLED],
    [TaskStatus.ARRIVED]: [TaskStatus.PICKED_UP, TaskStatus.CANCELLED],
    [TaskStatus.PICKED_UP]: [TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT, TaskStatus.DELIVERED, TaskStatus.CANCELLED],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.IN_TRANSIT, TaskStatus.SEARCHING, TaskStatus.PICKED_UP, TaskStatus.CANCELLED],
    [TaskStatus.IN_TRANSIT]: [TaskStatus.DELIVERED, TaskStatus.CANCELLED],
    [TaskStatus.DELIVERED]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
    [TaskStatus.COMPLETED]: [TaskStatus.PAID],
    [TaskStatus.PAID]: [TaskStatus.CLOSED],
    [TaskStatus.CANCELLED]: [],
    [TaskStatus.FAILED]: [],
    [TaskStatus.CLOSED]: [],
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
  { from: TaskStatus.CREATED, to: TaskStatus.MATCHING },
  { from: TaskStatus.CREATED, to: TaskStatus.REQUESTED },
  { from: TaskStatus.MATCHING, to: TaskStatus.SEARCHING },
  { from: TaskStatus.REQUESTED, to: TaskStatus.SEARCHING },
  { from: TaskStatus.MATCHING, to: TaskStatus.ASSIGNED, requiredFields: ['riderId'] },
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
    from: [TaskStatus.REQUESTED, TaskStatus.MATCHING, TaskStatus.SEARCHING, TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.ARRIVING, TaskStatus.ARRIVED, TaskStatus.PICKED_UP, TaskStatus.IN_PROGRESS],
    to: TaskStatus.CANCELLED,
    requiredFields: ['cancellationReason'],
  },
  { from: TaskStatus.SEARCHING, to: TaskStatus.FAILED },
  { from: TaskStatus.MATCHING, to: TaskStatus.FAILED },
];

// Food delivery lifecycle: CREATED → RESTAURANT_ACCEPTED → KOT_GENERATED → PREPARING → READY → RIDER_ASSIGNED → PICKED_UP → DELIVERED
// Note: We map these to existing TaskStatus enum
const FOOD_DELIVERY_TRANSITIONS: TransitionConfig[] = [
  { from: TaskStatus.CREATED, to: TaskStatus.MATCHING }, // Order ready, starting dispatch
  { from: TaskStatus.MATCHING, to: TaskStatus.SEARCHING },
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
  { from: TaskStatus.MATCHING, to: TaskStatus.ASSIGNED, requiredFields: ['riderId'] },
  { from: TaskStatus.ASSIGNED, to: TaskStatus.PICKED_UP },
  { from: TaskStatus.PICKED_UP, to: TaskStatus.DELIVERED },
  { from: TaskStatus.DELIVERED, to: TaskStatus.COMPLETED },
  { from: TaskStatus.COMPLETED, to: TaskStatus.PAID, requiredFields: ['paymentStatus'] },
  { from: TaskStatus.PAID, to: TaskStatus.CLOSED },
  // Cancel from any active state
  {
    from: [TaskStatus.CREATED, TaskStatus.MATCHING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.SEARCHING, TaskStatus.PICKED_UP, TaskStatus.DELIVERED],
    to: TaskStatus.CANCELLED,
    requiredFields: ['cancellationReason'],
  },
];

// Shopping lifecycle: CREATED → ASSIGNED → IN_PROGRESS (shopping) → PICKED_UP → DELIVERED
const SHOPPING_TRANSITIONS: TransitionConfig[] = [
  { 
    from: TaskStatus.CREATED, 
    to: TaskStatus.MATCHING, // Order ready, starting dispatch
  },
  { from: TaskStatus.MATCHING, to: TaskStatus.SEARCHING },
  { 
    from: TaskStatus.CREATED, 
    to: TaskStatus.SEARCHING, // Looking for shopper
  },
  { 
    from: TaskStatus.SEARCHING, 
    to: TaskStatus.ASSIGNED,
    requiredFields: ['riderId'],
  },
  { from: TaskStatus.MATCHING, to: TaskStatus.ASSIGNED, requiredFields: ['riderId'] },
  { from: TaskStatus.ASSIGNED, to: TaskStatus.IN_PROGRESS }, // Shopping in progress
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.PICKED_UP }, // Items picked up
  { from: TaskStatus.PICKED_UP, to: TaskStatus.DELIVERED },
  { from: TaskStatus.DELIVERED, to: TaskStatus.COMPLETED },
  { from: TaskStatus.COMPLETED, to: TaskStatus.PAID, requiredFields: ['paymentStatus'] },
  { from: TaskStatus.PAID, to: TaskStatus.CLOSED },
  // Cancel from any active state
  {
    from: [TaskStatus.SEARCHING, TaskStatus.MATCHING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.PICKED_UP, TaskStatus.DELIVERED],
    to: TaskStatus.CANCELLED,
    requiredFields: ['cancellationReason'],
  },
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
  { from: TaskStatus.COMPLETED, to: TaskStatus.PAID, requiredFields: ['paymentStatus'] },
  { from: TaskStatus.PAID, to: TaskStatus.CLOSED },
  // Cancel from any active state
  { 
    from: [TaskStatus.MATCHING, TaskStatus.SEARCHING, TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.ARRIVING, TaskStatus.PICKED_UP, TaskStatus.IN_TRANSIT, TaskStatus.DELIVERED],
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
  { from: TaskStatus.COMPLETED, to: TaskStatus.PAID, requiredFields: ['paymentStatus'] },
  { from: TaskStatus.PAID, to: TaskStatus.CLOSED },
  // Cancel from any active state
  {
    from: [TaskStatus.SEARCHING, TaskStatus.ASSIGNED, TaskStatus.PICKED_UP, TaskStatus.IN_TRANSIT, TaskStatus.DELIVERED],
    to: TaskStatus.CANCELLED,
    requiredFields: ['cancellationReason'],
  },
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
  /** Required for CANCELLED transitions: must be present at context top-level for requiredFields validation */
  cancellationReason?: string;
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

      // ── Actor validation ─────────────────────────────────────
      // If an actor type is specified in context, validate that this actor
      // is permitted to perform the transition. If no actor is specified,
      // the transition is allowed (backwards compatibility).
      if (context.triggeredByType) {
        const allowedActors = this.getAllowedActors(fromStatus, toStatus, taskType);
        if (allowedActors.length > 0 && !allowedActors.includes(context.triggeredByType)) {
          return {
            success: false,
            error: `Actor '${context.triggeredByType}' is not authorized to transition from ${fromStatus} to ${toStatus}`,
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

        // ── Rider lifecycle: currentTaskId management ──────────
        // Resolve the rider involved in this transition.
        // context.riderId takes precedence (new assignment), then task.riderId (existing).
        const effectiveRiderId = context.riderId ?? task.riderId;
        const previousRiderId = task.riderId; // rider before this transition

        // SET: When task becomes ASSIGNED, rider takes ownership of this task
        if (toStatus === TaskStatus.ASSIGNED && effectiveRiderId) {
          await tx.rider.updateMany({
            where: { id: effectiveRiderId },
            data: { currentTaskId: taskId },
          });
        }

        // CLEAR: When task reaches a terminal state, release the rider
        const terminalStatuses: TaskStatus[] = [
          TaskStatus.COMPLETED,
          TaskStatus.CANCELLED,
          TaskStatus.FAILED,
          TaskStatus.CLOSED,
        ];
        if (terminalStatuses.includes(toStatus) && previousRiderId) {
          await tx.rider.updateMany({
            where: { id: previousRiderId },
            data: { currentTaskId: null },
          });
        }

        // CLEAR: When task is reassigned (goes from an active state back to dispatch)
        // the previous rider must be released so they can receive new assignments
        const activeStatuses: TaskStatus[] = [
          TaskStatus.ASSIGNED,
          TaskStatus.ACCEPTED,
          TaskStatus.ARRIVING,
          TaskStatus.ARRIVED,
          TaskStatus.PICKED_UP,
          TaskStatus.IN_PROGRESS,
          TaskStatus.IN_TRANSIT,
        ];
        const dispatchStatuses: TaskStatus[] = [
          TaskStatus.MATCHING,
          TaskStatus.SEARCHING,
        ];
        if (
          dispatchStatuses.includes(toStatus) &&
          activeStatuses.includes(fromStatus) &&
          previousRiderId
        ) {
          await tx.rider.updateMany({
            where: { id: previousRiderId },
            data: { currentTaskId: null },
          });
        }

        return { task: updatedTask, transition, idempotent: false };
      });

      // Run after transition hook (only if this was not an idempotent result)
      if (!result.idempotent && transitionConfig.afterTransition) {
        await transitionConfig.afterTransition(result.task, context);
      }

      // Fire-and-forget analytics updates
      if (!result.idempotent) {
        this.updateAnalytics(toStatus, result.task, context).catch(err =>
          console.error('[StateMachine] Analytics update failed:', err)
        );
      }

      // Fire-and-forget: lifecycle side effects (notifications + socket events)
      // These run after the transition is committed and must never affect the result.
      if (!result.idempotent) {
        this.emitLifecycleSideEffects(toStatus, task, result.task, fromStatus, context).catch(err =>
          console.error('[StateMachine] Lifecycle side effects failed:', err)
        );
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
   * Fire-and-forget analytics updates based on the new task status.
   * Calls the appropriate TaskAnalyticsUpdater methods.
   * This method MUST never throw — all calls are already wrapped in
   * try/catch inside TaskAnalyticsUpdater, but we also catch here as
   * an extra safety net.
   */
  private static async updateAnalytics(
    toStatus: TaskStatus,
    task: any,
    context: TransitionContext
  ): Promise<void> {
    try {
      const taskType = task.taskType as TaskType;
      const riderId = task.riderId || context.riderId;

      switch (toStatus) {
        case TaskStatus.ASSIGNED: {
          // Task assigned to rider
          const dispatchDurationMs =
            task.matchingStartedAt && task.assignedAt
              ? new Date(task.assignedAt).getTime() - new Date(task.matchingStartedAt).getTime()
              : task.matchingStartedAt
                ? Date.now() - new Date(task.matchingStartedAt).getTime()
                : undefined;

          if (riderId) {
            await TaskAnalyticsUpdater.onTaskAssigned(taskType, riderId, dispatchDurationMs);
          }
          break;
        }

        case TaskStatus.COMPLETED: {
          // Task completed
          const taskDurationMs =
            task.createdAt && task.completedAt
              ? new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()
              : task.createdAt
                ? Date.now() - new Date(task.createdAt).getTime()
                : undefined;

          if (riderId) {
            await TaskAnalyticsUpdater.onTaskCompleted(
              taskType,
              riderId,
              taskDurationMs,
              task.riderEarnings ?? undefined
            );
          }

          // Fire-and-forget: Record task completion in the finance ledger
          // for immutable audit trail and atomic earnings update
          FinanceLedgerService.recordTaskCompletion(task.id).catch(err =>
            console.error('[StateMachine] FinanceLedger recordTaskCompletion failed:', err)
          );
          break;
        }

        case TaskStatus.CANCELLED: {
          // Task cancelled
          const reason = context.reason || task.cancellationReason || undefined;
          await TaskAnalyticsUpdater.onTaskCancelled(taskType, reason, riderId || undefined);

          // Fire-and-forget: Record cancellation in the finance ledger
          // for refund handling and audit trail
          FinanceLedgerService.recordCancellation(task.id, reason).catch(err =>
            console.error('[StateMachine] FinanceLedger recordCancellation failed:', err)
          );
          break;
        }

        case TaskStatus.PAID: {
          // Payment completed for task
          if (riderId) {
            await TaskAnalyticsUpdater.onPaymentCompleted(
              taskType,
              task.totalAmount ?? 0,
              task.platformCommission ?? 0,
              task.riderEarnings ?? 0,
              riderId,
              task.clientId
            );
          }
          break;
        }

        default:
          // No specific analytics for other statuses
          break;
      }
    } catch (error) {
      // Extra safety net — should never reach here since TaskAnalyticsUpdater
      // methods have their own try/catch, but we don't want to propagate
      // analytics failures under any circumstance.
      console.error('[StateMachine] updateAnalytics unexpected error:', error);
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
      cancellationReason: reason, // Required at top-level for requiredFields validation
      metadata: { cancellationReason: reason, ...(context.metadata || {}) },
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
    riderId: string,
    additionalContext: Partial<TransitionContext> = {}
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.ACCEPTED, {
      riderId,
      triggeredByType: 'RIDER',
      ...additionalContext,
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
    riderId: string,
    additionalContext: Partial<TransitionContext> = {}
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.IN_PROGRESS, {
      riderId,
      triggeredByType: 'RIDER',
      ...additionalContext,
    });
  }

  /**
   * Complete task
   */
  static async completeTask(
    taskId: string, 
    riderId: string,
    additionalContext: Partial<TransitionContext> = {}
  ): Promise<TransitionResult> {
    return this.transition(taskId, TaskStatus.COMPLETED, {
      riderId,
      triggeredByType: 'RIDER',
      ...additionalContext,
    });
  }

  // ============================================
  // ACTOR VALIDATION
  // ============================================

  /**
   * Get the list of actors allowed to perform a specific transition.
   * Derived from the unified-state-machine.ts actor permission rules.
   * SYSTEM and ADMIN are always allowed for non-FAILED transitions.
   */
  private static getAllowedActors(
    fromStatus: TaskStatus,
    toStatus: TaskStatus,
    taskType: TaskType
  ): Array<'CLIENT' | 'RIDER' | 'SYSTEM' | 'ADMIN'> {
    // FAILED transitions are SYSTEM-only
    if (toStatus === TaskStatus.FAILED) {
      return ['SYSTEM'];
    }

    // SYSTEM and ADMIN can trigger any non-FAILED transition
    const actors: Array<'CLIENT' | 'RIDER' | 'SYSTEM' | 'ADMIN'> = ['SYSTEM', 'ADMIN'];

    // ── Cancellation actor rules ────────────────────────────
    if (toStatus === TaskStatus.CANCELLED) {
      actors.push('CLIENT');
      const isRideType = taskType === TaskType.SMART_BODA_RIDE || taskType === TaskType.SMART_CAR_RIDE;
      if (isRideType) {
        // Ride: RIDER can cancel during active trip
        if (fromStatus === TaskStatus.IN_PROGRESS) {
          actors.push('RIDER');
        }
      } else {
        // Delivery: RIDER can cancel during active delivery phases.
        // Note: Merchants are mapped to 'RIDER' actor in existing code,
        // so RIDER must be allowed from any active state for delivery types
        // to maintain backwards compatibility with merchant cancellations.
        actors.push('RIDER');
      }
      return actors;
    }

    // ── CLIENT-initiated transitions ────────────────────────
    if (fromStatus === TaskStatus.CREATED && toStatus === TaskStatus.REQUESTED) {
      actors.push('CLIENT');
    }
    // Ride-specific: client can start the trip when rider has arrived
    if (
      fromStatus === TaskStatus.ARRIVED &&
      toStatus === TaskStatus.IN_PROGRESS &&
      (taskType === TaskType.SMART_BODA_RIDE || taskType === TaskType.SMART_CAR_RIDE)
    ) {
      actors.push('CLIENT');
    }

    // ── RIDER-initiated transitions ─────────────────────────
    const riderTransitionPairs: Array<[TaskStatus, TaskStatus]> = [
      [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED],
      [TaskStatus.ACCEPTED, TaskStatus.ARRIVING],
      [TaskStatus.ARRIVING, TaskStatus.ARRIVED],
      [TaskStatus.ACCEPTED, TaskStatus.ARRIVED],
      [TaskStatus.ARRIVED, TaskStatus.PICKED_UP],
      [TaskStatus.PICKED_UP, TaskStatus.IN_PROGRESS],
      [TaskStatus.PICKED_UP, TaskStatus.IN_TRANSIT],
      [TaskStatus.PICKED_UP, TaskStatus.DELIVERED],
      [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
      [TaskStatus.IN_TRANSIT, TaskStatus.DELIVERED],
      [TaskStatus.DELIVERED, TaskStatus.COMPLETED],
      [TaskStatus.ASSIGNED, TaskStatus.PICKED_UP],
      [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
    ];
    if (riderTransitionPairs.some(([from, to]) => from === fromStatus && to === toStatus)) {
      actors.push('RIDER');
    }

    return actors;
  }

  // ============================================
  // LIFECYCLE SIDE EFFECTS (notifications + sockets)
  // ============================================

  /**
   * Emit lifecycle side effects after a successful transition.
   * This method MUST never throw — it is called fire-and-forget.
   * Handles both DB notifications and real-time socket events.
   */
  private static async emitLifecycleSideEffects(
    toStatus: TaskStatus,
    preTransitionTask: any,
    postTransitionTask: any,
    fromStatus: TaskStatus,
    context: TransitionContext
  ): Promise<void> {
    try {
      const taskId = preTransitionTask.id;
      const taskNumber = preTransitionTask.taskNumber || preTransitionTask.id;
      const clientId = preTransitionTask.clientId;
      const riderUserId = preTransitionTask.rider?.userId;
      const effectiveRiderId = context.riderId ?? preTransitionTask.riderId;

      // ── Emit notifications (DB + socket via notification service) ──
      await this.emitNotifications(toStatus, taskId, taskNumber, clientId, riderUserId, effectiveRiderId, context);

      // ── Emit socket events (real-time updates) ──
      await this.emitSocketEvents(toStatus, taskId, taskNumber, clientId, riderUserId, effectiveRiderId, fromStatus, context);
    } catch (error) {
      console.error('[StateMachine] emitLifecycleSideEffects error:', error);
    }
  }

  /**
   * Send DB notifications for task status transitions.
   * Uses the existing sendTaskUpdateNotification which also emits
   * a socket 'notification' event automatically.
   */
  private static async emitNotifications(
    toStatus: TaskStatus,
    taskId: string,
    taskNumber: string,
    clientId: string | undefined,
    riderUserId: string | undefined,
    effectiveRiderId: string | undefined,
    context: TransitionContext
  ): Promise<void> {
    const statusStr = toStatus as string;

    try {
      switch (toStatus) {
        case TaskStatus.ASSIGNED: {
          // Notify client: rider has been assigned
          if (clientId) {
            await sendTaskUpdateNotification(clientId, taskId, taskNumber, statusStr).catch(() => {});
          }
          // Notify rider: you have a new task
          if (riderUserId) {
            await sendTaskUpdateNotification(riderUserId, taskId, taskNumber, statusStr).catch(() => {});
          }
          break;
        }

        case TaskStatus.ACCEPTED: {
          // Notify client: rider accepted
          if (clientId) {
            await sendTaskUpdateNotification(clientId, taskId, taskNumber, statusStr).catch(() => {});
          }
          break;
        }

        case TaskStatus.COMPLETED: {
          // Notify client: task completed
          if (clientId) {
            await sendTaskUpdateNotification(clientId, taskId, taskNumber, statusStr).catch(() => {});
          }
          // Notify rider: task completed
          if (riderUserId) {
            await sendTaskUpdateNotification(riderUserId, taskId, taskNumber, statusStr).catch(() => {});
          }
          break;
        }

        case TaskStatus.CANCELLED: {
          // Notify client: task cancelled
          if (clientId) {
            await sendTaskUpdateNotification(clientId, taskId, taskNumber, statusStr).catch(() => {});
          }
          // Notify rider: task cancelled (if assigned)
          if (riderUserId) {
            await sendTaskUpdateNotification(riderUserId, taskId, taskNumber, statusStr).catch(() => {});
          }
          break;
        }

        case TaskStatus.FAILED: {
          // Notify client: task failed
          if (clientId) {
            await sendTaskUpdateNotification(clientId, taskId, taskNumber, statusStr).catch(() => {});
          }
          break;
        }

        case TaskStatus.DELIVERED: {
          // Notify client: delivery completed
          if (clientId) {
            await sendTaskUpdateNotification(clientId, taskId, taskNumber, statusStr).catch(() => {});
          }
          break;
        }

        case TaskStatus.PAID: {
          // Notify client: payment confirmed
          if (clientId) {
            await sendTaskUpdateNotification(clientId, taskId, taskNumber, statusStr).catch(() => {});
          }
          break;
        }

        default:
          // No specific notification for other statuses in Phase 1
          break;
      }
    } catch (error) {
      console.error('[StateMachine] emitNotifications error:', error);
    }
  }

  /**
   * Emit real-time socket events for task status transitions.
   * Uses SocketReliabilityService for reliable delivery with DB fallback.
   */
  private static async emitSocketEvents(
    toStatus: TaskStatus,
    taskId: string,
    taskNumber: string,
    clientId: string | undefined,
    riderUserId: string | undefined,
    effectiveRiderId: string | undefined,
    fromStatus: TaskStatus,
    context: TransitionContext
  ): Promise<void> {
    try {
      // ── All transitions: emit task:status:update to task room ──
      await SocketReliabilityService.emitToTaskRoom(taskId, 'task:status:update', {
        taskId,
        status: toStatus,
        fromStatus,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      // ── Transition-specific socket events ──
      switch (toStatus) {
        case TaskStatus.ASSIGNED: {
          // Notify client: rider matched
          if (clientId) {
            await SocketReliabilityService.emitToUser(clientId, 'rider:task:matched', {
              taskId,
              taskNumber,
              status: toStatus,
              riderId: effectiveRiderId,
              timestamp: new Date().toISOString(),
            }).catch(() => {});
          }
          // Notify rider: new assignment
          if (riderUserId) {
            await SocketReliabilityService.emitToUser(riderUserId, 'dispatch:assignment', {
              taskId,
              taskNumber,
              status: toStatus,
              timestamp: new Date().toISOString(),
            }).catch(() => {});
          }
          break;
        }

        case TaskStatus.CANCELLED: {
          // Notify client: task cancelled
          if (clientId) {
            await SocketReliabilityService.emitToUser(clientId, 'task:cancelled', {
              taskId,
              taskNumber,
              reason: context.reason,
              timestamp: new Date().toISOString(),
            }).catch(() => {});
          }
          break;
        }

        default:
          // No additional socket events for other statuses in Phase 1
          break;
      }
    } catch (error) {
      console.error('[StateMachine] emitSocketEvents error:', error);
    }
  }
}

export default EnhancedTaskStateMachine;

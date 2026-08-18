/**
 * ⚠️ NOT THE AUTHORITATIVE LIFECYCLE. DO NOT IMPORT FROM PRODUCTION CODE.
 *
 * The one state machine the running system obeys is
 * `src/lib/services/enhanced-task-state-machine.service.ts` — every route that
 * moves a task goes through it. This file is an older, parallel transition
 * table that no production code imports; it survives only because verification
 * scripts and a unit test still assert against it.
 *
 * That is precisely what makes it dangerous. A suite that checks a transition
 * here proves nothing about what the server will actually allow, so the two can
 * drift apart and the tests will keep passing while production refuses the
 * move (BE-042). Those suites need repointing at EnhancedTaskStateMachine;
 * until they are, treat green results from them as evidence about THIS table
 * only.
 *
 * If you are adding or changing a transition, change it in the enhanced state
 * machine. Do not add production imports of this module.
 */
/**
 * Task State Machine Constants and Utilities
 * Exported for use in tests and other modules
 */

import { TaskStatus, TaskType, RiderRole } from '@prisma/client';

/**
 * Valid state transitions for tasks
 * Each state maps to an array of allowed next states
 */
// Must cover every TaskStatus member. A state missing from this map makes
// isValidTransition() return false for it, which strands any task that
// reaches that state. Ride lifecycle:
//   REQUESTED → SEARCHING → ASSIGNED → ARRIVING → ARRIVED → PICKED_UP
//   → IN_PROGRESS → COMPLETED → PAID → CLOSED
// Deliveries use IN_TRANSIT/DELIVERED where rides use IN_PROGRESS.
export const TASK_STATE_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  CREATED: ['REQUESTED', 'SEARCHING', 'MATCHING', 'ASSIGNED', 'CANCELLED'],
  REQUESTED: ['SEARCHING', 'CANCELLED'],
  SEARCHING: ['ASSIGNED', 'MATCHING', 'CANCELLED', 'FAILED'],
  MATCHING: ['ASSIGNED', 'SEARCHING', 'CANCELLED', 'FAILED'],
  ASSIGNED: ['ACCEPTED', 'IN_PROGRESS', 'PICKED_UP', 'MATCHING', 'CANCELLED'],
  ACCEPTED: ['ARRIVING', 'ARRIVED', 'CANCELLED'],
  ARRIVING: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_PROGRESS', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'IN_TRANSIT', 'PICKED_UP', 'CANCELLED'],
  // Deliveries pass through DELIVERING (rider at drop-off) before DELIVERED.
  IN_TRANSIT: ['DELIVERING', 'DELIVERED', 'CANCELLED', 'FAILED'],
  DELIVERING: ['DELIVERED', 'CANCELLED', 'FAILED'],
  DELIVERED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['PAID'],
  PAID: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
  FAILED: [],
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  return TASK_STATE_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Cancellation reason codes
 */
export const CancellationReasonCode = {
  // Client initiated
  CLIENT_CANCELLED: 'CLIENT_CANCELLED',
  CLIENT_NO_SHOW: 'CLIENT_NO_SHOW',
  CLIENT_WRONG_ADDRESS: 'CLIENT_WRONG_ADDRESS',
  CLIENT_REQUESTED: 'CLIENT_REQUESTED',
  
  // Rider initiated
  RIDER_CANCELLED: 'RIDER_CANCELLED',
  RIDER_VEHICLE_BREAKDOWN: 'RIDER_VEHICLE_BREAKDOWN',
  RIDER_EMERGENCY: 'RIDER_EMERGENCY',
  RIDER_UNABLE_TO_REACH: 'RIDER_UNABLE_TO_REACH',
  
  // System initiated
  SYSTEM_TIMEOUT: 'SYSTEM_TIMEOUT',
  NO_RIDER_AVAILABLE: 'NO_RIDER_AVAILABLE',
  MATCHING_TIMEOUT: 'MATCHING_TIMEOUT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CONNECTION_LOST: 'CONNECTION_LOST',
} as const;

export type CancellationReasonCode = typeof CancellationReasonCode[keyof typeof CancellationReasonCode];

/**
 * System timers (in seconds)
 */
export const SYSTEM_TIMERS = {
  MATCHING_TIMEOUT: 300,        // 5 minutes to find a rider
  RIDER_RESPONSE_TIMEOUT: 60,   // 1 minute for rider to accept
  PICKUP_WAIT_TIMEOUT: 600,     // 10 minutes max wait at pickup
  HEARTBEAT_INTERVAL: 30,       // 30 seconds
  CONNECTION_UNSTABLE_THRESHOLD: 30,  // 30 seconds without heartbeat
  CONNECTION_LOST_THRESHOLD: 60,      // 60 seconds without heartbeat
} as const;

/**
 * Rider capability map - defines which task types each rider role can perform
 */
const RIDER_CAPABILITIES: Record<RiderRole, TaskType[]> = {
  SMART_BODA_RIDER: ['SMART_BODA_RIDE', 'ITEM_DELIVERY'],
  SMART_CAR_DRIVER: ['SMART_CAR_RIDE', 'ITEM_DELIVERY'],
  DELIVERY_PERSONNEL: ['FOOD_DELIVERY', 'SHOPPING', 'ITEM_DELIVERY', 'SMART_HEALTH_DELIVERY'],
};

/**
 * Check if rider can perform the task type
 */
export function canRiderPerformTask(riderRole: RiderRole, taskType: TaskType): boolean {
  return RIDER_CAPABILITIES[riderRole]?.includes(taskType) ?? false;
}

/**
 * Get required rider roles for a task type
 */
export function getRequiredRiderRoles(taskType: TaskType): RiderRole[] {
  return Object.entries(RIDER_CAPABILITIES)
    .filter(([_, types]) => types.includes(taskType))
    .map(([role]) => role as RiderRole);
}

/**
 * Get next possible states for a task
 */
export function getNextStates(currentStatus: TaskStatus): TaskStatus[] {
  return TASK_STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status is a terminal state
 */
export function isTerminalState(status: TaskStatus): boolean {
  return ['COMPLETED', 'CANCELLED', 'FAILED'].includes(status);
}

/**
 * Get status category
 */
export function getStatusCategory(status: TaskStatus): 'pending' | 'active' | 'completed' | 'cancelled' | 'failed' {
  switch (status) {
    case 'CREATED':
    case 'MATCHING':
    case 'ASSIGNED':
      return 'pending';
    case 'ACCEPTED':
    case 'ARRIVED':
    case 'PICKED_UP':
    case 'IN_TRANSIT':
    case 'DELIVERED':
      return 'active';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'FAILED':
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * Task State Machine Constants and Utilities
 * Exported for use in tests and other modules
 */

import { TaskStatus, TaskType, RiderRole } from '@prisma/client';

/**
 * Valid state transitions for tasks
 * Each state maps to an array of allowed next states
 */
export const TASK_STATE_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  CREATED: ['MATCHING', 'CANCELLED'],
  MATCHING: ['ASSIGNED', 'CANCELLED', 'FAILED'],
  ASSIGNED: ['ACCEPTED', 'MATCHING', 'CANCELLED'],
  ACCEPTED: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED', 'FAILED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
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

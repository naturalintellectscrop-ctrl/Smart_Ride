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
import { TaskStatus, TaskType, RiderRole } from '@prisma/client';

/**
 * Valid state transitions for tasks
 * Each state maps to an array of allowed next states
 * Aligned with the enhanced state machine and Prisma TaskStatus enum
 */
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
  IN_PROGRESS: ['COMPLETED', 'IN_TRANSIT', 'SEARCHING', 'PICKED_UP', 'CANCELLED'],
  // Deliveries pass through DELIVERING (rider at drop-off) before DELIVERED.
  IN_TRANSIT: ['DELIVERING', 'DELIVERED', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CANCELLED'],
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
  const allowedTransitions = TASK_STATE_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get next possible states for a task
 */
export function getNextStates(currentStatus: TaskStatus): TaskStatus[] {
  return TASK_STATE_TRANSITIONS[currentStatus];
}

/**
 * Cancellation reason codes
 */
export const CancellationReasonCode = {
  // Client initiated
  CLIENT_CANCELLED: 'CLIENT_CANCELLED',
  CLIENT_NO_SHOW: 'CLIENT_NO_SHOW',
  CLIENT_WRONG_ADDRESS: 'CLIENT_WRONG_ADDRESS',
  
  // Rider initiated
  RIDER_CANCELLED: 'RIDER_CANCELLED',
  RIDER_VEHICLE_BREAKDOWN: 'RIDER_VEHICLE_BREAKDOWN',
  RIDER_EMERGENCY: 'RIDER_EMERGENCY',
  
  // Merchant initiated (for orders)
  MERCHANT_CANCELLED: 'MERCHANT_CANCELLED',
  MERCHANT_OUT_OF_STOCK: 'MERCHANT_OUT_OF_STOCK',
  MERCHANT_CLOSED: 'MERCHANT_CLOSED',
  
  // System initiated
  SYSTEM_TIMEOUT: 'SYSTEM_TIMEOUT',
  NO_RIDER_AVAILABLE: 'NO_RIDER_AVAILABLE',
  MATCHING_TIMEOUT: 'MATCHING_TIMEOUT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
} as const;

/**
 * Check if a rider can perform a task based on their role
 */
export function canRiderPerformTask(riderRole: RiderRole, taskType: TaskType): boolean {
  const CAPABILITY_MAP: Record<RiderRole, TaskType[]> = {
    SMART_BODA_RIDER: ['SMART_BODA_RIDE', 'ITEM_DELIVERY'],
    SMART_CAR_DRIVER: ['SMART_CAR_RIDE', 'ITEM_DELIVERY'],
    DELIVERY_PERSONNEL: ['FOOD_DELIVERY', 'SHOPPING', 'ITEM_DELIVERY', 'SMART_HEALTH_DELIVERY'],
  };
  
  return CAPABILITY_MAP[riderRole].includes(taskType);
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
  
  return ROLE_MAP[taskType];
}

/**
 * System timer configurations (in seconds)
 */
export const SYSTEM_TIMERS = {
  // Matching timeout - how long to search for a rider
  MATCHING_TIMEOUT: 300, // 5 minutes
  
  // Rider response timeout - how long rider has to accept
  RIDER_RESPONSE_TIMEOUT: 60, // 1 minute
  
  // Heartbeat interval - how often rider should ping during trip
  HEARTBEAT_INTERVAL: 30, // 30 seconds
  
  // Max waiting time for rider at pickup
  PICKUP_WAIT_TIMEOUT: 600, // 10 minutes
  
  // Order state timers (in seconds)
  ORDER_ACCEPT_TIMEOUT: 180, // 3 minutes for merchant to accept
  ORDER_PREPARATION_DEFAULT: 900, // 15 minutes default prep time
} as const;

/**
 * Check if a timer has expired
 */
export function isTimerExpired(startTime: Date, timeoutSeconds: number): boolean {
  const elapsedMs = Date.now() - startTime.getTime();
  const elapsedSeconds = elapsedMs / 1000;
  return elapsedSeconds > timeoutSeconds;
}

/**
 * Get remaining time in seconds
 */
export function getRemainingTime(startTime: Date, timeoutSeconds: number): number {
  const elapsedMs = Date.now() - startTime.getTime();
  const elapsedSeconds = elapsedMs / 1000;
  const remaining = timeoutSeconds - elapsedSeconds;
  return Math.max(0, Math.round(remaining));
}

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

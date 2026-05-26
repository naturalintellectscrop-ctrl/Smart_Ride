import { TaskStatus, TaskType, RiderRole } from '@prisma/client';

/**
 * Valid state transitions for tasks
 * Each state maps to an array of allowed next states
 */
export const TASK_STATE_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  CREATED: ['MATCHING', 'CANCELLED'],
  MATCHING: ['ASSIGNED', 'CANCELLED', 'FAILED'],
  ASSIGNED: ['RIDER_ACCEPTED', 'MATCHING', 'CANCELLED'], // If rider rejects, goes back to MATCHING
  RIDER_ACCEPTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'FAILED'],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
  FAILED: [], // Terminal state
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

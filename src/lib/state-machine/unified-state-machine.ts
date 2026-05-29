/**
 * Unified State Machine
 *
 * A single, authoritative state machine definition for ALL Smart Ride
 * service types. This replaces the scattered transition definitions
 * across multiple files with a single source of truth.
 *
 * Service Types:
 * 1. SMART_BODA_RIDE:  CREATED → REQUESTED → SEARCHING → MATCHING → ASSIGNED → ACCEPTED → ARRIVING → ARRIVED → IN_PROGRESS → COMPLETED → PAID → CLOSED
 * 2. SMART_CAR_RIDE:   Same as BODA
 * 3. FOOD_DELIVERY:    CREATED → REQUESTED → MATCHING → ASSIGNED → ACCEPTED → ARRIVED → PICKED_UP → IN_TRANSIT → DELIVERING → DELIVERED → COMPLETED → PAID → CLOSED
 * 4. SHOPPING:         Same as FOOD_DELIVERY
 * 5. ITEM_DELIVERY:    Same as FOOD_DELIVERY
 * 6. SMART_HEALTH_DELIVERY: CREATED → REQUESTED → MATCHING → ASSIGNED → ACCEPTED → ARRIVED → PICKED_UP → IN_TRANSIT → DELIVERING → DELIVERED → COMPLETED → PAID → CLOSED
 *
 * Includes:
 * - Cancellation paths from every non-final state
 * - FAILED path from appropriate states
 * - Query functions for validation and allowed transitions
 */

import { TaskType, TaskStatus } from '@prisma/client';

// ============================================
// Types
// ============================================

export type AllowedBy = 'CLIENT' | 'RIDER' | 'SYSTEM' | 'ADMIN';

export interface StateTransitionRule {
  from: string;
  to: string;
  allowedBy: AllowedBy[];
  requiresPayment?: boolean;
  requiresAssignment?: boolean;
  autoActions?: ((taskId: string) => Promise<void>)[];
}

export interface CancellationPath {
  from: string;
  to: string;
  allowedBy: string[];
}

export interface ServiceStateMachine {
  serviceType: TaskType;
  transitions: StateTransitionRule[];
  initialState: string;
  finalStates: string[];
  cancellationPaths: CancellationPath[];
}

// ============================================
// Non-final states (cancellation possible from these)
// ============================================

const ACTIVE_STATES = [
  'CREATED', 'REQUESTED', 'SEARCHING', 'MATCHING', 'ASSIGNED',
  'ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS',
  'IN_TRANSIT', 'DELIVERING', 'DELIVERED',
] as const;

const FINAL_STATES = ['COMPLETED', 'PAID', 'CLOSED', 'CANCELLED', 'FAILED'] as const;

// ============================================
// Ride State Machines (BODA + CAR)
// ============================================

const RIDE_TRANSITIONS: StateTransitionRule[] = [
  { from: 'CREATED', to: 'REQUESTED', allowedBy: ['CLIENT', 'SYSTEM'] },
  { from: 'REQUESTED', to: 'SEARCHING', allowedBy: ['SYSTEM'] },
  { from: 'SEARCHING', to: 'MATCHING', allowedBy: ['SYSTEM'] },
  { from: 'MATCHING', to: 'ASSIGNED', allowedBy: ['SYSTEM'], requiresAssignment: true },
  { from: 'SEARCHING', to: 'ASSIGNED', allowedBy: ['SYSTEM'], requiresAssignment: true },
  { from: 'ASSIGNED', to: 'ACCEPTED', allowedBy: ['RIDER'] },
  { from: 'ACCEPTED', to: 'ARRIVING', allowedBy: ['RIDER'] },
  { from: 'ARRIVING', to: 'ARRIVED', allowedBy: ['RIDER'] },
  { from: 'ARRIVED', to: 'IN_PROGRESS', allowedBy: ['RIDER', 'CLIENT'] },
  { from: 'IN_PROGRESS', to: 'COMPLETED', allowedBy: ['RIDER', 'SYSTEM'] },
  { from: 'COMPLETED', to: 'PAID', allowedBy: ['SYSTEM'], requiresPayment: true },
  { from: 'PAID', to: 'CLOSED', allowedBy: ['SYSTEM'] },
  // Failed path
  { from: 'SEARCHING', to: 'FAILED', allowedBy: ['SYSTEM'] },
  { from: 'MATCHING', to: 'FAILED', allowedBy: ['SYSTEM'] },
];

const RIDE_CANCELLATION_PATHS: CancellationPath[] = ACTIVE_STATES.map(state => ({
  from: state,
  to: 'CANCELLED',
  allowedBy: state === 'IN_PROGRESS'
    ? ['CLIENT', 'RIDER', 'ADMIN', 'SYSTEM']
    : ['CLIENT', 'ADMIN', 'SYSTEM'],
}));

// ============================================
// Delivery State Machines (FOOD, SHOPPING, ITEM, HEALTH)
// ============================================

const DELIVERY_TRANSITIONS: StateTransitionRule[] = [
  { from: 'CREATED', to: 'REQUESTED', allowedBy: ['CLIENT', 'SYSTEM'] },
  { from: 'REQUESTED', to: 'MATCHING', allowedBy: ['SYSTEM'] },
  { from: 'CREATED', to: 'MATCHING', allowedBy: ['SYSTEM'] },
  { from: 'MATCHING', to: 'ASSIGNED', allowedBy: ['SYSTEM'], requiresAssignment: true },
  { from: 'ASSIGNED', to: 'ACCEPTED', allowedBy: ['RIDER'] },
  { from: 'ACCEPTED', to: 'ARRIVED', allowedBy: ['RIDER'] },
  { from: 'ARRIVED', to: 'PICKED_UP', allowedBy: ['RIDER'] },
  { from: 'PICKED_UP', to: 'IN_TRANSIT', allowedBy: ['RIDER'] },
  { from: 'IN_TRANSIT', to: 'DELIVERING', allowedBy: ['RIDER'] },
  { from: 'DELIVERING', to: 'DELIVERED', allowedBy: ['RIDER'] },
  { from: 'DELIVERED', to: 'COMPLETED', allowedBy: ['RIDER', 'SYSTEM'] },
  { from: 'COMPLETED', to: 'PAID', allowedBy: ['SYSTEM'], requiresPayment: true },
  { from: 'PAID', to: 'CLOSED', allowedBy: ['SYSTEM'] },
  // Failed path
  { from: 'MATCHING', to: 'FAILED', allowedBy: ['SYSTEM'] },
  { from: 'REQUESTED', to: 'FAILED', allowedBy: ['SYSTEM'] },
];

const DELIVERY_CANCELLATION_PATHS: CancellationPath[] = ACTIVE_STATES.map(state => ({
  from: state,
  to: 'CANCELLED',
  allowedBy: state === 'IN_TRANSIT' || state === 'DELIVERING'
    ? ['CLIENT', 'RIDER', 'ADMIN', 'SYSTEM']
    : state === 'PICKED_UP'
      ? ['CLIENT', 'ADMIN', 'SYSTEM']
      : ['CLIENT', 'ADMIN', 'SYSTEM'],
}));

// ============================================
// State Machine Registry
// ============================================

const STATE_MACHINES: Record<string, ServiceStateMachine> = {
  [TaskType.SMART_BODA_RIDE]: {
    serviceType: TaskType.SMART_BODA_RIDE,
    transitions: RIDE_TRANSITIONS,
    initialState: 'CREATED',
    finalStates: [...FINAL_STATES],
    cancellationPaths: RIDE_CANCELLATION_PATHS,
  },
  [TaskType.SMART_CAR_RIDE]: {
    serviceType: TaskType.SMART_CAR_RIDE,
    transitions: RIDE_TRANSITIONS,
    initialState: 'CREATED',
    finalStates: [...FINAL_STATES],
    cancellationPaths: RIDE_CANCELLATION_PATHS,
  },
  [TaskType.FOOD_DELIVERY]: {
    serviceType: TaskType.FOOD_DELIVERY,
    transitions: DELIVERY_TRANSITIONS,
    initialState: 'CREATED',
    finalStates: [...FINAL_STATES],
    cancellationPaths: DELIVERY_CANCELLATION_PATHS,
  },
  [TaskType.SHOPPING]: {
    serviceType: TaskType.SHOPPING,
    transitions: DELIVERY_TRANSITIONS,
    initialState: 'CREATED',
    finalStates: [...FINAL_STATES],
    cancellationPaths: DELIVERY_CANCELLATION_PATHS,
  },
  [TaskType.ITEM_DELIVERY]: {
    serviceType: TaskType.ITEM_DELIVERY,
    transitions: DELIVERY_TRANSITIONS,
    initialState: 'CREATED',
    finalStates: [...FINAL_STATES],
    cancellationPaths: DELIVERY_CANCELLATION_PATHS,
  },
  [TaskType.SMART_HEALTH_DELIVERY]: {
    serviceType: TaskType.SMART_HEALTH_DELIVERY,
    transitions: DELIVERY_TRANSITIONS,
    initialState: 'CREATED',
    finalStates: [...FINAL_STATES],
    cancellationPaths: DELIVERY_CANCELLATION_PATHS,
  },
};

// ============================================
// Exported Functions
// ============================================

/**
 * Get the complete state machine definition for a service type.
 */
export function getStateMachine(taskType: TaskType): ServiceStateMachine {
  const machine = STATE_MACHINES[taskType];
  if (!machine) {
    throw new Error(`No state machine defined for task type: ${taskType}`);
  }
  return machine;
}

/**
 * Validate that a transition from fromStatus to toStatus is valid
 * for the given task type.
 */
export function isValidTransition(
  taskType: TaskType,
  fromStatus: string,
  toStatus: string,
): boolean {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return false;

  // Check regular transitions
  const validTransition = machine.transitions.find(
    t => t.from === fromStatus && t.to === toStatus,
  );
  if (validTransition) return true;

  // Check cancellation paths
  const validCancellation = machine.cancellationPaths.find(
    c => c.from === fromStatus && c.to === toStatus,
  );
  if (validCancellation) return true;

  return false;
}

/**
 * Get all valid next statuses from a given current status for a task type.
 */
export function getAllowedTransitions(
  taskType: TaskType,
  currentStatus: string,
): string[] {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return [];

  const nextStatuses: string[] = [];

  // From regular transitions
  for (const t of machine.transitions) {
    if (t.from === currentStatus && !nextStatuses.includes(t.to)) {
      nextStatuses.push(t.to);
    }
  }

  // From cancellation paths
  for (const c of machine.cancellationPaths) {
    if (c.from === currentStatus && !nextStatuses.includes(c.to)) {
      nextStatuses.push(c.to);
    }
  }

  return nextStatuses;
}

/**
 * Check if a status is a final (terminal) state for any task type.
 */
export function isFinalState(_taskType: TaskType, status: string): boolean {
  return FINAL_STATES.includes(status as any);
}

/**
 * Check if a task can be cancelled from its current state.
 */
export function canCancel(taskType: TaskType, currentStatus: string): boolean {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return false;

  // Already in a final state — cannot cancel
  if (FINAL_STATES.includes(currentStatus as any)) return false;

  // Check cancellation paths
  return machine.cancellationPaths.some(c => c.from === currentStatus);
}

/**
 * Get the allowed actors for a specific transition.
 */
export function getTransitionActors(
  taskType: TaskType,
  fromStatus: string,
  toStatus: string,
): AllowedBy[] {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return [];

  // Check regular transitions
  const transition = machine.transitions.find(
    t => t.from === fromStatus && t.to === toStatus,
  );
  if (transition) return transition.allowedBy;

  // Check cancellation paths
  const cancellation = machine.cancellationPaths.find(
    c => c.from === fromStatus && c.to === toStatus,
  );
  if (cancellation) return cancellation.allowedBy as AllowedBy[];

  return [];
}

/**
 * Get the initial state for a task type.
 */
export function getInitialState(taskType: TaskType): string {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return 'CREATED';
  return machine.initialState;
}

/**
 * Get all final states for a task type.
 */
export function getFinalStates(taskType: TaskType): string[] {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return [...FINAL_STATES];
  return machine.finalStates;
}

/**
 * Check if a transition requires payment.
 */
export function transitionRequiresPayment(
  taskType: TaskType,
  fromStatus: string,
  toStatus: string,
): boolean {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return false;

  const transition = machine.transitions.find(
    t => t.from === fromStatus && t.to === toStatus,
  );
  return transition?.requiresPayment ?? false;
}

/**
 * Check if a transition requires a rider assignment.
 */
export function transitionRequiresAssignment(
  taskType: TaskType,
  fromStatus: string,
  toStatus: string,
): boolean {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return false;

  const transition = machine.transitions.find(
    t => t.from === fromStatus && t.to === toStatus,
  );
  return transition?.requiresAssignment ?? false;
}

/**
 * Get the full lifecycle path for a task type.
 * Returns an ordered array of statuses representing the happy path.
 */
export function getLifecyclePath(taskType: TaskType): string[] {
  const machine = STATE_MACHINES[taskType];
  if (!machine) return [];

  const path: string[] = [machine.initialState];
  let current = machine.initialState;

  // Walk the happy path (first transition from each state)
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    const nextTransition = machine.transitions.find(t => t.from === current);
    if (nextTransition && !nextTransition.to.includes('CANCEL') && !nextTransition.to.includes('FAIL')) {
      path.push(nextTransition.to);
      current = nextTransition.to;
    } else {
      break;
    }
  }

  return path;
}

/**
 * Validate that an actor is allowed to perform a specific transition.
 */
export function isActorAllowed(
  taskType: TaskType,
  fromStatus: string,
  toStatus: string,
  actorType: AllowedBy,
): boolean {
  const actors = getTransitionActors(taskType, fromStatus, toStatus);
  return actors.includes(actorType);
}

/**
 * Get all state machines.
 */
export function getAllStateMachines(): Record<string, ServiceStateMachine> {
  return { ...STATE_MACHINES };
}

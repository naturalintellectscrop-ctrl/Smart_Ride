// ============================================
// SMART RIDE — journey copy, legs and primary-action selection
// ============================================
// The in-journey screens answer four questions at every state:
//
//   Where am I?  What is happening?  What do I do?  What happens next?
//
// This module owns the answers. It does NOT own what is possible — the server
// does, via `task.allowedTransitions` from GET /api/tasks/[id]. Everything here
// only ever CHOOSES AMONG statuses the server already approved, or describes
// them. Nothing invents a transition.
//
// Why the per-type preference tables below exist: the same status means
// different things to different services. `IN_PROGRESS` on a SHOPPING task is
// the courier shopping; on a FOOD_DELIVERY task it is the restaurant preparing,
// which is not the courier's step at all even though the server lists it as
// legal from ASSIGNED. Picking blindly would have a food courier tell the
// kitchen it had started cooking.
// ============================================

import type { Task, TaskStatus, TaskType } from '../../types';

export type JourneyRole = 'PROVIDER' | 'CLIENT';

/** Which leg of the journey the map should be drawing. */
export type JourneyLeg = 'TO_PICKUP' | 'TO_DROPOFF' | 'NONE';

export const isRideType = (taskType?: string): boolean =>
  taskType === 'SMART_BODA_RIDE' || taskType === 'SMART_CAR_RIDE';

/** Statuses that end the journey — no forward action, no live map leg. */
const TERMINAL: TaskStatus[] = ['COMPLETED', 'PAID', 'CLOSED', 'CANCELLED', 'FAILED'];

export const isTerminal = (status: TaskStatus): boolean => TERMINAL.includes(status);

/**
 * Statuses that are never a provider's forward action, whatever the server says
 * is legal: dispatch-side states, exception states, and settlement states the
 * platform owns.
 */
const NOT_A_PROVIDER_STEP: TaskStatus[] = [
  'CREATED',
  'REQUESTED',
  'MATCHING',
  'SEARCHING',
  'CANCELLED',
  'FAILED',
  'PAID',
  'CLOSED',
];

/**
 * Preferred order of forward steps, per task type, mirroring how each service
 * actually runs. The first entry that appears in `allowedTransitions` wins.
 *
 * These are display preferences over server-approved options — not a second
 * state machine. A status absent from `allowedTransitions` can never be offered
 * no matter where it sits in these lists.
 */
const FORWARD_PREFERENCE: Record<TaskType, TaskStatus[]> = {
  SMART_BODA_RIDE: ['ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED'],
  SMART_CAR_RIDE: ['ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED'],
  // The only delivery type with the full seven-step graph.
  ITEM_DELIVERY: [
    'ACCEPTED',
    'ARRIVING',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERING',
    'DELIVERED',
    'COMPLETED',
  ],
  // IN_PROGRESS is the RESTAURANT preparing, and SEARCHING is dispatch looking
  // for a courier. Neither is the courier's tap, so neither is listed.
  FOOD_DELIVERY: ['PICKED_UP', 'DELIVERED', 'COMPLETED'],
  // Here IN_PROGRESS *is* the courier's own step: shopping the list.
  SHOPPING: ['IN_PROGRESS', 'PICKED_UP', 'DELIVERED', 'COMPLETED'],
  SMART_HEALTH_DELIVERY: [
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERING',
    'DELIVERED',
    'COMPLETED',
  ],
};

/**
 * Global fallback ordering, used only if the server offers a forward status this
 * task type's preference list does not mention — i.e. if the backend graph gains
 * a step. Better to offer it in a sensible position than to show no action.
 */
const GLOBAL_ORDER: TaskStatus[] = [
  'ACCEPTED',
  'ARRIVING',
  'ARRIVED',
  'PICKED_UP',
  'IN_PROGRESS',
  'IN_TRANSIT',
  'DELIVERING',
  'DELIVERED',
  'COMPLETED',
];

/**
 * The single forward step to offer as the primary action, or null when there is
 * nothing legal to do (terminal state, or a state only the other party or the
 * platform can advance).
 */
export function pickPrimaryTransition(task: Pick<Task, 'taskType' | 'allowedTransitions'>): TaskStatus | null {
  const allowed = task.allowedTransitions ?? [];
  if (allowed.length === 0) return null;

  const forward = allowed.filter((s) => !NOT_A_PROVIDER_STEP.includes(s));
  if (forward.length === 0) return null;

  const preference = FORWARD_PREFERENCE[task.taskType as TaskType] ?? GLOBAL_ORDER;
  for (const candidate of preference) {
    if (forward.includes(candidate)) return candidate;
  }

  // The server offers something this type's list does not know about.
  for (const candidate of GLOBAL_ORDER) {
    if (forward.includes(candidate)) return candidate;
  }
  return forward[0];
}

/**
 * Does reaching `target` require proof of delivery first?
 *
 * The backend gates DELIVERED and COMPLETED on `canCompleteDelivery()` for
 * delivery types (see POST /api/tasks/[id]/transition). By the time a task is at
 * DELIVERED the proof already exists, so the gate that matters to the UI is the
 * hop INTO DELIVERED. Rides are never gated.
 *
 * Derived rather than listed, because the state a courier reaches DELIVERED from
 * differs by type — DELIVERING for ITEM and HEALTH, PICKED_UP for FOOD and
 * SHOPPING. The previous hardcoded `['DELIVERING']` was only ever right for ITEM.
 */
export function requiresProof(taskType: string | undefined, target: TaskStatus | null): boolean {
  if (!target) return false;
  if (isRideType(taskType)) return false;
  return target === 'DELIVERED';
}

/** Whether cancelling is legal right now, per the server's own list. */
export function canCancel(task: Pick<Task, 'allowedTransitions'>): boolean {
  return (task.allowedTransitions ?? []).includes('CANCELLED');
}

// ============================================
// MAP LEG
// ============================================

/**
 * Which leg the map should draw. The route must change when the state does — a
 * map still showing the way to pickup while the passenger is aboard is worse
 * than no map, because it is confidently wrong.
 *
 * SHOPPING is the exception worth spelling out: its IN_PROGRESS means the
 * courier is AT the merchant shopping, so the pickup leg is still the live one.
 * Everywhere else IN_PROGRESS means moving toward the destination.
 */
export function mapLegFor(status: TaskStatus, taskType?: string): JourneyLeg {
  if (isTerminal(status)) return 'NONE';

  switch (status) {
    case 'CREATED':
    case 'REQUESTED':
    case 'MATCHING':
    case 'SEARCHING':
    case 'ASSIGNED':
    case 'ACCEPTED':
    case 'ARRIVING':
    case 'ARRIVED':
      return 'TO_PICKUP';

    case 'IN_PROGRESS':
      return taskType === 'SHOPPING' ? 'TO_PICKUP' : 'TO_DROPOFF';

    case 'PICKED_UP':
    case 'IN_TRANSIT':
    case 'DELIVERING':
      return 'TO_DROPOFF';

    default:
      return 'NONE';
  }
}

// ============================================
// COPY
// ============================================

export interface JourneyStateCopy {
  /** Short label for the status chip. */
  chip: string;
  /** Headline — what is happening now. */
  title: string;
  /** What the user should do, or what happens next. */
  subtitle: string;
  /** Label for the primary action button. */
  actionLabel: string;
}

/** Word for the person on the other end, by service. */
function counterpartyNoun(taskType?: string): string {
  if (isRideType(taskType)) return 'passenger';
  return 'recipient';
}

/** Word for where the goods come from, by service. */
function originNoun(taskType?: string): string {
  switch (taskType) {
    case 'FOOD_DELIVERY':
      return 'restaurant';
    case 'SHOPPING':
      return 'shop';
    case 'SMART_HEALTH_DELIVERY':
      return 'pharmacy';
    default:
      return 'pickup';
  }
}

/**
 * Provider-facing copy. Deliberately separate from `TASK_STATUS_LABELS`, which
 * is written from the customer's seat — a driver reading "Driver on the way"
 * about themselves learns nothing.
 */
export function providerCopy(
  status: TaskStatus,
  taskType: string | undefined,
  target: TaskStatus | null
): JourneyStateCopy {
  const ride = isRideType(taskType);
  const them = counterpartyNoun(taskType);
  const origin = originNoun(taskType);

  switch (status) {
    case 'ASSIGNED':
      return {
        chip: 'Assigned to you',
        title: 'New job assigned',
        subtitle: ride
          ? 'Review the trip, then accept to start navigating.'
          : `Review the delivery, then accept to head to the ${origin}.`,
        // FOOD/SHOPPING/HEALTH have no ACCEPTED step — the first legal move is
        // straight to collection, so the label has to follow the target rather
        // than assume an accept.
        actionLabel:
          target === 'ACCEPTED'
            ? 'Accept job'
            : target === 'IN_PROGRESS'
              ? 'Start shopping'
              : target === 'PICKED_UP'
                ? 'Confirm pickup'
                : 'Start job',
      };

    case 'ACCEPTED':
      return {
        chip: 'Heading to pickup',
        title: `You are going to collect the ${ride ? them : 'parcel'}`,
        subtitle: ride
          ? 'Navigate to the pickup point. Let the passenger know if you are delayed.'
          : `Navigate to the ${origin}.`,
        actionLabel: target === 'ARRIVING' ? "I'm on my way" : 'Continue',
      };

    case 'ARRIVING':
      return {
        chip: 'Approaching pickup',
        title: 'Approaching the pickup point',
        subtitle: ride
          ? 'Smart Ride will mark you arrived automatically when you get there.'
          : `Collect the order when you reach the ${origin}.`,
        actionLabel: target === 'ARRIVED' ? "I've arrived" : 'Confirm pickup',
      };

    case 'ARRIVED':
      return {
        chip: 'At pickup',
        title: 'You have arrived at the pickup',
        subtitle: ride
          ? 'Wait for your passenger, then confirm once they are aboard.'
          : 'Confirm once you have the order in hand.',
        actionLabel: 'Confirm pickup',
      };

    case 'PICKED_UP':
      return {
        chip: ride ? 'Passenger aboard' : 'Collected',
        title: ride
          ? `Take your ${them} to the destination`
          : 'Deliver to the destination',
        subtitle: 'Navigate to the drop-off. Use SOS if anything goes wrong.',
        actionLabel:
          target === 'IN_PROGRESS'
            ? 'Start trip'
            : target === 'IN_TRANSIT'
              ? 'Start delivery'
              : target === 'DELIVERED'
                ? 'Confirm delivery'
                : 'Continue',
      };

    case 'IN_PROGRESS':
      // SHOPPING is genuinely a different activity in this state.
      if (taskType === 'SHOPPING') {
        return {
          chip: 'Shopping',
          title: 'Shopping the order',
          subtitle: 'Confirm once you have everything on the list.',
          actionLabel: 'Confirm pickup',
        };
      }
      return {
        chip: 'On trip',
        title: `Taking your ${them} to the destination`,
        subtitle: 'Complete the trip once you arrive.',
        actionLabel: 'Complete trip',
      };

    case 'IN_TRANSIT':
      return {
        chip: 'In transit',
        title: 'On the way to the recipient',
        subtitle: 'Head to the drop-off address.',
        actionLabel: target === 'DELIVERING' ? "I've arrived at drop-off" : 'Confirm delivery',
      };

    case 'DELIVERING':
      return {
        chip: 'At drop-off',
        title: 'Complete the handover',
        subtitle: 'Capture proof — code, photo or signature — to finish this delivery.',
        actionLabel: 'Confirm delivery',
      };

    case 'DELIVERED':
      return {
        chip: 'Delivered',
        title: 'Delivered',
        subtitle: 'Proof is recorded. Close the job to see your earnings.',
        actionLabel: 'Complete job',
      };

    case 'COMPLETED':
    case 'PAID':
    case 'CLOSED':
      return {
        chip: 'Completed',
        title: ride ? 'Trip completed' : 'Delivery completed',
        subtitle: 'Your earnings for this job are ready.',
        actionLabel: 'View earnings',
      };

    case 'CANCELLED':
      return {
        chip: 'Cancelled',
        title: 'This job was cancelled',
        subtitle: 'Nothing further is needed from you.',
        actionLabel: 'Back to dashboard',
      };

    case 'FAILED':
      return {
        chip: 'Failed',
        title: 'This job could not be completed',
        subtitle: 'Support can tell you whether anything is owed.',
        actionLabel: 'Back to dashboard',
      };

    default:
      return {
        chip: 'Waiting',
        title: 'Waiting for the next step',
        subtitle: 'Smart Ride will update this job automatically.',
        actionLabel: 'Refresh',
      };
  }
}

// ============================================
// PROGRESS
// ============================================

export interface JourneyMilestone {
  id: TaskStatus;
  label: string;
  state: 'completed' | 'active' | 'pending';
  timestamp?: string;
}

/**
 * The milestones actually reached, plus the current one, plus the immediate
 * legal next step.
 *
 * Deliberately a trail rather than a full roadmap. The server publishes the next
 * hop, not the whole graph, and the per-type graphs diverge sharply — a
 * hardcoded roadmap would show a food courier an "On my way" step their service
 * does not have. Reached milestones come from the task's own timestamps, which
 * are written by the state machine, so this cannot claim a step that never ran.
 */
export function journeyMilestones(task: Task): JourneyMilestone[] {
  const ride = isRideType(task.taskType);

  // Ordered candidates with the timestamp column each writes. Shared columns
  // (ARRIVING/ARRIVED, IN_PROGRESS/IN_TRANSIT) are collapsed to one milestone —
  // they are one moment in the journey, and only one applies per task type.
  const candidates: Array<{ id: TaskStatus; label: string; at?: string }> = [
    { id: 'ASSIGNED', label: 'Assigned', at: task.assignedAt },
    { id: 'ACCEPTED', label: 'Accepted', at: task.acceptedAt },
    {
      id: ride ? 'ARRIVED' : 'ARRIVING',
      label: 'At pickup',
      at: task.arrivedAtPickupAt,
    },
    {
      id: 'PICKED_UP',
      label: ride ? 'Passenger aboard' : 'Collected',
      at: task.pickedUpAt,
    },
    {
      id: ride ? 'IN_PROGRESS' : 'IN_TRANSIT',
      label: ride ? 'On trip' : 'In transit',
      at: task.inProgressAt,
    },
    { id: 'DELIVERING', label: 'At drop-off', at: task.deliveringAt },
    {
      id: ride ? 'COMPLETED' : 'DELIVERED',
      label: ride ? 'Completed' : 'Delivered',
      at: task.completedAt,
    },
  ];

  const nextStep = pickPrimaryTransition(task);

  const milestones: JourneyMilestone[] = [];
  for (const c of candidates) {
    const isCurrent = c.id === task.status;
    const reached = !!c.at;
    const isNext = c.id === nextStep;

    // Show a milestone only if it has actually happened, is happening, or is the
    // very next legal step. Anything else is speculation about a graph this task
    // type may not even have.
    if (!reached && !isCurrent && !isNext) continue;

    milestones.push({
      id: c.id,
      label: c.label,
      state: isCurrent ? 'active' : reached ? 'completed' : 'pending',
      timestamp: c.at,
    });
  }

  return milestones;
}

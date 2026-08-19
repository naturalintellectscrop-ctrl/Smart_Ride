// ============================================
// SMART RIDE — journey error translation
// ============================================
// The backend's task errors are written for the backend. Left untranslated they
// reach real users as things like:
//
//   Actor 'RIDER' is not authorized to transition from DELIVERING to DELIVERED
//   Invalid transition from ASSIGNED to ACCEPTED for task type FOOD_DELIVERY
//
// A driver holding a parcel at someone's door cannot act on either sentence.
// This module turns a raw API failure into the four things they actually need:
//
//   1. what happened
//   2. whether the task is still theirs
//   3. what to do next
//   4. whether tapping again is safe
//
// plus whether this is the kind of failure a human has to resolve.
//
// Matching is on substrings of the real server strings — see the route handlers
// in src/app/api/tasks/[id]/* and the state machine's error returns. Anything
// unrecognised falls through to a generic message that never leaks the original.
// ============================================

/** What the UI should let the user do about a failure. */
export type JourneyErrorAction =
  /** Tapping the same button again is safe and may well work. */
  | 'RETRY'
  /** State moved under us — reload and act on what is actually true now. */
  | 'REFRESH'
  /** The task is no longer this provider's. Send them back to the dashboard. */
  | 'LEAVE'
  /** Needs a person: support, or the other party. */
  | 'SUPPORT'
  /** Nothing to do — informational. */
  | 'NONE';

export interface JourneyError {
  /** Headline: what happened, in the user's terms. */
  title: string;
  /** One or two sentences: why, and what to do next. */
  message: string;
  /** Is the task still active and still theirs? */
  taskStillActive: boolean;
  /** Is repeating the same action safe? */
  retrySafe: boolean;
  /** The single recovery route to offer. */
  action: JourneyErrorAction;
  /** Label for that recovery route. */
  actionLabel?: string;
}

/**
 * Ordered rules. First match wins, so the specific patterns must precede the
 * general ones — 'not authorized to transition' before 'not authorized'.
 */
const RULES: Array<{
  match: (raw: string, status?: number) => boolean;
  error: JourneyError;
}> = [
  // ── Proof of delivery ────────────────────────────────────────
  // canCompleteDelivery() refused: a delivery cannot reach DELIVERED without
  // evidence. This is a real requirement, not a fault, so it reads as an
  // instruction rather than an error.
  {
    match: (raw) =>
      raw.includes('PROOF_REQUIRED') ||
      (raw.includes('proof') && raw.includes('deliver')),
    error: {
      title: 'Proof needed first',
      message:
        'Capture proof of delivery — the handover code, a photo, or a signature — and this delivery will complete.',
      taskStillActive: true,
      retrySafe: true,
      action: 'RETRY',
      actionLabel: 'Capture proof',
    },
  },

  // ── Cancellation refused mid-trip ────────────────────────────
  {
    match: (raw) =>
      raw.includes('already in transit and can no longer be cancelled') ||
      (raw.includes('in transit') && raw.includes('cancel')),
    error: {
      title: 'This trip cannot be cancelled',
      message:
        'The passenger is aboard, so the trip has to be finished or escalated. Use SOS if something is wrong, or contact support.',
      taskStillActive: true,
      retrySafe: false,
      action: 'SUPPORT',
      actionLabel: 'Get help',
    },
  },

  // ── Claim lost to another provider ───────────────────────────
  // claimTask()'s conditional UPDATE matched no rows: someone else accepted
  // first. 409 from /tasks/[id]/accept.
  {
    match: (raw, status) =>
      raw.includes('already claimed') ||
      raw.includes('already assigned') ||
      raw.includes('no longer available') ||
      (status === 409 && raw.includes('claim')),
    error: {
      title: 'Another provider took this one',
      message:
        'This job was accepted by someone else first. Nothing is owed by you — the next offer will come through as normal.',
      taskStillActive: false,
      retrySafe: false,
      action: 'LEAVE',
      actionLabel: 'Back to dashboard',
    },
  },

  // ── Actor not permitted for this transition ──────────────────
  // getAllowedActors() refused. From a user's seat this is not about actors: the
  // step they tried is not theirs to take from here.
  {
    match: (raw) => raw.includes('is not authorized to transition'),
    error: {
      title: "That step isn't yours to take here",
      message:
        'This part of the job is handled by the other party or by Smart Ride. Refresh to see what you can do now.',
      taskStillActive: true,
      retrySafe: false,
      action: 'REFRESH',
      actionLabel: 'Refresh',
    },
  },

  // ── Not a party to the task ──────────────────────────────────
  {
    match: (raw) =>
      raw.includes('Not authorized to transition this task') ||
      raw.includes('Access denied to this task') ||
      raw.includes('Only participants in this task'),
    error: {
      title: 'This job is no longer assigned to you',
      message:
        'It may have been reassigned or cancelled. Head back and wait for the next offer.',
      taskStillActive: false,
      retrySafe: false,
      action: 'LEAVE',
      actionLabel: 'Back to dashboard',
    },
  },

  // ── Illegal transition for this task type ────────────────────
  // The client offered a step this task type does not have. With
  // allowedTransitions driving the button this should be unreachable; if it
  // fires, the screen is stale rather than the user wrong.
  {
    match: (raw) => raw.includes('Invalid transition'),
    error: {
      title: 'This job has moved on',
      message:
        'The step you tapped no longer applies. Refreshing will show the current state of the job.',
      taskStillActive: true,
      retrySafe: false,
      action: 'REFRESH',
      actionLabel: 'Refresh',
    },
  },

  // ── Missing required field ───────────────────────────────────
  {
    match: (raw) => raw.includes('Missing required fields'),
    error: {
      title: 'Something is missing',
      message:
        'This step needs information the app could not supply. Refresh and try again; if it keeps happening, contact support.',
      taskStillActive: true,
      retrySafe: true,
      action: 'REFRESH',
      actionLabel: 'Refresh',
    },
  },

  // ── Task gone ────────────────────────────────────────────────
  {
    match: (raw, status) => raw.includes('Task not found') || status === 404,
    error: {
      title: 'This job could not be found',
      message:
        'It may have been cancelled or closed. Head back to your dashboard for the current picture.',
      taskStillActive: false,
      retrySafe: false,
      action: 'LEAVE',
      actionLabel: 'Back to dashboard',
    },
  },

  // ── Provider standing ────────────────────────────────────────
  {
    match: (raw) => raw.includes('not approved'),
    error: {
      title: 'Your account is not approved yet',
      message:
        'You cannot take jobs until onboarding is approved. Support can tell you what is outstanding.',
      taskStillActive: false,
      retrySafe: false,
      action: 'SUPPORT',
      actionLabel: 'Get help',
    },
  },

  // ── Auth ─────────────────────────────────────────────────────
  {
    match: (raw, status) =>
      status === 401 || raw.includes('Unauthorized') || raw.includes('Invalid token'),
    error: {
      title: 'Please sign in again',
      message: 'Your session expired. Signing in again will bring you straight back to this job.',
      taskStillActive: true,
      retrySafe: true,
      action: 'RETRY',
      actionLabel: 'Try again',
    },
  },

  // ── Rate limited ─────────────────────────────────────────────
  {
    match: (raw, status) => status === 429 || raw.includes('Too many requests'),
    error: {
      title: 'Slow down a moment',
      message: 'Too many attempts in a row. Wait a few seconds, then try again.',
      taskStillActive: true,
      retrySafe: true,
      action: 'RETRY',
      actionLabel: 'Try again',
    },
  },

  // ── Connectivity ─────────────────────────────────────────────
  // The api client returns these two exact strings from its own catch blocks.
  {
    match: (raw) =>
      raw.includes('Request timed out') ||
      raw.includes('Network error') ||
      raw.includes('check your connection'),
    error: {
      title: 'No connection',
      message:
        'Your tap did not reach Smart Ride, so nothing has changed. Try again once you have signal.',
      taskStillActive: true,
      retrySafe: true,
      action: 'RETRY',
      actionLabel: 'Try again',
    },
  },
];

/** The message shown when nothing matched. Never echoes the raw error. */
const FALLBACK: JourneyError = {
  title: 'That did not go through',
  message:
    'Smart Ride could not complete that step. Nothing has changed, so it is safe to try again.',
  taskStillActive: true,
  retrySafe: true,
  action: 'RETRY',
  actionLabel: 'Try again',
};

/**
 * Translate an API failure into user-facing guidance.
 *
 * @param raw    The `error` string from the API envelope, if any.
 * @param status The HTTP status, if the caller has it.
 */
export function translateTaskError(
  raw?: string | null,
  status?: number
): JourneyError {
  const text = (raw ?? '').trim();
  if (!text && !status) return FALLBACK;

  for (const rule of RULES) {
    if (rule.match(text, status)) return rule.error;
  }
  return FALLBACK;
}

/**
 * Payment failures are their own family: the money either moved or it did not,
 * and "safe to retry" is the question that matters most.
 */
export function translatePaymentError(
  raw?: string | null,
  status?: number
): JourneyError {
  const text = (raw ?? '').trim();

  // An unconfigured gateway is an operator problem, not a user one. Saying
  // "try another method" is the only honest advice, and it is actionable.
  if (/not configured/i.test(text)) {
    return {
      title: 'This payment method is unavailable',
      message:
        'Smart Ride cannot reach that provider right now. Choose another method, or pay the driver in cash.',
      taskStillActive: true,
      retrySafe: false,
      action: 'NONE',
    };
  }

  if (/insufficient/i.test(text)) {
    return {
      title: 'Not enough balance',
      message: 'Top up your wallet or choose another payment method to settle this trip.',
      taskStillActive: true,
      retrySafe: false,
      action: 'NONE',
    };
  }

  if (/invalid.*(phone|number)/i.test(text)) {
    return {
      title: 'Check that phone number',
      message: 'That number does not look right for this provider. Correct it and try again.',
      taskStillActive: true,
      retrySafe: true,
      action: 'RETRY',
      actionLabel: 'Try again',
    };
  }

  // Connectivity and auth read the same for payments as for anything else.
  const shared = translateTaskError(text, status);
  if (shared !== FALLBACK) return shared;

  return {
    title: 'Payment did not go through',
    message:
      'Your trip is still unpaid and you have not been charged. You can try again, or settle in cash.',
    taskStillActive: true,
    retrySafe: true,
    action: 'RETRY',
    actionLabel: 'Try again',
  };
}

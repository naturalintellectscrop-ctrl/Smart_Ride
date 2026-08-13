// ============================================
// SMART RIDE — status colours
// ============================================
// One mapping from a domain status to a semantic colour.
//
// The same table was copy-pasted as hardcoded hex into at least five screens —
// health/prescriptions, pharmacist/orders, pharmacist/orders/[id],
// pharmacist/prescriptions and merchant/index — so the amber for PENDING drifted
// between #F59E0B and #F97316 depending on which screen you were looking at,
// and none of them followed dark mode.
//
// Statuses resolve to semantic tokens (warning / success / error / info /
// onSurfaceVariant), never to a literal, so a palette change reaches every
// status pill at once.
// ============================================

import { ThemedColors } from './themedColors';

type Semantic = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'muted';

/**
 * Which semantic role a status plays. Grouped by meaning rather than by the
 * screen it appears on: anything awaiting a human is `warning`, anything
 * finished well is `success`, anything failed or refused is `error`, anything
 * actively moving is `info`, and anything inert is `muted`.
 */
const STATUS_ROLE: Record<string, Semantic> = {
  // Awaiting action
  PENDING: 'warning',
  ORDER_CREATED: 'warning',
  AWAITING_VERIFICATION: 'warning',
  PENDING_PAYMENT: 'warning',
  SUBMITTED: 'warning',

  // In motion
  MERCHANT_ACCEPTED: 'info',
  ACCEPTED: 'info',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY_FOR_PICKUP: 'info',
  READY: 'info',
  OUT_FOR_DELIVERY: 'info',
  IN_TRANSIT: 'info',
  // Handover in progress — same family as the other in-flight states.
  DELIVERING: 'info',
  IN_PROGRESS: 'info',
  PICKED_UP: 'info',
  DISPATCHED: 'info',

  // Settled well
  VERIFIED: 'success',
  COMPLETED: 'success',
  DELIVERED: 'success',
  APPROVED: 'success',
  PAID: 'success',

  // Settled badly
  REJECTED: 'error',
  CANCELLED: 'error',
  FAILED: 'error',
  DECLINED: 'error',
  REFUNDED: 'error',

  // Inert
  EXPIRED: 'muted',
  ARCHIVED: 'muted',
  DRAFT: 'muted',
  UNKNOWN: 'muted',
};

/** Resolve a domain status to a themed colour. Unknown statuses read as inert. */
export function statusColor(status: string | null | undefined, COLORS: ThemedColors): string {
  const role = STATUS_ROLE[(status ?? '').toUpperCase()] ?? 'muted';
  switch (role) {
    case 'success': return COLORS.success;
    case 'warning': return COLORS.warning;
    case 'error': return COLORS.error;
    case 'info': return COLORS.info;
    case 'primary': return COLORS.primary;
    default: return COLORS.onSurfaceVariant;
  }
}

/** Human-readable label for a raw status enum — TITLE_CASE without underscores. */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

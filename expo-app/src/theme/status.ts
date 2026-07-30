// ============================================
// SMART RIDE — SHARED STATUS SYSTEM (theme-aware)
// ============================================
// One source of truth for status → semantic colour + human label, so every
// screen and primitive (StatusBadge, timelines, cards, live-status lines)
// agrees and stays theme-aware. Resolves to semantic COLORS tokens — never
// raw hex — per the Design System spec (§9 feedback, §1.1 colour, Golden
// Screens Part E #15).
//
// Usage:
//   const { color, label, tone } = resolveStatus(COLORS, task.status);
//   <StatusBadge label={label} color={color} />
// ============================================

import { ThemedColors } from './themedColors';

export type StatusTone = 'neutral' | 'pending' | 'active' | 'success' | 'error';

// Map any known status enum (task / order / transaction / rider) to a tone.
// Unknown values fall back to 'neutral' so nothing ever renders a raw enum
// with an undefined colour.
const TONE_BY_STATUS: Record<string, StatusTone> = {
  // Neutral / searching
  CREATED: 'neutral', MATCHING: 'neutral', SEARCHING: 'neutral', PENDING: 'pending', NEW: 'pending',
  // Pending / attention
  ASSIGNED: 'pending', ARRIVING: 'active', PROCESSING: 'pending', OFFLINE: 'neutral',
  // Active / in-progress
  ACCEPTED: 'active', CONFIRMED: 'active', PREPARING: 'active', READY: 'active',
  ARRIVED: 'active', PICKED_UP: 'active', IN_PROGRESS: 'active', IN_TRANSIT: 'active',
  ONLINE: 'success', AVAILABLE: 'success', APPROVED: 'success',
  // Success / terminal-positive
  DELIVERED: 'success', COMPLETED: 'success', PAID: 'success', CLOSED: 'success',
  // Error / terminal-negative
  CANCELLED: 'error', FAILED: 'error', REJECTED: 'error', SUSPENDED: 'error', FALSE_ALARM: 'neutral',
};

// Human-readable labels. Screens may override with context-specific copy, but
// this is the shared default so no raw enum leaks into the UI.
const LABEL_BY_STATUS: Record<string, string> = {
  CREATED: 'Searching', MATCHING: 'Finding riders', SEARCHING: 'Searching',
  PENDING: 'Pending', NEW: 'New', PROCESSING: 'Processing',
  ASSIGNED: 'Assigned', ACCEPTED: 'Accepted', CONFIRMED: 'Confirmed',
  ARRIVING: 'On the way', ARRIVED: 'Arrived', PREPARING: 'Preparing', READY: 'Ready',
  PICKED_UP: 'Picked up', IN_PROGRESS: 'In progress', IN_TRANSIT: 'On the way',
  DELIVERED: 'Delivered', COMPLETED: 'Completed', PAID: 'Paid', CLOSED: 'Closed',
  CANCELLED: 'Cancelled', FAILED: 'Failed', REJECTED: 'Rejected', SUSPENDED: 'Suspended',
  ONLINE: 'Online', OFFLINE: 'Offline', AVAILABLE: 'Available', APPROVED: 'Approved',
  FALSE_ALARM: 'False alarm',
};

export function statusTone(status?: string | null): StatusTone {
  if (!status) return 'neutral';
  return TONE_BY_STATUS[status] ?? 'neutral';
}

export function toneColor(COLORS: ThemedColors, tone: StatusTone): string {
  switch (tone) {
    case 'success': return COLORS.success;
    case 'active': return COLORS.primary;
    case 'pending': return COLORS.warning;
    case 'error': return COLORS.error;
    default: return COLORS.onSurfaceVariant;
  }
}

export function statusColor(COLORS: ThemedColors, status?: string | null): string {
  return toneColor(COLORS, statusTone(status));
}

export function statusLabel(status?: string | null): string {
  if (!status) return '';
  return LABEL_BY_STATUS[status] ?? status.replace(/_/g, ' ');
}

/** One-call resolver for badges/lines: { tone, color, label }. */
export function resolveStatus(COLORS: ThemedColors, status?: string | null) {
  const tone = statusTone(status);
  return { tone, color: toneColor(COLORS, tone), label: statusLabel(status) };
}

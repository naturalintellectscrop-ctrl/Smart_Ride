// ============================================
// SMART RIDE MOBILE — MERCHANT ORDER VOCABULARY
// ============================================
// The merchant's half of the same vocabulary the pharmacy has, so a restaurant
// and a pharmacy describe the same situation the same way. Different underlying
// model (Order vs ProviderOrder) and a different lifecycle, one language.
//
// The server's OrderStatus is the authority (prisma/schema.prisma):
//   ORDER_CREATED → PAYMENT_CONFIRMED → MERCHANT_ACCEPTED → PREPARING
//                 → READY_FOR_PICKUP → PICKED_UP → DELIVERED
//   with CANCELLED / REJECTED as the other endings.
// ============================================

import type { Tone } from './storefrontKit';

export interface MerchantStatusMeta {
  label: string;
  tone: Tone;
  hint: string;
  step: number;
}

export const MERCHANT_ORDER_STATUS: Record<string, MerchantStatusMeta> = {
  ORDER_CREATED: {
    label: 'Awaiting payment',
    tone: 'slate',
    hint: 'The customer has not paid yet. Nothing to do until they do.',
    step: 1,
  },
  PAYMENT_CONFIRMED: {
    label: 'New order',
    tone: 'amber',
    hint: 'Paid and waiting for you to accept or decline it.',
    step: 2,
  },
  MERCHANT_ACCEPTED: {
    label: 'Accepted',
    tone: 'blue',
    hint: 'You have taken this order. Start preparing when you are ready.',
    step: 3,
  },
  PREPARING: {
    label: 'Preparing',
    tone: 'blue',
    hint: 'Being made. Mark it ready once it is packed.',
    step: 4,
  },
  READY_FOR_PICKUP: {
    label: 'Ready',
    tone: 'violet',
    hint: 'Packed and waiting. We are finding a courier to collect it.',
    step: 5,
  },
  PICKED_UP: {
    label: 'With the courier',
    tone: 'blue',
    hint: 'Collected and on the way to the customer.',
    step: 6,
  },
  DELIVERED: {
    label: 'Delivered',
    tone: 'green',
    hint: 'The customer has received this order.',
    step: 7,
  },
  CANCELLED: { label: 'Cancelled', tone: 'slate', hint: 'This order was cancelled.', step: 0 },
  REJECTED: { label: 'Declined', tone: 'slate', hint: 'You declined this order.', step: 0 },
};

export function merchantStatusMeta(status?: string | null): MerchantStatusMeta {
  return (
    MERCHANT_ORDER_STATUS[status || ''] ?? {
      label: (status || 'Unknown').replace(/_/g, ' '),
      tone: 'slate' as Tone,
      hint: '',
      step: 0,
    }
  );
}

/** The milestones on a merchant order's progress rail. */
export const MERCHANT_ORDER_RAIL = [
  { step: 2, label: 'Received' },
  { step: 3, label: 'Accepted' },
  { step: 4, label: 'Preparing' },
  { step: 5, label: 'Ready' },
  { step: 6, label: 'On the way' },
  { step: 7, label: 'Delivered' },
];

export interface MerchantOrderActions {
  primary?: { action: 'accept' | 'preparing' | 'ready'; label: string; icon: string };
  canDecline: boolean;
  canCancel: boolean;
}

/**
 * The one action the server will accept from a given state — mirroring the
 * PATCH /orders/{id}?action= contract. A button the server would refuse is a
 * button that should not be drawn.
 */
export function merchantActionsFor(status?: string | null): MerchantOrderActions {
  switch (status) {
    case 'PAYMENT_CONFIRMED':
      return {
        primary: { action: 'accept', label: 'Accept order', icon: 'checkmark-circle' },
        canDecline: true,
        canCancel: false,
      };
    case 'MERCHANT_ACCEPTED':
      return {
        primary: { action: 'preparing', label: 'Start preparing', icon: 'restaurant' },
        canDecline: false,
        canCancel: true,
      };
    case 'PREPARING':
      return {
        primary: { action: 'ready', label: 'Mark ready for pickup', icon: 'cube' },
        canDecline: false,
        canCancel: true,
      };
    case 'READY_FOR_PICKUP':
      return { canDecline: false, canCancel: true };
    default:
      // ORDER_CREATED (not paid), PICKED_UP onwards (the courier owns it), and
      // the endings.
      return { canDecline: false, canCancel: false };
  }
}

/** Statuses each merchant list tab shows. Server enum values only. */
export const MERCHANT_TAB_STATUSES: Record<string, string[] | undefined> = {
  ALL: undefined,
  NEW: ['ORDER_CREATED', 'PAYMENT_CONFIRMED'],
  ACTIVE: ['MERCHANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'],
  DELIVERED: ['DELIVERED'],
  CLOSED: ['CANCELLED', 'REJECTED'],
};

export const MERCHANT_TAB_LABELS: Record<string, string> = {
  ALL: 'All',
  NEW: 'New',
  ACTIVE: 'Active',
  DELIVERED: 'Delivered',
  CLOSED: 'Closed',
};

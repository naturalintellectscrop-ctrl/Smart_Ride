// ============================================
// SMART RIDE MOBILE — PHARMACY ORDER VOCABULARY
// ============================================
// One place that knows what a ProviderOrder status means, what a pharmacist may
// do from it, and how the customer's payment reads. Three screens previously
// each carried their own copy and all three had drifted onto statuses the
// server does not use (PENDING, PROCESSING, ORDER_CREATED, COMPLETED) — which
// is what made the orders list, the tab filters and the action buttons all show
// the wrong thing at once. Anything that needs this vocabulary imports it.
//
// The server's lifecycle is the authority (src/app/api/health-provider/orders):
//   ORDER_RECEIVED → ACCEPTED → PREPARING → READY_FOR_PICKUP
//                  → RIDER_ASSIGNED → OUT_FOR_DELIVERY → DELIVERED
//   with CANCELLED / REJECTED as the other endings.
// ============================================

import type { Tone } from './pharmacyKit';

export type ProviderOrderStatus =
  | 'ORDER_RECEIVED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'RIDER_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export interface StatusMeta {
  label: string;
  tone: Tone;
  /** What is happening, in the pharmacist's terms. */
  hint: string;
  /** Position in the six-step progress rail; 0 for the endings that leave it. */
  step: number;
}

export const ORDER_STATUS: Record<ProviderOrderStatus, StatusMeta> = {
  ORDER_RECEIVED: {
    label: 'New order',
    tone: 'amber',
    hint: 'Waiting for you to accept or decline it.',
    step: 1,
  },
  ACCEPTED: {
    label: 'Accepted',
    tone: 'blue',
    hint: 'You have taken this order. Start preparing when you are ready.',
    step: 2,
  },
  PREPARING: {
    label: 'Preparing',
    tone: 'blue',
    hint: 'Being dispensed. Mark it ready once it is packed.',
    step: 3,
  },
  READY_FOR_PICKUP: {
    label: 'Ready',
    tone: 'violet',
    hint: 'Packed and waiting. We are finding a courier to collect it.',
    step: 4,
  },
  RIDER_ASSIGNED: {
    label: 'Courier on the way',
    tone: 'violet',
    hint: 'A courier is coming to collect this order.',
    step: 5,
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for delivery',
    tone: 'blue',
    hint: 'The courier has collected it and is on the way to the customer.',
    step: 6,
  },
  DELIVERED: {
    label: 'Delivered',
    tone: 'green',
    hint: 'The customer has received this order.',
    step: 7,
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'slate',
    hint: 'This order was cancelled.',
    step: 0,
  },
  REJECTED: {
    label: 'Declined',
    tone: 'slate',
    hint: 'You declined this order.',
    step: 0,
  },
};

export function statusMeta(status?: string | null): StatusMeta {
  return (
    ORDER_STATUS[(status || '') as ProviderOrderStatus] ?? {
      label: (status || 'Unknown').replace(/_/g, ' '),
      tone: 'slate' as Tone,
      hint: '',
      step: 0,
    }
  );
}

/** The six milestones shown on the order's progress rail. */
export const ORDER_RAIL = [
  { step: 1, label: 'Received' },
  { step: 2, label: 'Accepted' },
  { step: 3, label: 'Preparing' },
  { step: 4, label: 'Ready' },
  { step: 6, label: 'On the way' },
  { step: 7, label: 'Delivered' },
];

/**
 * The one action a pharmacist may take from a given state, plus whether the
 * order can still be cancelled. Mirrors the server's LEGAL_FROM table — a
 * button the server would answer 409 to is a button that should not be drawn.
 */
export interface OrderActions {
  primary?: { action: 'ACCEPT' | 'START_PREPARING' | 'READY'; label: string; icon: string };
  canDecline: boolean;
  canCancel: boolean;
}

export function actionsFor(status?: string | null): OrderActions {
  switch (status) {
    case 'ORDER_RECEIVED':
      return {
        primary: { action: 'ACCEPT', label: 'Accept order', icon: 'checkmark-circle' },
        canDecline: true,
        canCancel: false,
      };
    case 'ACCEPTED':
      return {
        primary: { action: 'START_PREPARING', label: 'Start preparing', icon: 'flask' },
        canDecline: false,
        canCancel: true,
      };
    case 'PREPARING':
      return {
        primary: { action: 'READY', label: 'Mark ready for pickup', icon: 'cube' },
        canDecline: false,
        canCancel: true,
      };
    case 'READY_FOR_PICKUP':
    case 'RIDER_ASSIGNED':
      return { canDecline: false, canCancel: true };
    default:
      // OUT_FOR_DELIVERY and the endings: the courier owns it, or it is over.
      return { canDecline: false, canCancel: false };
  }
}

// ── Payment ──────────────────────────────────────────────────────────────
// A pharmacist has to know whether the money is already collected or whether
// the courier will take it at the door — and the two are not derivable from the
// order's status.

export interface PaymentMeta {
  method: string;
  /** True when the courier collects it from the customer at handover. */
  collectedOnDelivery: boolean;
  statusLabel: string;
  tone: Tone;
  note: string;
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash on delivery',
  MTN_MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
  VISA: 'Visa card',
  MASTERCARD: 'Mastercard',
  CREDIT_CARD: 'Card',
  DEBIT_CARD: 'Card',
  WALLET: 'Smart Ride wallet',
};

export function paymentMeta(
  paymentMethod?: string | null,
  paymentStatus?: string | null
): PaymentMeta {
  const raw = (paymentMethod || '').toUpperCase();
  const method = METHOD_LABEL[raw] ?? (raw ? raw.replace(/_/g, ' ') : 'Not recorded');
  const isCash = raw === 'CASH';
  const status = (paymentStatus || 'PENDING').toUpperCase();

  if (status === 'COMPLETED' || status === 'PAID') {
    return {
      method,
      collectedOnDelivery: isCash,
      statusLabel: 'Paid',
      tone: 'green',
      note: isCash
        ? 'The courier collected the cash at delivery.'
        : 'Paid before delivery. Your share is added to your payout balance.',
    };
  }
  if (status === 'FAILED') {
    return {
      method,
      collectedOnDelivery: isCash,
      statusLabel: 'Payment failed',
      tone: 'amber',
      note: 'The customer has not paid. Do not hand this order over.',
    };
  }
  if (status === 'REFUNDED') {
    return { method, collectedOnDelivery: isCash, statusLabel: 'Refunded', tone: 'slate', note: 'This order was refunded.' };
  }
  return {
    method,
    collectedOnDelivery: isCash,
    statusLabel: isCash ? 'Due on delivery' : 'Awaiting payment',
    tone: 'amber',
    note: isCash
      ? 'The courier collects the full amount from the customer at the door.'
      : 'Waiting for the customer to pay.',
  };
}

/** Statuses each list tab shows. Server enum values only. */
export const TAB_STATUSES: Record<string, ProviderOrderStatus[] | undefined> = {
  ALL: undefined,
  NEW: ['ORDER_RECEIVED'],
  ACTIVE: ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'OUT_FOR_DELIVERY'],
  DELIVERED: ['DELIVERED'],
  CLOSED: ['CANCELLED', 'REJECTED'],
};

export const TAB_LABELS: Record<string, string> = {
  ALL: 'All',
  NEW: 'New',
  ACTIVE: 'Active',
  DELIVERED: 'Delivered',
  CLOSED: 'Closed',
};

/** Parse the JSON string ProviderOrder.items carries, tolerating bad data. */
export function parseItems(items: unknown): Array<{ name: string; quantity?: number; price?: number }> {
  if (Array.isArray(items)) return items as never;
  if (typeof items !== 'string') return [];
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

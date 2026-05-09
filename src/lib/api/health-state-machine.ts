import { HealthOrderStatus, TaskType, RiderRole } from '@prisma/client';

/**
 * Valid state transitions for health orders
 * Each state maps to an array of allowed next states
 */
export const HEALTH_ORDER_STATE_TRANSITIONS: Record<HealthOrderStatus, HealthOrderStatus[]> = {
  ORDER_PLACED: ['PHARMACY_REVIEW', 'PREPARING_ORDER', 'CANCELLED'],
  PHARMACY_REVIEW: ['PRESCRIPTION_VERIFIED', 'REJECTED', 'CANCELLED'],
  PRESCRIPTION_VERIFIED: ['PREPARING_ORDER', 'CANCELLED'],
  PREPARING_ORDER: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['RIDER_ASSIGNED', 'CANCELLED'],
  RIDER_ASSIGNED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
  REJECTED: [], // Terminal state
};

/**
 * Check if a health order state transition is valid
 */
export function isValidHealthOrderTransition(
  currentStatus: HealthOrderStatus, 
  newStatus: HealthOrderStatus
): boolean {
  const allowedTransitions = HEALTH_ORDER_STATE_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get next possible states for a health order
 */
export function getNextHealthOrderStates(currentStatus: HealthOrderStatus): HealthOrderStatus[] {
  return HEALTH_ORDER_STATE_TRANSITIONS[currentStatus];
}

/**
 * Check if a rider can perform health order delivery
 * Only DELIVERY_PERSONNEL can deliver Smart Health orders
 */
export function canRiderDeliverHealthOrder(riderRole: RiderRole): boolean {
  return riderRole === 'DELIVERY_PERSONNEL';
}

/**
 * Get required rider role for health order delivery
 */
export function getRequiredRiderRoleForHealthDelivery(): RiderRole {
  return 'DELIVERY_PERSONNEL';
}

/**
 * Generate a health order number
 */
export function generateHealthOrderNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `HLTH-${year}-${timestamp}`;
}

/**
 * Generate a POT (Pharmacy Order Ticket) number
 */
export function generatePOTNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = Date.now().toString(36).toUpperCase();
  return `POT-${dateStr}-${timestamp}`;
}

/**
 * Generate a prescription number
 */
export function generatePrescriptionNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `RX-${year}-${timestamp}`;
}

/**
 * Health order state descriptions
 */
export const HEALTH_ORDER_STATUS_DESCRIPTIONS: Record<HealthOrderStatus, string> = {
  ORDER_PLACED: 'Order placed, awaiting pharmacy review',
  PHARMACY_REVIEW: 'Pharmacy is reviewing prescription',
  PRESCRIPTION_VERIFIED: 'Prescription verified by pharmacy',
  PREPARING_ORDER: 'Pharmacy is preparing your order',
  READY_FOR_PICKUP: 'Order ready for pickup',
  RIDER_ASSIGNED: 'Rider assigned to your delivery',
  OUT_FOR_DELIVERY: 'Order is out for delivery',
  DELIVERED: 'Order delivered successfully',
  CANCELLED: 'Order cancelled',
  REJECTED: 'Order rejected by pharmacy',
};

/**
 * Get status color for UI
 */
export function getHealthOrderStatusColor(status: HealthOrderStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'ORDER_PLACED':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
    case 'PHARMACY_REVIEW':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
    case 'PRESCRIPTION_VERIFIED':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
    case 'PREPARING_ORDER':
      return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
    case 'READY_FOR_PICKUP':
      return { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' };
    case 'RIDER_ASSIGNED':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'OUT_FOR_DELIVERY':
      return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
    case 'DELIVERED':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
    case 'CANCELLED':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    case 'REJECTED':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

/**
 * System timers for health orders (in seconds)
 */
export const HEALTH_ORDER_TIMERS = {
  // Time for pharmacy to accept/reject order
  ORDER_REVIEW_TIMEOUT: 300, // 5 minutes
  
  // Time for prescription verification
  PRESCRIPTION_REVIEW_TIMEOUT: 600, // 10 minutes
  
  // Default preparation time
  PREPARATION_DEFAULT: 900, // 15 minutes
  
  // Time for rider to pickup after ready
  PICKUP_TIMEOUT: 600, // 10 minutes
} as const;

// ============================================
// SMART RIDE — ORDER PRICING (server-authoritative)
// ============================================
// One place that decides what a food/shopping order costs.
//
// Before this, the mobile cart declared `deliveryFee = 3000` and
// `serviceFee = 500` as literals and posted them to POST /api/orders, which
// accepted whatever arrived (`z.number().min(0)`) and wrote it to the database.
// A modified client could therefore set its own delivery fee to zero.
//
// The quote endpoint and the create route both call `quoteOrder` here, so the
// price the customer is shown and the price that is charged come from the same
// function rather than from the request body.
// ============================================

import { TaskType } from '@prisma/client';
import { calculatePricingAsync } from './pricing';
import { calculateDistance } from '@/lib/mapbox/mapbox-service';

export type OrderPricingType = 'FOOD_DELIVERY' | 'SHOPPING';

export interface OrderQuoteInput {
  orderType: OrderPricingType;
  /** Line items as submitted. Quantity and unit price are used for subtotal. */
  items: Array<{ quantity: number; unitPrice: number }>;
  /** Merchant location — the pickup point for the courier leg. */
  merchant?: { latitude?: number | null; longitude?: number | null } | null;
  /** Where the order is going. */
  delivery?: { latitude?: number | null; longitude?: number | null } | null;
  /** Optional client-supplied distance, used only when coordinates are absent. */
  distanceKm?: number;
  discount?: number;
}

export interface OrderQuote {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  totalAmount: number;
  distanceKm: number;
  currency: 'UGX';
}

/**
 * Distance used when we cannot compute one. Kept deliberately non-zero: a
 * missing coordinate must not make delivery free.
 */
const FALLBACK_DISTANCE_KM = 3;

export async function quoteOrder(input: OrderQuoteInput): Promise<OrderQuote> {
  // --- subtotal: derived from the items, never taken as a given -------------
  const subtotal = input.items.reduce(
    (sum, i) => sum + Math.max(0, Math.round(i.quantity * i.unitPrice)),
    0,
  );

  // --- distance: prefer real coordinates over anything the client asserts ---
  let distanceKm: number;
  const m = input.merchant;
  const d = input.delivery;
  if (m?.latitude != null && m?.longitude != null && d?.latitude != null && d?.longitude != null) {
    distanceKm = calculateDistance(
      { latitude: m.latitude, longitude: m.longitude },
      { latitude: d.latitude, longitude: d.longitude },
    );
  } else if (typeof input.distanceKm === 'number' && input.distanceKm > 0) {
    distanceKm = input.distanceKm;
  } else {
    distanceKm = FALLBACK_DISTANCE_KM;
  }
  distanceKm = Math.round(distanceKm * 100) / 100;

  // --- fees: the shared pricing engine, same one rides use ------------------
  const breakdown = await calculatePricingAsync({
    taskType: input.orderType as TaskType,
    distanceKm,
    isNightTime: isNightTime(),
    isPeakHours: isPeakHours(),
  });

  // For an order, the courier leg is what the customer sees as "delivery" —
  // base + distance plus any night/peak surcharge. The engine's own
  // `deliveryFee` field is a per-kilogram surcharge that only applies to parcel
  // tasks, so it is not the right number here.
  const deliveryFee = Math.round(
    breakdown.baseFare + breakdown.distanceFare + breakdown.nightSurcharge + breakdown.peakSurcharge,
  );
  const serviceFee = Math.round(breakdown.serviceFee);
  const discount = Math.max(0, Math.round(input.discount ?? 0));

  const totalAmount = Math.max(0, subtotal + deliveryFee + serviceFee - discount);

  return { subtotal, deliveryFee, serviceFee, discount, totalAmount, distanceKm, currency: 'UGX' };
}

/** Night window matches the ride pricing engine's definition. */
function isNightTime(): boolean {
  const h = new Date().getHours();
  return h >= 22 || h < 5;
}

/** Morning and evening commute peaks. */
function isPeakHours(): boolean {
  const h = new Date().getHours();
  return (h >= 7 && h < 9) || (h >= 17 && h < 20);
}

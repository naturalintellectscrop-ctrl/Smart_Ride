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
import { db } from '@/lib/db';
import { toNumber } from '@/lib/decimal-utils';

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
  /**
   * What the courier leg costs the platform, and therefore what the courier's
   * task is worth. Always equals `deliveryFee + serviceFee` — see the note in
   * `quoteOrder`. Exposed so the route that creates the delivery task prices it
   * from the money the customer was charged rather than recalculating.
   */
  courierFare: number;
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

  // --- the courier leg: charge what the leg costs ---------------------------
  //
  // PRICING-1. This used to reassemble a delivery fee from a SUBSET of the
  // engine's components — base + distance + surcharges — and hand the rest of
  // the engine's answer back. Two things live in the part that was dropped:
  // `minimumFare`, and the rounding to a payable figure. Both apply to
  // `totalAmount` and only to `totalAmount`.
  //
  // The courier's task is priced by the same engine and DOES take
  // `totalAmount`, floor included. So on every short delivery the platform
  // charged the customer the unfloored component sum and owed the courier the
  // floored one, and paid the difference itself. Measured on the live engine
  // at the moment this was written: 1 km cost the platform 1,800 UGX, 3 km
  // 1,400, 5.5 km 900. Most food deliveries in Kampala are inside that range,
  // so the platform lost money on most of its orders.
  //
  // The engine's authoritative answer for "what does this leg cost" is
  // `totalAmount`. That is now what the customer is charged, split for display
  // into the platform's service fee and the delivery line, so the two still add
  // back up to exactly the fare the courier's task will carry. The rates are
  // untouched — this changes which of the engine's own numbers is used, not
  // what any of them are.
  const courierFare = Math.round(breakdown.totalAmount);
  const serviceFee = Math.min(Math.round(breakdown.serviceFee), courierFare);
  const deliveryFee = courierFare - serviceFee;
  const discount = Math.max(0, Math.round(input.discount ?? 0));

  const totalAmount = Math.max(0, subtotal + deliveryFee + serviceFee - discount);

  return {
    subtotal, deliveryFee, serviceFee, discount, totalAmount, distanceKm,
    currency: 'UGX', courierFare,
  };
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


// ============================================
// CATALOGUE-AUTHORITATIVE LINE ITEMS (BE-002)
// ============================================
// BE-001 stopped the client setting fees and totals, but the subtotal was
// still derived from `unitPrice` values in the request body. A modified client
// could post `unitPrice: 0` for a real menu item and the server would compute
// a subtotal of zero — correctly and consistently, from a false input.
//
// Every line is now resolved against the MERCHANT'S OWN menu. Scoping to the
// merchant matters as much as the lookup itself: without it a client could
// reference a cheaper item belonging to a different merchant and buy this
// merchant's goods at that price.

/** A line item as submitted by a client. Prices here are advisory only. */
export interface SubmittedItem {
  menuItemId?: string;
  itemName?: string;
  itemDescription?: string;
  quantity: number;
  /** What the client believed the price was. Used only to detect staleness. */
  unitPrice?: number;
  specialInstructions?: string;
}

/** A line item after the catalogue has spoken. This is what gets charged. */
export interface PricedItem {
  menuItemId: string;
  itemName: string;
  itemDescription: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

export interface ItemPricingResult {
  items: PricedItem[];
  /**
   * Lines whose catalogue price is HIGHER than the client believed. Charging
   * these without asking would mean taking more money than the customer agreed
   * to at checkout, so the caller is expected to stop and re-confirm.
   */
  increased: Array<{ menuItemId: string; itemName: string; was: number; now: number }>;
  /** Lines that could not be honoured at all, with the reason. */
  rejected: Array<{ menuItemId?: string; itemName?: string; reason: string }>;
}

/**
 * Price a cart from the merchant's catalogue.
 *
 * Name and description are taken from the catalogue too — a client that could
 * relabel a line would be able to buy a cheap item under an expensive item's
 * name, which matters once a human is picking the order.
 */
export async function priceItemsFromCatalogue(
  merchantId: string,
  submitted: SubmittedItem[],
  /** Optional transaction client so pricing happens inside the order's tx. */
  client: { menuItem: { findMany: typeof db.menuItem.findMany } } = db,
): Promise<ItemPricingResult> {
  const increased: ItemPricingResult['increased'] = [];
  const rejected: ItemPricingResult['rejected'] = [];

  const ids = submitted
    .map(i => i.menuItemId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  // Scoped to this merchant — an id belonging to someone else simply will not
  // be found, and is rejected below like any unknown item.
  const rows = ids.length
    ? await client.menuItem.findMany({
        where: { id: { in: ids }, merchantId },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          isAvailable: true,
          stockQuantity: true,
        },
      })
    : [];
  const byId = new Map(rows.map(r => [r.id, r]));

  const items: PricedItem[] = [];
  for (const line of submitted) {
    const quantity = Math.floor(line.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      rejected.push({
        menuItemId: line.menuItemId,
        itemName: line.itemName,
        reason: 'Invalid quantity',
      });
      continue;
    }

    if (!line.menuItemId) {
      rejected.push({
        itemName: line.itemName,
        reason: 'Item is not linked to the merchant catalogue',
      });
      continue;
    }

    const menuItem = byId.get(line.menuItemId);
    if (!menuItem) {
      rejected.push({
        menuItemId: line.menuItemId,
        itemName: line.itemName,
        reason: 'Item is not on this merchant\'s menu',
      });
      continue;
    }
    if (!menuItem.isAvailable) {
      rejected.push({
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        reason: 'Item is currently unavailable',
      });
      continue;
    }
    if (menuItem.stockQuantity != null && menuItem.stockQuantity < quantity) {
      rejected.push({
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        reason: `Only ${menuItem.stockQuantity} left in stock`,
      });
      continue;
    }

    // Decimal, so convert explicitly — `Decimal + number` concatenates.
    const unitPrice = Math.max(0, Math.round(toNumber(menuItem.price)));

    // A cart built before a price rise would otherwise be charged the new,
    // higher price without the customer ever seeing it.
    if (typeof line.unitPrice === 'number' && unitPrice > Math.round(line.unitPrice)) {
      increased.push({
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        was: Math.round(line.unitPrice),
        now: unitPrice,
      });
    }

    items.push({
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      itemDescription: menuItem.description,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      specialInstructions: line.specialInstructions,
    });
  }

  return { items, increased, rejected };
}

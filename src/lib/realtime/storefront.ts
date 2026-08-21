/**
 * Storefront realtime — what a customer is looking at, kept true.
 *
 * A pharmacy or shop changes its own state constantly: it opens, it closes, it
 * runs out of something, it reprices. None of that reached the customer's app
 * until they pulled to refresh, so a customer could sit on a pharmacy that had
 * shut ten minutes ago and place an order into it — and, since a closed
 * pharmacy now refuses orders, be told no by a screen that still said OPEN.
 *
 * One low-volume channel carries these changes. It is deliberately global
 * rather than per-store: a customer browsing has no single store to subscribe
 * to, and the volume is a handful of events an hour per shop. The payload
 * carries the new state so a listener can patch a list in place rather than
 * refetch it.
 *
 * Everything here is fire-and-forget. A shop's own action must never fail
 * because the announcement did.
 */

import { broadcastEvent } from '@/lib/realtime-server';

/** The single channel every customer app subscribes to while browsing. */
export const STOREFRONT_CHANNEL = 'storefront';

export const StorefrontEvents = {
  /** A pharmacy / health provider opened or closed. */
  ProviderAvailability: 'provider:availability',
  /** A merchant (restaurant, shop, pharmacy-as-merchant) opened or closed. */
  MerchantAvailability: 'merchant:availability',
  /** A provider's medicine catalogue changed — item added, repriced, hidden. */
  ProviderCatalog: 'provider:catalog',
  /** A merchant's menu or product list changed. */
  MerchantMenu: 'merchant:menu',
  /** A provider's own details changed — hours, address, what it supports. */
  ProviderProfile: 'provider:profile',
} as const;

function announce(event: string, payload: Record<string, unknown>): void {
  broadcastEvent(STOREFRONT_CHANNEL, event, { ...payload, at: new Date().toISOString() }).catch(
    (e) => console.error(`[storefront] ${event} broadcast failed:`, e)
  );
}

export function announceProviderAvailability(input: {
  providerId: string;
  isOpen: boolean;
  businessName?: string | null;
}): void {
  announce(StorefrontEvents.ProviderAvailability, input);
}

export function announceMerchantAvailability(input: {
  merchantId: string;
  isOpen: boolean;
  name?: string | null;
  status?: string | null;
}): void {
  announce(StorefrontEvents.MerchantAvailability, input);
}

export function announceProviderCatalog(input: {
  providerId: string;
  /** What happened, so a listener can decide whether it needs a refetch. */
  change: 'ADDED' | 'UPDATED' | 'REMOVED';
  medicineId?: string;
  name?: string | null;
  isAvailable?: boolean;
  price?: number | null;
}): void {
  announce(StorefrontEvents.ProviderCatalog, input);
}

export function announceMerchantMenu(input: {
  merchantId: string;
  change: 'ADDED' | 'UPDATED' | 'REMOVED';
  itemId?: string;
  name?: string | null;
  isAvailable?: boolean;
  price?: number | null;
}): void {
  announce(StorefrontEvents.MerchantMenu, input);
}

export function announceProviderProfile(input: {
  providerId: string;
  businessName?: string | null;
  operatingHours?: string | null;
  supportsDelivery?: boolean;
  supportsPickup?: boolean;
}): void {
  announce(StorefrontEvents.ProviderProfile, input);
}

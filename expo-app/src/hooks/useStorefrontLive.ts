// ============================================
// SMART RIDE MOBILE - useStorefrontLive
// ============================================
// Keeps a browsing screen honest about what is open and what is in stock.
//
// A shop's own state changes constantly — it opens, it closes, it runs out of
// something, it reprices — and none of that reached the customer's app until
// they pulled to refresh. So a customer could sit on a pharmacy that had shut
// ten minutes ago, tap through to order, and be refused by a server that knew
// better than the screen did.
//
// Two shapes of use:
//
//   // patch a list in place
//   useStorefrontLive({ onProviderAvailability: ({ providerId, isOpen }) =>
//     setProviders(p => p.map(x => x.id === providerId ? { ...x, isOpenNow: isOpen } : x)) });
//
//   // or just reload when anything relevant moves
//   useStorefrontLive({ onAnyChange: reload });
// ============================================

import { useEffect, useRef } from 'react';
import { realtimeService } from '../services/realtime.service';

export interface ProviderAvailabilityEvent {
  providerId: string;
  isOpen: boolean;
  businessName?: string | null;
  at?: string;
}

export interface MerchantAvailabilityEvent {
  merchantId: string;
  isOpen: boolean;
  name?: string | null;
  status?: string | null;
  at?: string;
}

export interface CatalogEvent {
  providerId?: string;
  merchantId?: string;
  change: 'ADDED' | 'UPDATED' | 'REMOVED';
  medicineId?: string;
  itemId?: string;
  name?: string | null;
  isAvailable?: boolean;
  price?: number | null;
  at?: string;
}

export interface ProviderProfileEvent {
  providerId: string;
  businessName?: string | null;
  operatingHours?: string | null;
  supportsDelivery?: boolean;
  supportsPickup?: boolean;
  at?: string;
}

interface Handlers {
  onProviderAvailability?: (e: ProviderAvailabilityEvent) => void;
  onMerchantAvailability?: (e: MerchantAvailabilityEvent) => void;
  onProviderCatalog?: (e: CatalogEvent) => void;
  onMerchantMenu?: (e: CatalogEvent) => void;
  onProviderProfile?: (e: ProviderProfileEvent) => void;
  /** Fires for every storefront event, after the specific handler. */
  onAnyChange?: (e: { event: string; data: unknown }) => void;
  /** Set false to keep a screen static (e.g. a checkout mid-payment). */
  enabled?: boolean;
}

export function useStorefrontLive(handlers: Handlers): void {
  // Held in a ref so a caller passing inline arrows does not resubscribe on
  // every render — the subscription is per screen, not per render.
  const ref = useRef(handlers);
  ref.current = handlers;

  const enabled = handlers.enabled !== false;

  useEffect(() => {
    if (!enabled) return;

    realtimeService.joinStorefront();

    const unsubscribers = [
      realtimeService.on('provider:availability', (e: ProviderAvailabilityEvent) =>
        ref.current.onProviderAvailability?.(e)
      ),
      realtimeService.on('merchant:availability', (e: MerchantAvailabilityEvent) =>
        ref.current.onMerchantAvailability?.(e)
      ),
      realtimeService.on('provider:catalog', (e: CatalogEvent) =>
        ref.current.onProviderCatalog?.(e)
      ),
      realtimeService.on('merchant:menu', (e: CatalogEvent) => ref.current.onMerchantMenu?.(e)),
      realtimeService.on('provider:profile', (e: ProviderProfileEvent) =>
        ref.current.onProviderProfile?.(e)
      ),
      realtimeService.on('storefront:changed', (e: { event: string; data: unknown }) =>
        ref.current.onAnyChange?.(e)
      ),
    ];

    return () => {
      unsubscribers.forEach((off) => off());
      // The channel itself is left joined: another screen may still be
      // listening, and rejoining on every navigation is more expensive than the
      // handful of events it carries.
    };
  }, [enabled]);
}

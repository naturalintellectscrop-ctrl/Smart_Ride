/**
 * SLA configuration reader.
 *
 * Previously the SLAConfig table was defined but NEVER read anywhere, so admin
 * SLA settings had no effect. This module loads SLAConfig (cached) with sane
 * defaults so SLA targets are actually consulted by the app/API.
 *
 * serviceType matches the TaskType enum (e.g. SMART_BODA_RIDE, FOOD_DELIVERY).
 * `state` is optional (e.g. a region/city) for location-specific SLAs.
 */

import { db } from '@/lib/db';

// Default SLA targets in minutes (used when no DB row exists).
const DEFAULT_SLA_MINUTES: Record<string, number> = {
  SMART_BODA_RIDE: 10,
  SMART_CAR_RIDE: 12,
  FOOD_DELIVERY: 45,
  SHOPPING: 60,
  ITEM_DELIVERY: 40,
};
const FALLBACK_SLA_MINUTES = 30;

// Default rider acceptance window per task type (seconds) when no DB row
// configures one. Mirrors the previously hardcoded DISPATCH_CONFIG.matchTimeout.
const DEFAULT_ACCEPT_TIMEOUT_S = 30;
// Safety clamp so an admin typo can't make offers unacceptable or immortal.
const MIN_ACCEPT_TIMEOUT_S = 10;
const MAX_ACCEPT_TIMEOUT_S = 300;

type SlaRow = { serviceType: string; state: string; slaMinutes: number; acceptTimeoutSeconds: number | null };

const TTL_MS = 60_000;
let cache: { rows: SlaRow[]; expires: number } | null = null;

async function loadSla() {
  if (cache && cache.expires > Date.now()) return cache.rows;
  let rows: SlaRow[] = [];
  try {
    rows = await db.sLAConfig.findMany({
      select: { serviceType: true, state: true, slaMinutes: true, acceptTimeoutSeconds: true },
    });
  } catch (e) {
    console.warn('[sla] SLAConfig load failed, using defaults:', (e as Error).message);
  }
  cache = { rows, expires: Date.now() + TTL_MS };
  return rows;
}

/** Force a reload on the next SLA lookup (e.g. after an admin edit). */
export function invalidateSlaCache(): void {
  cache = null;
}

/**
 * Return the SLA target (minutes) for a service type, optionally for a given
 * state/region. Resolution order: exact (serviceType+state) → serviceType (any
 * state) → hardcoded default for the type → global fallback.
 */
export async function getSlaMinutes(serviceType: string, state?: string): Promise<number> {
  const rows = await loadSla();
  if (state) {
    const exact = rows.find((r) => r.serviceType === serviceType && r.state === state);
    if (exact) return exact.slaMinutes;
  }
  const byType = rows.find((r) => r.serviceType === serviceType);
  if (byType) return byType.slaMinutes;
  return DEFAULT_SLA_MINUTES[serviceType] ?? FALLBACK_SLA_MINUTES;
}

/**
 * How long a rider gets to accept a dispatch offer for this task type
 * (seconds). Admin-configurable via SLAConfig.acceptTimeoutSeconds — the
 * dispatch engine calls this for every offer, so edits apply within the cache
 * TTL (≤60s) with no redeploy. Clamped to a safe range.
 */
export async function getAcceptTimeoutSeconds(serviceType: string, state?: string): Promise<number> {
  const rows = await loadSla();
  const candidates = state
    ? [rows.find((r) => r.serviceType === serviceType && r.state === state), rows.find((r) => r.serviceType === serviceType)]
    : [rows.find((r) => r.serviceType === serviceType)];
  for (const row of candidates) {
    if (row?.acceptTimeoutSeconds != null) {
      return Math.min(MAX_ACCEPT_TIMEOUT_S, Math.max(MIN_ACCEPT_TIMEOUT_S, row.acceptTimeoutSeconds));
    }
  }
  return DEFAULT_ACCEPT_TIMEOUT_S;
}

/**
 * Record a suspicious-activity entry from server code.
 *
 * Four pharmacy routes logged fraud activity by doing
 * `await fetch('/api/fraud/activity', …)` — a RELATIVE url, from Node. There is
 * no origin to resolve it against on the server, so it throws
 * "Failed to parse URL" every time, and because the call was awaited inside the
 * route's try block the throw became the route's own failure:
 *
 *   POST /health-provider/orders     → 500. No customer could place a
 *                                      pharmacy order at all.
 *   POST /health-provider/register   → 500 after the provider row was written.
 *   POST /health-provider/catalog    → 500 when adding a CONTROLLED medicine,
 *                                      after the medicine had been created —
 *                                      so the app reported failure for a
 *                                      medicine that was in fact added, and a
 *                                      pharmacist retrying produced duplicates.
 *   PATCH /health-provider/verification → same shape.
 *
 * Even with an absolute url the hop could not work: /api/fraud/activity is
 * admin-guarded, and these callers are a customer or a pharmacist. A server
 * calling its own HTTP API to reach its own database is the mistake; this
 * writes the row directly.
 *
 * Never throws. Fraud telemetry must not be able to fail the thing it is
 * observing.
 */

import { db } from '@/lib/db';
import type { RiskEntityType, SuspiciousActivityType } from '@prisma/client';

export interface SuspiciousActivityInput {
  entityType: RiskEntityType;
  entityId: string;
  activityType: SuspiciousActivityType;
  activityCategory: string;
  referenceType?: string | null;
  referenceId?: string | null;
  riskIndicators?: unknown;
  deviceFingerprint?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: unknown;
}

/**
 * Same base scores the /api/fraud/activity route applies, so an activity
 * logged from server code scores identically to one posted to the endpoint.
 */
const BASE_SCORES: Record<string, number> = {
  CANCELLATION: 15,
  REFUND_REQUEST: 20,
  PAYMENT_FAILURE: 25,
  ACCOUNT_CHANGE: 10,
  LOGIN_ATTEMPT: 5,
  ORDER_CREATED: 5,
  CONTROLLED_MEDICINE_ADDED: 25,
  PROVIDER_REGISTERED: 10,
};

export async function logSuspiciousActivity(input: SuspiciousActivityInput): Promise<void> {
  try {
    await db.suspiciousActivityLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        activityType: input.activityType,
        activityCategory: input.activityCategory,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        riskIndicators: input.riskIndicators ? JSON.stringify(input.riskIndicators) : null,
        riskScore: BASE_SCORES[input.activityType] ?? 5,
        deviceFingerprint: input.deviceFingerprint ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    console.error('[fraud] logSuspiciousActivity failed:', error);
  }
}

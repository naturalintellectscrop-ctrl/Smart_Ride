// ============================================
// SMART RIDE — CRON: INTELLIGENCE MAINTENANCE
// ============================================
// The single scheduled trigger for the intelligent platform layer. Before
// this endpoint existed, the engines were complete but inert: ZoneMetric and
// SurgeRecord were only written when an admin manually POSTed
// /api/marketplace/surge, score decay was configured but never applied,
// suspensions never lapsed, and completed incentives were never paid out.
//
// Runs (all idempotent, safe to retry):
//   marketplace  sample every zone -> ZoneMetric bucket, auto start/end surge
//   forecast     project next-bucket demand/supply from real history
//   reputation   lift elapsed suspensions, apply score decay, sync privileges
//   incentives   expire ended campaigns, pay out completed participations
//
// Security: X-Cron-Secret header must match CRON_SECRET (same contract as
// /api/cron/dispatch-timeout). Without the secret set, allowed in dev only.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { MarketplaceScheduler } from '@/lib/marketplace/marketplace-scheduler.service';
import { ReputationMaintenance } from '@/lib/reputation/reputation-maintenance.service';
import {
  expireEndedIncentives,
  processPendingRewards,
} from '@/lib/marketplace/incentive-fulfillment';

function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development';
  }
  const provided =
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  return provided === cronSecret;
}

/**
 * Run one task without letting its failure abort the others. A broken
 * forecast must not stop surge from being evaluated.
 */
async function step<T>(name: string, fn: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    return { name, ok: true as const, ms: Date.now() - startedAt, result };
  } catch (error) {
    console.error(`[cron/intelligence] ${name} failed:`, error);
    return {
      name,
      ok: false as const,
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Allow running a single task: ?task=marketplace|reputation|incentives
  const task = request.nextUrl.searchParams.get('task');
  const runAll = !task;
  const now = new Date();

  await setServiceRoleContext();
  try {
    const steps: Awaited<ReturnType<typeof step>>[] = [];

    if (runAll || task === 'marketplace') {
      steps.push(await step('marketplace.sampleZones', () => MarketplaceScheduler.sampleZones(now)));
      steps.push(await step('marketplace.forecast', () => MarketplaceScheduler.forecast(now)));
    }

    if (runAll || task === 'reputation') {
      steps.push(await step('reputation.maintenance', () => ReputationMaintenance.runAll(now)));
    }

    if (runAll || task === 'incentives') {
      steps.push(await step('incentives.expireEnded', () => expireEndedIncentives()));
      steps.push(await step('incentives.payPending', () => processPendingRewards()));
    }

    if (steps.length === 0) {
      return NextResponse.json(
        { success: false, error: `Unknown task "${task}". Use marketplace, reputation or incentives.` },
        { status: 400 }
      );
    }

    const failed = steps.filter(s => !s.ok);

    return NextResponse.json(
      {
        // A partial failure is still reported as a non-2xx so the cron run is
        // marked failed and someone looks at it.
        success: failed.length === 0,
        ranAt: now.toISOString(),
        totalMs: steps.reduce((sum, s) => sum + s.ms, 0),
        steps,
      },
      { status: failed.length === 0 ? 200 : 500 }
    );
  } catch (error) {
    console.error('[cron/intelligence] fatal:', error);
    return NextResponse.json(
      { success: false, error: 'Intelligence maintenance failed' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST is not supported — the cron pings with GET, matching dispatch-timeout.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}

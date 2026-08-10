/**
 * GET /api/admin/cron-health
 *
 * Scheduler health for the admin dashboard.
 *
 * A cron that stops running is invisible by default — nothing errors, data
 * just quietly stops updating. This surfaces the two questions that actually
 * matter: is it still running, and is it succeeding?
 *
 * `staleMinutes` is the real alarm. If the intelligence scheduler last ran two
 * hours ago on a 15-minute cadence, surge is not reacting and nobody would
 * otherwise know.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';

/** Expected cadence per job, used to decide whether a job has gone stale. */
const EXPECTED_INTERVAL_MINUTES: Record<string, number> = {
  intelligence: 15,
};

/** How many missed intervals before a job is considered stale. */
const STALE_TOLERANCE = 3;

export async function GET(request: NextRequest) {
  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Admin access required' },
      { status: authResult.statusCode || 403 }
    );
  }

  await setServiceRoleContext();
  try {
    const since = new Date(Date.now() - 24 * 60 * 60_000);

    const jobs = await db.cronRun.groupBy({
      by: ['job'],
      _count: { _all: true },
      _max: { startedAt: true },
    });

    const health = await Promise.all(
      jobs.map(async j => {
        const [lastRun, lastSuccess, failures24h, runs24h] = await Promise.all([
          db.cronRun.findFirst({
            where: { job: j.job },
            orderBy: { startedAt: 'desc' },
          }),
          db.cronRun.findFirst({
            where: { job: j.job, success: true },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true },
          }),
          db.cronRun.count({
            where: { job: j.job, success: false, startedAt: { gte: since } },
          }),
          db.cronRun.count({ where: { job: j.job, startedAt: { gte: since } } }),
        ]);

        const minutesSinceLastRun = lastRun
          ? Math.round((Date.now() - lastRun.startedAt.getTime()) / 60_000)
          : null;
        const expected = EXPECTED_INTERVAL_MINUTES[j.job] ?? 60;
        const isStale =
          minutesSinceLastRun === null || minutesSinceLastRun > expected * STALE_TOLERANCE;

        return {
          job: j.job,
          // The headline: healthy means running recently AND succeeding.
          healthy: !isStale && lastRun?.success === true,
          isStale,
          expectedIntervalMinutes: expected,
          minutesSinceLastRun,
          lastRunAt: lastRun?.startedAt ?? null,
          lastRunSucceeded: lastRun?.success ?? null,
          lastSuccessAt: lastSuccess?.startedAt ?? null,
          lastError: lastRun?.error ?? null,
          runs24h,
          failures24h,
          failureRate24h: runs24h > 0 ? Math.round((failures24h / runs24h) * 100) : 0,
        };
      })
    );

    // Most recent failures, so an admin can see WHAT broke without leaving
    // the dashboard.
    const recentFailures = await db.cronRun.findMany({
      where: { success: false, startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        job: true,
        task: true,
        startedAt: true,
        durationMs: true,
        stepsFailed: true,
        stepsTotal: true,
        error: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        // If no job has ever run, the scheduler was never configured — a
        // meaningfully different state from "running but failing".
        configured: jobs.length > 0,
        allHealthy: health.length > 0 && health.every(h => h.healthy),
        jobs: health,
        recentFailures,
      },
    });
  } catch (error) {
    console.error('Error fetching cron health:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduler health' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

/**
 * Exercises the cron ENDPOINT itself — auth, each ?task= filter individually,
 * run logging, and the admin health surface.
 *
 * The idempotency harness proves the JOBS are safe. This proves the thing
 * GitHub Actions actually calls behaves: rejects unauthenticated callers,
 * runs each task in isolation, records every run, and reports failure.
 *
 *   CRON_SECRET=<secret> bun scripts/verify-cron-endpoint.ts
 */

import { NextRequest } from 'next/server';
import { db } from '../src/lib/db';

const TAG = 'E2E-CRON';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const SECRET = process.env.CRON_SECRET || 'e2e-test-cron-secret';

function req(path: string, secret?: string) {
  const headers = new Headers();
  if (secret) headers.set('x-cron-secret', secret);
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers } as never);
}

async function main() {
  console.log('\n=== Cron Endpoint ===');
  // The route reads CRON_SECRET at call time, so set it for this process.
  process.env.CRON_SECRET = SECRET;

  const { GET, POST } = await import('../src/app/api/cron/intelligence/route');
  const runIdsBefore = await db.cronRun.count();

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────
    stage('STAGE 1  authentication');
    const noSecret = await GET(req('/api/cron/intelligence'));
    check(
      'rejects a request with no secret',
      noSecret.status === 401,
      `status=${noSecret.status}`
    );

    const wrongSecret = await GET(req('/api/cron/intelligence', 'wrong-secret'));
    check(
      'rejects a request with the wrong secret',
      wrongSecret.status === 401,
      `status=${wrongSecret.status}`
    );

    const postRes = await POST();
    check('POST is not allowed (cron pings with GET)', postRes.status === 405, `status=${postRes.status}`);

    // ── 2. Each task individually ────────────────────────────────────
    stage('STAGE 2  every scheduled job runs in isolation');
    for (const task of ['marketplace', 'reputation', 'fraud', 'incentives']) {
      const res = await GET(req(`/api/cron/intelligence?task=${task}`, SECRET));
      const body = (await res.json()) as {
        success?: boolean;
        steps?: { name: string; ok: boolean; ms: number; error?: string }[];
      };
      const steps = body.steps ?? [];
      const failedSteps = steps.filter(s => !s.ok);
      check(
        `?task=${task}`,
        res.status === 200 && body.success === true,
        failedSteps.length
          ? `FAILED: ${failedSteps.map(s => `${s.name} (${s.error})`).join(', ')}`
          : `${steps.length} step(s): ${steps.map(s => `${s.name} ${s.ms}ms`).join(', ')}`
      );
    }

    // ── 3. Unknown task ──────────────────────────────────────────────
    stage('STAGE 3  unknown task is a client error, not a crash');
    const bogus = await GET(req('/api/cron/intelligence?task=not-a-task', SECRET));
    check('unknown ?task= returns 400', bogus.status === 400, `status=${bogus.status}`);

    // ── 4. Full run ──────────────────────────────────────────────────
    stage('STAGE 4  full run (what the schedule actually calls)');
    const full = await GET(req('/api/cron/intelligence', SECRET));
    const fullBody = (await full.json()) as {
      success?: boolean;
      runId?: string;
      totalMs?: number;
      steps?: { name: string; ok: boolean }[];
    };
    check(
      'full run succeeds with every step',
      full.status === 200 && fullBody.success === true,
      `status=${full.status} steps=${fullBody.steps?.length} totalMs=${fullBody.totalMs}`
    );
    // Four task groups, six steps — marketplace and incentives contribute two
    // each. Assert on the NAMES so a silently-dropped job fails this.
    const expectedSteps = [
      'marketplace.sampleZones',
      'marketplace.forecast',
      'reputation.maintenance',
      'fraud.rescoreActive',
      'incentives.expireEnded',
      'incentives.payPending',
    ];
    const actualSteps = (fullBody.steps ?? []).map(s => s.name);
    const missing = expectedSteps.filter(e => !actualSteps.includes(e));
    check(
      'full run covers every scheduled job',
      missing.length === 0,
      missing.length ? `MISSING: ${missing.join(', ')}` : `${actualSteps.length} steps: ${actualSteps.join(', ')}`
    );

    // ── 5. Failure visibility ────────────────────────────────────────
    stage('STAGE 5  every run is recorded');
    const runIdsAfter = await db.cronRun.count();
    check(
      'runs are persisted for post-mortem',
      runIdsAfter > runIdsBefore,
      `${runIdsAfter - runIdsBefore} run(s) recorded during this test`
    );

    const lastRun = await db.cronRun.findFirst({ orderBy: { startedAt: 'desc' } });
    check(
      'recorded run captures outcome and per-step detail',
      !!lastRun && lastRun.finishedAt !== null && lastRun.stepsTotal > 0 && !!lastRun.steps,
      lastRun
        ? `success=${lastRun.success} steps=${lastRun.stepsTotal} failed=${lastRun.stepsFailed} duration=${lastRun.durationMs}ms`
        : 'no run recorded'
    );

    // ── 6. Admin health surface ──────────────────────────────────────
    stage('STAGE 6  admin can see scheduler health');
    const { GET: healthGet } = await import('../src/app/api/admin/cron-health/route');
    const unauth = await healthGet(new NextRequest(new URL('http://localhost:3000/api/admin/cron-health')));
    check(
      'health endpoint is admin-guarded',
      unauth.status === 401 || unauth.status === 403,
      `status=${unauth.status}`
    );

    // Verify the underlying data shape the dashboard will read.
    const runs = await db.cronRun.findMany({
      where: { job: 'intelligence' },
      orderBy: { startedAt: 'desc' },
      take: 1,
    });
    const minutesSince = runs[0]
      ? Math.round((Date.now() - runs[0].startedAt.getTime()) / 60_000)
      : null;
    check(
      'staleness is computable — this is the alarm that matters',
      minutesSince !== null && minutesSince < 15 * 3,
      `last intelligence run ${minutesSince} min ago (stale threshold: 45 min)`
    );
  } finally {
    stage('cleanup');
    // Remove only the runs this test created.
    const created = await db.cronRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: { id: true, startedAt: true },
    });
    const cutoff = Date.now() - 10 * 60_000;
    const mine = created.filter(r => r.startedAt.getTime() > cutoff).map(r => r.id);
    if (mine.length) await db.cronRun.deleteMany({ where: { id: { in: mine } } });
    console.log(`  removed ${mine.length} test cron run(s)`);
  }

  console.log(
    failures === 0
      ? '\n=== CRON ENDPOINT VERIFIED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('CRON ENDPOINT ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

/**
 * Invokes the real intelligence API route handlers against the live database
 * and asserts they return usable payloads — the exact shapes the admin
 * dashboard components consume.
 *
 * This is the layer between "the engine writes rows" and "the dashboard shows
 * something": a route can compile, and its tables can exist, and it can still
 * 500 on a real request.
 *
 *   bun scripts/verify-intelligence-apis.ts
 */

import { NextRequest } from 'next/server';
import { db } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';

let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}

/**
 * These are admin dashboard routes, so requests carry an admin token.
 *
 * They did not, and the suite still passed — because the routes had no
 * authentication and answered anyone. The assertions were therefore
 * documenting the vulnerability: "returns the shape the dashboard reads" was
 * true for an anonymous caller too. Sending the token is what makes this a
 * test of the dashboard's path rather than of an open door.
 */
const ADMIN_TOKEN = generateAccessToken({
  id: 'e2e-intelligence-admin',
  email: 'e2e-intelligence@smartride.test',
  role: 'SUPER_ADMIN',
  name: 'E2E Intelligence Admin',
} as never);

function req(url: string, init?: RequestInit) {
  const headers = new Headers((init as RequestInit | undefined)?.headers ?? {});
  if (!headers.has('authorization')) {
    headers.set('authorization', `Bearer ${ADMIN_TOKEN}`);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...(init as RequestInit),
    headers,
  } as never);
}

/** A request with no credentials, for the checks that assert a refusal. */
function anonReq(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never);
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function main() {
  console.log('\n=== Intelligence API Verification ===\n');

  // ── Driver reputation list (Reputation dashboard) ────────────────────
  {
    const { GET } = await import('../src/app/api/driver-reputation/route');
    const res = await GET(req('/api/driver-reputation?page=1&limit=20'));
    const body = await readJson(res);
    // Contract the dashboard reads: { success, data[], pagination, stats }
    const rows = (body as { data?: unknown[] }).data;
    check(
      'GET /api/driver-reputation returns the shape the dashboard reads',
      res.status === 200 && body.success === true && Array.isArray(rows) && !!body.stats && !!body.pagination,
      `status=${res.status} data=${(rows ?? []).length} stats=${!!body.stats} pagination=${!!body.pagination}`
    );
  }

  // ── Fraud alerts (Fraud dashboard) ───────────────────────────────────
  // This endpoint is admin-guarded. An unauthenticated request MUST be
  // rejected — a 200 here would be the security regression the guard exists
  // to prevent, so 401/403 is the passing result.
  {
    const { GET } = await import('../src/app/api/fraud/alerts/route');
    const res = await GET(anonReq('/api/fraud/alerts?limit=100'));
    check(
      'GET /api/fraud/alerts rejects unauthenticated callers',
      res.status === 401 || res.status === 403,
      `status=${res.status} (admin guard enforced)`
    );
  }

  // ── Fraud dashboard rollup ───────────────────────────────────────────
  {
    const { GET } = await import('../src/app/api/fraud/dashboard/route');
    const res = await GET(req('/api/fraud/dashboard?period=7d'));
    const body = await readJson(res);
    check(
      'GET /api/fraud/dashboard',
      res.status === 200 && !!body.summary,
      `status=${res.status} summary=${!!body.summary} trend=${Array.isArray(body.dailyTrend)}`
    );
  }

  // ── Marketplace overview (Marketplace dashboard) ─────────────────────
  {
    const { GET } = await import('../src/app/api/marketplace/overview/route');
    const res = await GET(req('/api/marketplace/overview'));
    const body = await readJson(res);
    check(
      'GET /api/marketplace/overview',
      res.status === 200,
      `status=${res.status} payload=${Object.keys(body).join(',') || 'empty'}`
    );
  }

  // ── Marketplace zones ────────────────────────────────────────────────
  {
    const { GET } = await import('../src/app/api/marketplace/zones/route');
    const res = await GET(req('/api/marketplace/zones'));
    check('GET /api/marketplace/zones', res.status === 200, `status=${res.status}`);
  }

  // ── Active incentives ────────────────────────────────────────────────
  {
    const { GET } = await import('../src/app/api/marketplace/incentives/route');
    const res = await GET(req('/api/marketplace/incentives?status=ACTIVE'));
    check('GET /api/marketplace/incentives', res.status === 200, `status=${res.status}`);
  }

  // ── Incident reports ─────────────────────────────────────────────────
  {
    const { GET } = await import('../src/app/api/incident-reports/route');
    const res = await GET(req('/api/incident-reports'));
    check('GET /api/incident-reports', res.status === 200, `status=${res.status}`);
  }

  console.log(failures === 0 ? '\n=== ALL CHECKS PASSED ===\n' : `\n=== ${failures} CHECK(S) FAILED ===\n`);
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('VERIFICATION ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

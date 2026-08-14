/**
 * Unauthenticated reachability sweep across every API route.
 *
 * A grep for `requireAuth` is not evidence: some routes are guarded by a setup
 * key or a cron secret instead, and some are public by design. So this asks the
 * running server directly — no token, GET only, and it reports what came back.
 *
 * GET only, deliberately. A POST sweep would create rows on a live database to
 * prove a point that a GET already proves: if an unauthenticated GET returns
 * another tenant's data, the route has no auth, and its POST almost never does
 * either. The writes are then checked by hand on whatever this flags.
 *
 * A 200 is not automatically a defect — public listings exist. The output is
 * triage input, not a verdict.
 *
 *   npm run dev
 *   bun scripts/verify-route-auth-sweep.ts
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000';
const API_DIR = 'src/app/api';

/**
 * Routes that are unauthenticated on purpose. Anything not on this list that
 * answers 200 without a token needs a human to look at it.
 */
const INTENTIONALLY_PUBLIC = new Set([
  'auth/login', 'auth/register', 'auth/refresh', 'auth/logout',
  'auth/forgot-password', 'auth/reset-password', 'auth/send-otp',
  'auth/verify-otp', 'auth/google', 'auth/apple', 'auth/session',
  'admin/login', 'admin/setup', 'admin/forgot-password', 'admin/reset-password',
  'admin/set-role', 'admin/force-reset-password', 'admin/recovery',
  'health', 'health/ready', 'health/startup', 'debug/db', 'setup',
  'contact', 'email', 'config/mapbox-token',
  'webhooks/flutterwave',
  'payments/mtn/callback', 'payments/airtel/callback', 'payments/mtn-callback',
  'payments/airtel-callback', 'payments/nylonpay/callback',
  'cron/cleanup-otp', 'cron/cleanup-sessions', 'cron/dispatch-timeout',
  'cron/intelligence',
  // Storefront: a customer browses before signing in.
  'merchants', 'merchants/[id]/menu', 'merchants/[id]/products',
  'health-providers', 'pharmacies', 'medicine-catalog',
]);

function findRoutes(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findRoutes(full, prefix ? `${prefix}/${entry}` : entry));
    } else if (entry === 'route.ts') {
      if (readFileSync(full, 'utf-8').includes('export async function GET')) {
        out.push(prefix);
      }
    }
  }
  return out;
}

/** Dynamic segments get a plausible-looking id so routing resolves. */
function concrete(route: string): string {
  return route.replace(/\[\.\.\.[^\]]+\]/g, 'probe').replace(/\[[^\]]+\]/g, 'probe');
}

interface Row {
  route: string;
  status: number;
  bytes: number;
  hint: string;
}

async function main() {
  const routes = findRoutes(API_DIR).sort();
  console.log(`\n=== Unauthenticated GET sweep — ${routes.length} routes with a GET ===\n`);

  const open: Row[] = [];
  const guarded: Row[] = [];
  const expected: Row[] = [];

  for (const route of routes) {
    // Query params some routes require before they will do anything, so a 400
    // does not masquerade as a refusal.
    const qs = '?providerId=probe&merchantId=probe&riderId=probe&userId=probe&limit=1';
    let status = 0;
    let bytes = 0;
    let text = '';
    try {
      const res = await fetch(`${BASE}/api/${concrete(route)}${qs}`);
      status = res.status;
      text = await res.text();
      bytes = text.length;
    } catch (e) {
      status = -1;
      text = String(e);
    }

    const row: Row = { route, status, bytes, hint: '' };

    if (INTENTIONALLY_PUBLIC.has(route)) {
      row.hint = 'public by design';
      expected.push(row);
    } else if (status === 401 || status === 403) {
      guarded.push(row);
    } else if (status === 200) {
      // 200 with a body is the interesting case: it answered a stranger.
      row.hint = text.includes('"success":false') ? 'answered, but reports failure' : 'ANSWERED';
      open.push(row);
    } else {
      // 400/404/500 — reached the handler but did not serve data. Still not a
      // refusal, so worth listing separately rather than counting as safe.
      row.hint = 'no auth check reached, failed for another reason';
      open.push(row);
    }
  }

  const show = (title: string, rows: Row[]) => {
    console.log(`\n── ${title} (${rows.length}) ──`);
    for (const r of rows) {
      console.log(`  ${String(r.status).padStart(3)}  ${r.route.padEnd(42)} ${r.hint}${r.bytes ? ` (${r.bytes}b)` : ''}`);
    }
  };

  show('REACHABLE WITHOUT A TOKEN — triage these', open.filter(r => r.status === 200));
  show('reached the handler but errored (no auth gate hit)', open.filter(r => r.status !== 200));
  show('properly refused', guarded);
  console.log(`\n  ${expected.length} routes skipped as public by design\n`);

  const answering = open.filter(r => r.status === 200 && r.hint === 'ANSWERED');
  console.log(
    answering.length
      ? `${answering.length} route(s) served data to an unauthenticated caller.\n`
      : 'No route served data to an unauthenticated caller.\n'
  );
  process.exit(0);
}

main();

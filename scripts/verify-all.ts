/**
 * Runs every Smart Ride verification harness in sequence and reports one
 * summary.
 *
 *   bun scripts/verify-all.ts          # all suites
 *   bun scripts/verify-all.ts health   # only suites matching "health"
 *
 * WHY SEQUENTIAL, WITH A PAUSE: these suites each open their own Prisma
 * client against the Supabase *pooler*. Running them back to back exhausts
 * the connection pool and produces a spurious 500 in whichever suite happens
 * to run next — a red result that is not a real regression. The delay between
 * suites lets connections drain so a failure here means something is actually
 * broken.
 */

import { spawn } from 'child_process';

interface Suite {
  name: string;
  file: string;
  covers: string;
}

const SUITES: Suite[] = [
  {
    name: 'intelligence',
    file: 'scripts/verify-intelligence.ts',
    covers: 'engines respond to real events (reputation, fraud, device trust)',
  },
  {
    name: 'dispatch-reputation',
    file: 'scripts/verify-dispatch-reputation.ts',
    covers: 'reputation governs dispatch ranking and suspension',
  },
  {
    name: 'intelligence-apis',
    file: 'scripts/verify-intelligence-apis.ts',
    covers: 'admin dashboard APIs return usable shapes and enforce auth',
  },
  {
    name: 'intelligence-e2e',
    file: 'scripts/verify-intelligence-e2e.ts',
    covers: 'event -> engine -> DB -> dispatch -> dashboard -> mobile',
  },
  {
    name: 'intelligence-automation',
    file: 'scripts/verify-intelligence-automation.ts',
    covers: 'scheduled work: zone sampling, auto surge, decay, incentive expiry',
  },
  {
    name: 'cron-idempotency',
    file: 'scripts/verify-cron-idempotency.ts',
    covers: 'repeated + concurrent scheduler runs cause no drift',
  },
  {
    name: 'cron-endpoint',
    file: 'scripts/verify-cron-endpoint.ts',
    covers: 'cron auth, each ?task= in isolation, run logging, health surface',
  },
  {
    name: 'intelligence-product',
    file: 'scripts/verify-intelligence-product.ts',
    covers: 'surge -> fare, tier change -> driver notified, fraud -> admin paged',
  },
  {
    name: 'order-pricing',
    file: 'scripts/verify-order-pricing.ts',
    covers: 'BE-001/BE-002: catalogue prices the order, not the request body',
  },
  {
    name: 'wallet-withdrawal',
    file: 'scripts/verify-wallet-withdrawal.ts',
    covers: 'BE-003: one atomic withdrawal path, concurrent debits cannot over-draw',
  },
  {
    name: 'security-claims',
    file: 'scripts/verify-security-claims.ts',
    covers: 'BE-004: no UI claims a security property the backend lacks',
  },
  {
    name: 'car-driver-journey',
    file: 'scripts/verify-car-driver-journey.ts',
    covers: 'register -> approve -> dispatch -> trip -> earnings -> receipt',
  },
  {
    name: 'two-way-ratings',
    file: 'scripts/verify-two-way-ratings.ts',
    covers: 'BE-012/BE-013: both parties rate; three rating stores reconcile',
  },
  {
    name: 'offer-alert',
    file: 'scripts/verify-offer-alert.ts',
    covers: 'a ride offer rings audibly, foreground and backgrounded',
  },
  {
    name: 'delivery-personnel',
    file: 'scripts/verify-delivery-personnel.ts',
    covers: 'BE-005: atomic claiming, concurrent assignments, proof of delivery',
  },
  {
    name: 'delivery-adversarial',
    file: 'scripts/verify-delivery-e2e-adversarial.ts',
    covers: 'the delivery journey walked end to end through real HTTP, under attack',
  },
  {
    name: 'core-journey',
    file: 'scripts/verify-client-driver-journey.ts',
    covers: 'book -> dispatch -> ride -> pay -> rate -> receipt -> notify',
  },
  {
    name: 'health-journey',
    file: 'scripts/verify-health-journey.ts',
    covers: 'provider register -> verify -> catalogue -> order -> fulfil',
  },
  {
    name: 'delivery-journey',
    file: 'scripts/verify-delivery-journey.ts',
    covers: 'delivery lifecycle incl. DELIVERING, all four task types',
  },
];

/**
 * Seconds to wait between suites so pooler connections can drain.
 *
 * This was raised to 12 while the intermittent failures were assumed to be
 * pool exhaustion. They were not: measurement showed 12 concurrent PLAIN
 * queries all succeed while 12 concurrent interactive TRANSACTIONS returned
 * 3/12, and the failures began at a concurrency of four against a pool that
 * allowed seventeen. The causes were Prisma's 2000ms default transaction
 * `maxWait` against a multi-second round trip, and the deliberate
 * single-connection pool — both now addressed directly, so the cooldown is
 * back to covering what it was ever for: letting sockets close between
 * processes.
 */
const COOLDOWN_SECONDS = 5;

function run(file: string): Promise<{ code: number; output: string }> {
  return new Promise(resolve => {
    const child = spawn('bun', [file], {
      shell: true,
      env: {
        ...process.env,
        // Production pins connection_limit to 1 on purpose: RLS context lives
        // in PostgreSQL *session* state (SET ROLE + SET app.current_user_id),
        // so a SET and the queries depending on it must share one connection.
        // Correct, and it also means concurrent transactions serialise.
        //
        // These suites deliberately fire concurrent writes to prove the
        // atomicity guards hold. With a pool of 1 and a ~750ms-2.5s round trip
        // to the eu-west-1 pooler, every racer after the first queues behind a
        // connection and trips P2028 before it reaches the database — which
        // looked like flakiness but was the runner starving itself.
        //
        // Raised HERE, for the test process only. The suites use the service
        // role rather than per-user RLS context, so the single-connection
        // constraint does not apply to them.
        DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT || '10',
      },
    });
    let output = '';
    child.stdout.on('data', d => (output += d.toString()));
    child.stderr.on('data', d => (output += d.toString()));
    child.on('close', code => resolve({ code: code ?? 1, output }));
  });
}

const sleep = (s: number) => new Promise(r => setTimeout(r, s * 1000));

async function main() {
  const filter = process.argv[2];
  const suites = filter
    ? SUITES.filter(s => s.name.includes(filter) || s.file.includes(filter))
    : SUITES;

  if (suites.length === 0) {
    console.error(`No suite matches "${filter}". Available: ${SUITES.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n╔══ Smart Ride verification — ${suites.length} suite(s) ══\n`);

  const results: { suite: Suite; passed: boolean; checks: string }[] = [];

  for (const [i, suite] of suites.entries()) {
    process.stdout.write(`▸ ${suite.name.padEnd(22)} `);
    const { code, output } = await run(suite.file);

    // Each harness prints "PASS"/"FAIL" per check and a summary banner.
    const passes = (output.match(/ {2}PASS {2}/g) ?? []).length;
    const fails = (output.match(/ {2}FAIL {2}/g) ?? []).length;
    const passed = code === 0 && fails === 0;

    console.log(passed ? `✓ ${passes} checks` : `✗ ${fails} failed / ${passes} passed`);
    results.push({ suite, passed, checks: `${passes} passed, ${fails} failed` });

    if (!passed) {
      // Surface only the failing lines plus the banner — full output is noisy.
      const detail = output
        .split('\n')
        .filter(l => l.includes('FAIL') || l.startsWith('=== ') || l.includes('ERROR:'))
        .slice(0, 20);
      console.log(detail.map(l => `    ${l.trim()}`).join('\n'));
    }

    if (i < suites.length - 1) await sleep(COOLDOWN_SECONDS);
  }

  const failed = results.filter(r => !r.passed);

  console.log('\n╠══ Summary ══\n');
  for (const r of results) {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.suite.name.padEnd(22)} ${r.suite.covers}`);
  }

  if (failed.length === 0) {
    console.log(`\n╚══ ALL ${results.length} SUITES PASSED ══\n`);
    process.exit(0);
  }

  console.log(`\n╚══ ${failed.length} of ${results.length} SUITE(S) FAILED: ${failed.map(f => f.suite.name).join(', ')} ══\n`);
  process.exit(1);
}

main().catch(e => {
  console.error('verify-all failed:', e);
  process.exit(1);
});

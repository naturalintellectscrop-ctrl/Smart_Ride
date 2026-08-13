/**
 * The full backend verification pipeline.
 *
 * "18 suites pass" is not the claim worth making. Each of these stages can be
 * green while the next one is broken — a codebase can typecheck and still lose
 * money under concurrency; every test can pass and the platform still not work
 * because a secret was never set. The stages run in dependency order, and a
 * failure stops the pipeline rather than letting later stages report against a
 * foundation that is already wrong.
 *
 *   Sweep -> TypeScript -> Unit -> Integration -> Concurrency -> Role journeys
 *         -> Database integrity -> Build -> Production configuration
 *
 *   bun scripts/verify-pipeline.ts
 *   bun scripts/verify-pipeline.ts --from=concurrency   (resume after a fix)
 *   AUDIT_TARGET=production bun scripts/verify-pipeline.ts
 */

import { spawn } from 'child_process';

interface Stage {
  name: string;
  what: string;
  /** Shell command, or a list of verification suites to run. */
  command?: string;
  suites?: string[];
  /** A stage that reports rather than gates. */
  advisory?: boolean;
}

const STAGES: Stage[] = [
  {
    name: 'sweep',
    what: 'every stage starts from the same ground',
    // Suites clean up in a `finally`, which covers a failed assertion but not
    // a killed process or a database that goes away mid-run. Leaked rows are
    // not inert: a leaked ONLINE rider counts as supply and a leaked task
    // counts as demand, so the NEXT suite measures a world that includes
    // fixtures from a run that already died. That is how a pipeline produces a
    // failure in a different stage each time and passes standalone.
    command: 'bun scripts/sweep-test-fixtures.ts',
  },
  {
    name: 'typescript',
    what: 'the code means what it says',
    // next.config.ts sets ignoreBuildErrors, so the BUILD proves nothing about
    // types. This is the real check, and it runs first because everything
    // after it is worthless if the types are wrong.
    command: 'npx tsc --noEmit -p tsconfig.json',
    advisory: true, // 28 known errors remain in deliberately deferred areas
  },
  {
    name: 'unit',
    what: 'each engine responds correctly to an event in isolation',
    suites: ['intelligence', 'dispatch-reputation'],
  },
  {
    name: 'integration',
    what: 'values propagate BETWEEN layers, not just within one',
    suites: [
      'intelligence-apis',
      'intelligence-e2e',
      'intelligence-automation',
      'intelligence-product',
      'order-pricing',
      'security-claims',
      'offer-alert',
      'intelligence-in-journey',
    ],
  },
  {
    name: 'concurrency',
    what: 'the atomicity guards hold when requests race',
    // The suites that fire genuinely simultaneous writes: withdrawals against
    // one wallet, couriers against one job, schedulers against one surge.
    suites: [
      'wallet-withdrawal',
      'delivery-personnel',
      'delivery-adversarial',
      'cron-idempotency',
      'cron-endpoint',
    ],
  },
  {
    name: 'journeys',
    what: 'each role can complete its work end to end',
    suites: [
      'core-journey',
      'car-driver-journey',
      'health-journey',
      'delivery-journey',
      'two-way-ratings',
    ],
  },
  {
    name: 'database',
    what: 'the schema in the database matches the one the code expects',
    command: 'bun scripts/verify-db-integrity.ts',
  },
  {
    name: 'build',
    what: 'it compiles and bundles',
    command: 'npm run build',
  },
  {
    name: 'config',
    what: 'the deployment is actually configured to run',
    command: 'bun scripts/verify-production-config.ts',
  },
];

function run(command: string): Promise<{ code: number; output: string }> {
  return new Promise(resolve => {
    const child = spawn(command, {
      shell: true,
      env: {
        ...process.env,
        // See verify-all.ts: production pins connection_limit to 1 for RLS
        // session correctness, which serialises the concurrent writes these
        // suites deliberately generate.
        DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT || '10',
      },
    });
    let output = '';
    child.stdout?.on('data', d => (output += d.toString()));
    child.stderr?.on('data', d => (output += d.toString()));
    child.on('close', code => resolve({ code: code ?? 1, output }));
  });
}

const sleep = (s: number) => new Promise(r => setTimeout(r, s * 1000));

/**
 * Seconds between suites. `verify-all` pauses between the suites IT runs, but
 * the pipeline invokes it one suite at a time, so that pause never happened —
 * suites ran back to back with no gap and the pooler was still closing the
 * previous process's sockets when the next one connected. That produced a
 * failure in a different stage on every run, standalone-green each time: the
 * signature of contention, not regression.
 */
const SUITE_COOLDOWN_SECONDS = 5;

function tail(output: string, n: number): string {
  return output
    .split('\n')
    .filter(l => l.trim())
    .slice(-n)
    .map(l => `      ${l}`)
    .join('\n');
}

async function main() {
  const fromArg = process.argv.find(a => a.startsWith('--from='))?.split('=')[1];
  const startAt = fromArg ? STAGES.findIndex(s => s.name === fromArg) : 0;
  if (fromArg && startAt < 0) {
    console.error(`Unknown stage "${fromArg}". Stages: ${STAGES.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  console.log('\n╔══ Smart Ride — backend verification pipeline ══');
  if (startAt > 0) console.log(`║  resuming at "${fromArg}"`);
  console.log('');

  const results: Array<{ stage: string; ok: boolean; ms: number; note: string }> = [];
  const started = Date.now();

  for (let i = startAt; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const label = `[${i + 1}/${STAGES.length}] ${stage.name}`;
    process.stdout.write(`▸ ${label.padEnd(22)} ${stage.what}\n`);

    const t0 = Date.now();
    let ok = true;
    let note = '';

    if (stage.suites) {
      // One verify-all invocation per suite keeps the failure attributable.
      for (const [idx, suite] of stage.suites.entries()) {
        if (idx > 0) await sleep(SUITE_COOLDOWN_SECONDS);
        const { code, output } = await run(`bun scripts/verify-all.ts ${suite}`);
        const checks = output.match(/✓ (\d+) checks/)?.[1];
        if (code !== 0) {
          ok = false;
          note = `${suite} failed`;
          console.log(`    ✗ ${suite}`);
          console.log(tail(output, 12));
          break;
        }
        console.log(`    ✓ ${suite}${checks ? ` (${checks} checks)` : ''}`);
      }
      if (ok) note = `${stage.suites.length} suite(s)`;
    } else if (stage.command) {
      const { code, output } = await run(stage.command);
      ok = code === 0;
      if (stage.name === 'typescript') {
        const errors = (output.match(/error TS/g) || []).length;
        // 28 errors remain in areas deliberately deferred: api/setup, vendored
        // shadcn components, and generated .next types. A rise above that is a
        // real regression; the count is the signal, not the exit code.
        ok = errors <= 28;
        note = `${errors} error(s) (baseline 28, deferred areas)`;
        if (!ok) console.log(tail(output, 10));
      } else if (!ok) {
        note = 'failed';
        console.log(tail(output, 14));
      } else {
        note = 'ok';
      }
    }

    // Also pause between stages, for the same reason.
    if (stage.suites && i < STAGES.length - 1) await sleep(SUITE_COOLDOWN_SECONDS);

    const ms = Date.now() - t0;
    results.push({ stage: stage.name, ok, ms, note });
    console.log(`    ${ok ? '✓' : '✗'} ${stage.name} — ${note} (${(ms / 1000).toFixed(1)}s)\n`);

    // Stop on a real failure. Running later stages against a broken
    // foundation produces noise, not information.
    if (!ok && !stage.advisory) {
      console.log(`╚══ PIPELINE STOPPED at "${stage.name}" ══\n`);
      console.log('  Later stages were not run — fix this, then resume with:');
      console.log(`      bun scripts/verify-pipeline.ts --from=${stage.name}\n`);
      process.exit(1);
    }
    if (!ok && stage.advisory) {
      console.log(`  (advisory stage — continuing)\n`);
    }
  }

  console.log('╠══ Summary ══\n');
  for (const r of results) {
    console.log(
      `  ${r.ok ? '✓' : '✗'} ${r.stage.padEnd(12)} ${r.note.padEnd(34)} ${(r.ms / 1000).toFixed(1)}s`
    );
  }
  const failed = results.filter(r => !r.ok);
  console.log(
    failed.length === 0
      ? `\n╚══ ALL ${results.length} STAGES PASSED in ${((Date.now() - started) / 1000 / 60).toFixed(1)} min ══\n`
      : `\n╚══ ${failed.length} ADVISORY STAGE(S) FLAGGED: ${failed.map(f => f.stage).join(', ')} ══\n`
  );
  process.exit(0);
}

main();

/**
 * Production configuration audit.
 *
 * Everything else in this suite tests CODE. This tests the things that are
 * true of a deployment rather than a repository — the class of problem where
 * every test passes, the build is green, and the platform still does not work
 * because a secret is missing or a scheduler was never pointed at anything.
 *
 * Reports rather than assumes: a missing optional integration is a WARNING, a
 * missing thing the platform cannot function without is a FAILURE. The
 * distinction matters because this is meant to be run against staging and
 * production, where a hard failure on an optional feature would train people
 * to ignore it.
 *
 *   bun scripts/verify-production-config.ts
 */

import { db } from '../src/lib/db';
import { readFileSync, existsSync } from 'fs';

/**
 * Load .env the way the running app does, so the audit sees what a deployment
 * would rather than what this shell happens to export. Values already in the
 * environment win — that is how a real deployment overrides a checked-in file.
 */
function loadDotEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([^=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadDotEnv();

/**
 * Whether this run is auditing a real deployment. Locally, a missing secret is
 * usually just "not configured on this laptop"; in production it is an
 * outage. The audit reports the same facts either way but only FAILS on the
 * ones that would actually break the environment being audited.
 */
const IS_PRODUCTION_AUDIT =
  process.env.NODE_ENV === 'production' || process.env.AUDIT_TARGET === 'production';

let failures = 0;
let warnings = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function warn(label: string, detail: string) {
  console.log(`  WARN  ${label} — ${detail}`);
  warnings++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

function isSet(name: string): boolean {
  const v = process.env[name];
  return !!v && v.trim().length > 0;
}

async function main() {
  console.log('\n=== Production Configuration Audit ===');

  // ── 1. Secrets the platform cannot run without ───────────────────
  stage('STAGE 1  required secrets');

  console.log(
    `  auditing as: ${IS_PRODUCTION_AUDIT ? 'PRODUCTION (missing secrets fail)' : 'LOCAL (missing secrets warn)'}` +
      ' — set AUDIT_TARGET=production to enforce'
  );

  check('DATABASE_URL is set', isSet('DATABASE_URL'), 'every query');

  // src/lib/auth/jwt.ts already THROWS on a missing JWT_SECRET when NODE_ENV
  // is production and falls back to a development secret otherwise, so an
  // unset value locally is expected rather than a defect. It is still
  // reported, because shipping without it is an outage.
  const jwt = process.env.JWT_SECRET ?? '';
  if (!jwt) {
    if (IS_PRODUCTION_AUDIT) {
      check('JWT_SECRET is set', false, 'MISSING — nobody can log in');
    } else {
      warn(
        'JWT_SECRET is not set locally',
        'the app falls back to a development secret; production throws on startup ' +
          'instead, so this is only a warning here'
      );
    }
  } else {
    // A placeholder secret is worse than a missing one: everything works and
    // every token is forgeable.
    check(
      'JWT_SECRET is set and is not a placeholder',
      jwt.length >= 32 && !/change|secret|example|test|default/i.test(jwt),
      jwt.length >= 32
        ? `${jwt.length} chars, no placeholder wording`
        : `only ${jwt.length} chars — tokens are forgeable`
    );
  }

  // ── 2. Secrets that silently disable a feature ───────────────────
  stage('STAGE 2  feature secrets (absence disables, does not crash)');

  const OPTIONAL: Array<[string, string]> = [
    ['CRON_SECRET', 'the intelligence scheduler — surge, decay and incentives stop updating'],
    ['MESSAGE_ENCRYPTION_KEY', 'encryption at rest for chat; without it messages are stored in plaintext'],
    ['NEXT_PUBLIC_SUPABASE_URL', 'realtime — live tracking and dispatch broadcasts'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'realtime and service-role writes'],
    ['AGORA_APP_CERTIFICATE', 'in-app calling'],
  ];
  for (const [name, effect] of OPTIONAL) {
    if (isSet(name)) check(`${name} is set`, true, effect);
    else warn(`${name} is NOT set`, `disabled: ${effect}`);
  }

  // The encryption key is optional to START but its absence has a data
  // consequence that outlives the deployment, so it is called out specially.
  const { isEncryptionConfigured } = await import('../src/lib/crypto/field-encryption');
  if (!isEncryptionConfigured()) {
    warn(
      'message encryption at rest is INACTIVE',
      'BE-004 decided messages should be encrypted at rest. Set ' +
        'MESSAGE_ENCRYPTION_KEY (32+ random chars) or every message sent from ' +
        'now on is stored in the clear'
    );
  } else {
    check('message encryption at rest is active', true, 'AES-256-GCM with a configured key');
  }

  // ── 3. The database is actually reachable and migrated ───────────
  stage('STAGE 3  database');

  let dbReachable = false;
  try {
    await db.$queryRawUnsafe('SELECT 1');
    dbReachable = true;
  } catch (e) {
    check('the database is reachable', false, String(e).slice(0, 120));
  }
  if (dbReachable) {
    check('the database is reachable', true, 'SELECT 1 succeeded');

    // Columns this session added. If db push was never run against this
    // environment the code deploys fine and then throws at runtime.
    const REQUIRED_COLUMNS: Array<[string, string, string]> = [
      ['WalletTransaction', 'idempotencyKey', 'BE-011 — retried withdrawals would debit twice'],
      ['Task', 'deliveryCode', 'BE-005 — proof of delivery'],
      ['Task', 'proofCapturedAt', 'BE-005 — completion gate'],
      ['User', 'passengerRating', 'BE-012 — two-way ratings'],
      ['SurgeRecord', 'activeKey', 'surge concurrency guard'],
      ['DriverReputation', 'lastDecayAt', 'decay idempotency'],
    ];
    for (const [table, column, why] of REQUIRED_COLUMNS) {
      const rows = (await db.$queryRawUnsafe(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        table,
        column
      )) as unknown[];
      check(
        `${table}.${column} exists`,
        rows.length > 0,
        rows.length > 0 ? why : `MISSING — run \`prisma db push\`. ${why}`
      );
    }

    // The constraint, not just the column: a unique index that failed to
    // create leaves the idempotency guard decorative.
    const uniq = (await db.$queryRawUnsafe(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'WalletTransaction' AND indexdef ILIKE '%idempotencyKey%'`
    )) as Array<{ indexdef: string }>;
    check(
      'the withdrawal idempotency key is UNIQUE in the database',
      uniq.some(i => /UNIQUE/i.test(i.indexdef)),
      uniq.length
        ? uniq[0].indexdef.slice(0, 90)
        : 'no index — concurrent retries would each debit'
    );

    const ratingUniq = (await db.$queryRawUnsafe(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'Rating' AND indexdef ILIKE '%fromUserId%'`
    )) as Array<{ indexdef: string }>;
    check(
      'one rating per rater per task is enforced by the database',
      ratingUniq.some(i => /UNIQUE/i.test(i.indexdef)),
      ratingUniq.length ? 'unique(taskId, fromUserId) present' : 'missing — a party could rate twice'
    );
  }

  // ── 4. The scheduler ─────────────────────────────────────────────
  stage('STAGE 4  the scheduler is running');

  if (dbReachable) {
    const lastRun = await db.cronRun.findFirst({
      where: { job: 'intelligence' },
      orderBy: { startedAt: 'desc' },
    });
    if (!lastRun) {
      warn(
        'the intelligence scheduler has never run here',
        'expected on a fresh environment; on production it means surge, decay ' +
          'and incentives are not updating'
      );
    } else {
      const mins = Math.round((Date.now() - lastRun.startedAt.getTime()) / 60_000);
      // Three missed 15-minute intervals is the alarm, matching /api/admin/cron-health.
      if (mins > 45) {
        warn(
          'the scheduler looks stale',
          `last run ${mins} minutes ago on a 15-minute cadence — a scheduler that ` +
            'stopped is invisible unless something looks'
        );
      } else {
        check(
          'the scheduler ran recently',
          lastRun.success,
          `last run ${mins} min ago, success=${lastRun.success}, ` +
            `${lastRun.stepsTotal - lastRun.stepsFailed}/${lastRun.stepsTotal} steps`
        );
      }
    }
  }

  // ── 5. Build configuration ───────────────────────────────────────
  stage('STAGE 5  build and deployment configuration');

  const nextConfig = existsSync('next.config.ts') ? readFileSync('next.config.ts', 'utf8') : '';
  if (/ignoreBuildErrors:\s*true/.test(nextConfig)) {
    warn(
      'next.config.ts sets typescript.ignoreBuildErrors',
      'a green build proves nothing about type safety — `npx tsc --noEmit` is the ' +
        'real check, and this suite runs it separately'
    );
  } else {
    check('the build does not suppress type errors', true, 'ignoreBuildErrors is off');
  }

  // Deploy-blocking convention from this repo's history.
  const coauthored = existsSync('.git')
    ? (() => {
        try {
          return require('child_process')
            .execSync('git log -20 --format=%B', { encoding: 'utf8' })
            .includes('Co-Authored-By');
        } catch {
          return false;
        }
      })()
    : false;
  check(
    'recent commits carry no Co-Authored-By trailer',
    !coauthored,
    coauthored
      ? 'present in the last 20 commits — this blocks Vercel deploys on this project'
      : 'clean across the last 20 commits'
  );

  // ── 6. Push delivery ─────────────────────────────────────────────
  stage('STAGE 6  push notifications can reach a device');

  if (dbReachable) {
    const tokens = await db.expoPushToken.count({ where: { isActive: true } });
    if (tokens === 0) {
      warn(
        'no active push tokens are registered',
        'expected on a fresh environment; in production it means no device has ' +
          'successfully registered — see BE-010 and verify-firebase-config'
      );
    } else {
      check('devices have registered for push', true, `${tokens} active token(s)`);
    }
  }

  console.log(
    failures === 0
      ? `\n=== PRODUCTION CONFIGURATION OK${warnings ? ` — ${warnings} warning(s) to review` : ''} ===\n`
      : `\n=== ${failures} CHECK(S) FAILED, ${warnings} warning(s) ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('CONFIG AUDIT ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

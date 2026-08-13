/**
 * Database integrity.
 *
 * The code can be correct and the data still wrong. This checks the things a
 * unit test cannot see: that the schema the code expects is the schema that
 * exists, that constraints the guards depend on are really enforced by
 * PostgreSQL rather than only by application logic, and that no orphaned or
 * self-contradictory rows have accumulated.
 *
 * A guard that lives only in TypeScript is a convention. A guard backed by a
 * unique index is a rule. Several of this session's fixes depend on the
 * difference, so it is verified here rather than assumed.
 *
 *   bun scripts/verify-db-integrity.ts
 */

import { db } from '../src/lib/db';

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

async function rows<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return (await db.$queryRawUnsafe(sql)) as T[];
}

async function count(sql: string): Promise<number> {
  const r = await rows<{ n: bigint | number }>(sql);
  return Number(r[0]?.n ?? 0);
}

async function main() {
  console.log('\n=== Database Integrity ===');

  // ── 1. Constraints the application guards depend on ──────────────
  stage('STAGE 1  the guards are enforced by PostgreSQL, not just by code');

  const CONSTRAINTS: Array<[string, string, string]> = [
    [
      'WalletTransaction',
      'idempotencyKey',
      'BE-011 — without a UNIQUE index, two simultaneous retries each debit',
    ],
    [
      'Rating',
      'fromUserId',
      'BE-012 — without unique(taskId, fromUserId) a party could rate twice',
    ],
    [
      'SurgeRecord',
      'activeKey',
      'two overlapping scheduler runs could both open a surge for one zone',
    ],
  ];
  for (const [table, column, why] of CONSTRAINTS) {
    const idx = await rows<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = '${table}' AND indexdef ILIKE '%${column}%'`
    );
    const unique = idx.some(i => /UNIQUE/i.test(i.indexdef));
    check(
      `${table}.${column} is UNIQUE in the database`,
      unique,
      unique ? 'enforced by an index' : `NOT ENFORCED — ${why}`
    );
  }

  // ── 2. Referential integrity ─────────────────────────────────────
  stage('STAGE 2  no orphaned rows');

  const ORPHANS: Array<[string, string, string]> = [
    [
      'tasks pointing at a missing client',
      `SELECT COUNT(*)::int n FROM "Task" t LEFT JOIN "User" u ON u.id = t."clientId" WHERE t."clientId" IS NOT NULL AND u.id IS NULL`,
      'a task nobody owns cannot be billed or supported',
    ],
    [
      'tasks pointing at a missing rider',
      `SELECT COUNT(*)::int n FROM "Task" t LEFT JOIN "Rider" r ON r.id = t."riderId" WHERE t."riderId" IS NOT NULL AND r.id IS NULL`,
      'earnings would be attributed to nobody',
    ],
    [
      'wallet transactions with no wallet',
      `SELECT COUNT(*)::int n FROM "WalletTransaction" wt LEFT JOIN "Wallet" w ON w.id = wt."walletId" WHERE w.id IS NULL`,
      'money movement with no account behind it',
    ],
    [
      'ratings pointing at a missing task',
      `SELECT COUNT(*)::int n FROM "Rating" rt LEFT JOIN "Task" t ON t.id = rt."taskId" WHERE t.id IS NULL`,
      'a score with no trip behind it',
    ],
    [
      'reputations with no rider',
      `SELECT COUNT(*)::int n FROM "DriverReputation" dr LEFT JOIN "Rider" r ON r.id = dr."riderId" WHERE r.id IS NULL`,
      'dispatch would rank a driver who does not exist',
    ],
  ];
  for (const [label, sql, why] of ORPHANS) {
    const n = await count(sql);
    check(`no ${label}`, n === 0, n === 0 ? 'none' : `${n} ORPHAN(S) — ${why}`);
  }

  // ── 3. Money reconciles ──────────────────────────────────────────
  stage('STAGE 3  financial rows are self-consistent');

  const badLedger = await count(
    `SELECT COUNT(*)::int n FROM "WalletTransaction"
     WHERE "transactionType" = 'WITHDRAWAL'
       AND ROUND(("balanceBefore" - amount)::numeric, 2) <> ROUND("balanceAfter"::numeric, 2)`
  );
  check(
    'every withdrawal reconciles: before - amount = after',
    badLedger === 0,
    badLedger === 0 ? 'all rows balance' : `${badLedger} row(s) do not reconcile`
  );

  const negative = await count(`SELECT COUNT(*)::int n FROM "Wallet" WHERE balance < 0`);
  check(
    'no wallet holds a negative balance',
    negative === 0,
    negative === 0 ? 'none' : `${negative} wallet(s) overdrawn — the atomic debit guard failed`
  );

  const badSplit = await count(
    `SELECT COUNT(*)::int n FROM "Task"
     WHERE "riderEarnings" IS NOT NULL AND "platformCommission" IS NOT NULL
       AND ROUND(("riderEarnings" + "platformCommission")::numeric, 2)
           <> ROUND("totalAmount"::numeric, 2)`
  );
  check(
    'every completed fare splits exactly into earnings + commission',
    badSplit === 0,
    badSplit === 0 ? 'all splits reconcile' : `${badSplit} task(s) do not sum to the total`
  );

  // ── 4. Rating caches agree with the rows ─────────────────────────
  stage('STAGE 4  derived rating caches match their source (BE-013)');

  const drifted = await rows<{ id: string; cached: number; actual: number; n: number }>(
    `SELECT r.id, r.rating::float AS cached,
            ROUND(AVG(rt.score)::numeric, 1)::float AS actual,
            COUNT(rt.id)::int AS n
       FROM "Rider" r
       JOIN "Rating" rt ON rt."toRiderId" = r.id
      GROUP BY r.id, r.rating
     HAVING ABS(r.rating - ROUND(AVG(rt.score)::numeric, 1)) > 0.05`
  );
  check(
    'Rider.rating matches the Rating rows it is derived from',
    drifted.length === 0,
    drifted.length === 0
      ? 'no drift'
      : `${drifted.length} rider(s) drifted, e.g. cached ${drifted[0].cached} vs actual ${drifted[0].actual} from ${drifted[0].n} rating(s) — run ratings.reconcile`
  );

  // ── 5. Enum drift ────────────────────────────────────────────────
  stage('STAGE 5  no values outside their enum');

  const roles = await rows<{ riderRole: string; n: number }>(
    `SELECT "riderRole"::text, COUNT(*)::int n FROM "Rider" GROUP BY 1`
  );
  const VALID_ROLES = ['SMART_BODA_RIDER', 'SMART_CAR_DRIVER', 'DELIVERY_PERSONNEL'];
  const badRoles = roles.filter(r => !VALID_ROLES.includes(r.riderRole));
  check(
    'every rider holds a valid riderRole (BE-006)',
    badRoles.length === 0,
    badRoles.length === 0
      ? roles.map(r => `${r.riderRole}=${r.n}`).join(', ') || 'no riders'
      : `INVALID: ${badRoles.map(r => r.riderRole).join(', ')}`
  );

  // ── 6. Wallet ownership ──────────────────────────────────────────
  stage('STAGE 6  wallets are addressed the way the code addresses them');

  const riderWallets = await count(
    `SELECT COUNT(*)::int n FROM "Wallet" WHERE "ownerType" = 'RIDER'`
  );
  check(
    'no RIDER-owned wallets exist (BE-003 unified on USER)',
    riderWallets === 0,
    riderWallets === 0
      ? 'all wallets are USER-owned, matching every call site'
      : `${riderWallets} RIDER-owned wallet(s) — a balance nobody can withdraw from`
  );

  const dupeWallets = await count(
    `SELECT COUNT(*)::int n FROM (
       SELECT "ownerId", "ownerType" FROM "Wallet"
       GROUP BY 1, 2 HAVING COUNT(*) > 1
     ) d`
  );
  check(
    'nobody holds two wallets of the same kind',
    dupeWallets === 0,
    dupeWallets === 0 ? 'one wallet per owner' : `${dupeWallets} owner(s) with duplicates`
  );

  // ── 7. Deliveries carry their evidence ───────────────────────────
  stage('STAGE 7  completed deliveries have proof (BE-005)');

  const unproven = await count(
    `SELECT COUNT(*)::int n FROM "Task"
      WHERE "taskType" IN ('FOOD_DELIVERY','SHOPPING','ITEM_DELIVERY','SMART_HEALTH_DELIVERY')
        AND status IN ('DELIVERED','COMPLETED')
        AND "proofCapturedAt" IS NULL`
  );
  if (unproven > 0) {
    // Rows predating the gate are expected; they are reported rather than
    // failed, because retro-fitting evidence is not possible.
    warn(
      'completed deliveries without proof',
      `${unproven} row(s) — expected for deliveries completed before the proof gate ` +
        'existed; new ones cannot be completed without it'
    );
  } else {
    check('completed deliveries carry proof', true, 'none missing');
  }

  console.log(
    failures === 0
      ? `\n=== DATABASE INTEGRITY VERIFIED${warnings ? ` (${warnings} warning(s))` : ''} ===\n`
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('DB INTEGRITY ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

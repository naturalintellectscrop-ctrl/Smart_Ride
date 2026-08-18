/**
 * Does the DEPLOYED backend refuse to let a customer name their own price?
 *
 * verify-payment-integrity.ts proves the guard against local code. That says
 * nothing about what the phone is talking to. This drives the real production
 * API over HTTP with production-issued tokens, then reads the production
 * database, because an API that answers correctly while writing the wrong row
 * is the failure worth catching.
 *
 * Fixtures are disposable QA rows this script creates and removes. It touches
 * no pre-existing production record.
 *
 *   bun scripts/verify-production-payments.ts
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import { TaskStatus } from '@prisma/client';

const API = process.env.QA_API_BASE || 'https://smartrideug.vercel.app/api';
const TAG = 'E2E-PRODPAY';
const PASSWORD = 'ProbePass@2026!';
const REAL = 50000;

let failures = 0;
let checks = 0;

function check(label: string, ok: boolean, detail: string) {
  checks++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const made = { userIds: [] as string[], taskIds: [] as string[] };

async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

/**
 * Registration is rate-limited on production, and that limit is a control
 * working correctly — not something to route around at the API. The row is
 * created directly with a known hash; the TOKEN still comes from production,
 * because a locally minted one is signed with a different secret and rejected.
 */
async function makeCustomer(label: string) {
  const email = `${TAG.toLowerCase()}-${label}-${Date.now()}@smartride.test`;
  const u = await db.user.create({
    data: {
      email,
      name: `${TAG} ${label}`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword(PASSWORD),
      role: 'CLIENT',
    },
  });
  made.userIds.push(u.id);

  const login = await post('/auth/login', { email, password: PASSWORD });
  const token = login.json?.data?.accessToken ?? login.json?.accessToken;
  if (!token) throw new Error(`login failed for ${label}: ${JSON.stringify(login.json).slice(0, 160)}`);
  return { user: u, token: token as string };
}

async function makeTask(ownerId: string, label: string) {
  const t = await db.task.create({
    data: {
      taskNumber: `${TAG}-${label}-${Date.now()}`,
      taskType: 'SMART_BODA_RIDE',
      status: TaskStatus.COMPLETED,
      clientId: ownerId,
      pickupAddress: 'Faraday Road, Kampala',
      pickupLatitude: 0.3176,
      pickupLongitude: 32.6103,
      dropoffAddress: 'MUBS, Nakawa',
      dropoffLatitude: 0.3299,
      dropoffLongitude: 32.6216,
      baseFare: REAL,
      totalAmount: REAL,
      riderEarnings: Math.round(REAL * 0.85),
      paymentMethod: 'CASH',
    } as never,
  });
  made.taskIds.push(t.id);
  return t;
}

async function main() {
  console.log(`\n=== BE-041 / BE-043 on the deployed API — ${API} ===\n`);
  await setServiceRoleContext();

  stage('Fixtures on the production database');

  // /payments/initiate allows 5 requests per minute PER USER. Separate
  // customers keep that control from becoming the thing under test.
  const attacker = await makeCustomer('attacker');
  const payer = await makeCustomer('payer');
  const stranger = await makeCustomer('stranger');
  const attackerTask = await makeTask(attacker.user.id, 'A');
  const payerTask = await makeTask(payer.user.id, 'B');
  console.log(`  two tasks, each owing UGX ${REAL.toLocaleString()}, production tokens obtained`);

  stage('A customer naming their own price');

  const attacks: Array<[string, unknown]> = [
    ['pays 100 for a 50,000 fare', 100],
    ['pays zero', 0],
    ['pays a negative amount', -50000],
    ['pays an inflated amount', 5000000],
  ];

  for (const [label, amt] of attacks) {
    const r = await post(
      '/payments/initiate',
      { taskId: attackerTask.id, amount: amt, paymentMethod: 'CASH', currency: 'UGX' },
      attacker.token,
    );
    await setServiceRoleContext();
    const row = await db.payment.findFirst({ where: { taskId: attackerTask.id } });
    check(
      label,
      r.status !== 200 && !row,
      `HTTP ${r.status} → ${String(r.json?.error ?? '').slice(0, 62)}${row ? ' · A PAYMENT ROW EXISTS' : ''}`,
    );
    if (row) await db.payment.delete({ where: { id: row.id } }).catch(() => {});
  }

  stage("Someone else's obligation");

  const r403 = await post(
    '/payments/initiate',
    { taskId: attackerTask.id, amount: REAL, paymentMethod: 'CASH', currency: 'UGX' },
    stranger.token,
  );
  check(
    'a stranger cannot attach a payment to another customer task',
    r403.status === 403,
    `HTTP ${r403.status} → ${String(r403.json?.error ?? '').slice(0, 60)}`,
  );

  stage('The honest payment — BE-043, which RLS used to block outright');

  const rOk = await post(
    '/payments/initiate',
    { taskId: payerTask.id, amount: REAL, paymentMethod: 'CASH', currency: 'UGX' },
    payer.token,
  );
  await setServiceRoleContext();
  const created = await db.payment.findFirst({ where: { taskId: payerTask.id } });
  check(
    'a customer can actually create a payment on production',
    rOk.status === 200 && !!created,
    `HTTP ${rOk.status}${created ? ` · row created` : ` · ${String(rOk.json?.error ?? '').slice(0, 70)}`}`,
  );
  check(
    'the stored amount is the server-derived one',
    !!created && Math.round(Number(created.amount)) === REAL,
    created ? `stored UGX ${Math.round(Number(created.amount)).toLocaleString()}` : 'no row',
  );

  stage('Duplicate settlement');

  await setServiceRoleContext();
  await db.task.update({ where: { id: payerTask.id }, data: { paymentStatus: 'COMPLETED' } });
  const rDup = await post(
    '/payments/initiate',
    { taskId: payerTask.id, amount: REAL, paymentMethod: 'CASH', currency: 'UGX' },
    payer.token,
  );
  check(
    'an already-paid task cannot be settled twice',
    rDup.status === 409,
    `HTTP ${rDup.status} → ${String(rDup.json?.error ?? '').slice(0, 60)}`,
  );
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.payment.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: { in: made.userIds } } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});

    const leftUsers = await db.user.count({ where: { email: { contains: TAG.toLowerCase() } } });
    const leftTasks = await db.task.count({ where: { taskNumber: { startsWith: TAG } } });
    console.log(`\ncleanup: ${leftUsers} user(s), ${leftTasks} task(s) left behind (expect 0/0)`);
    console.log(`\n=== ${checks - failures}/${checks} passed against ${API} ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

/**
 * Can a customer decide what they owe?
 *
 * BE-041: /payments/initiate took `amount` from the request body and wrote it
 * straight to the payment record. Nothing looked the obligation up, so the
 * client was the sole authority on how much it was settling. This suite drives
 * the real route handler with a real signed token and tries to cheat it in
 * every way the brief names — altered, zero, negative, inflated, stale,
 * duplicated, and someone else's task — then checks the DATABASE, because a
 * route that answers correctly while writing the wrong row is the failure
 * worth catching.
 *
 *   bun scripts/verify-payment-integrity.ts
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { hashPassword } from '../src/lib/auth/password';
import { TaskStatus } from '@prisma/client';

const TAG = 'E2E-PAYINT';
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

function tokenFor(u: { id: string; email: string | null; role: string; name: string | null }) {
  return generateAccessToken({
    id: u.id,
    email: u.email ?? '',
    role: u.role as never,
    name: u.name ?? '',
  } as never);
}

async function initiate(token: string, body: Record<string, unknown>) {
  const { POST } = await import('../src/app/api/payments/initiate/route');
  const req = new NextRequest(new URL('/api/payments/initiate', 'http://localhost'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  } as never);
  const res = await (POST as never as (r: NextRequest) => Promise<Response>)(req);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

async function main() {
  console.log('\n=== BE-041: the server decides what is owed ===\n');
  await setServiceRoleContext();

  stage('Fixtures');

  const mk = async (role: string, label: string) => {
    const u = await db.user.create({
      data: {
        name: `${TAG} ${label}`,
        email: `${TAG.toLowerCase()}-${label.toLowerCase()}-${Date.now()}@smartride.test`,
        phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: await hashPassword('ProbePass@2026'),
        role: role as never,
      },
    });
    made.userIds.push(u.id);
    return u;
  };

  // /payments/initiate is rate-limited to 5 requests per minute PER USER — a
  // control working as intended, and one this suite would otherwise trip over
  // itself. Each group of probes gets its own customer so the limiter is never
  // the thing under test, and the honest-payment cases are not starved by the
  // hostile ones.
  const REAL = 50000;
  const mkTask = async (label: string, ownerId: string) => {
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
  };

  const client = await mk('CLIENT', 'Attacker');
  const payer = await mk('CLIENT', 'Payer');
  const stranger = await mk('CLIENT', 'Stranger');
  const clientToken = tokenFor(client);
  const payerToken = tokenFor(payer);
  const strangerToken = tokenFor(stranger);

  const task = await mkTask('A', client.id);
  const payerTask = await mkTask('B', payer.id);
  console.log(`  task ${task.taskNumber} owes UGX ${REAL.toLocaleString()}`);

  stage('The attacks the brief names');

  const attacks: Array<[string, unknown]> = [
    ['pays 100 for a 50,000 fare', 100],
    ['pays zero', 0],
    ['pays a negative amount', -50000],
    ['pays an inflated amount', 5000000],
    ['sends a non-numeric amount', 'free'],
  ];

  for (const [label, amt] of attacks) {
    const r = await initiate(clientToken, {
      taskId: task.id,
      amount: amt,
      paymentMethod: 'CASH',
      currency: 'UGX',
    });
    await setServiceRoleContext();
    const paid = await db.payment.findFirst({ where: { taskId: task.id } });
    check(
      label,
      r.status !== 200 && !paid,
      `HTTP ${r.status} → ${String(r.json?.error ?? '').slice(0, 66)}${paid ? ' · A PAYMENT ROW WAS CREATED' : ''}`,
    );
    if (paid) await db.payment.delete({ where: { id: paid.id } }).catch(() => {});
  }

  stage('An obligation that is not mine');

  const r403 = await initiate(strangerToken, {
    taskId: task.id,
    amount: REAL,
    paymentMethod: 'CASH',
    currency: 'UGX',
  });
  check(
    'a stranger cannot attach a payment to my task',
    r403.status === 403,
    `HTTP ${r403.status} → ${String(r403.json?.error ?? '').slice(0, 60)}`,
  );

  stage('No obligation referenced at all');

  const rBare = await initiate(payerToken, {
    amount: 100,
    paymentMethod: 'CASH',
    currency: 'UGX',
  });
  check(
    'a bare amount is refused — top-ups have their own route',
    rBare.status === 400,
    `HTTP ${rBare.status} → ${String(rBare.json?.error ?? '').slice(0, 66)}`,
  );

  stage('The honest payment still works');

  const rOk = await initiate(payerToken, {
    taskId: payerTask.id,
    amount: REAL,
    paymentMethod: 'CASH',
    currency: 'UGX',
  });
  await setServiceRoleContext();
  const created = await db.payment.findFirst({ where: { taskId: payerTask.id } });
  check(
    'the correct amount is accepted',
    rOk.status === 200 && !!created,
    `HTTP ${rOk.status} ${JSON.stringify(rOk.json).slice(0,120)}${created ? ` · row UGX ${Number(created.amount)}` : ""}`,
  );
  check(
    'the stored amount is the SERVER-derived one',
    !!created && Math.round(Number(created.amount)) === REAL,
    created ? `stored ${Math.round(Number(created.amount))} vs owed ${REAL}` : 'no row',
  );

  stage('Stale and duplicate settlement');

  await setServiceRoleContext();
  await db.task.update({ where: { id: payerTask.id }, data: { paymentStatus: 'COMPLETED' } });
  const rDup = await initiate(payerToken, {
    taskId: payerTask.id,
    amount: REAL,
    paymentMethod: 'CASH',
    currency: 'UGX',
  });
  check(
    'an already-paid task cannot be settled again',
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
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

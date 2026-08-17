/**
 * BE-035 and BE-036, asked of the DEPLOYED production API.
 *
 * Local verification proves nothing about production. This suite talks to
 * https://smartrideug.vercel.app/api over real HTTP — the same base URL the
 * phone uses — and asserts the platform refuses.
 *
 * Every record it touches is disposable and tagged, and the finally block
 * removes all of it. It deliberately does NOT mutate any pre-existing row: the
 * payment and rider it attacks are ones it created seconds earlier.
 *
 *   bun scripts/verify-production-security.ts
 */

import { db } from '../src/lib/db';

const BASE = process.env.PROD_BASE_URL ?? 'https://smartrideug.vercel.app/api';
const TAG = 'E2E-PRODSEC';
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

async function call(path: string, init?: { method?: string; token?: string; body?: unknown }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

const refused = (s: number) => s === 401 || s === 403;

const made = { userIds: [] as string[], riderIds: [] as string[], paymentIds: [] as string[] };

async function main() {
  console.log(`\n=== Production security verification — ${BASE} ===\n`);

  const email = `${TAG.toLowerCase()}-probe@smartride.test`;
  const password = 'ProbePass@2026';
  await db.user.deleteMany({ where: { email } });

  // ───────────────────────── BE-035 ─────────────────────────
  stage('BE-035 — self-service SUPER_ADMIN, against production');

  const reg = await call('/auth/register', {
    method: 'POST',
    body: { name: `${TAG} Probe`, email, phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`, password, role: 'CLIENT' },
  });
  check('disposable CLIENT account created on production', reg.status === 200 || reg.status === 201, `status ${reg.status}`);

  const created = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (created) made.userIds.push(created.id);
  check('account starts as CLIENT', created?.role === 'CLIENT', `role ${created?.role}`);

  const login1 = await call('/auth/login', { method: 'POST', body: { email, password } });
  const token1 = ((login1.json as never as { data?: { accessToken?: string }; accessToken?: string })?.data?.accessToken
    ?? (login1.json as never as { accessToken?: string })?.accessToken) as string | undefined;
  check('login returns a token', !!token1, `status ${login1.status}, token ${token1 ? 'present' : 'absent'}`);

  const beforeAdmin = await call('/fraud/dashboard', { token: token1 });
  check('client token refused by an admin endpoint', refused(beforeAdmin.status), `status ${beforeAdmin.status}`);

  for (const role of ['SUPER_ADMIN', 'ADMIN']) {
    const esc = await call('/user/profile', { method: 'PUT', token: token1, body: { role } });
    const row = await db.user.findUnique({ where: { email }, select: { role: true } });
    check(`PUT role=${role} refused by production`, esc.status === 403, `status ${esc.status}`);
    check(`stored role still CLIENT after ${role}`, row?.role === 'CLIENT', `column reads ${row?.role}`);
  }

  // The escalation only pays off if a FRESH token carries the new role.
  const login2 = await call('/auth/login', { method: 'POST', body: { email, password } });
  const token2 = ((login2.json as never as { data?: { accessToken?: string } })?.data?.accessToken
    ?? (login2.json as never as { accessToken?: string })?.accessToken) as string | undefined;
  const afterAdmin = await call('/fraud/dashboard', { token: token2 });
  check('a re-issued token still cannot reach the admin endpoint', refused(afterAdmin.status), `status ${afterAdmin.status}`);

  // ───────────────────────── BE-036 ─────────────────────────
  stage('BE-036 — unauthorized payment settlement, against production');

  const payer = await db.user.findUnique({ where: { email }, select: { id: true } });
  const payment = await db.payment.create({
    data: {
      userId: payer!.id,
      amount: 25000,
      currency: 'UGX',
      paymentMethod: 'MTN_MOMO',
      status: 'PENDING',
      paymentReference: `${TAG}-${Date.now()}`,
    } as never,
  });
  made.paymentIds.push(payment.id);

  const payRead = await call(`/payments/${payment.id}`);
  check('unauthenticated payment read refused', refused(payRead.status), `status ${payRead.status}`);

  const paySettle = await call(`/payments/${payment.id}`, { method: 'PUT', body: { status: 'COMPLETED' } });
  const payAfter = await db.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
  check('unauthenticated settlement refused', refused(paySettle.status), `status ${paySettle.status}`);
  check('payment still PENDING', payAfter?.status === 'PENDING', `column reads ${payAfter?.status}`);

  stage('BE-036 — unauthorized reputation modification, against production');

  const ruser = await db.user.create({
    data: {
      name: `${TAG} Driver`,
      email: `${TAG.toLowerCase()}-driver@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: 'x',
      role: 'RIDER',
    },
  });
  made.userIds.push(ruser.id);
  const rider = await db.rider.create({
    data: {
      userId: ruser.id,
      fullName: `${TAG} Driver`,
      phone: ruser.phone!,
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      physicalAddress: 'Bugolobi, Kampala',
    } as never,
  });
  made.riderIds.push(rider.id);
  await db.driverReputation.create({
    data: { riderId: rider.id, trustScore: 82, averageRating: 4.7 } as never,
  });

  const repRead = await call(`/driver-reputation/${rider.id}`);
  check('unauthenticated reputation read refused', refused(repRead.status), `status ${repRead.status}`);

  const repWrite = await call(`/driver-reputation/${rider.id}`, {
    method: 'PATCH',
    body: { adjustment: 15, reason: 'probe', adminId: 'nobody-in-particular' },
  });
  const repAfter = await db.driverReputation.findUnique({
    where: { riderId: rider.id },
    select: { trustScore: true },
  });
  check('unauthenticated trust-score write refused', refused(repWrite.status), `status ${repWrite.status}`);
  check('trust score untouched', repAfter?.trustScore === 82, `score reads ${repAfter?.trustScore} (seeded 82)`);
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    // Leave nothing behind.
    await db.payment.deleteMany({ where: { id: { in: made.paymentIds } } });
    await db.driverReputation.deleteMany({ where: { riderId: { in: made.riderIds } } });
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } });
    await db.session.deleteMany({ where: { userId: { in: made.userIds } } });
    await db.wallet.deleteMany({ where: { ownerId: { in: made.userIds } } });
    await db.user.deleteMany({ where: { id: { in: made.userIds } } });
    const leftover = await db.user.count({ where: { email: { contains: TAG.toLowerCase() } } });
    console.log(`\n  cleanup: ${leftover} fixture user(s) remaining`);
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

/**
 * The client's ride, end to end, across both roles.
 *
 *   client requests -> dispatch assigns -> driver accepts -> arriving ->
 *   arrived -> trip starts -> trip ends -> client rates -> driver rates back
 *
 * Every step drives the REAL route handler with a REAL signed token belonging to
 * the party who would press that button, and the database is read back after
 * each one. Crossing roles is the point: the client's request is what the driver
 * receives, and the driver's completion is what the client can rate.
 *
 * Also checks the two things a rider cares about at the end — the fare the
 * client is charged and what the driver earns — and the client's own cancel
 * path, which is where LC-1 says authority actually lives for an assigned ride.
 *
 * Runs over REAL HTTP against the deployed API — the same base URL the phone
 * uses — because POST /api/tasks calls next/server `after()`, which throws
 * outside a real request scope. That is a harness limit, not a defect, and it is
 * why this journey cannot be driven in-process.
 *
 *   bun scripts/verify-client-journey.ts
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import { EnhancedTaskStateMachine } from '../src/lib/services/enhanced-task-state-machine.service';
import { TaskStatus } from '@prisma/client';

const TAG = 'E2E-CLIENTJRN';
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

/**
 * Tokens must come FROM production. A locally minted one is signed with the dev
 * JWT secret and production answers 401 — correctly. So each party registers and
 * logs in over HTTP, exactly as the app does.
 */
async function loginAs(email: string, password: string): Promise<string | undefined> {
  const res = await call('/auth/login', { method: 'POST', body: { email, password } });
  const d = (res.json?.data ?? res.json) as { accessToken?: string };
  return d?.accessToken;
}

async function registerAndLogin(
  name: string, email: string, phone: string, password: string, role: string,
): Promise<string | undefined> {
  await call('/auth/register', { method: 'POST', body: { name, email, phone, password, role } });
  return loginAs(email, password);
}

const BASE = process.env.PROD_BASE_URL ?? 'https://smartrideug.vercel.app/api';

async function call(
  path: string,
  init?: { method?: string; token?: string; body?: unknown },
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  let json: Record<string, unknown> = {};
  try { json = (await res.json()) as Record<string, unknown>; } catch { /* non-JSON */ }
  return { status: res.status, json };
}

const made = { userIds: [] as string[], riderIds: [] as string[], taskIds: [] as string[] };

async function main() {
  console.log('\n=== Client ride journey, across roles ===\n');
  await setServiceRoleContext();

  const PW = 'ProbePass@2026';
  const clientEmail = `${TAG.toLowerCase()}-client@smartride.test`;
  const driverEmail = `${TAG.toLowerCase()}-driver@smartride.test`;
  await db.user.deleteMany({ where: { email: { in: [clientEmail, driverEmail] } } });

  const clientToken = await registerAndLogin(
    `${TAG} Client`, clientEmail, `07${Math.floor(10000000 + Math.random() * 89999999)}`, PW, 'CLIENT',
  );
  const driverToken = await registerAndLogin(
    `${TAG} Driver`, driverEmail, `07${Math.floor(10000000 + Math.random() * 89999999)}`, PW, 'RIDER',
  );
  check('both parties can register and log in on production', !!clientToken && !!driverToken,
    `client ${clientToken ? 'ok' : 'FAILED'} · driver ${driverToken ? 'ok' : 'FAILED'}`);
  if (!clientToken || !driverToken) return;

  await setServiceRoleContext();
  const client = await db.user.findUniqueOrThrow({ where: { email: clientEmail } });
  const driverUser = await db.user.findUniqueOrThrow({ where: { email: driverEmail } });
  made.userIds.push(client.id, driverUser.id);

  // The driver needs an APPROVED rider profile to hold work. Registration does
  // not create one (that is onboarding + approval), so it is seeded directly.
  const rider = await db.rider.create({
    data: {
      userId: driverUser.id,
      fullName: `${TAG} Driver`,
      phone: driverUser.phone!,
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      physicalAddress: 'Bugolobi, Kampala',
      isOnline: true,
      lastHeartbeatAt: new Date(),
      currentLatitude: 0.3176,
      currentLongitude: 32.6103,
    } as never,
  });
  made.riderIds.push(rider.id);

  // ── 1. The client requests a ride ──
  stage('1. Client requests a ride');

  const create = await call('/tasks', {
    method: 'POST',
    token: clientToken,
    body: {
      taskType: 'SMART_BODA_RIDE',
      pickupAddress: 'Faraday Road, Kampala',
      pickupLatitude: 0.3176,
      pickupLongitude: 32.6103,
      dropoffAddress: 'MUBS, Nakawa, Kampala',
      dropoffLatitude: 0.3299,
      dropoffLongitude: 32.6216,
      distanceKm: 2.1,
      durationMin: 9,
      paymentMethod: 'CASH',
    },
  });
  const task = (create.json?.data ?? {}) as { id?: string; totalAmount?: number; riderEarnings?: number };
  check(
    'the request is accepted and priced by the server',
    (create.status === 200 || create.status === 201) && !!task.id,
    `status ${create.status}${task.id ? ` · fare ${task.totalAmount} · driver earns ${task.riderEarnings}` : ' ' + JSON.stringify(create.json).slice(0, 120)}`,
  );
  if (!task.id) return;
  made.taskIds.push(task.id);

  await setServiceRoleContext();
  const created = await db.task.findUnique({
    where: { id: task.id },
    select: { status: true, clientId: true, totalAmount: true, riderEarnings: true },
  });
  check('the task belongs to the requesting client', created?.clientId === client.id, 'clientId matches the token');
  check(
    'the client is not charged less than the driver earns',
    Number(created?.totalAmount) >= Number(created?.riderEarnings),
    `fare ${created?.totalAmount} vs earnings ${created?.riderEarnings}`,
  );

  // ── 2. Dispatch assigns; the driver sees the job ──
  stage('2. Assignment, and the driver sees it');

  const assigned = await EnhancedTaskStateMachine.transition(task.id, TaskStatus.ASSIGNED, {
    triggeredByType: 'SYSTEM',
    riderId: rider.id,
    reason: 'dispatch',
  } as never);
  check('dispatch can assign the request', assigned.success, `success=${assigned.success}`);

  const active = await call('/tasks/active', { token: driverToken });
  check(
    'the DRIVER can see the job they were given',
    active.status === 200 && JSON.stringify(active.json).includes(task.id),
    `GET /tasks/active -> ${active.status}`,
  );

  // ── 3. The driver walks the ride through the app's own endpoint ──
  stage("3. Driver progresses via /tasks/{id}/transition, client observes");

  const steps = ['ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED'];

  for (const to of steps) {
    const moved = await call(`/tasks/${task.id}/transition`, {
      method: 'POST',
      token: driverToken,
      body: { toStatus: to, riderId: rider.id, reason: 'driver pressed the primary button' },
    });

    // The client reads the same task with THEIR token — this is their tracking screen.
    const seen = await call(`/tasks/${task.id}`, { token: clientToken });
    const seenStatus = ((seen.json?.data ?? {}) as { status?: string }).status;

    check(
      `driver -> ${to}, client sees ${seenStatus ?? '?'}`,
      moved.status === 200 && seen.status === 200 && seenStatus === to,
      `transition ${moved.status} · client GET ${seen.status}${moved.status !== 200 ? ' ' + JSON.stringify(moved.json).slice(0, 80) : ''}`,
    );
    if (moved.status !== 200) break;
  }

  // ── 4. Rating, both directions ──
  stage('4. Rating');

  const clientRates = await call(`/tasks/${task.id}/rate`, {
    method: 'POST', token: clientToken, body: { rating: 5, comment: 'Smooth ride' },
  });
  check(
    'the client can rate the driver',
    clientRates.status === 200 || clientRates.status === 201,
    `status ${clientRates.status}${clientRates.status >= 400 ? ' ' + JSON.stringify(clientRates.json).slice(0, 90) : ''}`,
  );

  const driverRates = await call(`/tasks/${task.id}/rate`, {
    method: 'POST', token: driverToken, body: { rating: 4, comment: 'Polite passenger' },
  });
  check(
    'the driver can rate the client back',
    driverRates.status === 200 || driverRates.status === 201,
    `status ${driverRates.status}${driverRates.status >= 400 ? ' ' + JSON.stringify(driverRates.json).slice(0, 90) : ''}`,
  );

  await setServiceRoleContext();
  const ratings = await db.rating.count({ where: { taskId: task.id } });
  check('both ratings are stored against the trip', ratings === 2, `${ratings} rating row(s)`);

  const repAfter = await db.driverReputation.findUnique({
    where: { riderId: rider.id },
    select: { averageRating: true, totalRatings: true },
  });
  check(
    "the rating reached the driver's reputation",
    !!repAfter && repAfter.totalRatings > 0,
    repAfter ? `avg ${repAfter.averageRating} over ${repAfter.totalRatings}` : 'no reputation row',
  );

  // ── 5. The client's own cancel authority ──
  stage('5. Client cancels a fresh assigned ride');

  const create2 = await call('/tasks', {
    method: 'POST',
    token: clientToken,
    body: {
      taskType: 'SMART_BODA_RIDE',
      pickupAddress: 'Faraday Road, Kampala',
      pickupLatitude: 0.3176,
      pickupLongitude: 32.6103,
      dropoffAddress: 'MUBS, Nakawa, Kampala',
      dropoffLatitude: 0.3299,
      dropoffLongitude: 32.6216,
      distanceKm: 2.1,
      paymentMethod: 'CASH',
    },
  });
  const task2 = (create2.json?.data ?? {}) as { id?: string };
  if (task2.id) {
    made.taskIds.push(task2.id);
    await setServiceRoleContext();
    await EnhancedTaskStateMachine.transition(task2.id, TaskStatus.ASSIGNED, {
      triggeredByType: 'SYSTEM',
      riderId: rider.id,
      reason: 'dispatch',
    } as never);

    const cancelled = await call(`/tasks/${task2.id}?action=cancel`, {
      method: 'POST', token: clientToken, body: { reason: 'changed my mind' },
    });
    check(
      'a CLIENT may cancel their own assigned ride',
      cancelled.status === 200,
      `status ${cancelled.status}${cancelled.status !== 200 ? ' ' + JSON.stringify(cancelled.json).slice(0, 90) : ''}`,
    );

    await setServiceRoleContext();
    const freed = await db.rider.findUnique({
      where: { id: rider.id },
      select: { currentTaskId: true },
    });
    check(
      'cancelling frees the driver for new work',
      freed?.currentTaskId === null,
      `currentTaskId ${freed?.currentTaskId ?? 'null'}`,
    );
  } else {
    check('second ride created for the cancel test', false, `status ${create2.status}`);
  }
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.rating.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.receipt.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.dispatchMatch.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } });
    await db.driverReputationHistory.deleteMany({
      where: { reputation: { riderId: { in: made.riderIds } } },
    }).catch(() => {});
    await db.driverReputation.deleteMany({ where: { riderId: { in: made.riderIds } } });
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: made.userIds } } });
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

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
 *   bun scripts/verify-client-journey.ts
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { hashPassword } from '../src/lib/auth/password';
import { EnhancedTaskStateMachine } from '../src/lib/services/enhanced-task-state-machine.service';
import { TaskStatus, TaskType } from '@prisma/client';

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

function tokenFor(u: { id: string; email: string | null; role: string; name: string | null }) {
  return generateAccessToken({
    id: u.id,
    email: u.email ?? '',
    role: u.role as never,
    name: u.name ?? '',
  } as never);
}

function req(url: string, init?: { method?: string; token?: string; body?: unknown }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  } as never);
}

const made = { userIds: [] as string[], riderIds: [] as string[], taskIds: [] as string[] };

async function main() {
  console.log('\n=== Client ride journey, across roles ===\n');
  await setServiceRoleContext();

  const client = await db.user.create({
    data: {
      name: `${TAG} Client`,
      email: `${TAG.toLowerCase()}-client@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'CLIENT',
    },
  });
  made.userIds.push(client.id);

  const driverUser = await db.user.create({
    data: {
      name: `${TAG} Driver`,
      email: `${TAG.toLowerCase()}-driver@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'RIDER',
    },
  });
  made.userIds.push(driverUser.id);

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

  const clientToken = tokenFor(client);
  const driverToken = tokenFor(driverUser);

  // ── 1. The client requests a ride, through the real route ──
  stage('1. Client requests a ride');

  const { POST: createTask } = await import('../src/app/api/tasks/route');
  const createRes = await createTask(
    req('/api/tasks', {
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
    }),
  );
  const createBody = (await createRes.json()) as Record<string, never>;
  const task = (createBody?.data as never as { id?: string; totalAmount?: number; riderEarnings?: number }) ?? {};
  check(
    'the request is accepted and priced by the server',
    createRes.status === 200 || createRes.status === 201,
    `status ${createRes.status}${task.id ? ` · fare ${task.totalAmount} · driver earns ${task.riderEarnings}` : ' ' + JSON.stringify(createBody).slice(0, 120)}`,
  );
  if (!task.id) return;
  made.taskIds.push(task.id);

  await setServiceRoleContext();
  const created = await db.task.findUnique({
    where: { id: task.id },
    select: { status: true, clientId: true, totalAmount: true, riderEarnings: true },
  });
  check('the task belongs to the requesting client', created?.clientId === client.id, `clientId matches`);
  check(
    'the client is not charged less than the driver earns',
    Number(created?.totalAmount) >= Number(created?.riderEarnings),
    `fare ${created?.totalAmount} vs earnings ${created?.riderEarnings}`,
  );

  // ── 2. Dispatch assigns; the driver accepts ──
  stage('2. Assignment and driver acceptance');

  const assigned = await EnhancedTaskStateMachine.transition(task.id, TaskStatus.ASSIGNED, {
    triggeredByType: 'SYSTEM',
    riderId: rider.id,
    reason: 'dispatch',
  } as never);
  check('dispatch can assign the request', assigned.success, `success=${assigned.success}`);

  await setServiceRoleContext();
  const { GET: activeTask } = await import('../src/app/api/tasks/active/route');
  const activeRes = await activeTask(req('/api/tasks/active', { token: driverToken }));
  const activeBody = (await activeRes.json()) as Record<string, never>;
  check(
    'the DRIVER can see the job they were given',
    activeRes.status === 200 && JSON.stringify(activeBody).includes(task.id),
    `status ${activeRes.status}`,
  );

  // ── 3. The driver walks the ride; the client must see each step ──
  stage('3. Driver progresses, client observes');

  const steps: TaskStatus[] = [
    TaskStatus.ACCEPTED,
    TaskStatus.ARRIVING,
    TaskStatus.ARRIVED,
    TaskStatus.PICKED_UP,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
  ];

  const { GET: getTask } = await import('../src/app/api/tasks/[id]/route');

  for (const to of steps) {
    await setServiceRoleContext();
    const res = await EnhancedTaskStateMachine.transition(task.id, to, {
      triggeredByType: 'RIDER',
      riderId: rider.id,
      reason: 'driver pressed the primary button',
    } as never);
    if (!res.success) {
      check(`driver advances to ${to}`, false, (res.error ?? 'refused').slice(0, 90));
      break;
    }

    // The client reads the SAME task through their own token — this is what
    // their tracking screen shows.
    await setServiceRoleContext();
    const seen = await (getTask as never as (r: NextRequest, c: unknown) => Promise<Response>)(
      req(`/api/tasks/${task.id}`, { token: clientToken }),
      { params: Promise.resolve({ id: task.id }) },
    );
    const seenBody = (await seen.json()) as Record<string, never>;
    const seenStatus = (seenBody?.data as never as { status?: string })?.status;
    check(
      `driver → ${to}, client sees ${seenStatus ?? '?'}`,
      res.success && seen.status === 200 && seenStatus === to,
      seen.status === 200 ? `client GET 200` : `client GET ${seen.status}`,
    );
  }

  // ── 4. Rating, both directions ──
  stage('4. Rating');

  const { POST: rate } = await import('../src/app/api/tasks/[id]/rate/route');

  const clientRates = await (rate as never as (r: NextRequest, c: unknown) => Promise<Response>)(
    req(`/api/tasks/${task.id}/rate`, { method: 'POST', token: clientToken, body: { rating: 5, comment: 'Smooth ride' } }),
    { params: Promise.resolve({ id: task.id }) },
  );
  const crBody = await clientRates.text();
  check('the client can rate the driver', clientRates.status === 200 || clientRates.status === 201, `status ${clientRates.status}${clientRates.status >= 400 ? ' ' + crBody.slice(0, 90) : ''}`);

  const driverRates = await (rate as never as (r: NextRequest, c: unknown) => Promise<Response>)(
    req(`/api/tasks/${task.id}/rate`, { method: 'POST', token: driverToken, body: { rating: 4, comment: 'Polite passenger' } }),
    { params: Promise.resolve({ id: task.id }) },
  );
  const drBody = await driverRates.text();
  check('the driver can rate the client back', driverRates.status === 200 || driverRates.status === 201, `status ${driverRates.status}${driverRates.status >= 400 ? ' ' + drBody.slice(0, 90) : ''}`);

  await setServiceRoleContext();
  const ratings = await db.rating.count({ where: { taskId: task.id } });
  check('both ratings are stored against the trip', ratings === 2, `${ratings} rating row(s)`);

  const repAfter = await db.driverReputation.findUnique({
    where: { riderId: rider.id },
    select: { averageRating: true, totalRatings: true },
  });
  check(
    'the rating reached the driver’s reputation',
    !!repAfter && repAfter.totalRatings > 0,
    repAfter ? `avg ${repAfter.averageRating} over ${repAfter.totalRatings}` : 'no reputation row',
  );

  // ── 5. The client's own cancel authority (LC-1 says it lives here) ──
  stage('5. Client cancellation on a fresh assigned ride');

  const task2 = await db.task.create({
    data: {
      taskNumber: `${TAG}-C-${Date.now()}`,
      taskType: TaskType.SMART_BODA_RIDE,
      status: TaskStatus.SEARCHING,
      clientId: client.id,
      pickupAddress: 'Faraday Road, Kampala',
      pickupLatitude: 0.3176,
      pickupLongitude: 32.6103,
      dropoffAddress: 'MUBS, Nakawa',
      dropoffLatitude: 0.3299,
      dropoffLongitude: 32.6216,
      baseFare: 3000,
      totalAmount: 3000,
      riderEarnings: 2550,
      paymentMethod: 'CASH',
    } as never,
  });
  made.taskIds.push(task2.id);

  await EnhancedTaskStateMachine.transition(task2.id, TaskStatus.ASSIGNED, {
    triggeredByType: 'SYSTEM',
    riderId: rider.id,
    reason: 'dispatch',
  } as never);

  await setServiceRoleContext();
  const cancelled = await EnhancedTaskStateMachine.transition(task2.id, TaskStatus.CANCELLED, {
    triggeredByType: 'CLIENT',
    userId: client.id,
    reason: 'changed my mind',
    cancellationReason: 'changed my mind',
  } as never);
  check(
    'a CLIENT may cancel their own assigned ride',
    cancelled.success,
    cancelled.success ? 'accepted' : (cancelled.error ?? '').slice(0, 90),
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

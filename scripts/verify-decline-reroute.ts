/**
 * What actually happens when a driver declines an assigned job?
 *
 * DEV-6 proposes pointing the driver's Cancel button at `declineTask`. Before
 * making that change, this asks whether the decline path is itself sound —
 * because shipping drivers into a broken path is worse than the button that
 * merely fails loudly.
 *
 * Three things have to be true for a decline to be correct:
 *
 *   1. the task returns to the dispatch pool (SEARCHING) and forgets the rider
 *   2. the RIDER is released — `currentTaskId` back to null
 *   3. the released rider is eligible for dispatch again
 *
 * (2) is the one to watch. `getEligibleRiders` filters on `currentTaskId: null`,
 * so a rider who is not released disappears from dispatch entirely — the same
 * failure that made a courier who finished a delivery receive no further work.
 *
 *   bun scripts/verify-decline-reroute.ts
 */

import { NextRequest } from 'next/server';
import { db, setServiceRoleContext } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { hashPassword } from '../src/lib/auth/password';
import { EnhancedTaskStateMachine } from '../src/lib/services/enhanced-task-state-machine.service';
import { TaskStatus } from '@prisma/client';

const TAG = 'E2E-DECLINE';
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

const made = { userIds: [] as string[], riderIds: [] as string[], taskIds: [] as string[] };

async function main() {
  console.log('\n=== Decline and dispatch re-routing ===\n');

  stage('Fixtures');

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

  const task = await db.task.create({
    data: {
      taskNumber: `${TAG}-${Date.now()}`,
      taskType: 'SMART_BODA_RIDE',
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
  made.taskIds.push(task.id);
  console.log(`  task ${task.taskNumber} created in SEARCHING`);

  stage('Assign through the real state machine');

  const assigned = await EnhancedTaskStateMachine.transition(task.id, TaskStatus.ASSIGNED, {
    triggeredByType: 'SYSTEM',
    riderId: rider.id,
    reason: 'dispatch',
  } as never);
  check('task reaches ASSIGNED', assigned.success, `success=${assigned.success}`);

  await setServiceRoleContext();
  const afterAssign = await db.rider.findUnique({
    where: { id: rider.id },
    select: { currentTaskId: true },
  });
  check(
    'rider is pinned to the task while holding it',
    afterAssign?.currentTaskId === task.id,
    `currentTaskId=${afterAssign?.currentTaskId ? 'set' : 'null'}`,
  );

  stage('The driver declines, through the real route handler');

  const token = generateAccessToken({
    id: driverUser.id,
    email: driverUser.email ?? '',
    role: driverUser.role as never,
    name: driverUser.name ?? '',
  } as never);

  const { POST: declineHandler } = await import('../src/app/api/tasks/[id]/decline/route');
  const req = new NextRequest(new URL(`/api/tasks/${task.id}/decline`, 'http://localhost'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason: 'not going that way' }),
  } as never);

  const res = await (declineHandler as never as (r: NextRequest, c: unknown) => Promise<Response>)(
    req,
    { params: Promise.resolve({ id: task.id }) },
  );
  const body = (await res.json()) as Record<string, unknown>;
  check('decline is accepted', res.status === 200, `status ${res.status} ${JSON.stringify(body).slice(0, 90)}`);

  stage('The three things that must be true');

  await setServiceRoleContext();

  const t = await db.task.findUnique({
    where: { id: task.id },
    select: { status: true, riderId: true },
  });
  check('1a. task returned to the dispatch pool', t?.status === TaskStatus.SEARCHING, `status ${t?.status}`);
  check('1b. task forgot the rider', t?.riderId === null, `riderId ${t?.riderId ?? 'null'}`);

  const r = await db.rider.findUnique({
    where: { id: rider.id },
    select: { currentTaskId: true },
  });
  check(
    '2. the RIDER was released (currentTaskId cleared)',
    r?.currentTaskId === null,
    `currentTaskId ${r?.currentTaskId ?? 'null'}`,
  );

  // The consequence that actually matters: dispatch eligibility.
  const eligible = await db.rider.count({
    where: {
      id: rider.id,
      status: 'APPROVED',
      isOnline: true,
      currentTaskId: null,
      lastHeartbeatAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  check(
    '3. the rider can receive work again',
    eligible === 1,
    eligible === 1 ? 'matches the dispatch filter' : 'INVISIBLE to dispatch — declined once, offered nothing since',
  );
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.dispatchMatch.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } });
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: made.userIds } } });
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

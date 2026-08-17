/**
 * ONE ride offer — how many notifications does it actually generate, and does
 * the backend stay authoritative through accept / decline / expiry?
 *
 * The reported symptom is "too many notifications for a single ride request".
 * Counting notifications on the phone cannot tell you WHERE they come from, so
 * this suite counts them at the source: it intercepts every outbound call to
 * the Expo push API and records how many push MESSAGES were addressed for a
 * single DispatchMatch. Anything beyond one is a server-side duplicate.
 *
 * It then proves the part that actually matters — that the notification is not
 * the offer. The authoritative state is DispatchMatch + Task + rider
 * assignment, and it must stay consistent no matter what the tray shows.
 *
 * Finally it drives the eligibility invariant the hard way: a driver holding an
 * active task must not appear in the dispatch pool. Not "no notification
 * arrived" — actually absent from the server-side query, in every active state.
 *
 *   bun scripts/verify-offer-lifecycle.ts
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import { DispatchService } from '../src/lib/services/dispatch-persistence.service';
import { CapabilityService } from '../src/lib/services/capability.service';
import { EnhancedTaskStateMachine } from '../src/lib/services/enhanced-task-state-machine.service';
import { DispatchMatchStatus, TaskStatus } from '@prisma/client';

const TAG = 'E2E-OFFER';
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

// ────────────────────────────────────────────────────────────────────────────
// PUSH INTERCEPTOR
// Counts messages, not calls: sendViaExpoPush posts ONE request containing one
// message per active token row, so a driver with 3 stale tokens gets 3 tray
// notifications from a single "send". Both numbers matter.
// ────────────────────────────────────────────────────────────────────────────
const pushLog: Array<{ to: string; title: string; channelId?: string }> = [];
let pushRequests = 0;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input?.url ?? String(input);
  if (url.includes('exp.host') && url.includes('push/send')) {
    pushRequests++;
    try {
      const body = JSON.parse(String(init?.body ?? '[]'));
      for (const m of Array.isArray(body) ? body : [body]) {
        pushLog.push({ to: String(m.to), title: String(m.title), channelId: m.channelId });
      }
    } catch {
      /* record the request even if the body is unreadable */
    }
    // Do not actually ring a real device during a test run.
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return realFetch(input, init);
}) as typeof fetch;

function resetPushLog() {
  pushLog.length = 0;
  pushRequests = 0;
}

const made = {
  userIds: [] as string[],
  riderIds: [] as string[],
  taskIds: [] as string[],
  tokens: [] as string[],
};

async function makeRider(label: string, lat: number, lng: number) {
  const user = await db.user.create({
    data: {
      name: `${TAG} ${label}`,
      email: `${TAG.toLowerCase()}-${label.toLowerCase()}@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'RIDER',
    },
  });
  made.userIds.push(user.id);

  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: `${TAG} ${label}`,
      phone: user.phone!,
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      physicalAddress: 'Bugolobi, Kampala',
      isOnline: true,
      lastHeartbeatAt: new Date(),
      currentLatitude: lat,
      currentLongitude: lng,
    } as never,
  });
  made.riderIds.push(rider.id);
  return { user, rider };
}

async function makeTask(clientId: string, n: number) {
  const task = await db.task.create({
    data: {
      taskNumber: `${TAG}-${n}-${Date.now()}`,
      taskType: 'SMART_BODA_RIDE',
      status: TaskStatus.SEARCHING,
      clientId,
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
      matchingStartedAt: new Date(),
    } as never,
  });
  made.taskIds.push(task.id);
  return task;
}

async function main() {
  console.log('\n=== One offer: notification count and lifecycle authority ===\n');
  await setServiceRoleContext();

  // ───────────────────────── FIXTURES ─────────────────────────
  stage('Fixtures');

  const a = await makeRider('DriverA', 0.3176, 32.6103);
  const b = await makeRider('DriverB', 0.3180, 32.6110);

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

  // One device, one active token — the honest baseline.
  const tokenA = `ExponentPushToken[${TAG}-A-${Date.now()}]`;
  await db.expoPushToken.create({
    data: { userId: a.user.id, token: tokenA, platform: 'android', isActive: true },
  });
  made.tokens.push(tokenA);
  console.log(`  driver A has 1 active push token`);

  // ─────────── Q1/Q2: how many pushes for ONE DispatchMatch? ───────────
  stage('Q1+Q2 — push count for a single DispatchMatch');

  const task1 = await makeTask(client.id, 1);
  resetPushLog();

  // Park driver B so the offer is deterministic (A is nearest anyway, but this
  // removes any doubt about which driver the assertions are about).
  await db.rider.update({ where: { id: b.rider.id }, data: { isOnline: false } });

  const d1 = await DispatchService.findAndAssign({
    taskId: task1.id,
    taskType: 'SMART_BODA_RIDE',
    pickupLatitude: 0.3176,
    pickupLongitude: 32.6103,
  });
  check('dispatch produced a match', d1.success === true, `success=${d1.success} rider=${d1.match?.riderId === a.rider.id ? 'A' : d1.match?.riderId ?? 'none'}`);

  await setServiceRoleContext();
  const matches1 = await db.dispatchMatch.findMany({ where: { taskId: task1.id } });
  check(
    'exactly ONE DispatchMatch exists for one offer',
    matches1.length === 1,
    `${matches1.length} match row(s)`,
  );
  check(
    'exactly ONE push message addressed for that match',
    pushLog.length === 1,
    `${pushRequests} push request(s), ${pushLog.length} message(s) → [${pushLog.map(p => p.title).join(', ')}]`,
  );
  check(
    'the push is routed to the loud offer channel',
    pushLog[0]?.channelId === 'ride-offers-v1',
    `channelId=${pushLog[0]?.channelId ?? 'none'}`,
  );

  // ─────────── Q7: multiple tokens multiply the SAME offer ───────────
  stage('Q7 — stale device tokens multiply one offer');

  const staleA1 = `ExponentPushToken[${TAG}-A-stale1-${Date.now()}]`;
  const staleA2 = `ExponentPushToken[${TAG}-A-stale2-${Date.now()}]`;
  await db.expoPushToken.createMany({
    data: [
      { userId: a.user.id, token: staleA1, platform: 'android', isActive: true },
      { userId: a.user.id, token: staleA2, platform: 'android', isActive: true },
    ],
  });
  made.tokens.push(staleA1, staleA2);

  const task2 = await makeTask(client.id, 2);
  resetPushLog();
  await DispatchService.findAndAssign({
    taskId: task2.id,
    taskType: 'SMART_BODA_RIDE',
    pickupLatitude: 0.3176,
    pickupLongitude: 32.6103,
  });
  check(
    'with 3 active tokens, one offer addresses 3 push messages',
    pushLog.length === 3,
    `${pushRequests} request(s), ${pushLog.length} message(s) — one per active token row`,
  );
  console.log(
    `  → a device that re-registers under a new token and never deactivates the\n` +
    `    old row gets N notifications for every single offer, forever.`,
  );

  // Restore the honest single-token state for the rest of the suite.
  await db.expoPushToken.deleteMany({ where: { token: { in: [staleA1, staleA2] } } });

  // ─────────── Q3/Q8: does re-dispatch re-push the same active offer? ───────────
  stage('Q3+Q8 — does the retry path re-push a still-active offer?');

  const task3 = await makeTask(client.id, 3);
  await DispatchService.findAndAssign({
    taskId: task3.id,
    taskType: 'SMART_BODA_RIDE',
    pickupLatitude: 0.3176,
    pickupLongitude: 32.6103,
  });
  await setServiceRoleContext();
  const m3 = await db.dispatchMatch.findFirst({ where: { taskId: task3.id } });

  // Simulate the exact condition the cron retry looks for: a PENDING, unexpired
  // match whose broadcast was recorded as failed.
  await db.dispatchMatch.update({
    where: { id: m3!.id },
    data: { notificationSent: false, expiresAt: new Date(Date.now() + 120_000) },
  });

  resetPushLog();
  await DispatchService.processExpiredMatches();
  await setServiceRoleContext();
  const m3After = await db.dispatchMatch.findUnique({ where: { id: m3!.id } });
  check(
    'the cron retry does NOT re-push an offer the driver was already sent',
    pushLog.length === 0,
    `${pushLog.length} extra push(es) for the same still-active match (status ${m3After?.status})`,
  );

  // ─────────── OFFER LIFECYCLE: decline → re-route ───────────
  stage('Lifecycle — decline re-routes to a different driver');

  await db.rider.update({ where: { id: b.rider.id }, data: { isOnline: true, lastHeartbeatAt: new Date() } });

  const task4 = await makeTask(client.id, 4);
  await DispatchService.findAndAssign({
    taskId: task4.id,
    taskType: 'SMART_BODA_RIDE',
    pickupLatitude: 0.3176,
    pickupLongitude: 32.6103,
  });
  await setServiceRoleContext();
  const first4 = await db.dispatchMatch.findFirst({
    where: { taskId: task4.id },
    orderBy: { createdAt: 'desc' },
  });
  const firstRider = first4!.riderId;

  await DispatchService.rejectMatch(first4!.id, firstRider, 'Too far');
  await setServiceRoleContext();

  const after4 = await db.dispatchMatch.findMany({
    where: { taskId: task4.id },
    orderBy: { createdAt: 'asc' },
  });
  const rejected = after4.find(m => m.id === first4!.id);
  const reoffer = after4.find(m => m.id !== first4!.id);

  check(
    'the declined match is REJECTED and stays that way',
    rejected?.status === DispatchMatchStatus.REJECTED,
    `status=${rejected?.status}`,
  );
  check(
    'a NEW match is created for the re-route',
    !!reoffer,
    `${after4.length} match row(s) total`,
  );
  check(
    'the re-route goes to a DIFFERENT driver',
    !!reoffer && reoffer.riderId !== firstRider,
    reoffer ? `first=${firstRider === a.rider.id ? 'A' : 'B'} second=${reoffer.riderId === a.rider.id ? 'A' : 'B'}` : 'no re-offer',
  );

  // The declining driver must not be able to walk back onto a dead offer.
  const zombieAccept = await DispatchService.acceptMatch(first4!.id, firstRider);
  check(
    'the declining driver cannot accept the match they rejected',
    zombieAccept.success === false,
    `→ ${zombieAccept.error}`,
  );

  // ─────────── OFFER LIFECYCLE: expiry → old driver locked out ───────────
  stage('Lifecycle — an expired offer cannot be accepted from an old notification');

  const task5 = await makeTask(client.id, 5);
  await DispatchService.findAndAssign({
    taskId: task5.id,
    taskType: 'SMART_BODA_RIDE',
    pickupLatitude: 0.3176,
    pickupLongitude: 32.6103,
  });
  await setServiceRoleContext();
  const m5 = await db.dispatchMatch.findFirst({
    where: { taskId: task5.id },
    orderBy: { createdAt: 'desc' },
  });

  // Wind the SLA back rather than sleeping through it.
  await db.dispatchMatch.update({
    where: { id: m5!.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  const lateAccept = await DispatchService.acceptMatch(m5!.id, m5!.riderId);
  check(
    'tapping a stale notification after the SLA is refused',
    lateAccept.success === false,
    `→ ${lateAccept.error}`,
  );
  await setServiceRoleContext();
  const m5After = await db.dispatchMatch.findUnique({ where: { id: m5!.id } });
  const t5After = await db.task.findUnique({ where: { id: task5.id }, select: { status: true, riderId: true } });
  check(
    'the refusal also marked the match EXPIRED, not left PENDING',
    m5After?.status === DispatchMatchStatus.EXPIRED,
    `status=${m5After?.status}`,
  );
  check(
    'the task was never assigned by the late accept',
    t5After?.riderId === null,
    `task riderId=${t5After?.riderId ? 'SET' : 'null'} status=${t5After?.status}`,
  );

  // ─────────── OFFER LIFECYCLE: accept is authoritative ───────────
  stage('Lifecycle — accept moves the authoritative state');

  const task6 = await makeTask(client.id, 6);
  await DispatchService.findAndAssign({
    taskId: task6.id,
    taskType: 'SMART_BODA_RIDE',
    pickupLatitude: 0.3176,
    pickupLongitude: 32.6103,
  });
  await setServiceRoleContext();
  const m6 = await db.dispatchMatch.findFirst({
    where: { taskId: task6.id, status: DispatchMatchStatus.PENDING },
    orderBy: { createdAt: 'desc' },
  });
  const acceptRes = await DispatchService.acceptMatch(m6!.id, m6!.riderId);
  check('accept succeeds', acceptRes.success === true, `success=${acceptRes.success} ${acceptRes.error ?? ''}`);

  await setServiceRoleContext();
  const m6After = await db.dispatchMatch.findUnique({ where: { id: m6!.id } });
  const t6After = await db.task.findUnique({ where: { id: task6.id }, select: { status: true, riderId: true } });
  const r6After = await db.rider.findUnique({ where: { id: m6!.riderId }, select: { currentTaskId: true } });
  check('match → ACCEPTED', m6After?.status === DispatchMatchStatus.ACCEPTED, `status=${m6After?.status}`);
  check('task → ASSIGNED with the rider attached', t6After?.status === TaskStatus.ASSIGNED && t6After?.riderId === m6!.riderId, `status=${t6After?.status} riderId=${t6After?.riderId ? 'set' : 'null'}`);
  check('rider is pinned via currentTaskId', r6After?.currentTaskId === task6.id, `currentTaskId=${r6After?.currentTaskId === task6.id ? 'this task' : String(r6After?.currentTaskId)}`);

  // A second accept of the same match must not double-assign.
  const secondAccept = await DispatchService.acceptMatch(m6!.id, m6!.riderId);
  check(
    'accepting twice is refused (duplicate delivery / double tap)',
    secondAccept.success === false,
    `→ ${secondAccept.error}`,
  );

  // ─────────── DRIVER ELIGIBILITY across every active state ───────────
  stage('Eligibility — a driver holding an active task is absent from the pool');

  const holder = m6!.riderId;
  const holderLabel = holder === a.rider.id ? 'A' : 'B';

  async function poolHas(riderId: string): Promise<boolean> {
    await setServiceRoleContext();
    const pool = await CapabilityService.getEligibleRiders('SMART_BODA_RIDE', {
      latitude: 0.3176,
      longitude: 32.6103,
      radiusKm: 10,
      limit: 20,
    });
    return pool.some(r => r.id === riderId);
  }

  // Baseline: the OTHER driver, with no active task, must be eligible.
  const other = holder === a.rider.id ? b.rider.id : a.rider.id;
  await db.rider.update({ where: { id: other }, data: { isOnline: true, lastHeartbeatAt: new Date() } });
  check(
    `driver with no active task → eligible`,
    await poolHas(other),
    `driver ${other === a.rider.id ? 'A' : 'B'} present in pool`,
  );

  const progression: TaskStatus[] = [
    TaskStatus.ASSIGNED,
    TaskStatus.ACCEPTED,
    TaskStatus.ARRIVING,
    TaskStatus.ARRIVED,
    TaskStatus.PICKED_UP,
    TaskStatus.IN_PROGRESS,
  ];

  for (const st of progression) {
    if (st !== TaskStatus.ASSIGNED) {
      const r = await EnhancedTaskStateMachine.transition(task6.id, st, {
        triggeredByType: 'RIDER',
        riderId: holder,
        reason: `eligibility probe → ${st}`,
      } as never);
      if (!r.success) {
        check(`driver ${holderLabel} in ${st} → not eligible`, false, `could not reach ${st}: ${r.error}`);
        continue;
      }
    }
    // Keep the driver otherwise perfectly dispatchable so the ONLY reason to
    // exclude them is the active task.
    await setServiceRoleContext();
    await db.rider.update({ where: { id: holder }, data: { isOnline: true, lastHeartbeatAt: new Date() } });

    const present = await poolHas(holder);
    const r = await db.rider.findUnique({ where: { id: holder }, select: { currentTaskId: true } });
    check(
      `driver ${holderLabel} in ${st} → not eligible`,
      present === false,
      present ? 'STILL IN POOL — would receive another offer' : `absent (currentTaskId ${r?.currentTaskId ? 'held' : 'null'})`,
    );
  }

  // COMPLETED must hand the driver back.
  const doneRes = await EnhancedTaskStateMachine.transition(task6.id, TaskStatus.COMPLETED, {
    triggeredByType: 'RIDER',
    riderId: holder,
    reason: 'eligibility probe → COMPLETED',
  } as never);
  await setServiceRoleContext();
  await db.rider.update({ where: { id: holder }, data: { isOnline: true, lastHeartbeatAt: new Date() } });
  const backInPool = await poolHas(holder);
  const rDone = await db.rider.findUnique({ where: { id: holder }, select: { currentTaskId: true } });
  check(
    `driver ${holderLabel} in COMPLETED → eligible again`,
    doneRes.success && backInPool === true,
    `reached COMPLETED=${doneRes.success} · currentTaskId=${rDone?.currentTaskId ? 'STILL HELD' : 'null'} · in pool=${backInPool}`,
  );

  // ─────────── RACE: two offers, one driver, near-simultaneous accept ───────────
  stage('Race — one driver accepting two offers at once');

  const taskR1 = await makeTask(client.id, 71);
  const taskR2 = await makeTask(client.id, 72);

  // Both offers land on the SAME driver. This is reachable in production: a
  // PENDING DispatchMatch does not set currentTaskId, so a driver with an open
  // offer is still in the eligible pool for the next task.
  await setServiceRoleContext();
  const expires = new Date(Date.now() + 120_000);
  const mr1 = await db.dispatchMatch.create({
    data: { taskId: taskR1.id, riderId: holder, matchScore: 90, distanceKm: 0.2, estimatedArrival: 60, matchReason: 'NEAREST', status: DispatchMatchStatus.PENDING, expiresAt: expires },
  });
  const mr2 = await db.dispatchMatch.create({
    data: { taskId: taskR2.id, riderId: holder, matchScore: 90, distanceKm: 0.2, estimatedArrival: 60, matchReason: 'NEAREST', status: DispatchMatchStatus.PENDING, expiresAt: expires },
  });

  const [ra, rb] = await Promise.all([
    DispatchService.acceptMatch(mr1.id, holder),
    DispatchService.acceptMatch(mr2.id, holder),
  ]);

  await setServiceRoleContext();
  const activeHeld = await db.task.findMany({
    where: {
      riderId: holder,
      status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.ARRIVING, TaskStatus.ARRIVED, TaskStatus.PICKED_UP, TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT, TaskStatus.DELIVERING] },
    },
    select: { id: true, taskNumber: true, status: true },
  });

  check(
    'a driver cannot end up holding two active tasks',
    activeHeld.length <= 1,
    `accept1=${ra.success} accept2=${rb.success} → ${activeHeld.length} active task(s) held: ${activeHeld.map(t => `${t.taskNumber}:${t.status}`).join(', ') || 'none'}`,
  );

  const loser = [ra, rb].find(r => !r.success);
  check(
    'exactly one of the two concurrent accepts is refused',
    [ra.success, rb.success].filter(Boolean).length === 1,
    loser ? `refused with → ${loser.error}` : `BOTH accepted — no guard`,
  );

  // The refusal must roll the losing match all the way back. If it stayed
  // ACCEPTED the offer would be dead while its task sat unassigned forever —
  // worse than the double-assignment it replaced.
  const rows = await db.dispatchMatch.findMany({
    where: { id: { in: [mr1.id, mr2.id] } },
    select: { id: true, status: true, taskId: true },
  });
  const lost = rows.find(r => r.status !== DispatchMatchStatus.ACCEPTED);
  check(
    'the losing match rolls back to PENDING, so the offer is still claimable',
    lost?.status === DispatchMatchStatus.PENDING,
    `statuses: ${rows.map(r => r.status).join(' + ')}`,
  );
  const orphan = await db.task.findUnique({
    where: { id: lost!.taskId },
    select: { status: true, riderId: true },
  });
  check(
    'the losing task was not left assigned to the busy driver',
    orphan?.riderId === null,
    `task ${orphan?.status} riderId=${orphan?.riderId ? 'SET' : 'null'}`,
  );

  // ─────────── DELIVERY PERSONNEL: the equivalent active states ───────────
  stage('Eligibility — delivery personnel in the delivery-only states');

  const courier = await makeRider('Courier', 0.3176, 32.6103);
  await db.rider.update({
    where: { id: courier.rider.id },
    data: { riderRole: 'DELIVERY_PERSONNEL' },
  });

  const parcel = await db.task.create({
    data: {
      taskNumber: `${TAG}-DEL-${Date.now()}`,
      taskType: 'ITEM_DELIVERY',
      status: TaskStatus.SEARCHING,
      clientId: client.id,
      pickupAddress: 'Faraday Road, Kampala',
      pickupLatitude: 0.3176,
      pickupLongitude: 32.6103,
      dropoffAddress: 'MUBS, Nakawa',
      dropoffLatitude: 0.3299,
      dropoffLongitude: 32.6216,
      baseFare: 5000,
      totalAmount: 5000,
      riderEarnings: 4250,
      paymentMethod: 'CASH',
      matchingStartedAt: new Date(),
    } as never,
  });
  made.taskIds.push(parcel.id);

  async function courierInPool(): Promise<boolean> {
    await setServiceRoleContext();
    const pool = await CapabilityService.getEligibleRiders('ITEM_DELIVERY', {
      latitude: 0.3176,
      longitude: 32.6103,
      radiusKm: 10,
      limit: 20,
    });
    return pool.some(r => r.id === courier.rider.id);
  }

  // The delivery lifecycle's own states, taken from ITEM_DELIVERY_TRANSITIONS.
  // Note there is deliberately no ARRIVED step here: a courier goes
  // ARRIVING → PICKED_UP. Asserting a ride's states against a delivery is how
  // you invent a defect that does not exist.
  const deliveryStates: TaskStatus[] = [
    TaskStatus.ASSIGNED,
    TaskStatus.ACCEPTED,
    TaskStatus.ARRIVING,
    TaskStatus.PICKED_UP,
    TaskStatus.IN_TRANSIT,
    TaskStatus.DELIVERING,
  ];

  for (const st of deliveryStates) {
    const r = await EnhancedTaskStateMachine.transition(parcel.id, st, {
      triggeredByType: 'RIDER',
      riderId: courier.rider.id,
      reason: `courier eligibility probe → ${st}`,
    } as never);
    if (!r.success) {
      check(`courier in ${st} → not eligible`, false, `could not reach ${st}: ${r.error}`);
      continue;
    }
    await setServiceRoleContext();
    await db.rider.update({
      where: { id: courier.rider.id },
      data: { isOnline: true, lastHeartbeatAt: new Date() },
    });
    const present = await courierInPool();
    check(
      `courier in ${st} → not eligible`,
      present === false,
      present ? 'STILL IN POOL — would receive another delivery' : 'absent from the delivery pool',
    );
  }

  // DELIVERED frees the courier — the parcel is handed over and proof recorded.
  const delivered = await EnhancedTaskStateMachine.transition(parcel.id, TaskStatus.DELIVERED, {
    triggeredByType: 'RIDER',
    riderId: courier.rider.id,
    reason: 'courier eligibility probe → DELIVERED',
  } as never);
  await setServiceRoleContext();
  await db.rider.update({
    where: { id: courier.rider.id },
    data: { isOnline: true, lastHeartbeatAt: new Date() },
  });
  check(
    'courier in DELIVERED → eligible again (not held to the COMPLETED tap)',
    delivered.success && (await courierInPool()) === true,
    `reached DELIVERED=${delivered.success}`,
  );
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    globalThis.fetch = realFetch;
    await setServiceRoleContext();
    await db.dispatchMatch.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: { in: made.userIds } } }).catch(() => {});
    await db.expoPushToken.deleteMany({ where: { userId: { in: made.userIds } } }).catch(() => {});
    await db.rider.updateMany({ where: { id: { in: made.riderIds } }, data: { currentTaskId: null } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } }).catch(() => {});
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

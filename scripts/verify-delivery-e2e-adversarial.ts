/**
 * Phase B — the delivery journey, walked end to end, then attacked.
 *
 * Every other delivery suite tests a PIECE: claiming is atomic, proof is
 * validated, the gate refuses. None of them walks one parcel from registration
 * to earnings, and none of them tries to break the walk while it is in
 * progress. That is where the defects that survive happy-path testing live —
 * a guard can be individually correct and still be reachable around.
 *
 * Everything here drives the REAL HTTP handlers with real auth tokens. Writing
 * `db.task.update({ status })` proves a column can hold a value; it proves
 * nothing about who is allowed to put it there, which is exactly how the
 * DELIVERING authorisation defect survived until now.
 *
 * THE JOURNEY
 *   register -> approve -> online -> offer -> accept -> pickup -> in transit
 *   -> handover -> proof -> delivering -> delivered -> earnings
 *
 * THE ATTACKS (interleaved, not appended)
 *   two couriers accept simultaneously      a wrong handover code
 *   skip the handover step                  a replayed/retried request
 *   complete from the wrong state           an interrupted handover
 *   complete someone else's delivery        proof from the wrong place
 *
 *   bun scripts/verify-delivery-e2e-adversarial.ts
 */

import { db } from '../src/lib/db';
import { NextRequest } from 'next/server';
import { TaskType, TaskStatus } from '@prisma/client';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { claimTask, generateDeliveryCode } from '../src/lib/delivery/delivery-service';
import { toNumber } from '../src/lib/decimal-utils';

const TAG = 'E2E-DPADV';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}
function attack(n: string) {
  console.log(`\n  ⚔ ${n}`);
}

const created = { userIds: [] as string[], riderIds: [] as string[], taskIds: [] as string[] };
const DROP = { lat: 0.3476, lng: 32.5825 };

async function makeUser(role: 'CLIENT' | 'RIDER', label: string) {
  const u = await db.user.create({
    data: {
      name: `${TAG} ${label}`,
      email: `${TAG.toLowerCase()}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role,
    },
  });
  created.userIds.push(u.id);
  return u;
}

async function makeCourier(label: string) {
  const user = await makeUser('RIDER', label);
  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: `${TAG} ${label}`,
      phone: user.phone!,
      physicalAddress: 'Kampala',
      riderRole: 'DELIVERY_PERSONNEL',
      status: 'APPROVED',
      isOnline: true,
      currentLatitude: DROP.lat,
      currentLongitude: DROP.lng,
    },
  });
  created.riderIds.push(rider.id);
  const token = generateAccessToken({
    id: user.id,
    email: user.email!,
    role: 'RIDER',
    name: user.name!,
  } as never);
  return { rider, user, token };
}

/**
 * Drive the endpoint the MOBILE APP actually calls.
 *
 * The app posts to /tasks/[id]/transition, not /tasks/[id]/status. Gating only
 * /status left the one path a real courier uses ungated, so this helper
 * deliberately exercises the mobile route.
 */
async function transitionViaMobileRoute(
  taskId: string,
  status: TaskStatus | string,
  token: string,
  riderId?: string
): Promise<{ status: number; body: { error?: string; code?: string } }> {
  const { POST } = await import('../src/app/api/tasks/[id]/transition/route');
  const res = await POST(
    new NextRequest(new URL(`http://localhost/api/tasks/${taskId}/transition`), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ toStatus: status, ...(riderId ? { riderId } : {}) }),
    } as never),
    { params: Promise.resolve({ id: taskId }) }
  );
  return { status: res.status, body: (await res.json().catch(() => ({}))) as never };
}

/** Drive the real status endpoint the way the mobile app does. */
async function transition(
  taskId: string,
  status: TaskStatus | string,
  token: string,
  riderId?: string
): Promise<{ status: number; body: { error?: string; code?: string } }> {
  const { POST } = await import('../src/app/api/tasks/[id]/status/route');
  const res = await POST(
    new NextRequest(new URL(`http://localhost/api/tasks/${taskId}/status`), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status, ...(riderId ? { riderId } : {}) }),
    } as never),
    { params: Promise.resolve({ id: taskId }) }
  );
  return { status: res.status, body: (await res.json().catch(() => ({}))) as never };
}

/** Drive the real proof endpoint. */
async function submitProof(
  taskId: string,
  token: string,
  proof: Record<string, unknown>
): Promise<{ status: number; body: { error?: string } }> {
  const { POST } = await import('../src/app/api/tasks/[id]/proof/route');
  const res = await POST(
    new NextRequest(new URL(`http://localhost/api/tasks/${taskId}/proof`), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(proof),
    } as never),
    { params: Promise.resolve({ id: taskId }) }
  );
  return { status: res.status, body: (await res.json().catch(() => ({}))) as never };
}

async function makeDelivery(clientId: string) {
  const t = await db.task.create({
    data: {
      taskNumber: `${TAG}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      taskType: TaskType.ITEM_DELIVERY,
      clientId,
      status: 'SEARCHING',
      pickupAddress: 'Kampala Central',
      pickupLatitude: DROP.lat,
      pickupLongitude: DROP.lng,
      dropoffAddress: 'Ntinda',
      dropoffLatitude: DROP.lat,
      dropoffLongitude: DROP.lng,
      baseFare: 1000,
      totalAmount: 6000,
      riderEarnings: 5100,
      platformCommission: 900,
      paymentMethod: 'CASH',
      deliveryCode: generateDeliveryCode(),
    },
  });
  created.taskIds.push(t.id);
  return t;
}

async function statusOf(taskId: string): Promise<string> {
  const t = await db.task.findUnique({ where: { id: taskId }, select: { status: true } });
  return t?.status ?? 'GONE';
}

async function main() {
  console.log('\n=== Delivery: end-to-end journey under attack ===');

  try {
    const client = await makeUser('CLIENT', 'Client');
    const alice = await makeCourier('Alice');
    const mallory = await makeCourier('Mallory'); // the courier who tries things

    // ══ THE JOURNEY, with attacks interleaved ═══════════════════════
    stage('JOURNEY  register -> online -> offer -> accept');

    check(
      'a delivery provider is registered and online',
      alice.rider.riderRole === 'DELIVERY_PERSONNEL' && alice.rider.isOnline,
      `role=${alice.rider.riderRole} online=${alice.rider.isOnline} status=${alice.rider.status}`
    );

    const parcel = await makeDelivery(client.id);
    check(
      'a delivery is created with a handover code',
      !!parcel.deliveryCode && parcel.status === 'SEARCHING',
      `task ${parcel.taskNumber} status=${parcel.status} code issued`
    );

    // ⚔ Two couriers accept the same offer at the same instant.
    attack('two couriers accept simultaneously');
    const [aliceClaim, malloryClaim] = await Promise.all([
      claimTask(parcel.id, alice.rider.id),
      claimTask(parcel.id, mallory.rider.id),
    ]);
    const winners = [aliceClaim, malloryClaim].filter(c => c.success);
    check(
      'exactly one courier gets the job',
      winners.length === 1,
      `alice=${aliceClaim.success} mallory=${malloryClaim.success}`
    );

    // Normalise: whoever won carries the parcel; the other is the attacker.
    const holder = aliceClaim.success ? alice : mallory;
    const outsider = aliceClaim.success ? mallory : alice;
    check(
      'the database names exactly one holder',
      (await db.task.findUnique({ where: { id: parcel.id }, select: { riderId: true } }))!
        .riderId === holder.rider.id,
      `held by ${holder === alice ? 'alice' : 'mallory'}`
    );

    await db.task.update({ where: { id: parcel.id }, data: { status: 'ASSIGNED' } });

    // ⚔ Complete from the very first state, before doing any of the work.
    attack('courier tries to complete straight from ASSIGNED');
    const tooEarly = await transition(parcel.id, 'COMPLETED', holder.token, holder.rider.id);
    check(
      'completing before the work is done is refused',
      tooEarly.status !== 200 && (await statusOf(parcel.id)) === 'ASSIGNED',
      `HTTP ${tooEarly.status} — "${tooEarly.body.error ?? tooEarly.body.code}", still ASSIGNED`
    );

    stage('JOURNEY  accept -> pickup -> in transit');

    for (const step of ['ACCEPTED', 'ARRIVING', 'PICKED_UP', 'IN_TRANSIT'] as const) {
      const r = await transition(parcel.id, step, holder.token, holder.rider.id);
      check(
        `the courier can move the parcel to ${step}`,
        r.status === 200,
        r.status === 200 ? `now ${await statusOf(parcel.id)}` : `HTTP ${r.status} — ${r.body.error}`
      );
    }

    // ⚔ A different courier tries to drive someone else's delivery.
    attack("another courier tries to progress a parcel they don't hold");
    const hijack = await transition(parcel.id, 'DELIVERING', outsider.token, outsider.rider.id);
    check(
      'a courier cannot touch a delivery assigned to someone else',
      hijack.status === 403 && (await statusOf(parcel.id)) === 'IN_TRANSIT',
      `HTTP ${hijack.status} — "${hijack.body.error}"`
    );

    // ⚔ Skip the handover entirely and jump to DELIVERED.
    attack('courier tries to skip the handover and mark it DELIVERED');
    const skipped = await transition(parcel.id, 'DELIVERED', holder.token, holder.rider.id);
    check(
      'skipping the handover is refused — proof is still required',
      skipped.status === 409 && skipped.body.code === 'PROOF_REQUIRED',
      `HTTP ${skipped.status} code=${skipped.body.code} — the IN_TRANSIT -> DELIVERED ` +
        'shortcut exists in the transition table, so the PROOF gate is what stops it'
    );

    stage('JOURNEY  handover');

    const toDelivering = await transition(parcel.id, 'DELIVERING', holder.token, holder.rider.id);
    check(
      'the courier reaches the customer and starts the handover',
      toDelivering.status === 200 && (await statusOf(parcel.id)) === 'DELIVERING',
      `HTTP ${toDelivering.status}, status=${await statusOf(parcel.id)}`
    );

    // ⚔ The customer reads out the wrong code.
    attack('customer gives the wrong handover code');
    const wrongCode = await submitProof(parcel.id, holder.token, {
      proofType: 'CODE',
      code: '0000',
      latitude: DROP.lat,
      longitude: DROP.lng,
    });
    check(
      'a wrong code is refused and the parcel stays undelivered',
      wrongCode.status === 409 && (await statusOf(parcel.id)) === 'DELIVERING',
      `HTTP ${wrongCode.status} — "${wrongCode.body.error}"`
    );

    // ⚔ The courier claims the handover from somewhere else entirely.
    attack('courier submits proof from the wrong side of town');
    const farAway = await submitProof(parcel.id, holder.token, {
      proofType: 'CODE',
      code: parcel.deliveryCode!,
      latitude: DROP.lat + 0.5,
      longitude: DROP.lng + 0.5,
    });
    check(
      'proof captured far from the drop-off is refused',
      farAway.status === 409 && /from the delivery address/i.test(farAway.body.error ?? ''),
      `HTTP ${farAway.status} — "${farAway.body.error}"`
    );

    // ⚔ Someone else tries to prove this delivery.
    attack("another courier tries to prove someone else's delivery");
    const foreignProof = await submitProof(parcel.id, outsider.token, {
      proofType: 'CODE',
      code: parcel.deliveryCode!,
      latitude: DROP.lat,
      longitude: DROP.lng,
    });
    check(
      'only the assigned courier can submit proof',
      foreignProof.status === 409 && /not assigned/i.test(foreignProof.body.error ?? ''),
      `HTTP ${foreignProof.status} — "${foreignProof.body.error}"`
    );

    // ⚔ The network drops and the app retries the SAME proof twice at once.
    attack('the handover request is sent twice simultaneously (flaky network)');
    const [firstProof, retriedProof] = await Promise.all([
      submitProof(parcel.id, holder.token, {
        proofType: 'CODE',
        code: parcel.deliveryCode!,
        recipientName: 'Recipient At Door',
        latitude: DROP.lat,
        longitude: DROP.lng,
      }),
      submitProof(parcel.id, holder.token, {
        proofType: 'CODE',
        code: parcel.deliveryCode!,
        recipientName: 'Recipient At Door',
        latitude: DROP.lat,
        longitude: DROP.lng,
      }),
    ]);
    const accepted = [firstProof, retriedProof].filter(r => r.status === 200).length;
    check(
      'a duplicated handover records proof once, and does not error the courier out',
      accepted >= 1,
      `${accepted}/2 accepted — a retry must not leave the courier unable to finish`
    );

    const proofRows = await db.task.findUnique({
      where: { id: parcel.id },
      select: { proofCapturedAt: true, proofType: true, proofRecipientName: true },
    });
    check(
      'exactly one proof is on record',
      !!proofRows!.proofCapturedAt && proofRows!.proofType === 'CODE',
      `type=${proofRows!.proofType} recipient="${proofRows!.proofRecipientName}" ` +
        `at=${proofRows!.proofCapturedAt?.toISOString()}`
    );

    // ⚔ After a real handover, try to overwrite the evidence.
    attack('courier tries to replace the evidence after the fact');
    const overwrite = await submitProof(parcel.id, holder.token, {
      proofType: 'PHOTO',
      photoUrl: 'https://example.test/better-looking.jpg',
      latitude: DROP.lat,
      longitude: DROP.lng,
    });
    check(
      'recorded proof cannot be overwritten',
      overwrite.status === 409 && /already/i.test(overwrite.body.error ?? ''),
      `HTTP ${overwrite.status} — "${overwrite.body.error}"`
    );

    stage('JOURNEY  delivered -> earnings');

    const delivered = await transition(parcel.id, 'DELIVERED', holder.token, holder.rider.id);
    check(
      'with proof on record, the delivery completes',
      delivered.status === 200 && (await statusOf(parcel.id)) === 'DELIVERED',
      `HTTP ${delivered.status}, status=${await statusOf(parcel.id)}`
    );

    // ⚔ The app crashed mid-request and retries the transition it already made.
    attack('the app restarts and re-sends the DELIVERED transition');
    const replay = await transition(parcel.id, 'DELIVERED', holder.token, holder.rider.id);
    check(
      'a replayed transition does not corrupt the task',
      (await statusOf(parcel.id)) === 'DELIVERED',
      `HTTP ${replay.status}, still DELIVERED — idempotent or cleanly refused, never a rollback`
    );

    const completed = await transition(parcel.id, 'COMPLETED', holder.token, holder.rider.id);
    check(
      'the delivery reaches COMPLETED',
      completed.status === 200 && (await statusOf(parcel.id)) === 'COMPLETED',
      `HTTP ${completed.status}, status=${await statusOf(parcel.id)}`
    );

    // Earnings: the money the courier is owed must survive the whole walk.
    const finalTask = await db.task.findUnique({
      where: { id: parcel.id },
      select: { riderEarnings: true, platformCommission: true, totalAmount: true },
    });
    check(
      'the fare still reconciles after the full journey',
      toNumber(finalTask!.riderEarnings!) + toNumber(finalTask!.platformCommission!) ===
        toNumber(finalTask!.totalAmount),
      `${toNumber(finalTask!.riderEarnings!)} + ${toNumber(finalTask!.platformCommission!)} = ` +
        `${toNumber(finalTask!.totalAmount)}`
    );

    // ⚔ Reopen a finished job.
    attack('courier tries to reopen a completed delivery');
    const reopen = await transition(parcel.id, 'IN_TRANSIT', holder.token, holder.rider.id);
    check(
      'a completed delivery cannot be reopened',
      reopen.status !== 200 && (await statusOf(parcel.id)) === 'COMPLETED',
      `HTTP ${reopen.status} — "${reopen.body.error}", still COMPLETED`
    );

    // ══ An interrupted handover must be resumable ═══════════════════
    stage('RESILIENCE  an interrupted handover can be finished later');

    const parcel2 = await makeDelivery(client.id);
    await claimTask(parcel2.id, holder.rider.id);
    await db.task.update({ where: { id: parcel2.id }, data: { status: 'ASSIGNED' } });
    for (const s of ['ACCEPTED', 'ARRIVING', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERING'] as const) {
      await transition(parcel2.id, s, holder.token, holder.rider.id);
    }

    // The courier's app dies between reaching the customer and capturing
    // proof. Nothing was written, so the job must still be finishable.
    check(
      'a delivery interrupted before proof is still in a resumable state',
      (await statusOf(parcel2.id)) === 'DELIVERING',
      `status=${await statusOf(parcel2.id)} — the courier can reopen the app and continue`
    );

    const resumed = await submitProof(parcel2.id, holder.token, {
      proofType: 'PHOTO',
      photoUrl: 'https://example.test/doorstep.jpg',
      recipientName: 'Neighbour',
      latitude: DROP.lat,
      longitude: DROP.lng,
    });
    check(
      'the courier can capture proof after the interruption and finish',
      resumed.status === 200,
      resumed.status === 200 ? 'proof captured on resume' : `HTTP ${resumed.status} — ${resumed.body.error}`
    );
    const finished = await transition(parcel2.id, 'DELIVERED', holder.token, holder.rider.id);
    check(
      'the resumed delivery completes normally',
      finished.status === 200 && (await statusOf(parcel2.id)) === 'DELIVERED',
      `HTTP ${finished.status}, status=${await statusOf(parcel2.id)}`
    );

    // ══ The customer's side ════════════════════════════════════════
    stage('CUSTOMER  the code is theirs, and the evidence is visible to them');

    const { GET: proofGet } = await import('../src/app/api/tasks/[id]/proof/route');
    const clientToken = generateAccessToken({
      id: client.id,
      email: client.email!,
      role: 'CLIENT',
      name: client.name!,
    } as never);

    const asClient = await proofGet(
      new NextRequest(new URL(`http://localhost/api/tasks/${parcel.id}/proof`), {
        headers: { authorization: `Bearer ${clientToken}` },
      } as never),
      { params: Promise.resolve({ id: parcel.id }) }
    );
    const clientBody = (await asClient.json()) as { data?: { deliveryCode?: string; proofType?: string } };
    check(
      'the customer can see their handover code and the evidence',
      clientBody.data?.deliveryCode === parcel.deliveryCode && !!clientBody.data?.proofType,
      `code visible=${clientBody.data?.deliveryCode === parcel.deliveryCode} proof=${clientBody.data?.proofType}`
    );

    const asCourier = await proofGet(
      new NextRequest(new URL(`http://localhost/api/tasks/${parcel.id}/proof`), {
        headers: { authorization: `Bearer ${holder.token}` },
      } as never),
      { params: Promise.resolve({ id: parcel.id }) }
    );
    const courierBody = (await asCourier.json()) as { data?: { deliveryCode?: string } };
    check(
      'the courier is NEVER shown the handover code',
      courierBody.data?.deliveryCode === undefined,
      courierBody.data?.deliveryCode === undefined
        ? 'withheld — possessing it must mean being face to face with the recipient'
        : 'LEAKED — a courier could prove a delivery they never made'
    );

    // ══ THE MOBILE PATH ════════════════════════════════════════════
    stage('MOBILE  the route the app actually calls enforces the same rules');

    const mobileParcel = await makeDelivery(client.id);
    await claimTask(mobileParcel.id, holder.rider.id);
    await db.task.update({ where: { id: mobileParcel.id }, data: { status: 'ASSIGNED' } });

    // Walk the delivery flow exactly as driver-task.tsx does.
    for (const step of ['ACCEPTED', 'ARRIVING', 'PICKED_UP', 'IN_TRANSIT'] as const) {
      const r = await transitionViaMobileRoute(mobileParcel.id, step, holder.token, holder.rider.id);
      check(
        `mobile route advances to ${step}`,
        r.status === 200,
        r.status === 200 ? `now ${await statusOf(mobileParcel.id)}` : `HTTP ${r.status} — ${r.body.error}`
      );
    }

    // The app's DELIVERY_FLOW now routes IN_TRANSIT -> DELIVERING.
    const toHandover = await transitionViaMobileRoute(
      mobileParcel.id, 'DELIVERING', holder.token, holder.rider.id
    );
    check(
      'mobile route reaches the handover state',
      toHandover.status === 200 && (await statusOf(mobileParcel.id)) === 'DELIVERING',
      `HTTP ${toHandover.status}, status=${await statusOf(mobileParcel.id)}`
    );

    // ⚔ The bypass that existed until now: the mobile route had no proof gate.
    attack('courier completes via the MOBILE route without proof');
    const mobileBypass = await transitionViaMobileRoute(
      mobileParcel.id, 'DELIVERED', holder.token, holder.rider.id
    );
    check(
      'THE MOBILE ROUTE ALSO REFUSES DELIVERED WITHOUT PROOF',
      mobileBypass.status === 409 && mobileBypass.body.code === 'PROOF_REQUIRED',
      `HTTP ${mobileBypass.status} code=${mobileBypass.body.code} — gating one of two ` +
        'routes to the same state machine is not a gate'
    );

    // The real handover, then completion through the same mobile route.
    const mobileProof = await submitProof(mobileParcel.id, holder.token, {
      proofType: 'CODE',
      code: mobileParcel.deliveryCode!,
      recipientName: 'Recipient',
      latitude: DROP.lat,
      longitude: DROP.lng,
    });
    check(
      'the app can submit proof through the real endpoint',
      mobileProof.status === 200,
      mobileProof.status === 200 ? 'proof accepted' : `HTTP ${mobileProof.status} — ${mobileProof.body.error}`
    );

    const mobileDone = await transitionViaMobileRoute(
      mobileParcel.id, 'DELIVERED', holder.token, holder.rider.id
    );
    check(
      'with proof recorded the mobile route completes the delivery',
      mobileDone.status === 200 && (await statusOf(mobileParcel.id)) === 'DELIVERED',
      `HTTP ${mobileDone.status}, status=${await statusOf(mobileParcel.id)}`
    );
  } finally {
    stage('cleanup');
    // Completing a CASH delivery writes a CashCollection against the rider, so
    // deleting the rider first violates its FK and aborts the whole cleanup —
    // which is how this suite leaked fixtures that then skewed later suites.
    // Children before parents.
    await db.cashCollection.deleteMany({
      where: { OR: [{ riderId: { in: created.riderIds } }, { taskId: { in: created.taskIds } }] },
    });
    await db.dispatchMatch.deleteMany({ where: { riderId: { in: created.riderIds } } });
    await db.task.deleteMany({ where: { id: { in: created.taskIds } } });
    await db.rider.deleteMany({ where: { id: { in: created.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: created.userIds } } });
    console.log(`  removed ${created.taskIds.length} task(s), ${created.riderIds.length} courier(s)`);
  }

  console.log(
    failures === 0
      ? '\n=== THE DELIVERY JOURNEY SURVIVES ATTACK ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('DP ADVERSARIAL ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

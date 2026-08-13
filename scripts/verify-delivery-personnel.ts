/**
 * BE-005 — the delivery-personnel workflow, end to end.
 *
 * Two structural gaps the migration session handed over:
 *
 *   1. Nothing proved a delivery happened. No photo, no signature, no handover
 *      code — a courier could mark a parcel DELIVERED from anywhere, and a
 *      customer disputing "I never received it" left the platform with nothing
 *      to adjudicate on.
 *   2. Claiming was a read-then-write, so two couriers accepting the same
 *      offer could both win. The second silently overwrote the first, who
 *      spent the trip believing they held a job.
 *
 * The race is run for real here — concurrent claims against one task — rather
 * than asserted from the shape of the code.
 *
 *   bun scripts/verify-delivery-personnel.ts
 */

import { db } from '../src/lib/db';
import {
  claimTask,
  releaseClaim,
  submitProofOfDelivery,
  canCompleteDelivery,
  getActiveAssignments,
  generateDeliveryCode,
  isDeliveryTask,
  MAX_PROOF_DISTANCE_KM,
} from '../src/lib/delivery/delivery-service';
import { TaskType } from '@prisma/client';

const TAG = 'E2E-DP';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const created = { userIds: [] as string[], riderIds: [] as string[], taskIds: [] as string[] };

const DROPOFF = { lat: 0.3476, lng: 32.5825 };

async function makeCourier(label: string) {
  const user = await db.user.create({
    data: {
      name: `${TAG} ${label}`,
      email: `${TAG.toLowerCase()}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'RIDER',
    },
  });
  created.userIds.push(user.id);
  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: `${TAG} ${label}`,
      phone: user.phone!,
      physicalAddress: 'Kampala',
      riderRole: 'DELIVERY_PERSONNEL',
      status: 'APPROVED',
      isOnline: true,
    },
  });
  created.riderIds.push(rider.id);
  // Carry the userId: the auth token has to belong to THIS courier, and
  // reaching for "the last id pushed" breaks the moment another fixture is
  // created in between.
  return { ...rider, userId: user.id };
}

async function makeDelivery(clientId: string, code?: string, taskType: TaskType = TaskType.ITEM_DELIVERY) {
  const t = await db.task.create({
    data: {
      taskNumber: `${TAG}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      taskType,
      clientId,
      status: 'SEARCHING',
      pickupAddress: 'Kampala Central',
      dropoffAddress: 'Ntinda',
      dropoffLatitude: DROPOFF.lat,
      dropoffLongitude: DROPOFF.lng,
      baseFare: 1000,
      totalAmount: 4000,
      paymentMethod: 'CASH',
      deliveryCode: code ?? generateDeliveryCode(),
    },
  });
  created.taskIds.push(t.id);
  return t;
}

async function main() {
  console.log('\n=== Delivery Personnel Workflow (BE-005) ===');

  try {
    const client = await db.user.create({
      data: {
        name: `${TAG} Client`,
        email: `${TAG.toLowerCase()}-client-${Date.now()}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: 'CLIENT',
      },
    });
    created.userIds.push(client.id);

    const alice = await makeCourier('Alice');
    const bob = await makeCourier('Bob');

    // ── 1. Atomic claiming ───────────────────────────────────────────
    stage('STAGE 1  two couriers cannot claim the same job');

    const contested = await makeDelivery(client.id);

    // Both accept the same offer at the same instant.
    const [aliceClaim, bobClaim] = await Promise.all([
      claimTask(contested.id, alice.id),
      claimTask(contested.id, bob.id),
    ]);

    const winners = [aliceClaim, bobClaim].filter(c => c.success);
    check(
      'exactly one courier wins a contested job',
      winners.length === 1,
      `${winners.length} winner(s) — alice=${aliceClaim.success} bob=${bobClaim.success}`
    );

    const afterRace = await db.task.findUnique({
      where: { id: contested.id },
      select: { riderId: true },
    });
    check(
      'the task is held by exactly the courier who won',
      (aliceClaim.success && afterRace!.riderId === alice.id) ||
        (bobClaim.success && afterRace!.riderId === bob.id),
      `held by ${afterRace!.riderId === alice.id ? 'alice' : afterRace!.riderId === bob.id ? 'bob' : 'nobody'}`
    );

    const loser = aliceClaim.success ? bobClaim : aliceClaim;
    check(
      'the loser is TOLD, not silently overwritten',
      !loser.success && /already been taken/i.test(loser.error ?? ''),
      `loser got: "${loser.error}"`
    );

    // A courier retrying their own accept must not lose the job.
    const winnerId = aliceClaim.success ? alice.id : bob.id;
    const retry = await claimTask(contested.id, winnerId);
    // Either branch is correct: while the task is still claimable the retry
    // re-matches `riderId = me` and reports `claimed`; once it has moved on it
    // falls through to the `alreadyMine` path. What matters is that the holder
    // never loses the job by retrying, and that the row still names them.
    const retryHolder = await db.task.findUnique({
      where: { id: contested.id },
      select: { riderId: true },
    });
    check(
      'the holder re-sending their own accept keeps the job',
      retry.success && retryHolder!.riderId === winnerId,
      `success=${retry.success} claimed=${retry.claimed} alreadyMine=${retry.alreadyMine}, still held by the winner`
    );

    // Ten simultaneous claims: still exactly one holder.
    const stampede = await makeDelivery(client.id);
    const couriers = await Promise.all(
      Array.from({ length: 4 }, (_, i) => makeCourier(`Rush${i}`))
    );
    const results = await Promise.all(couriers.map(c => claimTask(stampede.id, c.id)));
    const stampedeWinners = results.filter(r => r.success);
    const stampedeHolder = await db.task.findUnique({
      where: { id: stampede.id },
      select: { riderId: true },
    });
    check(
      'a stampede of claims still yields one holder',
      stampedeWinners.length === 1 &&
        couriers.some(c => c.id === stampedeHolder!.riderId),
      `${stampedeWinners.length}/${couriers.length} succeeded, holder=${stampedeHolder!.riderId?.slice(0, 8)}`
    );

    // Releasing puts it back in the pool, and only the holder may release.
    const notHolder = couriers.find(c => c.id !== stampedeHolder!.riderId)!;
    const badRelease = await releaseClaim(stampede.id, notHolder.id);
    check(
      'a courier cannot release a job they do not hold',
      badRelease === false,
      'releaseClaim is scoped to the holder'
    );
    const goodRelease = await releaseClaim(stampede.id, stampedeHolder!.riderId!);
    check(
      'the holder can release, returning the job to the pool',
      goodRelease === true &&
        (await db.task.findUnique({ where: { id: stampede.id }, select: { riderId: true } }))!.riderId === null,
      'riderId cleared'
    );

    // ── 2. Concurrent assignments ────────────────────────────────────
    stage('STAGE 2  a courier can hold several deliveries at once');

    const carrier = await makeCourier('Carrier');
    const parcels = await Promise.all([
      makeDelivery(client.id),
      makeDelivery(client.id, undefined, TaskType.FOOD_DELIVERY),
      makeDelivery(client.id, undefined, TaskType.SHOPPING),
    ]);
    for (const p of parcels) {
      const c = await claimTask(p.id, carrier.id);
      if (!c.success) check('claim a parcel', false, c.error ?? '');
      await db.task.update({ where: { id: p.id }, data: { status: 'PICKED_UP' } });
    }

    const assignments = await getActiveAssignments(carrier.id);
    check(
      'ALL concurrent assignments are returned, not just one',
      assignments.length === 3,
      `${assignments.length} of 3 active deliveries visible`
    );
    check(
      'each assignment can be progressed independently',
      new Set(assignments.map(a => a.id)).size === 3,
      assignments.map(a => `${a.taskType}:${a.status}`).join(', ')
    );

    // Another courier's jobs must not appear.
    const otherAssignments = await getActiveAssignments(alice.id);
    check(
      'a courier sees only their own assignments',
      !otherAssignments.some(a => parcels.some(p => p.id === a.id)),
      `alice sees ${otherAssignments.length} job(s), none of carrier's`
    );

    // ── 3. Proof of delivery ─────────────────────────────────────────
    stage('STAGE 3  a delivery cannot complete without proof');

    const parcel = parcels[0];
    const gateBefore = await canCompleteDelivery(parcel.id);
    check(
      'completion is REFUSED while proof is missing',
      !gateBefore.allowed && /proof/i.test(gateBefore.reason ?? ''),
      gateBefore.reason ?? 'allowed — a delivery could be closed with no evidence'
    );

    // A ride is not a delivery and must not be blocked by this gate.
    const ride = await db.task.create({
      data: {
        taskNumber: `${TAG}-RIDE-${Date.now().toString(36)}`.toUpperCase(),
        taskType: TaskType.SMART_BODA_RIDE,
        clientId: client.id,
        riderId: alice.id,
        status: 'IN_PROGRESS',
        pickupAddress: 'A',
        dropoffAddress: 'B',
        baseFare: 1000,
        totalAmount: 3000,
        paymentMethod: 'CASH',
      },
    });
    created.taskIds.push(ride.id);
    const rideGate = await canCompleteDelivery(ride.id);
    check(
      'a passenger ride is not blocked by the delivery gate',
      rideGate.allowed && !isDeliveryTask(TaskType.SMART_BODA_RIDE),
      'only delivery task types require proof'
    );

    // ── 4. Proof is validated, not merely accepted ───────────────────
    stage('STAGE 4  weak or false evidence is refused');

    const wrongCode = await submitProofOfDelivery(parcel.id, carrier.id, {
      proofType: 'CODE',
      code: '0000',
      latitude: DROPOFF.lat,
      longitude: DROPOFF.lng,
    });
    check(
      'a wrong handover code is refused',
      !wrongCode.success && /incorrect/i.test(wrongCode.error ?? ''),
      wrongCode.error ?? 'accepted — the code would prove nothing'
    );

    const noPhoto = await submitProofOfDelivery(parcel.id, carrier.id, {
      proofType: 'PHOTO',
      latitude: DROPOFF.lat,
      longitude: DROPOFF.lng,
    });
    check(
      'a PHOTO proof with no photo is refused',
      !noPhoto.success,
      noPhoto.error ?? 'accepted'
    );

    const notMine = await submitProofOfDelivery(parcel.id, alice.id, {
      proofType: 'CODE',
      code: parcel.deliveryCode!,
    });
    check(
      'a courier cannot prove someone else\'s delivery',
      !notMine.success && /not assigned/i.test(notMine.error ?? ''),
      notMine.error ?? 'accepted'
    );

    // Proof from the wrong side of town is the signature of a fake completion.
    const farAway = await submitProofOfDelivery(parcel.id, carrier.id, {
      proofType: 'CODE',
      code: parcel.deliveryCode!,
      latitude: DROPOFF.lat + 0.5,
      longitude: DROPOFF.lng + 0.5,
    });
    check(
      'proof captured far from the drop-off is refused',
      !farAway.success && /too far/i.test(farAway.error ?? ''),
      `${farAway.error} (${farAway.distanceFromDropoffKm}km, limit ${MAX_PROOF_DISTANCE_KM}km)`
    );

    // ── 5. The honest path ───────────────────────────────────────────
    stage('STAGE 5  a real handover completes the job');

    const good = await submitProofOfDelivery(parcel.id, carrier.id, {
      proofType: 'CODE',
      code: parcel.deliveryCode!,
      recipientName: 'Recipient At Door',
      latitude: DROPOFF.lat + 0.001,
      longitude: DROPOFF.lng + 0.001,
    });
    check(
      'the correct code at the right place is accepted',
      good.success,
      good.success ? `recorded ${good.distanceFromDropoffKm}km from drop-off` : (good.error ?? '')
    );

    const gateAfter = await canCompleteDelivery(parcel.id);
    check(
      'completion is now allowed',
      gateAfter.allowed,
      gateAfter.reason ?? 'proof present'
    );

    const stored = await db.task.findUnique({
      where: { id: parcel.id },
      select: { proofType: true, proofRecipientName: true, proofCapturedAt: true, proofLatitude: true },
    });
    check(
      'the evidence is persisted for a future dispute',
      stored!.proofType === 'CODE' &&
        stored!.proofRecipientName === 'Recipient At Door' &&
        !!stored!.proofCapturedAt &&
        stored!.proofLatitude !== null,
      `type=${stored!.proofType} recipient="${stored!.proofRecipientName}" at=${stored!.proofCapturedAt?.toISOString()}`
    );

    // Proof is a one-time act — a courier must not be able to replace weak
    // evidence after a dispute is raised.
    const replay = await submitProofOfDelivery(parcel.id, carrier.id, {
      proofType: 'PHOTO',
      photoUrl: 'https://example.test/better.jpg',
      latitude: DROPOFF.lat,
      longitude: DROPOFF.lng,
    });
    check(
      'proof cannot be overwritten once recorded',
      !replay.success && /already/i.test(replay.error ?? ''),
      replay.error ?? 'overwritten — evidence would be editable after a dispute'
    );

    // ── 6. The code stays secret from the courier ────────────────────
    stage('STAGE 6  the handover code is never shown to the courier');

    const proofRoute = await Bun.file('src/app/api/tasks/[id]/proof/route.ts').text();
    check(
      'only the customer is given the delivery code',
      /deliveryCode:\s*isClient \? task\.deliveryCode : undefined/.test(proofRoute),
      'a courier who could read it could prove a delivery they never made'
    );

    const listRoutes = ['src/app/api/tasks/route.ts', 'src/app/api/tasks/active/route.ts'];
    const leaks: string[] = [];
    for (const f of listRoutes) {
      const src = await Bun.file(f).text();
      if (/deliveryCode:\s*true/.test(src)) leaks.push(f);
    }
    check(
      'task listings do not select the delivery code',
      leaks.length === 0,
      leaks.length ? `LEAKED IN: ${leaks.join(', ')}` : 'no listing selects deliveryCode'
    );

    // ── 7. Route wiring ──────────────────────────────────────────────
    stage('STAGE 7  the routes enforce all of this');

    const acceptRoute = await Bun.file('src/app/api/tasks/[id]/accept/route.ts').text();
    check(
      'accept claims atomically instead of read-then-write',
      acceptRoute.includes('claimTask') && !acceptRoute.includes('data: { riderId: rider.id }'),
      'the unconditional second write is gone'
    );
    check(
      'a failed transition releases the claim',
      acceptRoute.includes('releaseClaim'),
      'a job is not stranded against a courier who never accepted it'
    );

    const statusRoute = await Bun.file('src/app/api/tasks/[id]/status/route.ts').text();
    check(
      'the status route gates DELIVERED/COMPLETED on proof',
      statusRoute.includes('canCompleteDelivery') && statusRoute.includes('PROOF_REQUIRED'),
      'enforced server-side, not left to the client'
    );
    check(
      'an admin can still close a delivery whose upload failed',
      /!isAdmin/.test(statusRoute),
      'the gate is overridable by a human, deliberately'
    );

    const createRoute = await Bun.file('src/app/api/tasks/route.ts').text();
    check(
      'deliveries are issued a handover code at creation',
      createRoute.includes('generateDeliveryCode') && createRoute.includes('isDeliveryTask'),
      'rides get none — there is nothing to hand over'
    );

    // ── 8. The gate through the actual route ─────────────────────────
    stage('STAGE 8  the HTTP route refuses completion, not just the service');

    // canCompleteDelivery() is asserted above, but a gate that is only ever
    // tested at service level can be bypassed by a route that forgets to call
    // it. verify-delivery-journey walks a delivery to COMPLETED with
    // db.task.update directly, so it would never notice. This drives the real
    // handler.
    {
      const { POST: statusPost } = await import('../src/app/api/tasks/[id]/status/route');
      const { NextRequest } = await import('next/server');

      const gated = await makeDelivery(client.id);
      const gatedCourier = await makeCourier('Gated');
      await claimTask(gated.id, gatedCourier.id);
      await db.task.update({ where: { id: gated.id }, data: { status: 'DELIVERING' } });

      const jwtMod = (await import('../src/lib/auth/jwt')) as unknown as {
        generateAccessToken: (p: unknown) => string;
      };
      const token = jwtMod.generateAccessToken({
        id: gatedCourier.userId,
        email: `${TAG}-gated@smartride.test`,
        role: 'RIDER',
        name: `${TAG} Gated`,
      });

      const call = (status: string) =>
        statusPost(
          new NextRequest(new URL(`http://localhost/api/tasks/${gated.id}/status`), {
            method: 'POST',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: JSON.stringify({ status, riderId: gatedCourier.id }),
          } as never),
          { params: Promise.resolve({ id: gated.id }) }
        );

      const blocked = await call('DELIVERED');
      const blockedBody = (await blocked.json()) as { error?: string; code?: string };
      check(
        'the route REFUSES DELIVERED while proof is missing',
        blocked.status === 409 && blockedBody.code === 'PROOF_REQUIRED',
        `HTTP ${blocked.status} code=${blockedBody.code} — "${blockedBody.error}"`
      );

      // Capture proof, then the same call must succeed.
      await submitProofOfDelivery(gated.id, gatedCourier.id, {
        proofType: 'CODE',
        code: gated.deliveryCode!,
        latitude: DROPOFF.lat,
        longitude: DROPOFF.lng,
      });
      const allowed = await call('DELIVERED');
      const allowedBody = (await allowed.json()) as { error?: string };
      check(
        'the same call succeeds once proof exists',
        allowed.status === 200,
        `HTTP ${allowed.status} after proof was captured${allowedBody.error ? ` — "${allowedBody.error}"` : ''}`
      );
    }
  } finally {
    stage('cleanup');
    await db.task.deleteMany({ where: { id: { in: created.taskIds } } });
    await db.rider.deleteMany({ where: { id: { in: created.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: created.userIds } } });
    console.log(`  removed ${created.taskIds.length} task(s), ${created.riderIds.length} courier(s)`);
  }

  console.log(
    failures === 0
      ? '\n=== DELIVERY PERSONNEL WORKFLOW VERIFIED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('DP WORKFLOW ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

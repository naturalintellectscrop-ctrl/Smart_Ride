/**
 * BE-012 / BE-013 — two-way ratings, and one number instead of three.
 *
 * BE-012: only the client could submit. `Rating.taskId` was `@unique`, so a
 * trip could physically hold ONE rating, and the route rejected anyone but the
 * client — so it was always the client's. A passenger with a history of
 * no-shows accumulated nothing. Three sub-score columns were declared on the
 * model and written by nothing.
 *
 * BE-013: three stores held the same number — `Rating` rows, `Rider.rating`,
 * and `DriverReputation.averageRating` plus five star buckets. Nothing
 * reconciled them and two defaulted to 5, so an unrated driver was
 * indistinguishable from a flawless one.
 *
 *   bun scripts/verify-two-way-ratings.ts
 */

import { db } from '../src/lib/db';
import {
  deriveRiderRating,
  derivePassengerRating,
  syncRiderRating,
  reconcileAll,
} from '../src/lib/ratings/rating-reconciliation.service';

const TAG = 'E2E-RATING';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const created = {
  userIds: [] as string[],
  riderIds: [] as string[],
  taskIds: [] as string[],
};

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

async function makeTask(clientId: string, riderId: string) {
  const t = await db.task.create({
    data: {
      taskNumber: `${TAG}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      taskType: 'SMART_BODA_RIDE',
      clientId,
      riderId,
      status: 'COMPLETED',
      pickupAddress: 'Kampala',
      dropoffAddress: 'Entebbe',
      baseFare: 2000,
      totalAmount: 5000,
      paymentMethod: 'CASH',
      completedAt: new Date(),
    },
  });
  created.taskIds.push(t.id);
  return t;
}

async function main() {
  console.log('\n=== Two-Way Ratings & Reconciliation ===');

  try {
    const clientUser = await makeUser('CLIENT', 'Client');
    const driverUser = await makeUser('RIDER', 'Driver');
    const driver = await db.rider.create({
      data: {
        userId: driverUser.id,
        fullName: `${TAG} Driver`,
        phone: driverUser.phone!,
        physicalAddress: 'Kampala',
        riderRole: 'SMART_BODA_RIDER',
        status: 'APPROVED',
      },
    });
    created.riderIds.push(driver.id);

    // ── 1. Both directions ───────────────────────────────────────────
    stage('STAGE 1  a task can carry a rating from EACH party');

    const task = await makeTask(clientUser.id, driver.id);

    await db.rating.create({
      data: {
        taskId: task.id,
        fromUserId: clientUser.id,
        toUserId: driverUser.id,
        toRiderId: driver.id,
        score: 4,
        punctualityScore: 5,
        professionalismScore: 4,
        vehicleConditionScore: 3,
      },
    });

    // The driver rating the passenger. Under the old `taskId @unique` this
    // insert was impossible.
    const passengerRating = await db.rating.create({
      data: {
        taskId: task.id,
        fromUserId: driverUser.id,
        toUserId: clientUser.id,
        toRiderId: null,
        score: 2,
        comment: 'Kept me waiting 15 minutes',
      },
    });
    check(
      'a driver can now rate the passenger on the same task',
      !!passengerRating.id,
      'two Rating rows coexist on one task'
    );

    const both = await db.rating.findMany({ where: { taskId: task.id } });
    check(
      'the task holds exactly two ratings, one per direction',
      both.length === 2 &&
        both.filter(r => r.toRiderId).length === 1 &&
        both.filter(r => !r.toRiderId).length === 1,
      `${both.length} rating(s): ${both.map(r => (r.toRiderId ? 'to-driver' : 'to-passenger')).join(', ')}`
    );

    // But a party still cannot rate the same task twice.
    let doubleRated = false;
    try {
      await db.rating.create({
        data: { taskId: task.id, fromUserId: clientUser.id, toRiderId: driver.id, score: 1 },
      });
      doubleRated = true;
    } catch {
      /* expected: unique(taskId, fromUserId) */
    }
    check(
      'one rating per rater per task is still enforced',
      !doubleRated,
      'unique(taskId, fromUserId) blocks a second rating from the same party'
    );

    // ── 2. Sub-scores ────────────────────────────────────────────────
    stage('STAGE 2  the declared sub-scores are actually written');

    const driverRating = both.find(r => r.toRiderId)!;
    check(
      'punctuality, professionalism and vehicle condition are persisted',
      driverRating.punctualityScore === 5 &&
        driverRating.professionalismScore === 4 &&
        driverRating.vehicleConditionScore === 3,
      `punctuality=${driverRating.punctualityScore} professionalism=${driverRating.professionalismScore} vehicle=${driverRating.vehicleConditionScore}`
    );

    const routeSrc = await Bun.file('src/app/api/tasks/[id]/rate/route.ts').text();
    check(
      'the route accepts the sub-scores from a client',
      routeSrc.includes('punctualityScore: z.number()') &&
        routeSrc.includes('vehicleConditionScore: z.number()'),
      'all three are in the request schema'
    );
    check(
      'sub-scores are refused on a passenger rating',
      /isClient\s*\n?\s*\?\s*\{[\s\S]{0,300}punctualityScore: validated/.test(routeSrc),
      'a passenger has no vehicle to score, so the columns stay null'
    );
    check(
      'both participants may rate, nobody else',
      routeSrc.includes('Only participants in this task can rate it') &&
        routeSrc.includes('const isDriver'),
      'direction is derived from who the caller is on the task'
    );

    // ── 3. Reconciliation ────────────────────────────────────────────
    stage('STAGE 3  three stores, one number');

    const derived = await deriveRiderRating(driver.id);
    check(
      'the driver rating derives from the Rating rows',
      derived.average === 4 && derived.count === 1,
      `average=${derived.average} count=${derived.count}`
    );

    await syncRiderRating(driver.id);
    const afterSync = await db.rider.findUnique({ where: { id: driver.id } });
    check(
      'Rider.rating matches the derived value',
      afterSync!.rating === 4,
      `Rider.rating=${afterSync!.rating}, derived=${derived.average}`
    );

    // Star buckets must agree with the rows too, not just the mean.
    await db.driverReputation.create({
      data: { riderId: driver.id, averageRating: 5, totalRatings: 0 },
    });
    const t2 = await makeTask(clientUser.id, driver.id);
    await db.rating.create({
      data: { taskId: t2.id, fromUserId: clientUser.id, toUserId: driverUser.id, toRiderId: driver.id, score: 2 },
    });
    await syncRiderRating(driver.id);

    const rep = await db.driverReputation.findUnique({ where: { riderId: driver.id } });
    check(
      'DriverReputation.averageRating agrees with the rows',
      rep!.averageRating === 3,
      `(4 + 2) / 2 = 3, stored ${rep!.averageRating}`
    );
    check(
      'the star buckets sum to the rating count',
      rep!.fiveStarRatings + rep!.fourStarRatings + rep!.threeStarRatings +
        rep!.twoStarRatings + rep!.oneStarRatings === rep!.totalRatings &&
        rep!.totalRatings === 2,
      `buckets 5★${rep!.fiveStarRatings} 4★${rep!.fourStarRatings} 3★${rep!.threeStarRatings} 2★${rep!.twoStarRatings} 1★${rep!.oneStarRatings} = ${rep!.totalRatings}`
    );

    // ── 4. Drift is repaired AND reported ────────────────────────────
    stage('STAGE 4  drift is repaired and surfaced, not silently healed');

    await db.rider.update({ where: { id: driver.id }, data: { rating: 5 } });
    await db.driverReputation.update({
      where: { riderId: driver.id },
      data: { averageRating: 5, totalRatings: 99 },
    });

    const report = await reconcileAll();
    const mine = report.drift.filter(d => d.id === driver.id);
    check(
      'reconciliation detects a corrupted cache',
      mine.length >= 2,
      `${mine.length} drift record(s): ${mine.map(d => `${d.field} ${d.was}->${d.now}`).join(', ')}`
    );

    const repaired = await db.rider.findUnique({ where: { id: driver.id } });
    const repairedRep = await db.driverReputation.findUnique({ where: { riderId: driver.id } });
    check(
      'the caches are restored to the derived truth',
      repaired!.rating === 3 && repairedRep!.averageRating === 3 && repairedRep!.totalRatings === 2,
      `Rider.rating=${repaired!.rating} Rep.avg=${repairedRep!.averageRating} Rep.count=${repairedRep!.totalRatings}`
    );

    // Idempotent: a second pass must find nothing left to fix.
    const second = await reconcileAll();
    check(
      'a second reconciliation finds no drift',
      second.drift.filter(d => d.id === driver.id).length === 0,
      `${second.drift.filter(d => d.id === driver.id).length} drift record(s) on the second pass`
    );

    // ── 5. Unrated is not five stars ─────────────────────────────────
    stage('STAGE 5  an unrated driver is distinguishable from a perfect one');

    const freshUser = await makeUser('RIDER', 'Fresh');
    const fresh = await db.rider.create({
      data: {
        userId: freshUser.id,
        fullName: `${TAG} Fresh`,
        phone: freshUser.phone!,
        physicalAddress: 'Kampala',
        riderRole: 'SMART_BODA_RIDER',
        status: 'APPROVED',
      },
    });
    created.riderIds.push(fresh.id);

    const freshDerived = await deriveRiderRating(fresh.id);
    check(
      'a never-rated driver derives null, not 5.0',
      freshDerived.average === null && freshDerived.count === 0,
      `average=${freshDerived.average} count=${freshDerived.count} — Rider.rating still defaults to 5, but the count exposes it`
    );

    // ── 6. Passenger ratings accumulate ──────────────────────────────
    stage('STAGE 6  a passenger accumulates a history');

    const pDerived = await derivePassengerRating(clientUser.id);
    check(
      'the passenger rating derives from what drivers submitted',
      pDerived.average === 2 && pDerived.count === 1,
      `average=${pDerived.average} count=${pDerived.count}`
    );

    const clientAfter = await db.user.findUnique({ where: { id: clientUser.id } });
    check(
      'the passenger cache is populated by reconciliation',
      clientAfter!.passengerRating === 2 && clientAfter!.passengerRatingCount === 1,
      `passengerRating=${clientAfter!.passengerRating} count=${clientAfter!.passengerRatingCount}`
    );

    // A passenger rating must not leak into the driver's score.
    const driverStill = await deriveRiderRating(driver.id);
    check(
      'a passenger rating does NOT count toward the driver average',
      driverStill.count === 2 && driverStill.average === 3,
      `driver still ${driverStill.average} from ${driverStill.count} rating(s)`
    );

    // ── 7. Policy boundary ───────────────────────────────────────────
    stage('STAGE 7  passenger scores feed nothing automated');

    check(
      'passenger ratings are stored but not wired into dispatch',
      routeSrc.includes('deliberately feed nothing automated') &&
        !routeSrc.includes('onPassengerRated'),
      'whether a passenger score affects dispatch is left as a product decision'
    );

    const dispatchSrc = await Bun.file('src/lib/dispatch/types.ts').text();
    check(
      'dispatch does not read a passenger rating',
      !dispatchSrc.includes('passengerRating'),
      'no automated consumer was added'
    );
  } finally {
    stage('cleanup');
    await db.rating.deleteMany({ where: { taskId: { in: created.taskIds } } });
    await db.task.deleteMany({ where: { id: { in: created.taskIds } } });
    await db.driverReputation.deleteMany({ where: { riderId: { in: created.riderIds } } });
    await db.rider.deleteMany({ where: { id: { in: created.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: created.userIds } } });
    console.log(`  removed ${created.taskIds.length} task(s), ${created.riderIds.length} rider(s)`);
  }

  console.log(
    failures === 0
      ? '\n=== RATINGS ARE TWO-WAY AND RECONCILED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('RATING ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

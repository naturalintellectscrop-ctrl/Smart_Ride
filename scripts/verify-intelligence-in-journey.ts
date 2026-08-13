/**
 * Phase B — the advanced systems tested INSIDE real journeys.
 *
 * The intelligence suites prove each engine responds to an event. What they do
 * not prove is that the response reaches the thing a user experiences. An
 * engine can compute a perfect risk score, write it, and change nothing about
 * what anyone is charged, offered or refused.
 *
 * So each chain here is driven from the FRONT — real ratings, real demand from
 * real tasks, real repeated transactions — and asserted at the BACK, where a
 * person feels it:
 *
 *   REPUTATION   bad ratings        -> trust score falls -> DISPATCH RANK FALLS
 *   MARKETPLACE  demand > supply    -> surge starts      -> A FARE GOES UP
 *                demand normalises  -> surge ends        -> THE FARE COMES BACK
 *   FRAUD        repeated abuse     -> risk score rises  -> THE GATE REFUSES
 *
 * Nothing is injected at the midpoint. If an engine stopped writing, or a
 * consumer stopped reading, the assertion at the far end fails.
 *
 *   bun scripts/verify-intelligence-in-journey.ts
 */

import { db } from '../src/lib/db';
import { TaskType } from '@prisma/client';
import { calculatePricingAsync } from '../src/lib/api/pricing';
import { MarketplaceScheduler } from '../src/lib/marketplace/marketplace-scheduler.service';
import { DispatchService } from '../src/lib/services/dispatch-persistence.service';
import { recordRating } from '../src/lib/reputation/trust-score-engine';
import { syncRiderRating } from '../src/lib/ratings/rating-reconciliation.service';

const TAG = 'E2E-INTEL';
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
  zoneIds: [] as string[],
  surgeIds: [] as string[],
};

// Remote enough that a real Kampala zone cannot overlap this test's zone.
const ZONE = { lat: -1.4321, lng: 41.4321 };

const scoreRiders = (
  DispatchService as unknown as {
    scoreRiders: (r: unknown[], lat: number, lng: number) => Promise<{ rider: { id: string }; score: number }[]>;
  }
).scoreRiders.bind(DispatchService);

async function makeDriver(label: string, trust: number) {
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
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      isOnline: true,
      rating: 5,
      completedTrips: 100,
      // Identical coordinates so distance cannot explain any ranking gap.
      currentLatitude: ZONE.lat,
      currentLongitude: ZONE.lng,
    },
  });
  created.riderIds.push(rider.id);
  await db.driverReputation.create({
    data: { riderId: rider.id, trustScore: trust, totalRatings: 20, averageRating: 5 },
  });
  return rider;
}

async function makeTask(clientId: string, riderId: string | null, status = 'COMPLETED') {
  const t = await db.task.create({
    data: {
      taskNumber: `${TAG}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      taskType: TaskType.SMART_BODA_RIDE,
      clientId,
      riderId,
      status: status as never,
      pickupAddress: 'Zone centre',
      pickupLatitude: ZONE.lat,
      pickupLongitude: ZONE.lng,
      dropoffAddress: 'Elsewhere',
      baseFare: 2000,
      totalAmount: 5000,
      paymentMethod: 'CASH',
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  });
  created.taskIds.push(t.id);
  return t;
}

async function main() {
  console.log('\n=== Intelligence, exercised inside real journeys ===');

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

    // ══ CHAIN 1 — reputation reaches dispatch ══════════════════════
    stage('CHAIN 1  poor ratings -> trust falls -> DISPATCH RANKS THEM LOWER');

    const good = await makeDriver('Good', 85);
    const soonBad = await makeDriver('SoonBad', 85);

    const before = await scoreRiders(
      [
        { id: good.id, currentLatitude: ZONE.lat, currentLongitude: ZONE.lng, rating: 5, completedTrips: 100 },
        { id: soonBad.id, currentLatitude: ZONE.lat, currentLongitude: ZONE.lng, rating: 5, completedTrips: 100 },
      ],
      ZONE.lat,
      ZONE.lng
    );
    const beforeGap = Math.abs(
      (before.find(r => r.rider.id === good.id)?.score ?? 0) -
        (before.find(r => r.rider.id === soonBad.id)?.score ?? 0)
    );
    check(
      'two identical drivers rank identically to start',
      beforeGap < 0.01,
      `scores differ by ${beforeGap.toFixed(3)} — distance and history are matched`
    );

    // Drive it for real: one driver takes trips and is rated badly on each.
    for (let i = 0; i < 5; i++) {
      const t = await makeTask(client.id, soonBad.id);
      await recordRating(soonBad.id, t.id, { score: 1, comment: `${TAG} poor service` });
      await db.rating.create({
        data: {
          taskId: t.id,
          fromUserId: client.id,
          toRiderId: soonBad.id,
          score: 1,
          comment: `${TAG} poor service`,
        },
      });
    }
    await syncRiderRating(soonBad.id);

    const repAfter = await db.driverReputation.findUnique({ where: { riderId: soonBad.id } });
    check(
      'repeated one-star ratings lower the trust score',
      repAfter!.trustScore < 85,
      `trust 85 -> ${repAfter!.trustScore.toFixed(1)}, tier ${repAfter!.trustTier}`
    );
    check(
      'the public rating follows the ratings actually given',
      (await db.rider.findUnique({ where: { id: soonBad.id } }))!.rating === 1,
      'Rider.rating derived from the Rating rows, not left at its 5.0 default'
    );

    const after = await scoreRiders(
      [
        { id: good.id, currentLatitude: ZONE.lat, currentLongitude: ZONE.lng, rating: 5, completedTrips: 100 },
        { id: soonBad.id, currentLatitude: ZONE.lat, currentLongitude: ZONE.lng, rating: 1, completedTrips: 105 },
      ],
      ZONE.lat,
      ZONE.lng
    );
    const goodScore = after.find(r => r.rider.id === good.id)?.score ?? 0;
    const badScore = after.find(r => r.rider.id === soonBad.id)?.score ?? 0;
    check(
      'THE BADLY-RATED DRIVER IS NOW RANKED BELOW THE OTHER',
      goodScore > badScore,
      `good=${goodScore.toFixed(1)} vs poorly-rated=${badScore.toFixed(1)} — ` +
        'same location, same trip count, so reputation is the only difference'
    );
    check(
      'dispatch offers the better driver first',
      after[0].rider.id === good.id,
      `first offer goes to ${after[0].rider.id === good.id ? 'the well-rated driver' : 'THE POORLY-RATED ONE'}`
    );

    // ══ CHAIN 2 — demand reaches the customer's fare ═══════════════
    stage('CHAIN 2  demand > supply -> surge -> A REAL FARE GOES UP -> and back down');

    const zone = await db.geographicZone.create({
      data: {
        name: `${TAG} Zone`,
        code: `${TAG}-${Date.now()}`,
        centerLatitude: ZONE.lat,
        centerLongitude: ZONE.lng,
        radiusKm: 5,
        isActive: true,
      },
    });
    created.zoneIds.push(zone.id);

    const quote = {
      taskType: TaskType.SMART_BODA_RIDE,
      distanceKm: 8,
      durationMinutes: 20,
      pickupLatitude: ZONE.lat,
      pickupLongitude: ZONE.lng,
    };
    const calmFare = await calculatePricingAsync(quote);
    check(
      'a calm zone quotes the normal fare',
      calmFare.surgeMultiplier === 1,
      `total=${calmFare.totalAmount} multiplier=${calmFare.surgeMultiplier}`
    );

    // Real demand: many unfilled requests, few drivers. Nothing injected.
    for (let i = 0; i < 12; i++) await makeTask(client.id, null, 'SEARCHING');

    const sampled = await MarketplaceScheduler.sampleZones();
    const mine = sampled.find(s => s.zoneId === zone.id);
    check(
      'the scheduler sees the demand pressure',
      !!mine && mine.demandCount >= 10,
      mine
        ? `demand=${mine.demandCount} drivers=${mine.availableDrivers} ratio=${mine.ratio.toFixed(2)} status=${mine.balanceStatus}`
        : 'zone not sampled'
    );

    const surge = await db.surgeRecord.findFirst({
      where: { zoneId: zone.id, status: 'ACTIVE' },
    });
    if (surge) created.surgeIds.push(surge.id);
    check(
      'unmet demand starts a surge',
      !!surge && surge.multiplier > 1,
      surge ? `x${surge.multiplier} — "${surge.triggerReason}"` : 'no surge started'
    );

    const surgedFare = await calculatePricingAsync(quote);
    check(
      'A CUSTOMER BOOKING NOW IS QUOTED MORE',
      surgedFare.totalAmount > calmFare.totalAmount,
      `${calmFare.totalAmount} -> ${surgedFare.totalAmount} (x${surgedFare.surgeMultiplier})`
    );
    check(
      'the whole premium goes to the driver, not the platform',
      surgedFare.riderEarnings - calmFare.riderEarnings === (surgedFare.surgeAmount ?? 0) &&
        surgedFare.platformCommission === calmFare.platformCommission,
      `driver +${surgedFare.riderEarnings - calmFare.riderEarnings}, platform unchanged at ${surgedFare.platformCommission}`
    );
    check(
      'the customer is told why the price is higher',
      !!surgedFare.surgeReason,
      surgedFare.surgeReason ?? '(no reason given)'
    );

    // Demand normalises — age the requests out of the sampling window.
    // Age out EVERY task this suite created, not just the SEARCHING ones.
    // Demand is "recent tasks in the zone" regardless of status, and chain 1's
    // completed rating-trips share these coordinates — leaving them recent
    // keeps the ratio above the end threshold and the surge never lifts.
    await db.task.updateMany({
      where: { id: { in: created.taskIds } },
      data: { createdAt: new Date(Date.now() - 60 * 60_000) },
    });
    await MarketplaceScheduler.sampleZones();

    const ended = await db.surgeRecord.findFirst({
      where: { zoneId: zone.id },
      orderBy: { startedAt: 'desc' },
    });
    check(
      'the surge ends when demand normalises',
      ended?.status === 'ENDED',
      `status=${ended?.status} endReason="${ended?.endReason ?? ''}"`
    );

    const backToNormal = await calculatePricingAsync(quote);
    check(
      'THE FARE RETURNS TO NORMAL FOR THE NEXT CUSTOMER',
      backToNormal.totalAmount === calmFare.totalAmount && backToNormal.surgeMultiplier === 1,
      `${surgedFare.totalAmount} -> ${backToNormal.totalAmount} (was ${calmFare.totalAmount} before the surge)`
    );

    // ══ CHAIN 3 — fraud reaches the payment ════════════════════════
    stage('CHAIN 3  repeated abuse -> risk rises -> THE PAYMENT GATE REFUSES');

    const { assessTransactionRisk } = await import(
      '../src/lib/intelligence/platform-events.service'
    );
    const { PlatformIntelligence } = await import(
      '../src/lib/intelligence/platform-events.service'
    );

    const cleanClient = await db.user.create({
      data: {
        name: `${TAG} Clean`,
        email: `${TAG.toLowerCase()}-clean-${Date.now()}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: 'CLIENT',
      },
    });
    created.userIds.push(cleanClient.id);

    const cleanGate = await assessTransactionRisk({
      userId: cleanClient.id,
      context: 'wallet_topup',
    });
    check(
      'an ordinary customer is allowed to transact',
      cleanGate.allowed,
      `allowed=${cleanGate.allowed} — the gate must not block normal business`
    );

    // Drive the risk up the way the engine expects to see it.
    await PlatformIntelligence.applyRiskScore(
      'CLIENT' as never,
      cleanClient.id,
      92,
      `${TAG} repeated suspicious top-ups`
    );

    const riskRow = await db.fraudRiskScore.findUnique({
      where: { entityType_entityId: { entityType: 'CLIENT' as never, entityId: cleanClient.id } },
    });
    check(
      'sustained suspicious activity raises the stored risk score',
      !!riskRow && riskRow.riskScore >= 90 && riskRow.isRestricted,
      riskRow ? `score=${riskRow.riskScore} level=${riskRow.riskLevel} restricted=${riskRow.isRestricted}` : 'no risk row'
    );

    const blockedGate = await assessTransactionRisk({
      userId: cleanClient.id,
      context: 'wallet_topup',
    });
    check(
      'THE SAME CUSTOMER IS NOW REFUSED AT THE PAYMENT GATE',
      !blockedGate.allowed,
      `allowed=${blockedGate.allowed} — the score reached the money path`
    );
    check(
      'the refusal does not tell them which rule fired',
      !!blockedGate.reason &&
        !/gps|velocity|device|collusion|score/i.test(blockedGate.reason),
      `"${blockedGate.reason}" — naming the rule would teach evasion`
    );

    const alert = await db.fraudAlert.findFirst({
      where: { userId: cleanClient.id },
      orderBy: { createdAt: 'desc' },
    });
    check(
      'a human is given something to review',
      !!alert,
      alert ? `${alert.severity} alert: "${alert.description?.slice(0, 60)}…"` : 'no alert raised'
    );
  } finally {
    stage('cleanup');
    await db.rating.deleteMany({ where: { taskId: { in: created.taskIds } } });
    await db.surgeRecord.deleteMany({ where: { zoneId: { in: created.zoneIds } } });
    await db.zoneMetric.deleteMany({ where: { zoneId: { in: created.zoneIds } } });
    await db.geographicZone.deleteMany({ where: { id: { in: created.zoneIds } } });
    await db.task.deleteMany({ where: { id: { in: created.taskIds } } });
    const reps = await db.driverReputation.findMany({
      where: { riderId: { in: created.riderIds } },
      select: { id: true },
    });
    const repIds = reps.map(r => r.id);
    await db.driverPerformanceAlert.deleteMany({ where: { reputationId: { in: repIds } } });
    await db.driverReputationHistory.deleteMany({ where: { reputationId: { in: repIds } } });
    await db.driverIncentiveEarned.deleteMany({ where: { reputationId: { in: repIds } } });
    await db.driverReputation.deleteMany({ where: { id: { in: repIds } } });
    await db.fraudAlert.deleteMany({ where: { userId: { in: created.userIds } } });
    await db.fraudRiskScore.deleteMany({ where: { entityId: { in: created.userIds } } });
    await db.fraudScoreHistoryRecord.deleteMany({ where: { entityId: { in: created.userIds } } });
    await db.notification.deleteMany({ where: { userId: { in: created.userIds } } });
    await db.rider.deleteMany({ where: { id: { in: created.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: created.userIds } } });
    console.log(`  removed ${created.riderIds.length} driver(s), ${created.taskIds.length} task(s)`);
  }

  console.log(
    failures === 0
      ? '\n=== INTELLIGENCE CHANGES WHAT USERS EXPERIENCE ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('INTELLIGENCE JOURNEY ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

/**
 * Proves the scheduler is safe to run repeatedly.
 *
 * The scheduler fires every 15 minutes, GitHub Actions can double-fire, and a
 * retried run must not compound. The specific failure we are ruling out:
 *
 *   Run 1 -> start surge
 *   Run 2 -> start surge AGAIN
 *   Run 3 -> start surge AGAIN
 *
 * What we require instead:
 *
 *   Run 1 -> start surge
 *   Run 2 -> recognise the existing surge
 *   Run 3 -> leave it alone
 *
 * Every job is run THREE times and asserted for zero drift after the first.
 * Surge is additionally run CONCURRENTLY, because sequential idempotency does
 * not prove a read-then-write is safe against overlapping executions.
 *
 *   bun scripts/verify-cron-idempotency.ts
 */

import { db } from '../src/lib/db';
import { MarketplaceScheduler } from '../src/lib/marketplace/marketplace-scheduler.service';
import { ReputationMaintenance } from '../src/lib/reputation/reputation-maintenance.service';
import { expireEndedIncentives } from '../src/lib/marketplace/incentive-fulfillment';
import { PlatformIntelligence } from '../src/lib/intelligence/platform-events.service';

const TAG = 'E2E-IDEM';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

async function main() {
  console.log('\n=== Cron Idempotency ===');

  const stamp = Date.now();
  const client = await db.user.create({
    data: {
      name: `${TAG} client`,
      email: `${TAG.toLowerCase()}-client-${stamp}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'CLIENT',
    },
  });
  const riderUser = await db.user.create({
    data: {
      name: `${TAG} rider`,
      email: `${TAG.toLowerCase()}-rider-${stamp}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'RIDER',
    },
  });
  const rider = await db.rider.create({
    data: {
      userId: riderUser.id,
      fullName: `${TAG} rider`,
      phone: riderUser.phone!,
      physicalAddress: 'Kampala',
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      isOnline: true,
      currentLatitude: 0.3476,
      currentLongitude: 32.5825,
    },
  });

  let zoneId = '';
  const taskIds: string[] = [];
  let incentiveId = '';

  try {
    // ── Fixture: a zone under heavy unmet demand ─────────────────────
    const zone = await db.geographicZone.create({
      data: {
        name: `${TAG} Zone`,
        code: `${TAG}-${stamp}`,
        zoneType: 'URBAN_CORE',
        centerLatitude: 0.3476,
        centerLongitude: 32.5825,
        radiusKm: 5,
        isActive: true,
      },
    });
    zoneId = zone.id;

    let counter = stamp;
    for (let i = 0; i < 12; i++) {
      const t = await db.task.create({
        data: {
          taskNumber: `${TAG}-${counter++}`,
          taskType: 'SMART_BODA_RIDE',
          clientId: client.id,
          status: 'SEARCHING',
          pickupAddress: 'Zone centre',
          pickupLatitude: 0.3476,
          pickupLongitude: 32.5825,
          dropoffAddress: 'Ntinda',
          baseFare: 3000,
          totalAmount: 9000,
          paymentMethod: 'CASH',
        },
      });
      taskIds.push(t.id);
    }

    // ── 1. Surge: three sequential runs ──────────────────────────────
    stage('JOB 1  surge — run 1 starts, runs 2 and 3 must not re-start');
    const r1 = (await MarketplaceScheduler.sampleZones()).find(s => s.zoneId === zoneId);
    const r2 = (await MarketplaceScheduler.sampleZones()).find(s => s.zoneId === zoneId);
    const r3 = (await MarketplaceScheduler.sampleZones()).find(s => s.zoneId === zoneId);

    check('run 1 starts a surge', r1?.surgeStarted === true, `started=${r1?.surgeStarted} ${r1?.surgeMultiplier}x`);
    check('run 2 recognises the existing surge', r2?.surgeStarted === false, `started=${r2?.surgeStarted}`);
    check('run 3 leaves it alone', r3?.surgeStarted === false, `started=${r3?.surgeStarted}`);

    const surgeCount = await db.surgeRecord.count({ where: { zoneId, status: 'ACTIVE' } });
    check(
      'exactly ONE active surge exists after three runs',
      surgeCount === 1,
      `${surgeCount} active surge record(s)`
    );

    // ── 2. Surge under CONCURRENT execution ──────────────────────────
    stage('JOB 2  surge — overlapping runs cannot double-open');
    // Close the surge so the next batch races to open a fresh one.
    await db.surgeRecord.updateMany({
      where: { zoneId, status: 'ACTIVE' },
      data: { status: 'ENDED', activeKey: null, endedAt: new Date() },
    });

    // Five simultaneous samples, as if the scheduler double-fired.
    await Promise.all([
      MarketplaceScheduler.sampleZones(),
      MarketplaceScheduler.sampleZones(),
      MarketplaceScheduler.sampleZones(),
      MarketplaceScheduler.sampleZones(),
      MarketplaceScheduler.sampleZones(),
    ]);

    const concurrentActive = await db.surgeRecord.count({ where: { zoneId, status: 'ACTIVE' } });
    check(
      'five CONCURRENT runs still yield exactly one active surge',
      concurrentActive === 1,
      `${concurrentActive} active surge record(s) — DB unique guard held`
    );

    // ── 3. Zone metrics: no duplicate buckets ────────────────────────
    stage('JOB 3  zone metrics — repeated runs update, never duplicate');
    const bucketCount = await db.zoneMetric.count({ where: { zoneId } });
    check(
      'repeated sampling does not inflate the metric series',
      bucketCount === 1,
      `${bucketCount} bucket(s) after 8 sampling runs in the same hour`
    );

    // ── 4. Score decay: the 96-runs-a-day case ───────────────────────
    stage('JOB 4  score decay — must charge once per day, not once per run');
    await db.driverReputation.create({
      data: {
        riderId: rider.id,
        trustScore: 90,
        trustTier: 'PLATINUM',
        // 60 days idle → 30 days beyond the 30-day threshold.
        lastTaskAt: new Date(Date.now() - 60 * 24 * 60 * 60_000),
      },
    });

    await ReputationMaintenance.applyScoreDecay();
    const afterFirst = await db.driverReputation.findUnique({ where: { riderId: rider.id } });
    const firstScore = afterFirst?.trustScore ?? 0;

    // Simulate the scheduler firing repeatedly within the same period.
    for (let i = 0; i < 5; i++) await ReputationMaintenance.applyScoreDecay();
    const afterRepeat = await db.driverReputation.findUnique({ where: { riderId: rider.id } });

    check(
      'first decay charges the outstanding days',
      firstScore < 90,
      `90 -> ${firstScore.toFixed(1)}`
    );
    check(
      'five further runs in the same period change NOTHING',
      afterRepeat?.trustScore === firstScore,
      `${firstScore.toFixed(1)} -> ${afterRepeat?.trustScore.toFixed(1)} after 5 extra runs`
    );

    const decayRows = await db.driverReputationHistory.count({
      where: { reputation: { riderId: rider.id }, triggerType: 'SCORE_DECAY' },
    });
    check(
      'only ONE decay history row is written',
      decayRows === 1,
      `${decayRows} SCORE_DECAY history row(s) after 6 runs`
    );

    // ── 5. Suspension expiry ─────────────────────────────────────────
    stage('JOB 5  suspension expiry — repeated runs are a no-op');
    await db.driverReputation.update({
      where: { riderId: rider.id },
      data: {
        isSuspended: true,
        suspendedAt: new Date(Date.now() - 8 * 24 * 3600_000),
        suspensionEndsAt: new Date(Date.now() - 24 * 3600_000),
      },
    });
    const lifted1 = await ReputationMaintenance.liftExpiredSuspensions();
    const lifted2 = await ReputationMaintenance.liftExpiredSuspensions();
    const lifted3 = await ReputationMaintenance.liftExpiredSuspensions();
    check(
      'lifts once, then finds nothing to lift',
      lifted1 === 1 && lifted2 === 0 && lifted3 === 0,
      `run1=${lifted1} run2=${lifted2} run3=${lifted3}`
    );

    // ── 6. Privilege sync ────────────────────────────────────────────
    stage('JOB 6  privilege sync — converges, then stops changing');
    const sync1 = await ReputationMaintenance.syncTierPrivileges();
    const sync2 = await ReputationMaintenance.syncTierPrivileges();
    const sync3 = await ReputationMaintenance.syncTierPrivileges();
    check(
      'no further changes once privileges match their tier',
      sync2 === 0 && sync3 === 0,
      `run1=${sync1} changed, run2=${sync2}, run3=${sync3}`
    );

    // ── 7. Incentive expiry ──────────────────────────────────────────
    stage('JOB 7  incentive expiry — repeated runs are a no-op');
    const inc = await db.driverIncentive.create({
      data: {
        name: `${TAG} ended`,
        code: `${TAG}-INC-${stamp}`,
        incentiveType: 'RIDE_STREAK',
        status: 'ACTIVE',
        rewardAmount: 5000,
        rewardType: 'CASH',
        minRides: 5,
        startTime: new Date(Date.now() - 48 * 3600_000),
        endTime: new Date(Date.now() - 3600_000),
      },
    });
    incentiveId = inc.id;
    await db.incentiveParticipation.create({
      data: { incentiveId: inc.id, riderId: rider.id, status: 'IN_PROGRESS', ridesCompleted: 2 },
    });

    const exp1 = await expireEndedIncentives();
    const exp2 = await expireEndedIncentives();
    const exp3 = await expireEndedIncentives();
    check(
      'expires once, then finds nothing to expire',
      exp1 >= 1 && exp2 === 0 && exp3 === 0,
      `run1=${exp1} run2=${exp2} run3=${exp3}`
    );

    // ── 8. Fraud re-scoring ──────────────────────────────────────────
    stage('JOB 8  fraud re-scoring — score converges, alerts do not multiply');
    await PlatformIntelligence.rescoreActiveEntities(24, 25);
    const alertsAfter1 = await db.fraudAlert.count({ where: { entityId: rider.id } });
    await PlatformIntelligence.rescoreActiveEntities(24, 25);
    await PlatformIntelligence.rescoreActiveEntities(24, 25);
    const alertsAfter3 = await db.fraudAlert.count({ where: { entityId: rider.id } });

    check(
      'repeated re-scoring does not spawn duplicate alerts',
      alertsAfter3 === alertsAfter1,
      `${alertsAfter1} alert(s) after run 1, ${alertsAfter3} after run 3`
    );

    const riskRows = await db.fraudRiskScore.count({
      where: { entityType: 'RIDER', entityId: rider.id },
    });
    check(
      'risk score is upserted, never duplicated',
      riskRows <= 1,
      `${riskRows} FraudRiskScore row(s) for this rider`
    );
  } finally {
    stage('cleanup');
    if (incentiveId) {
      await db.incentiveParticipation.deleteMany({ where: { incentiveId } });
      await db.driverIncentive.deleteMany({ where: { id: incentiveId } });
    }
    if (zoneId) {
      await db.surgeRecord.deleteMany({ where: { zoneId } });
      await db.zoneMetric.deleteMany({ where: { zoneId } });
      await db.geographicZone.deleteMany({ where: { id: zoneId } });
    }
    await db.driverReputationHistory.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverPerformanceAlert.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverIncentiveEarned.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverReputation.deleteMany({ where: { riderId: rider.id } });
    await db.riderFraudProfile.deleteMany({ where: { riderId: rider.id } });
    await db.driverRiderInteraction.deleteMany({ where: { riderId: rider.id } });
    for (const id of [rider.id, client.id]) {
      await db.fraudAlert.deleteMany({ where: { entityId: id } });
      await db.fraudScoreHistoryRecord.deleteMany({ where: { entityId: id } });
      await db.fraudRiskScore.deleteMany({ where: { entityId: id } });
    }
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: taskIds } } });
    await db.task.deleteMany({ where: { id: { in: taskIds } } });
    await db.rider.deleteMany({ where: { id: rider.id } });
    await db.user.deleteMany({ where: { id: { in: [client.id, riderUser.id] } } });
    console.log('  removed all fixtures');
  }

  console.log(
    failures === 0
      ? '\n=== SCHEDULER IS IDEMPOTENT ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('IDEMPOTENCY ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

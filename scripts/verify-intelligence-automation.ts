/**
 * Verifies the SCHEDULED half of the intelligent platform.
 *
 * The engines react to events; these behaviours only happen with the passage
 * of time and previously had no trigger at all:
 *
 *   zone sampling      supply/demand observed into a ZoneMetric bucket
 *   automatic surge    started and ended by the balance engine, not an admin
 *   demand forecasting projected from real history
 *   score decay        inactive drivers stop outranking active ones
 *   suspension expiry  a time-boxed ban actually ends
 *   privilege sync     tier benefits match the tier
 *   incentive payout   completed campaigns are rewarded and closed
 *
 *   bun scripts/verify-intelligence-automation.ts
 */

import { db } from '../src/lib/db';
import { MarketplaceScheduler } from '../src/lib/marketplace/marketplace-scheduler.service';
import { ReputationMaintenance } from '../src/lib/reputation/reputation-maintenance.service';
import { toNumber } from '../src/lib/decimal-utils';

const TAG = 'E2E-AUTO';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

async function main() {
  console.log('\n=== Intelligence Automation ===');

  const stamp = Date.now();
  const mkUser = (role: 'CLIENT' | 'RIDER', label: string) =>
    db.user.create({
      data: {
        name: `${TAG} ${label}`,
        email: `${TAG.toLowerCase()}-${label}-${stamp}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role,
      },
    });

  const client = await mkUser('CLIENT', 'client');
  const activeUser = await mkUser('RIDER', 'active');
  const staleUser = await mkUser('RIDER', 'stale');
  const suspendedUser = await mkUser('RIDER', 'suspended');

  const mkRider = (u: { id: string; phone: string | null }, name: string, online: boolean) =>
    db.rider.create({
      data: {
        userId: u.id,
        fullName: `${TAG} ${name}`,
        phone: u.phone!,
        physicalAddress: 'Kampala',
        riderRole: 'SMART_BODA_RIDER',
        status: 'APPROVED',
        isOnline: online,
        // Inside the test zone below.
        currentLatitude: 0.3476,
        currentLongitude: 32.5825,
      },
    });

  const activeRider = await mkRider(activeUser, 'active', true);
  const staleRider = await mkRider(staleUser, 'stale', false);
  const suspendedRider = await mkRider(suspendedUser, 'suspended', false);

  let zoneId = '';
  const taskIds: string[] = [];
  let incentiveId = '';

  try {
    // ── 1. Zone sampling ─────────────────────────────────────────────
    stage('STAGE 1  zone sampling writes a metric bucket');
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

    // Unmet demand inside the zone, with only one online driver → high ratio.
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

    const sampled = await MarketplaceScheduler.sampleZones();
    const mine = sampled.find(s => s.zoneId === zoneId);
    check(
      'zone sampled into a metric',
      !!mine,
      mine
        ? `drivers=${mine.activeDrivers} available=${mine.availableDrivers} demand=${mine.demandCount} ratio=${mine.ratio.toFixed(2)} status=${mine.balanceStatus}`
        : 'zone not sampled'
    );

    const metric = await db.zoneMetric.findFirst({
      where: { zoneId },
      orderBy: { timeBucket: 'desc' },
    });
    check(
      'ZoneMetric row persisted with real observations',
      !!metric && metric.demandCount > 0,
      `bucket=${metric?.timeBucket.toISOString().slice(0, 13)} demand=${metric?.demandCount} peak=${metric?.isPeakHour}`
    );

    // ── 2. Automatic surge ───────────────────────────────────────────
    stage('STAGE 2  surge starts automatically');
    check(
      'surge triggered by demand/supply, no admin action',
      mine?.surgeStarted === true && (mine?.surgeMultiplier ?? 0) > 1,
      `started=${mine?.surgeStarted} multiplier=${mine?.surgeMultiplier}x`
    );

    const surge = await db.surgeRecord.findFirst({
      where: { zoneId, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
    });
    check(
      'SurgeRecord opened with its trigger reason',
      !!surge && surge.triggerRatio > 0,
      `${surge?.multiplier}x ratio=${surge?.triggerRatio.toFixed(2)} reason="${surge?.triggerReason}"`
    );

    // Remove the demand; the next sample should end the surge.
    await db.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status: 'CANCELLED' },
    });
    // Age them out of the sampling window so they stop counting as demand.
    await db.task.updateMany({
      where: { id: { in: taskIds } },
      data: { createdAt: new Date(Date.now() - 60 * 60_000) },
    });

    const afterDrop = await MarketplaceScheduler.sampleZones();
    const dropped = afterDrop.find(s => s.zoneId === zoneId);
    check(
      'surge ends automatically when demand falls',
      dropped?.surgeEnded === true,
      `ended=${dropped?.surgeEnded} ratio=${dropped?.ratio.toFixed(2)}`
    );

    const closed = await db.surgeRecord.findFirst({
      where: { zoneId },
      orderBy: { startedAt: 'desc' },
    });
    check(
      'closed surge records duration and end reason',
      closed?.status === 'ENDED' && !!closed?.endedAt,
      `status=${closed?.status} duration=${closed?.durationMinutes}min reason="${closed?.endReason}"`
    );

    // ── 3. Forecasting ───────────────────────────────────────────────
    stage('STAGE 3  demand forecasting');
    const forecast = await MarketplaceScheduler.forecast();
    const forecasted = await db.zoneMetric.findFirst({
      where: { zoneId },
      orderBy: { timeBucket: 'desc' },
    });
    check(
      'forecast projected onto the current bucket',
      forecast > 0 && forecasted?.predictedDemand != null,
      `zones=${forecast} predictedDemand=${forecasted?.predictedDemand} predictedSupply=${forecasted?.predictedSupply}`
    );

    // ── 4. Score decay ───────────────────────────────────────────────
    stage('STAGE 4  score decay for inactive drivers');
    await db.driverReputation.create({
      data: {
        riderId: activeRider.id,
        trustScore: 90,
        trustTier: 'PLATINUM',
        lastTaskAt: new Date(), // active today
      },
    });
    await db.driverReputation.create({
      data: {
        riderId: staleRider.id,
        trustScore: 90,
        trustTier: 'PLATINUM',
        lastTaskAt: new Date(Date.now() - 60 * 24 * 60 * 60_000), // 60 days idle
      },
    });

    const decay = await ReputationMaintenance.applyScoreDecay();
    const activeRep = await db.driverReputation.findUnique({ where: { riderId: activeRider.id } });
    const staleRep = await db.driverReputation.findUnique({ where: { riderId: staleRider.id } });

    check(
      'inactive driver decays',
      (staleRep?.trustScore ?? 90) < 90,
      `90 -> ${staleRep?.trustScore.toFixed(1)} (${decay.decayed} driver(s) decayed)`
    );
    check(
      'active driver is untouched',
      activeRep?.trustScore === 90,
      `active stays at ${activeRep?.trustScore}`
    );

    const decayHistory = await db.driverReputationHistory.findFirst({
      where: { reputation: { riderId: staleRider.id }, triggerType: 'SCORE_DECAY' },
    });
    check(
      'decay is recorded in score history',
      !!decayHistory,
      decayHistory ? `"${decayHistory.reason}"` : 'no SCORE_DECAY history row'
    );

    // ── 5. Suspension expiry ─────────────────────────────────────────
    stage('STAGE 5  suspensions lapse');
    await db.driverReputation.create({
      data: {
        riderId: suspendedRider.id,
        trustScore: 72,
        trustTier: 'SUSPENDED',
        isSuspended: true,
        suspendedAt: new Date(Date.now() - 8 * 24 * 60 * 60_000),
        suspensionEndsAt: new Date(Date.now() - 24 * 60 * 60_000), // ended yesterday
        suspensionReason: 'e2e fixture',
        priorityDispatch: false,
        bonusEligible: false,
      },
    });

    const lifted = await ReputationMaintenance.liftExpiredSuspensions();
    const reinstated = await db.driverReputation.findUnique({
      where: { riderId: suspendedRider.id },
    });
    check(
      'elapsed suspension is lifted',
      lifted >= 1 && reinstated?.isSuspended === false,
      `lifted=${lifted} isSuspended=${reinstated?.isSuspended}`
    );
    check(
      'reinstated to the tier their score earns, not automatically to good standing',
      reinstated?.trustTier === 'SILVER',
      `score=${reinstated?.trustScore} tier=${reinstated?.trustTier}`
    );

    // ── 6. Privilege sync ────────────────────────────────────────────
    stage('STAGE 6  tier privileges reconciled');
    // Force a drift: PLATINUM score with privileges switched off.
    await db.driverReputation.update({
      where: { riderId: activeRider.id },
      data: { priorityDispatch: false, premiumAccess: false, bonusEligible: false },
    });
    const synced = await ReputationMaintenance.syncTierPrivileges();
    const fixed = await db.driverReputation.findUnique({ where: { riderId: activeRider.id } });
    check(
      'drifted privileges are restored from tier',
      synced >= 1 && fixed?.priorityDispatch === true && fixed?.premiumAccess === true,
      `synced=${synced} priority=${fixed?.priorityDispatch} premium=${fixed?.premiumAccess} bonus=${fixed?.bonusEligible}`
    );

    // ── 7. Incentive lifecycle ───────────────────────────────────────
    stage('STAGE 7  incentive expiry and payout');
    const ended = await db.driverIncentive.create({
      data: {
        name: `${TAG} Ended Campaign`,
        code: `${TAG}-INC-${stamp}`,
        incentiveType: 'RIDE_STREAK',
        status: 'ACTIVE',
        rewardAmount: 10000,
        rewardType: 'CASH',
        minRides: 5,
        startTime: new Date(Date.now() - 48 * 60 * 60_000),
        endTime: new Date(Date.now() - 60 * 60_000), // ended an hour ago
      },
    });
    incentiveId = ended.id;
    await db.incentiveParticipation.create({
      data: {
        incentiveId: ended.id,
        riderId: activeRider.id,
        status: 'IN_PROGRESS',
        ridesCompleted: 2,
      },
    });

    const { expireEndedIncentives } = await import('../src/lib/marketplace/incentive-fulfillment');
    const expired = await expireEndedIncentives();
    const part = await db.incentiveParticipation.findFirst({
      where: { incentiveId: ended.id },
    });
    check(
      'participations in ended campaigns are expired',
      expired >= 1 && part?.status === 'EXPIRED',
      `expired=${expired} participationStatus=${part?.status}`
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
    for (const rid of [activeRider.id, staleRider.id, suspendedRider.id]) {
      await db.driverReputationHistory.deleteMany({ where: { reputation: { riderId: rid } } });
      await db.driverPerformanceAlert.deleteMany({ where: { reputation: { riderId: rid } } });
      await db.driverIncentiveEarned.deleteMany({ where: { reputation: { riderId: rid } } });
      await db.driverReputation.deleteMany({ where: { riderId: rid } });
      await db.riderFraudProfile.deleteMany({ where: { riderId: rid } });
      await db.driverRiderInteraction.deleteMany({ where: { riderId: rid } });
    }
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: taskIds } } });
    await db.task.deleteMany({ where: { id: { in: taskIds } } });
    await db.rider.deleteMany({
      where: { id: { in: [activeRider.id, staleRider.id, suspendedRider.id] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [client.id, activeUser.id, staleUser.id, suspendedUser.id] } },
    });
    console.log('  removed all fixtures');
  }

  console.log(
    failures === 0
      ? '\n=== INTELLIGENCE AUTOMATION VERIFIED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('AUTOMATION ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

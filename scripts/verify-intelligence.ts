/**
 * End-to-end verification of the intelligent platform layer.
 *
 * Drives PlatformIntelligence with realistic events against the live database
 * and asserts that scores actually MOVE — a passing typecheck proves nothing
 * about whether reputation, risk and incentive progress respond to reality.
 *
 * Creates its own throwaway rider/client/tasks and removes them afterwards.
 *   npx tsx scripts/verify-intelligence.ts
 */

import { db } from '../src/lib/db';
import { PlatformIntelligence } from '../src/lib/intelligence/platform-events.service';

const TAG = 'VERIFY-INTEL';
let failures = 0;

function check(label: string, condition: boolean, detail: string) {
  if (condition) {
    console.log(`  PASS  ${label} — ${detail}`);
  } else {
    console.log(`  FAIL  ${label} — ${detail}`);
    failures++;
  }
}

async function main() {
  console.log('\n=== Intelligent Platform Verification ===\n');

  // ── Fixtures ──────────────────────────────────────────────────────────
  const user = await db.user.create({
    data: {
      name: `${TAG} Driver`,
      email: `${TAG.toLowerCase()}-driver-${Date.now()}@smartride.test`,
      phone: `+25670${Date.now().toString().slice(-7)}`,
      role: 'RIDER',
    },
  });
  const client = await db.user.create({
    data: {
      name: `${TAG} Client`,
      email: `${TAG.toLowerCase()}-client-${Date.now()}@smartride.test`,
      phone: `+25671${Date.now().toString().slice(-7)}`,
      role: 'CLIENT',
    },
  });
  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: `${TAG} Driver`,
      phone: user.phone!,
      physicalAddress: 'Kampala, Uganda',
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
    },
  });

  const seq = await db.taskSequence.findFirst();
  let taskCounter = Date.now();
  const makeTask = async (over: Record<string, unknown> = {}) =>
    db.task.create({
      data: {
        taskNumber: `${TAG}-${taskCounter++}`,
        taskType: 'SMART_BODA_RIDE',
        clientId: client.id,
        riderId: rider.id,
        status: 'COMPLETED',
        pickupAddress: 'Kampala',
        dropoffAddress: 'Entebbe',
        pickupLatitude: 0.3476,
        pickupLongitude: 32.5825,
        dropoffLatitude: 0.0512,
        dropoffLongitude: 32.4637,
        distanceKm: 12,
        baseFare: 5000,
        paymentMethod: 'CASH',
        totalAmount: 15000,
        riderEarnings: 12000,
        completedAt: new Date(),
        acceptedAt: new Date(Date.now() - 20 * 60000),
        arrivedAtPickupAt: new Date(Date.now() - 18 * 60000),
        ...over,
      },
    });

  const createdTaskIds: string[] = [];

  try {
    // ── 1. Task completion drives reputation ───────────────────────────
    const t1 = await makeTask();
    createdTaskIds.push(t1.id);
    await PlatformIntelligence.onTaskCompleted(t1.id);

    let rep = await db.driverReputation.findUnique({ where: { riderId: rider.id } });
    check(
      'reputation created on completion',
      !!rep && rep.totalTasksCompleted === 1,
      `totalTasksCompleted=${rep?.totalTasksCompleted}, trustScore=${rep?.trustScore.toFixed(1)}`
    );
    check(
      'punctuality recorded (on time)',
      !!rep && rep.onTimeArrivals === 1,
      `onTime=${rep?.onTimeArrivals} late=${rep?.lateArrivals}`
    );

    // Late arrival: accepted 60m before reaching pickup, past the 15m SLA
    const t2 = await makeTask({
      acceptedAt: new Date(Date.now() - 60 * 60000),
      arrivedAtPickupAt: new Date(Date.now() - 20 * 60000),
    });
    createdTaskIds.push(t2.id);
    await PlatformIntelligence.onTaskCompleted(t2.id);
    rep = await db.driverReputation.findUnique({ where: { riderId: rider.id } });
    check(
      'late arrival detected',
      !!rep && rep.lateArrivals === 1,
      `late=${rep?.lateArrivals} avgDelay=${rep?.averageArrivalDelay.toFixed(1)}min`
    );

    // ── 2. Ratings move the trust score ────────────────────────────────
    // Use poor ratings: a fresh driver already computes to 100 (rating 5,
    // completion 1, acceptance 1, safety 100, fraud 100), so only a downward
    // move proves the rating actually feeds the score.
    const before = rep!.trustScore;
    await PlatformIntelligence.onRatingSubmitted(rider.id, t1.id, { score: 1, comment: 'Rude driver' });
    await PlatformIntelligence.onRatingSubmitted(rider.id, t2.id, { score: 2, comment: 'Late and unsafe' });
    rep = await db.driverReputation.findUnique({ where: { riderId: rider.id } });
    check(
      'poor ratings lower trust score',
      !!rep && rep.trustScore < before,
      `${before.toFixed(1)} -> ${rep?.trustScore.toFixed(1)} (avgRating=${rep?.averageRating.toFixed(2)})`
    );
    check(
      'complaints counted from low ratings with comments',
      !!rep && rep.totalComplaints === 2,
      `complaints=${rep?.totalComplaints} streak=${rep?.currentStreak}`
    );

    const history = await db.driverReputationHistory.count({
      where: { reputationId: rep!.id },
    });
    check('score history appended', history >= 4, `${history} history rows`);

    // ── 3. Dispatch offers move acceptance rate ────────────────────────
    const accBefore = rep!.acceptanceRate;
    await PlatformIntelligence.onDispatchOffer(rider.id, 'ACCEPTED');
    await PlatformIntelligence.onDispatchOffer(rider.id, 'DECLINED');
    await PlatformIntelligence.onDispatchOffer(rider.id, 'IGNORED');
    rep = await db.driverReputation.findUnique({ where: { riderId: rider.id } });
    check(
      'dispatch offers tracked',
      !!rep && rep.totalRequestsReceived === 3 && rep.totalRequestsAccepted === 1,
      `received=${rep?.totalRequestsReceived} accepted=${rep?.totalRequestsAccepted} declined=${rep?.totalRequestsDeclined} ignored=${rep?.totalRequestsIgnored}`
    );
    check(
      'acceptance rate recomputed',
      !!rep && rep.acceptanceRate !== accBefore,
      `${accBefore.toFixed(2)} -> ${rep?.acceptanceRate.toFixed(2)}`
    );

    // ── 4. Cancellation hurts completion rate ──────────────────────────
    const t3 = await makeTask({ status: 'CANCELLED', completedAt: null });
    createdTaskIds.push(t3.id);
    const compBefore = rep!.completionRate;
    await PlatformIntelligence.onTaskCancelled(t3.id, 'RIDER_CANCELLED');
    rep = await db.driverReputation.findUnique({ where: { riderId: rider.id } });
    check(
      'cancellation lowers completion rate',
      !!rep && rep.completionRate < compBefore,
      `${compBefore.toFixed(3)} -> ${rep?.completionRate.toFixed(3)} (cancelled=${rep?.totalTasksCancelled})`
    );

    // ── 5. Collusion ledger from repeated pairing ──────────────────────
    const interaction = await db.driverRiderInteraction.findUnique({
      where: { riderId_clientId: { riderId: rider.id, clientId: client.id } },
    });
    check(
      'rider-client interaction ledger built',
      !!interaction && interaction.totalRides >= 2,
      `totalRides=${interaction?.totalRides} collusionScore=${interaction?.collusionScore.toFixed(1)}`
    );

    // Drive the pair well past the collusion threshold with short trips
    for (let i = 0; i < 8; i++) {
      await PlatformIntelligence.recordInteraction(rider.id, client.id, 3000, 0.8);
    }
    const colluded = await db.driverRiderInteraction.findUnique({
      where: { riderId_clientId: { riderId: rider.id, clientId: client.id } },
    });
    check(
      'collusion score rises with short repeat rides',
      !!colluded && colluded.collusionScore > (interaction?.collusionScore ?? 0),
      `score=${colluded?.collusionScore.toFixed(1)} flagged=${colluded?.isFlagged} shortRides=${colluded?.shortRideCount}`
    );

    // ── 6. Behaviour profile computed from real history ────────────────
    const profile = await db.riderFraudProfile.findUnique({ where: { riderId: rider.id } });
    check(
      'behaviour profile derived from tasks',
      !!profile && profile.totalRides > 0,
      `rides=${profile?.totalRides} avgDist=${profile?.avgRideDistance.toFixed(1)}km repeatClient=${profile?.repeatClientRatio.toFixed(2)} cancelRate=${profile?.cancellationRate.toFixed(2)}`
    );

    // ── 7. Risk scoring + automatic escalation ─────────────────────────
    await PlatformIntelligence.applyRiskScore('RIDER', rider.id, 35, 'baseline');
    let risk = await db.fraudRiskScore.findUnique({
      where: { entityType_entityId: { entityType: 'RIDER', entityId: rider.id } },
    });
    check('risk score persisted', !!risk && risk.riskLevel === 'MEDIUM', `score=${risk?.riskScore} level=${risk?.riskLevel}`);

    await PlatformIntelligence.applyRiskScore('RIDER', rider.id, 85, 'multiple anomalies');
    risk = await db.fraudRiskScore.findUnique({
      where: { entityType_entityId: { entityType: 'RIDER', entityId: rider.id } },
    });
    check(
      'crossing threshold auto-restricts',
      !!risk && risk.isRestricted && risk.riskLevel === 'CRITICAL',
      `score=${risk?.riskScore} restricted=${risk?.isRestricted}`
    );

    const escalated = await db.fraudAlert.count({
      where: { entityType: 'RIDER', entityId: rider.id },
    });
    check('review alert raised on threshold crossing', escalated === 1, `${escalated} alert(s) — exactly one, not one per recalculation`);

    const riskHistory = await db.fraudScoreHistoryRecord.count({
      where: { entityType: 'RIDER', entityId: rider.id },
    });
    check('risk history appended', riskHistory >= 2, `${riskHistory} history rows`);

    // ── 8. Device trust / multi-account farming ────────────────────────
    const devId = `${TAG}-device-${Date.now()}`;
    await PlatformIntelligence.onDeviceSeen({ deviceId: devId, riderId: rider.id });
    await PlatformIntelligence.onDeviceSeen({ deviceId: devId, userId: client.id });
    const count = await PlatformIntelligence.onDeviceSeen({ deviceId: devId, userId: user.id });
    const device = await db.deviceFingerprint.findUnique({ where: { deviceId: devId } });
    check(
      'multi-account device farming flagged',
      count >= 3 && !!device?.isFlagged,
      `accounts=${count} flagged=${device?.isFlagged} riskScore=${device?.riskScore}`
    );

    // ── 9. Fraud signal feeds reputation ───────────────────────────────
    const safetyBefore = (await db.driverReputation.findUnique({ where: { riderId: rider.id } }))!.fraudRiskScore;
    await PlatformIntelligence.onFraudSignal(rider.id, 'GPS_SPOOFING', 'impossible speed');
    rep = await db.driverReputation.findUnique({ where: { riderId: rider.id } });
    check(
      'fraud signal lowers reputation fraud score',
      !!rep && rep.fraudRiskScore < safetyBefore,
      `${safetyBefore.toFixed(1)} -> ${rep?.fraudRiskScore.toFixed(1)}, trust=${rep?.trustScore.toFixed(1)} tier=${rep?.trustTier}`
    );
  } finally {
    // ── Cleanup ────────────────────────────────────────────────────────
    await db.fraudAlert.deleteMany({ where: { entityId: rider.id } });
    await db.fraudScoreHistoryRecord.deleteMany({ where: { entityId: rider.id } });
    await db.fraudRiskScore.deleteMany({ where: { entityId: rider.id } });
    await db.driverRiderInteraction.deleteMany({ where: { riderId: rider.id } });
    await db.riderFraudProfile.deleteMany({ where: { riderId: rider.id } });
    await db.riderDeviceAssociation.deleteMany({ where: { riderId: rider.id } });
    await db.userDeviceAssociation.deleteMany({ where: { userId: { in: [user.id, client.id] } } });
    await db.deviceFingerprint.deleteMany({ where: { deviceId: { startsWith: `${TAG}-device` } } });
    await db.driverReputationHistory.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverPerformanceAlert.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverSafetyEvent.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverIncentiveEarned.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverReputation.deleteMany({ where: { riderId: rider.id } });
    await db.rating.deleteMany({ where: { toRiderId: rider.id } });
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: createdTaskIds } } });
    await db.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    await db.rider.delete({ where: { id: rider.id } });
    await db.user.deleteMany({ where: { id: { in: [user.id, client.id] } } });
    console.log('\n  cleanup complete');
  }

  console.log(
    failures === 0
      ? '\n=== ALL CHECKS PASSED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('VERIFICATION ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

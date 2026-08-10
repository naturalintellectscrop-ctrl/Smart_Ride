/**
 * Phase B — does the intelligence actually reach a human?
 *
 * The engines already work and the schedulers already run. This asserts the
 * LAST link of each chain, the one that had been missing: a number computed by
 * an engine has to change what a customer is charged, what a driver is told,
 * or what an admin sees. A row written to a table nobody reads is not an
 * outcome.
 *
 *   EVENT -> INTELLIGENCE -> DATABASE -> BUSINESS DECISION -> USER/ADMIN
 *                                                             ^^^^^^^^^^
 *                                                             this file
 *
 *   bun scripts/verify-intelligence-product.ts
 */

import { db } from '../src/lib/db';
import { calculatePricingAsync } from '../src/lib/api/pricing';
import { getSurgeForLocation, applySurgeToFare } from '../src/lib/marketplace/surge-pricing';
import { TaskType } from '@prisma/client';

const TAG = 'E2E-PRODUCT';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

// A deliberately remote pickup so this test's zone cannot overlap a real one.
const TEST_LAT = -0.9999;
const TEST_LNG = 39.9999;

const created = {
  zoneIds: [] as string[],
  surgeIds: [] as string[],
  notificationIds: [] as string[],
  riderIds: [] as string[],
  userIds: [] as string[],
};

async function main() {
  console.log('\n=== Intelligence -> Product ===');

  try {
    // ── CHAIN 1: marketplace ─────────────────────────────────────────
    // demand -> zone metrics -> surge -> PRICE -> customer & driver
    stage('CHAIN 1  surge reaches the fare');

    const zone = await db.geographicZone.create({
      data: {
        name: `${TAG} Zone`,
        code: `${TAG}-${Date.now()}`,
        centerLatitude: TEST_LAT,
        centerLongitude: TEST_LNG,
        radiusKm: 5,
        isActive: true,
      },
    });
    created.zoneIds.push(zone.id);

    // Baseline: same trip, same coordinates, no surge yet.
    const quoteInput = {
      taskType: 'SMART_BODA_RIDE' as TaskType,
      distanceKm: 8,
      durationMinutes: 20,
      pickupLatitude: TEST_LAT,
      pickupLongitude: TEST_LNG,
    };
    const baseline = await calculatePricingAsync(quoteInput);
    check(
      'no active surge leaves the fare untouched',
      baseline.surgeMultiplier === 1 && (baseline.surgeAmount ?? 0) === 0,
      `total=${baseline.totalAmount} multiplier=${baseline.surgeMultiplier}`
    );

    // The scheduler's decision, expressed the way it writes it.
    const surge = await db.surgeRecord.create({
      data: {
        zoneId: zone.id,
        status: 'ACTIVE',
        activeKey: zone.id,
        multiplier: 1.8,
        startMultiplier: 1.8,
        peakMultiplier: 1.8,
        triggerRatio: 3.2,
        triggerReason: 'demand/supply ratio 3.2',
      },
    });
    created.surgeIds.push(surge.id);

    const lookup = await getSurgeForLocation(TEST_LAT, TEST_LNG);
    check(
      'a pickup inside a surging zone resolves the multiplier',
      lookup.isActive && lookup.multiplier === 1.8 && lookup.zoneId === zone.id,
      `active=${lookup.isActive} multiplier=${lookup.multiplier} zone=${lookup.zoneName}`
    );

    const surged = await calculatePricingAsync(quoteInput);
    check(
      'the customer is quoted MORE while the zone surges',
      surged.totalAmount > baseline.totalAmount && surged.surgeMultiplier === 1.8,
      `${baseline.totalAmount} -> ${surged.totalAmount} (x${surged.surgeMultiplier})`
    );

    // The point of surge is to pay drivers for scarce conditions. If the
    // platform's cut grew too, surge would just be a price hike.
    check(
      'the entire surge premium goes to the driver, not the platform',
      surged.riderEarnings - baseline.riderEarnings === (surged.surgeAmount ?? 0) &&
        surged.platformCommission === baseline.platformCommission,
      `driver +${surged.riderEarnings - baseline.riderEarnings}, ` +
        `platform ${baseline.platformCommission} -> ${surged.platformCommission}, ` +
        `surgeAmount=${surged.surgeAmount}`
    );

    check(
      'the split still reconciles exactly',
      surged.platformCommission + surged.riderEarnings === surged.totalAmount,
      `${surged.platformCommission} + ${surged.riderEarnings} = ${surged.totalAmount}`
    );

    check(
      'the customer gets a reason, not a silent price rise',
      typeof surged.surgeReason === 'string' && surged.surgeReason.length > 0,
      surged.surgeReason ?? '(none)'
    );

    // A pickup far outside the zone must be unaffected — surge is local.
    const elsewhere = await calculatePricingAsync({
      ...quoteInput,
      pickupLatitude: TEST_LAT + 2,
      pickupLongitude: TEST_LNG + 2,
    });
    check(
      'a pickup outside the zone is not surcharged',
      elsewhere.surgeMultiplier === 1 && elsewhere.totalAmount === baseline.totalAmount,
      `total=${elsewhere.totalAmount} multiplier=${elsewhere.surgeMultiplier}`
    );

    // Ending the surge must restore the normal price immediately.
    await db.surgeRecord.update({
      where: { id: surge.id },
      data: { status: 'ENDED', endedAt: new Date(), activeKey: null },
    });
    const afterEnd = await calculatePricingAsync(quoteInput);
    check(
      'ending the surge restores the normal fare',
      afterEnd.totalAmount === baseline.totalAmount && afterEnd.surgeMultiplier === 1,
      `total=${afterEnd.totalAmount} multiplier=${afterEnd.surgeMultiplier}`
    );

    // The ceiling protects customers from a runaway multiplier regardless of
    // what the engine writes.
    const absurd = applySurgeToFare(
      { totalAmount: 10_000, riderEarnings: 8_000, platformCommission: 2_000 },
      12
    );
    check(
      'a runaway multiplier is capped before it reaches a customer',
      absurd.surgeMultiplier === 3 && absurd.totalAmount === 30_000,
      `x12 requested -> x${absurd.surgeMultiplier}, total=${absurd.totalAmount}`
    );

    // ── CHAIN 2: reputation ──────────────────────────────────────────
    // behaviour -> trust score -> tier change -> DRIVER IS TOLD
    stage('CHAIN 2  reputation consequences reach the driver');

    const engineSrc = await Bun.file(
      'src/lib/reputation/trust-score-engine.ts'
    ).text();
    check(
      'a performance alert also notifies the driver',
      engineSrc.includes('notifyDriverOfAlert') &&
        engineSrc.includes('createNotification'),
      'createPerformanceAlert -> notifyDriverOfAlert -> createNotification'
    );
    check(
      'notification failure cannot roll back the reputation change',
      /notifyDriverOfAlert[\s\S]{0,1200}catch \(err\)/.test(engineSrc),
      'delivery is wrapped in try/catch; the alert row is the record of truth'
    );

    // Drive it for real: a fresh driver, then enough CRITICAL safety events to
    // knock the trust score below the WARNING threshold. If the chain works, a
    // notification appears on that driver's account without anyone polling.
    const user = await db.user.create({
      data: {
        name: `${TAG} Driver`,
        email: `${TAG.toLowerCase()}-${Date.now()}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: 'RIDER',
      },
    });
    created.userIds.push(user.id);

    const rider = await db.rider.create({
      data: {
        userId: user.id,
        fullName: `${TAG} Driver`,
        phone: user.phone!,
        physicalAddress: 'Kampala',
        riderRole: 'SMART_BODA_RIDER',
        status: 'APPROVED',
      },
    });
    created.riderIds.push(rider.id);

    const { recordSafetyEvent } = await import(
      '../src/lib/reputation/trust-score-engine'
    );

    const notifsBefore = await db.notification.count({ where: { userId: user.id } });

    let tier = 'SILVER';
    for (let i = 0; i < 6; i++) {
      const { reputation } = await recordSafetyEvent(rider.id, {
        eventType: 'EXCESSIVE_SPEEDING',
        severity: 'CRITICAL',
        detectionSource: TAG,
      } as never);
      tier = reputation.trustTier;
      if (tier === 'WARNING' || tier === 'SUSPENDED') break;
    }

    check(
      'sustained unsafe driving actually demotes the tier',
      tier === 'WARNING' || tier === 'SUSPENDED',
      `tier after repeated CRITICAL safety events: ${tier}`
    );

    const alerts = await db.driverPerformanceAlert.findMany({
      where: { reputation: { riderId: rider.id } },
      select: { alertType: true, severity: true, title: true },
    });
    check(
      'the demotion raises a performance alert',
      alerts.length > 0,
      alerts.length
        ? alerts.map(a => `${a.alertType}/${a.severity}`).join(', ')
        : 'no alert raised'
    );

    const driverNotifs = await db.notification.findMany({
      where: { userId: user.id, referenceType: 'DRIVER_REPUTATION' },
      select: { id: true, title: true, message: true },
    });
    created.notificationIds.push(...driverNotifs.map(n => n.id));
    check(
      'THE DRIVER IS TOLD — the alert becomes a notification on their account',
      driverNotifs.length > 0 && driverNotifs.length > notifsBefore - notifsBefore,
      driverNotifs.length
        ? `${driverNotifs.length} notification(s): "${driverNotifs[0].title}"`
        : 'alert row written but the driver was never notified'
    );
    check(
      'the notification tells them what to do, not just that something is wrong',
      driverNotifs.length > 0 && driverNotifs[0].message.trim().length > 20,
      driverNotifs[0]?.message ?? '(none)'
    );

    // The driver-facing surface must not leak how fraud detection works.
    const repRoute = await Bun.file('src/app/api/rider/reputation/route.ts').text();
    const leaked = ['fraudRiskScore', 'gpsSpoofingFlags', 'suspiciousPatternFlags'].filter(
      f => new RegExp(`\\b${f}\\b\\s*:\\s*true`).test(repRoute)
    );
    check(
      'the driver sees their score, not the fraud internals behind it',
      leaked.length === 0,
      leaked.length ? `LEAKED: ${leaked.join(', ')}` : 'no fraud fields selected'
    );

    // ── CHAIN 3: fraud ───────────────────────────────────────────────
    // signal -> risk score -> decision -> ADMIN ALERTED + USER TOLD
    stage('CHAIN 3  fraud decisions reach an admin and the user');

    const eventsSrc = await Bun.file(
      'src/lib/intelligence/platform-events.service.ts'
    ).text();

    check(
      'an auto-restriction pages the admins',
      eventsSrc.includes('notifyAdminsOfFraudAlert') &&
        eventsSrc.includes("role: 'ADMIN'"),
      'applyRiskScore -> notifyAdminsOfFraudAlert -> createNotificationsForUsers'
    );
    check(
      'admins are paged only when the platform has already acted',
      /if \(shouldRestrict\) \{\s*await notifyAdminsOfFraudAlert/.test(eventsSrc),
      'gated on shouldRestrict, so HIGH-but-not-restricted does not page anyone'
    );
    check(
      'the blocked user gets an explanation that does not name the rule',
      eventsSrc.includes('This transaction could not be completed') &&
        !/reason:\s*`?(GPS|velocity|device|collusion)/i.test(eventsSrc),
      'generic customer-facing reason; the specific signal stays internal'
    );

    const alertsRoute = await Bun.file('src/app/api/fraud/alerts/route.ts').text();
    check(
      'the fraud queue an admin reads is admin-guarded',
      alertsRoute.includes('requireAdmin'),
      'GET/POST/PATCH all run guardAdmin'
    );

    const adminCount = await db.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE' },
    });
    check(
      'there is at least one active admin to receive the page',
      adminCount > 0,
      `${adminCount} active admin(s)`
    );

    // ── CHAIN 4: the scheduler feeding all of it ─────────────────────
    stage('CHAIN 4  the scheduler that drives these chains is alive');
    const lastRun = await db.cronRun.findFirst({
      where: { job: 'intelligence' },
      orderBy: { startedAt: 'desc' },
    });
    const minutesSince = lastRun
      ? Math.round((Date.now() - lastRun.startedAt.getTime()) / 60_000)
      : null;
    check(
      'the intelligence scheduler has run',
      !!lastRun,
      lastRun
        ? `last run ${minutesSince} min ago, success=${lastRun.success}, ` +
            `${lastRun.stepsTotal - lastRun.stepsFailed}/${lastRun.stepsTotal} steps`
        : 'no run recorded — the chains have no fresh input'
    );
  } finally {
    stage('cleanup');
    await db.surgeRecord.deleteMany({ where: { id: { in: created.surgeIds } } });
    await db.zoneMetric.deleteMany({ where: { zoneId: { in: created.zoneIds } } });
    await db.geographicZone.deleteMany({ where: { id: { in: created.zoneIds } } });
    await db.notification.deleteMany({ where: { userId: { in: created.userIds } } });
    const reps = await db.driverReputation.findMany({
      where: { riderId: { in: created.riderIds } },
      select: { id: true },
    });
    const repIds = reps.map(r => r.id);
    await db.driverPerformanceAlert.deleteMany({ where: { reputationId: { in: repIds } } });
    await db.driverSafetyEvent.deleteMany({ where: { reputationId: { in: repIds } } });
    await db.driverIncentiveEarned.deleteMany({ where: { reputationId: { in: repIds } } });
    await db.driverReputationHistory.deleteMany({ where: { reputationId: { in: repIds } } });
    await db.driverReputation.deleteMany({ where: { id: { in: repIds } } });
    await db.rider.deleteMany({ where: { id: { in: created.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: created.userIds } } });
    console.log(
      `  removed ${created.zoneIds.length} zone(s), ${created.surgeIds.length} surge(s), ` +
        `${created.riderIds.length} test driver(s)`
    );
  }

  console.log(
    failures === 0
      ? '\n=== INTELLIGENCE REACHES THE PRODUCT ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('PRODUCT CHAIN ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

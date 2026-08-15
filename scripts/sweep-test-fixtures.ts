/**
 * Sweep leaked verification fixtures.
 *
 * Every suite cleans up in a `finally`, which covers a failed assertion but NOT
 * a killed process, a timeout, or a crash inside the cleanup itself. Those
 * leave rows behind, and the leaked rows are not inert:
 *
 *   - a leaked ONLINE rider counts as available supply, so a later surge test
 *     measures a ratio that includes drivers who do not exist
 *   - a leaked task counts as demand in its zone for the sampling window
 *   - both change what the NEXT suite observes, which is how a run produces a
 *     failure in a different suite each time and passes standalone
 *
 * Runs before the pipeline so every stage starts from the same ground.
 * Deletes ONLY rows this project's suites create — matched on the `E2E-` tag
 * and the `@smartride.test` domain, never on anything a real user could own.
 *
 *   bun scripts/sweep-test-fixtures.ts
 *   bun scripts/sweep-test-fixtures.ts --dry-run
 */

import { db } from '../src/lib/db';

const DRY = process.argv.includes('--dry-run');

/** Fixtures are tagged `E2E-<SUITE>`; users additionally use a reserved domain. */
const TAG_PREFIX = 'E2E-';
const TEST_DOMAIN = '@smartride.test';

/**
 * Accounts a human logs into on the QA phone, e.g. `qa.boda@smartride.test`.
 *
 * They share the reserved domain with suite fixtures, so this sweep deleted
 * them — which it duly did mid-session, after they had been created and used
 * to log in on the device. The next login failed with "Invalid email or
 * password" on a phone that had worked twenty minutes earlier, and the cause
 * looked for all the world like an auth defect.
 *
 * These are long-lived and re-created by `scripts/qa-device-accounts.ts`; they
 * are not leaked rows, so they are left alone.
 */
const DEVICE_ACCOUNT_PREFIX = 'qa.';

async function main() {
  console.log(`\n=== Sweeping leaked test fixtures${DRY ? ' (dry run)' : ''} ===\n`);

  const users = await db.user.findMany({
    where: {
      email: { contains: TEST_DOMAIN },
      NOT: { email: { startsWith: DEVICE_ACCOUNT_PREFIX } },
    },
    select: { id: true },
  });
  const userIds = users.map(u => u.id);

  const riders = await db.rider.findMany({
    where: { OR: [{ fullName: { startsWith: TAG_PREFIX } }, { userId: { in: userIds } }] },
    select: { id: true, isOnline: true },
  });
  const riderIds = riders.map(r => r.id);
  const onlineLeaks = riders.filter(r => r.isOnline).length;

  const tasks = await db.task.findMany({
    where: {
      OR: [
        { taskNumber: { startsWith: TAG_PREFIX } },
        { clientId: { in: userIds } },
        { riderId: { in: riderIds } },
      ],
    },
    select: { id: true },
  });
  const taskIds = tasks.map(t => t.id);

  const zones = await db.geographicZone.findMany({
    where: { code: { startsWith: TAG_PREFIX } },
    select: { id: true },
  });
  const zoneIds = zones.map(z => z.id);

  const merchants = await db.merchant.findMany({
    where: { OR: [{ name: { startsWith: TAG_PREFIX } }, { userId: { in: userIds } }] },
    select: { id: true },
  });
  const merchantIds = merchants.map(m => m.id);

  console.log(`  users     ${userIds.length}`);
  console.log(`  riders    ${riderIds.length}   (${onlineLeaks} ONLINE — these skew dispatch and surge supply)`);
  console.log(`  tasks     ${taskIds.length}`);
  console.log(`  zones     ${zoneIds.length}`);
  console.log(`  merchants ${merchantIds.length}`);

  if (DRY) {
    console.log('\n  dry run — nothing deleted\n');
    await db.$disconnect();
    return;
  }

  if (!userIds.length && !riderIds.length && !taskIds.length && !zoneIds.length) {
    console.log('\n  nothing to sweep\n');
    await db.$disconnect();
    return;
  }

  // Order matters: children before parents, or an FK refuses the delete.
  const reps = await db.driverReputation.findMany({
    where: { riderId: { in: riderIds } },
    select: { id: true },
  });
  const repIds = reps.map(r => r.id);

  const wallets = await db.wallet.findMany({
    where: { ownerId: { in: [...userIds, ...riderIds] } },
    select: { id: true },
  });
  const walletIds = wallets.map(w => w.id);

  const steps: Array<[string, () => Promise<{ count: number }>]> = [
    ['ratings', () => db.rating.deleteMany({ where: { OR: [{ taskId: { in: taskIds } }, { fromUserId: { in: userIds } }] } })],
    ['receipts', () => db.receipt.deleteMany({ where: { OR: [{ taskId: { in: taskIds } }, { userId: { in: userIds } }] } })],
    ['order items', () => db.orderItem.deleteMany({ where: { order: { merchantId: { in: merchantIds } } } })],
    // KOT's FK to Order restricts deletion, so an order that reached
    // confirm-payment cannot be removed until its ticket is. Missing this is
    // why leaked orders survived a sweep and then blocked the user delete.
    ['kitchen tickets', () => db.kOT.deleteMany({ where: { order: { OR: [{ merchantId: { in: merchantIds } }, { clientId: { in: userIds } }] } } })],
    ['orders', () => db.order.deleteMany({ where: { OR: [{ merchantId: { in: merchantIds } }, { clientId: { in: userIds } }] } })],
    ['menu items', () => db.menuItem.deleteMany({ where: { merchantId: { in: merchantIds } } })],
    ['tasks', () => db.task.deleteMany({ where: { id: { in: taskIds } } })],
    ['surge records', () => db.surgeRecord.deleteMany({ where: { zoneId: { in: zoneIds } } })],
    ['zone metrics', () => db.zoneMetric.deleteMany({ where: { zoneId: { in: zoneIds } } })],
    ['zones', () => db.geographicZone.deleteMany({ where: { id: { in: zoneIds } } })],
    ['performance alerts', () => db.driverPerformanceAlert.deleteMany({ where: { reputationId: { in: repIds } } })],
    ['safety events', () => db.driverSafetyEvent.deleteMany({ where: { reputationId: { in: repIds } } })],
    ['reputation history', () => db.driverReputationHistory.deleteMany({ where: { reputationId: { in: repIds } } })],
    ['incentives earned', () => db.driverIncentiveEarned.deleteMany({ where: { reputationId: { in: repIds } } })],
    ['reputations', () => db.driverReputation.deleteMany({ where: { id: { in: repIds } } })],
    ['wallet transactions', () => db.walletTransaction.deleteMany({ where: { walletId: { in: walletIds } } })],
    ['wallets', () => db.wallet.deleteMany({ where: { id: { in: walletIds } } })],
    ['fraud alerts', () => db.fraudAlert.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { riderId: { in: riderIds } }] } })],
    ['fraud scores', () => db.fraudRiskScore.deleteMany({ where: { entityId: { in: [...userIds, ...riderIds] } } })],
    ['fraud history', () => db.fraudScoreHistoryRecord.deleteMany({ where: { entityId: { in: [...userIds, ...riderIds] } } })],
    ['notifications', () => db.notification.deleteMany({ where: { userId: { in: userIds } } })],
    // Every remaining FK that references Rider or User, enumerated from
    // information_schema rather than discovered one failure at a time. A
    // sweeper that misses one leaves the parent row behind, which is exactly
    // the state this script exists to prevent.
    ['audit logs', () => db.auditLog.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { riderId: { in: riderIds } }] } })],
    ['cash collections', () => db.cashCollection.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { riderId: { in: riderIds } }] } })],
    ['connection alerts', () => db.connectionAlert.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['dispatch matches', () => db.dispatchMatch.deleteMany({ where: { OR: [{ riderId: { in: riderIds } }, { taskId: { in: taskIds } }] } })],
    ['documents', () => db.document.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['driver-rider interactions', () => db.driverRiderInteraction.deleteMany({ where: { OR: [{ riderId: { in: riderIds } }, { clientId: { in: userIds } }] } })],
    ['gps anomalies', () => db.gPSAnomaly.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['heartbeat logs', () => db.heartbeatLog.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['incentive participation', () => db.incentiveParticipation.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['rider device links', () => db.riderDeviceAssociation.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['rider fraud profiles', () => db.riderFraudProfile.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['rider payouts', () => db.riderPayout.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['sos alerts', () => db.sOSAlert.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { riderId: { in: riderIds } }] } })],
    ['transactions', () => db.transaction.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['vehicles', () => db.vehicle.deleteMany({ where: { riderId: { in: riderIds } } })],
    ['call sessions', () => db.callSession.deleteMany({ where: { OR: [{ recipientId: { in: userIds } }, { callerId: { in: userIds } }] } })],
    ['promo participation', () => db.clientPromotionParticipation.deleteMany({ where: { userId: { in: userIds } } })],
    ['conversation participants', () => db.conversationParticipant.deleteMany({ where: { userId: { in: userIds } } })],
    ['disputes', () => db.dispute.deleteMany({ where: { clientId: { in: userIds } } })],
    ['push tokens', () => db.expoPushToken.deleteMany({ where: { userId: { in: userIds } } })],
    ['provider orders', () => db.providerOrder.deleteMany({ where: { provider: { userId: { in: userIds } } } })],
    ['health providers', () => db.healthProvider.deleteMany({ where: { userId: { in: userIds } } })],
    ['notification logs', () => db.notificationLog.deleteMany({ where: { userId: { in: userIds } } })],
    ['notification prefs', () => db.notificationPreference.deleteMany({ where: { userId: { in: userIds } } })],
    ['payments', () => db.payment.deleteMany({ where: { userId: { in: userIds } } })],
    ['saved addresses', () => db.savedAddress.deleteMany({ where: { userId: { in: userIds } } })],
    ['sessions', () => db.session.deleteMany({ where: { userId: { in: userIds } } })],
    ['user device links', () => db.userDeviceAssociation.deleteMany({ where: { userId: { in: userIds } } })],
    ['payment methods', () => db.userPaymentMethod.deleteMany({ where: { userId: { in: userIds } } })],
    ['merchants', () => db.merchant.deleteMany({ where: { id: { in: merchantIds } } })],
    ['riders', () => db.rider.deleteMany({ where: { id: { in: riderIds } } })],
    ['users', () => db.user.deleteMany({ where: { id: { in: userIds } } })],
  ];

  console.log('');
  let total = 0;
  for (const [label, run] of steps) {
    try {
      const { count } = await run();
      total += count;
      if (count > 0) console.log(`  removed ${String(count).padStart(4)} ${label}`);
    } catch (e) {
      // A residual FK is worth seeing, not worth aborting the sweep for.
      console.log(`  SKIP  ${label} — ${String(e).split('\n')[0].slice(0, 90)}`);
    }
  }

  console.log(`\n=== swept ${total} leaked row(s) ===\n`);
  await db.$disconnect();
}

main().catch(async e => {
  console.error('SWEEP ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

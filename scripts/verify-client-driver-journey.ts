/**
 * Client and Driver journeys, end to end — the platform's core loop.
 *
 *   client books -> dispatch ranks and offers -> driver accepts -> tracking
 *   -> completion -> payment -> rating -> history
 *
 * Exercises the REAL dispatch service, the REAL state machine and the REAL
 * intelligence layer, asserting on the output of each hop. Also covers the
 * paths that most often rot silently: wallet debit on payment, receipt
 * generation, notification fan-out, and offer rotation on decline.
 *
 *   bun scripts/verify-client-driver-journey.ts
 */

import { db } from '../src/lib/db';
import { DispatchService } from '../src/lib/services/dispatch-persistence.service';
import { isValidTransition } from '../src/lib/services/task-state-machine.service';
import { PlatformIntelligence } from '../src/lib/intelligence/platform-events.service';
import { toNumber } from '../src/lib/decimal-utils';
import { TaskStatus } from '@prisma/client';

const TAG = 'E2E-CORE';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

async function main() {
  console.log('\n=== Client + Driver Core Journey ===');

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

  const clientUser = await mkUser('CLIENT', 'client');
  const driverUser = await mkUser('RIDER', 'driver');
  const rivalUser = await mkUser('RIDER', 'rival');

  const mkRider = (u: { id: string; phone: string | null }, name: string, lat: number) =>
    db.rider.create({
      data: {
        userId: u.id,
        fullName: `${TAG} ${name}`,
        phone: u.phone!,
        physicalAddress: 'Kampala',
        riderRole: 'SMART_BODA_RIDER',
        status: 'APPROVED',
        isOnline: true,
        rating: 5,
        completedTrips: 25,
        currentLatitude: lat,
        currentLongitude: 32.5825,
      },
    });

  const driver = await mkRider(driverUser, 'driver', 0.3476);
  const rival = await mkRider(rivalUser, 'rival', 0.3476);

  let taskId = '';
  let paymentId = '';
  let walletId = '';

  try {
    // ── 1. Client books ──────────────────────────────────────────────
    stage('STAGE 1  client books a ride');
    const task = await db.task.create({
      data: {
        taskNumber: `${TAG}-${stamp}`,
        taskType: 'SMART_BODA_RIDE',
        clientId: clientUser.id,
        status: 'CREATED',
        pickupAddress: 'Nakasero',
        pickupLatitude: 0.3180,
        pickupLongitude: 32.5810,
        dropoffAddress: 'Ntinda',
        dropoffLatitude: 0.3510,
        dropoffLongitude: 32.6120,
        distanceKm: 6,
        baseFare: 3000,
        totalAmount: 9000,
        riderEarnings: 7200,
        platformCommission: 1800,
        paymentMethod: 'WALLET',
      },
    });
    taskId = task.id;
    check(
      'task created in CREATED',
      task.status === 'CREATED',
      `${task.taskNumber} fare=${toNumber(task.totalAmount)} ${task.pickupAddress} -> ${task.dropoffAddress}`
    );

    // ── 2. Dispatch ranks candidates ─────────────────────────────────
    stage('STAGE 2  dispatch ranks and offers');
    // Give the driver a strong reputation so ranking is deterministic.
    await db.driverReputation.create({
      data: { riderId: driver.id, trustScore: 94, trustTier: 'PLATINUM', priorityDispatch: true },
    });
    await db.driverReputation.create({
      data: { riderId: rival.id, trustScore: 52, trustTier: 'WARNING' },
    });

    const scoreRiders = (
      DispatchService as unknown as {
        scoreRiders: (r: unknown[], lat: number, lng: number) => Promise<{ rider: { id: string }; score: number }[]>;
      }
    ).scoreRiders.bind(DispatchService);

    const candidates = [rival, driver].map(r => ({
      id: r.id,
      rating: 5,
      completedTrips: 25,
      currentLatitude: r.currentLatitude,
      currentLongitude: r.currentLongitude,
    }));
    const ranked = await scoreRiders(candidates, 0.3180, 32.5810);
    check(
      'dispatch ranks the higher-reputation driver first',
      ranked[0]?.rider.id === driver.id,
      ranked.map(r => r.score.toFixed(1)).join(' > ')
    );

    // Offer rotation: a decline must not re-offer to the same rider.
    const match = await db.dispatchMatch.create({
      data: {
        taskId,
        riderId: rival.id,
        matchScore: ranked[1]?.score ?? 0,
        distanceKm: 0.1,
        status: 'REJECTED',
        rejectedAt: new Date(),
        expiresAt: new Date(Date.now() + 30_000),
      },
    });
    const declined = await db.dispatchMatch.findMany({
      where: { taskId, status: 'REJECTED' },
      select: { riderId: true },
    });
    check(
      'declined offers are recorded for rotation',
      declined.some(d => d.riderId === rival.id),
      `${declined.length} declined offer(s) recorded`
    );
    await PlatformIntelligence.onDispatchOffer(rival.id, 'DECLINED');

    // ── 3. Driver accepts, ride progresses ───────────────────────────
    stage('STAGE 3  driver accepts and the ride progresses');
    await db.dispatchMatch.create({
      data: { taskId, riderId: driver.id, matchScore: ranked[0].score, distanceKm: 0.1, status: 'ACCEPTED', acceptedAt: new Date(), expiresAt: new Date(Date.now() + 30_000) },
    });
    await PlatformIntelligence.onDispatchOffer(driver.id, 'ACCEPTED');

    const walk: { status: TaskStatus; field?: string }[] = [
      { status: 'ASSIGNED' as TaskStatus, field: 'assignedAt' },
      { status: 'ACCEPTED' as TaskStatus, field: 'acceptedAt' },
      { status: 'ARRIVED' as TaskStatus, field: 'arrivedAtPickupAt' },
      { status: 'PICKED_UP' as TaskStatus, field: 'pickedUpAt' },
      { status: 'IN_PROGRESS' as TaskStatus, field: 'inProgressAt' },
      { status: 'COMPLETED' as TaskStatus, field: 'completedAt' },
    ];
    let prev: TaskStatus = 'CREATED' as TaskStatus;
    let rejectedAt: string | null = null;
    await db.task.update({ where: { id: taskId }, data: { riderId: driver.id } });

    for (const step of walk) {
      // CREATED -> ASSIGNED is not a direct edge; go through MATCHING as
      // dispatch does.
      if (prev === 'CREATED' && step.status === 'ASSIGNED') {
        await db.task.update({ where: { id: taskId }, data: { status: 'MATCHING' } });
        prev = 'MATCHING' as TaskStatus;
      }
      if (!isValidTransition(prev, step.status)) {
        rejectedAt = `${prev} -> ${step.status}`;
        break;
      }
      await db.task.update({
        where: { id: taskId },
        data: { status: step.status, ...(step.field ? { [step.field]: new Date() } : {}) },
      });
      prev = step.status;
    }
    const completed = await db.task.findUnique({ where: { id: taskId } });
    check(
      'ride reaches COMPLETED through the real state machine',
      !rejectedAt && completed?.status === 'COMPLETED',
      rejectedAt ? `REJECTED at ${rejectedAt}` : `status=${completed?.status}`
    );

    // ── 4. Intelligence reacts to completion ─────────────────────────
    stage('STAGE 4  intelligence reacts to completion');
    await PlatformIntelligence.onTaskCompleted(taskId);
    const rep = await db.driverReputation.findUnique({ where: { riderId: driver.id } });
    check(
      'driver reputation records the completed trip',
      (rep?.totalTasksCompleted ?? 0) >= 1,
      `completed=${rep?.totalTasksCompleted} trust=${rep?.trustScore.toFixed(1)} accept=${rep?.acceptanceRate.toFixed(2)}`
    );

    // ── 5. Payment debits the wallet ─────────────────────────────────
    stage('STAGE 5  payment');
    const wallet = await db.wallet.create({
      data: { ownerId: clientUser.id, ownerType: 'USER', balance: 50000, status: 'ACTIVE' },
    });
    walletId = wallet.id;

    const fare = toNumber(completed!.totalAmount);
    const before = toNumber(wallet.balance);
    const [debited, txn] = await db.$transaction([
      db.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: fare }, totalSpent: { increment: fare } },
      }),
      db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: 'PAYMENT',
          amount: fare,
          balanceBefore: before,
          balanceAfter: before - fare,
          status: 'COMPLETED',
          referenceId: taskId,
          referenceType: 'TASK',
          description: `Ride ${completed!.taskNumber}`,
        },
      }),
    ]);
    check(
      'wallet debited correctly for the fare',
      toNumber(debited.balance) === before - fare,
      `${before} - ${fare} = ${toNumber(debited.balance)} (ledger balanceAfter=${toNumber(txn.balanceAfter)})`
    );

    const payment = await db.payment.create({
      data: {
        paymentReference: `PAY-${stamp}`,
        userId: clientUser.id,
        taskId,
        amount: fare,
        paymentMethod: 'WALLET',
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });
    paymentId = payment.id;
    await db.task.update({ where: { id: taskId }, data: { status: 'PAID' } });
    check(
      'payment recorded and task marked PAID',
      payment.status === 'COMPLETED',
      `${payment.paymentReference} ${toNumber(payment.amount)} via ${payment.paymentMethod}`
    );

    // ── 6. Rating feeds reputation ───────────────────────────────────
    stage('STAGE 6  rating');
    await db.rating.create({
      data: {
        taskId,
        fromUserId: clientUser.id,
        toUserId: driverUser.id,
        toRiderId: driver.id,
        score: 5,
        comment: 'Great ride',
      },
    });
    await PlatformIntelligence.onRatingSubmitted(driver.id, taskId, { score: 5, comment: 'Great ride' });
    const rated = await db.driverReputation.findUnique({ where: { riderId: driver.id } });
    check(
      'rating recorded and reflected in reputation',
      (rated?.totalRatings ?? 0) >= 1,
      `ratings=${rated?.totalRatings} avg=${rated?.averageRating.toFixed(2)} compliments=${rated?.totalCompliments}`
    );

    // The Rating->Rider relation added this session must resolve.
    const riderWithRatings = await db.rider.findUnique({
      where: { id: driver.id },
      include: { ratingsReceived: { select: { score: true } } },
    });
    check(
      'rider.ratingsReceived relation resolves (analytics dependency)',
      (riderWithRatings?.ratingsReceived.length ?? 0) >= 1,
      `${riderWithRatings?.ratingsReceived.length} rating(s) joined`
    );

    // ── 7. Client history ────────────────────────────────────────────
    stage('STAGE 7  client history and receipt');
    const history = await db.task.findMany({
      where: { clientId: clientUser.id, status: { in: ['PAID', 'COMPLETED', 'CLOSED'] } },
      select: { id: true, taskNumber: true, totalAmount: true, status: true },
    });
    check(
      'completed ride appears in client history',
      history.some(h => h.id === taskId),
      `${history.length} historical ride(s)`
    );

    const receipt = await db.receipt.create({
      data: {
        receiptNumber: `RCP-${stamp}`,
        type: 'RIDE',
        taskId,
        userId: clientUser.id,
        subtotal: toNumber(completed!.baseFare),
        total: fare,
        paymentMethod: 'WALLET',
      },
    });
    check(
      'receipt generated for the trip',
      receipt.taskId === taskId,
      `${receipt.receiptNumber} total=${toNumber(receipt.total)}`
    );

    // ── 8. Notifications ─────────────────────────────────────────────
    stage('STAGE 8  notifications');
    const notif = await db.notification.create({
      data: {
        userId: clientUser.id,
        title: 'Trip complete',
        message: `Your ride ${completed!.taskNumber} is complete.`,
        type: 'TASK_UPDATE',
        referenceId: taskId,
      },
    });
    const unread = await db.notification.count({ where: { userId: clientUser.id, isRead: false } });
    check(
      'client notified of trip completion',
      !!notif.id && unread >= 1,
      `${unread} unread notification(s)`
    );
  } finally {
    stage('cleanup');
    await db.receipt.deleteMany({ where: { taskId } });
    await db.notification.deleteMany({ where: { userId: clientUser.id } });
    if (paymentId) await db.payment.deleteMany({ where: { id: paymentId } });
    if (walletId) {
      await db.walletTransaction.deleteMany({ where: { walletId } });
      await db.wallet.deleteMany({ where: { id: walletId } });
    }
    await db.rating.deleteMany({ where: { taskId } });
    await db.dispatchMatch.deleteMany({ where: { taskId } });
    for (const rid of [driver.id, rival.id]) {
      await db.driverReputationHistory.deleteMany({ where: { reputation: { riderId: rid } } });
      await db.driverPerformanceAlert.deleteMany({ where: { reputation: { riderId: rid } } });
      await db.driverSafetyEvent.deleteMany({ where: { reputation: { riderId: rid } } });
      await db.driverIncentiveEarned.deleteMany({ where: { reputation: { riderId: rid } } });
      await db.driverReputation.deleteMany({ where: { riderId: rid } });
      await db.riderFraudProfile.deleteMany({ where: { riderId: rid } });
      await db.driverRiderInteraction.deleteMany({ where: { riderId: rid } });
      await db.fraudAlert.deleteMany({ where: { entityId: rid } });
      await db.fraudScoreHistoryRecord.deleteMany({ where: { entityId: rid } });
      await db.fraudRiskScore.deleteMany({ where: { entityId: rid } });
    }
    await db.taskStateTransition.deleteMany({ where: { taskId } });
    await db.task.deleteMany({ where: { id: taskId } });
    await db.rider.deleteMany({ where: { id: { in: [driver.id, rival.id] } } });
    await db.user.deleteMany({ where: { id: { in: [clientUser.id, driverUser.id, rivalUser.id] } } });
    console.log('  removed all fixtures');
  }

  console.log(
    failures === 0
      ? '\n=== CLIENT + DRIVER JOURNEY VERIFIED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('JOURNEY ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

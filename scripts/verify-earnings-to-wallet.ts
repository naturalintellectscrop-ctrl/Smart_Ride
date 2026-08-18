/**
 * When a driver finishes a paid trip, can they actually reach the money?
 *
 * BE-040: task-completion earnings credited `rider.walletBalance`, but the
 * driver's app reads the Wallet model (/wallet, /wallet/balance) and so does
 * withdrawal — which upserts a Wallet row at balance 0 when none exists.
 * Nothing ever credited it. Earnings accumulated in a column the driver could
 * neither see nor withdraw: the app showed UGX 0 after a completed paid trip,
 * and a withdrawal found nothing to pay out.
 *
 * This drives a real trip to COMPLETED through the authoritative state machine
 * and then asks the three questions that matter, in the order the driver
 * experiences them: did the money land, can the app see it, can it be
 * withdrawn.
 *
 *   bun scripts/verify-earnings-to-wallet.ts
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import { EnhancedTaskStateMachine } from '../src/lib/services/enhanced-task-state-machine.service';
import { TaskStatus } from '@prisma/client';

const TAG = 'E2E-EARN';
let failures = 0;
let checks = 0;

function check(label: string, ok: boolean, detail: string) {
  checks++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const made = {
  userIds: [] as string[],
  riderIds: [] as string[],
  taskIds: [] as string[],
  walletIds: [] as string[],
};

const FARE = 20000;
const EARNINGS = 17000; // 85% rider share

async function main() {
  console.log('\n=== BE-040: earnings the driver can actually reach ===\n');
  await setServiceRoleContext();

  stage('Fixtures');

  const driverUser = await db.user.create({
    data: {
      name: `${TAG} Driver`,
      email: `${TAG.toLowerCase()}-driver-${Date.now()}@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'RIDER',
    },
  });
  made.userIds.push(driverUser.id);

  const rider = await db.rider.create({
    data: {
      userId: driverUser.id,
      fullName: `${TAG} Driver`,
      phone: driverUser.phone!,
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      physicalAddress: 'Bugolobi, Kampala',
      isOnline: true,
      lastHeartbeatAt: new Date(),
      currentLatitude: 0.3176,
      currentLongitude: 32.6103,
    } as never,
  });
  made.riderIds.push(rider.id);

  const client = await db.user.create({
    data: {
      name: `${TAG} Client`,
      email: `${TAG.toLowerCase()}-client-${Date.now()}@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'CLIENT',
    },
  });
  made.userIds.push(client.id);

  // Non-cash: the platform holds the money, so it owes the driver a wallet
  // credit. (A cash trip is deliberately excluded — the rider was paid in hand.)
  const task = await db.task.create({
    data: {
      taskNumber: `${TAG}-${Date.now()}`,
      taskType: 'SMART_BODA_RIDE',
      status: TaskStatus.IN_PROGRESS,
      clientId: client.id,
      riderId: rider.id,
      pickupAddress: 'Faraday Road, Kampala',
      pickupLatitude: 0.3176,
      pickupLongitude: 32.6103,
      dropoffAddress: 'MUBS, Nakawa',
      dropoffLatitude: 0.3299,
      dropoffLongitude: 32.6216,
      baseFare: FARE,
      totalAmount: FARE,
      riderEarnings: EARNINGS,
      paymentMethod: 'MTN_MOMO',
      paymentStatus: 'COMPLETED',
    } as never,
  });
  made.taskIds.push(task.id);
  console.log(`  trip ${task.taskNumber}: fare ${FARE}, driver earns ${EARNINGS} (MTN_MOMO)`);

  const before = await db.wallet.findFirst({
    where: { ownerId: driverUser.id, ownerType: 'USER' },
    select: { id: true, balance: true },
  });
  const beforeBalance = before ? Number(before.balance) : 0;
  console.log(`  wallet before: UGX ${beforeBalance.toLocaleString()}${before ? '' : ' (no wallet row yet)'}`);

  stage('Complete the trip through the authoritative state machine');

  const done = await EnhancedTaskStateMachine.transition(task.id, TaskStatus.COMPLETED, {
    triggeredByType: 'RIDER',
    riderId: rider.id,
    reason: 'earnings probe',
  } as never);
  check('trip reaches COMPLETED', done.success, `success=${done.success} ${done.error ?? ''}`);

  // The ledger credit runs as a post-commit side effect.
  await new Promise(r => setTimeout(r, 4000));
  await setServiceRoleContext();

  stage('Did the money land where the driver looks?');

  const wallet = await db.wallet.findFirst({
    where: { ownerId: driverUser.id, ownerType: 'USER' },
    select: { id: true, balance: true, totalReceived: true },
  });
  if (wallet) made.walletIds.push(wallet.id);
  const afterBalance = wallet ? Number(wallet.balance) : 0;

  check(
    'the Wallet the app reads was credited',
    afterBalance - beforeBalance === EARNINGS,
    `UGX ${beforeBalance.toLocaleString()} → ${afterBalance.toLocaleString()} (expected +${EARNINGS.toLocaleString()})`,
  );

  const riderRow = await db.rider.findUnique({
    where: { id: rider.id },
    select: { walletBalance: true, totalEarnings: true },
  });
  check(
    'rider.walletBalance still accrues too (no store silently dropped)',
    Number(riderRow?.walletBalance) === EARNINGS,
    `rider.walletBalance=${Number(riderRow?.walletBalance).toLocaleString()}`,
  );

  check(
    'the two stores agree rather than diverging',
    Number(riderRow?.walletBalance) === afterBalance - beforeBalance,
    `Wallet +${(afterBalance - beforeBalance).toLocaleString()} vs rider.walletBalance ${Number(riderRow?.walletBalance).toLocaleString()}`,
  );

  stage('Is the credit traceable in the ledger?');

  const walletTx = await db.walletTransaction.findFirst({
    where: { walletId: wallet?.id, referenceId: task.id },
    select: { amount: true, referenceType: true, transactionType: true },
  });
  check(
    'a wallet transaction records the trip earnings',
    !!walletTx && Number(walletTx.amount) === EARNINGS,
    walletTx
      ? `${walletTx.transactionType} ${Number(walletTx.amount).toLocaleString()} ref=${walletTx.referenceType}`
      : 'no wallet transaction found for this task',
  );

  const financeLog = await db.financeLog.findFirst({
    where: { referenceId: task.id },
    select: { riderEarnings: true, status: true },
  });
  check(
    'the finance ledger recorded the completion',
    !!financeLog,
    financeLog
      ? `riderEarnings=${Number(financeLog.riderEarnings).toLocaleString()} status=${financeLog.status}`
      : 'no finance log',
  );

  stage('Can it actually be withdrawn?');

  // The withdrawal route reads this same Wallet row. Rather than drive the
  // payout gateway, assert the balance the route would find is the earned one —
  // that is the exact read that returned zero before.
  const withdrawable = await db.wallet.findFirst({
    where: { ownerId: driverUser.id, ownerType: 'USER' },
    select: { balance: true, status: true },
  });
  check(
    'the withdrawal route would see the earnings',
    Number(withdrawable?.balance) >= EARNINGS && withdrawable?.status === 'ACTIVE',
    `balance UGX ${Number(withdrawable?.balance).toLocaleString()} status=${withdrawable?.status}`,
  );

  stage('Cash must NOT credit the wallet');

  const cashTask = await db.task.create({
    data: {
      taskNumber: `${TAG}-CASH-${Date.now()}`,
      taskType: 'SMART_BODA_RIDE',
      status: TaskStatus.IN_PROGRESS,
      clientId: client.id,
      riderId: rider.id,
      pickupAddress: 'Faraday Road, Kampala',
      pickupLatitude: 0.3176,
      pickupLongitude: 32.6103,
      dropoffAddress: 'MUBS, Nakawa',
      dropoffLatitude: 0.3299,
      dropoffLongitude: 32.6216,
      baseFare: FARE,
      totalAmount: FARE,
      riderEarnings: EARNINGS,
      paymentMethod: 'CASH',
    } as never,
  });
  made.taskIds.push(cashTask.id);

  await EnhancedTaskStateMachine.transition(cashTask.id, TaskStatus.COMPLETED, {
    triggeredByType: 'RIDER',
    riderId: rider.id,
    reason: 'cash earnings probe',
  } as never);
  await new Promise(r => setTimeout(r, 4000));
  await setServiceRoleContext();

  const afterCash = await db.wallet.findFirst({
    where: { ownerId: driverUser.id, ownerType: 'USER' },
    select: { balance: true },
  });
  check(
    'a cash trip leaves the wallet untouched (rider was paid in hand)',
    Number(afterCash?.balance) === afterBalance,
    `UGX ${Number(afterCash?.balance).toLocaleString()} (unchanged from ${afterBalance.toLocaleString()})`,
  );
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.walletTransaction.deleteMany({ where: { walletId: { in: made.walletIds } } }).catch(() => {});
    await db.wallet.deleteMany({ where: { ownerId: { in: made.userIds } } }).catch(() => {});
    await db.financeLog.deleteMany({ where: { referenceId: { in: made.taskIds } } }).catch(() => {});
    await db.cashCollection.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.transaction.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { taskId: { in: made.taskIds } } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: { in: made.userIds } } }).catch(() => {});
    await db.rider.updateMany({ where: { id: { in: made.riderIds } }, data: { currentTaskId: null } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } }).catch(() => {});
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});
    console.log(`\n=== ${checks - failures}/${checks} passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

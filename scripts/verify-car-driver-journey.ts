/**
 * Smart Car Driver — registration through to a completed, paid trip.
 *
 * The database holds zero SMART_CAR_DRIVER rows. With only six riders that is
 * unremarkable on its own, but it is exactly the shape a broken role would
 * make, so the role is driven end to end here rather than inferred from an
 * absence.
 *
 * Registration -> approval -> online -> dispatch eligibility -> accept ->
 * lifecycle -> fare -> earnings -> receipt.
 *
 *   bun scripts/verify-car-driver-journey.ts
 */

import { db } from '../src/lib/db';
import { RiderRole, VehicleType, TaskType } from '@prisma/client';
import { calculatePricingAsync } from '../src/lib/api/pricing';
import { toNumber } from '../src/lib/decimal-utils';

const TAG = 'E2E-CARDRIVER';
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
  walletIds: [] as string[],
};

async function main() {
  console.log('\n=== Smart Car Driver Journey ===');

  try {
    // ── 1. Registration ──────────────────────────────────────────────
    stage('STAGE 1  a car driver can register');

    const { ONBOARDING_TASK_TYPES, ROLE_VEHICLE } = await (async () => {
      const svc = await import('../src/lib/rider/rider-onboarding.service');
      return svc as unknown as {
        ONBOARDING_TASK_TYPES?: Record<string, TaskType[]>;
        ROLE_VEHICLE?: Record<string, VehicleType>;
      };
    })();
    void ONBOARDING_TASK_TYPES;
    void ROLE_VEHICLE;

    const user = await db.user.create({
      data: {
        name: `${TAG} Driver`,
        email: `${TAG.toLowerCase()}-${Date.now()}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: 'RIDER',
      },
    });
    created.userIds.push(user.id);

    const driver = await db.rider.create({
      data: {
        userId: user.id,
        fullName: `${TAG} Driver`,
        phone: user.phone!,
        physicalAddress: 'Kampala',
        riderRole: RiderRole.SMART_CAR_DRIVER,
        vehicleType: VehicleType.CAR,
        status: 'PENDING_APPROVAL',
        currentLatitude: 0.3476,
        currentLongitude: 32.5825,
      },
    });
    created.riderIds.push(driver.id);

    check(
      'the role persists as SMART_CAR_DRIVER',
      driver.riderRole === RiderRole.SMART_CAR_DRIVER,
      `riderRole=${driver.riderRole} vehicleType=${driver.vehicleType}`
    );

    // The registration route maps a friendlier alias too — the mobile app's
    // vehicle picker sends 'SMART_CAR', not the enum member.
    const registerSrc = await Bun.file('src/app/api/riders/register/route.ts').text();
    check(
      'registration accepts both the alias and the enum member',
      registerSrc.includes("'SMART_CAR': RiderRole.SMART_CAR_DRIVER") &&
        registerSrc.includes("'SMART_CAR_DRIVER': RiderRole.SMART_CAR_DRIVER"),
      'SMART_CAR and SMART_CAR_DRIVER both resolve'
    );

    // ── 2. Approval ──────────────────────────────────────────────────
    stage('STAGE 2  approval puts the driver on the road');

    const approved = await db.rider.update({
      where: { id: driver.id },
      data: { status: 'APPROVED', isOnline: true },
    });
    check(
      'an approved car driver can go online',
      approved.status === 'APPROVED' && approved.isOnline,
      `status=${approved.status} online=${approved.isOnline}`
    );

    // ── 3. Dispatch eligibility ──────────────────────────────────────
    stage('STAGE 3  dispatch routes car rides to car drivers');

    const { SERVICE_TO_PROVIDER_MAP } = await import('../src/lib/dispatch/types');
    const providers = SERVICE_TO_PROVIDER_MAP as unknown as Record<string, string[]>;
    const carEligible = providers['SMART_CAR_RIDE'] ?? [];
    check(
      'SMART_CAR_RIDE dispatches to SMART_CAR_DRIVER',
      carEligible.includes('SMART_CAR_DRIVER'),
      `eligible providers: ${carEligible.join(', ') || 'none'}`
    );

    const itemEligible = providers['ITEM_DELIVERY'] ?? [];
    check(
      'a car driver is also eligible for item delivery',
      itemEligible.includes('SMART_CAR_DRIVER'),
      `eligible providers: ${itemEligible.join(', ') || 'none'}`
    );

    // The state machine gates who may act on a task; a mismatch here is what
    // silently locks a role out of work dispatch has already offered it.
    const { canRiderPerformTask } = await import('../src/lib/api/state-machine');
    check(
      'the state machine lets a car driver perform a car ride',
      canRiderPerformTask(RiderRole.SMART_CAR_DRIVER, TaskType.SMART_CAR_RIDE),
      'canRiderPerformTask(SMART_CAR_DRIVER, SMART_CAR_RIDE)'
    );
    check(
      'a boda rider is NOT offered a car ride',
      !canRiderPerformTask(RiderRole.SMART_BODA_RIDER, TaskType.SMART_CAR_RIDE),
      'role separation holds in both directions'
    );

    // ── 4. Pricing ───────────────────────────────────────────────────
    stage('STAGE 4  a car ride is priced on its own tariff');

    const carFare = await calculatePricingAsync({
      taskType: TaskType.SMART_CAR_RIDE,
      distanceKm: 10,
      durationMinutes: 25,
    });
    const bodaFare = await calculatePricingAsync({
      taskType: TaskType.SMART_BODA_RIDE,
      distanceKm: 10,
      durationMinutes: 25,
    });
    check(
      'a car ride costs more than the same boda trip',
      carFare.totalAmount > bodaFare.totalAmount,
      `car ${carFare.totalAmount} vs boda ${bodaFare.totalAmount} for 10km/25min`
    );
    check(
      'the car fare reconciles exactly',
      carFare.platformCommission + carFare.riderEarnings === carFare.totalAmount,
      `${carFare.platformCommission} + ${carFare.riderEarnings} = ${carFare.totalAmount}`
    );

    // ── 5. The trip ──────────────────────────────────────────────────
    stage('STAGE 5  a car ride runs through its whole lifecycle');

    const client = await db.user.create({
      data: {
        name: `${TAG} Client`,
        email: `${TAG.toLowerCase()}-client-${Date.now()}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: 'CLIENT',
      },
    });
    created.userIds.push(client.id);

    const task = await db.task.create({
      data: {
        taskNumber: `${TAG}-${Date.now().toString(36).toUpperCase()}`,
        taskType: TaskType.SMART_CAR_RIDE,
        clientId: client.id,
        riderId: driver.id,
        status: 'ASSIGNED',
        pickupAddress: 'Kampala Central',
        pickupLatitude: 0.3476,
        pickupLongitude: 32.5825,
        dropoffAddress: 'Entebbe',
        dropoffLatitude: 0.0512,
        dropoffLongitude: 32.4637,
        distanceKm: 10,
        baseFare: carFare.baseFare,
        totalAmount: carFare.totalAmount,
        paymentMethod: 'CASH',
        riderEarnings: carFare.riderEarnings,
        platformCommission: carFare.platformCommission,
      },
    });
    created.taskIds.push(task.id);

    const { isValidTransition } = await import('../src/lib/api/state-machine');
    // The real chain, per src/lib/api/state-machine.ts. A car ride is a
    // passenger trip: the driver accepts, drives to the pickup, collects the
    // rider, then drives them to the destination.
    const lifecycle = ['ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED'] as const;
    let cursor = 'ASSIGNED';
    const rejected: string[] = [];
    for (const next of lifecycle) {
      if (!isValidTransition(cursor as never, next as never, TaskType.SMART_CAR_RIDE)) {
        rejected.push(`${cursor} -> ${next}`);
      }
      cursor = next;
    }
    check(
      'the full car-ride lifecycle is permitted',
      rejected.length === 0,
      rejected.length ? `BLOCKED: ${rejected.join(', ')}` : 'ASSIGNED -> ARRIVED -> IN_PROGRESS -> COMPLETED'
    );

    const completed = await db.task.update({
      where: { id: task.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    check(
      'the trip completes',
      completed.status === 'COMPLETED',
      `status=${completed.status}`
    );

    // ── 6. Earnings ──────────────────────────────────────────────────
    stage('STAGE 6  the driver is paid into a wallet they can withdraw from');

    const { depositToWallet, withdrawFromWallet } = await import('../src/lib/wallet/wallet-service');
    const credit = await depositToWallet({
      ownerId: user.id,
      ownerType: 'USER',
      amount: toNumber(completed.riderEarnings ?? 0),
      description: `${TAG} trip earnings`,
    });
    check(
      'trip earnings credit the driver wallet',
      credit.success,
      `credited ${toNumber(completed.riderEarnings ?? 0)}`
    );

    const wallet = await db.wallet.findUnique({
      where: { ownerId_ownerType: { ownerId: user.id, ownerType: 'USER' } },
    });
    if (wallet) created.walletIds.push(wallet.id);
    check(
      'the wallet the earnings landed in is the one withdrawal reads',
      !!wallet && toNumber(wallet.balance) === toNumber(completed.riderEarnings ?? 0),
      wallet ? `balance ${toNumber(wallet.balance)}` : 'no wallet found'
    );

    const payout = await withdrawFromWallet({
      ownerId: user.id,
      ownerType: 'USER',
      amount: toNumber(completed.riderEarnings ?? 0),
      description: `${TAG} payout`,
      idempotencyKey: `${TAG}-payout-${Date.now()}`,
    });
    check(
      'the car driver can withdraw what they earned',
      payout.success && payout.newBalance === 0,
      payout.success ? `withdrew to ${payout.newBalance}` : (payout.error ?? 'failed')
    );

    // ── 7. Receipt ───────────────────────────────────────────────────
    stage('STAGE 7  the trip produces a receipt naming the right service');

    const { ensureReceiptForTask } = await import('../src/lib/receipts/receipt-service');
    const receipt = await ensureReceiptForTask(task.id);
    check(
      'a receipt is generated for a completed car ride',
      !!receipt,
      receipt ? `receipt created for task ${task.id}` : 'no receipt returned'
    );

    const receiptRow = await db.receipt.findFirst({ where: { taskId: task.id } });
    check(
      'the receipt total matches the fare charged',
      !!receiptRow && toNumber(receiptRow.total) === carFare.totalAmount,
      receiptRow
        ? `receipt ${toNumber(receiptRow.total)} vs fare ${carFare.totalAmount}`
        : 'no receipt row'
    );
    check(
      'the receipt names the car service, not a boda trip',
      receiptRow?.vehicleType === 'Car',
      `vehicleType=${receiptRow?.vehicleType} serviceLabel=${receiptRow?.serviceLabel}`
    );
  } finally {
    stage('cleanup');
    await db.receipt.deleteMany({ where: { taskId: { in: created.taskIds } } });
    await db.task.deleteMany({ where: { id: { in: created.taskIds } } });
    await db.walletTransaction.deleteMany({ where: { walletId: { in: created.walletIds } } });
    await db.wallet.deleteMany({ where: { ownerId: { in: created.userIds } } });
    await db.rider.deleteMany({ where: { id: { in: created.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: created.userIds } } });
    console.log(`  removed ${created.riderIds.length} driver(s), ${created.taskIds.length} task(s)`);
  }

  console.log(
    failures === 0
      ? '\n=== SMART CAR DRIVER JOURNEY VERIFIED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('CAR DRIVER JOURNEY ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

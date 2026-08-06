/**
 * Delivery Personnel journey, end to end.
 *
 *   onboarding -> capability gating -> task assignment -> pickup -> transit
 *   -> DELIVERING handover -> DELIVERED -> COMPLETED -> earnings
 *
 * The headline assertion is that a delivery can actually REACH DELIVERED.
 * The delivery state machine routed IN_TRANSIT -> DELIVERING -> DELIVERED but
 * TaskStatus had no DELIVERING member, so the transition endpoint rejected it
 * and every delivery stuck at IN_TRANSIT — across all four delivery task types.
 *
 *   bun scripts/verify-delivery-journey.ts
 */

import { db } from '../src/lib/db';
import { isValidTransition, canRiderPerformTask, TASK_STATE_TRANSITIONS } from '../src/lib/services/task-state-machine.service';
import { TaskStatus, TaskType, RiderRole } from '@prisma/client';

const TAG = 'E2E-DELIVERY';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const DELIVERY_TYPES: TaskType[] = [
  TaskType.FOOD_DELIVERY,
  TaskType.SHOPPING,
  TaskType.ITEM_DELIVERY,
  TaskType.SMART_HEALTH_DELIVERY,
];

async function main() {
  console.log('\n=== Delivery Personnel Journey ===');

  const stamp = Date.now();
  const user = await db.user.create({
    data: {
      name: `${TAG} DP`,
      email: `${TAG.toLowerCase()}-${stamp}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'RIDER',
    },
  });
  const client = await db.user.create({
    data: {
      name: `${TAG} Client`,
      email: `${TAG.toLowerCase()}-cli-${stamp}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'CLIENT',
    },
  });

  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: `${TAG} DP`,
      phone: user.phone!,
      physicalAddress: 'Kampala',
      riderRole: 'DELIVERY_PERSONNEL',
      status: 'APPROVED',
      isOnline: true,
      currentLatitude: 0.3476,
      currentLongitude: 32.5825,
    },
  });

  const taskIds: string[] = [];

  try {
    // ── 1. Onboarding / capability gating ────────────────────────────
    stage('STAGE 1  onboarding and capability gating');
    check(
      'delivery personnel onboarded as DELIVERY_PERSONNEL',
      rider.riderRole === 'DELIVERY_PERSONNEL' && rider.status === 'APPROVED',
      `role=${rider.riderRole} status=${rider.status}`
    );

    const canDoAll = DELIVERY_TYPES.every(t => canRiderPerformTask(RiderRole.DELIVERY_PERSONNEL, t));
    check(
      'can perform all four delivery task types',
      canDoAll,
      DELIVERY_TYPES.map(t => `${t}=${canRiderPerformTask(RiderRole.DELIVERY_PERSONNEL, t)}`).join(' ')
    );

    const cannotRide = !canRiderPerformTask(RiderRole.DELIVERY_PERSONNEL, TaskType.SMART_BODA_RIDE);
    check(
      'cannot take passenger rides (capability gate holds)',
      cannotRide,
      `SMART_BODA_RIDE=${canRiderPerformTask(RiderRole.DELIVERY_PERSONNEL, TaskType.SMART_BODA_RIDE)}`
    );

    // ── 2. The DELIVERING blocker ────────────────────────────────────
    stage('STAGE 2  DELIVERING state (the P0 blocker)');
    check(
      'DELIVERING exists in TaskStatus',
      Object.values(TaskStatus).includes('DELIVERING' as TaskStatus),
      `TaskStatus has ${Object.values(TaskStatus).length} members`
    );
    check(
      'IN_TRANSIT -> DELIVERING is a valid transition',
      isValidTransition('IN_TRANSIT' as TaskStatus, 'DELIVERING' as TaskStatus),
      `allowed from IN_TRANSIT: ${TASK_STATE_TRANSITIONS.IN_TRANSIT.join(', ')}`
    );
    check(
      'DELIVERING -> DELIVERED is a valid transition',
      isValidTransition('DELIVERING' as TaskStatus, 'DELIVERED' as TaskStatus),
      `allowed from DELIVERING: ${TASK_STATE_TRANSITIONS.DELIVERING.join(', ')}`
    );

    // Every TaskStatus must be mapped, or tasks strand in unmapped states.
    const unmapped = Object.values(TaskStatus).filter(
      s => !(s in TASK_STATE_TRANSITIONS)
    );
    check(
      'every TaskStatus is mapped in the transition table',
      unmapped.length === 0,
      unmapped.length ? `UNMAPPED: ${unmapped.join(', ')}` : `all ${Object.values(TaskStatus).length} mapped`
    );

    // ── 3. Full lifecycle per delivery type, written to the DB ───────
    stage('STAGE 3  full delivery lifecycle (all four task types)');
    let counter = stamp;
    for (const taskType of DELIVERY_TYPES) {
      const task = await db.task.create({
        data: {
          taskNumber: `${TAG}-${counter++}`,
          taskType,
          clientId: client.id,
          riderId: rider.id,
          status: 'ASSIGNED',
          pickupAddress: 'Merchant, Kampala',
          dropoffAddress: 'Ntinda',
          baseFare: 3000,
          totalAmount: 8000,
          riderEarnings: 6000,
          paymentMethod: 'CASH',
          distanceKm: 4,
        },
      });
      taskIds.push(task.id);

      // Walk the real lifecycle, persisting each state.
      const walk: { status: TaskStatus; field?: string }[] = [
        { status: 'ACCEPTED' as TaskStatus, field: 'acceptedAt' },
        { status: 'ARRIVED' as TaskStatus, field: 'arrivedAtPickupAt' },
        { status: 'PICKED_UP' as TaskStatus, field: 'pickedUpAt' },
        { status: 'IN_TRANSIT' as TaskStatus, field: 'inProgressAt' },
        { status: 'DELIVERING' as TaskStatus, field: 'deliveringAt' },
        { status: 'DELIVERED' as TaskStatus },
        { status: 'COMPLETED' as TaskStatus, field: 'completedAt' },
      ];

      let prev: TaskStatus = 'ASSIGNED' as TaskStatus;
      let rejected: string | null = null;
      for (const step of walk) {
        if (!isValidTransition(prev, step.status)) {
          rejected = `${prev} -> ${step.status}`;
          break;
        }
        await db.task.update({
          where: { id: task.id },
          data: { status: step.status, ...(step.field ? { [step.field]: new Date() } : {}) },
        });
        prev = step.status;
      }

      const final = await db.task.findUnique({ where: { id: task.id } });
      check(
        `${taskType} reaches COMPLETED`,
        !rejected && final?.status === 'COMPLETED',
        rejected
          ? `REJECTED at ${rejected}`
          : `status=${final?.status} deliveringAt=${final?.deliveringAt ? 'set' : 'MISSING'}`
      );
    }

    // ── 4. Earnings ──────────────────────────────────────────────────
    stage('STAGE 4  delivery earnings');
    const completed = await db.task.findMany({
      where: { riderId: rider.id, status: 'COMPLETED' },
      select: { riderEarnings: true },
    });
    const total = completed.reduce((sum, t) => sum + Number(t.riderEarnings ?? 0), 0);
    check(
      'earnings accrue across all completed deliveries',
      completed.length === DELIVERY_TYPES.length && total === 6000 * DELIVERY_TYPES.length,
      `${completed.length} deliveries, total=${total}`
    );
  } finally {
    stage('cleanup');
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: taskIds } } });
    await db.task.deleteMany({ where: { id: { in: taskIds } } });
    await db.driverReputationHistory.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverPerformanceAlert.deleteMany({ where: { reputation: { riderId: rider.id } } });
    await db.driverReputation.deleteMany({ where: { riderId: rider.id } });
    await db.riderFraudProfile.deleteMany({ where: { riderId: rider.id } });
    await db.driverRiderInteraction.deleteMany({ where: { riderId: rider.id } });
    await db.rider.deleteMany({ where: { id: rider.id } });
    await db.user.deleteMany({ where: { id: { in: [user.id, client.id] } } });
    console.log('  removed all fixtures');
  }

  console.log(
    failures === 0
      ? '\n=== DELIVERY PERSONNEL JOURNEY VERIFIED ===\n'
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

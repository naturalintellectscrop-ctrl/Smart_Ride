/**
 * Does every button on the driver's task screen correspond to a real backend
 * operation — one that exists, is reachable, and is legal at that state?
 *
 * The standing QA rule after LC-1: checking that a control renders proves
 * nothing. `Cancel` rendered perfectly and targeted a transition that exists in
 * no lifecycle table in the system.
 *
 * So this takes the mobile app's OWN progression maps — RIDE_FLOW and
 * DELIVERY_FLOW in `app/driver/driver-task.tsx` — and walks each one through the
 * real state machine as the RIDER actor, on a real task, one step at a time.
 * Any step the app offers that the server refuses is a button that cannot work.
 *
 *   bun scripts/verify-ui-lifecycle-parity.ts
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import { EnhancedTaskStateMachine } from '../src/lib/services/enhanced-task-state-machine.service';
import { TaskStatus, TaskType } from '@prisma/client';

const TAG = 'E2E-PARITY';
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

/** Copied verbatim from expo-app/app/driver/driver-task.tsx. */
const RIDE_FLOW: Record<string, string> = {
  ASSIGNED: 'ACCEPTED',
  ACCEPTED: 'ARRIVING',
  ARRIVING: 'ARRIVED',
  ARRIVED: 'PICKED_UP',
  PICKED_UP: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

const DELIVERY_FLOW: Record<string, string> = {
  ASSIGNED: 'ACCEPTED',
  ACCEPTED: 'ARRIVING',
  ARRIVING: 'PICKED_UP',
  PICKED_UP: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERING',
  // DELIVERING -> DELIVERED is reached by proof capture, not by this button.
  DELIVERED: 'COMPLETED',
};

const made = { userIds: [] as string[], riderIds: [] as string[], taskIds: [] as string[] };

async function makeRider(suffix: string, role: 'RIDER' | 'DRIVER') {
  const u = await db.user.create({
    data: {
      name: `${TAG} ${suffix}`,
      email: `${TAG.toLowerCase()}-${suffix.toLowerCase()}@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role,
    },
  });
  made.userIds.push(u.id);
  const r = await db.rider.create({
    data: {
      userId: u.id,
      fullName: `${TAG} ${suffix}`,
      phone: u.phone!,
      riderRole: role === 'DRIVER' ? 'SMART_CAR_DRIVER' : 'SMART_BODA_RIDER',
      status: 'APPROVED',
      physicalAddress: 'Bugolobi, Kampala',
      isOnline: true,
      lastHeartbeatAt: new Date(),
    } as never,
  });
  made.riderIds.push(r.id);
  return r;
}

async function makeTask(clientId: string, taskType: TaskType) {
  const t = await db.task.create({
    data: {
      taskNumber: `${TAG}-${taskType}-${Date.now()}`,
      taskType,
      status: TaskStatus.SEARCHING,
      clientId,
      pickupAddress: 'Faraday Road, Kampala',
      pickupLatitude: 0.3176,
      pickupLongitude: 32.6103,
      dropoffAddress: 'MUBS, Nakawa',
      dropoffLatitude: 0.3299,
      dropoffLongitude: 32.6216,
      baseFare: 3000,
      totalAmount: 3000,
      riderEarnings: 2550,
      paymentMethod: 'CASH',
    } as never,
  });
  made.taskIds.push(t.id);
  return t;
}

/** Walk a UI flow map through the real state machine as the RIDER. */
async function walk(label: string, taskType: TaskType, flow: Record<string, string>, riderId: string, clientId: string) {
  stage(`${label} — walking the app's own map as RIDER`);

  const task = await makeTask(clientId, taskType);

  // Get to ASSIGNED the way dispatch does.
  const assigned = await EnhancedTaskStateMachine.transition(task.id, TaskStatus.ASSIGNED, {
    triggeredByType: 'SYSTEM',
    riderId,
    reason: 'dispatch',
  } as never);
  if (!assigned.success) {
    check(`${label}: reach ASSIGNED`, false, assigned.error ?? 'unknown');
    return;
  }

  let current = 'ASSIGNED';
  const seen = new Set<string>();

  while (flow[current] && !seen.has(current)) {
    seen.add(current);
    const next = flow[current];

    const res = await EnhancedTaskStateMachine.transition(task.id, next as TaskStatus, {
      triggeredByType: 'RIDER',
      riderId,
      reason: 'driver pressed the primary button',
    } as never);

    check(
      `${label}: ${current} → ${next}`,
      res.success,
      res.success ? 'accepted' : (res.error ?? 'refused').slice(0, 96),
    );

    if (!res.success) {
      console.log(`         ↑ the driver's primary button is dead at ${current}; the journey stops here`);
      break;
    }
    current = next;
    await setServiceRoleContext();
  }
}

async function main() {
  console.log('\n=== Driver controls vs. the backend lifecycle ===\n');

  const client = await db.user.create({
    data: {
      name: `${TAG} Client`,
      email: `${TAG.toLowerCase()}-client@smartride.test`,
      phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: await hashPassword('ProbePass@2026'),
      role: 'CLIENT',
    },
  });
  made.userIds.push(client.id);

  const boda = await makeRider('Boda', 'RIDER');
  const car = await makeRider('Car', 'DRIVER');
  const courier = await makeRider('Courier', 'RIDER');

  // Establish the service-role context BEFORE the first walk, not just between
  // walks. Without this the first transition of the run failed with the state
  // machine's catch-all "An internal error occurred" while the identical flow
  // passed on the second and third walks — a harness artifact that reads
  // exactly like a product defect.
  await setServiceRoleContext();

  await walk('Smart Boda (ride)', TaskType.SMART_BODA_RIDE, RIDE_FLOW, boda.id, client.id);
  await setServiceRoleContext();
  await walk('Smart Car (ride)', TaskType.SMART_CAR_RIDE, RIDE_FLOW, car.id, client.id);
  await setServiceRoleContext();
  await walk('Delivery (parcel)', TaskType.ITEM_DELIVERY, DELIVERY_FLOW, courier.id, client.id);
}

main()
  .catch(e => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.dispatchMatch.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } });
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: made.userIds } } });
    console.log(`\n=== ${checks - failures}/${checks} steps accepted ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

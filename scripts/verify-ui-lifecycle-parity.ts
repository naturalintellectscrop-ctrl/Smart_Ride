/**
 * Does the provider's primary button correspond to a real backend operation —
 * one that exists, is reachable, and is legal at that state, FOR EVERY SERVICE?
 *
 * The standing QA rule after LC-1: checking that a control renders proves
 * nothing. `Cancel` rendered perfectly and targeted a transition that exists in
 * no lifecycle table in the system.
 *
 * WHAT CHANGED, AND WHY THIS SUITE MISSED IT BEFORE
 * -------------------------------------------------
 * The previous version of this file copied the mobile app's two hardcoded flow
 * maps and walked them — but only for SMART_BODA_RIDE, SMART_CAR_RIDE and
 * ITEM_DELIVERY. Those are precisely the three types whose graphs matched the
 * hardcoded maps, so the suite passed while FOOD_DELIVERY, SHOPPING and
 * SMART_HEALTH_DELIVERY were untestable in the app: none of them has an
 * ASSIGNED -> ACCEPTED transition at all, so a courier's first tap died on
 *   400 Invalid transition from ASSIGNED to ACCEPTED for task type FOOD_DELIVERY
 * and the job could never be started. Testing only the passing subset is how a
 * whole role stayed broken behind a green suite.
 *
 * The app no longer hardcodes a flow. It reads `task.allowedTransitions` from
 * GET /api/tasks/[id] and picks one, using the per-type preference tables copied
 * below. So the question this suite now answers is:
 *
 *   For every service type, at every state it can reach, is the step the UI
 *   would choose (a) legal per the state machine, and (b) actually accepted when
 *   performed as the RIDER actor?
 *
 *   bun scripts/verify-ui-lifecycle-parity.ts
 */

import { db, setServiceRoleContext } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import { EnhancedTaskStateMachine } from '../src/lib/services/enhanced-task-state-machine.service';
import { TaskStatus, TaskType, RiderRole } from '@prisma/client';

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

// ============================================
// THE UI'S SELECTION LOGIC
// ============================================
// Copied verbatim from expo-app/src/components/journey/journeyCopy.ts. The two
// packages cannot import each other, so this mirror is the seam — if the app's
// preference tables change and this file is not updated, this suite is testing
// a selection the app no longer makes.

const NOT_A_PROVIDER_STEP: string[] = [
  'CREATED', 'REQUESTED', 'MATCHING', 'SEARCHING',
  'CANCELLED', 'FAILED', 'PAID', 'CLOSED',
];

const FORWARD_PREFERENCE: Record<string, string[]> = {
  SMART_BODA_RIDE: ['ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED'],
  SMART_CAR_RIDE: ['ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'COMPLETED'],
  ITEM_DELIVERY: ['ACCEPTED', 'ARRIVING', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERING', 'DELIVERED', 'COMPLETED'],
  FOOD_DELIVERY: ['PICKED_UP', 'DELIVERED', 'COMPLETED'],
  SHOPPING: ['IN_PROGRESS', 'PICKED_UP', 'DELIVERED', 'COMPLETED'],
  SMART_HEALTH_DELIVERY: ['PICKED_UP', 'IN_TRANSIT', 'DELIVERING', 'DELIVERED', 'COMPLETED'],
};

const GLOBAL_ORDER: string[] = [
  'ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS',
  'IN_TRANSIT', 'DELIVERING', 'DELIVERED', 'COMPLETED',
];

/** The mobile shell's `pickPrimaryTransition`, mirrored. */
function pickPrimaryTransition(taskType: string, allowed: string[]): string | null {
  if (allowed.length === 0) return null;
  const forward = allowed.filter((s) => !NOT_A_PROVIDER_STEP.includes(s));
  if (forward.length === 0) return null;

  const preference = FORWARD_PREFERENCE[taskType] ?? GLOBAL_ORDER;
  for (const c of preference) if (forward.includes(c)) return c;
  for (const c of GLOBAL_ORDER) if (forward.includes(c)) return c;
  return forward[0];
}

/** Mirrors `requiresProof`: reaching DELIVERED needs evidence on any delivery. */
function requiresProof(taskType: string, target: string | null): boolean {
  if (!target) return false;
  if (taskType === 'SMART_BODA_RIDE' || taskType === 'SMART_CAR_RIDE') return false;
  return target === 'DELIVERED';
}

// ============================================
// FIXTURES
// ============================================

const made = { userIds: [] as string[], riderIds: [] as string[], taskIds: [] as string[] };

async function makeRider(suffix: string, role: 'RIDER' | 'DRIVER', riderRole: RiderRole) {
  const u = await db.user.create({
    data: {
      name: `${TAG} ${suffix}`,
      email: `${TAG.toLowerCase()}-${suffix.toLowerCase()}-${Date.now()}@smartride.test`,
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
      riderRole,
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
      taskNumber: `${TAG}-${taskType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
      platformCommission: 450,
      riderEarnings: 2550,
      paymentMethod: 'CASH',
      // Proof is pre-satisfied so the walk tests the LIFECYCLE, not the proof
      // gate. The gate itself is covered by verify-in-journey-experience.ts.
      deliveryCode: '4821',
    } as never,
  });
  made.taskIds.push(t.id);
  return t;
}

/** Satisfy the proof-of-delivery gate the way a real courier's capture does. */
async function recordProof(taskId: string) {
  await db.task.update({
    where: { id: taskId },
    data: {
      proofType: 'CODE',
      proofRecipientName: `${TAG} Recipient`,
      proofLatitude: 0.3299,
      proofLongitude: 32.6216,
      proofCapturedAt: new Date(),
    } as never,
  });
}

// ============================================
// THE WALK
// ============================================

/**
 * Drive one task type from ASSIGNED to a terminal state, choosing each step the
 * way the app does: ask the state machine what is legal, let the UI's preference
 * pick one, then perform it as the RIDER.
 */
async function walk(label: string, taskType: TaskType, riderId: string, clientId: string) {
  stage(`${label} — server-driven walk as RIDER`);

  const task = await makeTask(clientId, taskType);

  const assigned = await EnhancedTaskStateMachine.transition(task.id, TaskStatus.ASSIGNED, {
    triggeredByType: 'SYSTEM',
    riderId,
    reason: 'dispatch',
  } as never);
  if (!assigned.success) {
    check(`${label}: reach ASSIGNED`, false, assigned.error ?? 'unknown');
    return;
  }

  let current: string = TaskStatus.ASSIGNED;
  const seen = new Set<string>();
  let steps = 0;

  while (steps < 12) {
    steps++;
    if (seen.has(current)) break;
    seen.add(current);

    const allowed = EnhancedTaskStateMachine.getValidNextStatuses(
      taskType,
      current as TaskStatus
    ) as unknown as string[];

    const next = pickPrimaryTransition(taskType, allowed);
    if (!next) {
      // No forward step is the correct answer at a terminal state, and a defect
      // anywhere else — it means the provider is holding a job with no move.
      const terminal = ['COMPLETED', 'DELIVERED', 'PAID', 'CLOSED'].includes(current);
      check(
        `${label}: ${current} has a next step`,
        terminal,
        terminal ? 'terminal, correctly no action' : `STRANDED — allowed=[${allowed.join(', ')}]`
      );
      break;
    }

    // (a) The UI must never choose a step the state machine does not permit.
    check(
      `${label}: ${current} → ${next} is legal`,
      allowed.includes(next),
      allowed.includes(next) ? 'in allowedTransitions' : `NOT in [${allowed.join(', ')}]`
    );

    // The app opens the proof sheet here rather than firing a bare transition,
    // so mirror that: capture proof first, exactly as the courier would.
    if (requiresProof(taskType, next)) await recordProof(task.id);

    // (b) And the RIDER actor must actually be allowed to perform it.
    const res = await EnhancedTaskStateMachine.transition(task.id, next as TaskStatus, {
      triggeredByType: 'RIDER',
      riderId,
      reason: 'provider pressed the primary button',
    } as never);

    check(
      `${label}: ${current} → ${next} accepted`,
      res.success,
      res.success ? 'accepted' : (res.error ?? 'refused').slice(0, 96)
    );

    if (!res.success) {
      console.log(`         ↑ the primary button is dead at ${current}; the journey stops here`);
      break;
    }

    current = next;
    await setServiceRoleContext();
  }
}

async function main() {
  console.log('\n=== Provider controls vs. the backend lifecycle, all six services ===\n');

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

  const boda = await makeRider('Boda', 'RIDER', 'SMART_BODA_RIDER');
  const car = await makeRider('Car', 'DRIVER', 'SMART_CAR_DRIVER');
  const courier = await makeRider('Courier', 'RIDER', 'DELIVERY_PERSONNEL');

  // Establish the service-role context BEFORE the first walk, not just between
  // walks. Without this the first transition of the run failed with the state
  // machine's catch-all "An internal error occurred" while the identical flow
  // passed on later walks — a harness artifact that reads exactly like a
  // product defect.
  await setServiceRoleContext();

  const walks: Array<[string, TaskType, string]> = [
    ['Smart Boda (ride)', TaskType.SMART_BODA_RIDE, boda.id],
    ['Smart Car (ride)', TaskType.SMART_CAR_RIDE, car.id],
    ['Parcel (item delivery)', TaskType.ITEM_DELIVERY, courier.id],
    // The three that were never covered before, and were broken in the app.
    ['Food delivery', TaskType.FOOD_DELIVERY, courier.id],
    ['Shopping', TaskType.SHOPPING, courier.id],
    ['Health delivery', TaskType.SMART_HEALTH_DELIVERY, courier.id],
  ];

  for (const [label, type, riderId] of walks) {
    await walk(label, type, riderId, client.id);
    await setServiceRoleContext();
  }
}

main()
  .catch((e) => {
    console.error('\nSUITE ERROR:', e);
    failures++;
  })
  .finally(async () => {
    await setServiceRoleContext();
    await db.taskStateTransition.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.dispatchMatch.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.financeLog.deleteMany({ where: { referenceId: { in: made.taskIds } } });
    await db.cashCollection.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.auditLog.deleteMany({ where: { taskId: { in: made.taskIds } } });
    await db.task.deleteMany({ where: { id: { in: made.taskIds } } });
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: made.userIds } } });
    console.log(`\n=== ${checks - failures}/${checks} checks passed ===\n`);
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });

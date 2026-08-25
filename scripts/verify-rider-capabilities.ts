/**
 * RIDER CAPABILITIES — who may be offered what (OPS-1).
 *
 * The capability model is derived from the rider's ROLE and overridable by an
 * admin through the `RiderCapability` table. Three places state the same model
 * and must not drift apart:
 *
 *   prisma/seed-capabilities.ts                       the seeded configuration
 *   CapabilityService.DEFAULT_CAPABILITIES            the per-rider check
 *   CapabilityService.getDefaultRolesForTaskType      the dispatch pool
 *
 *   BODA   → rides, parcels
 *   CAR    → passenger rides only
 *   COURIER (DELIVERY_PERSONNEL) → food, shopping, parcels, health
 *
 * This suite asserts that model end to end, and asserts the thing that made
 * OPS-1 dangerous: a capability that is present but DISABLED must exclude, not
 * fall through to the defaults.
 *
 *   bun scripts/verify-rider-capabilities.ts
 */

import { PrismaClient, RiderRole, TaskType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CapabilityService } from '../src/lib/services/capability.service';
import { qaCleanupByTag, qaNothingLeft } from './qa-cleanup';

const db = new PrismaClient();
const TAG = Math.random().toString(36).slice(2, 8);
const PW = 'QaCap#2026';
const HERE = { lat: 0.3476, lng: 32.5825 };

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

/** The intended model, written out so a drift is a failing test, not a surprise. */
const EXPECTED: Record<RiderRole, TaskType[]> = {
  SMART_BODA_RIDER: ['SMART_BODA_RIDE', 'ITEM_DELIVERY'] as TaskType[],
  SMART_CAR_DRIVER: ['SMART_CAR_RIDE'] as TaskType[],
  DELIVERY_PERSONNEL: ['FOOD_DELIVERY', 'SHOPPING', 'ITEM_DELIVERY', 'SMART_HEALTH_DELIVERY'] as TaskType[],
};

const ALL_TASK_TYPES: TaskType[] = [
  'SMART_BODA_RIDE', 'SMART_CAR_RIDE', 'FOOD_DELIVERY',
  'SHOPPING', 'ITEM_DELIVERY', 'SMART_HEALTH_DELIVERY',
] as TaskType[];

async function run() {
  const hash = await bcrypt.hash(PW, 10);
  const ph = () => `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`;

  console.log(`\n=== RIDER CAPABILITIES (OPS-1) ===\n`);

  // One approved, online rider of each role, all in the same place.
  const made: Record<string, { riderId: string; userId: string }> = {};
  for (const role of Object.keys(EXPECTED) as RiderRole[]) {
    const u = await db.user.create({
      data: {
        email: `qa-cap-${role.toLowerCase()}-${TAG}@qa.invalid`, phone: ph(),
        name: `QA Cap ${TAG}`, passwordHash: hash, role: 'RIDER', status: 'ACTIVE',
      },
    });
    const r = await db.rider.create({
      data: {
        userId: u.id, fullName: `QA Cap ${role} ${TAG}`, phone: u.phone, email: u.email!,
        physicalAddress: 'Kampala', riderRole: role, status: 'APPROVED',
        isOnline: true, currentLatitude: HERE.lat, currentLongitude: HERE.lng,
        lastHeartbeatAt: new Date(),
        ...(role === 'SMART_CAR_DRIVER' ? { vehicleType: 'CAR' as const } : {}),
      },
    });
    made[role] = { riderId: r.id, userId: u.id };
  }

  // ── the per-rider check ─────────────────────────────────────────────────
  console.log('-- what each role may perform --');
  for (const role of Object.keys(EXPECTED) as RiderRole[]) {
    const rider = await db.rider.findUnique({ where: { id: made[role].riderId } });
    for (const taskType of ALL_TASK_TYPES) {
      const want = EXPECTED[role].includes(taskType);
      const res = await CapabilityService.canHandleTaskType(rider!, taskType);
      ok(`${role.padEnd(18)} ${want ? 'may    ' : 'may NOT'} ${taskType}`,
        res.allowed === want, res.allowed === want ? '' : `got allowed=${res.allowed} ${res.reason ?? ''}`);
    }
  }

  // ── the dispatch pool ───────────────────────────────────────────────────
  console.log('\n-- who dispatch will consider for each service --');
  for (const taskType of ALL_TASK_TYPES) {
    const eligible = await CapabilityService.getEligibleRiders(taskType, {
      latitude: HERE.lat, longitude: HERE.lng, radiusKm: 10, limit: 50,
    });
    const mine = eligible.filter((r) => r.fullName.includes(TAG));
    const roles = new Set(mine.map((r) => r.riderRole));
    const wantRoles = (Object.keys(EXPECTED) as RiderRole[]).filter((r) => EXPECTED[r].includes(taskType));
    const matches = wantRoles.length === roles.size && wantRoles.every((r) => roles.has(r));
    ok(`${taskType.padEnd(22)} pool = ${wantRoles.join(', ') || '(none)'}`,
      matches, matches ? '' : `got ${[...roles].join(', ') || '(none)'}`);
  }

  // ── OPS-1: a DISABLED capability must exclude, not fall through ─────────
  console.log('\n-- a disabled capability excludes (OPS-1) --');

  // Snapshot whatever configuration exists, so this is restored exactly.
  const before = await db.riderCapability.findMany({ where: { taskType: 'FOOD_DELIVERY' as TaskType } });
  const beforeCount = before.length;

  // Disable food for every role, the way an admin suspending the service would.
  for (const role of Object.keys(EXPECTED) as RiderRole[]) {
    await db.riderCapability.upsert({
      where: { riderRole_taskType: { riderRole: role, taskType: 'FOOD_DELIVERY' as TaskType } },
      update: { isAllowed: false },
      create: { riderRole: role, taskType: 'FOOD_DELIVERY' as TaskType, isAllowed: false, notes: `QA ${TAG}` },
    });
  }

  const afterDisable = await CapabilityService.getEligibleRiders('FOOD_DELIVERY' as TaskType, {
    latitude: HERE.lat, longitude: HERE.lng, radiusKm: 10, limit: 50,
  });
  ok('nobody is eligible for a service disabled for every role',
    afterDisable.filter((r) => r.fullName.includes(TAG)).length === 0,
    `${afterDisable.filter((r) => r.fullName.includes(TAG)).length} rider(s) still offered it`);

  const courier = await db.rider.findUnique({ where: { id: made.DELIVERY_PERSONNEL.riderId } });
  const perRider = await CapabilityService.canHandleTaskType(courier!, 'FOOD_DELIVERY' as TaskType);
  ok('and the per-rider check agrees', perRider.allowed === false, perRider.reason);

  const allowedTypes = await CapabilityService.getAllowedTaskTypes('DELIVERY_PERSONNEL' as RiderRole);
  ok('the role no longer lists it among its task types',
    !allowedTypes.includes('FOOD_DELIVERY' as TaskType), allowedTypes.join(', '));

  // Enabling one role back must offer it to that role ONLY.
  await db.riderCapability.update({
    where: { riderRole_taskType: { riderRole: 'DELIVERY_PERSONNEL' as RiderRole, taskType: 'FOOD_DELIVERY' as TaskType } },
    data: { isAllowed: true },
  });
  const afterReenable = await CapabilityService.getEligibleRiders('FOOD_DELIVERY' as TaskType, {
    latitude: HERE.lat, longitude: HERE.lng, radiusKm: 10, limit: 50,
  });
  const back = afterReenable.filter((r) => r.fullName.includes(TAG));
  ok('re-enabling one role offers it to that role only',
    back.length === 1 && back[0].riderRole === 'DELIVERY_PERSONNEL',
    back.map((r) => r.riderRole).join(', ') || '(none)');

  // A per-rider assignment must not overturn a role-wide disablement.
  await db.riderCapability.update({
    where: { riderRole_taskType: { riderRole: 'DELIVERY_PERSONNEL' as RiderRole, taskType: 'FOOD_DELIVERY' as TaskType } },
    data: { isAllowed: false },
  });
  const { RiderOnboardingService } = await import('../src/lib/rider/rider-onboarding.service');
  let refused = false;
  try {
    await RiderOnboardingService.addCapability(made.DELIVERY_PERSONNEL.riderId, 'FOOD_DELIVERY' as TaskType);
  } catch {
    refused = true;
  }
  ok('a per-rider assignment cannot re-enable a role-wide disablement', refused);
  const stillOff = await db.riderCapability.findUnique({
    where: { riderRole_taskType: { riderRole: 'DELIVERY_PERSONNEL' as RiderRole, taskType: 'FOOD_DELIVERY' as TaskType } },
    select: { isAllowed: true },
  });
  ok('and the capability is still disabled', stillOff?.isAllowed === false);

  // ── OPS-1: a PARTIAL configuration must not narrow the pool ────────────
  //
  // Onboarding upserts rows for the onboarding rider's role only. The first
  // courier to sign up therefore creates DELIVERY_PERSONNEL rows for
  // ITEM_DELIVERY — and parcels are supposed to be carried by boda riders too.
  // If the presence of any row for a task type replaced the defaults wholesale,
  // that one onboarding would quietly stop offering parcels to every boda
  // rider on the platform, with nothing reporting it.
  console.log('\n-- a partial configuration does not narrow the pool (OPS-1) --');
  const parcelBefore = await db.riderCapability.findMany({ where: { taskType: 'ITEM_DELIVERY' as TaskType } });
  await db.riderCapability.upsert({
    where: { riderRole_taskType: { riderRole: 'DELIVERY_PERSONNEL' as RiderRole, taskType: 'ITEM_DELIVERY' as TaskType } },
    update: { isAllowed: true },
    create: { riderRole: 'DELIVERY_PERSONNEL' as RiderRole, taskType: 'ITEM_DELIVERY' as TaskType, isAllowed: true, notes: `QA ${TAG}` },
  });
  const parcelPool = await CapabilityService.getEligibleRiders('ITEM_DELIVERY' as TaskType, {
    latitude: HERE.lat, longitude: HERE.lng, radiusKm: 10, limit: 50,
  });
  const parcelRoles = new Set(parcelPool.filter((r) => r.fullName.includes(TAG)).map((r) => r.riderRole));
  ok('a boda rider still gets parcels when only the courier role is configured',
    parcelRoles.has('SMART_BODA_RIDER' as RiderRole) && parcelRoles.has('DELIVERY_PERSONNEL' as RiderRole),
    [...parcelRoles].join(', ') || '(none)');

  await db.riderCapability.deleteMany({ where: { taskType: 'ITEM_DELIVERY' as TaskType } });
  for (const row of parcelBefore) {
    await db.riderCapability.create({
      data: {
        riderRole: row.riderRole, taskType: row.taskType, isAllowed: row.isAllowed,
        requiresVehicle: row.requiresVehicle, requiresInsulatedBox: row.requiresInsulatedBox,
        maxDistance: row.maxDistance, notes: row.notes,
      },
    });
  }

  // ── restore the configuration exactly as it was ─────────────────────────
  await db.riderCapability.deleteMany({ where: { taskType: 'FOOD_DELIVERY' as TaskType } });
  for (const row of before) {
    await db.riderCapability.create({
      data: {
        riderRole: row.riderRole, taskType: row.taskType, isAllowed: row.isAllowed,
        requiresVehicle: row.requiresVehicle, requiresInsulatedBox: row.requiresInsulatedBox,
        maxDistance: row.maxDistance, notes: row.notes,
      },
    });
  }
  const restored = await db.riderCapability.count({ where: { taskType: 'FOOD_DELIVERY' as TaskType } });
  ok('the capability configuration is restored exactly',
    restored === beforeCount, `${beforeCount} row(s) before, ${restored} after`);

  const foodPool = await CapabilityService.getEligibleRiders('FOOD_DELIVERY' as TaskType, {
    latitude: HERE.lat, longitude: HERE.lng, radiusKm: 10, limit: 50,
  });
  ok('and food dispatch works again',
    foodPool.filter((r) => r.fullName.includes(TAG)).length === 1);
}

async function main() {
  try {
    await run();
  } finally {
    await qaCleanupByTag(db, TAG);
    await db.riderCapability.deleteMany({ where: { notes: { contains: TAG } } }).catch(() => {});
    ok('no QA fixtures left', await qaNothingLeft(db, TAG));
  }
  console.log(`\n=== ${pass}/${pass + fail} passed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());

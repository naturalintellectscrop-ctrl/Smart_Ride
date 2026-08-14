/**
 * Incentives, end to end — admin creates, driver joins, work counts, money lands.
 *
 * The concern this answers: an incentive system can look complete because the
 * models, the engine, the API and the cron all exist, while no driver is ever
 * enrolled in anything. Every step here goes through the real HTTP route with a
 * real token, and the last assertion is a wallet balance, not a status column.
 *
 *   npm run dev
 *   bun scripts/verify-incentive-connectivity.ts
 */

import { db } from '../src/lib/db';
import { generateAccessToken } from '../src/lib/auth/jwt';
import { RiderRole, VehicleType } from '@prisma/client';
import { toNumber } from '../src/lib/decimal-utils';

const TAG = 'E2E-INCENTIVE';
const BASE = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000';
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

function tokenFor(u: { id: string; email: string | null; role: string; name: string | null }) {
  return generateAccessToken({
    id: u.id, email: u.email ?? '', role: u.role as never, name: u.name ?? '',
  } as never);
}

async function call(path: string, init?: { method?: string; token?: string; body?: unknown }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  let json: Record<string, unknown> = {};
  try { json = (await res.json()) as Record<string, unknown>; } catch { /* empty */ }
  return { status: res.status, json };
}

const made = {
  userIds: [] as string[], riderIds: [] as string[],
  incentiveIds: [] as string[], participationIds: [] as string[],
};

async function main() {
  console.log('\n=== Incentive connectivity: admin → driver → work → reward ===');

  try {
    stage('SETUP  an admin, a driver, and a driver who never joins');

    const adminUser = await db.user.create({
      data: {
        name: `${TAG} Admin`,
        email: `${TAG.toLowerCase()}-admin-${Date.now()}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: 'SUPER_ADMIN' as never,
      },
    });
    made.userIds.push(adminUser.id);

    const driverUser = await db.user.create({
      data: {
        name: `${TAG} Driver`,
        email: `${TAG.toLowerCase()}-driver-${Date.now()}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: 'RIDER' as never,
      },
    });
    made.userIds.push(driverUser.id);

    const otherUser = await db.user.create({
      data: {
        name: `${TAG} Other`,
        email: `${TAG.toLowerCase()}-other-${Date.now()}@smartride.test`,
        phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: 'RIDER' as never,
      },
    });
    made.userIds.push(otherUser.id);

    const mkRider = async (u: typeof driverUser, label: string) => {
      const r = await db.rider.create({
        data: {
          userId: u.id, fullName: `${TAG} ${label}`, phone: u.phone!,
          physicalAddress: 'Kampala',
          riderRole: RiderRole.SMART_BODA_RIDER, vehicleType: VehicleType.BODA,
          status: 'APPROVED', isOnline: true,
        },
      });
      made.riderIds.push(r.id);
      return r;
    };
    const driver = await mkRider(driverUser, 'Driver');
    const other = await mkRider(otherUser, 'Other');

    const adminToken = tokenFor(adminUser);
    const driverToken = tokenFor(driverUser);
    const otherToken = tokenFor(otherUser);
    check('fixtures', true, 'admin, joining driver, non-joining driver');

    // ── 1. Admin creates a campaign through the real route ───────────
    stage('LINK 1  an admin creates an incentive');

    const now = Date.now();
    const created = await call('/api/marketplace/incentives', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `${TAG} Two-ride bonus`,
        description: 'Complete two rides and earn a bonus. Test campaign.',
        incentiveType: 'COMPLETION_BONUS',
        rewardAmount: 5000,
        rewardType: 'CASH',
        minRides: 2,
        startTime: new Date(now - 60_000).toISOString(),
        endTime: new Date(now + 3_600_000).toISOString(),
      },
    });
    const incentive = ((created.json.data as Record<string, unknown>)?.incentive ??
      created.json.data ?? {}) as Record<string, unknown>;
    const incentiveId = String(incentive.id ?? '');
    if (incentiveId) made.incentiveIds.push(incentiveId);
    check(
      'an admin can create an incentive',
      (created.status === 200 || created.status === 201) && !!incentiveId,
      `status ${created.status} ${String(created.json.error ?? '')}`
    );
    if (!incentiveId) return;

    // ── 2. The driver can SEE it ─────────────────────────────────────
    stage('LINK 2  the driver can see the campaign');

    const list = await call('/api/marketplace/incentives?status=ACTIVE', { token: driverToken });
    const campaigns = ((list.json.data as Record<string, unknown>)?.incentives ??
      list.json.data ?? []) as Array<Record<string, unknown>>;
    check(
      'a driver can list open campaigns',
      list.status === 200 && Array.isArray(campaigns) &&
        campaigns.some(c => c.id === incentiveId),
      `status ${list.status}, ${Array.isArray(campaigns) ? campaigns.length : 0} campaign(s) — ` +
      `this is the call the app had no caller for`
    );

    // ── 3. The driver can JOIN — the link that was missing ───────────
    stage('LINK 3  the driver enrols');

    const joined = await call('/api/marketplace/incentives/participate', {
      method: 'POST',
      token: driverToken,
      body: { incentiveId },
    });
    check(
      'a driver can enrol themselves',
      joined.status === 200 || joined.status === 201,
      `status ${joined.status} ${String(joined.json.error ?? '')}`
    );

    const participation = await db.incentiveParticipation.findFirst({
      where: { incentiveId, riderId: driver.id },
      select: { id: true, status: true, ridesCompleted: true },
    });
    if (participation) made.participationIds.push(participation.id);
    check(
      'the enrolment is persisted against this driver',
      !!participation,
      participation ? `status ${participation.status}` : 'no participation row'
    );

    // The riderId must come from the token, not the body.
    const impersonate = await call('/api/marketplace/incentives/participate', {
      method: 'POST',
      token: otherToken,
      body: { incentiveId, riderId: driver.id },
    });
    const stolen = await db.incentiveParticipation.count({
      where: { incentiveId, riderId: driver.id },
    });
    check(
      'one driver cannot enrol another',
      stolen === 1,
      `status ${impersonate.status}, ${stolen} participation row(s) for the first driver`
    );

    // ── 4. Completed work advances progress ──────────────────────────
    stage('LINK 4  completed work counts toward the campaign');

    // Captured BEFORE any qualifying work: the reward fires the moment the
    // last required ride lands, not later on the scheduler.
    const before = await db.wallet.findFirst({
      where: { ownerId: driverUser.id, ownerType: 'USER' },
      select: { balance: true },
    });

    const { processTaskCompletion } = await import('../src/lib/marketplace/incentive-fulfillment');
    for (let i = 0; i < 2; i++) {
      await processTaskCompletion({
        riderId: driver.id,
        taskId: `${TAG}-task-${i}`,
        earnings: 4000,
        completedAt: new Date(),
      } as never);
    }

    const progressed = await db.incentiveParticipation.findFirst({
      where: { incentiveId, riderId: driver.id },
      select: { id: true, status: true, ridesCompleted: true, rewardEarned: true, isCompleted: true },
    });
    check(
      'completing rides advances the driver\'s progress',
      (progressed?.ridesCompleted ?? 0) >= 2,
      `${progressed?.ridesCompleted ?? 0} of 2 rides recorded, status ${progressed?.status}`
    );

    // ── 5. The reward reaches a wallet the driver can spend ──────────
    stage('LINK 5  the reward reaches the driver\'s wallet');

    // The scheduler is the safety net for anything that did not settle inline.
    const { processPendingRewards } = await import('../src/lib/marketplace/incentive-fulfillment');
    const paid = await processPendingRewards();

    const after = await db.wallet.findFirst({
      where: { ownerId: driverUser.id, ownerType: 'USER' },
      select: { balance: true },
    });
    const delta = toNumber(after?.balance) - toNumber(before?.balance);

    check(
      'the qualifying driver is paid the bonus',
      delta >= 5000,
      `wallet moved by ${delta} from ${toNumber(before?.balance)} to ${toNumber(after?.balance)}` +
      ` (scheduler swept ${JSON.stringify(paid)})`
    );

    // The wallet must be the one the driver actually spends from — a
    // RIDER-owned parallel balance would look identical here but be invisible
    // to them.
    // A RIDER-owned parallel balance would look identical to a passing test
    // but be invisible to the driver, so assert the owner type explicitly.
    const userWallet = await db.wallet.findFirst({
      where: { ownerId: driverUser.id, ownerType: 'USER' },
      select: { id: true, ownerType: true },
    });
    check(
      'the bonus lands in the wallet the driver can actually spend',
      !!userWallet,
      userWallet ? `wallet owner ${String(userWallet.ownerType ?? 'USER')}` : 'no USER wallet exists'
    );

    // ── 6. A driver who never enrolled is not paid ───────────────────
    stage('LINK 6  a driver who never joined earns nothing');

    const otherWallet = await db.wallet.findFirst({
      where: { ownerId: otherUser.id, ownerType: 'USER' },
      select: { balance: true },
    });
    check(
      'a driver who never enrolled receives no bonus',
      toNumber(otherWallet?.balance) === 0,
      `balance ${toNumber(otherWallet?.balance)}`
    );
  } finally {
    await db.incentiveParticipation.deleteMany({ where: { incentiveId: { in: made.incentiveIds } } }).catch(() => {});
    await db.driverIncentive.deleteMany({ where: { id: { in: made.incentiveIds } } }).catch(() => {});
    const wallets = await db.wallet.findMany({ where: { ownerId: { in: made.userIds } }, select: { id: true } }).catch(() => []);
    await db.walletTransaction.deleteMany({ where: { walletId: { in: wallets.map(w => w.id) } } }).catch(() => {});
    await db.wallet.deleteMany({ where: { ownerId: { in: made.userIds } } }).catch(() => {});
    await db.rider.deleteMany({ where: { id: { in: made.riderIds } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: made.userIds } } }).catch(() => {});
  }

  console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`} — ${checks} checks\n`);
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('\nSUITE CRASHED:', e);
  await db.$disconnect();
  process.exit(1);
});

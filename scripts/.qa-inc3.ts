/**
 * INC-3 — can a driver leave a bonus they joined?
 *
 * Drives the production API as the driver's app does: join, confirm the
 * participation exists, leave, confirm it is CANCELLED and the campaign's
 * participant count came back down. Disposable rider, deleted at the end.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const API = 'https://smartrideug.vercel.app/api';
const db = new PrismaClient();

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `qa-inc3-${rand}@qa.invalid`;
  const password = 'QaInc3#2026';

  // A disposable campaign of our own, inside a valid window. The one ACTIVE
  // campaign on this database has an endTime in the past, so enrolment is
  // refused with "Incentive is not within the valid time window" — correct
  // behaviour, and useless for testing the leave path.
  const incentive = await db.driverIncentive.create({
    data: {
      name: `QA INC3 ${rand}`,
      code: `QA-INC3-${rand.toUpperCase()}`,
      description: 'Disposable campaign for verifying INC-3. Deleted by this script.',
      incentiveType: 'COMPLETION_BONUS',
      status: 'ACTIVE',
      rewardAmount: 1000,
      minRides: 1,
      startTime: new Date(Date.now() - 60 * 60 * 1000),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    select: { id: true, name: true, currentParticipants: true },
  });
  console.log(`
=== INC-3 · "${incentive.name}" ===
`);

  const user = await db.user.create({
    data: {
      email,
      phone: `+2567${Math.floor(Math.random() * 90000000 + 10000000)}`,
      name: 'QA INC3 Rider',
      passwordHash: await bcrypt.hash(password, 10),
      role: 'RIDER',
      status: 'ACTIVE',
    },
  });
  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: 'QA INC3 Rider',
      phone: user.phone,
      email,
      physicalAddress: 'Kampala',
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
      isOnline: false,
    },
  });

  const before = incentive.currentParticipants;

  const lr = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = (await lr.json())?.data?.accessToken;
  if (!token) throw new Error('rider login failed');

  const call = (p: string, method: string, body?: unknown) =>
    fetch(`${API}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

  try {
    // ── join ──────────────────────────────────────────────────────────────
    const join = await call('/marketplace/incentives/participate', 'POST', {
      incentiveId: incentive.id,
    });
    const joinBody = await join.json();
    ok('the driver can join a bonus', join.status === 200 || join.status === 201,
      `HTTP ${join.status} ${joinBody?.error ?? ''}`);

    const p = await db.incentiveParticipation.findFirst({
      where: { riderId: rider.id, incentiveId: incentive.id },
      select: { id: true, status: true },
    });
    ok('a participation row exists', !!p, p?.status);

    const afterJoin = await db.driverIncentive.findUnique({
      where: { id: incentive.id },
      select: { currentParticipants: true },
    });
    ok('the campaign counted them in', (afterJoin?.currentParticipants ?? 0) === before + 1,
      `${before} → ${afterJoin?.currentParticipants}`);

    // ── leave ─────────────────────────────────────────────────────────────
    if (p) {
      const leave = await call(
        `/marketplace/incentives/participate?participationId=${p.id}`,
        'DELETE'
      );
      const leaveBody = await leave.json();
      ok('the driver can leave it again (INC-3)', leave.status === 200,
        `HTTP ${leave.status} ${leaveBody?.message ?? leaveBody?.error ?? ''}`);

      const after = await db.incentiveParticipation.findUnique({
        where: { id: p.id },
        select: { status: true },
      });
      ok('the participation is CANCELLED', after?.status === 'CANCELLED', after?.status);

      const afterLeave = await db.driverIncentive.findUnique({
        where: { id: incentive.id },
        select: { currentParticipants: true },
      });
      ok('the campaign counted them back out',
        (afterLeave?.currentParticipants ?? 0) === before,
        `${afterJoin?.currentParticipants} → ${afterLeave?.currentParticipants}`);

      // ── somebody else's participation ─────────────────────────────────
      const other = await db.incentiveParticipation.findFirst({
        where: { riderId: { not: rider.id } },
        select: { id: true, status: true },
      });
      if (other) {
        const steal = await call(
          `/marketplace/incentives/participate?participationId=${other.id}`,
          'DELETE'
        );
        ok("another driver's enrolment cannot be cancelled", steal.status !== 200,
          `HTTP ${steal.status}`);
        const stillThere = await db.incentiveParticipation.findUnique({
          where: { id: other.id },
          select: { status: true },
        });
        ok('and it is untouched', stillThere?.status === other.status, stillThere?.status);
      }
    }
  } finally {
    await db.incentiveParticipation.deleteMany({ where: { riderId: rider.id } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await db.notification.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await db.rider.delete({ where: { id: rider.id } }).catch(() => {});
    await db.user.delete({ where: { id: user.id } }).catch(() => {});

    const left = await db.user.count({ where: { email } });
    ok('fixture cleaned up', left === 0);

    const finalCount = await db.driverIncentive.findUnique({
      where: { id: incentive.id },
      select: { currentParticipants: true },
    });
    ok('campaign participant count is back where it started',
      finalCount?.currentParticipants === before,
      `${before} → ${finalCount?.currentParticipants}`);

    await db.incentiveParticipation.deleteMany({ where: { incentiveId: incentive.id } }).catch(() => {});
    await db.driverIncentive.delete({ where: { id: incentive.id } }).catch(() => {});
    ok('disposable campaign removed',
      (await db.driverIncentive.count({ where: { id: incentive.id } })) === 0);
  }

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
  await db.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});

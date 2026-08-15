/**
 * Stage the data the device QA needs to SEE something.
 *
 * Two of this session's mobile fixes only show up when the right row exists:
 *   - the incentive Join button needs an ACTIVE campaign the driver has not joined
 *   - the proof photo on the receipt needs a completed delivery that captured one
 *
 * Created through the real tables so the screens read them the ordinary way.
 *
 *   bun scripts/qa-device-seed.ts
 */
import { db } from '../src/lib/db';

const TAG = 'QA-DEVICE';

async function main() {
  const now = Date.now();

  // ── An open campaign for the Join button ─────────────────────────
  const existing = await db.driverIncentive.findFirst({
    where: { name: { startsWith: TAG } },
    select: { id: true },
  });
  if (existing) {
    await db.driverIncentive.update({
      where: { id: existing.id },
      data: {
        status: 'ACTIVE',
        startTime: new Date(now - 60_000),
        endTime: new Date(now + 7 * 24 * 3600_000),
      },
    });
    console.log(`  campaign refreshed: ${existing.id}`);
  } else {
    const inc = await db.driverIncentive.create({
      data: {
        // `code` is a unique business key, not a display field.
        code: `${TAG}-WEEKEND-PUSH`,
        name: `${TAG} Weekend Push`,
        description: 'Complete 3 rides this weekend and earn a bonus.',
        incentiveType: 'COMPLETION_BONUS',
        rewardAmount: 15000,
        rewardType: 'CASH',
        minRides: 3,
        status: 'ACTIVE',
        startTime: new Date(now - 60_000),
        endTime: new Date(now + 7 * 24 * 3600_000),
      },
    });
    console.log(`  campaign created: ${inc.name} — UGX ${inc.rewardAmount}`);
  }

  // Make sure the QA boda has NOT joined, or the Join button will not render.
  const boda = await db.rider.findFirst({
    where: { user: { email: 'qa.boda@smartride.test' } },
    select: { id: true },
  });
  if (boda) {
    const removed = await db.incentiveParticipation.deleteMany({
      where: { riderId: boda.id, incentive: { name: { startsWith: TAG } } },
    });
    console.log(`  cleared ${removed.count} prior enrolment(s) so the Join button shows`);
  }

  const active = await db.driverIncentive.count({ where: { status: 'ACTIVE' } });
  console.log(`\n  ACTIVE campaigns visible to a driver: ${active}`);

  // ── Report what the client can already see ───────────────────────
  const withProof = await db.task.findFirst({
    where: { proofCapturedAt: { not: null }, proofPhotoUrl: { not: null } },
    orderBy: { proofCapturedAt: 'desc' },
    select: { id: true, taskNumber: true, clientId: true, proofPhotoUrl: true },
  });
  console.log(
    withProof
      ? `  delivery with photo proof: ${withProof.taskNumber} (client ${withProof.clientId})`
      : '  no delivery with photo proof exists yet'
  );

  await db.$disconnect();
}
main().catch(async e => { console.error(e); await db.$disconnect(); process.exit(1); });

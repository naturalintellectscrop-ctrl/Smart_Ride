/**
 * Smart Ride — Backfill / Reconcile Rider `totalEarnings`
 *
 * WHY: For a period, two writers credited a rider's lifetime `totalEarnings`
 * on every trip completion — `TaskAnalyticsUpdater.onTaskCompleted` AND
 * `FinanceLedgerService.recordTaskCompletion` — so `totalEarnings` was inflated
 * (up to 2x) while `walletBalance` (payable) stayed correct. The duplicate
 * credit has been removed (onTaskCompleted now owns only `completedTrips`), but
 * historical rows are still inflated. This script recomputes each rider's
 * `totalEarnings` from the source of truth — the sum of `riderEarnings` over
 * their COMPLETED tasks — and corrects any drift.
 *
 * SAFE: only touches `totalEarnings`. It NEVER changes `walletBalance` (that is
 * reduced by payouts/withdrawals and must not be recomputed from tasks).
 *
 * USAGE (from project root):
 *
 *   # Dry run — reports which riders would change (no writes)
 *   DATABASE_URL="$(grep ^DATABASE_URL .env.production | cut -d= -f2-)" bunx tsx scripts/backfill-rider-total-earnings.ts
 *
 *   # Apply the corrections
 *   DATABASE_URL="$(grep ^DATABASE_URL .env.production | cut -d= -f2-)" CONFIRM=1 bunx tsx scripts/backfill-rider-total-earnings.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.env.CONFIRM === '1';

function toNum(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

async function main() {
  console.log(`\nSmart Ride — rider totalEarnings backfill  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

  const riders = await prisma.rider.findMany({
    select: { id: true, fullName: true, totalEarnings: true },
  });

  let changed = 0;
  let unchanged = 0;
  let totalReclaimed = 0;

  for (const rider of riders) {
    // Source of truth: sum of riderEarnings across this rider's COMPLETED tasks.
    const agg = await prisma.task.aggregate({
      where: { riderId: rider.id, status: 'COMPLETED' },
      _sum: { riderEarnings: true },
    });
    const correct = Math.round(toNum(agg._sum.riderEarnings));
    const current = Math.round(toNum(rider.totalEarnings));

    if (correct === current) {
      unchanged++;
      continue;
    }

    changed++;
    totalReclaimed += current - correct;
    const arrow = current > correct ? '↓' : '↑';
    console.log(
      `  ${arrow} ${rider.fullName.padEnd(24)} ${String(current).padStart(10)} -> ${String(correct).padStart(10)}  (${rider.id})`
    );

    if (APPLY) {
      await prisma.rider.update({
        where: { id: rider.id },
        data: { totalEarnings: correct },
      });
    }
  }

  console.log(
    `\n${APPLY ? 'Updated' : 'Would update'} ${changed} rider(s); ${unchanged} already correct.` +
    ` Net inflation removed: ${totalReclaimed} UGX.`
  );
  if (!APPLY && changed > 0) {
    console.log('Re-run with CONFIRM=1 to apply.\n');
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

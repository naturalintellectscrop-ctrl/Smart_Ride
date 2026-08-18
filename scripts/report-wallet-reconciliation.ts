/**
 * How much money is stranded in the wrong wallet store?
 *
 * READ-ONLY. This script writes nothing. It exists because BE-040 was fixed
 * forward — ride earnings now credit the Wallet the driver's app reads and the
 * withdrawal route debits — but every trip completed BEFORE that fix credited
 * `rider.walletBalance` alone. That money is real and it is unreachable.
 *
 * Moving it is a decision about live balances, not a code change, so this
 * reports the gap and stops. Nothing here should ever be given a write path
 * without an explicit instruction to backfill.
 *
 *   bun scripts/report-wallet-reconciliation.ts
 */

import { db, setServiceRoleContext } from '../src/lib/db';

const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

async function main() {
  await setServiceRoleContext();

  const riders = await db.rider.findMany({
    select: {
      id: true,
      fullName: true,
      walletBalance: true,
      totalEarnings: true,
      completedTrips: true,
      user: { select: { id: true, email: true } },
    },
  });

  const wallets = await db.wallet.findMany({
    where: { ownerType: 'USER' },
    select: { ownerId: true, balance: true },
  });
  const walletByOwner = new Map(wallets.map(w => [w.ownerId, Number(w.balance)]));

  type Row = {
    name: string;
    email: string;
    riderBalance: number;
    walletBalance: number;
    gap: number;
    trips: number;
  };

  const rows: Row[] = [];
  for (const r of riders) {
    const riderBalance = Number(r.walletBalance);
    const walletBalance = walletByOwner.get(r.user.id) ?? 0;
    const gap = riderBalance - walletBalance;
    if (gap > 0) {
      rows.push({
        name: r.fullName,
        email: r.user.email ?? '(no email)',
        riderBalance,
        walletBalance,
        gap,
        trips: r.completedTrips ?? 0,
      });
    }
  }

  rows.sort((a, b) => b.gap - a.gap);

  console.log('\n=== Wallet reconciliation — READ ONLY, nothing was written ===\n');
  console.log(`Riders on the platform            : ${riders.length}`);
  console.log(`Riders whose earnings are stranded: ${rows.length}`);

  const total = rows.reduce((s, r) => s + r.gap, 0);
  console.log(`Total stranded                    : ${ugx(total)}\n`);

  if (rows.length === 0) {
    console.log('No divergence. Every rider.walletBalance is matched by a Wallet balance.\n');
    return;
  }

  console.log('Per rider (rider.walletBalance − Wallet.balance):\n');
  for (const r of rows) {
    console.log(
      `  ${ugx(r.gap).padStart(16)}  ${r.name} <${r.email}>  ` +
        `[rider=${ugx(r.riderBalance)} wallet=${ugx(r.walletBalance)} trips=${r.trips}]`,
    );
  }

  const noWallet = rows.filter(r => r.walletBalance === 0).length;
  console.log(
    `\n${noWallet} of these have NO Wallet balance at all — the app shows them zero ` +
      `while they have earned money.`,
  );
  console.log(
    '\nNothing was changed. Backfilling these balances is a decision about live\n' +
      'money and needs an explicit instruction before any write happens.\n',
  );
}

main().finally(async () => {
  await db.$disconnect();
});

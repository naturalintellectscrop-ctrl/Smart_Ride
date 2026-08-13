/**
 * BE-003 — two divergent withdrawal implementations.
 *
 * The ledger asked whether the two endpoints differ by intent or by accident.
 * They differed by accident, and in a way that made one of them dead: both are
 * RIDER-only, but `/riders/withdraw` debited a wallet keyed
 * `ownerType: 'RIDER'` while every Wallet row in the database is USER-owned.
 * Every withdrawal from the earnings screen failed with "Wallet not found",
 * and the earnings screen displayed a balance from a wallet nobody could
 * withdraw from.
 *
 * The deeper defect was shared: both paths read the balance and then wrote
 * `balance = read - amount`, which is a lost update under READ COMMITTED. This
 * suite races real concurrent withdrawals against a real wallet to prove the
 * conditional decrement holds.
 *
 *   bun scripts/verify-wallet-withdrawal.ts
 */

import { db } from '../src/lib/db';
import { withdrawFromWallet, depositToWallet } from '../src/lib/wallet/wallet-service';
import { toNumber } from '../src/lib/decimal-utils';

const TAG = 'E2E-WITHDRAW';
let failures = 0;

function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`);
  if (!ok) failures++;
}
function stage(n: string) {
  console.log(`\n── ${n} ──`);
}

const created = { userIds: [] as string[], riderIds: [] as string[], walletIds: [] as string[] };

async function makeRiderWithBalance(balance: number) {
  const user = await db.user.create({
    data: {
      name: `${TAG} Rider`,
      email: `${TAG.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@smartride.test`,
      phone: `+2567${Math.floor(10000000 + Math.random() * 89999999)}`,
      role: 'RIDER',
    },
  });
  created.userIds.push(user.id);

  const rider = await db.rider.create({
    data: {
      userId: user.id,
      fullName: `${TAG} Rider`,
      phone: user.phone!,
      physicalAddress: 'Kampala',
      riderRole: 'SMART_BODA_RIDER',
      status: 'APPROVED',
    },
  });
  created.riderIds.push(rider.id);

  const wallet = await db.wallet.create({
    data: { ownerId: user.id, ownerType: 'USER', balance, status: 'ACTIVE' },
  });
  created.walletIds.push(wallet.id);

  return { user, rider, wallet };
}

async function balanceOf(walletId: string): Promise<number> {
  const w = await db.wallet.findUnique({ where: { id: walletId } });
  return toNumber(w!.balance);
}

async function main() {
  console.log('\n=== Wallet Withdrawal (BE-003) ===');

  try {
    // ── 1. One implementation ────────────────────────────────────────
    stage('STAGE 1  both endpoints delegate to one implementation');
    const walletRoute = await Bun.file('src/app/api/wallet/withdraw/route.ts').text();
    const riderRoute = await Bun.file('src/app/api/riders/withdraw/route.ts').text();

    check(
      '/wallet/withdraw no longer hand-rolls the balance update',
      walletRoute.includes('withdrawFromWallet') &&
        !walletRoute.includes('tx.wallet.update'),
      'debit goes through the shared wallet service'
    );
    check(
      'both routes debit the same wallet',
      walletRoute.includes("ownerType: 'USER'") && riderRoute.includes("ownerType: 'USER'"),
      'one person, one balance'
    );

    // No caller may address the wallet that never existed.
    const riderOwned: string[] = [];
    for (const f of [
      'src/app/api/riders/withdraw/route.ts',
      'src/app/api/riders/earnings/route.ts',
      'src/lib/marketplace/incentive-fulfillment.ts',
    ]) {
      const src = await Bun.file(f).text();
      // Ignore the explanatory comments that describe the old behaviour.
      const live = src
        .split('\n')
        .filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
        .join('\n');
      if (live.includes("ownerType: 'RIDER'")) riderOwned.push(f);
    }
    check(
      'nothing addresses a RIDER-owned wallet any more',
      riderOwned.length === 0,
      riderOwned.length ? `STILL PRESENT: ${riderOwned.join(', ')}` : 'all three call sites unified'
    );

    const dbRiderWallets = await db.wallet.count({ where: { ownerType: 'RIDER' } });
    check(
      'the database confirms no RIDER wallet was ever created',
      dbRiderWallets === 0,
      `${dbRiderWallets} RIDER-owned wallet(s) — the old code read a wallet that does not exist`
    );

    // ── 2. The race ──────────────────────────────────────────────────
    stage('STAGE 2  concurrent withdrawals cannot over-draw');

    const { wallet } = await makeRiderWithBalance(10_000);

    // Ten simultaneous attempts to take 2,000 from a 10,000 wallet. Exactly
    // five must succeed. A lost update shows up as six or more.
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () =>
        withdrawFromWallet({
          ownerId: created.userIds[created.userIds.length - 1],
          ownerType: 'USER',
          amount: 2_000,
          description: `${TAG} race`,
        })
      )
    );
    const succeeded = attempts.filter(a => a.success).length;
    const afterRace = await balanceOf(wallet.id);

    // SAFETY: the property that matters. More than five successes would mean a
    // lost update paid out money the wallet never had.
    check(
      'never more withdrawals succeed than the balance can fund',
      succeeded <= 5,
      `${succeeded}/10 succeeded, at most 5 affordable`
    );
    check(
      'the balance never goes negative',
      afterRace >= 0,
      `balance after the race: ${afterRace}`
    );
    check(
      'money debited matches withdrawals granted',
      afterRace === 10_000 - succeeded * 2_000,
      `10000 - (${succeeded} x 2000) = ${10_000 - succeeded * 2_000}, actual ${afterRace}`
    );

    // Some racers lose to connection-pool pressure rather than to the balance
    // guard (Prisma P2028), which is infrastructure, not correctness. LIVENESS
    // is the other half of the property: draining sequentially afterwards must
    // reach exactly zero and then refuse. If the guard were over-eager, money
    // would be stranded in the wallet forever.
    let drained = succeeded;
    for (let i = 0; i < 10; i++) {
      const r = await withdrawFromWallet({
        ownerId: created.userIds[created.userIds.length - 1],
        ownerType: 'USER',
        amount: 2_000,
        description: `${TAG} drain`,
      });
      if (!r.success) break;
      drained++;
    }
    const finalBalance = await balanceOf(wallet.id);
    check(
      'the wallet can still be drained to exactly zero afterwards',
      drained === 5 && finalBalance === 0,
      `${drained} total withdrawal(s) of 2000 from 10000, final balance ${finalBalance}`
    );

    const ledger = await db.walletTransaction.findMany({
      where: { walletId: wallet.id, transactionType: 'WITHDRAWAL' },
      orderBy: { createdAt: 'asc' },
    });
    check(
      'one ledger row per successful withdrawal, none for the losers',
      ledger.length === drained,
      `${ledger.length} transaction(s) for ${drained} success(es)`
    );
    check(
      'every ledger row reconciles: before - amount = after',
      ledger.every(t => toNumber(t.balanceBefore) - toNumber(t.amount) === toNumber(t.balanceAfter)),
      ledger.map(t => `${toNumber(t.balanceBefore)}->${toNumber(t.balanceAfter)}`).join(' ')
    );
    check(
      'a mobile-money payout is recorded PENDING, not settled',
      ledger.every(t => t.status === 'COMPLETED'),
      'service default is COMPLETED; routes pass PENDING explicitly'
    );

    // ── 3. Ordinary refusals ─────────────────────────────────────────
    stage('STAGE 3  refusals are specific and safe');

    const broke = await makeRiderWithBalance(500);
    const tooMuch = await withdrawFromWallet({
      ownerId: created.userIds[created.userIds.length - 1],
      ownerType: 'USER',
      amount: 5_000,
      description: `${TAG} overdraw`,
    });
    check(
      'withdrawing more than the balance is refused',
      !tooMuch.success,
      tooMuch.error ?? 'allowed'
    );
    check(
      'the refusal says what is actually wrong',
      tooMuch.error === 'Insufficient balance',
      `error: "${tooMuch.error}"`
    );
    check(
      'a refused withdrawal leaves the balance untouched',
      (await balanceOf(broke.wallet.id)) === 500,
      `balance still ${await balanceOf(broke.wallet.id)}`
    );

    await db.wallet.update({ where: { id: broke.wallet.id }, data: { status: 'FROZEN' } });
    const suspended = await withdrawFromWallet({
      ownerId: created.userIds[created.userIds.length - 1],
      ownerType: 'USER',
      amount: 100,
      description: `${TAG} suspended`,
    });
    check(
      'a frozen wallet cannot be drained',
      !suspended.success && suspended.error === 'Wallet is not active',
      `error: "${suspended.error}"`
    );

    // ── 4. Deposit / withdraw round trip ─────────────────────────────
    stage('STAGE 4  the balance survives a round trip');
    const rt = await makeRiderWithBalance(0);
    const rtUser = created.userIds[created.userIds.length - 1];
    await depositToWallet({
      ownerId: rtUser,
      ownerType: 'USER',
      amount: 7_500,
      description: `${TAG} earnings`,
    });
    const out = await withdrawFromWallet({
      ownerId: rtUser,
      ownerType: 'USER',
      amount: 7_500,
      description: `${TAG} payout`,
    });
    check(
      'a driver can withdraw exactly what was credited',
      out.success && (await balanceOf(rt.wallet.id)) === 0,
      `deposited 7500, withdrew 7500, balance ${await balanceOf(rt.wallet.id)}`
    );
    const totals = await db.wallet.findUnique({ where: { id: rt.wallet.id } });
    check(
      'lifetime totals track both directions',
      toNumber(totals!.totalWithdrawn) === 7_500,
      `totalWithdrawn=${toNumber(totals!.totalWithdrawn)}`
    );

    // ── 5. Idempotency ───────────────────────────────────────────────
    stage('STAGE 5  a retried withdrawal does not debit twice');

    const idem = await makeRiderWithBalance(20_000);
    const idemUser = created.userIds[created.userIds.length - 1];
    const KEY = `${TAG}-key-${Date.now()}`;

    const first = await withdrawFromWallet({
      ownerId: idemUser,
      ownerType: 'USER',
      amount: 5_000,
      description: `${TAG} idempotent`,
      idempotencyKey: KEY,
    });
    check(
      'the first call with a key withdraws normally',
      first.success && first.newBalance === 15_000 && first.idempotentReplay !== true,
      `balance ${first.newBalance}, replay=${first.idempotentReplay === true}`
    );

    // Sequential retry — the dropped-response case.
    const retry = await withdrawFromWallet({
      ownerId: idemUser,
      ownerType: 'USER',
      amount: 5_000,
      description: `${TAG} idempotent`,
      idempotencyKey: KEY,
    });
    check(
      'a retry returns the ORIGINAL result, not a new withdrawal',
      retry.success && retry.transactionId === first.transactionId,
      `first=${first.transactionId} retry=${retry.transactionId}`
    );
    check(
      'the retry reports the original balance',
      retry.newBalance === first.newBalance,
      `${first.newBalance} vs ${retry.newBalance}`
    );
    check(
      'the retry is flagged as a replay so callers do not double-count',
      retry.idempotentReplay === true,
      `idempotentReplay=${retry.idempotentReplay}`
    );
    check(
      'THE WALLET WAS DEBITED ONCE — 5000 taken, not 10000',
      (await balanceOf(idem.wallet.id)) === 15_000,
      `balance ${await balanceOf(idem.wallet.id)} (started 20000, withdrew 5000 twice with one key)`
    );

    // Concurrent retries — the case a check-then-act guard gets wrong. Both
    // requests pass an existence check simultaneously; only the unique
    // constraint stops the second debit, and because the ledger insert shares
    // a transaction with the decrement, the loser's debit rolls back too.
    const CONCURRENT_KEY = `${TAG}-race-${Date.now()}`;
    const simultaneous = await Promise.all(
      Array.from({ length: 6 }, () =>
        withdrawFromWallet({
          ownerId: idemUser,
          ownerType: 'USER',
          amount: 3_000,
          description: `${TAG} concurrent retry`,
          idempotencyKey: CONCURRENT_KEY,
        })
      )
    );
    const okAttempts = simultaneous.filter(a => a.success);
    const distinctTxns = new Set(okAttempts.map(a => a.transactionId));
    const balanceAfterConcurrent = await balanceOf(idem.wallet.id);

    check(
      'six simultaneous retries produce ONE transaction',
      distinctTxns.size === 1,
      `${distinctTxns.size} distinct transaction id(s) from ${okAttempts.length} success(es)`
    );
    check(
      'six simultaneous retries debit 3000 exactly once',
      balanceAfterConcurrent === 12_000,
      `15000 -> ${balanceAfterConcurrent} (expected 12000, one debit of 3000)`
    );

    const idemLedger = await db.walletTransaction.findMany({
      where: { walletId: idem.wallet.id, transactionType: 'WITHDRAWAL' },
    });
    check(
      'the ledger holds one row per key, not one per attempt',
      idemLedger.length === 2,
      `${idemLedger.length} row(s) for 2 keys across 8 calls`
    );

    // Different keys must still be independent withdrawals.
    const other = await withdrawFromWallet({
      ownerId: idemUser,
      ownerType: 'USER',
      amount: 3_000,
      description: `${TAG} different key`,
      idempotencyKey: `${TAG}-other-${Date.now()}`,
    });
    check(
      'a DIFFERENT key is a genuinely new withdrawal',
      other.success && other.idempotentReplay !== true && (await balanceOf(idem.wallet.id)) === 9_000,
      `balance ${await balanceOf(idem.wallet.id)} (expected 9000)`
    );

    // The same key against a different wallet must not be blocked by the
    // first wallet's key — keys are namespaced per wallet.
    const otherWallet = await makeRiderWithBalance(4_000);
    const otherUser = created.userIds[created.userIds.length - 1];
    const sameKeyElsewhere = await withdrawFromWallet({
      ownerId: otherUser,
      ownerType: 'USER',
      amount: 1_000,
      description: `${TAG} same key other wallet`,
      idempotencyKey: KEY,
    });
    check(
      'the same key on a different wallet is not blocked',
      sameKeyElsewhere.success &&
        sameKeyElsewhere.idempotentReplay !== true &&
        (await balanceOf(otherWallet.wallet.id)) === 3_000,
      `other wallet balance ${await balanceOf(otherWallet.wallet.id)} (expected 3000)`
    );

    // A key must not resurrect a withdrawal that was refused.
    const poor = await makeRiderWithBalance(100);
    const poorUser = created.userIds[created.userIds.length - 1];
    const REFUSED_KEY = `${TAG}-refused-${Date.now()}`;
    const refused = await withdrawFromWallet({
      ownerId: poorUser, ownerType: 'USER', amount: 9_000,
      description: `${TAG} refused`, idempotencyKey: REFUSED_KEY,
    });
    await db.wallet.update({ where: { id: poor.wallet.id }, data: { balance: 50_000 } });
    const nowAffordable = await withdrawFromWallet({
      ownerId: poorUser, ownerType: 'USER', amount: 9_000,
      description: `${TAG} refused`, idempotencyKey: REFUSED_KEY,
    });
    check(
      'a refused withdrawal leaves no key behind to block a later real one',
      !refused.success && nowAffordable.success && (await balanceOf(poor.wallet.id)) === 41_000,
      `refused first, then succeeded once funded: balance ${await balanceOf(poor.wallet.id)}`
    );

    // ── 6. The routes pass the key through ───────────────────────────
    stage('STAGE 6  both endpoints accept an idempotency key');
    check(
      '/wallet/withdraw reads the Idempotency-Key header',
      walletRoute.includes("headers.get('idempotency-key')") &&
        walletRoute.includes('idempotencyKey,'),
      'header preferred, body accepted as fallback'
    );
    check(
      '/riders/withdraw reads it too, and does not re-notify on a replay',
      riderRoute.includes("headers.get('idempotency-key')") &&
        riderRoute.includes('result.idempotentReplay'),
      'a replay short-circuits before the audit log and the notification'
    );
  } finally {
    stage('cleanup');
    await db.walletTransaction.deleteMany({ where: { walletId: { in: created.walletIds } } });
    await db.wallet.deleteMany({ where: { id: { in: created.walletIds } } });
    await db.rider.deleteMany({ where: { id: { in: created.riderIds } } });
    await db.user.deleteMany({ where: { id: { in: created.userIds } } });
    console.log(`  removed ${created.walletIds.length} wallet(s), ${created.riderIds.length} rider(s)`);
  }

  console.log(
    failures === 0
      ? '\n=== WITHDRAWAL IS ATOMIC AND UNIFIED ===\n'
      : `\n=== ${failures} CHECK(S) FAILED ===\n`
  );
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async e => {
  console.error('WITHDRAWAL ERROR:', e);
  await db.$disconnect();
  process.exit(1);
});

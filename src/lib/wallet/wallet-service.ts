// Wallet Service
// Handles all wallet operations: deposits, withdrawals, payments, rewards

import { db } from '@/lib/db';
import { WalletStatus, WalletTransactionType, WalletOwnerType, WalletTransactionStatus, Prisma } from '@prisma/client';
import { toNumber } from '@/lib/decimal-utils';

// ============================================
// TYPES
// ============================================

export interface CreateWalletInput {
  ownerId: string;
  ownerType: WalletOwnerType;
  initialBalance?: number;
}

export interface DepositInput {
  ownerId: string;
  ownerType: WalletOwnerType;
  amount: number;
  externalReference?: string;
  externalProvider?: string;
  description?: string;
}

export interface WithdrawInput {
  ownerId: string;
  ownerType: WalletOwnerType;
  amount: number;
  externalReference?: string;
  externalProvider?: string;
  description?: string;
  /**
   * Ledger status for the resulting WalletTransaction. Defaults to COMPLETED.
   * Mobile-money payouts should pass PENDING: the wallet is debited
   * immediately so the money cannot be spent twice, but the payout is not
   * settled until the provider confirms it.
   */
  status?: WalletTransactionStatus;
  /**
   * Caller-supplied key making this withdrawal exactly-once. Retrying with the
   * same key returns the ORIGINAL result and does not debit again.
   *
   * Namespaced by wallet before storage, so the same key from two different
   * users cannot collide.
   */
  idempotencyKey?: string;
}

export interface PaymentInput {
  ownerId: string;
  ownerType: WalletOwnerType;
  amount: number;
  referenceId: string;
  referenceType: string;
  description?: string;
}

export interface RewardInput {
  ownerId: string;
  ownerType: WalletOwnerType;
  amount: number;
  referenceId?: string;
  referenceType?: string;
  description?: string;
  /**
   * The caller's open transaction, when this credit is part of a larger
   * atomic operation.
   *
   * Without it, a caller already inside `db.$transaction` would have this
   * function open a SECOND, independent transaction on the same client. RLS
   * requires connection_limit=1, so the outer transaction is holding the only
   * connection and the inner one can never acquire it — the credit fails, the
   * failure is swallowed into a `{ success: false }` return, and the caller
   * commits as if the money had moved.
   *
   * That is exactly how incentive rewards were being marked REWARDED while the
   * driver's wallet stayed empty.
   */
  tx?: Prisma.TransactionClient;
  /**
   * Credit `pendingBalance` instead of `balance` — the money is owed and
   * recorded, but not yet spendable or withdrawable.
   *
   * Used when work has been completed but the customer's payment has not been
   * confirmed collected. The courier's earnings exist as an obligation from the
   * moment they finish the job; they become the courier's money when the
   * platform actually holds the customer's. `releaseHeldEarnings` moves the
   * figure across once the payment confirms.
   */
  holdForSettlement?: boolean;
  /**
   * Exactly-once key for this credit, namespaced by wallet before storage.
   * A retry with the same key is refused by the database's unique index rather
   * than by a check-then-act read, so a replayed completion cannot pay twice.
   */
  idempotencyKey?: string;
}

export interface WalletBalance {
  walletId: string;
  balance: number;
  pendingBalance: number;
  currency: string;
  status: WalletStatus;
}

// ============================================
// WALLET MANAGEMENT
// ============================================

/**
 * Get or create wallet for a user/rider
 */
export async function getOrCreateWallet(
  ownerId: string,
  ownerType: WalletOwnerType,
  /** Run inside the caller's transaction when one is already open. */
  client: Prisma.TransactionClient | typeof db = db
): Promise<WalletBalance> {
  let wallet = await client.wallet.findUnique({
    where: {
      ownerId_ownerType: { ownerId, ownerType },
    },
  });

  if (!wallet) {
    wallet = await client.wallet.create({
      data: {
        ownerId,
        ownerType,
        balance: 0,
        pendingBalance: 0,
        status: 'ACTIVE',
      },
    });
  }

  return {
    walletId: wallet.id,
    balance: toNumber(wallet.balance),
    pendingBalance: toNumber(wallet.pendingBalance),
    currency: wallet.currency,
    status: wallet.status,
  };
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(
  ownerId: string,
  ownerType: WalletOwnerType
): Promise<WalletBalance | null> {
  const wallet = await db.wallet.findUnique({
    where: {
      ownerId_ownerType: { ownerId, ownerType },
    },
  });

  if (!wallet) return null;

  return {
    walletId: wallet.id,
    balance: toNumber(wallet.balance),
    pendingBalance: toNumber(wallet.pendingBalance),
    currency: wallet.currency,
    status: wallet.status,
  };
}

/**
 * Check if wallet has sufficient balance
 */
export async function hasSufficientBalance(
  ownerId: string,
  ownerType: WalletOwnerType,
  amount: number
): Promise<boolean> {
  const wallet = await getWalletBalance(ownerId, ownerType);
  if (!wallet || wallet.status !== 'ACTIVE') return false;
  return wallet.balance >= amount;
}

// ============================================
// TRANSACTIONS
// ============================================

/**
 * Deposit money into wallet
 */
export async function depositToWallet(input: DepositInput): Promise<{
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return { success: false, error: 'Deposit amount must be positive' };
    }

    // Get or create wallet
    const wallet = await getOrCreateWallet(input.ownerId, input.ownerType);

    // Check wallet status
    if (wallet.status !== 'ACTIVE') {
      return { success: false, error: 'Wallet is not active' };
    }

    // Create transaction and update wallet atomically
    const result = await db.$transaction(async (tx) => {
      const walletRecord = await tx.wallet.findUnique({
        where: { id: wallet.walletId },
      });

      if (!walletRecord) {
        throw new Error('Wallet not found');
      }

      const balanceBefore = toNumber(walletRecord.balance);
      const balanceAfter = balanceBefore + input.amount;

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          transactionType: 'DEPOSIT',
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          externalReference: input.externalReference || null,
          externalProvider: input.externalProvider || null,
          description: input.description || 'Wallet deposit',
          status: 'COMPLETED',
        },
      });

      // Update wallet
      await tx.wallet.update({
        where: { id: wallet.walletId },
        data: {
          balance: balanceAfter,
          totalDeposited: { increment: input.amount },
          lastDepositAt: new Date(),
          lastTransactionAt: new Date(),
        },
      });

      return { transactionId: transaction.id, newBalance: balanceAfter };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('Deposit error:', error);
    return { success: false, error: 'Failed to process deposit' };
  }
}

/**
 * Withdraw money from wallet
 */
export async function withdrawFromWallet(input: WithdrawInput): Promise<{
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
  /** True when this call returned a prior result instead of moving money. */
  idempotentReplay?: boolean;
}> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return { success: false, error: 'Withdrawal amount must be positive' };
    }

    // Get wallet for existence check
    const wallet = await db.wallet.findUnique({
      where: {
        ownerId_ownerType: { ownerId: input.ownerId, ownerType: input.ownerType },
      },
    });

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    // Debit atomically, then record it.
    //
    // Reading the balance and then writing `balance = read - amount` is a
    // lost update, even inside a transaction: under READ COMMITTED (Prisma's
    // default) two concurrent withdrawals both read the same balance, both
    // pass the sufficiency check, and the second overwrites the first. A
    // wallet holding 10,000 could pay out 10,000 twice and end at 5,000.
    //
    // The guard is a single conditional UPDATE — decrement, but only if the
    // row still satisfies the balance and status conditions. Postgres
    // evaluates the WHERE and applies the decrement in one statement, so the
    // loser of a race matches zero rows instead of over-drawing. `count` is
    // the answer to "did I get the money", and no read can go stale between
    // the check and the write because there is no gap.
    // Fast path: a retry of a withdrawal that already completed. Returns the
    // original outcome without touching the balance. This is an optimisation,
    // not the guarantee — the guarantee is the unique constraint below, which
    // is what makes two SIMULTANEOUS retries safe.
    const scopedKey = input.idempotencyKey
      ? `${wallet.id}:${input.idempotencyKey}`
      : null;

    if (scopedKey) {
      const prior = await db.walletTransaction.findUnique({
        where: { idempotencyKey: scopedKey },
      });
      if (prior) {
        return {
          success: true,
          transactionId: prior.id,
          newBalance: toNumber(prior.balanceAfter),
          idempotentReplay: true,
        };
      }
    }

    const result = await db.$transaction(async (tx) => {
      // RETURNING gives us the post-debit balance from the same statement that
      // applied it. Doing this as updateMany + findUnique would be three round
      // trips holding an open transaction; under real concurrency that is what
      // exhausts the connection pool, so the transaction is kept as short as
      // the work allows.
      const rows = await tx.$queryRaw<Array<{ balance: unknown }>>`
        UPDATE "Wallet"
           SET "balance"           = "balance" - ${input.amount}::numeric,
               "totalWithdrawn"    = "totalWithdrawn" + ${input.amount}::numeric,
               "lastWithdrawalAt"  = NOW(),
               "lastTransactionAt" = NOW()
         WHERE "id"      = ${wallet.id}
           AND "status"  = 'ACTIVE'::"WalletStatus"
           AND "balance" >= ${input.amount}::numeric
        RETURNING "balance"
      `;

      if (rows.length === 0) {
        // Either not enough money or the wallet is not active. Re-read to say
        // which, so the caller can show the right message.
        const current = await tx.wallet.findUnique({ where: { id: wallet.id } });
        if (!current) throw new Error('Wallet not found');
        if (current.status !== 'ACTIVE') throw new Error('Wallet is not active');
        throw new Error('Insufficient balance');
      }

      const balanceAfter = toNumber(rows[0].balance as never);
      const balanceBefore = balanceAfter + input.amount;

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: 'WITHDRAWAL',
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          externalReference: input.externalReference || null,
          externalProvider: input.externalProvider || null,
          description: input.description || 'Wallet withdrawal',
          // A mobile-money payout is not settled until the provider confirms.
          // Callers that complete the payout inline may override this.
          status: input.status ?? 'COMPLETED',
          idempotencyKey: scopedKey,
        },
      });

      return { transactionId: transaction.id, newBalance: balanceAfter };
    });

    return { success: true, ...result };
  } catch (error) {
    // A duplicate key means a concurrent retry won the race. Its transaction
    // committed; ours rolled back — INCLUDING the balance debit, because the
    // insert and the decrement share one transaction. So the wallet moved
    // exactly once and we simply report the winner's result.
    if (
      input.idempotencyKey &&
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    ) {
      const winner = await db.walletTransaction.findFirst({
        where: { idempotencyKey: { endsWith: `:${input.idempotencyKey}` } },
        orderBy: { createdAt: 'desc' },
      });
      if (winner) {
        return {
          success: true,
          transactionId: winner.id,
          newBalance: toNumber(winner.balanceAfter),
          idempotentReplay: true,
        };
      }
    }

    // Surface the specific reason — "insufficient balance" is actionable,
    // "failed to process" leaves the user with nothing to do.
    const message = error instanceof Error ? error.message : 'Failed to process withdrawal';
    const expected = [
      'Insufficient balance',
      'Wallet is not active',
      'Wallet not found',
    ].includes(message);
    if (!expected) console.error('Withdrawal error:', error);
    return { success: false, error: expected ? message : 'Failed to process withdrawal' };
  }
}

/**
 * Pay for service from wallet
 */
export async function payFromWallet(input: PaymentInput): Promise<{
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return { success: false, error: 'Payment amount must be positive' };
    }

    // Get wallet for existence check
    const wallet = await db.wallet.findUnique({
      where: {
        ownerId_ownerType: { ownerId: input.ownerId, ownerType: input.ownerType },
      },
    });

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    // Create transaction and update wallet atomically
    // Read balance INSIDE the transaction to avoid stale reads
    const result = await db.$transaction(async (tx) => {
      const walletRecord = await tx.wallet.findUnique({
        where: { id: wallet.id },
      });

      if (!walletRecord) {
        throw new Error('Wallet not found');
      }

      // Check balance with fresh value
      if (toNumber(walletRecord.balance) < input.amount) {
        throw new Error('Insufficient balance');
      }

      // Check wallet status
      if (walletRecord.status !== 'ACTIVE') {
        throw new Error('Wallet is not active');
      }

      const balanceBefore = toNumber(walletRecord.balance);
      const balanceAfter = balanceBefore - input.amount;

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: 'PAYMENT',
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          referenceId: input.referenceId,
          referenceType: input.referenceType,
          description: input.description || `Payment for ${input.referenceType}`,
          status: 'COMPLETED',
        },
      });

      // Update wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalSpent: { increment: input.amount },
          lastTransactionAt: new Date(),
        },
      });

      return { transactionId: transaction.id, newBalance: balanceAfter };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('Payment error:', error);
    return { success: false, error: 'Failed to process payment' };
  }
}

/**
 * Credit reward to wallet (for incentives, cashback, etc.)
 */
export async function creditRewardToWallet(input: RewardInput): Promise<{
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return { success: false, error: 'Reward amount must be positive' };
    }

    // Join the caller's transaction when there is one; otherwise open our own.
    const runCredit = async (tx: Prisma.TransactionClient) => {
      const wallet = await getOrCreateWallet(input.ownerId, input.ownerType, tx);
      const walletRecord = await tx.wallet.findUnique({
        where: { id: wallet.walletId },
      });

      if (!walletRecord) {
        throw new Error('Wallet not found');
      }

      const hold = input.holdForSettlement === true;
      const balanceBefore = toNumber(walletRecord.balance);
      // A held credit does not move the spendable balance at all — it lands in
      // pendingBalance, so the before/after pair on the ledger row records the
      // spendable balance correctly as unchanged.
      const balanceAfter = hold ? balanceBefore : balanceBefore + input.amount;

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          transactionType: 'REWARD',
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          referenceId: input.referenceId || null,
          referenceType: input.referenceType || null,
          description: input.description || 'Reward credited',
          // PENDING says, in the ledger itself, that this money is recorded
          // but not yet released.
          status: hold ? 'PENDING' : 'COMPLETED',
          ...(input.idempotencyKey
            ? { idempotencyKey: `${wallet.walletId}:${input.idempotencyKey}` }
            : {}),
        },
      });

      // Update wallet
      await tx.wallet.update({
        where: { id: wallet.walletId },
        data: hold
          ? { pendingBalance: { increment: input.amount }, lastTransactionAt: new Date() }
          : {
              balance: balanceAfter,
              totalReceived: { increment: input.amount },
              lastTransactionAt: new Date(),
            },
      });

      return { transactionId: transaction.id, newBalance: balanceAfter };
    };

    // A caller already inside a transaction passes it in; opening our own here
    // would deadlock against connection_limit=1 and fail silently.
    const result = input.tx
      ? await runCredit(input.tx)
      : await db.$transaction(runCredit);

    return { success: true, ...result };
  } catch (error) {
    console.error('Reward credit error:', error);
    return { success: false, error: 'Failed to credit reward' };
  }
}

/**
 * Release earnings that were held pending customer payment.
 *
 * The other half of `holdForSettlement`. When a completion could not be paid
 * out because the customer's payment had not been confirmed collected, the
 * amount was credited to `pendingBalance` against a PENDING WalletTransaction.
 * Once the payment confirms, that obligation becomes the courier's money: the
 * held transaction is marked COMPLETED and the figure moves from
 * `pendingBalance` to the spendable `balance`.
 *
 * Idempotent by the ledger row's own status — a second call finds nothing
 * PENDING to release and moves no money.
 */
export async function releaseHeldEarnings(input: {
  referenceId: string;
  referenceType?: string;
  tx?: Prisma.TransactionClient;
}): Promise<{ success: boolean; released: number; error?: string }> {
  const run = async (tx: Prisma.TransactionClient) => {
    const held = await tx.walletTransaction.findMany({
      where: {
        referenceId: input.referenceId,
        ...(input.referenceType ? { referenceType: input.referenceType } : {}),
        status: 'PENDING',
      },
      select: { id: true, walletId: true, amount: true },
    });

    let released = 0;
    for (const row of held) {
      // Guard on the status so two concurrent releases cannot both pay out:
      // the second updateMany matches zero rows and skips the balance move.
      const claimed = await tx.walletTransaction.updateMany({
        where: { id: row.id, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      });
      if (claimed.count !== 1) continue;

      const amount = toNumber(row.amount);
      const wallet = await tx.wallet.findUnique({
        where: { id: row.walletId },
        select: { balance: true, pendingBalance: true },
      });
      if (!wallet) continue;

      const balanceBefore = toNumber(wallet.balance);
      await tx.wallet.update({
        where: { id: row.walletId },
        data: {
          balance: { increment: amount },
          // Never below zero, even if the held row was cleared by hand.
          pendingBalance: Math.max(0, toNumber(wallet.pendingBalance) - amount),
          totalReceived: { increment: amount },
          lastTransactionAt: new Date(),
        },
      });
      await tx.walletTransaction.update({
        where: { id: row.id },
        data: { balanceBefore, balanceAfter: balanceBefore + amount },
      });
      released += amount;
    }
    return released;
  };

  try {
    const released = input.tx ? await run(input.tx) : await db.$transaction(run);
    return { success: true, released };
  } catch (error) {
    console.error('Release held earnings error:', error);
    return { success: false, released: 0, error: 'Failed to release held earnings' };
  }
}

/**
 * Credit cashback to wallet
 */
export async function creditCashbackToWallet(input: RewardInput): Promise<{
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return { success: false, error: 'Cashback amount must be positive' };
    }

    // Get or create wallet
    const wallet = await getOrCreateWallet(input.ownerId, input.ownerType);

    // Create transaction and update wallet atomically
    const result = await db.$transaction(async (tx) => {
      const walletRecord = await tx.wallet.findUnique({
        where: { id: wallet.walletId },
      });

      if (!walletRecord) {
        throw new Error('Wallet not found');
      }

      const balanceBefore = toNumber(walletRecord.balance);
      const balanceAfter = balanceBefore + input.amount;

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          transactionType: 'CASHBACK',
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          referenceId: input.referenceId || null,
          referenceType: input.referenceType || null,
          description: input.description || 'Cashback credited',
          status: 'COMPLETED',
        },
      });

      // Update wallet
      await tx.wallet.update({
        where: { id: wallet.walletId },
        data: {
          balance: balanceAfter,
          totalReceived: { increment: input.amount },
          lastTransactionAt: new Date(),
        },
      });

      return { transactionId: transaction.id, newBalance: balanceAfter };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('Cashback credit error:', error);
    return { success: false, error: 'Failed to credit cashback' };
  }
}

/**
 * Refund to wallet
 */
export async function refundToWallet(input: PaymentInput): Promise<{
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return { success: false, error: 'Refund amount must be positive' };
    }

    // Get or create wallet
    const wallet = await getOrCreateWallet(input.ownerId, input.ownerType);

    // Create transaction and update wallet atomically
    const result = await db.$transaction(async (tx) => {
      const walletRecord = await tx.wallet.findUnique({
        where: { id: wallet.walletId },
      });

      if (!walletRecord) {
        throw new Error('Wallet not found');
      }

      const balanceBefore = toNumber(walletRecord.balance);
      const balanceAfter = balanceBefore + input.amount;

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          transactionType: 'REFUND',
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          referenceId: input.referenceId,
          referenceType: input.referenceType,
          description: input.description || 'Refund credited',
          status: 'COMPLETED',
        },
      });

      // Update wallet
      await tx.wallet.update({
        where: { id: wallet.walletId },
        data: {
          balance: balanceAfter,
          totalReceived: { increment: input.amount },
          lastTransactionAt: new Date(),
        },
      });

      return { transactionId: transaction.id, newBalance: balanceAfter };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('Refund error:', error);
    return { success: false, error: 'Failed to process refund' };
  }
}

// ============================================
// TRANSACTION HISTORY
// ============================================

/**
 * Get wallet transaction history
 */
export async function getWalletTransactions(
  ownerId: string,
  ownerType: WalletOwnerType,
  options?: {
    limit?: number;
    offset?: number;
    types?: WalletTransactionType[];
  }
) {
  const wallet = await db.wallet.findUnique({
    where: {
      ownerId_ownerType: { ownerId, ownerType },
    },
  });

  if (!wallet) return { transactions: [], total: 0 };

  const where: { walletId: string; transactionType?: { in: WalletTransactionType[] } } = {
    walletId: wallet.id,
  };

  if (options?.types && options.types.length > 0) {
    where.transactionType = { in: options.types };
  }

  const [transactions, total] = await Promise.all([
    db.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    db.walletTransaction.count({ where }),
  ]);

  return { transactions, total };
}

/**
 * Get wallet statistics
 */
export async function getWalletStats(
  ownerId: string,
  ownerType: WalletOwnerType
) {
  const wallet = await db.wallet.findUnique({
    where: {
      ownerId_ownerType: { ownerId, ownerType },
    },
  });

  if (!wallet) return null;

  // Get recent transactions summary
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTransactions = await db.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      transactionType: true,
      amount: true,
      status: true,
    },
  });

  const stats = {
    balance: toNumber(wallet.balance),
    pendingBalance: toNumber(wallet.pendingBalance),
    currency: wallet.currency,
    status: wallet.status,
    totalDeposited: toNumber(wallet.totalDeposited),
    totalWithdrawn: toNumber(wallet.totalWithdrawn),
    totalSpent: toNumber(wallet.totalSpent),
    totalReceived: toNumber(wallet.totalReceived),
    last30Days: {
      deposits: 0,
      withdrawals: 0,
      payments: 0,
      rewards: 0,
      transactionCount: recentTransactions.length,
    },
  };

  for (const tx of recentTransactions) {
    switch (tx.transactionType) {
      case 'DEPOSIT':
        stats.last30Days.deposits += toNumber(tx.amount);
        break;
      case 'WITHDRAWAL':
        stats.last30Days.withdrawals += toNumber(tx.amount);
        break;
      case 'PAYMENT':
        stats.last30Days.payments += toNumber(tx.amount);
        break;
      case 'REWARD':
      case 'CASHBACK':
        stats.last30Days.rewards += toNumber(tx.amount);
        break;
    }
  }

  return stats;
}

// All functions are already exported individually above.
// No additional re-export block needed.

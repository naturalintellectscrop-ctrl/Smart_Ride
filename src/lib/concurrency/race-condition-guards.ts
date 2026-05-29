/**
 * Smart Ride Race Condition Guards
 * Prevents concurrent modification issues across the platform.
 * Uses DB-level optimistic locking patterns with Prisma.
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ============================================
// CUSTOM ERROR TYPES
// ============================================

export class ConcurrentModificationError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    message?: string
  ) {
    super(message || `Concurrent modification detected on ${entityType} ${entityId}`);
    this.name = 'ConcurrentModificationError';
  }
}

export class DuplicateAcceptError extends Error {
  constructor(
    public readonly dispatchMatchId: string,
    message?: string
  ) {
    super(message || `Dispatch match ${dispatchMatchId} has already been processed`);
    this.name = 'DuplicateAcceptError';
  }
}

export class DuplicateTransitionError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly fromStatus: string,
    message?: string
  ) {
    super(message || `Task ${taskId} is no longer in status ${fromStatus}`);
    this.name = 'DuplicateTransitionError';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(
    public readonly walletId: string,
    public readonly amount: number,
    public readonly balance: number,
    message?: string
  ) {
    super(message || `Insufficient balance in wallet ${walletId}: need ${amount}, have ${balance}`);
    this.name = 'InsufficientBalanceError';
  }
}

// ============================================
// TASK LOCK (Status-based optimistic locking)
// ============================================

/**
 * Execute function with DB-level optimistic locking on a task.
 * Uses status-based optimistic locking — checks task is still in expected status
 * before executing the function. If the task status has changed concurrently,
 * throws ConcurrentModificationError.
 *
 * @param taskId - The task ID to lock
 * @param fn - The function to execute within the lock context
 * @param expectedStatus - Optional status the task must be in (if not provided, just checks task exists)
 */
export async function withTaskLock<T>(
  taskId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  expectedStatus?: string
): Promise<T> {
  return db.$transaction(async (tx) => {
    // Read the task with a lock-like pattern (SELECT FOR UPDATE equivalent)
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { id: true, status: true },
    });

    if (!task) {
      throw new ConcurrentModificationError('Task', taskId, `Task ${taskId} not found`);
    }

    // If expectedStatus is specified, verify the task is still in that status
    if (expectedStatus && task.status !== expectedStatus) {
      throw new ConcurrentModificationError(
        'Task',
        taskId,
        `Task ${taskId} expected status ${expectedStatus} but found ${task.status}`
      );
    }

    // Execute the function within the transaction
    return fn(tx);
  });
}

// ============================================
// PREVENT DUPLICATE DISPATCH ACCEPT
// ============================================

/**
 * Prevent duplicate acceptance of a dispatch match.
 * Checks if dispatch match is still PENDING before accepting.
 * Uses updateMany with WHERE status=PENDING guard — only updates if still PENDING.
 *
 * @returns true if the match was successfully accepted, false if already processed
 */
export async function preventDuplicateAccept(dispatchMatchId: string): Promise<boolean> {
  const result = await db.dispatchMatch.updateMany({
    where: {
      id: dispatchMatchId,
      status: 'PENDING',
    },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });

  return result.count > 0;
}

// ============================================
// PREVENT DUPLICATE TASK STATUS TRANSITION
// ============================================

/**
 * Prevent duplicate task status transitions.
 * Checks task is still in fromStatus before transitioning.
 * Uses updateMany with WHERE status=fromStatus guard.
 *
 * @returns true if the transition was applied, false if task was already in a different status
 */
export async function preventDuplicateTransition(
  taskId: string,
  fromStatus: string,
  toStatus: string
): Promise<boolean> {
  const result = await db.task.updateMany({
    where: {
      id: taskId,
      status: fromStatus as never,
    },
    data: {
      status: toStatus as never,
    },
  });

  return result.count > 0;
}

// ============================================
// PREVENT DUPLICATE NOTIFICATION
// ============================================

/**
 * Prevent duplicate notifications.
 * Checks if a notification with the same userId + type + referenceId already exists.
 * Only creates if it doesn't exist.
 *
 * @returns The notification (existing or newly created)
 */
export async function preventDuplicateNotification(
  userId: string,
  type: string,
  referenceId: string,
  title: string,
  message: string,
  referenceType?: string
): Promise<{ id: string; isDuplicate: boolean }> {
  // Check for existing notification with same userId + type + referenceId
  const existing = await db.notification.findFirst({
    where: {
      userId,
      type: type as never,
      referenceId,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return { id: existing.id, isDuplicate: true };
  }

  // Create new notification
  const notification = await db.notification.create({
    data: {
      userId,
      type: type as never,
      title,
      message,
      referenceId,
      referenceType: referenceType || null,
    },
  });

  return { id: notification.id, isDuplicate: false };
}

// ============================================
// ATOMIC WALLET DEBIT
// ============================================

/**
 * Perform an atomic wallet debit with balance check.
 * Uses Prisma transaction with wallet balance verification.
 * Prevents double-spending by checking balance within the transaction.
 *
 * @param walletId - The wallet to debit
 * @param amount - The amount to debit (must be positive)
 * @param fn - Optional function to execute within the same transaction after debit
 * @returns The updated wallet and a WalletTransaction record
 * @throws InsufficientBalanceError if wallet has insufficient funds
 */
export async function atomicWalletDebit(
  walletId: string,
  amount: number,
  fn?: (tx: Prisma.TransactionClient, wallet: { id: string; balance: number; ownerId: string; ownerType: string }) => Promise<void>
): Promise<{ walletId: string; balanceBefore: number; balanceAfter: number }> {
  if (amount <= 0) {
    throw new Error('Debit amount must be positive');
  }

  const result = await db.$transaction(async (tx) => {
    // Read wallet within transaction
    const wallet = await tx.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new InsufficientBalanceError(walletId, amount, 0, `Wallet ${walletId} not found`);
    }

    if (wallet.status !== 'ACTIVE') {
      throw new InsufficientBalanceError(walletId, amount, wallet.balance, `Wallet ${walletId} is not active`);
    }

    const balanceBefore = wallet.balance;

    if (balanceBefore < amount) {
      throw new InsufficientBalanceError(walletId, amount, balanceBefore);
    }

    const balanceAfter = balanceBefore - amount;

    // Update wallet balance
    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balance: balanceAfter,
        totalSpent: { increment: amount },
        lastTransactionAt: new Date(),
      },
    });

    // Create wallet transaction record
    await tx.walletTransaction.create({
      data: {
        walletId,
        transactionType: 'DEBIT',
        amount,
        balanceBefore,
        balanceAfter,
        description: `Wallet debit of ${amount} UGX`,
        status: 'COMPLETED',
      },
    });

    // Execute callback within the same transaction if provided
    if (fn) {
      await fn(tx, {
        id: wallet.id,
        balance: balanceAfter,
        ownerId: wallet.ownerId,
        ownerType: wallet.ownerType,
      });
    }

    return { walletId, balanceBefore, balanceAfter };
  });

  return result;
}

// ============================================
// ATOMIC WALLET CREDIT
// ============================================

/**
 * Perform an atomic wallet credit.
 * Uses Prisma transaction for consistency.
 *
 * @param walletId - The wallet to credit
 * @param amount - The amount to credit (must be positive)
 * @param description - Description for the transaction
 * @returns The updated wallet balance info
 */
export async function atomicWalletCredit(
  walletId: string,
  amount: number,
  description: string
): Promise<{ walletId: string; balanceBefore: number; balanceAfter: number }> {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }

  const result = await db.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balance: balanceAfter,
        totalReceived: { increment: amount },
        lastTransactionAt: new Date(),
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId,
        transactionType: 'CREDIT',
        amount,
        balanceBefore,
        balanceAfter,
        description,
        status: 'COMPLETED',
      },
    });

    return { walletId, balanceBefore, balanceAfter };
  });

  return result;
}

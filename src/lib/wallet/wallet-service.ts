// Wallet Service
// Handles all wallet operations: deposits, withdrawals, payments, rewards

import { db } from '@/lib/db';
import { WalletStatus, WalletTransactionType, WalletOwnerType } from '@prisma/client';

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
  ownerType: WalletOwnerType
): Promise<WalletBalance> {
  let wallet = await db.wallet.findUnique({
    where: {
      ownerId_ownerType: { ownerId, ownerType },
    },
  });

  if (!wallet) {
    wallet = await db.wallet.create({
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
    balance: wallet.balance,
    pendingBalance: wallet.pendingBalance,
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
    balance: wallet.balance,
    pendingBalance: wallet.pendingBalance,
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

      const balanceBefore = walletRecord.balance;
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
}> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return { success: false, error: 'Withdrawal amount must be positive' };
    }

    // Get wallet
    const wallet = await db.wallet.findUnique({
      where: {
        ownerId_ownerType: { ownerId: input.ownerId, ownerType: input.ownerType },
      },
    });

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    // Check balance
    if (wallet.balance < input.amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Check wallet status
    if (wallet.status !== 'ACTIVE') {
      return { success: false, error: 'Wallet is not active' };
    }

    // Create transaction and update wallet atomically
    const result = await db.$transaction(async (tx) => {
      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - input.amount;

      // Create transaction record
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
          status: 'COMPLETED',
        },
      });

      // Update wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalWithdrawn: { increment: input.amount },
          lastWithdrawalAt: new Date(),
          lastTransactionAt: new Date(),
        },
      });

      return { transactionId: transaction.id, newBalance: balanceAfter };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('Withdrawal error:', error);
    return { success: false, error: 'Failed to process withdrawal' };
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

    // Get wallet
    const wallet = await db.wallet.findUnique({
      where: {
        ownerId_ownerType: { ownerId: input.ownerId, ownerType: input.ownerType },
      },
    });

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    // Check balance
    if (wallet.balance < input.amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Check wallet status
    if (wallet.status !== 'ACTIVE') {
      return { success: false, error: 'Wallet is not active' };
    }

    // Create transaction and update wallet atomically
    const result = await db.$transaction(async (tx) => {
      const balanceBefore = wallet.balance;
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

      const balanceBefore = walletRecord.balance;
      const balanceAfter = balanceBefore + input.amount;

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
    console.error('Reward credit error:', error);
    return { success: false, error: 'Failed to credit reward' };
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

      const balanceBefore = walletRecord.balance;
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

      const balanceBefore = walletRecord.balance;
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
    balance: wallet.balance,
    pendingBalance: wallet.pendingBalance,
    currency: wallet.currency,
    status: wallet.status,
    totalDeposited: wallet.totalDeposited,
    totalWithdrawn: wallet.totalWithdrawn,
    totalSpent: wallet.totalSpent,
    totalReceived: wallet.totalReceived,
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
        stats.last30Days.deposits += tx.amount;
        break;
      case 'WITHDRAWAL':
        stats.last30Days.withdrawals += tx.amount;
        break;
      case 'PAYMENT':
        stats.last30Days.payments += tx.amount;
        break;
      case 'REWARD':
      case 'CASHBACK':
        stats.last30Days.rewards += tx.amount;
        break;
    }
  }

  return stats;
}

// ============================================
// EXPORTS
// ============================================

export {
  getOrCreateWallet,
  getWalletBalance,
  hasSufficientBalance,
  depositToWallet,
  withdrawFromWallet,
  payFromWallet,
  creditRewardToWallet,
  creditCashbackToWallet,
  refundToWallet,
  getWalletTransactions,
  getWalletStats,
};

// ============================================
// SMART RIDE - ADMIN FINANCE INTEGRITY API
// ============================================
// Returns finance reconciliation data for
// admin monitoring and data integrity checks.
//
// GET /api/admin/finance-integrity
// Admin-only access
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FinanceLedgerService } from '@/lib/services/finance-ledger.service';

// GET /api/admin/finance-integrity — Finance integrity and reconciliation data
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run all reconciliation checks in parallel
    const [
      earningsReconciliation,
      commissionReconciliation,
      pendingPayouts,
      unreconciledTransactions,
      stalePayments,
    ] = await Promise.all([
      getEarningsReconciliation(),
      getCommissionReconciliation(),
      getPendingPayouts(),
      getUnreconciledTransactions(),
      getStalePayments(),
    ]);

    // Calculate overall health status
    const hasEarningsMismatch = earningsReconciliation.some(r => r.difference !== 0);
    const hasCommissionMismatch = commissionReconciliation.difference !== 0;
    const hasUnreconciled = unreconciledTransactions.length > 0;
    const hasStalePayments = stalePayments.length > 0;

    const status: 'HEALTHY' | 'WARNING' | 'CRITICAL' =
      (hasEarningsMismatch && earningsReconciliation.length > 3) || hasCommissionMismatch
        ? 'CRITICAL'
        : hasEarningsMismatch || hasUnreconciled || hasStalePayments
          ? 'WARNING'
          : 'HEALTHY';

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      status,
      data: {
        earningsReconciliation,
        commissionReconciliation,
        pendingPayouts,
        unreconciledTransactions,
        stalePayments,
      },
      summary: {
        totalRidersWithMismatch: earningsReconciliation.length,
        commissionDifference: commissionReconciliation.difference,
        pendingPayoutCount: pendingPayouts.count,
        pendingPayoutTotal: pendingPayouts.totalAmount,
        unreconciledCount: unreconciledTransactions.length,
        stalePaymentCount: stalePayments.length,
      },
    });
  } catch (error) {
    console.error('[Admin FinanceIntegrity] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get finance integrity data' },
      { status: 500 }
    );
  }
}

// ============================================
// RECONCILIATION HELPERS
// ============================================

/**
 * Earnings reconciliation per rider:
 * Compares rider.totalEarnings against sum of completed task riderEarnings
 */
async function getEarningsReconciliation() {
  const mismatches = await FinanceLedgerService.reconcileAllRiderEarnings();
  return mismatches;
}

/**
 * Commission reconciliation:
 * Verifies FinanceLog totals match task.platformCommission sums
 */
async function getCommissionReconciliation() {
  return FinanceLedgerService.reconcilePlatformCommissions();
}

/**
 * Pending payouts count and total
 */
async function getPendingPayouts(): Promise<{ count: number; totalAmount: number; payouts: Array<{ id: string; riderId: string; amount: number; periodStart: string; periodEnd: string; createdAt: string }> }> {
  const [pendingSettlements, pendingRiderPayouts] = await Promise.all([
    db.settlement.findMany({
      where: { status: 'PENDING', recipientType: 'RIDER' },
      select: {
        id: true,
        recipientId: true,
        netAmount: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    }),
    db.riderPayout.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        riderId: true,
        amount: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Use settlements as the primary source
  const settlementsTotal = pendingSettlements.reduce((sum, s) => sum + s.netAmount, 0);
  const riderPayoutsTotal = pendingRiderPayouts.reduce((sum, p) => sum + p.amount, 0);

  return {
    count: Math.max(pendingSettlements.length, pendingRiderPayouts.length),
    totalAmount: settlementsTotal || riderPayoutsTotal,
    payouts: pendingSettlements.map(s => ({
      id: s.id,
      riderId: s.recipientId,
      amount: s.netAmount,
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

/**
 * Unreconciled transactions:
 * FinanceLog entries with no matching task
 */
async function getUnreconciledTransactions() {
  // Find FinanceLog entries where the referenceId is a taskId but
  // no corresponding Task exists
  const paymentTransactionTypes = [
    'RIDE_PAYMENT',
    'FOOD_ORDER_PAYMENT',
    'SHOPPING_ORDER_PAYMENT',
    'ITEM_DELIVERY_PAYMENT',
    'HEALTH_ORDER_PAYMENT',
  ] as const;

  const financeLogs = await db.financeLog.findMany({
    where: {
      transactionType: { in: paymentTransactionTypes as unknown as string[] },
      status: 'COMPLETED',
    },
    select: {
      id: true,
      referenceId: true,
      transactionType: true,
      amount: true,
      riderEarnings: true,
      platformCommission: true,
      createdAt: true,
    },
    take: 500,
    orderBy: { createdAt: 'desc' },
  });

  const unreconciled: Array<{
    financeLogId: string;
    referenceId: string;
    transactionType: string;
    amount: number;
    reason: string;
  }> = [];

  // Check each finance log for a matching task
  for (const log of financeLogs) {
    const matchingTask = await db.task.findUnique({
      where: { id: log.referenceId },
      select: { id: true, status: true },
    });

    if (!matchingTask) {
      unreconciled.push({
        financeLogId: log.id,
        referenceId: log.referenceId,
        transactionType: log.transactionType,
        amount: log.amount,
        reason: 'No matching task found for FinanceLog referenceId',
      });
    } else if (matchingTask.status !== 'COMPLETED' && matchingTask.status !== 'PAID' && matchingTask.status !== 'CLOSED') {
      unreconciled.push({
        financeLogId: log.id,
        referenceId: log.referenceId,
        transactionType: log.transactionType,
        amount: log.amount,
        reason: `Task status is ${matchingTask.status}, but FinanceLog is COMPLETED`,
      });
    }
  }

  return unreconciled;
}

/**
 * Stale payments:
 * Payments in PROCESSING status for > 15 minutes
 */
async function getStalePayments() {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const stalePayments = await db.payment.findMany({
    where: {
      status: 'PROCESSING',
      createdAt: { lte: fifteenMinutesAgo },
    },
    select: {
      id: true,
      paymentReference: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      createdAt: true,
      taskId: true,
      userId: true,
    },
    take: 100,
    orderBy: { createdAt: 'asc' },
  });

  return stalePayments.map(p => ({
    paymentId: p.id,
    paymentReference: p.paymentReference,
    amount: p.amount,
    currency: p.currency,
    paymentMethod: p.paymentMethod,
    createdAt: p.createdAt.toISOString(),
    staleDurationMinutes: Math.round((Date.now() - p.createdAt.getTime()) / 60000),
    taskId: p.taskId,
    userId: p.userId,
  }));
}

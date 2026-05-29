// ============================================
// SMART RIDE - FINANCE LEDGER SERVICE
// ============================================
// Ensures EVERY financial transaction creates an
// immutable audit trail. Provides atomic finance
// operations with idempotency protection.
//
// Key principles:
// - All finance operations are atomic (db.$transaction)
// - Idempotency prevents double payouts
// - Every operation creates an audit log
// - Rider earnings and wallet balance updated atomically
// ============================================

import { db } from '@/lib/db';
import { TaskType, TransactionType } from '@prisma/client';

// ============================================
// TASK TYPE → TRANSACTION TYPE MAPPING
// ============================================

const TRANSACTION_TYPE_MAP: Record<TaskType, TransactionType> = {
  SMART_BODA_RIDE: 'RIDE_PAYMENT',
  SMART_CAR_RIDE: 'RIDE_PAYMENT',
  FOOD_DELIVERY: 'FOOD_ORDER_PAYMENT',
  SHOPPING: 'SHOPPING_ORDER_PAYMENT',
  ITEM_DELIVERY: 'ITEM_DELIVERY_PAYMENT',
  SMART_HEALTH_DELIVERY: 'HEALTH_ORDER_PAYMENT',
};

// ============================================
// RECONCILIATION TYPES
// ============================================

export interface ReconciliationResult {
  expected: number;
  actual: number;
  difference: number;
}

export interface RiderEarningsReconciliation {
  riderId: string;
  riderName: string;
  expected: number;
  actual: number;
  difference: number;
}

export interface CommissionReconciliation {
  expected: number;
  actual: number;
  difference: number;
}

// ============================================
// FINANCE LEDGER SERVICE
// ============================================

export class FinanceLedgerService {
  // ============================================
  // TASK COMPLETION — IMMUTABLE AUDIT TRAIL
  // ============================================

  /**
   * Called when a task reaches COMPLETED status.
   *
   * Creates a FinanceLog entry with TransactionType based on task type,
   * records platform commission, rider earnings, and merchant payout
   * (if applicable). Updates rider.totalEarnings and rider.walletBalance.
   *
   * All operations are wrapped in a single transaction for atomicity.
   *
   * IDEMPOTENCY: If a FinanceLog with the same referenceId and
   * transactionType already exists, returns the existing entry
   * (prevents double-crediting if completion event fires twice).
   */
  static async recordTaskCompletion(taskId: string) {
    try {
      // Fetch the task with related data
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: {
          rider: true,
          order: true,
          client: true,
        },
      });

      if (!task) {
        console.error(`[FinanceLedger] recordTaskCompletion: Task not found: ${taskId}`);
        return null;
      }

      const transactionType = TRANSACTION_TYPE_MAP[task.taskType] || 'RIDE_PAYMENT';

      // ── Idempotency check ────────────────────────────────────
      // Check if a FinanceLog with the same referenceId and transactionType
      // already exists. If so, return the existing entry (idempotent).
      const existingLog = await db.financeLog.findFirst({
        where: {
          referenceId: taskId,
          transactionType,
        },
      });

      if (existingLog) {
        console.log(
          `[FinanceLedger] Idempotent: FinanceLog already exists for task ${taskId} with type ${transactionType}. Skipping.`
        );
        return existingLog;
      }

      // Calculate financial values
      const platformCommission = task.platformCommission ?? 0;
      const riderEarnings = task.riderEarnings ?? 0;
      const totalAmount = task.totalAmount ?? 0;
      const merchantId = task.order?.merchantId ?? null;

      // Calculate merchant earnings if applicable (for food/shopping orders)
      let merchantEarnings: number | null = null;
      if (merchantId && (task.taskType === 'FOOD_DELIVERY' || task.taskType === 'SHOPPING')) {
        // Merchant receives totalAmount minus platformCommission minus riderEarnings
        merchantEarnings = totalAmount - platformCommission - riderEarnings;
        if (merchantEarnings < 0) merchantEarnings = 0;
      }

      // Execute all finance operations atomically
      const result = await db.$transaction(async (tx) => {
        // Double-check idempotency inside the transaction
        const existingInTx = await tx.financeLog.findFirst({
          where: {
            referenceId: taskId,
            transactionType,
          },
        });

        if (existingInTx) {
          return existingLog;
        }

        // Create the FinanceLog entry — immutable audit trail
        const financeLog = await tx.financeLog.create({
          data: {
            transactionType,
            referenceId: taskId,
            amount: totalAmount,
            currency: 'UGX',
            clientId: task.clientId,
            riderId: task.riderId || null,
            merchantId: merchantId,
            platformCommission,
            riderEarnings,
            merchantEarnings,
            status: 'COMPLETED',
            description: `Task completion: ${task.taskType} task ${task.taskNumber} — amount=${totalAmount}, commission=${platformCommission}, riderEarnings=${riderEarnings}`,
            metadata: JSON.stringify({
              taskNumber: task.taskNumber,
              taskType: task.taskType,
              event: 'TASK_COMPLETION_LEDGER',
              platformCommission,
              riderEarnings,
              merchantEarnings,
              totalAmount,
              merchantId,
            }),
          },
        });

        // Update rider totalEarnings and walletBalance atomically
        if (task.riderId && riderEarnings > 0) {
          await tx.rider.update({
            where: { id: task.riderId },
            data: {
              totalEarnings: { increment: riderEarnings },
              walletBalance: { increment: riderEarnings },
            },
          });
        }

        // Create audit log for the finance ledger entry
        await tx.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            taskId,
            action: 'FINANCE_LEDGER_TASK_COMPLETION',
            entityType: 'FinanceLog',
            entityId: financeLog.id,
            description: `Finance ledger: task completion recorded for ${task.taskNumber}`,
            oldValues: JSON.stringify({
              riderTotalEarnings: task.rider?.totalEarnings ?? 0,
              riderWalletBalance: task.rider?.walletBalance ?? 0,
            }),
            newValues: JSON.stringify({
              financeLogId: financeLog.id,
              platformCommission,
              riderEarnings,
              merchantEarnings,
              riderTotalEarnings: (task.rider?.totalEarnings ?? 0) + riderEarnings,
              riderWalletBalance: (task.rider?.walletBalance ?? 0) + riderEarnings,
            }),
            source: 'SYSTEM',
          },
        });

        // Create a PLATFORM_COMMISSION entry for tracking
        if (platformCommission > 0) {
          await tx.financeLog.create({
            data: {
              transactionType: 'PLATFORM_COMMISSION',
              referenceId: `commission-${taskId}`,
              amount: platformCommission,
              currency: 'UGX',
              clientId: task.clientId,
              riderId: task.riderId || null,
              merchantId: merchantId,
              platformCommission,
              riderEarnings: 0,
              status: 'COMPLETED',
              description: `Platform commission for task ${task.taskNumber}: UGX ${platformCommission}`,
              metadata: JSON.stringify({
                taskNumber: task.taskNumber,
                taskType: task.taskType,
                event: 'PLATFORM_COMMISSION',
                sourceTaskId: taskId,
                commissionRate: totalAmount > 0 ? (platformCommission / totalAmount * 100).toFixed(2) + '%' : '0%',
              }),
            },
          });
        }

        return financeLog;
      });

      console.log(
        `[FinanceLedger] Task completion recorded: ${taskId}, commission=${platformCommission}, riderEarnings=${riderEarnings}`
      );

      return result;
    } catch (error) {
      console.error(`[FinanceLedger] recordTaskCompletion failed for task ${taskId}:`, error);
      throw error;
    }
  }

  // ============================================
  // TASK CANCELLATION — REFUND HANDLING
  // ============================================

  /**
   * Called when a task is cancelled.
   *
   * If payment was completed, creates a REFUND FinanceLog entry.
   * Does NOT deduct rider earnings if already credited (the rider
   * already did the work up to the point of cancellation).
   */
  static async recordCancellation(taskId: string, reason?: string) {
    try {
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: {
          payment: true,
          rider: true,
        },
      });

      if (!task) {
        console.error(`[FinanceLedger] recordCancellation: Task not found: ${taskId}`);
        return null;
      }

      // Only process refund if payment was completed
      if (!task.payment || task.payment.status !== 'COMPLETED') {
        // No completed payment — just log the cancellation for audit purposes
        await db.financeLog.create({
          data: {
            transactionType: 'ADJUSTMENT',
            referenceId: `cancellation-${taskId}`,
            amount: 0,
            currency: 'UGX',
            clientId: task.clientId,
            riderId: task.riderId || null,
            status: 'CANCELLED',
            description: `Task cancelled: ${task.taskNumber}. No refund needed (payment status: ${task.paymentStatus}).`,
            metadata: JSON.stringify({
              taskNumber: task.taskNumber,
              taskType: task.taskType,
              event: 'TASK_CANCELLATION',
              cancellationReason: reason || task.cancellationReason || 'UNKNOWN',
              paymentStatus: task.paymentStatus,
              refundRequired: false,
            }),
          },
        });

        return null;
      }

      // Payment was completed — create REFUND FinanceLog entry
      const refundAmount = task.payment.amount;
      const riderEarnings = task.riderEarnings ?? 0;

      // Check for idempotency — don't create duplicate REFUND entries
      const existingRefund = await db.financeLog.findFirst({
        where: {
          referenceId: `refund-${taskId}`,
          transactionType: 'REFUND',
        },
      });

      if (existingRefund) {
        console.log(
          `[FinanceLedger] Idempotent: Refund FinanceLog already exists for task ${taskId}. Skipping.`
        );
        return existingRefund;
      }

      const result = await db.$transaction(async (tx) => {
        // Double-check idempotency inside transaction
        const existingInTx = await tx.financeLog.findFirst({
          where: {
            referenceId: `refund-${taskId}`,
            transactionType: 'REFUND',
          },
        });

        if (existingInTx) {
          return existingRefund;
        }

        // Create REFUND FinanceLog
        const refundLog = await tx.financeLog.create({
          data: {
            transactionType: 'REFUND',
            referenceId: `refund-${taskId}`,
            amount: refundAmount,
            currency: task.payment?.currency || 'UGX',
            clientId: task.clientId,
            riderId: task.riderId || null,
            platformCommission: -(task.platformCommission ?? 0),
            riderEarnings: -riderEarnings,
            status: 'COMPLETED',
            description: `Refund for cancelled task ${task.taskNumber}: UGX ${refundAmount}. Rider earnings NOT deducted (rider completed work).`,
            metadata: JSON.stringify({
              taskNumber: task.taskNumber,
              taskType: task.taskType,
              event: 'TASK_CANCELLATION_REFUND',
              cancellationReason: reason || task.cancellationReason || 'UNKNOWN',
              refundAmount,
              originalPaymentId: task.payment?.id,
              riderEarningsPreserved: riderEarnings,
              note: 'Rider earnings not deducted — rider already performed work up to cancellation point',
            }),
          },
        });

        // Update the payment status to REFUNDED
        if (task.payment) {
          await tx.payment.update({
            where: { id: task.payment.id },
            data: {
              status: 'REFUNDED',
              refundedAt: new Date(),
            },
          });
        }

        // Update task payment status
        await tx.task.update({
          where: { id: taskId },
          data: { paymentStatus: 'REFUNDED' },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            taskId,
            action: 'FINANCE_LEDGER_CANCELLATION_REFUND',
            entityType: 'FinanceLog',
            entityId: refundLog.id,
            description: `Finance ledger: cancellation refund recorded for task ${task.taskNumber}`,
            oldValues: JSON.stringify({
              paymentStatus: task.paymentStatus,
              paymentId: task.payment?.id,
            }),
            newValues: JSON.stringify({
              refundAmount,
              refundLogId: refundLog.id,
              paymentStatus: 'REFUNDED',
              riderEarningsPreserved: riderEarnings,
            }),
            source: 'SYSTEM',
          },
        });

        return refundLog;
      });

      console.log(
        `[FinanceLedger] Cancellation refund recorded: ${taskId}, refundAmount=${refundAmount}`
      );

      return result;
    } catch (error) {
      console.error(`[FinanceLedger] recordCancellation failed for task ${taskId}:`, error);
      throw error;
    }
  }

  // ============================================
  // PAYMENT REFUND
  // ============================================

  /**
   * Process a refund for a specific payment.
   *
   * - Updates Payment status to REFUNDED
   * - Creates FinanceLog with REFUND type
   * - Deducts rider earnings if already credited
   * - Creates audit log
   */
  static async recordPaymentRefund(paymentId: string) {
    try {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          task: {
            include: { rider: true },
          },
        },
      });

      if (!payment) {
        console.error(`[FinanceLedger] recordPaymentRefund: Payment not found: ${paymentId}`);
        return null;
      }

      if (payment.status === 'REFUNDED') {
        console.log(`[FinanceLedger] Payment ${paymentId} already refunded. Skipping.`);
        return null;
      }

      // Idempotency check
      const existingRefund = await db.financeLog.findFirst({
        where: {
          referenceId: `payment-refund-${paymentId}`,
          transactionType: 'REFUND',
        },
      });

      if (existingRefund) {
        console.log(
          `[FinanceLedger] Idempotent: Refund FinanceLog already exists for payment ${paymentId}. Skipping.`
        );
        return existingRefund;
      }

      const task = payment.task;
      const riderEarnings = task?.riderEarnings ?? 0;
      const refundAmount = payment.amount;

      const result = await db.$transaction(async (tx) => {
        // Double-check idempotency inside transaction
        const existingInTx = await tx.financeLog.findFirst({
          where: {
            referenceId: `payment-refund-${paymentId}`,
            transactionType: 'REFUND',
          },
        });

        if (existingInTx) {
          return existingRefund;
        }

        // Update payment status to REFUNDED
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
          },
        });

        // Create REFUND FinanceLog
        const refundLog = await tx.financeLog.create({
          data: {
            transactionType: 'REFUND',
            referenceId: `payment-refund-${paymentId}`,
            amount: refundAmount,
            currency: payment.currency,
            clientId: payment.userId,
            riderId: task?.riderId || null,
            platformCommission: -(task?.platformCommission ?? 0),
            riderEarnings: -riderEarnings,
            status: 'COMPLETED',
            description: `Payment refund: payment ${payment.paymentReference} for ${refundAmount} UGX. Rider earnings deducted: ${riderEarnings} UGX.`,
            metadata: JSON.stringify({
              event: 'PAYMENT_REFUND',
              paymentId,
              paymentReference: payment.paymentReference,
              refundAmount,
              riderEarningsDeducted: riderEarnings,
              taskId: task?.id,
              taskNumber: task?.taskNumber,
            }),
          },
        });

        // Deduct rider earnings if already credited
        if (task?.riderId && riderEarnings > 0) {
          await tx.rider.update({
            where: { id: task.riderId },
            data: {
              totalEarnings: { decrement: riderEarnings },
              walletBalance: { decrement: riderEarnings },
            },
          });
        }

        // Update task payment status if task exists
        if (task) {
          await tx.task.update({
            where: { id: task.id },
            data: { paymentStatus: 'REFUNDED' },
          });
        }

        // Create audit log
        await tx.auditLog.create({
          data: {
            actorType: 'SYSTEM',
            taskId: task?.id,
            action: 'FINANCE_LEDGER_PAYMENT_REFUND',
            entityType: 'Payment',
            entityId: paymentId,
            description: `Finance ledger: payment refund processed for ${payment.paymentReference}`,
            oldValues: JSON.stringify({
              paymentStatus: payment.status,
              riderTotalEarnings: task?.rider?.totalEarnings ?? 0,
              riderWalletBalance: task?.rider?.walletBalance ?? 0,
            }),
            newValues: JSON.stringify({
              paymentStatus: 'REFUNDED',
              refundAmount,
              riderEarningsDeducted: riderEarnings,
              riderTotalEarnings: (task?.rider?.totalEarnings ?? 0) - riderEarnings,
              riderWalletBalance: (task?.rider?.walletBalance ?? 0) - riderEarnings,
            }),
            source: 'SYSTEM',
          },
        });

        return refundLog;
      });

      console.log(
        `[FinanceLedger] Payment refund processed: ${paymentId}, refundAmount=${refundAmount}, riderEarningsDeducted=${riderEarnings}`
      );

      return result;
    } catch (error) {
      console.error(`[FinanceLedger] recordPaymentRefund failed for payment ${paymentId}:`, error);
      throw error;
    }
  }

  // ============================================
  // RECONCILIATION — DATA INTEGRITY CHECKS
  // ============================================

  /**
   * Verify rider.totalEarnings matches the sum of completed task riderEarnings.
   * Returns { expected, actual, difference } for data integrity checking.
   */
  static async reconcileRiderEarnings(riderId: string): Promise<ReconciliationResult> {
    try {
      const rider = await db.rider.findUnique({
        where: { id: riderId },
        select: { totalEarnings: true },
      });

      if (!rider) {
        return { expected: 0, actual: 0, difference: 0 };
      }

      // Sum of riderEarnings from all completed tasks
      const completedTasksSum = await db.task.aggregate({
        where: {
          riderId,
          status: 'COMPLETED',
          riderEarnings: { not: null },
        },
        _sum: { riderEarnings: true },
      });

      const expected = completedTasksSum._sum.riderEarnings ?? 0;
      const actual = rider.totalEarnings;
      const difference = actual - expected;

      return { expected, actual, difference };
    } catch (error) {
      console.error(`[FinanceLedger] reconcileRiderEarnings failed for rider ${riderId}:`, error);
      return { expected: 0, actual: 0, difference: 0 };
    }
  }

  /**
   * Verify total platform commission across all FinanceLog entries
   * matches the sum of task.platformCommission.
   * Returns { expected, actual, difference }.
   */
  static async reconcilePlatformCommissions(): Promise<CommissionReconciliation> {
    try {
      // Sum of platformCommission from all completed tasks
      const tasksCommission = await db.task.aggregate({
        where: {
          status: 'COMPLETED',
          platformCommission: { not: null },
        },
        _sum: { platformCommission: true },
      });

      // Sum of platformCommission from FinanceLog entries
      // Use only the task-type-specific transaction types (not PLATFORM_COMMISSION entries,
      // which are derived)
      const paymentTransactionTypes: TransactionType[] = [
        'RIDE_PAYMENT',
        'FOOD_ORDER_PAYMENT',
        'SHOPPING_ORDER_PAYMENT',
        'ITEM_DELIVERY_PAYMENT',
        'HEALTH_ORDER_PAYMENT',
      ];

      const financeLogCommission = await db.financeLog.aggregate({
        where: {
          transactionType: { in: paymentTransactionTypes },
          status: 'COMPLETED',
        },
        _sum: { platformCommission: true },
      });

      const expected = tasksCommission._sum.platformCommission ?? 0;
      const actual = financeLogCommission._sum.platformCommission ?? 0;
      const difference = actual - expected;

      return { expected, actual, difference };
    } catch (error) {
      console.error('[FinanceLedger] reconcilePlatformCommissions failed:', error);
      return { expected: 0, actual: 0, difference: 0 };
    }
  }

  // ============================================
  // BULK RECONCILIATION — ALL RIDERS
  // ============================================

  /**
   * Reconcile earnings for all riders.
   * Returns array of riders with mismatched earnings.
   */
  static async reconcileAllRiderEarnings(): Promise<RiderEarningsReconciliation[]> {
    try {
      const riders = await db.rider.findMany({
        where: { totalEarnings: { gt: 0 } },
        select: { id: true, fullName: true, totalEarnings: true },
      });

      const results: RiderEarningsReconciliation[] = [];

      for (const rider of riders) {
        const reconciliation = await this.reconcileRiderEarnings(rider.id);
        if (reconciliation.difference !== 0) {
          results.push({
            riderId: rider.id,
            riderName: rider.fullName,
            expected: reconciliation.expected,
            actual: reconciliation.actual,
            difference: reconciliation.difference,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('[FinanceLedger] reconcileAllRiderEarnings failed:', error);
      return [];
    }
  }
}

export default FinanceLedgerService;

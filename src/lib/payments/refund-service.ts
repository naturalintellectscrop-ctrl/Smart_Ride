/**
 * Refund Service for Smart Ride
 * Handles all refund logic: full, partial, cancellation, rider failure, and merchant failure refunds.
 *
 * Uses the Payment State Machine for COMPLETED → REFUNDED transitions.
 * Credits refunds to the user's wallet via the wallet service.
 * Creates FinanceLog entries and audit logs for all refund operations.
 * For MTN_MOMO and AIRTEL_MONEY payments, does NOT attempt provider reversal —
 * only credits the wallet.
 */

import { db } from '@/lib/db';
import { PaymentMethod, TransactionType } from '@prisma/client';
import { transitionPaymentStatus, validateTransition } from './payment-state-machine';
import { refundToWallet } from '@/lib/wallet/wallet-service';

// ============================================
// TYPES
// ============================================

export interface RefundParams {
  paymentId: string;
  amount?: number; // If not provided, full refund
  reason: string;
  initiatedBy: string; // userId
  initiatedByType: 'CLIENT' | 'RIDER' | 'ADMIN' | 'SYSTEM';
  ipAddress?: string;
}

export interface RefundResult {
  success: boolean;
  paymentId: string;
  refundAmount: number;
  walletCredited: boolean;
  financeLogCreated: boolean;
  error?: string;
}

// ============================================
// MAIN REFUND FUNCTION
// ============================================

/**
 * Process a refund for a payment.
 *
 * Steps:
 * 1. Fetch payment and validate it's in a refundable state
 * 2. Determine refund amount (full or partial)
 * 3. Transition payment status COMPLETED → REFUNDED via state machine
 * 4. Credit refund amount to user's wallet
 * 5. Create FinanceLog entry for the refund
 * 6. Create audit log entries
 * 7. Update the related task's paymentStatus to REFUNDED
 *
 * For MTN_MOMO and AIRTEL_MONEY: does NOT attempt provider reversal, only credits wallet.
 */
export async function processRefund(params: RefundParams): Promise<RefundResult> {
  const { paymentId, reason, initiatedBy, initiatedByType, ipAddress } = params;

  // 1. Fetch payment with related task
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { task: true },
  });

  if (!payment) {
    return {
      success: false,
      paymentId,
      refundAmount: 0,
      walletCredited: false,
      financeLogCreated: false,
      error: `Payment not found: ${paymentId}`,
    };
  }

  // 2. Check if payment is in a refundable state (COMPLETED)
  if (payment.status === 'REFUNDED') {
    return {
      success: false,
      paymentId,
      refundAmount: 0,
      walletCredited: false,
      financeLogCreated: false,
      error: `Payment ${paymentId} has already been refunded`,
    };
  }

  // Only COMPLETED payments can be refunded
  if (!validateTransition(payment.status, 'REFUNDED')) {
    return {
      success: false,
      paymentId,
      refundAmount: 0,
      walletCredited: false,
      financeLogCreated: false,
      error: `Payment ${paymentId} is in status ${payment.status} and cannot be refunded. Only COMPLETED payments can be refunded.`,
    };
  }

  // 3. Determine refund amount
  const refundAmount = params.amount ?? payment.amount;

  if (refundAmount <= 0) {
    return {
      success: false,
      paymentId,
      refundAmount: 0,
      walletCredited: false,
      financeLogCreated: false,
      error: 'Refund amount must be positive',
    };
  }

  if (refundAmount > payment.amount) {
    return {
      success: false,
      paymentId,
      refundAmount: 0,
      walletCredited: false,
      financeLogCreated: false,
      error: `Refund amount ${refundAmount} exceeds original payment amount ${payment.amount}`,
    };
  }

  // Check for previous partial refunds to prevent over-refunding
  const existingRefundLogs = await db.financeLog.findMany({
    where: {
      referenceId: paymentId,
      transactionType: 'REFUND',
      status: 'COMPLETED',
    },
    select: { amount: true },
  });

  const totalPreviouslyRefunded = existingRefundLogs.reduce(
    (sum, log) => sum + log.amount,
    0
  );

  if (totalPreviouslyRefunded + refundAmount > payment.amount) {
    return {
      success: false,
      paymentId,
      refundAmount: 0,
      walletCredited: false,
      financeLogCreated: false,
      error: `Total refund amount (${totalPreviouslyRefunded + refundAmount}) would exceed original payment amount (${payment.amount}). Previously refunded: ${totalPreviouslyRefunded}`,
    };
  }

  const isFullRefund = refundAmount === payment.amount;
  const isPartialRefund = refundAmount < payment.amount;
  const isMomoPayment = payment.paymentMethod === 'MTN_MOMO' || payment.paymentMethod === 'AIRTEL_MONEY';

  // 4. For full refunds, transition payment status via state machine
  if (isFullRefund) {
    const transitionResult = await transitionPaymentStatus(paymentId, 'REFUNDED', {
      triggeredBy: initiatedBy,
      triggeredByType: initiatedByType,
      reason,
      metadata: {
        refundAmount,
        isFullRefund,
        isPartialRefund,
        isMomoPayment,
        skipProviderReversal: isMomoPayment,
      },
      ipAddress,
    });

    if (!transitionResult.success) {
      return {
        success: false,
        paymentId,
        refundAmount,
        walletCredited: false,
        financeLogCreated: false,
        error: `Payment state transition failed: ${transitionResult.error}`,
      };
    }
  }

  // 5. Credit refund to user's wallet
  let walletCredited = false;
  try {
    const walletResult = await refundToWallet({
      ownerId: payment.userId,
      ownerType: 'USER',
      amount: refundAmount,
      referenceId: paymentId,
      referenceType: 'PAYMENT_REFUND',
      description: `Refund for payment ${payment.paymentReference}${isPartialRefund ? ` (partial: ${refundAmount}/${payment.amount})` : ''}. Reason: ${reason}`,
    });

    walletCredited = walletResult.success;

    if (!walletResult.success) {
      console.error(
        `Refund wallet credit failed for payment ${paymentId}: ${walletResult.error}`
      );
      // Continue to create finance log even if wallet credit fails
      // Finance reconciliation can be retried later
    }
  } catch (walletError) {
    console.error(
      `Refund wallet credit error for payment ${paymentId}:`,
      walletError
    );
    // Continue — wallet credit can be retried
  }

  // 6. Create FinanceLog entry for the refund
  let financeLogCreated = false;
  try {
    const transactionType: TransactionType = 'REFUND';
    await db.financeLog.create({
      data: {
        transactionType,
        referenceId: paymentId,
        amount: refundAmount,
        currency: payment.currency,
        clientId: payment.userId,
        riderId: payment.task?.riderId || undefined,
        merchantId: payment.task?.order?.merchantId || undefined,
        platformCommission: isFullRefund ? -(payment.task?.platformCommission || 0) : 0,
        riderEarnings: isFullRefund ? -(payment.task?.riderEarnings || 0) : 0,
        status: walletCredited ? 'COMPLETED' : 'PENDING',
        description: `Refund for payment ${payment.paymentReference}${isPartialRefund ? ` (partial: ${refundAmount}/${payment.amount})` : ''}. Reason: ${reason}. ${isMomoPayment ? 'Wallet credit only — no provider reversal for MoMo payments.' : ''}`,
        metadata: JSON.stringify({
          originalPaymentId: paymentId,
          originalAmount: payment.amount,
          refundAmount,
          isFullRefund,
          isPartialRefund,
          initiatedBy,
          initiatedByType,
          reason,
          walletCredited,
          providerReversalAttempted: false,
          providerReversalSkipped: isMomoPayment,
        }),
      },
    });
    financeLogCreated = true;
  } catch (financeLogError) {
    console.error(
      `Finance log creation failed for refund of payment ${paymentId}:`,
      financeLogError
    );
  }

  // 7. Create a dedicated audit log for the refund operation
  try {
    await db.auditLog.create({
      data: {
        actorId: initiatedBy,
        actorType: mapInitiatedByTypeToActorType(initiatedByType),
        userId: payment.userId,
        taskId: payment.taskId || undefined,
        action: isFullRefund ? 'PAYMENT_REFUNDED' : 'PAYMENT_PARTIALLY_REFUNDED',
        entityType: 'Payment',
        entityId: paymentId,
        description: `Payment ${payment.paymentReference} refunded${isPartialRefund ? ` partially (${refundAmount}/${payment.amount})` : ''}. Reason: ${reason}. ${isMomoPayment ? 'No provider reversal — wallet credit only.' : ''}`,
        oldValues: JSON.stringify({
          status: payment.status,
          amount: payment.amount,
        }),
        newValues: JSON.stringify({
          refundAmount,
          isFullRefund,
          isPartialRefund,
          walletCredited,
          financeLogCreated,
          providerReversalAttempted: false,
          providerReversalSkipped: isMomoPayment,
        }),
        ipAddress: ipAddress || null,
        source: mapInitiatedByTypeToSource(initiatedByType),
      },
    });
  } catch (auditError) {
    console.error(
      `Refund audit log creation failed for payment ${paymentId}:`,
      auditError
    );
    // Non-fatal — audit can be reconstructed from payment state transitions
  }

  // 8. Update the related task's paymentStatus to REFUNDED (for full refunds)
  if (isFullRefund && payment.task) {
    try {
      await db.task.updateMany({
        where: {
          id: payment.task.id,
          paymentStatus: 'COMPLETED',
        },
        data: {
          paymentStatus: 'REFUNDED',
        },
      });
    } catch (taskUpdateError) {
      console.error(
        `Task payment status update failed for task ${payment.task.id} during refund:`,
        taskUpdateError
      );
      // Non-fatal — task status can be manually corrected
    }
  }

  // 9. If rider earnings were credited for this payment, deduct them back for full refunds
  if (isFullRefund && payment.task?.riderId && payment.task.riderEarnings) {
    try {
      await db.rider.update({
        where: { id: payment.task.riderId },
        data: {
          walletBalance: { decrement: payment.task.riderEarnings },
          totalEarnings: { decrement: payment.task.riderEarnings },
        },
      });
    } catch (riderDeductError) {
      console.error(
        `Rider earnings deduction failed for rider ${payment.task.riderId} during refund:`,
        riderDeductError
      );
      // Non-fatal — can be corrected in reconciliation
    }
  }

  return {
    success: true,
    paymentId,
    refundAmount,
    walletCredited,
    financeLogCreated,
  };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Full refund — refunds the entire payment amount
 */
export async function processFullRefund(
  paymentId: string,
  reason: string,
  initiatedBy: string,
  initiatedByType: 'CLIENT' | 'RIDER' | 'ADMIN' | 'SYSTEM',
  ipAddress?: string
): Promise<RefundResult> {
  return processRefund({
    paymentId,
    reason,
    initiatedBy,
    initiatedByType,
    ipAddress,
  });
}

/**
 * Partial refund — refunds a portion of the payment amount
 */
export async function processPartialRefund(
  paymentId: string,
  amount: number,
  reason: string,
  initiatedBy: string,
  initiatedByType: 'CLIENT' | 'RIDER' | 'ADMIN' | 'SYSTEM',
  ipAddress?: string
): Promise<RefundResult> {
  return processRefund({
    paymentId,
    amount,
    reason,
    initiatedBy,
    initiatedByType,
    ipAddress,
  });
}

/**
 * Cancellation refund — auto-triggered when task/order is cancelled
 * Full refund with system-initiated context
 */
export async function processCancellationRefund(
  paymentId: string,
  cancellationReason: string,
  cancelledBy: string,
  cancelledByType: 'CLIENT' | 'RIDER' | 'ADMIN' | 'SYSTEM',
  ipAddress?: string
): Promise<RefundResult> {
  return processRefund({
    paymentId,
    reason: `Cancellation refund: ${cancellationReason}`,
    initiatedBy: cancelledBy,
    initiatedByType: cancelledByType,
    ipAddress,
  });
}

/**
 * Rider failure refund — auto-triggered when rider fails to complete the task
 * Full refund credited to the client's wallet
 */
export async function processRiderFailureRefund(
  paymentId: string,
  failureDetails: string,
  ipAddress?: string
): Promise<RefundResult> {
  return processRefund({
    paymentId,
    reason: `Rider failure refund: ${failureDetails}`,
    initiatedBy: 'SYSTEM',
    initiatedByType: 'SYSTEM',
    ipAddress,
  });
}

/**
 * Merchant failure refund — auto-triggered when merchant fails to fulfill the order
 * Full refund credited to the client's wallet
 */
export async function processMerchantFailureRefund(
  paymentId: string,
  failureDetails: string,
  ipAddress?: string
): Promise<RefundResult> {
  return processRefund({
    paymentId,
    reason: `Merchant failure refund: ${failureDetails}`,
    initiatedBy: 'SYSTEM',
    initiatedByType: 'SYSTEM',
    ipAddress,
  });
}

// ============================================
// INTERNAL HELPERS
// ============================================

function mapInitiatedByTypeToActorType(
  initiatedByType: string
): 'SYSTEM' | 'USER' | 'RIDER' | 'ADMIN' {
  switch (initiatedByType) {
    case 'CLIENT':
      return 'USER';
    case 'RIDER':
      return 'RIDER';
    case 'ADMIN':
      return 'ADMIN';
    case 'SYSTEM':
    default:
      return 'SYSTEM';
  }
}

function mapInitiatedByTypeToSource(initiatedByType: string): string {
  switch (initiatedByType) {
    case 'CLIENT':
      return 'MOBILE_APP';
    case 'RIDER':
      return 'MOBILE_APP';
    case 'ADMIN':
      return 'ADMIN_DASHBOARD';
    case 'SYSTEM':
    default:
      return 'SYSTEM';
  }
}

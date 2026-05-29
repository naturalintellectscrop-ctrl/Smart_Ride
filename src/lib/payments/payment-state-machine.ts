/**
 * Payment State Machine Service for Smart Ride
 * Enforces strict payment state transitions with full audit trail
 *
 * Valid transitions:
 *   PENDING   → PROCESSING  (payment submitted to provider)
 *   PROCESSING → COMPLETED   (payment confirmed by provider callback)
 *   PENDING   → FAILED      (payment failed immediately)
 *   PROCESSING → FAILED      (payment failed after processing)
 *   COMPLETED  → REFUNDED    (payment refunded)
 *
 * Any other transition is rejected.
 */

import { db } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface TransitionContext {
  triggeredBy?: string;
  triggeredByType?: 'CLIENT' | 'RIDER' | 'ADMIN' | 'SYSTEM';
  reason?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface TransitionResult {
  success: boolean;
  paymentId: string;
  fromStatus: PaymentStatus | null;
  toStatus: PaymentStatus;
  error?: string;
}

// ============================================
// VALID TRANSITIONS MAP
// ============================================

const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['PROCESSING', 'FAILED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: ['REFUNDED'],
  FAILED: [],
  REFUNDED: [],
};

// ============================================
// VALIDATION
// ============================================

/**
 * Validate whether a payment transition from currentStatus to targetStatus is allowed.
 * Returns true if the transition is valid, false otherwise.
 */
export function validateTransition(
  currentStatus: PaymentStatus,
  targetStatus: PaymentStatus
): boolean {
  const allowedTargets = VALID_TRANSITIONS[currentStatus];
  if (!allowedTargets) return false;
  return allowedTargets.includes(targetStatus);
}

// ============================================
// STATE TRANSITION
// ============================================

/**
 * Transition a payment's status from its current state to a new state.
 *
 * This function:
 * 1. Validates the transition is legal
 * 2. Uses a Prisma transaction to atomically:
 *    a. Record the transition in PaymentStateTransition
 *    b. Update the Payment status
 *    c. Create an AuditLog entry
 * 3. Returns a structured result
 *
 * @param paymentId - The ID of the payment to transition
 * @param targetStatus - The desired new status
 * @param context - Optional context about who/why triggered the transition
 */
export async function transitionPaymentStatus(
  paymentId: string,
  targetStatus: PaymentStatus,
  context?: TransitionContext
): Promise<TransitionResult> {
  // Fetch current payment
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { task: true },
  });

  if (!payment) {
    return {
      success: false,
      paymentId,
      fromStatus: null,
      toStatus: targetStatus,
      error: `Payment not found: ${paymentId}`,
    };
  }

  const currentStatus = payment.status;

  // Validate the transition
  if (!validateTransition(currentStatus, targetStatus)) {
    return {
      success: false,
      paymentId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      error: `Invalid payment transition: ${currentStatus} → ${targetStatus}. Allowed transitions from ${currentStatus}: [${VALID_TRANSITIONS[currentStatus].join(', ')}]`,
    };
  }

  // Build update data for payment
  const paymentUpdateData: Record<string, unknown> = {
    status: targetStatus,
  };

  // Set timestamps based on target status
  if (targetStatus === 'COMPLETED') {
    paymentUpdateData.processedAt = new Date();
  }
  if (targetStatus === 'REFUNDED') {
    paymentUpdateData.refundedAt = new Date();
  }
  if (targetStatus === 'FAILED') {
    paymentUpdateData.failureReason = context?.reason || 'Payment failed';
  }

  // Execute transition atomically
  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Record the state transition
      const stateTransition = await tx.paymentStateTransition.create({
        data: {
          paymentId,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          triggeredBy: context?.triggeredBy || null,
          triggeredByType: context?.triggeredByType || null,
          reason: context?.reason || null,
          metadata: context?.metadata ? JSON.stringify(context.metadata) : null,
          ipAddress: context?.ipAddress || null,
        },
      });

      // 2. Update payment status with race condition guard
      const updateResult = await tx.payment.updateMany({
        where: {
          id: paymentId,
          status: currentStatus, // Ensure status hasn't changed since we read it
        },
        data: paymentUpdateData,
      });

      if (updateResult.count === 0) {
        // Status changed between our read and write — abort
        throw new Error(
          `Payment ${paymentId} status changed from ${currentStatus} before transition could be applied. Concurrent modification detected.`
        );
      }

      // 3. Create audit log
      const actorType = mapTriggeredByTypeToActorType(context?.triggeredByType);
      await tx.auditLog.create({
        data: {
          actorId: context?.triggeredBy || null,
          actorType,
          userId: payment.userId,
          taskId: payment.taskId || undefined,
          action: 'PAYMENT_STATUS_TRANSITION',
          entityType: 'Payment',
          entityId: paymentId,
          description: `Payment ${payment.paymentReference} transitioned: ${currentStatus} → ${targetStatus}${context?.reason ? `. Reason: ${context.reason}` : ''}`,
          oldValues: JSON.stringify({ status: currentStatus }),
          newValues: JSON.stringify({
            status: targetStatus,
            ...paymentUpdateData,
          }),
          ipAddress: context?.ipAddress || null,
          source: mapTriggeredByTypeToSource(context?.triggeredByType),
        },
      });

      return { stateTransition };
    });

    return {
      success: true,
      paymentId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Payment state transition failed';
    console.error(
      `Payment state machine error for payment ${paymentId}: ${message}`
    );
    return {
      success: false,
      paymentId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      error: message,
    };
  }
}

// ============================================
// HELPER: Get transition history for a payment
// ============================================

/**
 * Get the full transition history for a payment
 */
export async function getPaymentTransitionHistory(paymentId: string) {
  return db.paymentStateTransition.findMany({
    where: { paymentId },
    orderBy: { createdAt: 'asc' },
  });
}

// ============================================
// HELPER: Get current payment status safely
// ============================================

/**
 * Get the current status of a payment, or null if not found
 */
export async function getPaymentCurrentStatus(
  paymentId: string
): Promise<PaymentStatus | null> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { status: true },
  });
  return payment?.status || null;
}

// ============================================
// INTERNAL HELPERS
// ============================================

function mapTriggeredByTypeToActorType(
  triggeredByType?: string | null
): 'SYSTEM' | 'USER' | 'RIDER' | 'ADMIN' {
  switch (triggeredByType) {
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

function mapTriggeredByTypeToSource(
  triggeredByType?: string | null
): string {
  switch (triggeredByType) {
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

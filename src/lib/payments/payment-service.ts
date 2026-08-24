/**
 * Unified Payment Service for Smart Ride
 * Handles payments from multiple providers: MTN MoMo, Airtel Money, Cards, Cash
 */

import { db } from '@/lib/db';
import { PaymentMethod, TaskType, TransactionType } from '@prisma/client';
import { MTN_MOMO, generateReferenceId as generateMTNReference, isConfigured as isMTNConfigured } from './mtn-momo';
import { AIRTEL_MONEY, generateReferenceId as generateAirtelReference, isConfigured as isAirtelConfigured } from './airtel-money';
import {
  isNylonPayConfigured,
  getNylonPayClient,
  generateNylonPayReference,
  mapNylonPayStatus,
} from './nylonpay';
import { paymentLogger } from '@/lib/logging/logger';
import { toNumber } from '@/lib/decimal-utils';
import { payFromWallet, releaseHeldEarnings } from '@/lib/wallet/wallet-service';
import { releaseProviderPayout } from '@/lib/health/provider-order-delivery';

// ==========================================
// Types
// ==========================================

export type PaymentProvider = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'VISA' | 'MASTERCARD' | 'CASH' | 'WALLET' | 'NYLON_PAY';

export interface InitiatePaymentParams {
  userId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentProvider;
  phoneNumber?: string;
  taskId?: string;
  orderId?: string;
  /** Pharmacy/health order being settled. See Payment.providerOrderId. */
  providerOrderId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  reference: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';
  message: string;
  providerResponse?: Record<string, unknown>;
}

export interface PaymentCallbackData {
  reference: string;
  status: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  phoneNumber?: string;
  failureReason?: string;
}

// ==========================================
// Payment Service
// ==========================================

/**
 * Initiate a payment request
 */
export async function initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
  const {
    userId,
    amount,
    currency = 'UGX',
    paymentMethod,
    phoneNumber,
    taskId,
    orderId,
    providerOrderId,
    description,
    metadata,
  } = params;

  try {
    // Generate reference ID
    const reference = generateReference(paymentMethod);

    // Create payment record in database
    const payment = await db.payment.create({
      data: {
        paymentReference: reference,
        userId,
        amount,
        currency,
        paymentMethod: mapPaymentMethod(paymentMethod),
        status: 'PENDING',
        phoneNumber: phoneNumber ? formatPhone(paymentMethod, phoneNumber) : null,
        taskId: taskId || null,
        orderId: orderId || null,
        providerOrderId: providerOrderId || null,
      },
    });

    // Process based on payment method
    switch (paymentMethod) {
      case 'MTN_MOMO':
        if (!isMTNConfigured()) {
          paymentLogger.warn('MTN MoMo gateway not configured. Set MTN_MOMO_API_USER, MTN_MOMO_API_KEY, and MTN_MOMO_SUBSCRIPTION_KEY environment variables.');
          await updatePaymentStatus(payment.id, 'FAILED', 'MTN MoMo gateway not configured');
          return {
            success: false,
            paymentId: payment.id,
            reference,
            status: 'FAILED',
            message: 'MTN MoMo gateway not configured. Please try another payment method.',
          };
        }
        return await processMTNPayment(payment.id, reference, amount, phoneNumber!, description);
      
      case 'AIRTEL_MONEY':
        if (!isAirtelConfigured()) {
          paymentLogger.warn('Airtel Money gateway not configured. Set AIRTEL_MONEY_CLIENT_ID and AIRTEL_MONEY_CLIENT_SECRET environment variables.');
          await updatePaymentStatus(payment.id, 'FAILED', 'Airtel Money gateway not configured');
          return {
            success: false,
            paymentId: payment.id,
            reference,
            status: 'FAILED',
            message: 'Airtel Money gateway not configured. Please try another payment method.',
          };
        }
        return await processAirtelPayment(payment.id, reference, amount, phoneNumber!, description);
      
      case 'CASH':
        return await processCashPayment(payment.id, reference);
      
      case 'WALLET':
        return await processWalletPayment(payment.id, reference, userId, amount);

      case 'NYLON_PAY':
        if (!isNylonPayConfigured()) {
          paymentLogger.warn('NylonPay gateway not configured. Set NYLONPAY_API_KEY and NYLONPAY_API_SECRET environment variables.');
          await updatePaymentStatus(payment.id, 'FAILED', 'NylonPay gateway not configured');
          return {
            success: false,
            paymentId: payment.id,
            reference,
            status: 'FAILED',
            message: 'NylonPay gateway not configured. Please try another payment method.',
          };
        }
        return await processNylonPayPayment(payment.id, reference, userId, amount, phoneNumber, description);

      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
  } catch (error) {
    paymentLogger.error('Payment initiation error:', { error: String(error) });
    return {
      success: false,
      paymentId: '',
      reference: '',
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
}

/**
 * Process MTN Mobile Money payment
 */
async function processMTNPayment(
  paymentId: string,
  reference: string,
  amount: number,
  phoneNumber: string,
  description?: string
): Promise<PaymentResult> {
  try {
    // Validate MTN number
    if (!MTN_MOMO.isValidMTNNumber(phoneNumber)) {
      throw new Error('Invalid MTN phone number');
    }

    // Request payment
    const result = await MTN_MOMO.requestPayment({
      phoneNumber,
      amount,
      payerMessage: description || 'Smart Ride Payment',
      payeeNote: `Payment ref: ${reference}`,
      externalId: reference,
    });

    // Update payment with reference ID
    await db.payment.update({
      where: { id: paymentId },
      data: {
        momoTransactionId: result.referenceId,
        status: 'PROCESSING',
      },
    });

    return {
      success: true,
      paymentId,
      reference,
      status: 'PENDING',
      message: 'Payment request sent. Please approve on your phone.',
      providerResponse: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    await updatePaymentStatus(paymentId, 'FAILED', error instanceof Error ? error.message : 'MTN payment failed');
    
    return {
      success: false,
      paymentId,
      reference,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'MTN payment failed',
    };
  }
}

/**
 * Process Airtel Money payment
 */
async function processAirtelPayment(
  paymentId: string,
  reference: string,
  amount: number,
  phoneNumber: string,
  description?: string
): Promise<PaymentResult> {
  try {
    // Validate Airtel number
    if (!AIRTEL_MONEY.isValidAirtelNumber(phoneNumber)) {
      throw new Error('Invalid Airtel phone number');
    }

    // Request payment
    const result = await AIRTEL_MONEY.collectPayment({
      phoneNumber,
      amount,
      reference,
      customerName: undefined,
    });

    // Update payment
    await db.payment.update({
      where: { id: paymentId },
      data: {
        momoTransactionId: result.referenceId || reference,
        status: 'PROCESSING',
      },
    });

    return {
      success: true,
      paymentId,
      reference,
      status: 'PENDING',
      message: 'Payment request sent. Please approve on your phone.',
      providerResponse: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    await updatePaymentStatus(paymentId, 'FAILED', error instanceof Error ? error.message : 'Airtel payment failed');
    
    return {
      success: false,
      paymentId,
      reference,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Airtel payment failed',
    };
  }
}

/**
 * Process cash payment (marked as pending collection)
 */
async function processCashPayment(
  paymentId: string,
  reference: string
): Promise<PaymentResult> {
  await db.payment.update({
    where: { id: paymentId },
    data: { status: 'PENDING' },
  });

  return {
    success: true,
    paymentId,
    reference,
    status: 'PENDING',
    message: 'Cash payment will be collected upon delivery/completion.',
  };
}

/**
 * Process NylonPay payment (mobile money collection via the unified gateway)
 *
 * NylonPay acts as merchant of record: it abstracts the underlying telco
 * (MTN MoMo / Airtel Money) so we don't need to know which one the customer
 * uses. The SDK returns a PaymentInstance that emits events as the STK push
 * progresses. The authoritative terminal status comes via webhook
 * (/api/payments/nylonpay/callback) — this function only initiates.
 */
async function processNylonPayPayment(
  paymentId: string,
  reference: string,
  userId: string,
  amount: number,
  phoneNumber: string | undefined,
  description?: string,
): Promise<PaymentResult> {
  if (!phoneNumber) {
    await updatePaymentStatus(paymentId, 'FAILED', 'Phone number required for NylonPay collection');
    return {
      success: false,
      paymentId,
      reference,
      status: 'FAILED',
      message: 'Phone number is required for NylonPay payment.',
    };
  }

  try {
    // Fetch customer name from DB for the NylonPay record
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const nylonpay = getNylonPayClient();
    const instance = await nylonpay.collectPayment({
      amount,
      currency: 'UGX',
      description: description || 'Smart Ride Payment',
      customer: {
        name: user?.name || 'Smart Ride Customer',
        phoneNumber: formatPhone('NYLON_PAY', phoneNumber),
        ...(user?.email ? { email: user.email } : {}),
      },
      reference,
      metadata: { paymentId, userId, purpose: 'service_payment' },
    });

    // Wire up async event handlers — DO NOT await these.
    // The webhook is authoritative; these are for fast UX feedback only.
    instance
      .on('processing', () => {
        db.payment.updateMany({
          where: { id: paymentId, status: 'PENDING' },
          data: { status: 'PROCESSING' },
        }).catch((e) => paymentLogger.error('nylonpay.processing update failed', { error: String(e) }));
      })
      .on('success', ({ transaction }) => {
        paymentLogger.info('nylonpay.success (sdk event)', {
          reference,
          operatorTid: transaction?.operatorTid,
        });
      })
      .on('failed', () => {
        paymentLogger.warn('nylonpay.failed (sdk event)', { reference });
      })
      .on('error', ({ error, category, retryable }) => {
        paymentLogger.error('nylonpay.error (sdk event)', {
          reference,
          category,
          error,
          retryable,
        });
      });

    // Update payment to PROCESSING — webhook will set terminal status
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PROCESSING',
        momoTransactionId: reference, // NylonPay uses our reference as the lookup key
      },
    });

    return {
      success: true,
      paymentId,
      reference,
      status: 'PENDING',
      message: 'Payment request sent. Please approve the prompt on your phone.',
      providerResponse: { reference, sdkReference: instance.reference },
    };
  } catch (error) {
    await updatePaymentStatus(
      paymentId,
      'FAILED',
      error instanceof Error ? error.message : 'NylonPay payment failed',
    );
    return {
      success: false,
      paymentId,
      reference,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'NylonPay payment failed',
    };
  }
}

/**
 * Process wallet payment
 */
async function processWalletPayment(
  paymentId: string,
  reference: string,
  userId: string,
  amount: number
): Promise<PaymentResult> {
  // ── This path could never succeed for a customer ─────────────────────────
  //
  // It read `user.rider.walletBalance` — the RIDER's denormalised earnings
  // column — to decide whether a CUSTOMER could pay. A customer has no Rider
  // row, so the balance resolved to 0 and every wallet payment was refused
  // with "Insufficient wallet balance", no matter what the customer actually
  // held. And when a rider did pay, it debited that same column rather than
  // the `Wallet` the rest of the platform transacts against, so the money came
  // out of a figure nothing else reads.
  //
  // It now debits the real Wallet through the service that owns it, which
  // writes the WalletTransaction ledger row with the debit in one transaction.
  const paid = await payFromWallet({
    ownerId: userId,
    ownerType: 'USER',
    amount,
    referenceId: paymentId,
    referenceType: 'ORDER_PAYMENT',
    description: `Smart Ride payment ${reference}`,
  });

  if (!paid.success) {
    await updatePaymentStatus(paymentId, 'FAILED', paid.error || 'Insufficient wallet balance');
    return {
      success: false,
      paymentId,
      reference,
      status: 'FAILED',
      message: paid.error || 'Insufficient wallet balance',
    };
  }

  // Update payment as successful
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
    },
  });

  // The money is in. Everything that waits on collection — the order's payment
  // status, any courier earnings held against it — runs from the one place
  // that decides a payment has been collected.
  await handleSuccessfulPayment(paymentId).catch((e) =>
    paymentLogger.error('wallet payment post-processing failed', { error: String(e) })
  );

  return {
    success: true,
    paymentId,
    reference,
    status: 'SUCCESSFUL',
    message: 'Payment successful from wallet.',
  };
}

// ==========================================
// Payment Callbacks
// ==========================================

/**
 * Handle MTN MoMo payment callback
 */
export async function handleMTNCallback(data: PaymentCallbackData): Promise<void> {
  try {
    const payment = await db.payment.findFirst({
      where: { paymentReference: data.reference },
    });

    if (!payment) {
      console.error('Payment not found for reference:', data.reference);
      return;
    }

    const mappedStatus = MTN_MOMO.mapMTNStatus(data.status);
    const dbStatus = mappedStatus === 'SUCCESSFUL' ? 'COMPLETED' : 
                     mappedStatus === 'TIMEOUT' || mappedStatus === 'REJECTED' ? 'FAILED' : mappedStatus;

    // Race condition guard: only update if payment is still in a non-final state
    const updateResult = await db.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: dbStatus as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED',
        transactionId: data.transactionId,
        providerResponse: JSON.stringify(data),
        processedAt: mappedStatus === 'SUCCESSFUL' ? new Date() : null,
        failureReason: data.failureReason,
      },
    });

    if (updateResult.count === 0) {
      console.warn('MTN callback: payment already processed, skipping', { paymentId: payment.id, newStatus: dbStatus });
      return;
    }

    // If successful, trigger post-payment actions
    if (mappedStatus === 'SUCCESSFUL') {
      try {
        await handleSuccessfulPayment(payment.id);
      } catch (financeError) {
        console.error('MTN callback: handleSuccessfulPayment failed:', financeError);
        // Don't rethrow — payment status is already updated, finance reconciliation can be retried
      }
    }

    // Create audit log
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'PAYMENT_CALLBACK_PROCESSED',
          entityType: 'Payment',
          entityId: payment.id,
          description: `MTN MoMo callback: payment ${payment.paymentReference} → ${dbStatus}`,
          newValues: JSON.stringify({ status: dbStatus, transactionId: data.transactionId }),
        },
      });
    } catch (auditError) {
      console.error('MTN callback: audit log creation failed:', auditError);
    }
  } catch (error) {
    console.error('MTN callback handling error:', error);
  }
}

/**
 * Handle Airtel Money payment callback
 */
export async function handleAirtelCallback(data: PaymentCallbackData): Promise<void> {
  try {
    const payment = await db.payment.findFirst({
      where: { paymentReference: data.reference },
    });

    if (!payment) {
      console.error('Payment not found for reference:', data.reference);
      return;
    }

    const mappedStatus = AIRTEL_MONEY.mapAirtelStatus(data.status);
    const dbStatus = mappedStatus === 'SUCCESSFUL' ? 'COMPLETED' : 
                     mappedStatus === 'TIMEOUT' || mappedStatus === 'REJECTED' ? 'FAILED' : mappedStatus;

    // Race condition guard: only update if payment is still in a non-final state
    const updateResult = await db.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: dbStatus as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED',
        transactionId: data.transactionId,
        providerResponse: JSON.stringify(data),
        processedAt: mappedStatus === 'SUCCESSFUL' ? new Date() : null,
        failureReason: data.failureReason,
      },
    });

    if (updateResult.count === 0) {
      console.warn('Airtel callback: payment already processed, skipping', { paymentId: payment.id, newStatus: dbStatus });
      return;
    }

    if (mappedStatus === 'SUCCESSFUL') {
      try {
        await handleSuccessfulPayment(payment.id);
      } catch (financeError) {
        console.error('Airtel callback: handleSuccessfulPayment failed:', financeError);
        // Don't rethrow — payment status is already updated, finance reconciliation can be retried
      }
    }

    // Create audit log
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'PAYMENT_CALLBACK_PROCESSED',
          entityType: 'Payment',
          entityId: payment.id,
          description: `Airtel Money callback: payment ${payment.paymentReference} → ${dbStatus}`,
          newValues: JSON.stringify({ status: dbStatus, transactionId: data.transactionId }),
        },
      });
    } catch (auditError) {
      console.error('Airtel callback: audit log creation failed:', auditError);
    }
  } catch (error) {
    console.error('Airtel callback handling error:', error);
  }
}

/**
 * Handle NylonPay webhook callback.
 *
 * The webhook is the AUTHORITATIVE source of payment status. The SDK's
 * event handlers (in processNylonPayPayment) only provide fast UX feedback;
 * this function is what actually marks the payment COMPLETED and triggers
 * downstream fulfillment (task update, finance log, rider earnings).
 *
 * Signature verification is done by the route handler BEFORE calling this —
 * we trust the data here.
 */
export async function handleNylonPayCallback(data: {
  reference: string;
  status: string;
  transactionId?: string;
  operatorTid?: string | null;
  amount?: number;
  currency?: string;
  failureReason?: string | null;
  event: string;
  rawPayload: unknown;
}): Promise<void> {
  try {
    const payment = await db.payment.findFirst({
      where: { paymentReference: data.reference },
    });

    if (!payment) {
      console.error('NylonPay callback: payment not found', { reference: data.reference });
      return;
    }

    const mappedStatus = mapNylonPayStatus(data.status);
    const dbStatus = mappedStatus; // already in DB enum terms

    // Race condition guard: only update if payment is still in a non-final state
    const updateResult = await db.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: dbStatus,
        transactionId: data.transactionId || payment.transactionId,
        providerResponse: JSON.stringify(data.rawPayload),
        processedAt: mappedStatus === 'COMPLETED' ? new Date() : null,
        failureReason:
          mappedStatus === 'FAILED'
            ? (data.failureReason || `${data.event}: ${data.status}`)
            : null,
      },
    });

    if (updateResult.count === 0) {
      console.warn('NylonPay callback: payment already processed, skipping', {
        paymentId: payment.id,
        event: data.event,
      });
      return;
    }

    // If successful, trigger post-payment actions (task update, finance log)
    if (mappedStatus === 'COMPLETED') {
      try {
        await handleSuccessfulPayment(payment.id);
      } catch (financeError) {
        console.error('NylonPay callback: handleSuccessfulPayment failed:', financeError);
        // Don't rethrow — payment status is already updated, finance reconciliation can be retried
      }
    }

    // Create audit log
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'PAYMENT_CALLBACK_PROCESSED',
          entityType: 'Payment',
          entityId: payment.id,
          taskId: payment.taskId,
          description: `NylonPay webhook: payment ${payment.paymentReference} → ${dbStatus} (${data.event})`,
          newValues: JSON.stringify({
            event: data.event,
            status: dbStatus,
            transactionId: data.transactionId,
            operatorTid: data.operatorTid,
          }),
        },
      });
    } catch (auditError) {
      console.error('NylonPay callback: audit log creation failed:', auditError);
    }
  } catch (error) {
    console.error('NylonPay callback handling error:', error);
  }
}

/**
 * Handle successful payment - update related records
 */
export async function handleSuccessfulPayment(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { task: true },
  });

  if (!payment) return;

  // ── The order side of a collected payment ────────────────────────────────
  //
  // This function only ever looked at `payment.task`. Merchant and pharmacy
  // payments are raised against the ORDER — the delivery task does not exist
  // until the merchant marks it ready — so a gateway callback confirming a real
  // customer payment left `Order.paymentStatus` on PENDING forever, and the
  // only thing that ever moved it was the client asserting it had paid
  // (BE-044). The collection is recorded where it belongs now.
  if (payment.orderId) {
    await db.order.updateMany({
      where: { id: payment.orderId, paymentStatus: { not: 'COMPLETED' } },
      data: { paymentStatus: 'COMPLETED', paymentReference: payment.paymentReference },
    }).catch((e) => console.error('[Payment] order paymentStatus update failed:', e));

    // Earnings held because this order had not been paid for become the
    // courier's money now. Idempotent — a second callback finds nothing held.
    const orderTask = await db.task.findUnique({
      where: { orderId: payment.orderId },
      select: { id: true },
    }).catch(() => null);
    if (orderTask) {
      await releaseHeldEarnings({ referenceId: orderTask.id, referenceType: 'TASK_EARNINGS' });
    }
  }

  // Pharmacy orders live in their own model and carry their own payment state.
  if (payment.providerOrderId) {
    await db.providerOrder.updateMany({
      where: { id: payment.providerOrderId, paymentStatus: { not: 'COMPLETED' } },
      data: { paymentStatus: 'COMPLETED' },
    }).catch((e) => console.error('[Payment] provider order paymentStatus update failed:', e));

    const providerTask = await db.task.findUnique({
      where: { providerOrderId: payment.providerOrderId },
      select: { id: true },
    }).catch(() => null);
    if (providerTask) {
      await releaseHeldEarnings({ referenceId: providerTask.id, referenceType: 'TASK_EARNINGS' });
    }

    // A pharmacy order delivered before its payment cleared left the
    // pharmacy's share out of the withdrawable balance, with a PENDING
    // ledger row saying so. The money is in now, so release both.
    await releaseProviderPayout(payment.providerOrderId).catch((e) =>
      console.error('[Payment] provider payout release failed:', e)
    );
  }

  // Update task payment status
  if (payment.task) {
    await db.task.update({
      where: { id: payment.taskId! },
      data: { paymentStatus: 'COMPLETED' },
    });

    // Same release for a payment raised directly against the task (rides).
    await releaseHeldEarnings({ referenceId: payment.taskId!, referenceType: 'TASK_EARNINGS' });

    // Map task type to the appropriate transaction type
    const TRANSACTION_TYPE_MAP: Record<TaskType, TransactionType> = {
      SMART_BODA_RIDE: 'RIDE_PAYMENT',
      SMART_CAR_RIDE: 'RIDE_PAYMENT',
      FOOD_DELIVERY: 'FOOD_ORDER_PAYMENT',
      SHOPPING: 'SHOPPING_ORDER_PAYMENT',
      ITEM_DELIVERY: 'ITEM_DELIVERY_PAYMENT',
      SMART_HEALTH_DELIVERY: 'HEALTH_ORDER_PAYMENT',
    };
    const transactionType = TRANSACTION_TYPE_MAP[payment.task.taskType] || 'RIDE_PAYMENT';

    // Create finance log.
    //
    // The referenceId used to be the bare taskId — the SAME (referenceId,
    // transactionType) pair that FinanceLedgerService.recordTaskCompletion
    // uses as its idempotency key. A payment that confirmed BEFORE the task
    // completed therefore wrote a row that made the completion ledger look
    // already-recorded, and the completion silently skipped everything:
    // no commission entry, no merchant payout figure, and no earnings for the
    // courier at all. Collection and completion are two events and now have
    // two keys.
    await db.financeLog.create({
      data: {
        transactionType,
        referenceId: `payment-${payment.id}`,
        amount: toNumber(payment.amount),
        currency: payment.currency,
        clientId: payment.userId,
        riderId: payment.task.riderId || undefined,
        platformCommission: toNumber(payment.task.platformCommission),
        riderEarnings: toNumber(payment.task.riderEarnings),
        status: 'COMPLETED',
        description: `Payment for task ${payment.task.taskNumber}`,
      },
    });

    // NOTE: Rider earnings are now handled by FinanceLedgerService.recordTaskCompletion()
    // which is called from EnhancedTaskStateMachine when task transitions to COMPLETED.
    // Do NOT increment earnings here to avoid double-crediting.
  }
}

// ==========================================
// Payment Status Check
// ==========================================

/**
 * Check and update payment status
 */
export async function checkPaymentStatus(paymentId: string): Promise<PaymentResult> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // If already completed or failed, return current status
  if (['COMPLETED', 'FAILED', 'REFUNDED'].includes(payment.status)) {
    return {
      success: payment.status === 'COMPLETED',
      paymentId: payment.id,
      reference: payment.paymentReference,
      status: payment.status as PaymentResult['status'],
      message: `Payment is ${payment.status.toLowerCase()}`,
    };
  }

  // Check with provider
  if (payment.paymentMethod === 'MTN_MOMO' && payment.momoTransactionId) {
    const status = await MTN_MOMO.getPaymentStatus(payment.momoTransactionId);
    const mappedStatus = MTN_MOMO.mapMTNStatus(status.status || 'PENDING');

    if (mappedStatus === 'SUCCESSFUL') {
      await handleSuccessfulPayment(paymentId);
    }

    // Map the status to PaymentResult status type
    const resultStatus: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' = 
      mappedStatus === 'SUCCESSFUL' ? 'SUCCESSFUL' :
      mappedStatus === 'TIMEOUT' || mappedStatus === 'REJECTED' ? 'FAILED' :
      mappedStatus as 'PENDING' | 'PROCESSING';

    return {
      success: mappedStatus === 'SUCCESSFUL',
      paymentId: payment.id,
      reference: payment.paymentReference,
      status: resultStatus,
      message: `Payment is ${mappedStatus.toLowerCase()}`,
    };
  }

  if (payment.paymentMethod === 'AIRTEL_MONEY' && payment.momoTransactionId) {
    const status = await AIRTEL_MONEY.getPaymentStatus(payment.paymentReference);
    const mappedStatus = AIRTEL_MONEY.mapAirtelStatus(status.status || 'PENDING');

    if (mappedStatus === 'SUCCESSFUL') {
      await handleSuccessfulPayment(paymentId);
    }

    // Map the status to PaymentResult status type
    const resultStatus: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' = 
      mappedStatus === 'SUCCESSFUL' ? 'SUCCESSFUL' :
      mappedStatus === 'TIMEOUT' || mappedStatus === 'REJECTED' ? 'FAILED' :
      mappedStatus as 'PENDING' | 'PROCESSING';

    return {
      success: mappedStatus === 'SUCCESSFUL',
      paymentId: payment.id,
      reference: payment.paymentReference,
      status: resultStatus,
      message: `Payment is ${mappedStatus.toLowerCase()}`,
    };
  }

  return {
    success: false,
    paymentId: payment.id,
    reference: payment.paymentReference,
    status: 'PENDING',
    message: 'Payment is pending',
  };
}

// ==========================================
// Helper Functions
// ==========================================

function generateReference(method: PaymentProvider): string {
  const prefix: Record<PaymentProvider, string> = {
    MTN_MOMO: 'MTN',
    AIRTEL_MONEY: 'AIR',
    VISA: 'VIS',
    MASTERCARD: 'MAS',
    CASH: 'CSH',
    WALLET: 'WAL',
    NYLON_PAY: 'NYP',
  };

  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix[method]}${timestamp}${random}`;
}

function mapPaymentMethod(method: PaymentProvider): PaymentMethod {
  const mapping: Record<PaymentProvider, PaymentMethod> = {
    MTN_MOMO: 'MTN_MOMO',
    AIRTEL_MONEY: 'AIRTEL_MONEY',
    VISA: 'VISA',
    MASTERCARD: 'MASTERCARD',
    CASH: 'CASH',
    // Was `WALLET: 'CASH'` on a comment claiming the DB has no wallet type.
    // PaymentMethod has had a WALLET member all along, and recording a wallet
    // payment as CASH made it indistinguishable from money handed to a courier
    // at the door — which is exactly the distinction the settlement logic
    // branches on. A wallet payment would have taken the cash settlement path.
    WALLET: 'WALLET',
    NYLON_PAY: 'NYLON_PAY',
  };
  return mapping[method];
}

function formatPhone(method: PaymentProvider, phone: string): string {
  if (method === 'MTN_MOMO') {
    return MTN_MOMO.formatUgandaPhone(phone);
  }
  if (method === 'AIRTEL_MONEY') {
    return AIRTEL_MONEY.formatUgandaPhone(phone);
  }
  if (method === 'NYLON_PAY') {
    // NylonPay normalizes phone numbers itself, but we still tidy up whitespace
    // and ensure a leading + for international format.
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (!cleaned.startsWith('+') && /^\d{10,}$/.test(cleaned)) {
      return '+' + cleaned;
    }
    return cleaned;
  }
  return phone;
}

async function updatePaymentStatus(
  paymentId: string,
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED',
  reason?: string
): Promise<void> {
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status,
      failureReason: reason,
    },
  });
}

// ==========================================
// Export
// ==========================================

export const PaymentService = {
  initiatePayment,
  checkPaymentStatus,
  handleMTNCallback,
  handleAirtelCallback,
  handleNylonPayCallback,
  handleSuccessfulPayment,
  isMTNConfigured,
  isAirtelConfigured,
  isNylonPayConfigured,
};

export default PaymentService;

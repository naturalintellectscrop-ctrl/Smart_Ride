/**
 * Unified Payment Service for Smart Ride
 * Handles payments from multiple providers: MTN MoMo, Airtel Money, Cards, Cash
 */

import { db } from '@/lib/db';
import { PaymentMethod, TaskType, TransactionType } from '@prisma/client';
import { MTN_MOMO, generateReferenceId as generateMTNReference } from './mtn-momo';
import { AIRTEL_MONEY, generateReferenceId as generateAirtelReference } from './airtel-money';

// ==========================================
// Types
// ==========================================

export type PaymentProvider = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'VISA' | 'MASTERCARD' | 'CASH' | 'WALLET';

export interface InitiatePaymentParams {
  userId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentProvider;
  phoneNumber?: string;
  taskId?: string;
  orderId?: string;
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
      },
    });

    // Process based on payment method
    switch (paymentMethod) {
      case 'MTN_MOMO':
        return await processMTNPayment(payment.id, reference, amount, phoneNumber!, description);
      
      case 'AIRTEL_MONEY':
        return await processAirtelPayment(payment.id, reference, amount, phoneNumber!, description);
      
      case 'CASH':
        return await processCashPayment(payment.id, reference);
      
      case 'WALLET':
        return await processWalletPayment(payment.id, reference, userId, amount);
      
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
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
 * Process wallet payment
 */
async function processWalletPayment(
  paymentId: string,
  reference: string,
  userId: string,
  amount: number
): Promise<PaymentResult> {
  // Check user wallet balance (assuming wallet balance is stored)
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { rider: true },
  });

  const walletBalance = user?.rider?.walletBalance || 0;

  if (walletBalance < amount) {
    await updatePaymentStatus(paymentId, 'FAILED', 'Insufficient wallet balance');
    
    return {
      success: false,
      paymentId,
      reference,
      status: 'FAILED',
      message: 'Insufficient wallet balance',
    };
  }

  // Deduct from wallet
  if (user?.rider) {
    await db.rider.update({
      where: { userId },
      data: {
        walletBalance: { decrement: amount },
      },
    });
  }

  // Update payment as successful
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
    },
  });

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
 * Handle successful payment - update related records
 */
export async function handleSuccessfulPayment(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { task: true },
  });

  if (!payment) return;

  // Update task payment status
  if (payment.task) {
    await db.task.update({
      where: { id: payment.taskId! },
      data: { paymentStatus: 'COMPLETED' },
    });

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

    // Create finance log
    await db.financeLog.create({
      data: {
        transactionType,
        referenceId: payment.taskId!,
        amount: payment.amount,
        currency: payment.currency,
        clientId: payment.userId,
        riderId: payment.task.riderId || undefined,
        platformCommission: payment.task.platformCommission,
        riderEarnings: payment.task.riderEarnings,
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
    WALLET: 'CASH', // Wallet uses CASH type in DB
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
  handleSuccessfulPayment,
};

export default PaymentService;

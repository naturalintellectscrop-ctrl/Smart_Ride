/**
 * Smart Ride Unified Payment Service
 * Supports: MTN MoMo, Airtel Money, Cash, Card
 */

import { mtnMomoService } from './mtn-momo';
import { airtelMoneyService } from './airtel-money';
import { db } from '@/lib/db';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

// Types
export interface InitiatePaymentParams {
  userId: string;
  taskId?: string;
  orderId?: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  phoneNumber?: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  referenceId?: string;
  status?: PaymentStatus;
  error?: string;
  authorizationUrl?: string;
}

/**
 * Initiate a payment
 */
export async function initiatePayment(params: InitiatePaymentParams): Promise<PaymentResult> {
  try {
    // Create payment record
    const payment = await db.payment.create({
      data: {
        userId: params.userId,
        taskId: params.taskId,
        amount: params.amount,
        currency: params.currency || 'UGX',
        paymentMethod: params.paymentMethod,
        status: PaymentStatus.PENDING,
        phoneNumber: params.phoneNumber,
      },
    });

    // Process based on payment method
    switch (params.paymentMethod) {
      case 'MTN_MOMO':
        return await processMtnMoMo(payment.id, params);
      
      case 'AIRTEL_MONEY':
        return await processAirtelMoney(payment.id, params);
      
      case 'CASH':
        return await processCashPayment(payment.id);
      
      case 'VISA':
      case 'MASTERCARD':
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return await processCardPayment(payment.id, params);
      
      default:
        return { success: false, error: 'Unsupported payment method' };
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment initiation failed',
    };
  }
}

/**
 * Process MTN Mobile Money payment
 */
async function processMtnMoMo(
  paymentId: string,
  params: InitiatePaymentParams
): Promise<PaymentResult> {
  if (!params.phoneNumber) {
    return { success: false, error: 'Phone number is required for MTN MoMo' };
  }

  // Check if credentials are configured
  if (!process.env.MTN_MOMO_API_USER || !process.env.MTN_MOMO_API_KEY) {
    // Simulate successful payment in development
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        transactionId: `MOCK_MTN_${Date.now()}`,
        providerResponse: JSON.stringify({ simulated: true }),
      },
    });
    
    return {
      success: true,
      paymentId,
      referenceId: paymentId,
      status: PaymentStatus.COMPLETED,
    };
  }

  const result = await mtnMomoService.requestPayment({
    phoneNumber: params.phoneNumber,
    amount: params.amount,
    currency: params.currency,
    payerMessage: params.description || 'Smart Ride Payment',
  });

  if (result.success && result.referenceId) {
    await db.payment.update({
      where: { id: paymentId },
      data: {
        paymentReference: result.referenceId,
        status: PaymentStatus.PROCESSING,
      },
    });

    return {
      success: true,
      paymentId,
      referenceId: result.referenceId,
      status: PaymentStatus.PROCESSING,
    };
  }

  // Payment failed
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.FAILED,
      failureReason: result.error,
    },
  });

  return {
    success: false,
    paymentId,
    error: result.error,
  };
}

/**
 * Process Airtel Money payment
 */
async function processAirtelMoney(
  paymentId: string,
  params: InitiatePaymentParams
): Promise<PaymentResult> {
  if (!params.phoneNumber) {
    return { success: false, error: 'Phone number is required for Airtel Money' };
  }

  // Check if credentials are configured
  if (!process.env.AIRTEL_MONEY_CLIENT_ID || !process.env.AIRTEL_MONEY_CLIENT_SECRET) {
    // Simulate successful payment in development
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        transactionId: `MOCK_AIRTEL_${Date.now()}`,
        providerResponse: JSON.stringify({ simulated: true }),
      },
    });
    
    return {
      success: true,
      paymentId,
      referenceId: paymentId,
      status: PaymentStatus.COMPLETED,
    };
  }

  const result = await airtelMoneyService.collectPayment({
    phoneNumber: params.phoneNumber,
    amount: params.amount,
    currency: params.currency,
  });

  if (result.success && result.referenceId) {
    await db.payment.update({
      where: { id: paymentId },
      data: {
        paymentReference: result.referenceId,
        status: PaymentStatus.PROCESSING,
      },
    });

    return {
      success: true,
      paymentId,
      referenceId: result.referenceId,
      status: PaymentStatus.PROCESSING,
    };
  }

  // Payment failed
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.FAILED,
      failureReason: result.error,
    },
  });

  return {
    success: false,
    paymentId,
    error: result.error,
  };
}

/**
 * Process cash payment (marks as pending collection)
 */
async function processCashPayment(paymentId: string): Promise<PaymentResult> {
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.PENDING,
    },
  });

  return {
    success: true,
    paymentId,
    status: PaymentStatus.PENDING,
  };
}

/**
 * Process card payment (placeholder for Flutterwave/Paystack)
 */
async function processCardPayment(
  paymentId: string,
  params: InitiatePaymentParams
): Promise<PaymentResult> {
  // TODO: Integrate with Flutterwave or Paystack
  // For now, return an error
  return {
    success: false,
    paymentId,
    error: 'Card payments are not yet available. Please use MTN MoMo or Airtel Money.',
  };
}

/**
 * Check payment status
 */
export async function checkPaymentStatus(paymentId: string): Promise<{
  success: boolean;
  status?: PaymentStatus;
  transactionId?: string;
  error?: string;
}> {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    // If already completed/failed, return stored status
    if (payment.status !== PaymentStatus.PROCESSING) {
      return {
        success: true,
        status: payment.status,
        transactionId: payment.transactionId || undefined,
      };
    }

    // Check with provider
    if (payment.paymentMethod === 'MTN_MOMO' && payment.paymentReference) {
      const result = await mtnMomoService.getPaymentStatus(payment.paymentReference);
      
      if (result.success && result.status) {
        const newStatus = mapProviderStatus(result.status);
        
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: newStatus,
            transactionId: result.financialTransactionId,
          },
        });

        return { success: true, status: newStatus, transactionId: result.financialTransactionId };
      }
    }

    if (payment.paymentMethod === 'AIRTEL_MONEY' && payment.paymentReference) {
      const result = await airtelMoneyService.getTransactionStatus(payment.paymentReference);
      
      if (result.success && result.status) {
        const newStatus = mapProviderStatus(result.status);
        
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: newStatus,
          },
        });

        return { success: true, status: newStatus };
      }
    }

    return { success: true, status: payment.status };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    };
  }
}

/**
 * Map provider status to internal status
 */
function mapProviderStatus(status: string): PaymentStatus {
  switch (status) {
    case 'SUCCESSFUL':
    case 'SUCCESS':
      return PaymentStatus.COMPLETED;
    case 'FAILED':
    case 'REJECTED':
      return PaymentStatus.FAILED;
    case 'TIMEOUT':
      return PaymentStatus.FAILED;
    default:
      return PaymentStatus.PROCESSING;
  }
}

/**
 * Process rider payout
 */
export async function processRiderPayout(params: {
  riderId: string;
  amount: number;
  phoneNumber: string;
  paymentMethod: 'MTN_MOMO' | 'AIRTEL_MONEY';
}): Promise<PaymentResult> {
  try {
    if (params.paymentMethod === 'MTN_MOMO') {
      const result = await mtnMomoService.disburseFunds({
        phoneNumber: params.phoneNumber,
        amount: params.amount,
      });

      if (result.success) {
        // Update rider wallet
        await db.rider.update({
          where: { id: params.riderId },
          data: {
            walletBalance: {
              decrement: params.amount,
            },
          },
        });

        return { success: true, referenceId: result.referenceId };
      }

      return { success: false, error: result.error };
    }

    if (params.paymentMethod === 'AIRTEL_MONEY') {
      const result = await airtelMoneyService.disburseFunds({
        phoneNumber: params.phoneNumber,
        amount: params.amount,
      });

      if (result.success) {
        await db.rider.update({
          where: { id: params.riderId },
          data: {
            walletBalance: {
              decrement: params.amount,
            },
          },
        });

        return { success: true, referenceId: result.referenceId };
      }

      return { success: false, error: result.error };
    }

    return { success: false, error: 'Unsupported payout method' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payout failed',
    };
  }
}

export const paymentService = {
  initiatePayment,
  checkPaymentStatus,
  processRiderPayout,
};

export default paymentService;

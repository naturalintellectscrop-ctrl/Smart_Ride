/**
 * Flutterwave Payment Service
 * Documentation: https://developer.flutterwave.com/
 *
 * Supports Mobile Money (MTN, Airtel) for Uganda, card payments, and bank transfers.
 * Flutterwave uses API key authentication (no OAuth token flow).
 */

import crypto from 'crypto';
import { paymentLogger } from '@/lib/logging/logger';

// ==========================================
// Types
// ==========================================

export type FlutterwavePaymentMethod = 'mtn_ug' | 'airtel_ug' | 'card' | 'bank_transfer';

export interface InitiatePaymentParams {
  txRef?: string;
  amount: number;
  currency?: string;
  paymentMethod: FlutterwavePaymentMethod;
  phoneNumber?: string;
  email?: string;
  customerName?: string;
  description?: string;
  taskId?: string;
  orderId?: string;
  userId?: string;
  redirectUrl?: string;
}

export interface FlutterwavePaymentResult {
  success: boolean;
  txRef?: string;
  transactionId?: string;
  link?: string;
  status?: string;
  error?: string;
}

export interface FlutterwaveVerifyResult {
  success: boolean;
  txRef?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paidAt?: string;
  customerEmail?: string;
  customerPhone?: string;
  meta?: Record<string, unknown>;
  error?: string;
}

export interface FlutterwaveTransactionResult {
  success: boolean;
  id?: number;
  txRef?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paymentType?: string;
  createdAt?: string;
  error?: string;
}

export interface FlutterwaveRefundResult {
  success: boolean;
  refundId?: number;
  amount?: number;
  status?: string;
  error?: string;
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

// ==========================================
// Configuration
// ==========================================

const FLUTTERWAVE_CONFIG = {
  baseUrl: process.env.FLUTTERWAVE_ENVIRONMENT === 'production'
    ? 'https://api.flutterwave.com/v3'
    : 'https://api.flutterwave.com/v3',
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
  webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || '',
};

/** Structured unavailability message */
const UNAVAILABLE_MESSAGE = 'Flutterwave service not configured. Set FLUTTERWAVE_SECRET_KEY environment variable.';

// ==========================================
// FlutterwaveService Class
// ==========================================

class FlutterwaveService {
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor() {
    this.baseUrl = FLUTTERWAVE_CONFIG.baseUrl;
    this.secretKey = FLUTTERWAVE_CONFIG.secretKey;
    this.webhookSecret = FLUTTERWAVE_CONFIG.webhookSecret;
  }

  // ------------------------------------------
  // Configuration Checks
  // ------------------------------------------

  /**
   * Check if Flutterwave service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  /**
   * Check if webhook secret is configured
   */
  isWebhookConfigured(): boolean {
    return Boolean(this.webhookSecret);
  }

  /**
   * Get webhook secret for signature verification
   */
  getWebhookSecret(): string {
    return this.webhookSecret;
  }

  // ------------------------------------------
  // Payment Initiation
  // ------------------------------------------

  /**
   * Initiate a payment via Flutterwave API
   * Creates a charge for mobile money, card, or bank transfer
   */
  async initiatePayment(params: InitiatePaymentParams): Promise<FlutterwavePaymentResult> {
    if (!this.isConfigured()) {
      paymentLogger.warn(UNAVAILABLE_MESSAGE);
      return { success: false, error: UNAVAILABLE_MESSAGE };
    }

    try {
      const txRef = params.txRef || this.generateTxRef();

      // Build customer object
      const customer: Record<string, string> = {};
      if (params.email) customer.email = params.email;
      if (params.phoneNumber) customer.phonenumber = this.formatPhoneNumber(params.phoneNumber);
      if (params.customerName) customer.name = params.customerName;

      // Build payload
      const payload: Record<string, unknown> = {
        tx_ref: txRef,
        amount: params.amount,
        currency: params.currency || 'UGX',
        customer,
        customizations: {
          title: 'Smart Ride Payment',
          description: params.description || 'Service payment',
        },
        meta: {
          user_id: params.userId,
          task_id: params.taskId,
          order_id: params.orderId,
        },
      };

      // Mobile Money specific payload
      if (this.isMobileMoney(params.paymentMethod)) {
        if (!params.phoneNumber) {
          return { success: false, error: 'Phone number is required for mobile money payments' };
        }

        // Validate phone number for the network
        const validation = this.validatePhoneNumber(params.phoneNumber, params.paymentMethod);
        if (!validation.valid) {
          return { success: false, error: validation.error || 'Invalid phone number' };
        }

        payload.payment_options = 'mobilemoneyuganda';
        payload.redirect_url = params.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/callback`;
      }

      // Call Flutterwave API
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.message || 'Payment initiation failed';
        paymentLogger.error('Flutterwave payment initiation failed:', {
          status: response.status,
          message: errorMessage,
        });
        return { success: false, txRef, error: errorMessage };
      }

      return {
        success: true,
        txRef,
        transactionId: result.data?.id?.toString(),
        link: result.data?.link,
        status: 'PENDING',
      };
    } catch (error) {
      paymentLogger.error('Flutterwave payment initiation error:', { error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initiation failed',
      };
    }
  }

  // ------------------------------------------
  // Transaction Verification
  // ------------------------------------------

  /**
   * Verify a transaction by transaction reference (txRef)
   */
  async verifyTransaction(txRef: string): Promise<FlutterwaveVerifyResult> {
    if (!this.isConfigured()) {
      paymentLogger.warn(UNAVAILABLE_MESSAGE);
      return { success: false, error: UNAVAILABLE_MESSAGE };
    }

    try {
      const url = `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        const errorMessage = result.message || 'Transaction verification failed';
        paymentLogger.error('Flutterwave verification failed:', {
          txRef,
          status: response.status,
          message: errorMessage,
        });
        return { success: false, txRef, error: errorMessage };
      }

      const data = result.data;

      return {
        success: true,
        txRef: data.tx_ref,
        transactionId: data.id?.toString(),
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        paidAt: data.paid_at,
        customerEmail: data.customer?.email,
        customerPhone: data.customer?.phone_number,
        meta: data.meta,
      };
    } catch (error) {
      paymentLogger.error('Flutterwave verification error:', { txRef, error: String(error) });
      return {
        success: false,
        txRef,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  // ------------------------------------------
  // Transaction Status
  // ------------------------------------------

  /**
   * Get transaction status by Flutterwave transaction ID
   */
  async getTransactionStatus(id: string): Promise<FlutterwaveTransactionResult> {
    if (!this.isConfigured()) {
      paymentLogger.warn(UNAVAILABLE_MESSAGE);
      return { success: false, error: UNAVAILABLE_MESSAGE };
    }

    try {
      const url = `${this.baseUrl}/transactions/${encodeURIComponent(id)}/verify`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        const errorMessage = result.message || 'Failed to get transaction status';
        paymentLogger.error('Flutterwave getTransactionStatus failed:', {
          id,
          status: response.status,
          message: errorMessage,
        });
        return { success: false, error: errorMessage };
      }

      const data = result.data;

      return {
        success: true,
        id: data.id,
        txRef: data.tx_ref,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        paymentType: data.payment_type,
        createdAt: data.created_at,
      };
    } catch (error) {
      paymentLogger.error('Flutterwave getTransactionStatus error:', { id, error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  }

  // ------------------------------------------
  // Refund
  // ------------------------------------------

  /**
   * Initiate a refund for a transaction
   */
  async refundTransaction(id: string, amount?: number): Promise<FlutterwaveRefundResult> {
    if (!this.isConfigured()) {
      paymentLogger.warn(UNAVAILABLE_MESSAGE);
      return { success: false, error: UNAVAILABLE_MESSAGE };
    }

    try {
      const payload: Record<string, unknown> = {};
      if (amount) {
        payload.amount = amount;
      }

      const response = await fetch(`${this.baseUrl}/transactions/${encodeURIComponent(id)}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        const errorMessage = result.message || 'Refund initiation failed';
        paymentLogger.error('Flutterwave refund failed:', {
          id,
          status: response.status,
          message: errorMessage,
        });
        return { success: false, error: errorMessage };
      }

      const data = result.data;

      return {
        success: true,
        refundId: data.id,
        amount: data.amount,
        status: data.status,
      };
    } catch (error) {
      paymentLogger.error('Flutterwave refund error:', { id, error: String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  // ------------------------------------------
  // Webhook Signature Verification
  // ------------------------------------------

  /**
   * Verify Flutterwave webhook signature using HMAC-SHA256
   * Flutterwave sends the signature in the `verif-hash` header
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  // ------------------------------------------
  // Status Mapping
  // ------------------------------------------

  /**
   * Map Flutterwave transaction status to internal PaymentStatus enum
   */
  mapStatus(flutterwaveStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'successful': 'COMPLETED',
      'failed': 'FAILED',
      'cancelled': 'FAILED',
      'pending': 'PENDING',
      'processing': 'PROCESSING',
      'charged': 'PROCESSING',
    };
    return statusMap[flutterwaveStatus] || 'PENDING';
  }

  // ------------------------------------------
  // Phone Number Validation
  // ------------------------------------------

  /**
   * Validate phone number for Ugandan mobile networks
   */
  validatePhoneNumber(
    phone: string,
    network: FlutterwavePaymentMethod
  ): { valid: boolean; error?: string; formatted?: string } {
    const cleaned = phone.replace(/[\s+\-()]/g, '');

    // MTN Uganda prefixes: 077, 078, 039 (or +256/256 versions)
    const mtnRegex = /^(\+?256|0)(77|78|39)\d{7}$/;
    // Airtel Uganda prefixes: 070, 075, 074, 020 (or +256/256 versions)
    const airtelRegex = /^(\+?256|0)(70|75|74|20)\d{7}$/;

    switch (network) {
      case 'mtn_ug':
        if (!mtnRegex.test(cleaned)) {
          return {
            valid: false,
            error: 'Invalid MTN Uganda phone number. Valid formats: 077X/078X/039X XXXXXX or +25677X/78X/39X XXXXXX',
          };
        }
        return { valid: true, formatted: this.formatPhoneNumber(phone) };

      case 'airtel_ug':
        if (!airtelRegex.test(cleaned)) {
          return {
            valid: false,
            error: 'Invalid Airtel Uganda phone number. Valid formats: 070X/075X/074X/020X XXXXXX or +25670X/75X/74X/20X XXXXXX',
          };
        }
        return { valid: true, formatted: this.formatPhoneNumber(phone) };

      default:
        // For card/bank_transfer, phone validation is not required
        return { valid: true, formatted: phone };
    }
  }

  /**
   * Check if a phone number is a valid MTN Uganda number
   */
  isValidMTNNumber(phone: string): boolean {
    const cleaned = phone.replace(/[\s+\-()]/g, '');
    return /^(\+?256|0)(77|78|39)\d{7}$/.test(cleaned);
  }

  /**
   * Check if a phone number is a valid Airtel Uganda number
   */
  isValidAirtelNumber(phone: string): boolean {
    const cleaned = phone.replace(/[\s+\-()]/g, '');
    return /^(\+?256|0)(70|75|74|20)\d{7}$/.test(cleaned);
  }

  // ------------------------------------------
  // Helpers
  // ------------------------------------------

  /**
   * Generate unique transaction reference
   */
  private generateTxRef(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SR-${timestamp}-${random}`;
  }

  /**
   * Format phone number for Flutterwave API (256 for Uganda)
   */
  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      formatted = '256' + formatted.substring(1);
    }
    return formatted;
  }

  /**
   * Check if payment method is mobile money
   */
  private isMobileMoney(method: FlutterwavePaymentMethod): boolean {
    return method === 'mtn_ug' || method === 'airtel_ug';
  }
}

// ==========================================
// Singleton Export
// ==========================================

export const flutterwaveService = new FlutterwaveService();

/** Boolean export for quick checks */
export const flutterwaveConfigured = flutterwaveService.isConfigured();

export default flutterwaveService;

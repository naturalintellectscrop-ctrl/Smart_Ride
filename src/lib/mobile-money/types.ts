/**
 * Mobile Money API Types
 * 
 * TypeScript interfaces for mobile money transactions
 */

export type MobileMoneyProvider = 'MTN' | 'AIRTEL';

export type TransactionStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'TIMEOUT'
  | 'CANCELLED';

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL';

export interface MobileMoneyRequest {
  provider: MobileMoneyProvider;
  phoneNumber: string;
  amount: number;
  currency: string;
  transactionType: TransactionType;
  reference: string;
  description?: string;
}

export interface MobileMoneyResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  status: TransactionStatus;
  message?: string;
  error?: string;
}

export interface MobileMoneyCallback {
  transactionId: string;
  reference: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  phoneNumber: string;
  provider: MobileMoneyProvider;
  timestamp: string;
  signature?: string;
}

export interface MobileMoneyBalance {
  provider: MobileMoneyProvider;
  availableBalance: number;
  currency: string;
}

/**
 * Validate phone number format for Ugandan mobile money
 */
export function validatePhoneNumber(phoneNumber: string, provider: MobileMoneyProvider): boolean {
  // Remove spaces and leading +
  const cleaned = phoneNumber.replace(/[\s+]/g, '');
  
  // Ugandan phone number patterns
  const patterns: Record<MobileMoneyProvider, RegExp> = {
    MTN: /^(256|0)(77|78|76|79)\d{7}$/,
    AIRTEL: /^(256|0)(70|75|74)\d{7}$/,
  };
  
  return patterns[provider].test(cleaned);
}

/**
 * Format phone number for API
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove spaces and leading +
  let cleaned = phoneNumber.replace(/[\s+]/g, '');
  
  // Convert 0XX to 256XX
  if (cleaned.startsWith('0')) {
    cleaned = '256' + cleaned.slice(1);
  }
  
  return cleaned;
}

/**
 * Generate unique transaction reference
 */
export function generateTransactionReference(prefix: string = 'SR'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

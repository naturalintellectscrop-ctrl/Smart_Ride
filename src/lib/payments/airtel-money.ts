/**
 * Airtel Money API Integration
 * Documentation: https://developers.airtel.africa/
 * 
 * Supports Uganda, Kenya, Tanzania, Rwanda, DRC, Niger, Chad, Congo, Gabon
 */

// Airtel Money Configuration
const AIRTEL_CONFIG = {
  baseUrl: process.env.AIRTEL_MONEY_ENVIRONMENT === 'production'
    ? 'https://openapi.airtel.africa'
    : 'https://openapiuat.airtel.africa',
  clientId: process.env.AIRTEL_MONEY_CLIENT_ID || '',
  clientSecret: process.env.AIRTEL_MONEY_CLIENT_SECRET || '',
  callbackUrl: process.env.AIRTEL_MONEY_CALLBACK_URL || '',
};

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Generate reference ID
 */
function generateReference(): string {
  return `SR${Date.now()}${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

/**
 * Get OAuth2 access token
 */
async function getAccessToken(): Promise<string> {
  // Check cache
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  if (!AIRTEL_CONFIG.clientId || !AIRTEL_CONFIG.clientSecret) {
    throw new Error('Airtel Money credentials not configured');
  }

  const response = await fetch(
    `${AIRTEL_CONFIG.baseUrl}/auth/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: AIRTEL_CONFIG.clientId,
        client_secret: AIRTEL_CONFIG.clientSecret,
        grant_type: 'client_credentials',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Airtel Money token: ${error}`);
  }

  const data = await response.json();
  
  // Cache token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 100) * 1000,
  };

  return cachedToken.token;
}

/**
 * Request payment from customer (Collection/Push)
 */
export async function requestPayment(params: {
  phoneNumber: string;
  amount: number;
  currency?: string;
  reference?: string;
  transactionDesc?: string;
}): Promise<{
  success: boolean;
  referenceId?: string;
  transactionId?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const reference = params.reference || generateReference();
    
    // Format phone number (remove +, spaces, and ensure correct format)
    let msisdn = params.phoneNumber.replace('+', '').replace(/\s/g, '');
    if (msisdn.startsWith('256') && msisdn.length === 12) {
      msisdn = msisdn.substring(3); // Remove country code for Airtel
    }

    const response = await fetch(
      `${AIRTEL_CONFIG.baseUrl}/standard/v1/disbursements/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': 'UG',
          'X-Currency': params.currency || 'UGX',
        },
        body: JSON.stringify({
          payee: {
            msisdn: msisdn,
          },
          transaction: {
            amount: params.amount,
            id: reference,
            description: params.transactionDesc || 'Smart Ride Payment',
          },
          reference: reference,
          callback_url: AIRTEL_CONFIG.callbackUrl,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || error.error_description || 'Payment request failed',
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      referenceId: reference,
      transactionId: data.transaction?.id,
    };
  } catch (error) {
    console.error('Airtel Money payment request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment request failed',
    };
  }
}

/**
 * Collect payment (USSD Push)
 */
export async function collectPayment(params: {
  phoneNumber: string;
  amount: number;
  currency?: string;
  reference?: string;
  customerName?: string;
}): Promise<{
  success: boolean;
  referenceId?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const reference = params.reference || generateReference();
    
    // Format phone number
    let msisdn = params.phoneNumber.replace('+', '').replace(/\s/g, '');
    if (msisdn.startsWith('256') && msisdn.length === 12) {
      msisdn = msisdn.substring(3);
    }

    const response = await fetch(
      `${AIRTEL_CONFIG.baseUrl}/merchant/v1/payments/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': 'UG',
          'X-Currency': params.currency || 'UGX',
        },
        body: JSON.stringify({
          reference: reference,
          subscriber: {
            msisdn: msisdn,
          },
          transaction: {
            amount: params.amount,
            description: 'Smart Ride Payment',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Collection request failed',
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      referenceId: reference,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Collection request failed',
    };
  }
}

/**
 * Check transaction status
 */
export async function getTransactionStatus(referenceId: string): Promise<{
  success: boolean;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  amount?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();

    const response = await fetch(
      `${AIRTEL_CONFIG.baseUrl}/standard/v1/payments/${referenceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': 'UG',
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to check transaction status' };
    }

    const data = await response.json();
    
    return {
      success: true,
      status: data.transaction?.status,
      amount: data.transaction?.amount,
      currency: data.transaction?.currency,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    };
  }
}

/**
 * Disburse funds to Airtel Money account
 */
export async function disburseFunds(params: {
  phoneNumber: string;
  amount: number;
  currency?: string;
  reference?: string;
  remarks?: string;
}): Promise<{
  success: boolean;
  referenceId?: string;
  transactionId?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const reference = params.reference || generateReference();
    
    // Format phone number
    let msisdn = params.phoneNumber.replace('+', '').replace(/\s/g, '');
    if (msisdn.startsWith('256') && msisdn.length === 12) {
      msisdn = msisdn.substring(3);
    }

    const response = await fetch(
      `${AIRTEL_CONFIG.baseUrl}/standard/v1/disbursements/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': 'UG',
          'X-Currency': params.currency || 'UGX',
        },
        body: JSON.stringify({
          payee: {
            msisdn: msisdn,
          },
          transaction: {
            amount: params.amount,
            id: reference,
            description: params.remarks || 'Smart Ride Payout',
          },
          reference: reference,
          callback_url: AIRTEL_CONFIG.callbackUrl,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Disbursement failed',
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      referenceId: reference,
      transactionId: data.transaction?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Disbursement failed',
    };
  }
}

/**
 * Check account balance
 */
export async function getAccountBalance(): Promise<{
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();

    const response = await fetch(
      `${AIRTEL_CONFIG.baseUrl}/standard/v1/users/balance`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to get balance' };
    }

    const data = await response.json();
    
    return {
      success: true,
      balance: data.balance,
      currency: data.currency,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Balance check failed',
    };
  }
}

export const airtelMoneyService = {
  requestPayment,
  collectPayment,
  getTransactionStatus,
  disburseFunds,
  getAccountBalance,
};

// Export alias for backwards compatibility
export const AIRTEL_MONEY = airtelMoneyService;

// Export generateReferenceId for backwards compatibility
export const generateReferenceId = generateReference;

export default airtelMoneyService;

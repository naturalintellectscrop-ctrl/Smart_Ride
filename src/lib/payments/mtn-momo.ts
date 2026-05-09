/**
 * MTN Mobile Money API Integration
 * Documentation: https://momodeveloper.mtn.com/
 * 
 * Supports Uganda and other African countries
 */

// MTN MoMo Configuration
const MTN_CONFIG = {
  baseUrl: process.env.MTN_MOMO_ENVIRONMENT === 'production' 
    ? 'https://momodeveloper.mtn.com'
    : 'https://sandbox.momodeveloper.mtn.com',
  primaryKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
  apiUser: process.env.MTN_MOMO_API_USER || '',
  apiKey: process.env.MTN_MOMO_API_KEY || '',
  callbackUrl: process.env.MTN_MOMO_CALLBACK_URL || '',
};

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Generate UUID v4 for reference IDs
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get OAuth2 access token
 */
async function getAccessToken(): Promise<string> {
  // Check cache
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  // Check if credentials are configured
  if (!MTN_CONFIG.apiUser || !MTN_CONFIG.apiKey || !MTN_CONFIG.primaryKey) {
    throw new Error('MTN MoMo credentials not configured');
  }

  const auth = Buffer.from(`${MTN_CONFIG.apiUser}:${MTN_CONFIG.apiKey}`).toString('base64');

  const response = await fetch(
    `${MTN_CONFIG.baseUrl}/collection/token/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Ocp-Apim-Subscription-Key': MTN_CONFIG.primaryKey,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get MTN MoMo token: ${error}`);
  }

  const data = await response.json();
  
  // Cache token (expires in 3600 seconds)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 100) * 1000,
  };

  return cachedToken.token;
}

/**
 * Request payment from customer (Collection)
 */
export async function requestPayment(params: {
  phoneNumber: string;
  amount: number;
  currency?: string;
  payerMessage?: string;
  payeeNote?: string;
  externalId?: string;
}): Promise<{
  success: boolean;
  referenceId?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const referenceId = generateUUID();

    const response = await fetch(
      `${MTN_CONFIG.baseUrl}/collection/v1_0/requesttopay`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
          'Ocp-Apim-Subscription-Key': MTN_CONFIG.primaryKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount.toString(),
          currency: params.currency || 'UGX',
          externalId: params.externalId || referenceId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: params.phoneNumber.replace('+', '').replace(/\s/g, ''),
          },
          payerMessage: params.payerMessage || 'Smart Ride Payment',
          payeeNote: params.payeeNote || 'Payment for services',
        }),
      }
    );

    if (response.status === 202) {
      return { success: true, referenceId };
    }

    const error = await response.json();
    return { 
      success: false, 
      error: error.message || 'Payment request failed' 
    };
  } catch (error) {
    console.error('MTN MoMo payment request error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Payment request failed' 
    };
  }
}

/**
 * Check payment status
 */
export async function getPaymentStatus(referenceId: string): Promise<{
  success: boolean;
  status?: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'REJECTED' | 'TIMEOUT';
  financialTransactionId?: string;
  amount?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();

    const response = await fetch(
      `${MTN_CONFIG.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
          'Ocp-Apim-Subscription-Key': MTN_CONFIG.primaryKey,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to check payment status' };
    }

    const data = await response.json();
    
    return {
      success: true,
      status: data.status as 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'REJECTED' | 'TIMEOUT',
      financialTransactionId: data.financialTransactionId,
      amount: parseInt(data.amount),
      currency: data.currency,
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Status check failed' 
    };
  }
}

/**
 * Transfer money to a mobile money account (Disbursement)
 */
export async function disburseFunds(params: {
  phoneNumber: string;
  amount: number;
  currency?: string;
  externalId?: string;
  payeeNote?: string;
}): Promise<{
  success: boolean;
  referenceId?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const referenceId = generateUUID();

    const response = await fetch(
      `${MTN_CONFIG.baseUrl}/disbursement/v1_0/transfer`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.MTN_MOMO_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
          'Ocp-Apim-Subscription-Key': MTN_CONFIG.primaryKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: params.amount.toString(),
          currency: params.currency || 'UGX',
          externalId: params.externalId || referenceId,
          payee: {
            partyIdType: 'MSISDN',
            partyId: params.phoneNumber.replace('+', '').replace(/\s/g, ''),
          },
          payerMessage: 'Smart Ride Payout',
          payeeNote: params.payeeNote || 'Rider earnings payout',
        }),
      }
    );

    if (response.status === 202) {
      return { success: true, referenceId };
    }

    const error = await response.json();
    return { 
      success: false, 
      error: error.message || 'Disbursement failed' 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Disbursement failed' 
    };
  }
}

export const mtnMomoService = {
  requestPayment,
  getPaymentStatus,
  disburseFunds,
};

// Export alias for backwards compatibility
export const MTN_MOMO = mtnMomoService;

// Export generateReferenceId for backwards compatibility  
export const generateReferenceId = generateUUID;

export default mtnMomoService;

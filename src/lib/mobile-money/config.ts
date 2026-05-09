/**
 * Mobile Money Provider Configuration
 * 
 * This file contains configuration for supported mobile money providers in Uganda.
 * Each provider requires API credentials to be set in environment variables.
 */

export type MobileMoneyProvider = 'MTN' | 'AIRTEL';

export interface MobileMoneyConfig {
  provider: MobileMoneyProvider;
  name: string;
  apiKey: string | undefined;
  apiSecret: string | undefined;
  baseUrl: string;
  callbackUrl: string | undefined;
  currency: string;
  countryCode: string;
}

export const mobileMoneyConfigs: Record<MobileMoneyProvider, MobileMoneyConfig> = {
  MTN: {
    provider: 'MTN',
    name: 'MTN Mobile Money',
    apiKey: process.env.MTN_MONEY_API_KEY,
    apiSecret: process.env.MTN_MONEY_API_SECRET,
    baseUrl: 'https://momodeveloper.mtn.com/collection/v1_0',
    callbackUrl: process.env.MTN_MONEY_CALLBACK_URL,
    currency: 'UGX',
    countryCode: 'UG',
  },
  AIRTEL: {
    provider: 'AIRTEL',
    name: 'Airtel Money',
    apiKey: process.env.AIRTEL_MONEY_API_KEY,
    apiSecret: process.env.AIRTEL_MONEY_API_SECRET,
    baseUrl: 'https://api.airteluganda.com/money/v1',
    callbackUrl: process.env.AIRTEL_MONEY_CALLBACK_URL,
    currency: 'UGX',
    countryCode: 'UG',
  },
};

/**
 * Check if a provider is configured
 */
export function isProviderConfigured(provider: MobileMoneyProvider): boolean {
  const config = mobileMoneyConfigs[provider];
  return !!(config.apiKey && config.apiSecret);
}

/**
 * Get list of configured providers
 */
export function getConfiguredProviders(): MobileMoneyProvider[] {
  return Object.keys(mobileMoneyConfigs).filter(isProviderConfigured) as MobileMoneyProvider[];
}

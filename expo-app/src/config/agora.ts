// ============================================
// AGORA CONFIGURATION
// In-App Internet Call (VoIP) Infrastructure
// ============================================
//
// Agora.io provides real-time audio communication.
// Get your App ID from https://console.agora.io/
//
// For Expo managed workflow:
// - Native Agora SDK requires `npx expo prebuild` or EAS custom dev client
// - Without Agora, the call screen uses phone dialer as fallback
// - Set EXPO_PUBLIC_AGORA_APP_ID in your .env file
//
// Free tier: 10,000 minutes/month
// ============================================

export const AGORA_CONFIG = {
  // Agora App ID - get from https://console.agora.io/
  appId: process.env.EXPO_PUBLIC_AGORA_APP_ID || '',

  // Token server endpoint (our backend generates tokens)
  tokenServerEndpoint: '/calls/token',

  // Default call settings
  defaultSettings: {
    // Audio profile for voice calls
    audioProfile: 'speechStandard' as const,
    // Audio scenario
    audioScenario: 'chatRoom' as const,
    // Channel profile
    channelProfile: 'communication' as const,
  },

  // Call timeouts (in milliseconds)
  timeouts: {
    // How long to ring before marking as missed
    ringingTimeout: 30000, // 30 seconds
    // How long to wait for connection
    connectingTimeout: 15000, // 15 seconds
    // Maximum call duration (safety limit)
    maxCallDuration: 3600000, // 1 hour
  },
};

/**
 * Check if Agora is properly configured
 */
export function isAgoraConfigured(): boolean {
  return !!AGORA_CONFIG.appId && AGORA_CONFIG.appId.length > 0;
}

/**
 * Get the Agora App ID for client-side SDK initialization
 * Returns empty string if not configured
 */
export function getAgoraAppId(): string {
  return AGORA_CONFIG.appId;
}

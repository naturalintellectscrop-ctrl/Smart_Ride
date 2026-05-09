/**
 * Smart Ride Masked Calling Service
 * 
 * This service enables phone calls between users WITHOUT exposing real phone numbers.
 * 
 * How it works:
 * 1. When User A wants to call User B, they request a call through this service
 * 2. The service creates a temporary "proxy session" with a virtual number
 * 3. User A calls the virtual number, which forwards to User B
 * 4. Neither party sees the other's real phone number
 * 
 * For production, integrate with:
 * - Twilio (Programmable Voice)
 * - Africa's Talking (Voice API)
 * - Vonage (Voice API)
 */

// ==========================================
// Types
// ==========================================

export interface CallSession {
  id: string;
  sessionId: string;
  callerId: string;
  callerType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'SUPPORT';
  calleeId: string;
  calleeType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'SUPPORT';
  proxyNumber: string;
  status: CallStatus;
  taskId?: string;
  taskType?: string;
  createdAt: Date;
  expiresAt: Date;
  duration: number; // in seconds
  recording?: string;
}

export type CallStatus = 
  | 'PENDING'
  | 'RINGING'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'MISSED'
  | 'FAILED'
  | 'REJECTED';

export interface CallRequest {
  callerId: string;
  callerType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'SUPPORT';
  callerPhone: string;
  calleeId: string;
  calleeType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'SUPPORT';
  calleePhone: string;
  taskId?: string;
  taskType?: string;
  recordCall?: boolean;
}

export interface CallLog {
  id: string;
  userId: string;
  userType: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyType: string;
  direction: 'INCOMING' | 'OUTGOING';
  status: CallStatus;
  duration: number;
  timestamp: Date;
  taskId?: string;
}

// ==========================================
// Configuration
// ==========================================

const CALLING_CONFIG = {
  // Proxy numbers pool (in production, these would be real virtual numbers)
  proxyNumbers: [
    '+256700000001',
    '+256700000002',
    '+256700000003',
    '+256700000004',
    '+256700000005',
  ],
  sessionTimeoutMinutes: 30,
  maxCallDurationMinutes: 15,
  recordingEnabled: true,
  // In production, add your provider credentials
  provider: process.env.CALLING_PROVIDER || 'simulation', // 'twilio' | 'africas-talking' | 'simulation'
};

// ==========================================
// In-Memory Store (Replace with Database in Production)
// ==========================================

const activeSessions = new Map<string, CallSession>();
const sessionPool = new Map<string, string>(); // proxyNumber -> sessionId

// ==========================================
// Core Functions
// ==========================================

/**
 * Initialize a masked call between two parties
 */
export async function initiateCall(request: CallRequest): Promise<{
  success: boolean;
  session?: CallSession;
  proxyNumber?: string;
  error?: string;
}> {
  try {
    // Check if both parties are in the same task (ride/delivery)
    if (request.taskId) {
      const taskValidation = await validateTaskParticipants(
        request.callerId,
        request.calleeId,
        request.taskId
      );
      
      if (!taskValidation.valid) {
        return {
          success: false,
          error: taskValidation.error || 'Not authorized to call this user',
        };
      }
    }

    // Get available proxy number
    const proxyNumber = getAvailableProxyNumber();
    
    if (!proxyNumber) {
      return {
        success: false,
        error: 'No available lines. Please try again in a moment.',
      };
    }

    // Create call session
    const sessionId = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CALLING_CONFIG.sessionTimeoutMinutes * 60 * 1000);

    const session: CallSession = {
      id: sessionId,
      sessionId,
      callerId: request.callerId,
      callerType: request.callerType,
      calleeId: request.calleeId,
      calleeType: request.calleeType,
      proxyNumber,
      status: 'PENDING',
      taskId: request.taskId,
      taskType: request.taskType,
      createdAt: now,
      expiresAt,
      duration: 0,
    };

    // Store session
    activeSessions.set(sessionId, session);
    sessionPool.set(proxyNumber, sessionId);

    // Initiate the actual call based on provider
    if (CALLING_CONFIG.provider === 'simulation') {
      // Simulate call initiation
      await simulateCallInitiation(session, request);
    } else {
      // In production, call actual provider (Twilio, Africa's Talking, etc.)
      await initiateProviderCall(session, request);
    }

    return {
      success: true,
      session,
      proxyNumber,
    };
  } catch (error) {
    console.error('Error initiating call:', error);
    return {
      success: false,
      error: 'Failed to initiate call. Please try again.',
    };
  }
}

/**
 * Get call session status
 */
export async function getCallStatus(sessionId: string): Promise<CallSession | null> {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if expired
  if (new Date() > session.expiresAt) {
    session.status = 'COMPLETED';
    releaseProxyNumber(session.proxyNumber);
  }

  return session;
}

/**
 * End an active call
 */
export async function endCall(sessionId: string): Promise<{ success: boolean }> {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return { success: false };
  }

  session.status = 'COMPLETED';
  releaseProxyNumber(session.proxyNumber);

  // In production, notify provider to end call
  if (CALLING_CONFIG.provider !== 'simulation') {
    await endProviderCall(session);
  }

  return { success: true };
}

/**
 * Get masked phone number for display
 * Shows only last 4 digits
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return `****${phone.slice(-4)}`;
}

/**
 * Get display name for caller (no phone number)
 */
export function getCallerDisplayName(
  userType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'SUPPORT',
  name?: string,
  vehicleInfo?: { plateNumber?: string; vehicleType?: string }
): string {
  switch (userType) {
    case 'RIDER':
      if (vehicleInfo?.plateNumber) {
        return `Rider (${vehicleInfo.plateNumber})`;
      }
      return name || 'Your Rider';
    case 'CLIENT':
      return name || 'Client';
    case 'MERCHANT':
      return name || 'Merchant';
    case 'SUPPORT':
      return 'Smart Ride Support';
    default:
      return 'Smart Ride User';
  }
}

/**
 * Get call history for a user
 */
export async function getCallHistory(
  userId: string,
  limit: number = 20
): Promise<CallLog[]> {
  // In production, fetch from database
  // For now, return empty array
  return [];
}

// ==========================================
// Helper Functions
// ==========================================

function getAvailableProxyNumber(): string | null {
  for (const number of CALLING_CONFIG.proxyNumbers) {
    if (!sessionPool.has(number)) {
      return number;
    }
  }
  return null;
}

function releaseProxyNumber(proxyNumber: string): void {
  sessionPool.delete(proxyNumber);
}

function generateSessionId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function validateTaskParticipants(
  callerId: string,
  calleeId: string,
  taskId: string
): Promise<{ valid: boolean; error?: string }> {
  // In production, verify that both users are participants in the same task
  // For now, return valid
  return { valid: true };
}

async function simulateCallInitiation(
  session: CallSession,
  request: CallRequest
): Promise<void> {
  // Simulate call flow
  setTimeout(() => {
    const sess = activeSessions.get(session.id);
    if (sess && sess.status === 'PENDING') {
      sess.status = 'RINGING';
    }
  }, 1000);

  // Simulate call connection after 3-5 seconds
  setTimeout(() => {
    const sess = activeSessions.get(session.id);
    if (sess && sess.status === 'RINGING') {
      sess.status = 'CONNECTED';
    }
  }, 3000 + Math.random() * 2000);
}

async function initiateProviderCall(
  session: CallSession,
  request: CallRequest
): Promise<void> {
  // In production, implement provider-specific logic
  // Example for Twilio:
  // const twilio = require('twilio')(accountSid, authToken);
  // await twilio.calls.create({
  //   to: request.calleePhone,
  //   from: session.proxyNumber,
  //   url: `${baseUrl}/api/calling/connect?sessionId=${session.id}`,
  // });
  
  // Example for Africa's Talking:
  // await africaTalking.voice.call({
  //   callFrom: session.proxyNumber,
  //   callTo: [request.calleePhone],
  // });
}

async function endProviderCall(session: CallSession): Promise<void> {
  // In production, implement provider-specific logic to end the call
}

// ==========================================
// Support Calling (No Dead Ends)
// ==========================================

/**
 * Initiate a call to support
 */
export async function callSupport(
  userId: string,
  userType: 'CLIENT' | 'RIDER' | 'MERCHANT',
  reason?: string
): Promise<{
  success: boolean;
  session?: CallSession;
  proxyNumber?: string;
  error?: string;
}> {
  // Support is always available
  return initiateCall({
    callerId: userId,
    callerType: userType,
    callerPhone: '', // Will be fetched from user profile in production
    calleeId: 'SUPPORT_TEAM',
    calleeType: 'SUPPORT',
    calleePhone: process.env.SUPPORT_PHONE || '+256700000000',
    taskType: 'SUPPORT',
  });
}

/**
 * Get support phone number for display (masked)
 */
export function getSupportNumber(): string {
  return 'Smart Ride Support';
}

// ==========================================
// Export
// ==========================================

export const MaskedCallingService = {
  initiateCall,
  getCallStatus,
  endCall,
  maskPhoneNumber,
  getCallerDisplayName,
  getCallHistory,
  callSupport,
  getSupportNumber,
};

export default MaskedCallingService;

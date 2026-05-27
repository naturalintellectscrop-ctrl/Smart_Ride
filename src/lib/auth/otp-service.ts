/**
 * OTP Service - Production Phone Authentication
 * Handles OTP generation, validation, and rate limiting
 * 
 * SMS Provider: Africa's Talking (Primary for Uganda)
 * Fallback: Console log in development
 */

import { db } from '@/lib/db';
import { hash, compare } from 'bcryptjs';
import { randomInt } from 'crypto';

// ============================================
// TYPES
// ============================================

export type OTPPurpose = 'login' | 'register' | 'reset_password' | 'verify_phone';

export interface OTPResult {
  success: boolean;
  otp?: string; // Only returned in development
  error?: string;
  expiresIn?: number;
}

export interface OTPValidationResult {
  success: boolean;
  error?: string;
}

export interface SMSResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 5, // 5 minutes expiry
  maxAttempts: 3,
  resendCooldownSeconds: 60, // 1 minute between resends
};

// SMS Configuration from environment
const SMS_CONFIG = {
  // Africa's Talking credentials
  africasTalking: {
    apiKey: process.env.AFRICASTALKING_API_KEY || '',
    username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
    senderId: process.env.AFRICASTALKING_SENDER_ID || 'SmartRide',
  },
  // Feature flags
  enabled: process.env.SMS_ENABLED === 'true',
  provider: process.env.SMS_PROVIDER || 'africas_talking',
};

// ============================================
// SMS SERVICE - AFRICA'S TALKING
// ============================================

/**
 * Send SMS via Africa's Talking API
 * Documentation: https://developers.africastalking.com/page/sms
 */
async function sendSMSViaAfricasTalking(
  phone: string,
  message: string
): Promise<SMSResult> {
  try {
    // Check if credentials are configured
    if (!SMS_CONFIG.africasTalking.apiKey) {
      console.error('[SMS] Africa\'s Talking API key not configured');
      return { 
        success: false, 
        error: 'SMS service not configured' 
      };
    }

    // Africa's Talking API endpoint
    const endpoint = 'https://api.africastalking.com/version1/messaging';
    
    // Prepare request body
    const body = new URLSearchParams({
      username: SMS_CONFIG.africasTalking.username,
      to: phone.replace('+', ''), // Remove + prefix
      message: message,
      from: SMS_CONFIG.africasTalking.senderId,
    });

    // Make API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': SMS_CONFIG.africasTalking.apiKey,
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[SMS] Africa\'s Talking error:', data);
      return { 
        success: false, 
        error: data.errorMessage || 'Failed to send SMS' 
      };
    }

    // Check SMS status
    const smsResult = data.SMSMessageData?.Recipients?.[0];
    if (smsResult && smsResult.status !== 'Success') {
      console.error('[SMS] SMS delivery failed:', smsResult);
      return { 
        success: false, 
        error: smsResult.statusText || 'SMS delivery failed' 
      };
    }

    console.log('[SMS] SMS sent successfully via Africa\'s Talking');
    return { 
      success: true, 
      messageId: smsResult?.messageId 
    };

  } catch (error) {
    console.error('[SMS] Africa\'s Talking request error:', error);
    return { 
      success: false, 
      error: 'Failed to connect to SMS service' 
    };
  }
}

/**
 * Send SMS - Main function with provider selection
 */
async function sendSMS(
  phone: string, 
  message: string
): Promise<SMSResult> {
  // Check if SMS is enabled
  if (!SMS_CONFIG.enabled) {
    console.log('[SMS] SMS disabled - would have sent to:', phone);
    console.log('[SMS] Message:', message);
    return { success: true }; // Pretend success in dev/disabled mode
  }

  // Select provider
  switch (SMS_CONFIG.provider) {
    case 'africas_talking':
      return sendSMSViaAfricasTalking(phone, message);
    
    // Add other providers here
    // case 'twilio':
    //   return sendSMSViaTwilio(phone, message);
    
    default:
      console.error('[SMS] Unknown SMS provider:', SMS_CONFIG.provider);
      return { 
        success: false, 
        error: 'SMS provider not configured' 
      };
  }
}

// ============================================
// OTP SERVICE
// ============================================

/**
 * Generate a secure numeric OTP
 */
function generateSecureOTP(length: number): string {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += randomInt(0, 10).toString();
  }
  return otp;
}

/**
 * Send OTP to phone number
 * PRODUCTION: Sends SMS via configured provider
 */
export async function sendOTP(
  phone: string,
  purpose: OTPPurpose,
  ipAddress?: string
): Promise<OTPResult> {
  try {
    // Normalize phone number (Uganda format)
    const normalizedPhone = normalizePhone(phone);
    
    if (!isValidUgandanPhone(normalizedPhone)) {
      return { success: false, error: 'Invalid Ugandan phone number' };
    }

    // Check for rate limiting - existing unexpired OTP
    const existingOTP = await db.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        purpose,
        expiresAt: { gt: new Date() },
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOTP) {
      const secondsSinceCreated = (Date.now() - existingOTP.createdAt.getTime()) / 1000;
      if (secondsSinceCreated < OTP_CONFIG.resendCooldownSeconds) {
        const waitTime = Math.ceil(OTP_CONFIG.resendCooldownSeconds - secondsSinceCreated);
        return { 
          success: false, 
          error: `Please wait ${waitTime} seconds before requesting a new OTP` 
        };
      }
    }

    // Generate new OTP
    const otp = generateSecureOTP(OTP_CONFIG.length);
    const otpHash = await hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_CONFIG.expiryMinutes * 60 * 1000);

    // Invalidate previous OTPs for this phone/purpose
    await db.oTP.deleteMany({
      where: {
        phone: normalizedPhone,
        purpose,
        verified: false,
      },
    });

    // Store hashed OTP in database FIRST
    await db.oTP.create({
      data: {
        phone: normalizedPhone,
        otpHash,
        purpose,
        expiresAt,
      },
    });

    // Compose SMS message
    const message = `Your Smart Ride verification code is: ${otp}. Valid for ${OTP_CONFIG.expiryMinutes} minutes. Do not share this code.`;

    // In production, send via SMS
    if (SMS_CONFIG.enabled) {
      const smsResult = await sendSMS(normalizedPhone, message);
      
      if (!smsResult.success) {
        // SMS failed - delete the OTP record and return error
        await db.oTP.deleteMany({
          where: { phone: normalizedPhone, purpose, verified: false },
        });
        
        console.error('[OTP] SMS failed, OTP not sent:', smsResult.error);
        return { 
          success: false, 
          error: smsResult.error || 'Failed to send OTP. Please try again.' 
        };
      }
      
      console.log(`[OTP] SMS sent to ${normalizedPhone} (Purpose: ${purpose})`);
    } else {
      // Development mode - log OTP
      console.log(`[OTP] DEV MODE - OTP for ${normalizedPhone}: ${otp} (Purpose: ${purpose})`);
    }

    // SECURITY: Only include OTP in response in development mode with explicit opt-in
    // Production MUST NEVER expose OTP in API responses
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const allowOtpInResponse = isDevelopment && process.env.ALLOW_OTP_IN_RESPONSE === 'true';

    return {
      success: true,
      ...(allowOtpInResponse ? { otp } : {}),
      expiresIn: OTP_CONFIG.expiryMinutes * 60,
    };
  } catch (error) {
    console.error('[OTP] Send error:', error);
    return { success: false, error: 'Failed to send OTP. Please try again.' };
  }
}

/**
 * Validate OTP
 */
export async function validateOTP(
  phone: string,
  otp: string,
  purpose: OTPPurpose
): Promise<OTPValidationResult> {
  try {
    const normalizedPhone = normalizePhone(phone);

    // Find the OTP record
    const otpRecord = await db.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        purpose,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return { success: false, error: 'Invalid or expired OTP' };
    }

    // Check attempts
    if (otpRecord.attempts >= OTP_CONFIG.maxAttempts) {
      return { success: false, error: 'Too many attempts. Please request a new OTP.' };
    }

    // Verify OTP
    const isValid = await compare(otp, otpRecord.otpHash);

    if (!isValid) {
      // Increment attempts
      await db.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      
      const remaining = OTP_CONFIG.maxAttempts - otpRecord.attempts - 1;
      return { 
        success: false, 
        error: `Invalid OTP. ${remaining} attempts remaining.` 
      };
    }

    // Mark as verified
    await db.oTP.update({
      where: { id: otpRecord.id },
      data: { 
        verified: true, 
        verifiedAt: new Date() 
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[OTP] Validation error:', error);
    return { success: false, error: 'Failed to verify OTP. Please try again.' };
  }
}

/**
 * Normalize phone number to international format
 * Uganda: +256 or 0 prefix
 */
function normalizePhone(phone: string): string {
  // Remove spaces and dashes
  let normalized = phone.replace(/[\s\-]/g, '');
  
  // Handle local format (0XXX...)
  if (normalized.startsWith('0')) {
    normalized = '+256' + normalized.substring(1);
  }
  
  // Handle without + prefix
  if (normalized.startsWith('256') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

/**
 * Validate Ugandan phone number
 */
function isValidUgandanPhone(phone: string): boolean {
  // Uganda phone numbers: +256 7X XXX XXXX or +256 4X XXX XXXX
  const ugandanPhoneRegex = /^\+256(7\d|4\d)\d{7}$/;
  return ugandanPhoneRegex.test(phone);
}

/**
 * Check if phone is verified (for registration flow)
 */
export async function isPhoneVerified(phone: string, purpose: OTPPurpose): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone);
  
  const verifiedOTP = await db.oTP.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      verified: true,
      expiresAt: { gt: new Date(Date.now() - 30 * 60 * 1000) }, // Verified within last 30 mins
    },
  });
  
  return !!verifiedOTP;
}

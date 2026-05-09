/**
 * Admin Safety Enhancements
 * 
 * Provides additional security for admin operations:
 * - Confirmation tokens for critical actions
 * - Admin action cooldown periods
 * - Sensitive action logging
 * - Session re-validation for critical operations
 * - IP-based admin restrictions
 * - Admin action rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export type CriticalAction = 
  // User management
  | 'DELETE_USER'
  | 'BAN_USER'
  | 'CHANGE_USER_ROLE'
  | 'RESET_USER_PASSWORD'
  | 'MODIFY_USER_BALANCE'
  // Rider management
  | 'APPROVE_RIDER'
  | 'REJECT_RIDER'
  | 'SUSPEND_RIDER'
  | 'TERMINATE_RIDER'
  // Merchant management
  | 'APPROVE_MERCHANT'
  | 'REJECT_MERCHANT'
  | 'SUSPEND_MERCHANT'
  // Financial
  | 'PROCESS_PAYOUT'
  | 'REFUND_PAYMENT'
  | 'ADJUST_BALANCE'
  | 'VIEW_FINANCIAL_DATA'
  // System
  | 'CREATE_ADMIN'
  | 'MODIFY_SYSTEM_CONFIG'
  | 'VIEW_AUDIT_LOGS'
  | 'EXPORT_DATA'
  | 'BULK_OPERATION';

export interface AdminActionConfirmation {
  token: string;
  action: CriticalAction;
  adminId: string;
  targetId?: string;
  targetEntity?: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AdminActionResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  confirmationToken?: string;
  cooldownRemaining?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const ACTION_CONFIG: Record<CriticalAction, {
  requiresConfirmation: boolean;
  confirmationTtl: number; // seconds
  cooldown: number; // seconds between same action
  requiresPassword: boolean;
  logLevel: 'standard' | 'elevated' | 'critical';
}> = {
  // User management - HIGH RISK
  DELETE_USER: {
    requiresConfirmation: true,
    confirmationTtl: 300, // 5 minutes
    cooldown: 60,
    requiresPassword: true,
    logLevel: 'critical',
  },
  BAN_USER: {
    requiresConfirmation: true,
    confirmationTtl: 180, // 3 minutes
    cooldown: 30,
    requiresPassword: true,
    logLevel: 'critical',
  },
  CHANGE_USER_ROLE: {
    requiresConfirmation: true,
    confirmationTtl: 120,
    cooldown: 30,
    requiresPassword: true,
    logLevel: 'critical',
  },
  RESET_USER_PASSWORD: {
    requiresConfirmation: true,
    confirmationTtl: 60,
    cooldown: 60,
    requiresPassword: true,
    logLevel: 'critical',
  },
  MODIFY_USER_BALANCE: {
    requiresConfirmation: true,
    confirmationTtl: 120,
    cooldown: 30,
    requiresPassword: true,
    logLevel: 'critical',
  },
  
  // Rider management - MEDIUM RISK
  APPROVE_RIDER: {
    requiresConfirmation: true,
    confirmationTtl: 120,
    cooldown: 10,
    requiresPassword: false,
    logLevel: 'elevated',
  },
  REJECT_RIDER: {
    requiresConfirmation: true,
    confirmationTtl: 120,
    cooldown: 10,
    requiresPassword: false,
    logLevel: 'elevated',
  },
  SUSPEND_RIDER: {
    requiresConfirmation: true,
    confirmationTtl: 120,
    cooldown: 30,
    requiresPassword: true,
    logLevel: 'critical',
  },
  TERMINATE_RIDER: {
    requiresConfirmation: true,
    confirmationTtl: 300,
    cooldown: 300,
    requiresPassword: true,
    logLevel: 'critical',
  },
  
  // Merchant management - MEDIUM RISK
  APPROVE_MERCHANT: {
    requiresConfirmation: true,
    confirmationTtl: 120,
    cooldown: 10,
    requiresPassword: false,
    logLevel: 'elevated',
  },
  REJECT_MERCHANT: {
    requiresConfirmation: true,
    confirmationTtl: 120,
    cooldown: 10,
    requiresPassword: false,
    logLevel: 'elevated',
  },
  SUSPEND_MERCHANT: {
    requiresConfirmation: true,
    confirmationTtl: 120,
    cooldown: 30,
    requiresPassword: true,
    logLevel: 'critical',
  },
  
  // Financial - HIGHEST RISK
  PROCESS_PAYOUT: {
    requiresConfirmation: true,
    confirmationTtl: 180,
    cooldown: 60,
    requiresPassword: true,
    logLevel: 'critical',
  },
  REFUND_PAYMENT: {
    requiresConfirmation: true,
    confirmationTtl: 180,
    cooldown: 30,
    requiresPassword: true,
    logLevel: 'critical',
  },
  ADJUST_BALANCE: {
    requiresConfirmation: true,
    confirmationTtl: 300,
    cooldown: 60,
    requiresPassword: true,
    logLevel: 'critical',
  },
  VIEW_FINANCIAL_DATA: {
    requiresConfirmation: false,
    confirmationTtl: 0,
    cooldown: 0,
    requiresPassword: false,
    logLevel: 'elevated',
  },
  
  // System - HIGHEST RISK
  CREATE_ADMIN: {
    requiresConfirmation: true,
    confirmationTtl: 600, // 10 minutes
    cooldown: 300,
    requiresPassword: true,
    logLevel: 'critical',
  },
  MODIFY_SYSTEM_CONFIG: {
    requiresConfirmation: true,
    confirmationTtl: 300,
    cooldown: 60,
    requiresPassword: true,
    logLevel: 'critical',
  },
  VIEW_AUDIT_LOGS: {
    requiresConfirmation: false,
    confirmationTtl: 0,
    cooldown: 0,
    requiresPassword: false,
    logLevel: 'standard',
  },
  EXPORT_DATA: {
    requiresConfirmation: true,
    confirmationTtl: 300,
    cooldown: 300,
    requiresPassword: true,
    logLevel: 'critical',
  },
  BULK_OPERATION: {
    requiresConfirmation: true,
    confirmationTtl: 300,
    cooldown: 60,
    requiresPassword: true,
    logLevel: 'critical',
  },
};

// In-memory store for confirmation tokens (use Redis in production)
const confirmationTokens = new Map<string, AdminActionConfirmation>();
const cooldownTracker = new Map<string, { lastAction: Date; count: number }>();

// ============================================================================
// Confirmation Token Management
// ============================================================================

/**
 * Generate a confirmation token for a critical action
 */
export function generateConfirmationToken(
  action: CriticalAction,
  adminId: string,
  targetId?: string,
  targetEntity?: string,
  metadata?: Record<string, unknown>
): string {
  const config = ACTION_CONFIG[action];
  
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  
  const confirmation: AdminActionConfirmation = {
    token,
    action,
    adminId,
    targetId,
    targetEntity,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + config.confirmationTtl * 1000),
    metadata,
  };
  
  confirmationTokens.set(token, confirmation);
  
  return token;
}

/**
 * Validate a confirmation token
 */
export function validateConfirmationToken(
  token: string,
  action: CriticalAction,
  adminId: string
): { valid: boolean; confirmation?: AdminActionConfirmation; error?: string } {
  const confirmation = confirmationTokens.get(token);
  
  if (!confirmation) {
    return { valid: false, error: 'Invalid confirmation token' };
  }
  
  if (confirmation.action !== action) {
    return { valid: false, error: 'Token does not match action' };
  }
  
  if (confirmation.adminId !== adminId) {
    return { valid: false, error: 'Token does not belong to this admin' };
  }
  
  if (confirmation.expiresAt < new Date()) {
    confirmationTokens.delete(token);
    return { valid: false, error: 'Confirmation token has expired' };
  }
  
  // Token is valid - delete it (one-time use)
  confirmationTokens.delete(token);
  
  return { valid: true, confirmation };
}

/**
 * Clean up expired tokens
 */
export function cleanupExpiredTokens(): void {
  const now = new Date();
  for (const [token, confirmation] of confirmationTokens.entries()) {
    if (confirmation.expiresAt < now) {
      confirmationTokens.delete(token);
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

// ============================================================================
// Cooldown Management
// ============================================================================

/**
 * Check if admin is in cooldown for an action
 */
export function checkCooldown(
  action: CriticalAction,
  adminId: string
): { inCooldown: boolean; remainingSeconds: number } {
  const config = ACTION_CONFIG[action];
  if (config.cooldown === 0) {
    return { inCooldown: false, remainingSeconds: 0 };
  }
  
  const key = `${action}:${adminId}`;
  const tracker = cooldownTracker.get(key);
  
  if (!tracker) {
    return { inCooldown: false, remainingSeconds: 0 };
  }
  
  const elapsed = Date.now() - tracker.lastAction.getTime();
  const remaining = config.cooldown * 1000 - elapsed;
  
  if (remaining <= 0) {
    cooldownTracker.delete(key);
    return { inCooldown: false, remainingSeconds: 0 };
  }
  
  return { inCooldown: true, remainingSeconds: Math.ceil(remaining / 1000) };
}

/**
 * Record an action for cooldown tracking
 */
export function recordAction(action: CriticalAction, adminId: string): void {
  const key = `${action}:${adminId}`;
  const tracker = cooldownTracker.get(key);
  
  cooldownTracker.set(key, {
    lastAction: new Date(),
    count: (tracker?.count || 0) + 1,
  });
}

// ============================================================================
// Main Admin Action Validator
// ============================================================================

/**
 * Validate if an admin can perform a critical action
 */
export async function validateAdminAction(
  action: CriticalAction,
  adminId: string,
  request: NextRequest,
  confirmationToken?: string,
  targetId?: string
): Promise<AdminActionResult> {
  const config = ACTION_CONFIG[action];
  
  // Step 1: Check cooldown
  const cooldownStatus = checkCooldown(action, adminId);
  if (cooldownStatus.inCooldown) {
    return {
      allowed: false,
      reason: `Action is on cooldown. Please wait ${cooldownStatus.remainingSeconds} seconds.`,
      cooldownRemaining: cooldownStatus.remainingSeconds,
    };
  }
  
  // Step 2: Check if confirmation is required
  if (config.requiresConfirmation) {
    if (!confirmationToken) {
      // Generate a new confirmation token
      const token = generateConfirmationToken(action, adminId, targetId);
      
      return {
        allowed: false,
        requiresConfirmation: true,
        confirmationToken: token,
        reason: `This action requires confirmation. Use the provided token within ${Math.ceil(config.confirmationTtl / 60)} minutes.`,
      };
    }
    
    // Validate the confirmation token
    const validation = validateConfirmationToken(confirmationToken, action, adminId);
    if (!validation.valid) {
      return {
        allowed: false,
        reason: validation.error,
      };
    }
  }
  
  // Step 3: Log the action attempt
  await logAdminActionAttempt(action, adminId, request, targetId);
  
  // Step 4: Record action for cooldown
  recordAction(action, adminId);
  
  return { allowed: true };
}

// ============================================================================
// Admin Action Logging
// ============================================================================

/**
 * Log an admin action attempt
 */
async function logAdminActionAttempt(
  action: CriticalAction,
  adminId: string,
  request: NextRequest,
  targetId?: string
): Promise<void> {
  const config = ACTION_CONFIG[action];
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    await db.auditLog.create({
      data: {
        action: `ADMIN_${action}`,
        entityType: 'system',
        entityId: targetId || adminId,
        actorType: 'ADMIN',
        actorId: adminId,
        userId: adminId,
        description: `Admin action: ${action.replace(/_/g, ' ')}`,
        ipAddress,
        userAgent,
        newValues: JSON.stringify({
          action,
          logLevel: config.logLevel,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error('[ADMIN_SAFETY] Failed to log admin action:', error);
  }
}

// ============================================================================
// IP-Based Restrictions
// ============================================================================

/**
 * Allowed IP ranges for admin access (CIDR notation)
 * Configure this in your environment
 */
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS
  ? process.env.ADMIN_ALLOWED_IPS.split(',').map(ip => ip.trim())
  : [];

/**
 * Check if IP is in allowed range for admin access
 */
export function isAdminIpAllowed(request: NextRequest): boolean {
  // If no restrictions configured, allow all
  if (ADMIN_ALLOWED_IPS.length === 0) {
    return true;
  }
  
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   request.headers.get('x-real-ip') ||
                   '127.0.0.1';
  
  // Simple IP check (for production, use proper CIDR matching)
  return ADMIN_ALLOWED_IPS.some(allowedIp => {
    if (allowedIp.includes('/')) {
      // CIDR notation - simplified check
      const [network] = allowedIp.split('/');
      return clientIp.startsWith(network.substring(0, network.lastIndexOf('.')));
    }
    return clientIp === allowedIp;
  });
}

// ============================================================================
// Middleware Wrappers
// ============================================================================

/**
 * Wrap an API handler with admin safety checks
 */
export function withAdminSafety(
  action: CriticalAction,
  handler: (req: NextRequest, context: { adminId: string; confirmation?: AdminActionConfirmation }) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get admin ID from auth context (assumes requireAdmin was already called)
    const adminId = req.headers.get('x-admin-id');
    
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Admin authentication required' },
        { status: 401 }
      );
    }
    
    // Check IP restriction
    if (!isAdminIpAllowed(req)) {
      return NextResponse.json(
        { success: false, error: 'Admin access not allowed from this IP address' },
        { status: 403 }
      );
    }
    
    // Get confirmation token from request
    const body = await req.clone().json().catch(() => ({}));
    const confirmationToken = body._confirmationToken || req.headers.get('x-confirmation-token');
    
    // Validate the action
    const validation = await validateAdminAction(action, adminId, req, confirmationToken);
    
    if (!validation.allowed) {
      const response: Record<string, unknown> = {
        success: false,
        error: validation.reason,
      };
      
      if (validation.requiresConfirmation) {
        response.requiresConfirmation = true;
        response.confirmationToken = validation.confirmationToken;
      }
      
      if (validation.cooldownRemaining) {
        response.cooldownRemaining = validation.cooldownRemaining;
      }
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Execute the handler
    return handler(req, { adminId });
  };
}

/**
 * Require password re-entry for critical actions
 */
export async function verifyAdminPassword(
  adminId: string,
  password: string
): Promise<boolean> {
  try {
    const admin = await db.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'] },
      },
      select: { passwordHash: true },
    });
    
    if (!admin?.passwordHash) {
      return false;
    }
    
    // Use your password verification function here
    // This is a placeholder - implement actual password verification
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, admin.passwordHash);
  } catch (error) {
    console.error('[ADMIN_SAFETY] Password verification failed:', error);
    return false;
  }
}

// ============================================================================
// Admin Session Management
// ============================================================================

const ADMIN_SESSION_TIMEOUT = parseInt(process.env.ADMIN_SESSION_TIMEOUT || '1800', 10); // 30 minutes default
const adminSessions = new Map<string, { lastActivity: Date; ipAddress: string }>();

/**
 * Track admin session activity
 */
export function trackAdminSession(adminId: string, ipAddress: string): void {
  adminSessions.set(adminId, {
    lastActivity: new Date(),
    ipAddress,
  });
}

/**
 * Check if admin session is still valid
 */
export function isAdminSessionValid(adminId: string): boolean {
  const session = adminSessions.get(adminId);
  
  if (!session) {
    return false;
  }
  
  const elapsed = Date.now() - session.lastActivity.getTime();
  return elapsed < ADMIN_SESSION_TIMEOUT * 1000;
}

/**
 * Invalidate admin session
 */
export function invalidateAdminSession(adminId: string): void {
  adminSessions.delete(adminId);
}

// ============================================================================
// Export Critical Actions List
// ============================================================================

export const CRITICAL_ACTIONS = Object.keys(ACTION_CONFIG) as CriticalAction[];

export function getActionConfig(action: CriticalAction) {
  return ACTION_CONFIG[action];
}

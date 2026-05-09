/**
 * Security Audit Logging System
 * 
 * Tracks all security-relevant events:
 * - Authentication attempts (success/failure)
 * - Admin actions
 * - Payment updates
 * - Rider approvals
 * - Critical system changes
 * 
 * Uses the existing AuditLog model from Prisma schema
 */

import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  // Authentication
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'TOKEN_INVALIDATED'
  | 'OTP_SENT'
  | 'OTP_VERIFIED'
  | 'OTP_FAILED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUEST'
  | 'SESSION_TERMINATED'
  // Admin Actions
  | 'ADMIN_USER_CREATE'
  | 'ADMIN_USER_UPDATE'
  | 'ADMIN_USER_DELETE'
  | 'ADMIN_ROLE_CHANGE'
  | 'ADMIN_RIDER_APPROVE'
  | 'ADMIN_RIDER_REJECT'
  | 'ADMIN_MERCHANT_APPROVE'
  | 'ADMIN_MERCHANT_REJECT'
  | 'ADMIN_SYSTEM_CONFIG'
  // Payment Events
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CALLBACK_RECEIVED'
  | 'PAYMENT_CALLBACK_DUPLICATE'
  | 'PAYMENT_SIGNATURE_INVALID'
  // Security Events
  | 'RATE_LIMIT_EXCEEDED'
  | 'IP_BLOCKED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'IDOR_ATTEMPT_BLOCKED'
  | 'WEBHOOK_SIGNATURE_VALID'
  | 'WEBHOOK_SIGNATURE_INVALID';

export type EntityType = 
  | 'user' 
  | 'rider' 
  | 'merchant' 
  | 'order' 
  | 'task' 
  | 'payment' 
  | 'prescription' 
  | 'session' 
  | 'system';

export type ActorType = 'USER' | 'RIDER' | 'MERCHANT' | 'ADMIN' | 'SYSTEM';

export interface AuditLogEntry {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  actorType: ActorType;
  actorId?: string;
  userId?: string;
  riderId?: string;
  merchantId?: string;
  orderId?: string;
  taskId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

// ============================================================================
// Audit Logger
// ============================================================================

class SecurityAuditLogger {
  private queue: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly batchSize = 50;
  private readonly flushIntervalMs = 5000; // 5 seconds

  constructor() {
    // Start flush interval
    if (typeof setInterval !== 'undefined') {
      this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
    }
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    this.queue.push(entry);

    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Flush queued entries to database
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const entries = [...this.queue];
    this.queue = [];

    try {
      // Write to database in batch
      await db.auditLog.createMany({
        data: entries.map(entry => ({
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          actorType: entry.actorType,
          actorId: entry.actorId,
          userId: entry.userId,
          riderId: entry.riderId,
          merchantId: entry.merchantId,
          orderId: entry.orderId,
          taskId: entry.taskId,
          description: entry.description,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      console.error('[AUDIT] Failed to flush audit logs:', error);
      // Re-queue failed entries
      this.queue.unshift(...entries);
    }
  }

  /**
   * Log immediately (for critical events)
   */
  async logImmediate(entry: AuditLogEntry): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          actorType: entry.actorType,
          actorId: entry.actorId,
          userId: entry.userId,
          riderId: entry.riderId,
          merchantId: entry.merchantId,
          orderId: entry.orderId,
          taskId: entry.taskId,
          description: entry.description,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
        },
      });
    } catch (error) {
      console.error('[AUDIT] Failed to log immediate entry:', error);
    }
  }

  /**
   * Query audit logs
   */
  async query(params: {
    userId?: string;
    action?: AuditAction;
    entityType?: EntityType;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) (where.createdAt as Record<string, Date>).gte = params.startDate;
      if (params.endDate) (where.createdAt as Record<string, Date>).lte = params.endDate;
    }

    return db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 100,
      skip: params.offset || 0,
    });
  }
}

// Singleton instance
export const securityAudit = new SecurityAuditLogger();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract IP and User-Agent from request
 */
export function getRequestContext(req: NextRequest): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') ||
               'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  action: AuditAction,
  req: NextRequest,
  params: {
    userId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const { ipAddress, userAgent } = getRequestContext(req);

  await securityAudit.log({
    action,
    entityType: 'user',
    entityId: params.userId || 'unknown',
    actorType: params.userId ? 'USER' : 'SYSTEM',
    actorId: params.userId,
    userId: params.userId,
    ipAddress,
    userAgent,
    description: action.replace(/_/g, ' ').toLowerCase(),
    newValues: params.details,
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(
  action: AuditAction,
  req: NextRequest,
  params: {
    adminId: string;
    entityType: EntityType;
    entityId: string;
    description?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  }
): Promise<void> {
  const { ipAddress, userAgent } = getRequestContext(req);

  // Log immediately for admin actions
  await securityAudit.logImmediate({
    action,
    entityType: params.entityType,
    entityId: params.entityId,
    actorType: 'ADMIN',
    actorId: params.adminId,
    userId: params.adminId,
    description: params.description || action.replace(/_/g, ' ').toLowerCase(),
    ipAddress,
    userAgent,
    oldValues: params.oldValues,
    newValues: params.newValues,
  });
}

/**
 * Log security event (rate limit, suspicious activity, etc.)
 */
export async function logSecurityEvent(
  action: AuditAction,
  req: NextRequest,
  params: {
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const { ipAddress, userAgent } = getRequestContext(req);

  await securityAudit.logImmediate({
    action,
    entityType: 'system',
    entityId: 'system',
    actorType: 'SYSTEM',
    ipAddress,
    userAgent,
    description: action.replace(/_/g, ' ').toLowerCase(),
    newValues: params.details,
  });
}

/**
 * Expanded Audit Log Service
 *
 * Comprehensive audit logging for all Smart Ride operations:
 * - Payment events (initiated, completed, failed, refunded)
 * - Refund events with amount and reason
 * - Dispatch failures (no riders, all rejected, timeout)
 * - Rider actions (verification, suspension, rejection)
 * - Admin actions (override, manual dispatch, approval)
 * - Verification actions (merchant/rider verification)
 * - Fraud detection events
 * - Query and summary capabilities
 *
 * All logs are persisted to the AuditLog model with proper
 * actorType, action, entityType, entityId, oldValues, newValues.
 */

import { db } from '@/lib/db';
import { ActorType } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface PaymentEventParams {
  paymentId: string;
  userId: string;
  taskId?: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  provider?: string;
  status: 'INITIATED' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  failureReason?: string;
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefundEventParams {
  paymentId: string;
  userId: string;
  taskId?: string;
  orderId?: string;
  amount: number;
  currency?: string;
  reason: string;
  refundedBy: string;
  actorType?: ActorType;
  originalTransactionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DispatchFailureParams {
  taskId: string;
  taskType: string;
  failureType: 'NO_RIDERS_AVAILABLE' | 'ALL_REJECTED' | 'TIMEOUT' | 'SYSTEM_ERROR';
  attemptCount?: number;
  riderIdsRejected?: string[];
  searchRadiusKm?: number;
  matchingDurationMs?: number;
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RiderActionParams {
  riderId: string;
  userId?: string;
  action: 'VERIFIED' | 'SUSPENDED' | 'REJECTED' | 'REINSTATED' | 'APPROVED' | 'DOCUMENT_UPLOADED';
  reason?: string;
  performedBy: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AdminActionParams {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string;
  reason?: string;
  taskId?: string;
  orderId?: string;
  riderId?: string;
  userId?: string;
  merchantId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerificationActionParams {
  entityType: 'MERCHANT' | 'RIDER' | 'HEALTH_PROVIDER';
  entityId: string;
  action: 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'RESUBMISSION_REQUESTED';
  performedBy: string;
  actorType?: ActorType;
  verificationNotes?: string;
  previousStatus?: string;
  newStatus?: string;
  documentType?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface FraudEventParams {
  alertId?: string;
  userId?: string;
  riderId?: string;
  taskId?: string;
  orderId?: string;
  alertType: string;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  indicators?: Record<string, unknown>;
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQueryFilters {
  entityType?: string;
  action?: string;
  actorId?: string;
  actorType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  taskId?: string;
  orderId?: string;
  userId?: string;
  riderId?: string;
  merchantId?: string;
}

export interface AuditSummaryItem {
  action: string;
  count: number;
}

export interface AuditSummary {
  totalLogs: number;
  byAction: AuditSummaryItem[];
  byEntityType: { entityType: string; count: number }[];
  byActorType: { actorType: string; count: number }[];
  dateRange: { start: Date; end: Date };
}

// ============================================
// Expanded Audit Log Service
// ============================================

export class ExpandedAuditLogService {
  // --------------------------------------------
  // 1. Payment Event Logging
  // --------------------------------------------

  /**
   * Log a payment event (initiated, completed, failed, refunded)
   */
  static async logPaymentEvent(params: PaymentEventParams): Promise<void> {
    try {
      const actionMap: Record<string, string> = {
        INITIATED: 'PAYMENT_INITIATED',
        COMPLETED: 'PAYMENT_COMPLETED',
        FAILED: 'PAYMENT_FAILED',
        REFUNDED: 'PAYMENT_REFUNDED',
      };

      const oldValues: Record<string, unknown> = {
        paymentId: params.paymentId,
        amount: params.amount,
        currency: params.currency || 'UGX',
        paymentMethod: params.paymentMethod,
      };

      const newValues: Record<string, unknown> = {
        status: params.status,
        amount: params.amount,
        currency: params.currency || 'UGX',
        paymentMethod: params.paymentMethod,
        provider: params.provider,
      };

      if (params.failureReason) {
        newValues.failureReason = params.failureReason;
      }

      await db.auditLog.create({
        data: {
          actorId: params.actorId || params.userId,
          actorType: params.actorId ? 'ADMIN' : 'USER',
          userId: params.userId,
          taskId: params.taskId,
          action: actionMap[params.status] || 'PAYMENT_EVENT',
          entityType: 'Payment',
          entityId: params.paymentId,
          description: `Payment ${params.status.toLowerCase()}: ${params.amount} ${params.currency || 'UGX'} via ${params.paymentMethod}${params.failureReason ? ` - ${params.failureReason}` : ''}`,
          oldValues: JSON.stringify(oldValues),
          newValues: JSON.stringify(newValues),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          source: params.actorId ? 'ADMIN_DASHBOARD' : 'API',
        },
      });
    } catch (error) {
      console.error('[ExpandedAuditLog] Failed to log payment event:', error);
    }
  }

  // --------------------------------------------
  // 2. Refund Event Logging
  // --------------------------------------------

  /**
   * Log a refund event with amount and reason
   */
  static async logRefundEvent(params: RefundEventParams): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          actorId: params.refundedBy,
          actorType: params.actorType || 'SYSTEM',
          userId: params.userId,
          taskId: params.taskId,
          orderId: params.orderId,
          action: 'REFUND_PROCESSED',
          entityType: 'Payment',
          entityId: params.paymentId,
          description: `Refund processed: ${params.amount} ${params.currency || 'UGX'} - Reason: ${params.reason}`,
          oldValues: JSON.stringify({
            paymentId: params.paymentId,
            status: 'COMPLETED',
            amount: params.amount,
          }),
          newValues: JSON.stringify({
            paymentId: params.paymentId,
            status: 'REFUNDED',
            refundAmount: params.amount,
            currency: params.currency || 'UGX',
            reason: params.reason,
            refundedBy: params.refundedBy,
            originalTransactionId: params.originalTransactionId,
          }),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          source: params.actorType === 'ADMIN' ? 'ADMIN_DASHBOARD' : 'SYSTEM',
        },
      });
    } catch (error) {
      console.error('[ExpandedAuditLog] Failed to log refund event:', error);
    }
  }

  // --------------------------------------------
  // 3. Dispatch Failure Logging
  // --------------------------------------------

  /**
   * Log dispatch failures (no riders available, all rejected, timeout)
   */
  static async logDispatchFailure(params: DispatchFailureParams): Promise<void> {
    try {
      const newValues: Record<string, unknown> = {
        taskId: params.taskId,
        taskType: params.taskType,
        failureType: params.failureType,
        attemptCount: params.attemptCount,
        searchRadiusKm: params.searchRadiusKm,
        matchingDurationMs: params.matchingDurationMs,
      };

      if (params.riderIdsRejected && params.riderIdsRejected.length > 0) {
        newValues.riderIdsRejected = params.riderIdsRejected;
        newValues.rejectedCount = params.riderIdsRejected.length;
      }

      await db.auditLog.create({
        data: {
          actorId: params.actorId,
          actorType: 'SYSTEM',
          taskId: params.taskId,
          action: `DISPATCH_FAILURE_${params.failureType}`,
          entityType: 'Task',
          entityId: params.taskId,
          description: `Dispatch failed for task ${params.taskId}: ${params.failureType}${params.attemptCount ? ` (attempt ${params.attemptCount})` : ''}${params.matchingDurationMs ? ` after ${params.matchingDurationMs}ms` : ''}`,
          newValues: JSON.stringify(newValues),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          source: 'SYSTEM',
        },
      });
    } catch (error) {
      console.error('[ExpandedAuditLog] Failed to log dispatch failure:', error);
    }
  }

  // --------------------------------------------
  // 4. Rider Action Logging
  // --------------------------------------------

  /**
   * Log rider verification, suspension, rejection events
   */
  static async logRiderAction(params: RiderActionParams): Promise<void> {
    try {
      const actionMap: Record<string, string> = {
        VERIFIED: 'RIDER_VERIFIED',
        SUSPENDED: 'RIDER_SUSPENDED',
        REJECTED: 'RIDER_REJECTED',
        REINSTATED: 'RIDER_REINSTATED',
        APPROVED: 'RIDER_APPROVED',
        DOCUMENT_UPLOADED: 'RIDER_DOCUMENT_UPLOADED',
      };

      await db.auditLog.create({
        data: {
          actorId: params.performedBy,
          actorType: 'ADMIN',
          userId: params.userId,
          riderId: params.riderId,
          action: actionMap[params.action] || `RIDER_${params.action}`,
          entityType: 'Rider',
          entityId: params.riderId,
          description: `Rider ${params.action.toLowerCase()}: ${params.riderId}${params.reason ? ` - ${params.reason}` : ''}`,
          oldValues: JSON.stringify({
            status: params.previousStatus,
            riderId: params.riderId,
            ...(params.metadata || {}),
          }),
          newValues: JSON.stringify({
            status: params.newStatus,
            riderId: params.riderId,
            action: params.action,
            reason: params.reason,
            ...(params.metadata || {}),
          }),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          source: 'ADMIN_DASHBOARD',
        },
      });
    } catch (error) {
      console.error('[ExpandedAuditLog] Failed to log rider action:', error);
    }
  }

  // --------------------------------------------
  // 5. Admin Action Logging
  // --------------------------------------------

  /**
   * Log admin actions (override, manual dispatch, approval)
   */
  static async logAdminAction(params: AdminActionParams): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          actorId: params.adminId,
          actorType: 'ADMIN',
          userId: params.userId,
          riderId: params.riderId,
          merchantId: params.merchantId,
          taskId: params.taskId,
          orderId: params.orderId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          description: params.description || `Admin action: ${params.action} on ${params.entityType} ${params.entityId}${params.reason ? ` - Reason: ${params.reason}` : ''}`,
          oldValues: params.oldValues ? JSON.stringify(params.oldValues) : undefined,
          newValues: params.newValues ? JSON.stringify(params.newValues) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          source: 'ADMIN_DASHBOARD',
        },
      });
    } catch (error) {
      console.error('[ExpandedAuditLog] Failed to log admin action:', error);
    }
  }

  // --------------------------------------------
  // 6. Verification Action Logging
  // --------------------------------------------

  /**
   * Log merchant/rider verification events
   */
  static async logVerificationAction(params: VerificationActionParams): Promise<void> {
    try {
      const actorType = params.actorType || 'ADMIN';
      const sourceMap: Record<string, string> = {
        ADMIN: 'ADMIN_DASHBOARD',
        SYSTEM: 'SYSTEM',
        USER: 'MOBILE_APP',
        RIDER: 'MOBILE_APP',
        MERCHANT: 'API',
      };

      const entityIdForRelation = params.entityType === 'MERCHANT'
        ? undefined
        : params.entityType === 'RIDER'
          ? undefined
          : undefined;

      await db.auditLog.create({
        data: {
          actorId: params.performedBy,
          actorType,
          action: `VERIFICATION_${params.action}`,
          entityType: params.entityType,
          entityId: params.entityId,
          description: `${params.entityType} verification ${params.action.toLowerCase()}: ${params.entityId}${params.verificationNotes ? ` - ${params.verificationNotes}` : ''}`,
          oldValues: JSON.stringify({
            status: params.previousStatus,
            documentType: params.documentType,
          }),
          newValues: JSON.stringify({
            status: params.newStatus,
            action: params.action,
            verificationNotes: params.verificationNotes,
            documentType: params.documentType,
          }),
          ...(params.entityType === 'MERCHANT' ? { merchantId: params.entityId } : {}),
          ...(params.entityType === 'RIDER' ? { riderId: params.entityId } : {}),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          source: sourceMap[actorType] || 'SYSTEM',
        },
      });
    } catch (error) {
      console.error('[ExpandedAuditLog] Failed to log verification action:', error);
    }
  }

  // --------------------------------------------
  // 7. Fraud Event Logging
  // --------------------------------------------

  /**
   * Log fraud detection events
   */
  static async logFraudEvent(params: FraudEventParams): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          actorId: params.actorId,
          actorType: 'SYSTEM',
          userId: params.userId,
          riderId: params.riderId,
          taskId: params.taskId,
          orderId: params.orderId,
          action: 'FRAUD_DETECTED',
          entityType: 'FraudAlert',
          entityId: params.alertId || `fraud-${Date.now()}`,
          description: `Fraud detected: ${params.alertType} (severity: ${params.severity}, risk: ${params.riskScore}) - ${params.description}`,
          oldValues: JSON.stringify({
            alertType: params.alertType,
            riskScore: params.riskScore,
            severity: params.severity,
          }),
          newValues: JSON.stringify({
            alertId: params.alertId,
            alertType: params.alertType,
            riskScore: params.riskScore,
            severity: params.severity,
            description: params.description,
            indicators: params.indicators,
            userId: params.userId,
            riderId: params.riderId,
            taskId: params.taskId,
            orderId: params.orderId,
          }),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          source: 'SYSTEM',
        },
      });
    } catch (error) {
      console.error('[ExpandedAuditLog] Failed to log fraud event:', error);
    }
  }

  // --------------------------------------------
  // 8. Query Audit Logs
  // --------------------------------------------

  /**
   * Query audit logs with filters
   */
  static async queryAuditLogs(filters: AuditLogQueryFilters) {
    const where: Record<string, unknown> = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.actorType) where.actorType = filters.actorType;
    if (filters.taskId) where.taskId = filters.taskId;
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.riderId) where.riderId = filters.riderId;
    if (filters.merchantId) where.merchantId = filters.merchantId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
      if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      db.auditLog.count({ where }),
    ]);

    return { logs, total, limit: filters.limit || 100, offset: filters.offset || 0 };
  }

  // --------------------------------------------
  // 9. Audit Summary
  // --------------------------------------------

  /**
   * Get summary counts of audit events by type for a date range
   */
  static async getAuditSummary(dateRange: { start: Date; end: Date }): Promise<AuditSummary> {
    const where = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    const [totalLogs, byActionRaw, byEntityTypeRaw, byActorTypeRaw] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      db.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: { entityType: true },
        orderBy: { _count: { entityType: 'desc' } },
      }),
      db.auditLog.groupBy({
        by: ['actorType'],
        where,
        _count: { actorType: true },
        orderBy: { _count: { actorType: 'desc' } },
      }),
    ]);

    return {
      totalLogs,
      byAction: byActionRaw.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      byEntityType: byEntityTypeRaw.map(item => ({
        entityType: item.entityType,
        count: item._count.entityType,
      })),
      byActorType: byActorTypeRaw.map(item => ({
        actorType: item.actorType,
        count: item._count.actorType,
      })),
      dateRange,
    };
  }
}

export default ExpandedAuditLogService;

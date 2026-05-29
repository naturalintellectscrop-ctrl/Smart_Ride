/**
 * Fraud Prevention Service
 *
 * Proactive fraud PREVENTION (distinct from fraud detection).
 * This service checks for suspicious patterns BEFORE they cause harm:
 *
 * - Repeated failed payments → block user
 * - Suspicious cancellation rates → flag user
 * - Dispatch abuse (mass rejections) → flag rider
 * - Risk assessment combining all checks
 * - User blocking with audit trail
 *
 * All checks query REAL database data. No mock data.
 */

import { db } from '@/lib/db';
import { AlertSeverity, FraudAlertType } from '@prisma/client';
import { ExpandedAuditLogService } from '@/lib/audit/expanded-audit-log.service';

// ============================================
// Types
// ============================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CheckResult {
  passed: boolean;
  riskLevel: RiskLevel;
  message: string;
  details: Record<string, unknown>;
}

export interface RiskAssessment {
  overallRiskLevel: RiskLevel;
  overallRiskScore: number;
  checks: {
    repeatedFailedPayments?: CheckResult;
    suspiciousCancellations?: CheckResult;
    dispatchAbuse?: CheckResult;
  };
  recommendedAction: 'NONE' | 'FLAG' | 'HOLD' | 'SUSPEND';
  timestamp: Date;
}

// ============================================
// Fraud Prevention Service
// ============================================

export class FraudPreventionService {
  // --------------------------------------------
  // 1. Check Repeated Failed Payments
  // --------------------------------------------

  /**
   * Count failed payments in last 24 hours.
   * If > 3, create FraudAlert and return blocked.
   */
  static async checkRepeatedFailedPayments(userId: string): Promise<CheckResult> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const failedPaymentCount = await db.payment.count({
      where: {
        userId,
        status: 'FAILED',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    const blocked = failedPaymentCount > 3;
    const riskLevel: RiskLevel =
      failedPaymentCount > 10 ? 'CRITICAL' :
      failedPaymentCount > 5 ? 'HIGH' :
      failedPaymentCount > 3 ? 'MEDIUM' :
      'LOW';

    if (blocked) {
      // Create FraudAlert
      try {
        await db.fraudAlert.create({
          data: {
            userId,
            alertType: 'PAYMENT_ANOMALY' as FraudAlertType,
            riskScore: Math.min(100, failedPaymentCount * 10),
            severity: riskLevel as AlertSeverity,
            description: `User has ${failedPaymentCount} failed payments in the last 24 hours (threshold: 3)`,
            indicators: JSON.stringify({
              failedPaymentCount,
              window: '24h',
              threshold: 3,
            }),
          },
        });

        // Log the fraud event
        await ExpandedAuditLogService.logFraudEvent({
          userId,
          alertType: 'REPEATED_FAILED_PAYMENTS',
          riskScore: Math.min(100, failedPaymentCount * 10),
          severity: riskLevel,
          description: `User blocked due to ${failedPaymentCount} failed payments in 24h`,
          indicators: {
            failedPaymentCount,
            window: '24h',
            threshold: 3,
          },
        });
      } catch (error) {
        console.error('[FraudPrevention] Failed to create fraud alert for repeated failed payments:', error);
      }
    }

    return {
      passed: !blocked,
      riskLevel,
      message: blocked
        ? `Blocked: ${failedPaymentCount} failed payments in last 24h (threshold: 3)`
        : `${failedPaymentCount} failed payments in last 24h — within acceptable range`,
      details: {
        failedPaymentCount,
        window: '24h',
        threshold: 3,
        blocked,
      },
    };
  }

  // --------------------------------------------
  // 2. Check Suspicious Cancellations
  // --------------------------------------------

  /**
   * Count cancellations in last 7 days.
   * If cancellation rate > 50% and > 5 tasks, create FraudAlert.
   */
  static async checkSuspiciousCancellations(userId: string): Promise<CheckResult> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalTasks, cancelledTasks] = await Promise.all([
      db.task.count({
        where: {
          clientId: userId,
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      db.task.count({
        where: {
          clientId: userId,
          status: 'CANCELLED',
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
    ]);

    const cancellationRate = totalTasks > 0 ? cancelledTasks / totalTasks : 0;
    const isSuspicious = cancellationRate > 0.5 && totalTasks > 5;

    const riskLevel: RiskLevel =
      cancellationRate > 0.8 && totalTasks > 10 ? 'CRITICAL' :
      cancellationRate > 0.7 && totalTasks > 5 ? 'HIGH' :
      isSuspicious ? 'MEDIUM' :
      'LOW';

    if (isSuspicious) {
      try {
        await db.fraudAlert.create({
          data: {
            userId,
            alertType: 'UNUSUAL_PATTERN' as FraudAlertType,
            riskScore: Math.min(100, Math.round(cancellationRate * 100)),
            severity: riskLevel as AlertSeverity,
            description: `Suspicious cancellation rate: ${(cancellationRate * 100).toFixed(1)}% (${cancelledTasks}/${totalTasks}) in last 7 days`,
            indicators: JSON.stringify({
              cancellationRate,
              cancelledTasks,
              totalTasks,
              window: '7d',
              thresholds: { rate: 0.5, minTasks: 5 },
            }),
          },
        });

        await ExpandedAuditLogService.logFraudEvent({
          userId,
          alertType: 'SUSPICIOUS_CANCELLATIONS',
          riskScore: Math.min(100, Math.round(cancellationRate * 100)),
          severity: riskLevel,
          description: `User flagged for ${(cancellationRate * 100).toFixed(1)}% cancellation rate (${cancelledTasks}/${totalTasks}) in 7 days`,
          indicators: {
            cancellationRate,
            cancelledTasks,
            totalTasks,
            window: '7d',
          },
        });
      } catch (error) {
        console.error('[FraudPrevention] Failed to create fraud alert for suspicious cancellations:', error);
      }
    }

    return {
      passed: !isSuspicious,
      riskLevel,
      message: isSuspicious
        ? `Flagged: ${(cancellationRate * 100).toFixed(1)}% cancellation rate (${cancelledTasks}/${totalTasks}) in 7 days`
        : `Cancellation rate ${(cancellationRate * 100).toFixed(1)}% (${cancelledTasks}/${totalTasks}) — within acceptable range`,
      details: {
        cancellationRate,
        cancelledTasks,
        totalTasks,
        window: '7d',
        isSuspicious,
        thresholds: { rate: 0.5, minTasks: 5 },
      },
    };
  }

  // --------------------------------------------
  // 3. Check Dispatch Abuse
  // --------------------------------------------

  /**
   * Count dispatch rejections in last 24 hours.
   * If > 10 rejections, create FraudAlert.
   */
  static async checkDispatchAbuse(riderId: string): Promise<CheckResult> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rejectionCount = await db.dispatchMatch.count({
      where: {
        riderId,
        status: 'REJECTED',
        rejectedAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    const totalDispatchCount = await db.dispatchMatch.count({
      where: {
        riderId,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    const isAbusive = rejectionCount > 10;
    const riskLevel: RiskLevel =
      rejectionCount > 30 ? 'CRITICAL' :
      rejectionCount > 20 ? 'HIGH' :
      rejectionCount > 10 ? 'MEDIUM' :
      'LOW';

    if (isAbusive) {
      try {
        await db.fraudAlert.create({
          data: {
            riderId,
            alertType: 'UNUSUAL_PATTERN' as FraudAlertType,
            riskScore: Math.min(100, rejectionCount * 3),
            severity: riskLevel as AlertSeverity,
            description: `Dispatch abuse: ${rejectionCount} rejections in last 24 hours (threshold: 10)`,
            indicators: JSON.stringify({
              rejectionCount,
              totalDispatchCount,
              rejectionRate: totalDispatchCount > 0 ? rejectionCount / totalDispatchCount : 0,
              window: '24h',
              threshold: 10,
            }),
          },
        });

        await ExpandedAuditLogService.logFraudEvent({
          riderId,
          alertType: 'DISPATCH_ABUSE',
          riskScore: Math.min(100, rejectionCount * 3),
          severity: riskLevel,
          description: `Rider flagged for ${rejectionCount} dispatch rejections in 24h`,
          indicators: {
            rejectionCount,
            totalDispatchCount,
            window: '24h',
          },
        });
      } catch (error) {
        console.error('[FraudPrevention] Failed to create fraud alert for dispatch abuse:', error);
      }
    }

    return {
      passed: !isAbusive,
      riskLevel,
      message: isAbusive
        ? `Flagged: ${rejectionCount} dispatch rejections in 24h (threshold: 10)`
        : `${rejectionCount} dispatch rejections in 24h — within acceptable range`,
      details: {
        rejectionCount,
        totalDispatchCount,
        rejectionRate: totalDispatchCount > 0 ? rejectionCount / totalDispatchCount : 0,
        window: '24h',
        threshold: 10,
        isAbusive,
      },
    };
  }

  // --------------------------------------------
  // 4. Assess Risk (Combined)
  // --------------------------------------------

  /**
   * Run all applicable checks and return a combined risk assessment.
   */
  static async assessRisk(userId?: string, riderId?: string): Promise<RiskAssessment> {
    const checks: RiskAssessment['checks'] = {};
    let maxRiskScore = 0;
    let overallRiskLevel: RiskLevel = 'LOW';

    const checkPromises: Promise<void>[] = [];

    if (userId) {
      checkPromises.push(
        this.checkRepeatedFailedPayments(userId).then(result => {
          checks.repeatedFailedPayments = result;
          const score = this.riskLevelToScore(result.riskLevel);
          if (score > maxRiskScore) maxRiskScore = score;
        }),
        this.checkSuspiciousCancellations(userId).then(result => {
          checks.suspiciousCancellations = result;
          const score = this.riskLevelToScore(result.riskLevel);
          if (score > maxRiskScore) maxRiskScore = score;
        }),
      );
    }

    if (riderId) {
      checkPromises.push(
        this.checkDispatchAbuse(riderId).then(result => {
          checks.dispatchAbuse = result;
          const score = this.riskLevelToScore(result.riskLevel);
          if (score > maxRiskScore) maxRiskScore = score;
        }),
      );
    }

    await Promise.all(checkPromises);

    // Determine overall risk level from max score
    if (maxRiskScore >= 80) overallRiskLevel = 'CRITICAL';
    else if (maxRiskScore >= 60) overallRiskLevel = 'HIGH';
    else if (maxRiskScore >= 30) overallRiskLevel = 'MEDIUM';
    else overallRiskLevel = 'LOW';

    // Determine recommended action
    let recommendedAction: RiskAssessment['recommendedAction'] = 'NONE';
    if (overallRiskLevel === 'CRITICAL') recommendedAction = 'SUSPEND';
    else if (overallRiskLevel === 'HIGH') recommendedAction = 'HOLD';
    else if (overallRiskLevel === 'MEDIUM') recommendedAction = 'FLAG';

    return {
      overallRiskLevel,
      overallRiskScore: maxRiskScore,
      checks,
      recommendedAction,
      timestamp: new Date(),
    };
  }

  // --------------------------------------------
  // 5. Block User
  // --------------------------------------------

  /**
   * Set user status to SUSPENDED and create FraudAlert + AuditLog.
   */
  static async blockUser(userId: string, reason: string, blockedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user status
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { status: true, email: true, name: true },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.status === 'SUSPENDED') {
        return { success: false, error: 'User is already suspended' };
      }

      // Update user status
      await db.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });

      // Create FraudAlert with CRITICAL severity
      await db.fraudAlert.create({
        data: {
          userId,
          alertType: 'ACCOUNT_TAKEOVER' as FraudAlertType,
          riskScore: 100,
          severity: 'CRITICAL' as AlertSeverity,
          description: `User blocked by ${blockedBy}: ${reason}`,
          indicators: JSON.stringify({
            previousStatus: user.status,
            blockedBy,
            reason,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      // Create audit log
      await ExpandedAuditLogService.logAdminAction({
        adminId: blockedBy,
        action: 'USER_BLOCKED',
        entityType: 'User',
        entityId: userId,
        userId,
        description: `User ${user.name} (${user.email}) blocked: ${reason}`,
        reason,
        oldValues: { status: user.status },
        newValues: { status: 'SUSPENDED' },
      });

      return { success: true };
    } catch (error) {
      console.error('[FraudPrevention] Failed to block user:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // --------------------------------------------
  // Helper: Risk Level to Score
  // --------------------------------------------

  private static riskLevelToScore(level: RiskLevel): number {
    switch (level) {
      case 'CRITICAL': return 90;
      case 'HIGH': return 65;
      case 'MEDIUM': return 35;
      case 'LOW': return 5;
      default: return 0;
    }
  }
}

export default FraudPreventionService;

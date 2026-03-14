import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/fraud/alerts - Get fraud alerts with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const entityType = searchParams.get('entityType');
    const alertType = searchParams.get('alertType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (entityType) where.entityType = entityType;
    if (alertType) where.alertType = alertType;

    const alerts = await db.fraudAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.fraudAlert.count({ where });

    return NextResponse.json({
      alerts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + alerts.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fraud alerts' },
      { status: 500 }
    );
  }
}

// POST /api/fraud/alerts - Create a new fraud alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,
      entityId,
      alertType,
      severity,
      detectionMethod,
      detectedPatterns,
      evidence,
      relatedActivityIds,
      confidenceScore,
      falsePositiveRisk,
    } = body;

    // Get current risk score
    let riskScore = await db.fraudRiskScore.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    const alert = await db.fraudAlert.create({
      data: {
        alertNumber: `FRA-${Date.now()}`,
        entityType,
        entityId,
        alertType,
        severity: severity || 'MEDIUM',
        detectionMethod: detectionMethod || 'RULE_BASED',
        detectedPatterns: detectedPatterns ? JSON.stringify(detectedPatterns) : null,
        riskScoreAtDetection: riskScore?.riskScore || 0,
        evidence: evidence ? JSON.stringify(evidence) : null,
        relatedActivityIds: relatedActivityIds ? JSON.stringify(relatedActivityIds) : null,
        confidenceScore,
        falsePositiveRisk,
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error creating fraud alert:', error);
    return NextResponse.json(
      { error: 'Failed to create fraud alert' },
      { status: 500 }
    );
  }
}

// PATCH /api/fraud/alerts - Update fraud alert (review/resolve)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, action, adminId, notes } = body;

    const alert = await db.fraudAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'review':
        updateData = {
          status: 'UNDER_REVIEW',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: notes,
        };
        break;

      case 'resolve':
        updateData = {
          status: 'RESOLVED',
          resolvedBy: adminId,
          resolvedAt: new Date(),
          resolutionNotes: notes,
        };
        break;

      case 'dismiss':
        updateData = {
          status: 'DISMISSED',
          resolvedBy: adminId,
          resolvedAt: new Date(),
          resolutionNotes: notes,
          isFalsePositive: true,
        };
        // Record for ML feedback
        await recordMLFeedback(alert, true);
        break;

      case 'escalate':
        updateData = {
          status: 'ESCALATED',
          severity: 'CRITICAL',
        };
        break;

      case 'take_action':
        const { adminDecision } = body;
        updateData = {
          adminDecision,
          resolvedBy: adminId,
          resolvedAt: new Date(),
          resolutionAction: adminDecision,
          resolutionNotes: notes,
        };
        // Apply the action to the entity
        await applyAdminAction(alert.entityType, alert.entityId, adminDecision, adminId, notes);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedAlert = await db.fraudAlert.update({
      where: { id: alertId },
      data: updateData,
    });

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error('Error updating fraud alert:', error);
    return NextResponse.json(
      { error: 'Failed to update fraud alert' },
      { status: 500 }
    );
  }
}

// Apply admin action to entity
async function applyAdminAction(
  entityType: string,
  entityId: string,
  action: string,
  adminId: string,
  notes?: string
) {
  const actionMap: Record<string, string> = {
    'WARNING_ISSUED': 'warning',
    'TEMPORARY_RESTRICTION': 'restriction',
    'ACCOUNT_FROZEN': 'frozen',
    'IDENTITY_REVERIFICATION': 'reverification_required',
    'ACCOUNT_SUSPENDED': 'suspended',
    'ACCOUNT_BANNED': 'banned',
  };

  // Create admin action record
  await db.adminFraudAction.create({
    data: {
      entityType: entityType as any,
      entityId,
      actionType: action as any,
      actionReason: notes,
      adminId,
      durationHours: action === 'TEMPORARY_RESTRICTION' ? 72 : null,
      expiresAt: action === 'TEMPORARY_RESTRICTION' 
        ? new Date(Date.now() + 72 * 60 * 60 * 1000) 
        : null,
    },
  });

  // Apply to entity
  switch (entityType) {
    case 'CLIENT':
      if (action === 'ACCOUNT_SUSPENDED' || action === 'ACCOUNT_BANNED') {
        await db.user.update({
          where: { id: entityId },
          data: { status: action === 'ACCOUNT_BANNED' ? 'BANNED' : 'SUSPENDED' },
        });
      }
      break;

    case 'RIDER':
      if (action === 'ACCOUNT_SUSPENDED' || action === 'ACCOUNT_BANNED') {
        await db.rider.update({
          where: { id: entityId },
          data: { status: 'SUSPENDED' },
        });
      }
      break;

    case 'MERCHANT':
      if (action === 'ACCOUNT_SUSPENDED' || action === 'ACCOUNT_BANNED') {
        await db.merchant.update({
          where: { id: entityId },
          data: { status: 'SUSPENDED' },
        });
      }
      break;

    case 'PHARMACY':
      if (action === 'ACCOUNT_SUSPENDED' || action === 'ACCOUNT_BANNED') {
        await db.pharmacy.update({
          where: { id: entityId },
          data: { status: 'SUSPENDED' },
        });
      }
      break;
  }
}

// Record ML feedback for improving detection
async function recordMLFeedback(alert: any, isFalsePositive: boolean) {
  // Update the alert
  await db.fraudAlert.update({
    where: { id: alert.id },
    data: {
      mlFeedbackGiven: true,
      isFalsePositive,
    },
  });

  // Update pattern statistics if patterns were detected
  if (alert.detectedPatterns) {
    const patterns = JSON.parse(alert.detectedPatterns);
    for (const patternCode of patterns) {
      const pattern = await db.fraudPattern.findUnique({
        where: { patternCode },
      });
      if (pattern) {
        await db.fraudPattern.update({
          where: { patternCode },
          data: {
            truePositiveCount: isFalsePositive ? pattern.truePositiveCount : pattern.truePositiveCount + 1,
            falsePositiveCount: isFalsePositive ? pattern.falsePositiveCount + 1 : pattern.falsePositiveCount,
            lastAccuracyUpdate: new Date(),
          },
        });
      }
    }
  }
}

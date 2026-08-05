import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { Prisma, FraudAlertStatus, AlertSeverity, FraudAlertType } from '@prisma/client';
import { createAuditLog } from '@/lib/api/audit';
import { requireAdmin } from '@/lib/auth/guards';

/**
 * None of GET/POST/PATCH had any authentication. GET exposed every fraud
 * alert (flagged users/riders, risk scores, descriptions) to anonymous
 * callers. Worse: PATCH's `take_action` case calls applyAdminAction(), which
 * can SUSPEND or BAN a client/rider/merchant/pharmacy account — so an
 * unauthenticated request could ban any account on the platform. This is the
 * admin dashboard's Fraud tab; it requires an admin.
 */
function guardAdmin(request: NextRequest) {
  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error || 'Admin access required' },
      { status: authResult.statusCode || 403 }
    );
  }
  return null;
}

// GET /api/fraud/alerts - Get fraud alerts with filtering
export async function GET(request: NextRequest) {
  const denied = guardAdmin(request);
  if (denied) return denied;

  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const alertType = searchParams.get('alertType');
    const userId = searchParams.get('userId');
    const riderId = searchParams.get('riderId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // FraudAlert has no entityType/entityId columns — filtering on them made
    // Prisma throw, so any filtered request 500'd. It links to the subject via
    // userId/riderId/taskId/orderId.
    const where: Prisma.FraudAlertWhereInput = {};
    if (status) where.status = status as FraudAlertStatus;
    if (severity) where.severity = severity as AlertSeverity;
    if (alertType) where.alertType = alertType as FraudAlertType;
    if (userId) where.userId = userId;
    if (riderId) where.riderId = riderId;

    const alerts = await db.fraudAlert.findMany({
      where,
      // The admin table shows the subject's name; without these the column
      // always fell through to "N/A".
      include: {
        user: { select: { name: true } },
        rider: { select: { fullName: true } },
      },
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
    return NextResponse.json({ success: false, error: 'Failed to fetch fraud alerts' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST /api/fraud/alerts - Create a new fraud alert
export async function POST(request: NextRequest) {
  const denied = guardAdmin(request);
  if (denied) return denied;

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const {
      userId,
      riderId,
      taskId,
      orderId,
      alertType,
      severity,
      description,
      indicators,
      riskScore,
    } = body;

    if (!alertType || !description) {
      return NextResponse.json(
        { success: false, error: 'alertType and description are required' },
        { status: 400 }
      );
    }

    // Written against the columns FraudAlert actually has. The previous body
    // set alertNumber/entityType/entityId/detectionMethod/detectedPatterns/
    // riskScoreAtDetection/evidence/relatedActivityIds/confidenceScore/
    // falsePositiveRisk — none of which exist — and read a FraudRiskScore
    // model that is not in the schema, so creating an alert always threw.
    const alert = await db.fraudAlert.create({
      data: {
        userId: userId || null,
        riderId: riderId || null,
        taskId: taskId || null,
        orderId: orderId || null,
        alertType,
        severity: severity || 'MEDIUM',
        description,
        indicators: indicators ? JSON.stringify(indicators) : null,
        riskScore: typeof riskScore === 'number' ? riskScore : 0,
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error creating fraud alert:', error);
    return NextResponse.json({ success: false, error: 'Failed to create fraud alert' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// PATCH /api/fraud/alerts - Update fraud alert (review/resolve)
export async function PATCH(request: NextRequest) {
  const denied = guardAdmin(request);
  if (denied) return denied;

  await setServiceRoleContext();
  try {
    const body = await request.json();
    const { alertId, action, adminId, notes } = body;

    const alert = await db.fraudAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return NextResponse.json({ success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'review':
        updateData = {
          status: 'UNDER_REVIEW',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: notes,
        };
        break;

      // FraudAlert has no resolvedBy/resolvedAt/isFalsePositive/adminDecision/
      // resolutionAction columns, and no DISMISSED/ESCALATED status — writing
      // them made Prisma throw, so every triage action below failed. Mapped
      // onto the columns that exist: reviewedBy/reviewedAt/resolution/
      // resolutionNotes and the real FraudAlertStatus values.
      case 'resolve':
        updateData = {
          status: 'RESOLVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          resolutionNotes: notes,
        };
        break;

      case 'dismiss':
        updateData = {
          status: 'FALSE_POSITIVE',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          resolution: 'DISMISSED',
          resolutionNotes: notes,
        };
        break;

      case 'escalate':
        // No ESCALATED status exists; an escalation is an open alert raised
        // to CRITICAL for triage.
        updateData = {
          status: 'UNDER_REVIEW',
          severity: 'CRITICAL',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          resolutionNotes: notes,
        };
        break;

      case 'take_action': {
        const { adminDecision } = body;
        updateData = {
          status: 'CONFIRMED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          resolution: adminDecision,
          resolutionNotes: notes,
        };
        // Derive the target from the alert's own FK columns — there is no
        // entityType/entityId on FraudAlert.
        const [entityType, entityId] = alert.riderId
          ? (['RIDER', alert.riderId] as const)
          : alert.userId
            ? (['CLIENT', alert.userId] as const)
            : ([null, null] as const);
        if (entityType && entityId) {
          await applyAdminAction(entityType, entityId, adminDecision, adminId, notes);
        }
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' },
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
    return NextResponse.json({ success: false, error: 'Failed to update fraud alert' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
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

  // There is no AdminFraudAction model in the schema, so the action record
  // that used to be written here could never persist. Record it in AuditLog,
  // which exists and is the platform's audit surface.
  await createAuditLog({
    action: 'FRAUD_ADMIN_ACTION',
    entityType: entityType as string,
    entityId,
    actorType: 'ADMIN',
    actorId: adminId,
    description: `Fraud action ${action} applied to ${entityType} ${entityId}${notes ? `: ${notes}` : ''}`,
    source: 'ADMIN_DASHBOARD',
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

// recordMLFeedback was removed: it wrote FraudAlert.mlFeedbackGiven /
// .isFalsePositive and read the FraudPattern model, none of which exist in
// the schema, so it could only ever throw. Dismissing an alert now records
// FALSE_POSITIVE status directly. Reinstate ML feedback alongside a real
// FraudPattern model if that feature is built.

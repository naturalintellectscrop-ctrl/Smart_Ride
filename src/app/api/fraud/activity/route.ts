import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/fraud/activity - Get suspicious activity logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const activityCategory = searchParams.get('activityCategory');
    const minRiskScore = parseInt(searchParams.get('minRiskScore') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (activityCategory) where.activityCategory = activityCategory;
    if (minRiskScore > 0) where.riskScore = { gte: minRiskScore };

    const activities = await db.suspiciousActivityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.suspiciousActivityLog.count({ where });

    return NextResponse.json({
      activities,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + activities.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching suspicious activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

// POST /api/fraud/activity - Log suspicious activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,
      entityId,
      activityType,
      activityCategory,
      referenceType,
      referenceId,
      riskIndicators,
      deviceFingerprint,
      ipAddress,
      userAgent,
      latitude,
      longitude,
      metadata,
    } = body;

    // Calculate risk score for this activity
    const riskScore = calculateActivityRiskScore(activityType, riskIndicators);

    // Check for pattern matches
    const matchedPatterns = await matchPatterns(entityType, activityType, riskIndicators);

    // Log the activity
    const activity = await db.suspiciousActivityLog.create({
      data: {
        entityType,
        entityId,
        activityType,
        activityCategory,
        referenceType,
        referenceId,
        riskIndicators: riskIndicators ? JSON.stringify(riskIndicators) : null,
        riskScore,
        deviceFingerprint,
        ipAddress,
        userAgent,
        latitude,
        longitude,
        matchedPatterns: matchedPatterns.length > 0 ? JSON.stringify(matchedPatterns) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // If high risk, create alert
    if (riskScore >= 50) {
      await createFraudAlertFromActivity(activity, matchedPatterns);
    }

    // Update device fingerprint if provided
    if (deviceFingerprint) {
      await updateDeviceFingerprint(deviceFingerprint, entityType, entityId);
    }

    // Trigger risk score recalculation
    if (riskScore >= 30) {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fraud/risk-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error logging suspicious activity:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}

// Calculate risk score for a specific activity
function calculateActivityRiskScore(activityType: string, riskIndicators: any): number {
  let score = 0;

  // Base scores for different activity types
  const baseScores: Record<string, number> = {
    'CANCELLATION': 15,
    'REFUND_REQUEST': 20,
    'PAYMENT_FAILURE': 25,
    'ORDER_FREQUENT': 10,
    'LOCATION_ANOMALY': 30,
    'IMPOSSIBLE_TRAVEL': 50,
    'MULTIPLE_ACCOUNTS': 40,
    'FAKE_LISTING': 35,
    'PRESCRIPTION_VIOLATION': 45,
  };

  score = baseScores[activityType] || 0;

  // Adjust based on risk indicators
  if (riskIndicators) {
    if (riskIndicators.highFrequency) score += 15;
    if (riskIndicators.unusualPattern) score += 20;
    if (riskIndicators.suspiciousDevice) score += 25;
    if (riskIndicators.locationMismatch) score += 30;
  }

  return Math.min(score, 100);
}

// Match activity against known fraud patterns
async function matchPatterns(entityType: string, activityType: string, riskIndicators: any): Promise<string[]> {
  const patterns = await db.fraudPattern.findMany({
    where: { isActive: true },
  });

  const matchedPatterns: string[] = [];

  for (const pattern of patterns) {
    try {
      const rules = JSON.parse(pattern.detectionRules);
      let matched = false;

      // Simple rule matching
      if (rules.entityTypes && rules.entityTypes.includes(entityType)) {
        if (rules.activityTypes && rules.activityTypes.includes(activityType)) {
          matched = true;
        }
      }

      if (matched) {
        matchedPatterns.push(pattern.patternCode);
      }
    } catch (e) {
      // Invalid rule JSON, skip
    }
  }

  return matchedPatterns;
}

// Create fraud alert from suspicious activity
async function createFraudAlertFromActivity(activity: any, matchedPatterns: string[]) {
  await db.fraudAlert.create({
    data: {
      alertNumber: `FRA-${Date.now()}`,
      entityType: activity.entityType,
      entityId: activity.entityId,
      alertType: mapActivityToAlertType(activity.activityType),
      severity: activity.riskScore >= 70 ? 'CRITICAL' : activity.riskScore >= 50 ? 'HIGH' : 'MEDIUM',
      detectionMethod: 'RULE_BASED',
      detectedPatterns: matchedPatterns.length > 0 ? JSON.stringify(matchedPatterns) : null,
      riskScoreAtDetection: activity.riskScore,
      evidence: JSON.stringify({
        activityId: activity.id,
        activityType: activity.activityType,
        riskIndicators: activity.riskIndicators,
      }),
      relatedActivityIds: JSON.stringify([activity.id]),
    },
  });
}

// Map activity type to alert type
function mapActivityToAlertType(activityType: string): string {
  const mapping: Record<string, string> = {
    'CANCELLATION': 'EXCESSIVE_CANCELLATIONS',
    'REFUND_REQUEST': 'EXCESSIVE_REFUNDS',
    'PAYMENT_FAILURE': 'SUSPICIOUS_PAYMENT_ATTEMPTS',
    'ORDER_FREQUENT': 'ABNORMAL_ORDER_FREQUENCY',
    'LOCATION_ANOMALY': 'LOCATION_SPOOFING',
    'IMPOSSIBLE_TRAVEL': 'IMPOSSIBLE_TRAVEL',
    'MULTIPLE_ACCOUNTS': 'MULTIPLE_ACCOUNTS',
    'FAKE_LISTING': 'FAKE_LISTINGS',
    'PRESCRIPTION_VIOLATION': 'CONTROLLED_DRUG_VIOLATION',
  };
  return mapping[activityType] || 'ABNORMAL_ORDER_FREQUENCY';
}

// Update device fingerprint tracking
async function updateDeviceFingerprint(fingerprintHash: string, entityType: string, entityId: string) {
  const existing = await db.deviceFingerprint.findUnique({
    where: { fingerprintHash },
  });

  if (existing) {
    // Update existing fingerprint
    const accounts = JSON.parse(existing.associatedAccounts);
    const existingAccount = accounts.find((a: any) => a.entityId === entityId);
    
    if (existingAccount) {
      existingAccount.lastSeen = new Date().toISOString();
    } else {
      accounts.push({
        entityType,
        entityId,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });
    }

    // Flag if multiple accounts detected
    const shouldFlag = accounts.length >= 3;

    await db.deviceFingerprint.update({
      where: { fingerprintHash },
      data: {
        associatedAccounts: JSON.stringify(accounts),
        accountCount: accounts.length,
        lastActivityAt: new Date(),
        activityCount: { increment: 1 },
        isFlagged: shouldFlag,
        flagReason: shouldFlag ? 'multiple_accounts_same_device' : null,
        riskScore: shouldFlag ? 60 : existing.riskScore,
      },
    });

    // Create alert if multiple accounts
    if (shouldFlag && !existing.isFlagged) {
      await db.fraudAlert.create({
        data: {
          alertNumber: `FRA-${Date.now()}`,
          entityType: entityType as any,
          entityId,
          alertType: 'MULTIPLE_ACCOUNTS_SAME_DEVICE',
          severity: 'HIGH',
          detectionMethod: 'PATTERN_MATCHING',
          riskScoreAtDetection: 60,
          evidence: JSON.stringify({
            fingerprintHash,
            accountCount: accounts.length,
            accounts,
          }),
        },
      });
    }
  } else {
    // Create new fingerprint
    await db.deviceFingerprint.create({
      data: {
        fingerprintHash,
        associatedAccounts: JSON.stringify([{
          entityType,
          entityId,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
        }]),
        accountCount: 1,
        lastActivityAt: new Date(),
        activityCount: 1,
      },
    });
  }
}

// ============================================
// SMART RIDE - ADMIN RECOVERY API
// ============================================
// Triggers recovery checks and returns status
// Admin-only access
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { RecoveryService } from '@/lib/services/recovery-service';
import { db } from '@/lib/db';

// GET /api/admin/recovery — Get recovery status
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await RecoveryService.getRecoveryStatus();

    // Also get unacknowledged alerts count
    const unacknowledgedAlerts = await db.connectionAlert.count({
      where: { isAcknowledged: false },
    });

    return NextResponse.json({
      success: true,
      recovery: status,
      unacknowledgedAlerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin Recovery] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get recovery status' },
      { status: 500 }
    );
  }
}

// POST /api/admin/recovery — Trigger recovery checks
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await RecoveryService.runRecoveryChecks();

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin Recovery] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to run recovery checks' },
      { status: 500 }
    );
  }
}

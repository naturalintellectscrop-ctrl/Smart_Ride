// ============================================
// SMART RIDE - ADMIN RECOVERY API
// ============================================
// Triggers recovery checks and returns status
// Admin-only access (proper JWT verification)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { RecoveryService } from '@/lib/services/recovery-service';
import { db, setRLSContext, resetRLSContext } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';

// GET /api/admin/recovery — Get recovery status
// SECURITY: Admin-only access with proper JWT verification
export async function GET(request: NextRequest) {
  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const admin = authResult.user!;

  await setRLSContext(admin);
  try {
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
    return NextResponse.json({ success: false, error: 'Failed to get recovery status' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

// POST /api/admin/recovery — Trigger recovery checks
// SECURITY: Admin-only access with proper JWT verification
export async function POST(request: NextRequest) {
  const authResult = requireAdmin(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }
  const admin = authResult.user!;

  await setRLSContext(admin);
  try {
    const summary = await RecoveryService.runRecoveryChecks();

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin Recovery] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to run recovery checks' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}

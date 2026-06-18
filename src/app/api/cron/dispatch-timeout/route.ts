// ============================================
// SMART RIDE - CRON: DISPATCH TIMEOUT PROCESSOR
// ============================================
// Vercel Cron endpoint that runs every minute to process
// expired dispatch matches and re-trigger stuck tasks.
//
// Security: Requires X-Cron-Secret header matching CRON_SECRET env var.
//           Falls back to allowing in development mode if CRON_SECRET is not set.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';

/**
 * Verify that the request is from an authorized cron source.
 * Checks X-Cron-Secret header or Authorization Bearer token against CRON_SECRET.
 * If CRON_SECRET is not set, allows in development mode only.
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // In development, allow without secret
    return process.env.NODE_ENV === 'development';
  }
  const providedSecret = request.headers.get('x-cron-secret') ||
                         request.headers.get('authorization')?.replace('Bearer ', '');
  return providedSecret === cronSecret;
}

/**
 * GET /api/cron/dispatch-timeout
 *
 * Processes expired dispatch matches:
 * 1. Finds all PENDING matches past their expiresAt timestamp
 * 2. Marks them as EXPIRED
 * 3. Attempts to reassign the task to a different rider
 * 4. Finds tasks stuck in MATCHING/SEARCHING with no active matches
 * 5. Re-triggers dispatch for those stuck tasks
 *
 * Runs every 1 minute via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  // Verify cron authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — invalid or missing cron secret' },
      { status: 401 }
    );
  }

  try {
    await setServiceRoleContext();
  } catch {
    // RLS context fails gracefully when DB is unavailable (e.g. no PostgreSQL in dev)
  }

  try {
    const startTime = Date.now();
    console.log('[Cron:DispatchTimeout] Starting expired dispatch match processing...');

    // Run the expired match processing
    const processedCount = await DispatchService.processExpiredMatches();

    const durationMs = Date.now() - startTime;
    console.log(`[Cron:DispatchTimeout] Processed ${processedCount} expired/stuck entries in ${durationMs}ms`);

    // Log the processing run for monitoring
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'CRON_DISPATCH_TIMEOUT',
          entityType: 'System',
          entityId: 'dispatch-timeout-cron',
          description: `Cron: Processed ${processedCount} expired/stuck dispatch entries in ${durationMs}ms`,
          source: 'CRON',
          newValues: JSON.stringify({
            processedCount,
            durationMs,
            triggeredBy: 'vercel-cron',
          }),
        },
      });
    } catch (auditError) {
      console.warn('[Cron:DispatchTimeout] Failed to write audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[Cron:DispatchTimeout] Error processing expired matches:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  } finally {
    try { await resetRLSContext(); } catch { /* ignore when DB unavailable */ }
  }
}

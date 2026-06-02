// ============================================
// SMART RIDE - PROCESS EXPIRED DISPATCH MATCHES
// ============================================
// Internal cron endpoint for processing expired dispatch matches.
// Called periodically (every 30 seconds) by the dispatch-service
// or an external scheduler.
//
// Security: Requires INTERNAL_API_KEY header for service-to-service auth
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DispatchService } from '@/lib/services/dispatch-persistence.service';
import { db } from '@/lib/db';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024';

/**
 * POST /api/dispatch/process-expired
 * 
 * Process expired dispatch matches. This endpoint:
 * 1. Finds all PENDING matches past their expiresAt timestamp
 * 2. Marks them as EXPIRED
 * 3. Attempts to reassign the task to a different rider
 * 4. Finds tasks stuck in MATCHING/SEARCHING with no active matches
 * 5. Re-triggers dispatch for those stuck tasks
 * 
 * Headers:
 * - X-Internal-Key: Internal API key for service authentication
 * 
 * Response:
 * - processed: Number of expired/stuck entries processed
 * - timestamp: When the processing ran
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const providedKey = request.headers.get('X-Internal-Key');
    if (!providedKey || providedKey !== INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid internal API key' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    console.log('[ProcessExpired] Starting expired match processing...');

    // Run the expired match processing
    const processedCount = await DispatchService.processExpiredMatches();

    const durationMs = Date.now() - startTime;

    // Log the processing run for monitoring
    await db.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'EXPIRED_MATCH_PROCESSING',
        entityType: 'System',
        entityId: 'dispatch-processor',
        description: `Processed ${processedCount} expired/stuck dispatch entries in ${durationMs}ms`,
        source: 'SYSTEM',
        newValues: JSON.stringify({
          processedCount,
          durationMs,
          triggeredBy: 'cron',
        }),
      },
    });

    return NextResponse.json({
      success: true,
      processed: processedCount,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ProcessExpired] Error processing expired matches:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process expired matches' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dispatch/process-expired
 * Health check endpoint - returns processing stats without actually processing
 */
export async function GET(request: NextRequest) {
  try {
    // Verify internal API key
    const providedKey = request.headers.get('X-Internal-Key');
    if (!providedKey || providedKey !== INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid internal API key' },
        { status: 401 }
      );
    }

    // Count expired matches that need processing
    const { DispatchMatchStatus, TaskStatus } = await import('@prisma/client');
    
    const expiredPendingCount = await db.dispatchMatch.count({
      where: {
        status: DispatchMatchStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
    });

    const stuckTasksCount = await db.task.count({
      where: {
        status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
        matchingStartedAt: { lt: new Date(Date.now() - 60000) },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        expiredPendingMatches: expiredPendingCount,
        stuckTasks: stuckTasksCount,
        needsProcessing: expiredPendingCount + stuckTasksCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ProcessExpired] Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// SMART RIDE - CRON: CLEANUP EXPIRED SESSIONS
// ============================================
// Vercel Cron endpoint that runs every 6 hours to clean up
// expired sessions and refresh tokens from the database.
//
// Security: Requires X-Cron-Secret header matching CRON_SECRET env var.
//           Falls back to allowing in development mode if CRON_SECRET is not set.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Verify that the request is from an authorized cron source.
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development';
  }
  const providedSecret = request.headers.get('x-cron-secret') ||
                         request.headers.get('authorization')?.replace('Bearer ', '');
  return providedSecret === cronSecret;
}

/**
 * GET /api/cron/cleanup-sessions
 *
 * Cleans up expired sessions and refresh tokens:
 * 1. Deletes expired sessions (where expiresAt < now)
 * 2. Deletes expired refresh tokens (where refreshTokenExpiresAt < now)
 *
 * Runs every 6 hours via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized — invalid or missing cron secret' },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    console.log('[Cron:CleanupSessions] Starting session cleanup...');

    // 1. Delete expired sessions
    const expiredSessions = await db.session.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    // 2. Delete expired refresh tokens (users whose refreshTokenExpiresAt has passed)
    const expiredRefreshTokens = await db.user.updateMany({
      where: {
        refreshTokenExpiresAt: { lt: now },
        refreshToken: { not: null },
      },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    const totalCleaned = expiredSessions.count + expiredRefreshTokens.count;
    console.log(
      `[Cron:CleanupSessions] Cleaned ${expiredSessions.count} expired sessions, ` +
      `${expiredRefreshTokens.count} expired refresh tokens`
    );

    // Log the cleanup as an audit event
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'CRON_CLEANUP_SESSIONS',
          entityType: 'System',
          entityId: 'session-cleanup-cron',
          description: `Cron: Cleaned ${expiredSessions.count} expired sessions, ${expiredRefreshTokens.count} expired refresh tokens`,
          source: 'CRON',
          newValues: JSON.stringify({
            expiredSessions: expiredSessions.count,
            expiredRefreshTokens: expiredRefreshTokens.count,
            totalCleaned,
          }),
        },
      });
    } catch (auditError) {
      console.warn('[Cron:CleanupSessions] Failed to write audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      cleaned: {
        expiredSessions: expiredSessions.count,
        expiredRefreshTokens: expiredRefreshTokens.count,
      },
      totalCleaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[Cron:CleanupSessions] Error cleaning up sessions:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  }
}

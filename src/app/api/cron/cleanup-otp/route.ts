// ============================================
// SMART RIDE - CRON: CLEANUP EXPIRED OTP & RATE LIMITS
// ============================================
// Vercel Cron endpoint that runs every hour to clean up
// expired OTP records and stale rate limit entries.
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
 * GET /api/cron/cleanup-otp
 *
 * Cleans up expired OTP records and stale rate limit entries:
 * 1. Deletes OTP records that are expired (older than 30 minutes past their expiresAt)
 * 2. Deletes API rate limit entries older than 1 hour
 *
 * Runs every hour via Vercel Cron.
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
    console.log('[Cron:CleanupOTP] Starting OTP and rate limit cleanup...');

    // 1. Delete OTP records that are expired
    // OTPs that have passed their expiresAt timestamp are no longer valid.
    // We delete them outright (including a 30-minute grace period for auditing)
    const otpCutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const expiredOTPs = await db.oTP.deleteMany({
      where: {
        expiresAt: { lt: otpCutoff },
      },
    });

    // 2. Delete API rate limit entries older than 1 hour
    const rateLimitCutoff = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const expiredRateLimits = await db.apiRateLimit.deleteMany({
      where: {
        windowStart: { lt: rateLimitCutoff },
      },
    });

    const totalCleaned = expiredOTPs.count + expiredRateLimits.count;
    console.log(
      `[Cron:CleanupOTP] Cleaned ${expiredOTPs.count} expired OTPs, ` +
      `${expiredRateLimits.count} stale rate limit entries`
    );

    // Log the cleanup as an audit event
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'CRON_CLEANUP_OTP',
          entityType: 'System',
          entityId: 'otp-cleanup-cron',
          description: `Cron: Cleaned ${expiredOTPs.count} expired OTPs, ${expiredRateLimits.count} stale rate limit entries`,
          source: 'CRON',
          newValues: JSON.stringify({
            expiredOTPs: expiredOTPs.count,
            expiredRateLimits: expiredRateLimits.count,
            totalCleaned,
          }),
        },
      });
    } catch (auditError) {
      console.warn('[Cron:CleanupOTP] Failed to write audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      cleaned: {
        expiredOTPs: expiredOTPs.count,
        expiredRateLimits: expiredRateLimits.count,
      },
      totalCleaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[Cron:CleanupOTP] Error cleaning up OTP records:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  }
}

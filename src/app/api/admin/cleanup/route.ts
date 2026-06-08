/**
 * Admin Cleanup Endpoint
 * GET /api/admin/cleanup
 *
 * Periodic cleanup of expired sessions, expired OTPs, and old heartbeat logs.
 * Called by Vercel Cron at 3 AM daily, or manually by admins.
 *
 * Security: Requires either a valid Bearer token with ADMIN role,
 *           or a valid cronSecret query param matching CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';

// Heartbeat log retention: 90 days
const HEARTBEAT_RETENTION_DAYS = 90;

export async function GET(request: NextRequest) {
  try {
    // Auth check: either admin bearer token or cron secret
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('cronSecret');
    const isCronRequest = cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!isCronRequest) {
      const authResult = requireAdmin(request);
      if (!authResult.success) {
        return NextResponse.json({ success: false, error: authResult.error },
          { status: authResult.statusCode || 401 }
        );
      }
    }

    const now = new Date();
    const summary: Record<string, number> = {};

    // 1. Delete expired sessions (Session.expiresAt < now)
    const expiredSessions = await db.session.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    summary.expiredSessions = expiredSessions.count;

    // 2. Delete expired password reset tokens (PasswordResetToken.expiresAt < now)
    const expiredResetTokens = await db.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    summary.expiredPasswordResetTokens = expiredResetTokens.count;

    // 3. Delete old heartbeat logs (older than 90 days)
    const heartbeatCutoff = new Date();
    heartbeatCutoff.setDate(heartbeatCutoff.getDate() - HEARTBEAT_RETENTION_DAYS);

    // Delete old heartbeat logs (Prisma deleteMany does not support `take`,
    // so we batch manually by fetching IDs first)
    let totalHeartbeatsDeleted = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const batch = await db.heartbeatLog.findMany({
        where: {
          createdAt: { lt: heartbeatCutoff },
        },
        select: { id: true },
        take: batchSize,
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        const ids = batch.map(b => b.id);
        const result = await db.heartbeatLog.deleteMany({
          where: { id: { in: ids } },
        });
        totalHeartbeatsDeleted += result.count;
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }

    summary.oldHeartbeatLogs = totalHeartbeatsDeleted;

    // Log the cleanup as an audit event
    try {
      await db.auditLog.create({
        data: {
          actorType: 'SYSTEM',
          action: 'ADMIN_CLEANUP',
          entityType: 'System',
          entityId: 'cleanup',
          description: `Automated cleanup: ${JSON.stringify(summary)}`,
          source: 'CRON',
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'system',
        },
      });
    } catch (auditError) {
      console.error('Cleanup audit log creation failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      summary,
      heartbeatRetentionDays: HEARTBEAT_RETENTION_DAYS,
    });
  } catch (error) {
    console.error('Admin cleanup error:', error);
    return NextResponse.json({ success: false, error: 'Failed to perform cleanup' },
      { status: 500 }
    );
  }
}

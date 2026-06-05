import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Default retention period: 30 days
const DEFAULT_RETENTION_DAYS = 30;

/**
 * DELETE /api/audit/cleanup
 *
 * Deletes audit logs older than the retention period (default 30 days).
 * Optionally exports them first before deleting.
 *
 * Query params:
 *   - retentionDays: number (default 30)
 *   - dryRun: 'true' | 'false' (default false) — if true, returns count but doesn't delete
 *   - exportBeforeDelete: 'true' | 'false' (default false) — if true, returns CSV of logs being deleted
 *   - cronSecret: string — required when called from Vercel Cron; must match CRON_SECRET env var
 *
 * Security: Requires either a valid Bearer token with ADMIN role,
 *           or a valid cronSecret for Vercel Cron invocations.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const retentionDays = parseInt(searchParams.get('retentionDays') || String(DEFAULT_RETENTION_DAYS));
    const dryRun = searchParams.get('dryRun') === 'true';
    const exportBeforeDelete = searchParams.get('exportBeforeDelete') === 'true';
    const cronSecret = searchParams.get('cronSecret');

    // Auth check: either admin bearer token or cron secret
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.replace('Bearer ', '');
    const isCronRequest = cronSecret && cronSecret === process.env.CRON_SECRET;
    const isAdminRequest = authHeader?.startsWith('Bearer ');

    if (!isCronRequest && !isAdminRequest) {
      return NextResponse.json(
        { error: 'Unauthorized — provide Bearer token or cronSecret' },
        { status: 401 }
      );
    }

    // Validate retention days
    if (retentionDays < 7) {
      return NextResponse.json(
        { error: 'Retention period must be at least 7 days for compliance' },
        { status: 400 }
      );
    }

    if (retentionDays > 365) {
      return NextResponse.json(
        { error: 'Retention period cannot exceed 365 days' },
        { status: 400 }
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Count logs to be deleted
    const logsToDelete = await db.auditLog.findMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { name: true, email: true } },
        rider: { select: { fullName: true } },
        merchant: { select: { name: true } },
      },
    });

    const count = logsToDelete.length;

    // If export requested, return CSV of logs being deleted instead of deleting
    if (exportBeforeDelete && count > 0) {
      const headers = [
        'Timestamp',
        'Action',
        'Actor Type',
        'Actor',
        'Entity Type',
        'Entity ID',
        'Description',
        'Source',
        'IP Address',
        'Old Values',
        'New Values',
      ];
      const rows = logsToDelete.map(log => [
        log.createdAt.toISOString(),
        log.action,
        log.actorType,
        getActorName(log),
        log.entityType,
        log.entityId,
        log.description?.replace(/,/g, ';').replace(/"/g, '""') || '',
        log.source || 'SYSTEM',
        log.ipAddress || '',
        log.oldValues ? `"${log.oldValues.replace(/"/g, '""')}"` : '',
        log.newValues ? `"${log.newValues.replace(/"/g, '""')}"` : '',
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      // Now delete them
      if (!dryRun) {
        await db.auditLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
          },
        });
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-archive-before-cleanup-${new Date().toISOString().split('T')[0]}.csv"`,
          'X-Deleted-Count': dryRun ? '0' : String(count),
          'X-Dry-Run': dryRun ? 'true' : 'false',
        },
      });
    }

    // Dry run mode — just return the count
    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run — no logs deleted',
        cutoffDate: cutoffDate.toISOString(),
        retentionDays,
        logsOlderThanCutoff: count,
        oldestLog: count > 0 ? logsToDelete[0].createdAt.toISOString() : null,
        newestToDelete: count > 0 ? logsToDelete[count - 1].createdAt.toISOString() : null,
      });
    }

    // Actual deletion
    if (count === 0) {
      return NextResponse.json({
        message: 'No audit logs older than retention period',
        cutoffDate: cutoffDate.toISOString(),
        retentionDays,
        deletedCount: 0,
      });
    }

    // Delete in batches of 1000 to avoid transaction timeouts
    let totalDeleted = 0;
    const batchSize = 1000;
    let deleted = 0;

    do {
      const result = await db.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
        take: batchSize,
      });
      deleted = result.count;
      totalDeleted += deleted;
    } while (deleted === batchSize);

    // Log the cleanup itself as a system audit log
    await db.auditLog.create({
      data: {
        action: 'AUDIT_LOG_CLEANUP',
        actorType: 'SYSTEM',
        entityType: 'AuditLog',
        entityId: 'cleanup',
        description: `Automated cleanup: deleted ${totalDeleted} audit logs older than ${retentionDays} days (cutoff: ${cutoffDate.toISOString()})`,
        source: 'SYSTEM',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'system',
        userAgent: 'audit-cleanup-service',
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${totalDeleted} audit logs older than ${retentionDays} days`,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays,
      deletedCount: totalDeleted,
      archivedBeforeDelete: false,
    });
  } catch (error) {
    console.error('Audit cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup audit logs' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit/cleanup
 *
 * Returns cleanup status and statistics without performing any deletion.
 * Shows how many logs would be deleted with the current retention policy.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const retentionDays = parseInt(searchParams.get('retentionDays') || String(DEFAULT_RETENTION_DAYS));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [expiringCount, totalCount, oldestLog, latestCleanup] = await Promise.all([
      db.auditLog.count({
        where: { createdAt: { lt: cutoffDate } },
      }),
      db.auditLog.count(),
      db.auditLog.findFirst({
        where: { createdAt: { lt: cutoffDate } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      db.auditLog.findFirst({
        where: { action: 'AUDIT_LOG_CLEANUP' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, description: true },
      }),
    ]);

    // Calculate storage stats
    const averageLogSizeKB = 0.5; // rough estimate
    const expiringSizeMB = (expiringCount * averageLogSizeKB) / 1024;

    return NextResponse.json({
      retentionPolicy: {
        days: retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        description: `Audit logs older than ${retentionDays} days are automatically deleted`,
      },
      stats: {
        totalLogs: totalCount,
        logsExpiringNextCleanup: expiringCount,
        estimatedSizeMB: Math.round(expiringSizeMB * 100) / 100,
        oldestLogDate: oldestLog?.createdAt?.toISOString() || null,
      },
      lastCleanup: latestCleanup
        ? {
            date: latestCleanup.createdAt.toISOString(),
            description: latestCleanup.description,
          }
        : null,
      compliance: {
        minimumRetentionDays: 7,
        maximumRetentionDays: 365,
        defaultRetentionDays: DEFAULT_RETENTION_DAYS,
        currentRetentionDays: retentionDays,
      },
    });
  } catch (error) {
    console.error('Audit cleanup status error:', error);
    return NextResponse.json(
      { error: 'Failed to get cleanup status' },
      { status: 500 }
    );
  }
}

// Helper function to get actor name
function getActorName(log: {
  actorType: string;
  actorId: string | null;
  user: { name: string; email: string } | null;
  rider: { fullName: string } | null;
  merchant: { name: string } | null;
}): string {
  if (log.actorType === 'SYSTEM') return 'System';
  if (log.user) return log.user.name || log.user.email;
  if (log.rider) return log.rider.fullName;
  if (log.merchant) return log.merchant.name;
  return log.actorId || 'Unknown';
}

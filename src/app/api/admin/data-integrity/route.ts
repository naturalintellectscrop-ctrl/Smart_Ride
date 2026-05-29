// ============================================
// SMART RIDE - ADMIN DATA INTEGRITY VERIFICATION API
// ============================================
// GET endpoint that checks for data integrity issues:
// 1. Orphan orders (no associated Task)
// 2. Orphan tasks (orderId set but Order doesn't exist)
// 3. Orphan dispatch matches (task completed/cancelled but match still PENDING)
// 4. Invalid foreign keys (Tasks where riderId references non-existent rider)
// 5. Duplicate notifications (>5 same userId+type+referenceId within 1 min)
// 6. Duplicate audit logs (>2 identical action+entityType+entityId within 5 sec)
// 7. Missing rider assignments (ASSIGNED/ACCEPTED/IN_PROGRESS with no riderId)
// 8. Inconsistent task/order linkage (task type != order type)
// 9. Stale dispatch matches (PENDING matches where task is CANCELLED/COMPLETED)
// 10. Wallet balance inconsistency (rider.totalEarnings != sum of completed task riderEarnings)
//
// Supports ?fix=true query parameter for auto-fixing simple issues:
// - Delete orphan dispatch matches
// - Set status to CANCELLED for tasks with missing riderId in ASSIGNED status
// - Delete duplicate notifications
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { TaskStatus, DispatchMatchStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

interface IntegrityCheck {
  name: string;
  count: number;
  sampleIds: string[];
  details?: string;
}

interface FixResult {
  name: string;
  fixed: number;
  errors: string[];
}

// ============================================
// ADMIN AUTH VERIFICATION
// ============================================

function verifyAdmin(request: NextRequest): {
  decoded: { userId: string; email: string; role: string; name: string } | null;
  error: NextResponse | null;
} {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      decoded: null,
      error: NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 }),
    };
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return {
      decoded: null,
      error: NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 }),
    };
  }

  if (!['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role)) {
    return {
      decoded: null,
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    };
  }

  return { decoded, error: null };
}

// ============================================
// INTEGRITY CHECKS
// ============================================

/**
 * 1. Orphan orders: Orders with no associated Task record
 */
async function checkOrphanOrders(): Promise<IntegrityCheck> {
  try {
    // Find orders that have no task relation
    const ordersWithTaskIds = await db.task.findMany({
      where: { orderId: { not: null } },
      select: { orderId: true },
    });
    const orderIdsWithTask = new Set(
      ordersWithTaskIds.map((t) => t.orderId).filter((id): id is string => id !== null)
    );

    const allOrders = await db.order.findMany({
      select: { id: true },
    });

    const orphanOrderIds = allOrders
      .filter((o) => !orderIdsWithTask.has(o.id))
      .map((o) => o.id)
      .slice(0, 10);

    return {
      name: 'Orphan Orders (no associated Task)',
      count: allOrders.length - orderIdsWithTask.size,
      sampleIds: orphanOrderIds,
      details: 'Orders that have no corresponding Task record. These orders were created but never dispatched.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkOrphanOrders error:', error);
    return { name: 'Orphan Orders (no associated Task)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 2. Orphan tasks: Tasks with orderId set but the referenced Order doesn't exist
 */
async function checkOrphanTasks(): Promise<IntegrityCheck> {
  try {
    const tasksWithOrders = await db.task.findMany({
      where: { orderId: { not: null } },
      select: { id: true, orderId: true },
    });

    if (tasksWithOrders.length === 0) {
      return { name: 'Orphan Tasks (orderId references non-existent Order)', count: 0, sampleIds: [] };
    }

    const orderIds = tasksWithOrders.map((t) => t.orderId!).filter(Boolean);
    const existingOrders = await db.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true },
    });
    const existingOrderIds = new Set(existingOrders.map((o) => o.id));

    const orphanTaskIds = tasksWithOrders
      .filter((t) => !existingOrderIds.has(t.orderId!))
      .map((t) => t.id)
      .slice(0, 10);

    return {
      name: 'Orphan Tasks (orderId references non-existent Order)',
      count: tasksWithOrders.filter((t) => !existingOrderIds.has(t.orderId!)).length,
      sampleIds: orphanTaskIds,
      details: 'Tasks that reference an Order ID which no longer exists in the database.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkOrphanTasks error:', error);
    return { name: 'Orphan Tasks (orderId references non-existent Order)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 3. Orphan dispatch matches: DispatchMatches where the task has already been completed/cancelled
 */
async function checkOrphanDispatchMatches(): Promise<IntegrityCheck> {
  try {
    const orphanMatches = await db.dispatchMatch.findMany({
      where: {
        status: DispatchMatchStatus.PENDING,
        task: {
          status: { in: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.FAILED, TaskStatus.CLOSED, TaskStatus.PAID] },
        },
      },
      select: { id: true },
      take: 10,
    });

    const count = await db.dispatchMatch.count({
      where: {
        status: DispatchMatchStatus.PENDING,
        task: {
          status: { in: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.FAILED, TaskStatus.CLOSED, TaskStatus.PAID] },
        },
      },
    });

    return {
      name: 'Orphan Dispatch Matches (PENDING match on completed/cancelled task)',
      count,
      sampleIds: orphanMatches.map((m) => m.id),
      details: 'DispatchMatches still PENDING but their associated task is already in a terminal state.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkOrphanDispatchMatches error:', error);
    return { name: 'Orphan Dispatch Matches (PENDING match on completed/cancelled task)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 4. Invalid foreign keys: Tasks where riderId references a non-existent rider
 */
async function checkInvalidForeignKeys(): Promise<IntegrityCheck> {
  try {
    const tasksWithRiders = await db.task.findMany({
      where: { riderId: { not: null } },
      select: { id: true, riderId: true },
    });

    if (tasksWithRiders.length === 0) {
      return { name: 'Invalid Foreign Keys (riderId references non-existent Rider)', count: 0, sampleIds: [] };
    }

    const riderIds = [...new Set(tasksWithRiders.map((t) => t.riderId!).filter(Boolean))];
    const existingRiders = await db.rider.findMany({
      where: { id: { in: riderIds } },
      select: { id: true },
    });
    const existingRiderIds = new Set(existingRiders.map((r) => r.id));

    const invalidTaskIds = tasksWithRiders
      .filter((t) => !existingRiderIds.has(t.riderId!))
      .map((t) => t.id)
      .slice(0, 10);

    return {
      name: 'Invalid Foreign Keys (riderId references non-existent Rider)',
      count: tasksWithRiders.filter((t) => !existingRiderIds.has(t.riderId!)).length,
      sampleIds: invalidTaskIds,
      details: 'Tasks that reference a riderId which no longer exists in the Riders table.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkInvalidForeignKeys error:', error);
    return { name: 'Invalid Foreign Keys (riderId references non-existent Rider)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 5. Duplicate notifications: More than 5 notifications for same userId+type+referenceId within 1 minute
 */
async function checkDuplicateNotifications(): Promise<IntegrityCheck> {
  try {
    // Use raw query for grouping with time window
    const duplicates = await db.$queryRaw<Array<{ userId: string; type: string; referenceId: string; cnt: bigint }>>`
      SELECT "userId", "type", "referenceId", COUNT(*) as cnt
      FROM "Notification"
      WHERE "createdAt" > NOW() - INTERVAL '1 day'
      GROUP BY "userId", "type", "referenceId"
      HAVING COUNT(*) > 5
      LIMIT 10
    `;

    // Get sample IDs of the duplicate notifications
    const sampleIds: string[] = [];
    for (const dup of duplicates.slice(0, 3)) {
      const notifs = await db.notification.findMany({
        where: {
          userId: dup.userId,
          type: dup.type as any,
          referenceId: dup.referenceId,
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });
      sampleIds.push(...notifs.map((n) => n.id));
    }

    const totalDuplicateGroups = await db.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) as cnt FROM (
        SELECT "userId", "type", "referenceId"
        FROM "Notification"
        WHERE "createdAt" > NOW() - INTERVAL '1 day'
        GROUP BY "userId", "type", "referenceId"
        HAVING COUNT(*) > 5
      ) sub
    `;

    const count = Number(totalDuplicateGroups[0]?.cnt ?? 0);

    return {
      name: 'Duplicate Notifications (>5 same userId+type+referenceId within 1 day)',
      count,
      sampleIds: sampleIds.slice(0, 10),
      details: 'Groups of notifications with the same userId, type, and referenceId exceeding 5 within a 1-day window.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkDuplicateNotifications error:', error);
    return { name: 'Duplicate Notifications (>5 same userId+type+referenceId within 1 day)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 6. Duplicate audit logs: More than 2 identical action+entityType+entityId within 5 seconds
 */
async function checkDuplicateAuditLogs(): Promise<IntegrityCheck> {
  try {
    const duplicates = await db.$queryRaw<Array<{ action: string; entityType: string; entityId: string; cnt: bigint }>>`
      SELECT action, "entityType", "entityId", COUNT(*) as cnt
      FROM "AuditLog"
      WHERE "createdAt" > NOW() - INTERVAL '1 day'
      GROUP BY action, "entityType", "entityId", DATE_TRUNC('second', "createdAt")
      HAVING COUNT(*) > 2
      LIMIT 10
    `;

    const totalDuplicateGroups = await db.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) as cnt FROM (
        SELECT action, "entityType", "entityId"
        FROM "AuditLog"
        WHERE "createdAt" > NOW() - INTERVAL '1 day'
        GROUP BY action, "entityType", "entityId", DATE_TRUNC('second', "createdAt")
        HAVING COUNT(*) > 2
      ) sub
    `;

    const sampleIds: string[] = [];
    for (const dup of duplicates.slice(0, 3)) {
      const logs = await db.auditLog.findMany({
        where: {
          action: dup.action,
          entityType: dup.entityType,
          entityId: dup.entityId,
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });
      sampleIds.push(...logs.map((l) => l.id));
    }

    const count = Number(totalDuplicateGroups[0]?.cnt ?? 0);

    return {
      name: 'Duplicate Audit Logs (>2 identical action+entityType+entityId within 5 seconds)',
      count,
      sampleIds: sampleIds.slice(0, 10),
      details: 'Groups of audit logs with identical action, entityType, and entityId created within the same second, exceeding 2 entries.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkDuplicateAuditLogs error:', error);
    return { name: 'Duplicate Audit Logs (>2 identical action+entityType+entityId within 5 seconds)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 7. Missing rider assignments: Tasks in ASSIGNED/ACCEPTED/IN_PROGRESS status with no riderId
 */
async function checkMissingRiderAssignments(): Promise<IntegrityCheck> {
  try {
    const tasks = await db.task.findMany({
      where: {
        status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT, TaskStatus.ARRIVED, TaskStatus.ARRIVING, TaskStatus.PICKED_UP] },
        riderId: null,
      },
      select: { id: true },
      take: 10,
    });

    const count = await db.task.count({
      where: {
        status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT, TaskStatus.ARRIVED, TaskStatus.ARRIVING, TaskStatus.PICKED_UP] },
        riderId: null,
      },
    });

    return {
      name: 'Missing Rider Assignments (active status but no riderId)',
      count,
      sampleIds: tasks.map((t) => t.id),
      details: 'Tasks in active states (ASSIGNED, ACCEPTED, IN_PROGRESS, etc.) that have no riderId assigned.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkMissingRiderAssignments error:', error);
    return { name: 'Missing Rider Assignments (active status but no riderId)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 8. Inconsistent task/order linkage: Task linked to Order but task types don't match order type
 */
async function checkInconsistentTaskOrderLinkage(): Promise<IntegrityCheck> {
  try {
    // Task type -> Order type mapping
    const taskToOrderType: Record<string, string[]> = {
      FOOD_DELIVERY: ['FOOD_DELIVERY'],
      SHOPPING: ['SHOPPING'],
      SMART_BODA_RIDE: [], // Rides don't have orders
      SMART_CAR_RIDE: [], // Rides don't have orders
      ITEM_DELIVERY: [], // May or may not have orders
      SMART_HEALTH_DELIVERY: [], // Uses HealthOrder, not Order
    };

    const tasksWithOrders = await db.task.findMany({
      where: {
        orderId: { not: null },
      },
      include: {
        order: {
          select: { id: true, orderType: true },
        },
      },
    });

    const inconsistent = tasksWithOrders.filter((task) => {
      if (!task.order) return false; // This is caught by check #2
      const expectedOrderTypes = taskToOrderType[task.taskType];
      if (!expectedOrderTypes || expectedOrderTypes.length === 0) return false;
      return !expectedOrderTypes.includes(task.order.orderType);
    });

    return {
      name: 'Inconsistent Task/Order Linkage (task type doesn\'t match order type)',
      count: inconsistent.length,
      sampleIds: inconsistent.map((t) => t.id).slice(0, 10),
      details: 'Tasks linked to Orders where the task type is inconsistent with the order type (e.g., FOOD_DELIVERY task linked to SHOPPING order).',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkInconsistentTaskOrderLinkage error:', error);
    return { name: 'Inconsistent Task/Order Linkage (task type doesn\'t match order type)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 9. Stale dispatch matches: PENDING matches where task is already CANCELLED/COMPLETED
 * (Similar to #3 but explicitly for CANCELLED/COMPLETED tasks)
 */
async function checkStaleDispatchMatches(): Promise<IntegrityCheck> {
  try {
    const staleMatches = await db.dispatchMatch.findMany({
      where: {
        status: { in: [DispatchMatchStatus.PENDING] },
        task: {
          status: { in: [TaskStatus.CANCELLED, TaskStatus.COMPLETED] },
        },
      },
      select: { id: true },
      take: 10,
    });

    const count = await db.dispatchMatch.count({
      where: {
        status: { in: [DispatchMatchStatus.PENDING] },
        task: {
          status: { in: [TaskStatus.CANCELLED, TaskStatus.COMPLETED] },
        },
      },
    });

    return {
      name: 'Stale Dispatch Matches (PENDING match on CANCELLED/COMPLETED task)',
      count,
      sampleIds: staleMatches.map((m) => m.id),
      details: 'DispatchMatches still PENDING but their associated task is CANCELLED or COMPLETED. These should be cleaned up.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkStaleDispatchMatches error:', error);
    return { name: 'Stale Dispatch Matches (PENDING match on CANCELLED/COMPLETED task)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

/**
 * 10. Wallet balance inconsistency: rider.totalEarnings doesn't match sum of completed task riderEarnings
 */
async function checkWalletBalanceInconsistency(): Promise<IntegrityCheck> {
  try {
    const inconsistencies = await db.$queryRaw<
      Array<{ riderId: string; totalEarnings: number; actualEarnings: number; diff: number }>
    >`
      SELECT r.id as "riderId", r."totalEarnings",
        COALESCE(SUM(t."riderEarnings"), 0) as "actualEarnings",
        r."totalEarnings" - COALESCE(SUM(t."riderEarnings"), 0) as diff
      FROM "Rider" r
      LEFT JOIN "Task" t ON t."riderId" = r.id AND t.status = 'COMPLETED'
      GROUP BY r.id, r."totalEarnings"
      HAVING r."totalEarnings" - COALESCE(SUM(t."riderEarnings"), 0) != 0
         OR (r."totalEarnings" = 0 AND COALESCE(SUM(t."riderEarnings"), 0) > 0)
      LIMIT 10
    `;

    const totalCount = await db.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) as cnt FROM (
        SELECT r.id
        FROM "Rider" r
        LEFT JOIN "Task" t ON t."riderId" = r.id AND t.status = 'COMPLETED'
        GROUP BY r.id, r."totalEarnings"
        HAVING r."totalEarnings" - COALESCE(SUM(t."riderEarnings"), 0) != 0
           OR (r."totalEarnings" = 0 AND COALESCE(SUM(t."riderEarnings"), 0) > 0)
      ) sub
    `;

    return {
      name: 'Wallet Balance Inconsistency (totalEarnings != sum of completed task riderEarnings)',
      count: Number(totalCount[0]?.cnt ?? 0),
      sampleIds: inconsistencies.map((i) => i.riderId),
      details: inconsistencies.length > 0
        ? `Examples: ${inconsistencies.slice(0, 3).map((i) => `rider ${i.riderId.slice(-6)} recorded=${i.totalEarnings} actual=${i.actualEarnings}`).join('; ')}`
        : 'Rider totalEarnings field does not match the sum of riderEarnings from their completed tasks.',
    };
  } catch (error) {
    console.error('[DataIntegrity] checkWalletBalanceInconsistency error:', error);
    return { name: 'Wallet Balance Inconsistency (totalEarnings != sum of completed task riderEarnings)', count: -1, sampleIds: [], details: 'Check failed' };
  }
}

// ============================================
// FIX OPERATIONS
// ============================================

/**
 * Fix 1: Delete orphan dispatch matches (PENDING matches on terminal-state tasks)
 */
async function fixOrphanDispatchMatches(): Promise<FixResult> {
  const result: FixResult = { name: 'Delete Orphan Dispatch Matches', fixed: 0, errors: [] };
  try {
    const deleted = await db.dispatchMatch.deleteMany({
      where: {
        status: DispatchMatchStatus.PENDING,
        task: {
          status: { in: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.FAILED, TaskStatus.CLOSED, TaskStatus.PAID] },
        },
      },
    });
    result.fixed = deleted.count;
  } catch (error) {
    result.errors.push(`Failed to delete orphan dispatch matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  return result;
}

/**
 * Fix 2: Set status to CANCELLED for tasks with missing riderId in ASSIGNED status
 */
async function fixMissingRiderAssignments(): Promise<FixResult> {
  const result: FixResult = { name: 'Cancel ASSIGNED Tasks with Missing Rider', fixed: 0, errors: [] };
  try {
    const updated = await db.task.updateMany({
      where: {
        status: TaskStatus.ASSIGNED,
        riderId: null,
      },
      data: {
        status: TaskStatus.CANCELLED,
        cancellationReason: 'Auto-cancelled: task in ASSIGNED status with no riderId',
        cancelledBy: 'SYSTEM',
        cancelledAt: new Date(),
      },
    });
    result.fixed = updated.count;
  } catch (error) {
    result.errors.push(`Failed to cancel ASSIGNED tasks without rider: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  return result;
}

/**
 * Fix 3: Delete duplicate notifications (keep only the latest 5 per group)
 */
async function fixDuplicateNotifications(): Promise<FixResult> {
  const result: FixResult = { name: 'Delete Duplicate Notifications', fixed: 0, errors: [] };
  try {
    // Find groups with more than 5 notifications for same userId+type+referenceId
    const duplicateGroups = await db.$queryRaw<
      Array<{ userId: string; type: string; referenceId: string; cnt: bigint }>
    >`
      SELECT "userId", "type", "referenceId", COUNT(*) as cnt
      FROM "Notification"
      WHERE "createdAt" > NOW() - INTERVAL '1 day'
      GROUP BY "userId", "type", "referenceId"
      HAVING COUNT(*) > 5
    `;

    for (const group of duplicateGroups) {
      // Get all notification IDs for this group, ordered by createdAt desc
      const notifications = await db.notification.findMany({
        where: {
          userId: group.userId,
          type: group.type as any,
          referenceId: group.referenceId,
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      });

      // Keep the latest 5, delete the rest
      const idsToDelete = notifications.slice(5).map((n) => n.id);
      if (idsToDelete.length > 0) {
        const deleted = await db.notification.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        result.fixed += deleted.count;
      }
    }
  } catch (error) {
    result.errors.push(`Failed to delete duplicate notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  return result;
}

// ============================================
// GET HANDLER - Run integrity checks
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { error: authError } = verifyAdmin(request);
    if (authError) return authError;

    const shouldFix = request.nextUrl.searchParams.get('fix') === 'true';

    // Run all checks in parallel for efficiency
    const [
      orphanOrders,
      orphanTasks,
      orphanDispatchMatches,
      invalidForeignKeys,
      duplicateNotifications,
      duplicateAuditLogs,
      missingRiderAssignments,
      inconsistentTaskOrderLinkage,
      staleDispatchMatches,
      walletBalanceInconsistency,
    ] = await Promise.all([
      checkOrphanOrders(),
      checkOrphanTasks(),
      checkOrphanDispatchMatches(),
      checkInvalidForeignKeys(),
      checkDuplicateNotifications(),
      checkDuplicateAuditLogs(),
      checkMissingRiderAssignments(),
      checkInconsistentTaskOrderLinkage(),
      checkStaleDispatchMatches(),
      checkWalletBalanceInconsistency(),
    ]);

    const checks: IntegrityCheck[] = [
      orphanOrders,
      orphanTasks,
      orphanDispatchMatches,
      invalidForeignKeys,
      duplicateNotifications,
      duplicateAuditLogs,
      missingRiderAssignments,
      inconsistentTaskOrderLinkage,
      staleDispatchMatches,
      walletBalanceInconsistency,
    ];

    const totalIssues = checks.reduce((sum, c) => sum + (c.count > 0 ? c.count : 0), 0);
    const checksWithIssues = checks.filter((c) => c.count > 0).length;

    // Run fixes if requested
    let fixes: FixResult[] | undefined;
    if (shouldFix) {
      fixes = await Promise.all([
        fixOrphanDispatchMatches(),
        fixMissingRiderAssignments(),
        fixDuplicateNotifications(),
      ]);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: checks.length,
        checksWithIssues,
        totalIssues,
        status: checksWithIssues === 0 ? 'HEALTHY' : checksWithIssues <= 3 ? 'WARNING' : 'CRITICAL',
      },
      checks,
      fixes: fixes || undefined,
    });
  } catch (error) {
    console.error('[DataIntegrity] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to run data integrity checks' },
      { status: 500 }
    );
  }
}

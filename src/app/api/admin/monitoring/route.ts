// ============================================
// SMART RIDE - ADMIN MONITORING API
// ============================================
// GET endpoint that returns real-time operational metrics:
// - Active dispatch queue
// - Unmatched tasks
// - Failed tasks (last 24h)
// - Delayed orders
// - Online riders
// - Rider bottlenecks (merchants with >3 pending orders)
// - Active alerts
// - System health snapshot
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { TaskStatus, DispatchMatchStatus, OrderStatus, ConnectionStatus } from '@prisma/client';

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
// GET HANDLER
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { error: authError } = verifyAdmin(request);
    if (authError) return authError;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // ── 1. Active Dispatch Queue ──────────────────────────────
    // Tasks currently in MATCHING/SEARCHING
    const [activeDispatchQueue, activeDispatchTasks] = await Promise.all([
      db.task.count({
        where: {
          status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
        },
      }),
      db.task.findMany({
        where: {
          status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
        },
        select: {
          id: true,
          taskNumber: true,
          taskType: true,
          status: true,
          pickupAddress: true,
          dropoffAddress: true,
          matchingStartedAt: true,
          createdAt: true,
          client: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // ── 2. Unmatched Tasks ────────────────────────────────────
    // Tasks with no pending DispatchMatches
    const tasksWithPendingMatches = await db.dispatchMatch.findMany({
      where: { status: DispatchMatchStatus.PENDING },
      select: { taskId: true },
      distinct: ['taskId'],
    });
    const taskIdsWithPending = tasksWithPendingMatches.map((m) => m.taskId);

    const unmatchedTasks = await db.task.findMany({
      where: {
        status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
        id: { notIn: taskIdsWithPending },
      },
      select: {
        id: true,
        taskNumber: true,
        taskType: true,
        status: true,
        pickupAddress: true,
        createdAt: true,
        matchingStartedAt: true,
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── 3. Failed Tasks (last 24h) ────────────────────────────
    const failedTasks = await db.task.findMany({
      where: {
        status: TaskStatus.FAILED,
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: {
        id: true,
        taskNumber: true,
        taskType: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        createdAt: true,
        cancellationReason: true,
        client: {
          select: { id: true, name: true },
        },
        rider: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── 4. Delayed Orders (ORDER_CREATED > 3 min) ─────────────
    const delayedOrders = await db.order.findMany({
      where: {
        status: OrderStatus.ORDER_CREATED,
        createdAt: { lt: threeMinutesAgo },
      },
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        merchant: {
          select: { id: true, name: true, phone: true },
        },
        client: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── 5. Online Riders ──────────────────────────────────────
    const onlineRiders = await db.rider.count({
      where: {
        isOnline: true,
        status: 'APPROVED',
      },
    });

    // ── 6. Rider Bottlenecks ──────────────────────────────────
    // Merchants with >3 pending orders
    const merchantsWithPendingOrders = await db.order.groupBy({
      by: ['merchantId'],
      where: {
        status: { in: [OrderStatus.ORDER_CREATED, OrderStatus.PREPARING, OrderStatus.MERCHANT_ACCEPTED] },
        merchantId: { not: null },
      },
      _count: { id: true },
      having: {
        id: { _count: { gt: 3 } },
      },
    });

    const bottleneckMerchantIds = merchantsWithPendingOrders
      .map((m) => m.merchantId)
      .filter((id): id is string => id !== null);

    const bottleneckMerchants = bottleneckMerchantIds.length > 0
      ? await db.merchant.findMany({
          where: { id: { in: bottleneckMerchantIds } },
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
            address: true,
            _count: {
              select: {
                orders: {
                  where: {
                    status: { in: [OrderStatus.ORDER_CREATED, OrderStatus.PREPARING, OrderStatus.MERCHANT_ACCEPTED] },
                  },
                },
              },
            },
          },
        })
      : [];

    const riderBottlenecks = bottleneckMerchants.map((merchant) => ({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        type: merchant.type,
        phone: merchant.phone,
        address: merchant.address,
      },
      pendingOrderCount: merchant._count.orders,
    }));

    // ── 7. Active Alerts ──────────────────────────────────────
    // Unacknowledged ConnectionAlerts
    const activeAlerts = await db.connectionAlert.findMany({
      where: { isAcknowledged: false },
      select: {
        id: true,
        alertType: true,
        severity: true,
        message: true,
        createdAt: true,
        riderId: true,
        taskId: true,
        rider: {
          select: { id: true, fullName: true, phone: true },
        },
        task: {
          select: { id: true, taskNumber: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // ── 8. System Health ──────────────────────────────────────
    const [pendingPayments, stuckTasks, disconnectedRiders] = await Promise.all([
      // Pending payments: payments stuck in PENDING/PROCESSING for > 30 min
      db.payment.count({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
          createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
        },
      }),

      // Stuck tasks: tasks in active states with stale timestamps
      db.task.count({
        where: {
          OR: [
            {
              status: { in: [TaskStatus.MATCHING, TaskStatus.SEARCHING] },
              matchingStartedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
            },
            {
              status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED] },
              assignedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
            },
            {
              status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.IN_TRANSIT] },
              inProgressAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
            },
          ],
        },
      }),

      // Disconnected riders with active tasks
      db.rider.count({
        where: {
          connectionStatus: ConnectionStatus.DISCONNECTED,
          currentTaskId: { not: null },
        },
      }),
    ]);

    // ── Build response ────────────────────────────────────────
    return NextResponse.json({
      activeDispatchQueue,
      activeDispatchTasks,
      unmatchedTasks,
      failedTasks,
      delayedOrders,
      onlineRiders,
      riderBottlenecks,
      activeAlerts,
      systemHealth: {
        pendingPayments,
        stuckTasks,
        disconnectedRiders,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AdminMonitoring] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring metrics' },
      { status: 500 }
    );
  }
}

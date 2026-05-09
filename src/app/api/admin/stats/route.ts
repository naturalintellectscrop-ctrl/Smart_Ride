/**
 * Admin Dashboard Stats API
 * GET /api/admin/stats - Get dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'COMPLIANCE_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch all stats in parallel
    const [
      totalClients,
      totalRiders,
      activeRiders,
      totalMerchants,
      activeMerchants,
      todayTasks,
      todayOrders,
      todayRevenue,
      pendingRiderApprovals,
      pendingMerchantApprovals,
      pendingProviderApprovals,
      activeTasks,
      recentActivity,
    ] = await Promise.all([
      // Total clients
      db.user.count({ where: { role: 'CLIENT' } }),
      
      // Total riders
      db.rider.count(),
      
      // Active riders (online)
      db.rider.count({ where: { isOnline: true } }),
      
      // Total merchants
      db.merchant.count(),
      
      // Active merchants (open)
      db.merchant.count({ where: { isOpen: true } }),
      
      // Today's tasks
      db.task.count({
        where: {
          createdAt: { gte: today, lt: tomorrow }
        }
      }),
      
      // Today's orders
      db.order.count({
        where: {
          createdAt: { gte: today, lt: tomorrow }
        }
      }),
      
      // Today's revenue
      db.task.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: 'COMPLETED'
        },
        _sum: { totalAmount: true }
      }),
      
      // Pending rider approvals
      db.rider.count({ where: { status: 'PENDING_APPROVAL' } }),
      
      // Pending merchant approvals
      db.merchant.count({ where: { status: 'PENDING_APPROVAL' } }),
      
      // Pending health provider approvals
      db.healthProvider.count({ where: { verificationStatus: 'PENDING' } }),
      
      // Active tasks (in progress)
      db.task.count({
        where: {
          status: { in: ['MATCHING', 'ASSIGNED', 'ACCEPTED', 'ARRIVED', 'PICKED_UP', 'IN_TRANSIT'] }
        }
      }),
      
      // Recent activity (last 10 audit logs)
      db.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          description: true,
          entityType: true,
          createdAt: true,
          userId: true,
          riderId: true,
          merchantId: true,
        }
      })
    ]);

    // Calculate service stats
    const serviceStats = await db.task.groupBy({
      by: ['taskType'],
      where: {
        createdAt: { gte: today, lt: tomorrow }
      },
      _count: { id: true },
      _sum: { totalAmount: true }
    });

    return NextResponse.json({
      stats: {
        totalClients,
        totalRiders,
        activeRiders,
        totalMerchants,
        activeMerchants,
        todayTasks,
        todayOrders,
        todayRevenue: todayRevenue._sum.totalAmount || 0,
        pendingApprovals: pendingRiderApprovals + pendingMerchantApprovals + pendingProviderApprovals,
        activeTasks,
      },
      pendingBreakdown: {
        riders: pendingRiderApprovals,
        merchants: pendingMerchantApprovals,
        healthProviders: pendingProviderApprovals,
      },
      serviceStats: serviceStats.map(s => ({
        name: s.taskType,
        orders: s._count.id,
        revenue: s._sum.totalAmount || 0,
      })),
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        action: log.action,
        description: log.description,
        entityType: log.entityType,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

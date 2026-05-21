// ============================================
// SMART RIDE - DASHBOARD SERVICE
// ============================================
// Dashboard data aggregation for admin and
// rider operational dashboards
// ============================================

import { db } from '@/lib/db';
import { MetricsService } from './metrics-service';

// ============================================
// TYPES
// ============================================

export interface AdminDashboardData {
  activeTasks: number;
  activeRiders: number;
  onlineRiders: number;
  pendingVerifications: number;
  activeSOSAlerts: number;
  todayRevenue: number;
  todayCompletedTasks: number;
  averageWaitTime: number;
  riderUtilization: number;
  tasksByStatus: Record<string, number>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: Date;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
  }>;
}

export interface RiderDashboardData {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalTrips: number;
  rating: number;
  activeTask: any;
  recentTasks: any[];
  onlineStatus: boolean;
  completionRate: number;
  acceptanceRate: number;
}

// Cache for dashboard data
let dashboardCache: { data: AdminDashboardData | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 60 * 1000; // 60 seconds

// ============================================
// DASHBOARD SERVICE
// ============================================

export class DashboardService {
  // ============================================
  // ADMIN DASHBOARD
  // ============================================

  /**
   * Get admin operational dashboard data
   */
  static async getOperationalDashboard(): Promise<AdminDashboardData> {
    // Check cache
    if (dashboardCache.data && Date.now() - dashboardCache.timestamp < CACHE_TTL) {
      return dashboardCache.data;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeTasksCount,
      riderUtilization,
      pendingVerifications,
      activeSOSAlerts,
      todayRevenue,
      todayCompletedTasks,
      averageWaitTime,
      recentTasks,
      recentOrders,
      recentPayments,
    ] = await Promise.all([
      MetricsService.getActiveTasksCount(),
      MetricsService.getRiderUtilization(),
      db.rider.count({ where: { status: 'PENDING_APPROVAL' } }),
      db.sOSAlert.count({ where: { status: 'ACTIVE' } }),
      db.task.aggregate({
        where: {
          status: { in: ['COMPLETED', 'CLOSED'] },
          completedAt: { gte: today },
        },
        _sum: { platformCommission: true },
      }),
      db.task.count({
        where: {
          status: { in: ['COMPLETED', 'CLOSED'] },
          completedAt: { gte: today },
        },
      }),
      MetricsService.getAverageWaitTime(),
      db.task.findMany({
        where: { status: { in: ['COMPLETED', 'CANCELLED'] } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          taskNumber: true,
          taskType: true,
          status: true,
          updatedAt: true,
        },
      }),
      db.order.findMany({
        where: { status: { in: ['DELIVERED', 'CANCELLED'] } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          updatedAt: true,
        },
      }),
      db.payment.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          createdAt: true,
        },
      }),
    ]);

    // Build recent activity
    const recentActivity: AdminDashboardData['recentActivity'] = [];

    for (const task of recentTasks) {
      recentActivity.push({
        id: task.id,
        type: 'TASK',
        description: `Task ${task.taskNumber} ${task.status.toLowerCase()}`,
        createdAt: task.updatedAt,
      });
    }

    for (const order of recentOrders) {
      recentActivity.push({
        id: order.id,
        type: 'ORDER',
        description: `Order ${order.orderNumber} ${order.status.toLowerCase()}`,
        createdAt: order.updatedAt,
      });
    }

    for (const payment of recentPayments) {
      recentActivity.push({
        id: payment.id,
        type: 'PAYMENT',
        description: `Payment of UGX ${(payment.amount || 0).toLocaleString()} received`,
        createdAt: payment.createdAt,
      });
    }

    // Sort by date
    recentActivity.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Build alerts
    const alerts: AdminDashboardData['alerts'] = [];

    // High cash on hand alerts
    const highCashRiders = await db.rider.count({
      where: {
        walletBalance: { gt: 500000 }, // UGX 500k
      },
    });
    if (highCashRiders > 0) {
      alerts.push({
        type: 'HIGH_CASH',
        message: `${highCashRiders} riders have high cash on hand (>UGX 500,000)`,
        severity: 'WARNING',
      });
    }

    // Pending verification backlog
    if (pendingVerifications > 10) {
      alerts.push({
        type: 'VERIFICATION_BACKLOG',
        message: `${pendingVerifications} riders pending verification`,
        severity: 'WARNING',
      });
    }

    // Active SOS alerts
    if (activeSOSAlerts > 0) {
      alerts.push({
        type: 'SOS_ALERT',
        message: `${activeSOSAlerts} active SOS alerts require attention`,
        severity: 'CRITICAL',
      });
    }

    const dashboardData: AdminDashboardData = {
      activeTasks: activeTasksCount.total,
      activeRiders: riderUtilization.activeRiders,
      onlineRiders: riderUtilization.onlineRiders,
      pendingVerifications,
      activeSOSAlerts,
      todayRevenue: todayRevenue._sum.platformCommission || 0,
      todayCompletedTasks,
      averageWaitTime,
      riderUtilization: riderUtilization.utilizationRate,
      tasksByStatus: activeTasksCount.byStatus,
      recentActivity: recentActivity.slice(0, 20),
      alerts,
    };

    // Update cache
    dashboardCache = {
      data: dashboardData,
      timestamp: Date.now(),
    };

    return dashboardData;
  }

  /**
   * Get dashboard metrics for charts
   */
  static async getDashboardMetrics(periodStart: Date, periodEnd: Date): Promise<{
    completionRate: any;
    revenue: any;
    taskVolume: any;
    riderPerformance: any;
  }> {
    const [completionRate, revenue, failedDeliveries] = await Promise.all([
      MetricsService.getCompletionRate(periodStart, periodEnd),
      MetricsService.getRevenueAnalytics(periodStart, periodEnd),
      MetricsService.getFailedDeliveries(periodStart, periodEnd),
    ]);

    const topRiders = await MetricsService.getTopRiders(5);

    return {
      completionRate,
      revenue,
      taskVolume: {
        byServiceType: completionRate.byServiceType,
        byStatus: completionRate,
      },
      riderPerformance: {
        topRiders,
        failedDeliveries,
      },
    };
  }

  // ============================================
  // RIDER DASHBOARD
  // ============================================

  /**
   * Get rider dashboard data
   */
  static async getRiderDashboard(riderId: string): Promise<RiderDashboardData | null> {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      include: {
        user: { select: { name: true } },
        ratingsReceived: { select: { score: true } },
      },
    });

    if (!rider) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      todayEarnings,
      weekEarnings,
      monthEarnings,
      activeTask,
      recentTasks,
    ] = await Promise.all([
      db.task.aggregate({
        where: {
          riderId,
          status: { in: ['COMPLETED', 'CLOSED'] },
          completedAt: { gte: today },
        },
        _sum: { riderEarnings: true },
      }),
      db.task.aggregate({
        where: {
          riderId,
          status: { in: ['COMPLETED', 'CLOSED'] },
          completedAt: { gte: weekAgo },
        },
        _sum: { riderEarnings: true },
      }),
      db.task.aggregate({
        where: {
          riderId,
          status: { in: ['COMPLETED', 'CLOSED'] },
          completedAt: { gte: monthAgo },
        },
        _sum: { riderEarnings: true },
      }),
      rider.currentTaskId ? db.task.findUnique({
        where: { id: rider.currentTaskId },
        include: {
          client: { select: { name: true, phone: true } },
        },
      }) : null,
      db.task.findMany({
        where: {
          riderId,
          status: { in: ['COMPLETED', 'CLOSED', 'CANCELLED'] },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
    ]);

    const avgRating = rider.ratingsReceived.length > 0
      ? rider.ratingsReceived.reduce((sum, r) => sum + r.score, 0) / rider.ratingsReceived.length
      : 0;

    return {
      todayEarnings: todayEarnings._sum.riderEarnings || 0,
      weekEarnings: weekEarnings._sum.riderEarnings || 0,
      monthEarnings: monthEarnings._sum.riderEarnings || 0,
      totalTrips: rider.totalTrips,
      rating: avgRating,
      activeTask,
      recentTasks,
      onlineStatus: rider.isOnline,
      completionRate: rider.totalTrips > 0 ? (rider.completedTrips / rider.totalTrips) * 100 : 0,
      acceptanceRate: 0, // Would need offer/accept tracking
    };
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Invalidate dashboard cache
   */
  static invalidateCache(): void {
    dashboardCache = { data: null, timestamp: 0 };
  }
}

export default DashboardService;

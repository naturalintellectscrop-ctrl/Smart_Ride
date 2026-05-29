// ============================================
// SMART RIDE - METRICS SERVICE
// ============================================
// Comprehensive analytics and metrics
// for Smart Ride operations
// ============================================

import { db } from '@/lib/db';
import { TaskStatus, TaskType, RiderRole } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface ActiveTasksCount {
  total: number;
  byServiceType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface CompletionRateMetrics {
  total: number;
  completed: number;
  cancelled: number;
  failed: number;
  completionRate: number;
  cancellationRate: number;
  byServiceType: Record<string, {
    total: number;
    completed: number;
    cancelled: number;
    rate: number;
  }>;
}

export interface RiderPerformanceMetrics {
  riderId: string;
  riderName: string;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  completionRate: number;
  averageRating: number;
  totalEarnings: number;
  averageEarningsPerDay: number;
  onTimeRate: number;
  averageResponseTime: number;
  onlineHours: number;
  acceptanceRate: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  platformCommission: number;
  riderEarnings: number;
  merchantEarnings: number;
  byServiceType: Record<string, {
    revenue: number;
    commission: number;
    count: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    commission: number;
    taskCount: number;
  }>;
}

export interface FailedDeliveriesMetrics {
  total: number;
  byReason: Record<string, number>;
  byServiceType: Record<string, number>;
  byHour: Record<number, number>;
  recent: Array<{
    id: string;
    taskNumber: string;
    type: string;
    reason: string;
    createdAt: Date;
  }>;
}

// ============================================
// METRICS SERVICE
// ============================================

export class MetricsService {
  // ============================================
  // ACTIVE TASKS
  // ============================================

  /**
   * Get active tasks count by type
   */
  static async getActiveTasksCount(): Promise<ActiveTasksCount> {
    const activeStatuses: TaskStatus[] = [
      'CREATED', 'REQUESTED', 'SEARCHING', 'MATCHING',
      'ASSIGNED', 'ACCEPTED', 'ARRIVING', 'ARRIVED',
      'PICKED_UP', 'IN_PROGRESS', 'IN_TRANSIT'
    ];

    const tasks = await db.task.findMany({
      where: { status: { in: activeStatuses } },
      select: { taskType: true, status: true },
    });

    const byServiceType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const task of tasks) {
      byServiceType[task.taskType] = (byServiceType[task.taskType] || 0) + 1;
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    }

    return {
      total: tasks.length,
      byServiceType,
      byStatus,
    };
  }

  // ============================================
  // COMPLETION RATE
  // ============================================

  /**
   * Get task completion rate for period
   */
  static async getCompletionRate(
    periodStart: Date,
    periodEnd: Date
  ): Promise<CompletionRateMetrics> {
    const tasks = await db.task.findMany({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        taskType: true,
        status: true,
      },
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'CLOSED').length;
    const cancelled = tasks.filter(t => t.status === 'CANCELLED').length;
    const failed = tasks.filter(t => t.status === 'FAILED').length;

    const byServiceType: Record<string, { total: number; completed: number; cancelled: number; rate: number }> = {};

    for (const task of tasks) {
      if (!byServiceType[task.taskType]) {
        byServiceType[task.taskType] = { total: 0, completed: 0, cancelled: 0, rate: 0 };
      }
      byServiceType[task.taskType].total++;
      if (task.status === 'COMPLETED' || task.status === 'CLOSED') {
        byServiceType[task.taskType].completed++;
      }
      if (task.status === 'CANCELLED') {
        byServiceType[task.taskType].cancelled++;
      }
    }

    // Calculate rates
    for (const type of Object.keys(byServiceType)) {
      const data = byServiceType[type];
      data.rate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
    }

    return {
      total,
      completed,
      cancelled,
      failed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
      byServiceType,
    };
  }

  // ============================================
  // RIDER PERFORMANCE
  // ============================================

  /**
   * Get rider performance metrics
   */
  static async getRiderPerformance(riderId: string): Promise<RiderPerformanceMetrics | null> {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      include: {
        user: { select: { name: true } },
        ratingsReceived: { select: { score: true } },
        tasks: {
          where: {
            status: { in: ['COMPLETED', 'CLOSED', 'CANCELLED'] },
          },
          select: {
            status: true,
            riderEarnings: true,
            completedAt: true,
            assignedAt: true,
            acceptedAt: true,
          },
        },
      },
    });

    if (!rider) return null;

    const totalTrips = rider.tasks.length;
    const completedTrips = rider.tasks.filter(t => t.status === 'COMPLETED' || t.status === 'CLOSED').length;
    const cancelledTrips = rider.tasks.filter(t => t.status === 'CANCELLED').length;

    const totalEarnings = rider.tasks
      .filter(t => t.riderEarnings)
      .reduce((sum, t) => sum + (t.riderEarnings || 0), 0);

    const avgRating = rider.ratingsReceived.length > 0
      ? rider.ratingsReceived.reduce((sum, r) => sum + r.score, 0) / rider.ratingsReceived.length
      : 0;

    // Calculate average response time
    const responseTimes = rider.tasks
      .filter(t => t.assignedAt && t.acceptedAt)
      .map(t => t.acceptedAt!.getTime() - t.assignedAt!.getTime());

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 1000 // in seconds
      : 0;

    // Calculate on-time rate: query tasks that have estimatedDuration set
    const tasksWithEstimates = await db.task.findMany({
      where: {
        riderId,
        status: { in: ['COMPLETED', 'CLOSED'] },
        estimatedDuration: { not: null },
        actualDuration: { not: null },
      },
      select: {
        estimatedDuration: true,
        actualDuration: true,
      },
      take: 100,
      orderBy: { completedAt: 'desc' },
    });

    const onTimeRate = tasksWithEstimates.length > 0
      ? (tasksWithEstimates.filter(t => (t.actualDuration ?? 0) <= (t.estimatedDuration ?? 0) * 1.15).length / tasksWithEstimates.length) * 100
      : rider.completedTrips > 0 ? 100 : 0;

    // Calculate online hours from HeartbeatLog
    const heartbeatStats = await db.heartbeatLog.aggregate({
      where: {
        riderId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _count: true,
    });
    // Heartbeats are sent every ~30 seconds (SYSTEM_TIMERS.HEARTBEAT_INTERVAL)
    // So online hours ≈ heartbeat_count * 30s / 3600s
    const onlineHours = heartbeatStats._count > 0
      ? (heartbeatStats._count * 30) / 3600
      : 0;

    // Calculate acceptance rate from DispatchMatch records
    const totalDispatches = await db.dispatchMatch.count({ where: { riderId } });
    const acceptedDispatches = await db.dispatchMatch.count({
      where: { riderId, status: 'ACCEPTED' },
    });
    const acceptanceRate = totalDispatches > 0
      ? (acceptedDispatches / totalDispatches) * 100
      : 0;

    return {
      riderId,
      riderName: rider.user.name,
      totalTrips,
      completedTrips,
      cancelledTrips,
      completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
      averageRating: avgRating,
      totalEarnings,
      averageEarningsPerDay: totalEarnings / 30, // Assuming 30-day period
      onTimeRate,
      averageResponseTime: avgResponseTime,
      onlineHours,
      acceptanceRate,
    };
  }

  /**
   * Get top performing riders
   */
  static async getTopRiders(limit: number = 10): Promise<RiderPerformanceMetrics[]> {
    const riders = await db.rider.findMany({
      where: { status: 'APPROVED' },
      include: {
        user: { select: { name: true } },
        ratingsReceived: { select: { score: true } },
      },
      orderBy: { completedTrips: 'desc' },
      take: limit,
    });

    const results: RiderPerformanceMetrics[] = [];

    for (const rider of riders) {
      const avgRating = rider.ratingsReceived.length > 0
        ? rider.ratingsReceived.reduce((sum, r) => sum + r.score, 0) / rider.ratingsReceived.length
        : 0;

      // Calculate on-time rate from tasks with estimated vs actual duration
      const tasksWithEstimates = await db.task.findMany({
        where: {
          riderId: rider.id,
          status: { in: ['COMPLETED', 'CLOSED'] },
          estimatedDuration: { not: null },
          actualDuration: { not: null },
        },
        select: {
          estimatedDuration: true,
          actualDuration: true,
        },
        take: 100,
        orderBy: { completedAt: 'desc' },
      });

      const onTimeRate = tasksWithEstimates.length > 0
        ? (tasksWithEstimates.filter(t => (t.actualDuration ?? 0) <= (t.estimatedDuration ?? 0) * 1.15).length / tasksWithEstimates.length) * 100
        : rider.completedTrips > 0 ? 100 : 0;

      // Calculate online hours from HeartbeatLog (last 30 days)
      const heartbeatStats = await db.heartbeatLog.aggregate({
        where: {
          riderId: rider.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: true,
      });
      const onlineHours = heartbeatStats._count > 0
        ? (heartbeatStats._count * 30) / 3600
        : 0;

      // Calculate acceptance rate from DispatchMatch
      const totalDispatches = await db.dispatchMatch.count({ where: { riderId: rider.id } });
      const acceptedDispatches = await db.dispatchMatch.count({
        where: { riderId: rider.id, status: 'ACCEPTED' },
      });
      const acceptanceRate = totalDispatches > 0
        ? (acceptedDispatches / totalDispatches) * 100
        : 0;

      // Calculate average response time from dispatch matches
      const acceptedMatches = await db.dispatchMatch.findMany({
        where: {
          riderId: rider.id,
          status: 'ACCEPTED',
          acceptedAt: { not: null },
        },
        select: {
          createdAt: true,
          acceptedAt: true,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });

      const responseTimes = acceptedMatches
        .filter(m => m.acceptedAt)
        .map(m => m.acceptedAt!.getTime() - m.createdAt.getTime());
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 1000
        : 0;

      results.push({
        riderId: rider.id,
        riderName: rider.user.name,
        totalTrips: rider.totalTrips,
        completedTrips: rider.completedTrips,
        cancelledTrips: rider.cancelledTrips,
        completionRate: rider.totalTrips > 0 ? (rider.completedTrips / rider.totalTrips) * 100 : 0,
        averageRating: avgRating,
        totalEarnings: rider.totalEarnings,
        averageEarningsPerDay: rider.totalEarnings / 30,
        onTimeRate,
        averageResponseTime: avgResponseTime,
        onlineHours,
        acceptanceRate,
      });
    }

    return results;
  }

  // ============================================
  // REVENUE ANALYTICS
  // ============================================

  /**
   * Get revenue analytics for period
   */
  static async getRevenueAnalytics(
    periodStart: Date,
    periodEnd: Date
  ): Promise<RevenueAnalytics> {
    const tasks = await db.task.findMany({
      where: {
        status: { in: ['COMPLETED', 'CLOSED'] },
        completedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        taskType: true,
        totalAmount: true,
        platformCommission: true,
        riderEarnings: true,
        completedAt: true,
      },
    });

    const totalRevenue = tasks.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const platformCommission = tasks.reduce((sum, t) => sum + (t.platformCommission || 0), 0);
    const riderEarnings = tasks.reduce((sum, t) => sum + (t.riderEarnings || 0), 0);

    const byServiceType: Record<string, { revenue: number; commission: number; count: number }> = {};

    for (const task of tasks) {
      if (!byServiceType[task.taskType]) {
        byServiceType[task.taskType] = { revenue: 0, commission: 0, count: 0 };
      }
      byServiceType[task.taskType].revenue += task.totalAmount || 0;
      byServiceType[task.taskType].commission += task.platformCommission || 0;
      byServiceType[task.taskType].count++;
    }

    // Daily revenue
    const dailyMap = new Map<string, { revenue: number; commission: number; taskCount: number }>();

    for (const task of tasks) {
      if (!task.completedAt) continue;
      const dateKey = task.completedAt.toISOString().split('T')[0];
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { revenue: 0, commission: 0, taskCount: 0 });
      }
      
      const dayData = dailyMap.get(dateKey)!;
      dayData.revenue += task.totalAmount || 0;
      dayData.commission += task.platformCommission || 0;
      dayData.taskCount++;
    }

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue,
      platformCommission,
      riderEarnings,
      merchantEarnings: 0, // Would need order data
      byServiceType,
      dailyRevenue,
    };
  }

  // ============================================
  // FAILED DELIVERIES
  // ============================================

  /**
   * Get failed delivery tracking
   */
  static async getFailedDeliveries(
    periodStart: Date,
    periodEnd: Date
  ): Promise<FailedDeliveriesMetrics> {
    const failedTasks = await db.task.findMany({
      where: {
        status: { in: ['CANCELLED', 'FAILED'] },
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        id: true,
        taskNumber: true,
        taskType: true,
        status: true,
        cancellationReason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const byReason: Record<string, number> = {};
    const byServiceType: Record<string, number> = {};
    const byHour: Record<number, number> = {};

    for (const task of failedTasks) {
      const reason = task.cancellationReason || 'Unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
      byServiceType[task.taskType] = (byServiceType[task.taskType] || 0) + 1;

      const hour = new Date(task.createdAt).getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    }

    return {
      total: failedTasks.length,
      byReason,
      byServiceType,
      byHour,
      recent: failedTasks.slice(0, 20).map(t => ({
        id: t.id,
        taskNumber: t.taskNumber,
        type: t.taskType,
        reason: t.cancellationReason || 'Unknown',
        createdAt: t.createdAt,
      })),
    };
  }

  // ============================================
  // OPERATIONAL METRICS
  // ============================================

  /**
   * Get average wait time for task assignment
   */
  static async getAverageWaitTime(): Promise<number> {
    const tasks = await db.task.findMany({
      where: {
        status: { notIn: ['CREATED', 'REQUESTED', 'SEARCHING'] },
        matchingStartedAt: { not: null },
        assignedAt: { not: null },
      },
      select: {
        matchingStartedAt: true,
        assignedAt: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    if (tasks.length === 0) return 0;

    const waitTimes = tasks
      .filter(t => t.matchingStartedAt && t.assignedAt)
      .map(t => t.assignedAt!.getTime() - t.matchingStartedAt!.getTime());

    return waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length / 1000 // in seconds
      : 0;
  }

  /**
   * Get rider utilization rate
   */
  static async getRiderUtilization(): Promise<{
    totalRiders: number;
    onlineRiders: number;
    activeRiders: number;
    utilizationRate: number;
    byRole: Record<string, { total: number; online: number; active: number }>;
  }> {
    const riders = await db.rider.findMany({
      where: { status: 'APPROVED' },
      select: {
        riderRole: true,
        isOnline: true,
        currentTaskId: true,
      },
    });

    const totalRiders = riders.length;
    const onlineRiders = riders.filter(r => r.isOnline).length;
    const activeRiders = riders.filter(r => r.currentTaskId).length;

    const byRole: Record<string, { total: number; online: number; active: number }> = {};

    for (const rider of riders) {
      if (!byRole[rider.riderRole]) {
        byRole[rider.riderRole] = { total: 0, online: 0, active: 0 };
      }
      byRole[rider.riderRole].total++;
      if (rider.isOnline) byRole[rider.riderRole].online++;
      if (rider.currentTaskId) byRole[rider.riderRole].active++;
    }

    return {
      totalRiders,
      onlineRiders,
      activeRiders,
      utilizationRate: onlineRiders > 0 ? (activeRiders / onlineRiders) * 100 : 0,
      byRole,
    };
  }
}

export default MetricsService;

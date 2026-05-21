// ============================================
// SMART RIDE - ANALYTICS METRICS API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { MetricsService } from '@/lib/analytics/metrics-service';
import { authGuard, adminGuard } from '@/lib/auth/guards';

// GET /api/analytics/metrics
export async function GET(request: NextRequest) {
  try {
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric');

    // Parse date range
    const dateFrom = searchParams.get('dateFrom') 
      ? new Date(searchParams.get('dateFrom')!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const dateTo = searchParams.get('dateTo')
      ? new Date(searchParams.get('dateTo')!)
      : new Date();

    switch (metric) {
      case 'active-tasks':
        const activeTasks = await MetricsService.getActiveTasksCount();
        return NextResponse.json({ success: true, data: activeTasks });

      case 'completion-rate':
        const completionRate = await MetricsService.getCompletionRate(dateFrom, dateTo);
        return NextResponse.json({ success: true, data: completionRate });

      case 'failed-deliveries':
        const failedDeliveries = await MetricsService.getFailedDeliveries(dateFrom, dateTo);
        return NextResponse.json({ success: true, data: failedDeliveries });

      case 'wait-time':
        const waitTime = await MetricsService.getAverageWaitTime();
        return NextResponse.json({ 
          success: true, 
          data: { averageWaitTimeSeconds: waitTime } 
        });

      case 'rider-utilization':
        const utilization = await MetricsService.getRiderUtilization();
        return NextResponse.json({ success: true, data: utilization });

      case 'top-riders':
        const limit = parseInt(searchParams.get('limit') || '10');
        const topRiders = await MetricsService.getTopRiders(limit);
        return NextResponse.json({ success: true, data: topRiders });

      case 'all':
        // Admin only - get all metrics
        const admin = await adminGuard(request);
        if (!admin) {
          return NextResponse.json(
            { success: false, error: 'Admin access required' },
            { status: 403 }
          );
        }

        const [
          activeTasksAll,
          completionRateAll,
          failedDeliveriesAll,
          waitTimeAll,
          utilizationAll,
        ] = await Promise.all([
          MetricsService.getActiveTasksCount(),
          MetricsService.getCompletionRate(dateFrom, dateTo),
          MetricsService.getFailedDeliveries(dateFrom, dateTo),
          MetricsService.getAverageWaitTime(),
          MetricsService.getRiderUtilization(),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            activeTasks: activeTasksAll,
            completionRate: completionRateAll,
            failedDeliveries: failedDeliveriesAll,
            averageWaitTime: waitTimeAll,
            riderUtilization: utilizationAll,
          },
        });

      default:
        return NextResponse.json({
          success: true,
          endpoints: {
            'GET /api/analytics/metrics?metric=active-tasks': 'Get active tasks count',
            'GET /api/analytics/metrics?metric=completion-rate': 'Get completion rate',
            'GET /api/analytics/metrics?metric=failed-deliveries': 'Get failed deliveries',
            'GET /api/analytics/metrics?metric=wait-time': 'Get average wait time',
            'GET /api/analytics/metrics?metric=rider-utilization': 'Get rider utilization',
            'GET /api/analytics/metrics?metric=top-riders': 'Get top riders',
            'GET /api/analytics/metrics?metric=all': 'Get all metrics (admin only)',
          },
          params: {
            dateFrom: 'Start date (ISO string)',
            dateTo: 'End date (ISO string)',
            limit: 'Limit for top riders (default: 10)',
          },
        });
    }
  } catch (error: any) {
    console.error('Analytics metrics error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

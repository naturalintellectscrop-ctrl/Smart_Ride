// ============================================
// SMART RIDE - ANALYTICS DASHBOARD API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/lib/analytics/dashboard-service';
import { authGuard, adminGuard } from '@/lib/auth/guards';

// GET /api/analytics/dashboard
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
    const type = searchParams.get('type') || 'admin';
    const riderId = searchParams.get('riderId');

    if (type === 'admin') {
      // Admin dashboard - requires admin role
      const admin = await adminGuard(request);
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }

      const dashboardData = await DashboardService.getOperationalDashboard();
      return NextResponse.json({ success: true, data: dashboardData });
    }

    if (type === 'rider') {
      // Rider dashboard
      if (!riderId) {
        return NextResponse.json(
          { success: false, error: 'riderId is required for rider dashboard' },
          { status: 400 }
        );
      }

      const dashboardData = await DashboardService.getRiderDashboard(riderId);
      if (!dashboardData) {
        return NextResponse.json(
          { success: false, error: 'Rider not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: dashboardData });
    }

    if (type === 'metrics') {
      // Dashboard metrics for charts
      const admin = await adminGuard(request);
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }

      const dateFrom = searchParams.get('dateFrom')
        ? new Date(searchParams.get('dateFrom')!)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const dateTo = searchParams.get('dateTo')
        ? new Date(searchParams.get('dateTo')!)
        : new Date();

      const metrics = await DashboardService.getDashboardMetrics(dateFrom, dateTo);
      return NextResponse.json({ success: true, data: metrics });
    }

    return NextResponse.json({
      success: true,
      endpoints: {
        'GET /api/analytics/dashboard?type=admin': 'Get admin operational dashboard',
        'GET /api/analytics/dashboard?type=rider&riderId=xxx': 'Get rider dashboard',
        'GET /api/analytics/dashboard?type=metrics': 'Get dashboard metrics for charts',
      },
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/analytics/dashboard - Invalidate cache
export async function DELETE(request: NextRequest) {
  try {
    const admin = await adminGuard(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    DashboardService.invalidateCache();
    return NextResponse.json({ success: true, message: 'Dashboard cache invalidated' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

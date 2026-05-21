// ============================================
// SMART RIDE - REVENUE ANALYTICS API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { MetricsService } from '@/lib/analytics/metrics-service';
import { authGuard } from '@/lib/auth/guards';
import { financeAdminGuard } from '@/lib/auth/admin-guards';

// GET /api/analytics/revenue
export async function GET(request: NextRequest) {
  try {
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Revenue analytics requires finance admin access
    const financeResult = financeAdminGuard(request);
    if (!financeResult.success) {
      return NextResponse.json(
        { success: false, error: financeResult.error || 'Finance admin access required' },
        { status: financeResult.statusCode || 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse date range
    const dateFrom = searchParams.get('dateFrom')
      ? new Date(searchParams.get('dateFrom')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const dateTo = searchParams.get('dateTo')
      ? new Date(searchParams.get('dateTo')!)
      : new Date();

    const revenueAnalytics = await MetricsService.getRevenueAnalytics(dateFrom, dateTo);

    return NextResponse.json({
      success: true,
      data: revenueAnalytics,
      meta: {
        periodStart: dateFrom,
        periodEnd: dateTo,
        currency: 'UGX',
      },
    });
  } catch (error: any) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

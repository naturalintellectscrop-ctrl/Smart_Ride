// ============================================
// SMART RIDE - RIDER PERFORMANCE API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { MetricsService } from '@/lib/analytics/metrics-service';
import { authGuard } from '@/lib/auth/guards';

// GET /api/analytics/rider-performance
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
    const riderId = searchParams.get('riderId');

    if (riderId) {
      // Get specific rider performance
      const performance = await MetricsService.getRiderPerformance(riderId);
      if (!performance) {
        return NextResponse.json(
          { success: false, error: 'Rider not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: performance });
    }

    // Get top riders
    const limit = parseInt(searchParams.get('limit') || '20');
    const topRiders = await MetricsService.getTopRiders(limit);

    return NextResponse.json({
      success: true,
      data: topRiders,
      meta: {
        limit,
        currency: 'UGX',
      },
    });
  } catch (error: any) {
    console.error('Rider performance error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

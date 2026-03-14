// Smart Ride Dispatch Analytics API
// Provides analytics, metrics, and insights for the dispatch engine

import { NextRequest, NextResponse } from 'next/server';

// In-memory analytics store (Use database in production)
interface DispatchMetric {
  id: string;
  requestId: string;
  serviceType: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  matchedProviderId?: string;
  matchedProviderScore?: number;
  matchedProviderRank?: number;
  totalProvidersFound: number;
  totalAttempts: number;
  searchDurationMs: number;
  finalRadiusKm: number;
  createdAt: Date;
}

interface ProviderMetric {
  providerId: string;
  providerType: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksCancelled: number;
  totalEarnings: number;
  averageRating: number;
  averageResponseTimeMs: number;
  acceptanceRate: number;
  completionRate: number;
  lastActiveAt: Date;
}

// Store metrics
const dispatchMetrics: DispatchMetric[] = [];
const providerMetrics = new Map<string, ProviderMetric>();

// GET /api/dispatch/analytics
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'summary':
      return getSummary();

    case 'by-service':
      return getByServiceType();

    case 'by-provider':
      const providerId = searchParams.get('providerId');
      return getByProvider(providerId);

    case 'recent':
      const limit = parseInt(searchParams.get('limit') || '50');
      return getRecentDispatches(limit);

    case 'performance':
      return getPerformanceMetrics();

    default:
      return NextResponse.json({
        success: true,
        message: 'Smart Ride Dispatch Analytics API',
        endpoints: [
          'GET /api/dispatch/analytics?action=summary - Get overall summary',
          'GET /api/dispatch/analytics?action=by-service - Get metrics by service type',
          'GET /api/dispatch/analytics?action=by-provider&providerId=xxx - Get provider metrics',
          'GET /api/dispatch/analytics?action=recent&limit=50 - Get recent dispatches',
          'GET /api/dispatch/analytics?action=performance - Get performance metrics',
          'POST /api/dispatch/analytics - Record dispatch metric',
        ],
      });
  }
}

// POST /api/dispatch/analytics - Record a dispatch metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'dispatch':
        return recordDispatchMetric(data);

      case 'provider':
        return updateProviderMetric(data);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid metric type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler functions
function getSummary() {
  const total = dispatchMetrics.length;
  const successful = dispatchMetrics.filter((m) => m.status === 'SUCCESS').length;
  const failed = dispatchMetrics.filter((m) => m.status === 'FAILED').length;
  const cancelled = dispatchMetrics.filter((m) => m.status === 'CANCELLED').length;
  const timeout = dispatchMetrics.filter((m) => m.status === 'TIMEOUT').length;

  const avgSearchDuration =
    total > 0
      ? dispatchMetrics.reduce((sum, m) => sum + m.searchDurationMs, 0) / total
      : 0;

  const avgProvidersFound =
    total > 0
      ? dispatchMetrics.reduce((sum, m) => sum + m.totalProvidersFound, 0) / total
      : 0;

  const avgAttempts =
    total > 0
      ? dispatchMetrics.reduce((sum, m) => sum + m.totalAttempts, 0) / total
      : 0;

  // Today's metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMetrics = dispatchMetrics.filter(
    (m) => new Date(m.createdAt) >= today
  );

  // Last hour metrics
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const lastHourMetrics = dispatchMetrics.filter(
    (m) => new Date(m.createdAt) >= oneHourAgo
  );

  return NextResponse.json({
    success: true,
    data: {
      total,
      successful,
      failed,
      cancelled,
      timeout,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
      averageSearchDurationMs: Math.round(avgSearchDuration),
      averageProvidersFound: Math.round(avgProvidersFound * 10) / 10,
      averageAttempts: Math.round(avgAttempts * 10) / 10,
      today: {
        total: todayMetrics.length,
        successful: todayMetrics.filter((m) => m.status === 'SUCCESS').length,
      },
      lastHour: {
        total: lastHourMetrics.length,
        successful: lastHourMetrics.filter((m) => m.status === 'SUCCESS').length,
      },
      providerMetrics: {
        total: providerMetrics.size,
        active: Array.from(providerMetrics.values()).filter(
          (p) => new Date(p.lastActiveAt) >= oneHourAgo
        ).length,
      },
    },
  });
}

function getByServiceType() {
  const serviceTypes = [
    'SMART_BODA_RIDE',
    'SMART_CAR_RIDE',
    'FOOD_DELIVERY',
    'SHOPPING',
    'ITEM_DELIVERY',
    'SMART_HEALTH_DELIVERY',
    'DOCTOR_CONSULTATION',
  ];

  const byType = serviceTypes.map((serviceType) => {
    const metrics = dispatchMetrics.filter((m) => m.serviceType === serviceType);
    const total = metrics.length;
    const successful = metrics.filter((m) => m.status === 'SUCCESS').length;

    return {
      serviceType,
      total,
      successful,
      failed: metrics.filter((m) => m.status === 'FAILED').length,
      timeout: metrics.filter((m) => m.status === 'TIMEOUT').length,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
      avgSearchDuration:
        total > 0
          ? Math.round(metrics.reduce((sum, m) => sum + m.searchDurationMs, 0) / total)
          : 0,
      avgProvidersFound:
        total > 0
          ? Math.round(
              (metrics.reduce((sum, m) => sum + m.totalProvidersFound, 0) / total) * 10
            ) / 10
          : 0,
    };
  });

  return NextResponse.json({
    success: true,
    data: byType,
  });
}

function getByProvider(providerId: string | null) {
  if (providerId) {
    const metric = providerMetrics.get(providerId);
    if (!metric) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      );
    }

    const dispatches = dispatchMetrics.filter(
      (m) => m.matchedProviderId === providerId
    );

    return NextResponse.json({
      success: true,
      data: {
        ...metric,
        dispatchHistory: dispatches.slice(-20),
      },
    });
  }

  // Return all providers
  const allProviders = Array.from(providerMetrics.values()).sort(
    (a, b) => b.tasksCompleted - a.tasksCompleted
  );

  return NextResponse.json({
    success: true,
    data: allProviders,
    count: allProviders.length,
  });
}

function getRecentDispatches(limit: number) {
  const recent = dispatchMetrics
    .slice(-limit)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    success: true,
    data: recent,
    count: recent.length,
  });
}

function getPerformanceMetrics() {
  // Time-based performance
  const now = Date.now();
  const intervals = [
    { label: 'last_15_min', ms: 15 * 60 * 1000 },
    { label: 'last_30_min', ms: 30 * 60 * 1000 },
    { label: 'last_hour', ms: 60 * 60 * 1000 },
    { label: 'last_6_hours', ms: 6 * 60 * 60 * 1000 },
    { label: 'last_24_hours', ms: 24 * 60 * 60 * 1000 },
  ];

  const byInterval = intervals.map(({ label, ms }) => {
    const cutoff = new Date(now - ms);
    const metrics = dispatchMetrics.filter(
      (m) => new Date(m.createdAt) >= cutoff
    );
    const total = metrics.length;
    const successful = metrics.filter((m) => m.status === 'SUCCESS').length;

    return {
      interval: label,
      total,
      successful,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
      avgSearchDuration:
        total > 0
          ? Math.round(metrics.reduce((sum, m) => sum + m.searchDurationMs, 0) / total)
          : 0,
    };
  });

  // Distribution of search durations
  const durationBuckets = [
    { label: '0-5s', min: 0, max: 5000 },
    { label: '5-15s', min: 5000, max: 15000 },
    { label: '15-30s', min: 15000, max: 30000 },
    { label: '30-60s', min: 30000, max: 60000 },
    { label: '1-2min', min: 60000, max: 120000 },
    { label: '2-5min', min: 120000, max: 300000 },
    { label: '>5min', min: 300000, max: Infinity },
  ];

  const durationDistribution = durationBuckets.map(({ label, min, max }) => ({
    label,
    count: dispatchMetrics.filter(
      (m) => m.searchDurationMs >= min && m.searchDurationMs < max
    ).length,
  }));

  // Distribution of final radius
  const radiusBuckets = [
    { label: '0-5km', min: 0, max: 5 },
    { label: '5-10km', min: 5, max: 10 },
    { label: '10-15km', min: 10, max: 15 },
    { label: '15-20km', min: 15, max: 20 },
    { label: '>20km', min: 20, max: Infinity },
  ];

  const radiusDistribution = radiusBuckets.map(({ label, min, max }) => ({
    label,
    count: dispatchMetrics.filter(
      (m) => m.finalRadiusKm >= min && m.finalRadiusKm < max
    ).length,
  }));

  return NextResponse.json({
    success: true,
    data: {
      byInterval,
      durationDistribution,
      radiusDistribution,
    },
  });
}

function recordDispatchMetric(data: {
  requestId: string;
  serviceType: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  matchedProviderId?: string;
  matchedProviderScore?: number;
  matchedProviderRank?: number;
  totalProvidersFound: number;
  totalAttempts: number;
  searchDurationMs: number;
  finalRadiusKm: number;
}) {
  const metric: DispatchMetric = {
    id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...data,
    createdAt: new Date(),
  };

  dispatchMetrics.push(metric);

  // Keep only last 10000 metrics
  if (dispatchMetrics.length > 10000) {
    dispatchMetrics.shift();
  }

  // Update provider metric if matched
  if (data.matchedProviderId && data.status === 'SUCCESS') {
    updateProviderFromDispatch(data.matchedProviderId, data.serviceType);
  }

  return NextResponse.json({
    success: true,
    data: { metricId: metric.id },
  });
}

function updateProviderMetric(data: Partial<ProviderMetric> & { providerId: string }) {
  const existing = providerMetrics.get(data.providerId);

  if (existing) {
    providerMetrics.set(data.providerId, {
      ...existing,
      ...data,
      lastActiveAt: new Date(),
    });
  } else {
    providerMetrics.set(data.providerId, {
      providerId: data.providerId,
      providerType: data.providerType || 'UNKNOWN',
      tasksAssigned: 0,
      tasksCompleted: 0,
      tasksCancelled: 0,
      totalEarnings: 0,
      averageRating: 5.0,
      averageResponseTimeMs: 10000,
      acceptanceRate: 100,
      completionRate: 100,
      ...data,
      lastActiveAt: new Date(),
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Provider metric updated',
  });
}

function updateProviderFromDispatch(providerId: string, serviceType: string) {
  const existing = providerMetrics.get(providerId);

  if (existing) {
    existing.tasksAssigned += 1;
    existing.tasksCompleted += 1;
    existing.lastActiveAt = new Date();
  } else {
    providerMetrics.set(providerId, {
      providerId,
      providerType: getProviderTypeFromService(serviceType),
      tasksAssigned: 1,
      tasksCompleted: 1,
      tasksCancelled: 0,
      totalEarnings: 0,
      averageRating: 5.0,
      averageResponseTimeMs: 10000,
      acceptanceRate: 100,
      completionRate: 100,
      lastActiveAt: new Date(),
    });
  }
}

function getProviderTypeFromService(serviceType: string): string {
  const map: Record<string, string> = {
    SMART_BODA_RIDE: 'SMART_BODA_RIDER',
    SMART_CAR_RIDE: 'SMART_CAR_DRIVER',
    FOOD_DELIVERY: 'DELIVERY_PERSONNEL',
    SHOPPING: 'DELIVERY_PERSONNEL',
    ITEM_DELIVERY: 'DELIVERY_PERSONNEL',
    SMART_HEALTH_DELIVERY: 'PHARMACY',
    DOCTOR_CONSULTATION: 'PRIVATE_DOCTOR',
  };
  return map[serviceType] || 'UNKNOWN';
}

// Export stores for testing
export { dispatchMetrics, providerMetrics };

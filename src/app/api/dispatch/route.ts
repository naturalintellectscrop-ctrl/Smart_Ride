// Smart Ride Dispatch API
// REST endpoints for dispatch operations

import { NextRequest, NextResponse } from 'next/server';
import {
  createDispatchRequest,
  startDispatch,
  handleOfferAccepted,
  handleOfferRejected,
  cancelDispatch,
  getDispatchResult,
  getPendingRequests,
  registerProvider,
  unregisterProvider,
  updateProviderLocation,
  updateProviderStatus,
  getProvider,
  getAllProviders,
  getAvailableProviders,
  completeTask,
  getDispatchLogs,
} from '@/lib/dispatch/dispatch-engine';
import {
  DispatchRequest,
  DispatchConfig,
  DEFAULT_DISPATCH_CONFIG,
  Provider,
} from '@/lib/dispatch/types';

// GET /api/dispatch - Get dispatch stats and pending requests
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'pending':
      return NextResponse.json({
        success: true,
        data: getPendingRequests(),
      });

    case 'providers':
      const online = searchParams.get('online') === 'true';
      const providers = online ? getAvailableProviders() : getAllProviders();
      return NextResponse.json({
        success: true,
        data: providers,
        count: providers.length,
      });

    case 'result':
      const requestId = searchParams.get('requestId');
      if (!requestId) {
        return NextResponse.json(
          { success: false, error: 'requestId is required' },
          { status: 400 }
        );
      }
      const result = getDispatchResult(requestId);
      return NextResponse.json({
        success: true,
        data: result,
      });

    case 'logs':
      const logRequestId = searchParams.get('requestId');
      const logs = getDispatchLogs(logRequestId || undefined);
      return NextResponse.json({
        success: true,
        data: logs.slice(-100), // Last 100 logs
        count: logs.length,
      });

    case 'stats':
      const allProviders = getAllProviders();
      const onlineProviders = allProviders.filter((p) => p.isOnline);
      const availableProviders = allProviders.filter(
        (p) => p.isOnline && p.isAvailable
      );
      const pending = getPendingRequests();

      return NextResponse.json({
        success: true,
        data: {
          totalProviders: allProviders.length,
          onlineProviders: onlineProviders.length,
          availableProviders: availableProviders.length,
          pendingRequests: pending.length,
          byType: {
            SMART_BODA_RIDER: onlineProviders.filter(
              (p) => p.type === 'SMART_BODA_RIDER'
            ).length,
            SMART_CAR_DRIVER: onlineProviders.filter(
              (p) => p.type === 'SMART_CAR_DRIVER'
            ).length,
            DELIVERY_PERSONNEL: onlineProviders.filter(
              (p) => p.type === 'DELIVERY_PERSONNEL'
            ).length,
            PHARMACY: onlineProviders.filter((p) => p.type === 'PHARMACY').length,
            DRUG_SHOP: onlineProviders.filter((p) => p.type === 'DRUG_SHOP').length,
          },
        },
      });

    default:
      return NextResponse.json({
        success: true,
        message: 'Smart Ride Dispatch API',
        endpoints: [
          'GET /api/dispatch?action=pending - Get pending requests',
          'GET /api/dispatch?action=providers - Get all providers',
          'GET /api/dispatch?action=providers&online=true - Get online providers',
          'GET /api/dispatch?action=result&requestId=xxx - Get dispatch result',
          'GET /api/dispatch?action=logs - Get dispatch logs',
          'GET /api/dispatch?action=stats - Get dispatch statistics',
          'POST /api/dispatch - Create and start dispatch',
          'POST /api/dispatch?action=accept - Provider accepts offer',
          'POST /api/dispatch?action=reject - Provider rejects offer',
          'POST /api/dispatch?action=cancel - Cancel dispatch',
          'POST /api/dispatch?action=register - Register provider',
          'POST /api/dispatch?action=update-location - Update provider location',
          'POST /api/dispatch?action=update-status - Update provider status',
          'POST /api/dispatch?action=complete - Complete task',
        ],
      });
  }
}

// POST /api/dispatch - Various dispatch actions
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    const body = await request.json();

    switch (action) {
      case 'create':
        // Create and start a new dispatch
        return await handleCreateDispatch(body);

      case 'accept':
        // Provider accepts an offer
        return await handleAcceptOffer(body);

      case 'reject':
        // Provider rejects an offer
        return await handleRejectOffer(body);

      case 'cancel':
        // Cancel a dispatch
        return await handleCancelDispatch(body);

      case 'register':
        // Register a provider
        return await handleRegisterProvider(body);

      case 'unregister':
        // Unregister a provider
        return await handleUnregisterProvider(body);

      case 'update-location':
        // Update provider location
        return await handleUpdateLocation(body);

      case 'update-status':
        // Update provider status
        return await handleUpdateStatus(body);

      case 'complete':
        // Complete a task
        return await handleCompleteTask(body);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Dispatch API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleCreateDispatch(data: {
  request: DispatchRequest;
  config?: Partial<DispatchConfig>;
}) {
  const { request: dispatchRequest, config } = data;

  if (!dispatchRequest || !dispatchRequest.id || !dispatchRequest.serviceType) {
    return NextResponse.json(
      { success: false, error: 'Invalid dispatch request' },
      { status: 400 }
    );
  }

  const dispatchConfig: DispatchConfig = {
    ...DEFAULT_DISPATCH_CONFIG,
    ...config,
  };

  // Start dispatch (without WebSocket notifications in REST API)
  const result = startDispatch(dispatchRequest, dispatchConfig);

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Dispatch started',
  });
}

async function handleAcceptOffer(data: {
  requestId: string;
  providerId: string;
}) {
  const { requestId, providerId } = data;

  if (!requestId || !providerId) {
    return NextResponse.json(
      { success: false, error: 'requestId and providerId are required' },
      { status: 400 }
    );
  }

  const result = handleOfferAccepted(requestId, providerId);

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Dispatch not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Offer accepted',
  });
}

async function handleRejectOffer(data: {
  requestId: string;
  providerId: string;
  reason?: string;
}) {
  const { requestId, providerId, reason } = data;

  if (!requestId || !providerId) {
    return NextResponse.json(
      { success: false, error: 'requestId and providerId are required' },
      { status: 400 }
    );
  }

  const result = handleOfferRejected(requestId, providerId, reason);

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Dispatch not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Offer rejected',
  });
}

async function handleCancelDispatch(data: {
  requestId: string;
  reason: string;
}) {
  const { requestId, reason } = data;

  if (!requestId) {
    return NextResponse.json(
      { success: false, error: 'requestId is required' },
      { status: 400 }
    );
  }

  const result = cancelDispatch(requestId, reason || 'User cancelled');

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Dispatch not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Dispatch cancelled',
  });
}

async function handleRegisterProvider(data: { provider: Provider }) {
  const { provider } = data;

  if (!provider || !provider.id) {
    return NextResponse.json(
      { success: false, error: 'Invalid provider data' },
      { status: 400 }
    );
  }

  registerProvider(provider);

  return NextResponse.json({
    success: true,
    data: { providerId: provider.id },
    message: 'Provider registered',
  });
}

async function handleUnregisterProvider(data: { providerId: string }) {
  const { providerId } = data;

  if (!providerId) {
    return NextResponse.json(
      { success: false, error: 'providerId is required' },
      { status: 400 }
    );
  }

  unregisterProvider(providerId);

  return NextResponse.json({
    success: true,
    message: 'Provider unregistered',
  });
}

async function handleUpdateLocation(data: {
  providerId: string;
  latitude: number;
  longitude: number;
}) {
  const { providerId, latitude, longitude } = data;

  if (!providerId || latitude === undefined || longitude === undefined) {
    return NextResponse.json(
      { success: false, error: 'providerId, latitude, and longitude are required' },
      { status: 400 }
    );
  }

  updateProviderLocation(providerId, latitude, longitude);

  return NextResponse.json({
    success: true,
    message: 'Location updated',
  });
}

async function handleUpdateStatus(data: {
  providerId: string;
  isOnline?: boolean;
  isAvailable?: boolean;
  currentTaskId?: string;
}) {
  const { providerId, isOnline, isAvailable, currentTaskId } = data;

  if (!providerId) {
    return NextResponse.json(
      { success: false, error: 'providerId is required' },
      { status: 400 }
    );
  }

  const provider = getProvider(providerId);
  if (!provider) {
    return NextResponse.json(
      { success: false, error: 'Provider not found' },
      { status: 404 }
    );
  }

  updateProviderStatus(
    providerId,
    isOnline ?? provider.isOnline,
    isAvailable ?? provider.isAvailable,
    currentTaskId
  );

  return NextResponse.json({
    success: true,
    message: 'Status updated',
  });
}

async function handleCompleteTask(data: {
  providerId: string;
  taskId: string;
}) {
  const { providerId, taskId } = data;

  if (!providerId || !taskId) {
    return NextResponse.json(
      { success: false, error: 'providerId and taskId are required' },
      { status: 400 }
    );
  }

  completeTask(providerId, taskId);

  return NextResponse.json({
    success: true,
    message: 'Task completed',
  });
}

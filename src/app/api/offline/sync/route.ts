// ============================================
// SMART RIDE - OFFLINE SYNC API
// ============================================
// Batch sync endpoint for offline data
// Handles location updates, task state changes,
// and data caching for weak internet conditions
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/offline/sync-service';
import { OfflineQueue } from '@/lib/offline/offline-queue';
import { CacheManager } from '@/lib/offline/cache-manager';
import { ConnectionManager } from '@/lib/offline/connection-manager';
import { authGuard } from '@/lib/auth/guards';

// POST /api/offline/sync - Batch sync endpoint
export async function POST(request: NextRequest) {
  try {
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      locations, 
      taskStates, 
      riderId, 
      forceFullSync = false 
    } = body;

    const results: any = {
      syncId: `sync_${Date.now()}`,
      timestamp: new Date().toISOString(),
      connectionMode: ConnectionManager.getRecommendedMode(),
    };

    // Sync location data
    if (locations && locations.length > 0 && riderId) {
      const locationResult = await SyncService.syncLocation(riderId, locations);
      results.locationSync = locationResult;
    }

    // Sync task state changes
    if (taskStates && taskStates.length > 0) {
      const taskResult = await SyncService.syncTaskStates(taskStates);
      results.taskSync = taskResult;
    }

    // Process offline queue
    if (forceFullSync) {
      const queueResult = await OfflineQueue.processQueue();
      results.queueProcessed = queueResult;
    }

    // Update connection quality based on sync performance
    const startTime = request.headers.get('x-request-start');
    if (startTime) {
      const latency = Date.now() - parseInt(startTime);
      ConnectionManager.updateQuality(latency, true);
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    ConnectionManager.updateQuality(0, false);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/offline/sync - Get sync status and queue info
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
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          data: {
            connection: ConnectionManager.getConnectionInfo(),
            queue: OfflineQueue.getQueueStatus(),
            cache: CacheManager.getCacheStats(),
            network: ConnectionManager.getNetworkStats(),
          },
        });

      case 'queue':
        return NextResponse.json({
          success: true,
          data: {
            queue: OfflineQueue.getQueueStatus(),
            pendingRequests: OfflineQueue.getPendingRequests(),
          },
        });

      case 'cache':
        return NextResponse.json({
          success: true,
          data: CacheManager.getCacheStats(),
        });

      default:
        return NextResponse.json({
          success: true,
          endpoints: {
            'GET /api/offline/sync?action=status': 'Get full sync status',
            'GET /api/offline/sync?action=queue': 'Get offline queue status',
            'GET /api/offline/sync?action=cache': 'Get cache statistics',
            'POST /api/offline/sync': 'Sync offline data',
          },
        });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/offline/sync - Clear queue and cache
export async function DELETE(request: NextRequest) {
  try {
    const user = await authGuard(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'queue':
        const cleared = await OfflineQueue.clearCompleted();
        return NextResponse.json({
          success: true,
          message: `Cleared ${cleared} completed requests`,
        });

      case 'cache':
        CacheManager.clearExpired();
        return NextResponse.json({
          success: true,
          message: 'Expired cache entries cleared',
        });

      case 'retry':
        const retried = await OfflineQueue.retryFailed();
        return NextResponse.json({
          success: true,
          message: `Retrying ${retried} failed requests`,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Specify action: queue, cache, or retry' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

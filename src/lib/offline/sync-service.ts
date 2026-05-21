// ============================================
// SMART RIDE - SYNC SERVICE
// ============================================
// Handles data synchronization for offline devices
// Batches and optimizes data transfer for
// Uganda's weak internet infrastructure
// ============================================

import { db } from '@/lib/db';
import { ConnectionManager } from './connection-manager';
import { OfflineQueue } from './offline-queue';
import { CacheManager } from './cache-manager';

// ============================================
// TYPES
// ============================================

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  pending: number;
  errors: string[];
}

export interface LocationSync {
  riderId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  battery?: number;
  accuracy?: number;
  timestamp: Date;
}

export interface TaskStateSync {
  taskId: string;
  status: string;
  riderId?: string;
  latitude?: number;
  longitude?: number;
  reason?: string;
  timestamp: Date;
}

export interface SyncStatus {
  entityType: string;
  entityId: string;
  lastSyncedAt: Date;
  pendingChanges: number;
}

// ============================================
// SYNC STATE
// ============================================

const syncStatusStore = new Map<string, SyncStatus>();

// ============================================
// SYNC SERVICE
// ============================================

export class SyncService {
  // ============================================
  // LOCATION SYNC
  // ============================================

  /**
   * Sync rider location (batched for efficiency)
   */
  static async syncLocation(
    riderId: string,
    locations: LocationSync[]
  ): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    for (const location of locations) {
      try {
        // Compress precision to 6 decimal places
        const lat = Number(location.latitude.toFixed(6));
        const lng = Number(location.longitude.toFixed(6));

        // Update rider location
        await db.rider.update({
          where: { id: riderId },
          data: {
            currentLatitude: lat,
            currentLongitude: lng,
            lastLocationUpdate: new Date(),
            lastKnownSpeed: location.speed,
            lastKnownHeading: location.heading,
            lastKnownBattery: location.battery,
            lastHeartbeatAt: new Date(),
          },
        });

        // Create heartbeat log for tracking
        await db.heartbeatLog.create({
          data: {
            riderId,
            latitude: lat,
            longitude: lng,
            speed: location.speed,
            heading: location.heading,
            batteryLevel: location.battery,
            accuracy: location.accuracy,
            connectionStatus: 'ACTIVE',
            createdAt: location.timestamp,
          },
        });

        synced++;
      } catch (error: any) {
        errors.push(`Location sync failed: ${error.message}`);
        failed++;
      }
    }

    // Update sync status
    this.markSynced('rider_location', riderId);

    return {
      success: failed === 0,
      synced,
      failed,
      pending: 0,
      errors,
    };
  }

  // ============================================
  // TASK STATE SYNC
  // ============================================

  /**
   * Sync task state changes
   */
  static async syncTaskStates(
    changes: TaskStateSync[]
  ): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    for (const change of changes) {
      try {
        // Queue task transition for processing
        await OfflineQueue.enqueue({
          url: `/api/tasks/${change.taskId}/transition`,
          method: 'POST',
          body: {
            toStatus: change.status,
            riderId: change.riderId,
            reason: change.reason,
            latitude: change.latitude,
            longitude: change.longitude,
          },
          priority: 'HIGH',
        });

        // Create transition record directly
        await db.taskStateTransition.create({
          data: {
            taskId: change.taskId,
            fromStatus: null, // Will be populated by state machine
            toStatus: change.status as any,
            triggeredBy: change.riderId,
            triggeredByType: 'RIDER',
            reason: change.reason,
            metadata: JSON.stringify({
              synced: true,
              syncTimestamp: new Date().toISOString(),
              originalTimestamp: change.timestamp,
            }),
            latitude: change.latitude ? Number(change.latitude.toFixed(6)) : null,
            longitude: change.longitude ? Number(change.longitude.toFixed(6)) : null,
          },
        });

        synced++;
      } catch (error: any) {
        errors.push(`Task state sync failed for ${change.taskId}: ${error.message}`);
        failed++;
      }
    }

    return {
      success: failed === 0,
      synced,
      failed,
      pending: OfflineQueue.getPendingCount(),
      errors,
    };
  }

  // ============================================
  // SYNC STATUS TRACKING
  // ============================================

  /**
   * Get last sync timestamp for an entity
   */
  static getLastSync(entityType: string, entityId: string): Date | null {
    const key = `${entityType}:${entityId}`;
    const status = syncStatusStore.get(key);
    return status?.lastSyncedAt || null;
  }

  /**
   * Mark entity as synced
   */
  static markSynced(entityType: string, entityId: string): void {
    const key = `${entityType}:${entityId}`;
    syncStatusStore.set(key, {
      entityType,
      entityId,
      lastSyncedAt: new Date(),
      pendingChanges: 0,
    });
  }

  /**
   * Get pending changes count
   */
  static getPendingChangesCount(entityType: string): number {
    let count = 0;
    for (const status of syncStatusStore.values()) {
      if (status.entityType === entityType) {
        count += status.pendingChanges;
      }
    }
    return count;
  }

  // ============================================
  // FULL SYNC
  // ============================================

  /**
   * Perform full synchronization
   */
  static async performFullSync(options: {
    riderId?: string;
    includeLocation?: boolean;
    includeTasks?: boolean;
    includeCache?: boolean;
  } = {}): Promise<{
    success: boolean;
    results: {
      offlineQueue?: any;
      locationSync?: SyncResult;
      cacheRefresh?: number;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const results: any = {};

    // Process offline queue first
    if (ConnectionManager.isOnline()) {
      try {
        results.offlineQueue = await OfflineQueue.processQueue();
      } catch (error: any) {
        errors.push(`Queue processing error: ${error.message}`);
      }

      // Sync cached data
      if (options.includeCache && options.riderId) {
        try {
          await CacheManager.cacheRiderData(options.riderId);
          await CacheManager.cacheRiderActiveTasks(options.riderId);
          await CacheManager.cachePricingConfig();
          results.cacheRefresh = 3;
        } catch (error: any) {
          errors.push(`Cache refresh error: ${error.message}`);
        }
      }

      // Mark sync complete
      if (options.riderId) {
        this.markSynced('rider', options.riderId);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  // ============================================
  // LOW BANDWIDTH OPTIMIZATION
  // ============================================

  /**
   * Get minimal sync payload (for poor connections)
   * Only includes critical fields
   */
  static getMinimalPayload(data: any): any {
    if (!data || typeof data !== 'object') return data;

    // For location data, only include essential fields
    if (data.latitude !== undefined) {
      return {
        lat: Number(data.latitude.toFixed(6)),
        lng: Number(data.longitude.toFixed(6)),
        t: data.timestamp ? Math.floor(new Date(data.timestamp).getTime() / 1000) : undefined,
      };
    }

    // For task state, only include essential fields
    if (data.taskId) {
      return {
        tid: data.taskId,
        s: data.status,
        ts: data.timestamp ? Math.floor(new Date(data.timestamp).getTime() / 1000) : undefined,
      };
    }

    return data;
  }

  /**
   * Compress location array for batch sync
   */
  static compressLocationsForSync(
    locations: LocationSync[]
  ): Array<{
    lat: number;
    lng: number;
    t: number;
    spd?: number;
    hdg?: number;
    bat?: number;
  }> {
    return locations.map(loc => ({
      lat: Number(loc.latitude.toFixed(6)),
      lng: Number(loc.longitude.toFixed(6)),
      t: Math.floor(loc.timestamp.getTime() / 1000),
      ...(loc.speed ? { spd: Number(loc.speed.toFixed(1)) } : {}),
      ...(loc.heading ? { hdg: Number(loc.heading.toFixed(1)) } : {}),
      ...(loc.battery ? { bat: loc.battery } : {}),
    }));
  }

  /**
   * Decompress locations from sync
   */
  static decompressLocations(
    compressed: Array<{ lat: number; lng: number; t: number; spd?: number; hdg?: number; bat?: number }>
  ): LocationSync[] {
    return compressed.map(c => ({
      riderId: '',
      latitude: c.lat,
      longitude: c.lng,
      speed: c.spd,
      heading: c.hdg,
      battery: c.bat,
      timestamp: new Date(c.t * 1000),
    }));
  }
}

export default SyncService;

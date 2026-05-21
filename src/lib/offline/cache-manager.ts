// ============================================
// SMART RIDE - CACHE MANAGER
// ============================================
// Manages cached data for offline access
// Critical data is cached locally for Uganda's
// weak internet infrastructure
// ============================================

import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

interface CacheEntry<T> {
  data: T;
  cachedAt: Date;
  ttlMinutes: number;
  version: number;
  checksum?: string;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  hitRate: number;
  missRate: number;
}

// ============================================
// CACHE STORAGE
// ============================================

const cacheStore = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MINUTES = 15;
const CACHE_VERSION = 1;

// Cache hit/miss tracking
let cacheHits = 0;
let cacheMisses = 0;

// ============================================
// CACHE MANAGER
// ============================================

export class CacheManager {
  // ============================================
  // CORE CACHE OPERATIONS
  // ============================================

  /**
   * Get cached data if fresh
   */
  static getCached<T>(key: string): T | null {
    const entry = cacheStore.get(key);
    
    if (!entry) {
      cacheMisses++;
      return null;
    }

    // Check if cache is fresh
    if (this.isExpired(entry)) {
      cacheStore.delete(key);
      cacheMisses++;
      return null;
    }

    cacheHits++;
    return entry.data;
  }

  /**
   * Set cached data with TTL
   */
  static setCached<T>(key: string, data: T, ttlMinutes: number = DEFAULT_TTL_MINUTES): void {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: new Date(),
      ttlMinutes,
      version: CACHE_VERSION,
    };

    cacheStore.set(key, entry);
  }

  /**
   * Check if cache entry is fresh
   */
  static isCacheFresh(key: string): boolean {
    const entry = cacheStore.get(key);
    if (!entry) return false;
    return !this.isExpired(entry);
  }

  /**
   * Get cache age in minutes
   */
  static getCacheAge(key: string): number | null {
    const entry = cacheStore.get(key);
    if (!entry) return null;
    
    const ageMs = Date.now() - entry.cachedAt.getTime();
    return Math.floor(ageMs / (1000 * 60));
  }

  /**
   * Invalidate a cache entry
   */
  static invalidate(key: string): boolean {
    return cacheStore.delete(key);
  }

  /**
   * Invalidate all cache entries matching pattern
   */
  static invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;
    
    for (const key of cacheStore.keys()) {
      if (regex.test(key)) {
        cacheStore.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clear all cache entries
   */
  static clearAll(): void {
    cacheStore.clear();
    cacheHits = 0;
    cacheMisses = 0;
  }

  /**
   * Clear expired cache entries
   */
  static clearExpired(): number {
    let cleared = 0;
    
    for (const [key, entry] of cacheStore.entries()) {
      if (this.isExpired(entry)) {
        cacheStore.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  // ============================================
  // RIDER DATA CACHING
  // ============================================

  /**
   * Cache critical rider data for offline access
   */
  static async cacheRiderData(riderId: string): Promise<void> {
    try {
      const rider = await db.rider.findUnique({
        where: { id: riderId },
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          vehicle: true,
        },
      });

      if (rider) {
        this.setCached(`rider:${riderId}:profile`, rider, 30);
      }
    } catch (error) {
      console.error('Failed to cache rider data:', error);
    }
  }

  /**
   * Get cached rider data
   */
  static getCachedRiderData(riderId: string): any | null {
    return this.getCached(`rider:${riderId}:profile`);
  }

  // ============================================
  // TASK DATA CACHING
  // ============================================

  /**
   * Cache active task details
   */
  static async cacheActiveTask(taskId: string): Promise<void> {
    try {
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          rider: { select: { id: true, fullName: true, phone: true } },
          order: { include: { items: true, merchant: true } },
        },
      });

      if (task) {
        this.setCached(`task:${taskId}:details`, task, 10);
      }
    } catch (error) {
      console.error('Failed to cache task data:', error);
    }
  }

  /**
   * Get cached task data
   */
  static getCachedTask(taskId: string): any | null {
    return this.getCached(`task:${taskId}:details`);
  }

  /**
   * Cache rider's active tasks
   */
  static async cacheRiderActiveTasks(riderId: string): Promise<void> {
    try {
      const tasks = await db.task.findMany({
        where: {
          riderId,
          status: { in: ['ASSIGNED', 'ACCEPTED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'IN_TRANSIT'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      this.setCached(`rider:${riderId}:active_tasks`, tasks, 5);
    } catch (error) {
      console.error('Failed to cache rider tasks:', error);
    }
  }

  // ============================================
  // PRICING CONFIG CACHING
  // ============================================

  /**
   * Cache pricing configuration
   */
  static async cachePricingConfig(): Promise<void> {
    try {
      const configs = await db.pricingConfig.findMany();
      
      for (const config of configs) {
        this.setCached(`pricing:${config.serviceType}`, config, 60);
      }
      
      this.setCached('pricing:all', configs, 60);
    } catch (error) {
      console.error('Failed to cache pricing config:', error);
    }
  }

  /**
   * Get cached pricing config for service
   */
  static getCachedPricingConfig(serviceType: string): any | null {
    return this.getCached(`pricing:${serviceType}`);
  }

  // ============================================
  // MERCHANT/RESTAURANT CACHING
  // ============================================

  /**
   * Cache nearby merchants
   */
  static async cacheNearbyMerchants(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<void> {
    try {
      // For SQLite, fetch all and filter in JS
      const merchants = await db.merchant.findMany({
        where: {
          isOpen: true,
          status: 'APPROVED',
        },
        include: {
          menuItems: {
            where: { isAvailable: true },
            take: 20,
          },
        },
      });

      // Filter by distance
      const nearbyMerchants = merchants.filter(m => {
        if (!m.latitude || !m.longitude) return false;
        const distance = this.calculateDistance(latitude, longitude, m.latitude, m.longitude);
        return distance <= radiusKm;
      });

      const cacheKey = `merchants:nearby:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      this.setCached(cacheKey, nearbyMerchants, 30);
    } catch (error) {
      console.error('Failed to cache nearby merchants:', error);
    }
  }

  /**
   * Get cached nearby merchants
   */
  static getCachedNearbyMerchants(latitude: number, longitude: number): any[] | null {
    const cacheKey = `merchants:nearby:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    return this.getCached(cacheKey);
  }

  // ============================================
  // LOCATION BATCHING
  // ============================================

  /**
   * Compress location data for low bandwidth
   * Reduces decimal precision to 6 places
   */
  static compressLocationData(locations: Array<{ lat: number; lng: number; timestamp: Date }>): string {
    const compressed = locations.map(loc => ({
      lat: Number(loc.lat.toFixed(6)),
      lng: Number(loc.lng.toFixed(6)),
      t: Math.floor(loc.timestamp.getTime() / 1000), // Unix timestamp
    }));

    return JSON.stringify(compressed);
  }

  /**
   * Batch locations for sync
   */
  static batchLocations(
    locations: Array<{ lat: number; lng: number; timestamp: Date }>,
    batchSize: number = 50
  ): Array<Array<{ lat: number; lng: number; timestamp: Date }>> {
    const batches: Array<Array<{ lat: number; lng: number; timestamp: Date }>> = [];
    
    for (let i = 0; i < locations.length; i += batchSize) {
      batches.push(locations.slice(i, i + batchSize));
    }
    
    return batches;
  }

  // ============================================
  // STATISTICS & MONITORING
  // ============================================

  /**
   * Get cache statistics
   */
  static getCacheStats(): CacheStats {
    const entries = Array.from(cacheStore.values());
    const total = cacheHits + cacheMisses;
    
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    for (const entry of entries) {
      if (!oldestEntry || entry.cachedAt < oldestEntry) {
        oldestEntry = entry.cachedAt;
      }
      if (!newestEntry || entry.cachedAt > newestEntry) {
        newestEntry = entry.cachedAt;
      }
    }

    // Estimate size in bytes
    let totalSize = 0;
    for (const [key, entry] of cacheStore.entries()) {
      totalSize += key.length * 2; // UTF-16 chars
      totalSize += JSON.stringify(entry.data).length * 2;
    }

    return {
      totalEntries: cacheStore.size,
      totalSize,
      oldestEntry,
      newestEntry,
      hitRate: total > 0 ? cacheHits / total : 0,
      missRate: total > 0 ? cacheMisses / total : 0,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private static isExpired(entry: CacheEntry<any>): boolean {
    const ageMs = Date.now() - entry.cachedAt.getTime();
    const ttlMs = entry.ttlMinutes * 60 * 1000;
    return ageMs > ttlMs;
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export default CacheManager;

// Driver Location Store - In-memory store for real-time driver locations
// Uses geospatial indexing for efficient nearby driver queries

export interface DriverLocationEntry {
  driverId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  isOnline: boolean;
  isAvailable: boolean;
  lastUpdate: Date;
  vehicleType: 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER';
  currentTaskId?: string;
  batteryLevel?: number;
  connectionStatus: 'ACTIVE' | 'UNSTABLE' | 'DISCONNECTED';
}

export interface NearbyDriverQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  vehicleTypes?: ('BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER')[];
  availableOnly?: boolean;
  limit?: number;
}

export interface NearbyDriverResult extends DriverLocationEntry {
  distance: number;
  estimatedArrivalMinutes: number;
}

// ==========================================
// Constants
// ==========================================

const EARTH_RADIUS_KM = 6371;
const MAX_STORED_DRIVERS = 10000;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ==========================================
// Driver Location Store Class
// ==========================================

class DriverLocationStore {
  private drivers: Map<string, DriverLocationEntry> = new Map();
  private listeners: Set<(driverId: string, location: DriverLocationEntry) => void> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // ==========================================
  // Location Update
  // ==========================================

  updateLocation(data: Partial<DriverLocationEntry> & { driverId: string }): void {
    const existing = this.drivers.get(data.driverId);
    
    const entry: DriverLocationEntry = {
      driverId: data.driverId,
      latitude: data.latitude ?? existing?.latitude ?? 0,
      longitude: data.longitude ?? existing?.longitude ?? 0,
      speed: data.speed ?? existing?.speed ?? 0,
      heading: data.heading ?? existing?.heading ?? 0,
      accuracy: data.accuracy ?? existing?.accuracy ?? 0,
      isOnline: data.isOnline ?? existing?.isOnline ?? false,
      isAvailable: data.isAvailable ?? existing?.isAvailable ?? false,
      lastUpdate: new Date(),
      vehicleType: data.vehicleType ?? existing?.vehicleType ?? 'BODA',
      currentTaskId: data.currentTaskId ?? existing?.currentTaskId,
      batteryLevel: data.batteryLevel ?? existing?.batteryLevel,
      connectionStatus: data.connectionStatus ?? 'ACTIVE',
    };

    // Validate coordinates
    if (!this.isValidCoordinate(entry.latitude, entry.longitude)) {
      console.warn(`[DriverLocationStore] Invalid coordinates for driver ${data.driverId}`);
      return;
    }

    // Filter inaccurate readings (accuracy > 100m)
    if (entry.accuracy > 100) {
      console.warn(`[DriverLocationStore] Low accuracy reading (${entry.accuracy}m) for driver ${data.driverId}`);
      // Still store but mark as potentially inaccurate
    }

    this.drivers.set(data.driverId, entry);
    this.notifyListeners(data.driverId, entry);
  }

  // ==========================================
  // Validation
  // ==========================================

  private isValidCoordinate(lat: number, lon: number): boolean {
    return (
      !isNaN(lat) && !isNaN(lon) &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180
    );
  }

  // ==========================================
  // Nearby Driver Search
  // ==========================================

  findNearbyDrivers(query: NearbyDriverQuery): NearbyDriverResult[] {
    const results: NearbyDriverResult[] = [];
    const now = Date.now();

    this.drivers.forEach((driver, driverId) => {
      // Skip offline drivers
      if (!driver.isOnline) return;

      // Skip stale entries
      if (now - driver.lastUpdate.getTime() > STALE_THRESHOLD_MS) return;

      // Filter by vehicle type if specified
      if (query.vehicleTypes?.length && !query.vehicleTypes.includes(driver.vehicleType)) {
        return;
      }

      // Filter by availability if requested
      if (query.availableOnly && (!driver.isAvailable || driver.currentTaskId)) {
        return;
      }

      // Calculate distance
      const distance = this.haversineDistance(
        query.latitude, query.longitude,
        driver.latitude, driver.longitude
      );

      // Check if within radius
      if (distance <= query.radiusKm) {
        // Estimate arrival time (assume 35 km/h for boda, 25 km/h for car)
        const avgSpeed = driver.vehicleType === 'CAR' ? 25 : 35;
        const estimatedMinutes = Math.round((distance / avgSpeed) * 60);

        results.push({
          ...driver,
          distance,
          estimatedArrivalMinutes: estimatedMinutes,
        });
      }
    });

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    // Apply limit
    if (query.limit && results.length > query.limit) {
      results.length = query.limit;
    }

    return results;
  }

  // ==========================================
  // Geospatial Calculations
  // ==========================================

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * 
      Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * 
      Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return EARTH_RADIUS_KM * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ==========================================
  // Driver Status Management
  // ==========================================

  setDriverOnline(driverId: string, online: boolean): void {
    const existing = this.drivers.get(driverId);
    if (existing) {
      this.updateLocation({
        ...existing,
        driverId,
        isOnline: online,
        isAvailable: online && !existing.currentTaskId,
      });
    }
  }

  setDriverAvailability(driverId: string, available: boolean): void {
    const existing = this.drivers.get(driverId);
    if (existing) {
      this.updateLocation({
        ...existing,
        driverId,
        isAvailable: available,
      });
    }
  }

  assignTask(driverId: string, taskId: string): void {
    const existing = this.drivers.get(driverId);
    if (existing) {
      this.updateLocation({
        ...existing,
        driverId,
        currentTaskId: taskId,
        isAvailable: false,
      });
    }
  }

  completeTask(driverId: string): void {
    const existing = this.drivers.get(driverId);
    if (existing) {
      this.updateLocation({
        ...existing,
        driverId,
        currentTaskId: undefined,
        isAvailable: true,
      });
    }
  }

  // ==========================================
  // Getters
  // ==========================================

  getDriver(driverId: string): DriverLocationEntry | undefined {
    return this.drivers.get(driverId);
  }

  getAllDrivers(): DriverLocationEntry[] {
    return Array.from(this.drivers.values());
  }

  getOnlineDrivers(): DriverLocationEntry[] {
    return Array.from(this.drivers.values()).filter(d => d.isOnline);
  }

  getAvailableDrivers(): DriverLocationEntry[] {
    return Array.from(this.drivers.values()).filter(
      d => d.isOnline && d.isAvailable && !d.currentTaskId
    );
  }

  getDriverCount(): number {
    return this.drivers.size;
  }

  getOnlineCount(): number {
    return this.getOnlineDrivers().length;
  }

  // ==========================================
  // Listeners
  // ==========================================

  subscribe(callback: (driverId: string, location: DriverLocationEntry) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(driverId: string, location: DriverLocationEntry): void {
    this.listeners.forEach(callback => {
      try {
        callback(driverId, location);
      } catch (error) {
        console.error('[DriverLocationStore] Listener error:', error);
      }
    });
  }

  // ==========================================
  // Cleanup
  // ==========================================

  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    this.drivers.forEach((driver, driverId) => {
      if (now - driver.lastUpdate.getTime() > staleThreshold) {
        this.drivers.delete(driverId);
      }
    });

    // Also limit total size
    if (this.drivers.size > MAX_STORED_DRIVERS) {
      // Remove oldest entries
      const entries = Array.from(this.drivers.entries())
        .sort((a, b) => a[1].lastUpdate.getTime() - b[1].lastUpdate.getTime());
      
      const toRemove = entries.slice(0, entries.length - MAX_STORED_DRIVERS);
      toRemove.forEach(([id]) => this.drivers.delete(id));
    }
  }

  // ==========================================
  // Destroy
  // ==========================================

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.drivers.clear();
    this.listeners.clear();
  }
}

// ==========================================
// Singleton Instance
// ==========================================

export const driverLocationStore = new DriverLocationStore();

// ==========================================
// Export Types
// ==========================================

export default driverLocationStore;

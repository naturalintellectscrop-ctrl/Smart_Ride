// ETA Calculator - Real-time Estimated Time of Arrival calculations

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distance: number; // in kilometers
  duration: number; // in minutes
  trafficFactor: number; // 1.0 = no traffic, higher = more traffic
}

export interface VehicleSpeed {
  boda: number; // km/h average speed
  car: number;
  bicycle: number;
  walking: number;
}

// Average speeds in Kampala (km/h)
const DEFAULT_SPEEDS: VehicleSpeed = {
  boda: 35, // Boda boda average in traffic
  car: 25,  // Car average in Kampala traffic
  bicycle: 15,
  walking: 5,
};

// ==========================================
// Distance Calculation (Haversine formula)
// ==========================================

export function calculateDistance(
  loc1: Location,
  loc2: Location
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) * 
    Math.cos(toRad(loc2.latitude)) * 
    Math.sin(dLon / 2) * 
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in kilometers
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ==========================================
// ETA Calculation
// ==========================================

export function calculateETA(
  driverLocation: Location,
  destination: Location,
  vehicleType: 'boda' | 'car' | 'bicycle' | 'walking' = 'boda',
  currentSpeed?: number, // km/h
  trafficMultiplier: number = 1.0
): RouteInfo {
  // Calculate straight-line distance
  const distance = calculateDistance(driverLocation, destination);
  
  // Apply road factor (roads are typically 1.3-1.5x longer than straight line)
  const roadDistance = distance * 1.4;
  
  // Use current speed if available, otherwise use average
  const speed = currentSpeed || DEFAULT_SPEEDS[vehicleType];
  
  // Calculate base duration (minutes)
  const baseDuration = (roadDistance / speed) * 60;
  
  // Apply traffic multiplier
  const duration = baseDuration * trafficMultiplier;
  
  return {
    distance: Math.round(roadDistance * 10) / 10, // Round to 1 decimal
    duration: Math.round(duration),
    trafficFactor: trafficMultiplier,
  };
}

// ==========================================
// Real-time ETA Tracker
// ==========================================

export interface ETATrackerConfig {
  driverId: string;
  vehicleType: 'boda' | 'car' | 'bicycle' | 'walking';
  pickupLocation: Location;
  dropoffLocation?: Location;
  updateInterval?: number; // milliseconds
  onETAUpdate?: (eta: ETAResult) => void;
}

export interface ETAResult {
  toPickup: RouteInfo;
  toDropoff?: RouteInfo;
  totalDuration: number; // minutes
  driverLocation: Location;
  driverSpeed: number;
  lastUpdated: Date;
  progress: number; // 0-100 percentage of journey complete
  currentPhase: 'to_pickup' | 'at_pickup' | 'to_dropoff' | 'completed';
}

export class ETATracker {
  private driverId: string;
  private vehicleType: 'boda' | 'car' | 'bicycle' | 'walking';
  private pickup: Location;
  private dropoff?: Location;
  private updateInterval: number;
  private onETAUpdate?: (eta: ETAResult) => void;
  
  private driverLocation: Location | null = null;
  private driverSpeed: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private lastUpdate: Date | null = null;
  private phase: 'to_pickup' | 'at_pickup' | 'to_dropoff' | 'completed' = 'to_pickup';
  
  constructor(config: ETATrackerConfig) {
    this.driverId = config.driverId;
    this.vehicleType = config.vehicleType;
    this.pickup = config.pickupLocation;
    this.dropoff = config.dropoffLocation;
    this.updateInterval = config.updateInterval || 3000;
    this.onETAUpdate = config.onETAUpdate;
  }
  
  // Update driver location
  updateDriverLocation(location: Location, speed?: number): void {
    this.driverLocation = location;
    this.driverSpeed = speed || DEFAULT_SPEEDS[this.vehicleType];
    this.lastUpdate = new Date();
    
    // Check if driver arrived at pickup
    if (this.phase === 'to_pickup') {
      const distToPickup = calculateDistance(location, this.pickup);
      if (distToPickup < 0.1) { // Within 100 meters
        this.phase = 'at_pickup';
      }
    }
    
    // Check if driver arrived at dropoff
    if (this.phase === 'to_dropoff' && this.dropoff) {
      const distToDropoff = calculateDistance(location, this.dropoff);
      if (distToDropoff < 0.1) { // Within 100 meters
        this.phase = 'completed';
      }
    }
  }
  
  // Get current ETA
  getCurrentETA(): ETAResult | null {
    if (!this.driverLocation) return null;
    
    const toPickup = calculateETA(
      this.driverLocation,
      this.pickup,
      this.vehicleType,
      this.driverSpeed
    );
    
    let toDropoff: RouteInfo | undefined;
    let totalDuration = toPickup.duration;
    
    if (this.dropoff && (this.phase === 'at_pickup' || this.phase === 'to_dropoff')) {
      // If at pickup, calculate from pickup to dropoff
      const origin = this.phase === 'at_pickup' ? this.pickup : this.driverLocation;
      toDropoff = calculateETA(
        origin,
        this.dropoff,
        this.vehicleType,
        this.driverSpeed
      );
      
      if (this.phase === 'at_pickup') {
        totalDuration = toDropoff.duration;
      } else {
        totalDuration = toPickup.duration + toDropoff.duration;
      }
    }
    
    // Calculate progress
    let progress = 0;
    if (this.dropoff) {
      const totalDistance = calculateDistance(this.pickup, this.dropoff);
      const remainingToPickup = calculateDistance(this.driverLocation, this.pickup);
      const remainingToDropoff = this.dropoff 
        ? calculateDistance(this.driverLocation, this.dropoff) 
        : 0;
      
      if (this.phase === 'to_pickup') {
        progress = Math.max(0, (1 - remainingToPickup / (totalDistance + remainingToPickup)) * 30);
      } else if (this.phase === 'to_dropoff') {
        progress = 30 + (1 - remainingToDropoff / totalDistance) * 70;
      } else if (this.phase === 'completed') {
        progress = 100;
      }
    } else {
      const remainingToPickup = calculateDistance(this.driverLocation, this.pickup);
      progress = Math.max(0, Math.min(100, (1 - remainingToPickup / 5) * 100)); // Assume 5km baseline
    }
    
    return {
      toPickup,
      toDropoff,
      totalDuration,
      driverLocation: this.driverLocation,
      driverSpeed: this.driverSpeed,
      lastUpdated: this.lastUpdate || new Date(),
      progress: Math.round(progress),
      currentPhase: this.phase,
    };
  }
  
  // Start periodic updates
  start(): void {
    this.stop();
    
    this.intervalId = setInterval(() => {
      const eta = this.getCurrentETA();
      if (eta) {
        this.onETAUpdate?.(eta);
      }
    }, this.updateInterval);
  }
  
  // Stop updates
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  // Set phase
  setPhase(phase: 'to_pickup' | 'at_pickup' | 'to_dropoff' | 'completed'): void {
    this.phase = phase;
  }
  
  // Get current phase
  getPhase(): string {
    return this.phase;
  }
}

// ==========================================
// Traffic Multiplier Estimator
// ==========================================

export function estimateTrafficMultiplier(hour: number): number {
  // Kampala traffic patterns
  // Morning rush: 7-9 AM
  // Evening rush: 5-8 PM
  // Off-peak: lower traffic
  
  if (hour >= 7 && hour <= 9) {
    return 1.5 + (hour === 8 ? 0.3 : 0); // Peak morning rush
  }
  if (hour >= 17 && hour <= 20) {
    return 1.6 + (hour === 18 ? 0.4 : 0); // Peak evening rush
  }
  if (hour >= 12 && hour <= 14) {
    return 1.2; // Lunch time
  }
  if (hour >= 22 || hour <= 5) {
    return 0.8; // Night time, faster
  }
  
  return 1.0; // Normal traffic
}

// ==========================================
// Format Duration
// ==========================================

export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return '< 1 min';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (mins === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${mins} min`;
}

// ==========================================
// Format Distance
// ==========================================

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

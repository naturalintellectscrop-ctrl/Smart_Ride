// ============================================
// SMART RIDE MOBILE - BACKGROUND LOCATION SERVICE
// ============================================
// Manages background location tracking for drivers
// during active rides. Uses expo-location and
// expo-task-manager for background updates.
// ============================================

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';

const LOCATION_TASK = 'background-location-tracking';

// Define the background location task
// This must be defined at the top level (not inside a class or function)
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[LOCATION] Background task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    if (location) {
      // Send to backend
      try {
        await api.sendHeartbeat({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed,
          heading: location.coords.heading,
          accuracy: location.coords.accuracy,
        });
      } catch (e) {
        console.warn('[LOCATION] Heartbeat failed:', e);
      }
    }
  }
});

class LocationService {
  private isTracking = false;

  /**
   * Start background location tracking.
   * Requests foreground and background permissions.
   * Falls back to foreground-only if background permission is denied.
   */
  async startTracking(): Promise<boolean> {
    if (this.isTracking) return true;

    // Request foreground permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.warn('[LOCATION] Foreground permission denied');
      return false;
    }

    // Request background permission
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.warn('[LOCATION] Background permission denied - using foreground only');
      // Still start foreground tracking
    }

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 50, // 50 meters
        showsBackgroundNotification: true,
        foregroundService: {
          notificationTitle: 'Smart Ride',
          notificationBody: 'Tracking your location for active rides',
        },
      });
      this.isTracking = true;
      console.log('[LOCATION] Background tracking started');
      return true;
    } catch (e) {
      console.error('[LOCATION] Failed to start tracking:', e);
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) return;
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
      this.isTracking = false;
      console.log('[LOCATION] Background tracking stopped');
    } catch (e) {
      console.error('[LOCATION] Failed to stop tracking:', e);
    }
  }

  /**
   * Check if tracking is currently active
   */
  getIsTracking(): boolean {
    return this.isTracking;
  }
}

// Singleton instance
export const locationService = new LocationService();

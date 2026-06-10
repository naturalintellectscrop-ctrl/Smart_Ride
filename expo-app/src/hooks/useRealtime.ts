// ============================================
// SMART RIDE MOBILE - useRealtime HOOK
// ============================================
// Centralized hook for managing Supabase Realtime lifecycle.
// Auto-connects when user is authenticated, disconnects on logout.
// Replaces per-screen realtimeService.connect() calls.
//
// Usage in root layout:
//   function ThemedRootLayout() {
//     useRealtime();
//     // ...
//   }
// ============================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { realtimeService } from '../services/realtime.service';

// ============================================
// TYPES
// ============================================

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseRealtimeReturn {
  /** Current connection status */
  status: RealtimeStatus;
  /** Whether Supabase Realtime credentials are configured */
  isConfigured: boolean;
  /** Manually reconnect */
  reconnect: () => Promise<void>;
}

// ============================================
// GLOBAL STATE (shared across hook instances)
// ============================================

// Track whether the global realtime service has been initialized this session
let globalInitialized = false;
let globalStatus: RealtimeStatus = 'disconnected';
const statusListeners = new Set<(status: RealtimeStatus) => void>();

function setGlobalStatus(status: RealtimeStatus) {
  globalStatus = status;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (e) {
      // Ignore listener errors
    }
  });
}

// ============================================
// HOOK
// ============================================

/**
 * Centralized realtime connection hook.
 *
 * - Connects to Supabase Realtime when the user is authenticated
 * - Disconnects on logout
 * - Tracks connection status globally
 * - Screens should NOT call realtimeService.connect() directly;
 *   they should only call realtimeService.on() / joinTaskRoom() etc.
 *
 * Must be used in the root layout (inside ThemeProvider).
 */
export function useRealtime(): UseRealtimeReturn {
  const { isAuthenticated, accessToken } = useAuthStore();
  const [status, setStatus] = useState<RealtimeStatus>(globalStatus);
  const initRef = useRef(false);

  // Subscribe to global status changes
  useEffect(() => {
    statusListeners.add(setStatus);
    return () => {
      statusListeners.delete(setStatus);
    };
  }, []);

  // Auto-connect/disconnect based on auth state
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // User is not authenticated — disconnect
      if (globalInitialized) {
        realtimeService.disconnect();
        setGlobalStatus('disconnected');
        globalInitialized = false;
        initRef.current = false;
      }
      return;
    }

    // Already initialized this session
    if (initRef.current && globalInitialized) return;
    initRef.current = true;

    let cancelled = false;

    const init = async () => {
      setGlobalStatus('connecting');

      try {
        // Check if Supabase is configured
        if (!realtimeService.isRealtimeAvailable()) {
          console.log('[useRealtime] Supabase credentials not configured — realtime disabled');
          setGlobalStatus('error');
          return;
        }

        await realtimeService.connect(accessToken);

        if (cancelled) return;

        if (realtimeService.isConnected()) {
          setGlobalStatus('connected');
          console.log('[useRealtime] Connected to Supabase Realtime');
        } else {
          setGlobalStatus('error');
          console.warn('[useRealtime] Connect returned but realtime service not connected');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('[useRealtime] Connection error:', error);
        setGlobalStatus('error');
      }
    };

    init();
    globalInitialized = true;

    // Listen for connection changes from realtime service
    const unsubConnection = realtimeService.on('connection:changed', (data: { connected: boolean }) => {
      if (data.connected) {
        setGlobalStatus('connected');
      } else {
        setGlobalStatus('disconnected');
      }
    });

    const unsubError = realtimeService.on('connection:error', () => {
      setGlobalStatus('error');
    });

    return () => {
      cancelled = true;
      unsubConnection();
      unsubError();
    };
  }, [isAuthenticated, accessToken]);

  // Cleanup on unmount — the realtime service persists across screen transitions
  // Only disconnect on logout (handled by auth state change above)
  useEffect(() => {
    return () => {};
  }, []);

  const reconnect = useCallback(async () => {
    setGlobalStatus('connecting');
    try {
      await realtimeService.reconnect();
      if (realtimeService.isConnected()) {
        setGlobalStatus('connected');
      } else {
        setGlobalStatus('error');
      }
    } catch (error) {
      console.error('[useRealtime] Reconnect error:', error);
      setGlobalStatus('error');
    }
  }, []);

  return {
    status,
    isConfigured: realtimeService.isRealtimeAvailable(),
    reconnect,
  };
}

console.log('[HOOK] useRealtime initialized');

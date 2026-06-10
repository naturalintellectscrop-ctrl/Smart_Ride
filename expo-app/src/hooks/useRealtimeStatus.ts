// ============================================
// SMART RIDE MOBILE - useRealtimeStatus HOOK
// ============================================
// Read-only hook for screens to check realtime connection status.
// Does NOT trigger connection — use useRealtime() in root layout for that.
// ============================================

import { useState, useEffect } from 'react';
import { realtimeService } from '../services/realtime.service';

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Read-only hook for checking realtime connection status.
 * Use this in screens that need to know if realtime is available.
 */
export function useRealtimeStatus(): {
  isConnected: boolean;
  isRealtimeAvailable: boolean;
} {
  const [isConnected, setIsConnected] = useState(realtimeService.isConnected());

  useEffect(() => {
    const unsub = realtimeService.on('connection:changed', (data: { connected: boolean }) => {
      setIsConnected(data.connected);
    });

    return () => {
      unsub();
    };
  }, []);

  return {
    isConnected,
    isRealtimeAvailable: realtimeService.isRealtimeAvailable(),
  };
}

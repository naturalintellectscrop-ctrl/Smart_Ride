// ============================================
// SMART RIDE MOBILE - INCOMING CALL LISTENER
// ============================================
// Mount this hook in _layout.tsx to listen for
// call:incoming realtime events and auto-navigate
// to the call screen so the user can answer.
// ============================================

import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { socketService } from '@/src/services';

interface IncomingCallPayload {
  sessionId: string;
  channelId: string;
  callerId: string;
  callerName: string;
}

export function useIncomingCall() {
  const router = useRouter();
  const activeSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = socketService.on('call:incoming', (payload: IncomingCallPayload) => {
      if (!payload?.sessionId || !payload?.callerId) return;

      // Prevent duplicate navigation if already on this call screen
      if (activeSessionRef.current === payload.sessionId) return;
      activeSessionRef.current = payload.sessionId;

      router.push({
        pathname: `/call/${payload.callerId}`,
        params: {
          name: payload.callerName || 'Smart Ride User',
          isIncoming: 'true',
          sessionId: payload.sessionId,
          channelId: payload.channelId,
        },
      } as any);
    });

    return () => {
      unsub();
      activeSessionRef.current = null;
    };
  }, []);
}

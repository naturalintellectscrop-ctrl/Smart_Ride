'use client';

import { ReactNode } from 'react';
import { SocketProvider } from '@/components/smart-ride/context/socket-context';

/**
 * Global client-side providers.
 *
 * The SocketProvider auto-connects to Supabase Realtime on mount
 * by reading the auth token from localStorage ('smart_ride_auth_token'
 * or 'accessToken'). This ensures a single shared connection across
 * all tabs/components without each one having to call connect() itself.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SocketProvider>
      {children}
    </SocketProvider>
  );
}

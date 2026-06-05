'use client';

import { ReactNode } from 'react';
import { SocketProvider } from '@/components/smart-ride/context/socket-context';
import { ThemeProvider } from '@/components/theme-provider';

/**
 * Global client-side providers.
 *
 * ThemeProvider manages dark/light mode via next-themes (defaults to dark).
 * The SocketProvider auto-connects to Supabase Realtime on mount
 * by reading the auth token from localStorage ('accessToken'
 * or legacy 'smart_ride_auth_token'). This ensures a single shared connection across
 * all tabs/components without each one having to call connect() itself.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SocketProvider>
        {children}
      </SocketProvider>
    </ThemeProvider>
  );
}

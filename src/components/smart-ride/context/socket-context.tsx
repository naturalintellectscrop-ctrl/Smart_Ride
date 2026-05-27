'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { socketService, ConnectionEstablishedData } from '@/services/socket';

// ============================================
// TYPES
// ============================================

interface SocketContextType {
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Connection info received from the server after connect */
  connectionInfo: ConnectionEstablishedData | null;
  /** Connect to the socket server with an auth token */
  connect: (token: string) => void;
  /** Disconnect from the socket server */
  disconnect: () => void;
}

// ============================================
// CONTEXT
// ============================================

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// ============================================
// TOKEN STORAGE KEY — same as socket service
// ============================================

const AUTH_TOKEN_KEY = 'smart_ride_auth_token';

// ============================================
// PROVIDER
// ============================================

interface SocketProviderProps {
  children: ReactNode;
  /** Optional: external auth token. If provided, the provider auto-connects. */
  authToken?: string | null;
}

export function SocketProvider({ children, authToken }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionEstablishedData | null>(null);

  // ------------------------------------------
  // Auto-connect when auth token becomes available
  // ------------------------------------------

  useEffect(() => {
    if (authToken) {
      socketService.connect(authToken);
    } else {
      // Try auto-connecting from stored token on mount
      socketService.autoConnect();
    }

    return () => {
      // On unmount, disconnect
      socketService.disconnect();
    };
  }, [authToken]);

  // ------------------------------------------
  // Listen for connection state changes
  // ------------------------------------------

  useEffect(() => {
    const unsubConnect = socketService.on('connect', () => {
      setIsConnected(true);
    });

    const unsubDisconnect = socketService.on('disconnect', () => {
      setIsConnected(false);
      setConnectionInfo(null);
    });

    const unsubEstablished = socketService.on('connection:established', (data) => {
      setConnectionInfo(data);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubEstablished();
    };
  }, []);

  // ------------------------------------------
  // Imperative methods
  // ------------------------------------------

  const connect = useCallback((token: string) => {
    socketService.connect(token);
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setConnectionInfo(null);
  }, []);

  // ------------------------------------------
  // Context value
  // ------------------------------------------

  const value: SocketContextType = useMemo(
    () => ({
      isConnected,
      connectionInfo,
      connect,
      disconnect,
    }),
    [isConnected, connectionInfo, connect, disconnect]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useSocketContext(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}

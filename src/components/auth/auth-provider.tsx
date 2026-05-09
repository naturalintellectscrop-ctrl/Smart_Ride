'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  authenticated: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setUserFromLogin: (user: AdminUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      setAuthenticated(data.authenticated);
      setUser(data.user);
    } catch {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set user directly from login response (avoids extra API call)
  const setUserFromLogin = useCallback((userData: AdminUser) => {
    setUser(userData);
    setAuthenticated(true);
    setLoading(false);
  }, []);

  // Only check session once on mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setAuthenticated(false);
      // Refresh the page to show login screen
      window.location.href = '/';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authenticated, logout, refreshSession, setUserFromLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

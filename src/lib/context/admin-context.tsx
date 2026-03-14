'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasAdminPermission, AdminPermission } from '@/lib/config/admin-access';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: AdminPermission) => boolean;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const storedUser = localStorage.getItem('admin_user');

      if (!token || !storedUser) {
        router.push('/admin/login');
        return;
      }

      // Verify token
      const payload = verifyAccessToken(token);
      if (!payload) {
        // Token invalid, try refresh
        await refreshSession();
        return;
      }

      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Session check failed:', error);
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Session refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('admin_token', data.accessToken);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      console.error('Session refresh failed:', error);
      logout();
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
    router.push('/admin/login');
  }, [router]);

  const checkPermission = useCallback((permission: AdminPermission): boolean => {
    if (!user) return false;
    return hasAdminPermission(user.role, permission);
  }, [user]);

  return (
    <AdminContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        hasPermission: checkPermission,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

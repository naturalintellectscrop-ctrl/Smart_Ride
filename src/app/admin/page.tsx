/**
 * Admin Dashboard Page
 * Main entry point for admin.smartride.com
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin, AdminProvider } from '@/lib/context/admin-context';
import { AdminDashboard } from '@/components/smart-ride/dashboards/admin-dashboard';

function AdminPageContent() {
  const { isAuthenticated, isLoading } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <AdminDashboard user={{ id: 'admin', name: 'Admin' }} />;
}

export default function AdminPage() {
  return (
    <AdminProvider>
      <AdminPageContent />
    </AdminProvider>
  );
}

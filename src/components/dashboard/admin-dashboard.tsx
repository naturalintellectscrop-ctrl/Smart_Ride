'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardOverview } from '@/components/dashboard/dashboard-overview';
import { UserManagement } from '@/components/dashboard/user-management';
import { RiderManagement } from '@/components/dashboard/rider-management';
import { MerchantManagement } from '@/components/dashboard/merchant-management';
import { OrderManagement } from '@/components/dashboard/order-management';
import { TaskManagement } from '@/components/dashboard/task-management';
import { PaymentFinance } from '@/components/dashboard/payment-finance';
import { AuditLogs } from '@/components/dashboard/audit-logs';
import { Settings } from '@/components/dashboard/settings';
import { ConnectionMonitoringDashboard } from '@/components/admin/connection-monitoring';
import { SmartHealthManagement } from '@/components/dashboard/smart-health-management';
import { SOSMonitoring } from '@/components/dashboard/sos-monitoring';
import { FraudMonitoringDashboard } from '@/components/dashboard/fraud-monitoring';

export type ActiveView = 
  | 'dashboard' 
  | 'users' 
  | 'riders' 
  | 'merchants' 
  | 'orders' 
  | 'tasks' 
  | 'payments' 
  | 'audit' 
  | 'monitoring'
  | 'health'
  | 'sos'
  | 'fraud'
  | 'settings';

export function AdminDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'users':
        return <UserManagement />;
      case 'riders':
        return <RiderManagement />;
      case 'merchants':
        return <MerchantManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'tasks':
        return <TaskManagement />;
      case 'payments':
        return <PaymentFinance />;
      case 'audit':
        return <AuditLogs />;
      case 'monitoring':
        return <ConnectionMonitoringDashboard />;
      case 'health':
        return <SmartHealthManagement />;
      case 'sos':
        return <SOSMonitoring />;
      case 'fraud':
        return <FraudMonitoringDashboard />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0D0D12]">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}

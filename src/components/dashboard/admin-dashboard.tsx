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
import { FraudMonitoring } from '@/components/dashboard/fraud-monitoring';

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
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAuditLogs = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/audit?action=export-docx');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smart-ride-audit-report-${new Date().toISOString().split('T')[0]}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
        alert('Failed to export audit logs. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export audit logs. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

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
        return <FraudMonitoring />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0D0D12] via-[#0F0F18] to-[#0D0D12]">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00FF88]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[#00FF88]/3 to-transparent rounded-full blur-[100px]" />
      </div>
      
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-auto relative z-10 glass-scrollbar">
        {/* Header Bar with Export Button */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-[#0D0D12]/80 backdrop-blur-md border-b border-white/5">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">
            {activeView === 'dashboard' ? 'Overview' : 
             activeView === 'audit' ? 'Audit Logs' :
             activeView.charAt(0).toUpperCase() + activeView.slice(1)}
          </h2>
          <button
            onClick={handleExportAuditLogs}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Audit Report
              </>
            )}
          </button>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}

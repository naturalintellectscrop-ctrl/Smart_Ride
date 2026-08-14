'use client';

import { useState, useCallback } from 'react';
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
import { DriverReputationDashboard } from '@/components/dashboard/driver-reputation';
import { MarketplaceBalance } from '@/components/dashboard/marketplace-balance';
import { downloadBlob } from '@/lib/export';

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
  | 'reputation'
  | 'marketplace'
  | 'settings';

// Map each tab to its export config
const EXPORT_CONFIG: Record<string, { url: string; filename: string; label: string } | null> = {
  users: { url: '/api/admin/users?action=export', filename: 'users-export', label: 'Export Users CSV' },
  payments: { url: '/api/payments?action=export', filename: 'payments-export', label: 'Export Payments CSV' },
  audit: { url: '/api/audit?action=export', filename: 'audit-logs', label: 'Export Audit CSV' },
};

export function AdminDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    const config = EXPORT_CONFIG[activeView];
    if (!config) return;

    setIsExporting(true);
    try {
      const token = (localStorage.getItem("accessToken") || localStorage.getItem("admin_token"));
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(config.url, { headers });
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      const blob = await response.blob();
      const date = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `${config.filename}-${date}.csv`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [activeView]);

  const handleExportAuditDocx = useCallback(async () => {
    setIsExporting(true);
    try {
      // The audit log is admin-only now. This export used to work purely
      // because the route was open to anyone.
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('accessToken') || localStorage.getItem('admin_token')
          : null;
      const response = await fetch('/api/audit?action=export-docx', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const blob = await response.blob();
        const date = new Date().toISOString().split('T')[0];
        downloadBlob(blob, `smart-ride-audit-report-${date}.docx`);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export audit report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportConfig = EXPORT_CONFIG[activeView];

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
      case 'reputation':
        return <DriverReputationDashboard />;
      case 'marketplace':
        return <MarketplaceBalance />;
      case 'settings':
        return <Settings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0C0E]">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-auto">
        {/* Header Bar with Export Button */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-[#0B0C0E]/90 backdrop-blur-sm border-b border-white/10">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">
            {activeView === 'dashboard' ? 'Overview' :
             activeView === 'audit' ? 'Audit Logs' :
             activeView.charAt(0).toUpperCase() + activeView.slice(1)}
          </h2>
          <div className="flex items-center gap-2">
            {exportConfig && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
                    Export CSV
                  </>
                )}
              </button>
            )}
            {activeView === 'audit' && (
              <button
                onClick={handleExportAuditDocx}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
                    Export DOCX
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}

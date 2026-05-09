'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Shield,
  Activity,
  Users,
  MapPin,
  Smartphone,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Ban,
  Globe,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface FraudStats {
  totalAlerts: number;
  openAlerts: number;
  highRiskRiders: number;
  avgRiskScore: number;
  highRiskCount: number;
  recentAnomalies24h: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  recentAlerts: FraudAlert[];
}

interface FraudAlert {
  id: string;
  alertId: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  riskScore: number;
  status: string;
  riderId?: string;
  clientId?: string;
  taskId?: string;
  createdAt: string;
  resolution?: string;
}

// ============================================
// Severity Colors
// ============================================

const severityConfig = {
  LOW: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle },
  MEDIUM: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
  HIGH: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
  CRITICAL: { color: 'bg-red-600 text-white border-red-700', icon: Shield },
};

const statusConfig = {
  OPEN: 'bg-red-100 text-red-800',
  INVESTIGATING: 'bg-blue-100 text-blue-800',
  CONFIRMED_FRAUD: 'bg-purple-100 text-purple-800',
  FALSE_POSITIVE: 'bg-green-100 text-green-800',
  RESOLVED: 'bg-gray-100 text-gray-800',
};

// ============================================
// Main Component
// ============================================

export function FraudMonitoringEnhanced() {
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/fraud');
      const data = await response.json();
      setStats(data);
      setAlerts(data.recentAlerts || []);
    } catch (error) {
      console.error('Error fetching fraud data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch filtered alerts
  const fetchAlerts = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('action', 'alerts');
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);

    try {
      const response = await fetch(`/api/fraud?${params}`);
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, [statusFilter, severityFilter, typeFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Resolve alert
  const handleResolve = async () => {
    if (!selectedAlert || !resolutionText.trim()) return;

    try {
      await fetch('/api/fraud', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-alert',
          alertId: selectedAlert.id,
          resolution: resolutionText,
          resolvedBy: 'admin',
        }),
      });
      setSelectedAlert(null);
      setResolutionText('');
      fetchData();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filter alerts by search
  const filteredAlerts = alerts.filter(alert => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      alert.title.toLowerCase().includes(query) ||
      alert.description.toLowerCase().includes(query) ||
      alert.alertId.toLowerCase().includes(query) ||
      (alert.riderId?.toLowerCase().includes(query)) ||
      (alert.clientId?.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-emerald-600" />
            Fraud Detection Center
          </h1>
          <p className="text-gray-500 mt-1">Real-time fraud monitoring and prevention</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Alerts"
          value={stats?.openAlerts || 0}
          icon={AlertTriangle}
          color="red"
          subtitle={`${stats?.totalAlerts || 0} total`}
        />
        <StatCard
          title="High Risk Riders"
          value={stats?.highRiskCount || 0}
          icon={Users}
          color="orange"
          subtitle="Score ≥ 60"
        />
        <StatCard
          title="Avg Risk Score"
          value={stats?.avgRiskScore || 0}
          icon={Activity}
          color="blue"
          subtitle="Last 24 hours"
        />
        <StatCard
          title="GPS Anomalies"
          value={stats?.recentAnomalies24h || 0}
          icon={MapPin}
          color="purple"
          subtitle="Last 24 hours"
        />
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alerts by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.alertsByType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{formatAlertType(type)}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {Object.keys(stats?.alertsByType || {}).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No alerts yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts by Severity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.alertsBySeverity || {}).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      severity === 'CRITICAL' ? 'bg-red-600' :
                      severity === 'HIGH' ? 'bg-red-400' :
                      severity === 'MEDIUM' ? 'bg-orange-400' : 'bg-yellow-400'
                    )} />
                    <span className="text-sm text-gray-600">{severity}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Ban className="h-4 w-4 mr-2" />
              Suspend High Risk Riders
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Globe className="h-4 w-4 mr-2" />
              Check GPS Anomalies
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Smartphone className="h-4 w-4 mr-2" />
              Device Audit
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Run ML Analysis
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Alerts</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              
              {/* Filters */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Alert ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Severity</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Risk Score</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <AlertRow 
                    key={alert.id} 
                    alert={alert} 
                    onSelect={() => setSelectedAlert(alert)}
                  />
                ))}
                {filteredAlerts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No alerts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alert Detail Modal */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Alert Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Alert ID</p>
                  <p className="font-mono text-sm">{selectedAlert.alertId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="text-sm font-medium">{formatAlertType(selectedAlert.alertType)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Severity</p>
                  <Badge className={severityConfig[selectedAlert.severity as keyof typeof severityConfig]?.color}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Risk Score</p>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          selectedAlert.riskScore >= 60 ? "bg-red-500" :
                          selectedAlert.riskScore >= 30 ? "bg-orange-500" : "bg-yellow-500"
                        )}
                        style={{ width: `${selectedAlert.riskScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{selectedAlert.riskScore}</span>
                  </div>
                </div>
                {selectedAlert.riderId && (
                  <div>
                    <p className="text-sm text-gray-500">Rider ID</p>
                    <p className="font-mono text-sm">{selectedAlert.riderId}</p>
                  </div>
                )}
                {selectedAlert.clientId && (
                  <div>
                    <p className="text-sm text-gray-500">Client ID</p>
                    <p className="font-mono text-sm">{selectedAlert.clientId}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-sm mt-1">{selectedAlert.description}</p>
              </div>

              {selectedAlert.status === 'OPEN' && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Resolution</p>
                  <Input
                    placeholder="Enter resolution notes..."
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlert(null)}>
              Close
            </Button>
            {selectedAlert?.status === 'OPEN' && (
              <Button 
                onClick={handleResolve}
                disabled={!resolutionText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  subtitle 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
  subtitle: string;
}) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorClasses[color as keyof typeof colorClasses])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert, onSelect }: { alert: FraudAlert; onSelect: () => void }) {
  const SeverityIcon = severityConfig[alert.severity as keyof typeof severityConfig]?.icon || AlertCircle;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={onSelect}>
      <td className="py-3 px-4">
        <span className="font-mono text-sm">{alert.alertId.slice(0, 16)}...</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm">{formatAlertType(alert.alertType)}</span>
      </td>
      <td className="py-3 px-4">
        <Badge className={severityConfig[alert.severity as keyof typeof severityConfig]?.color}>
          <SeverityIcon className="h-3 w-3 mr-1" />
          {alert.severity}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full",
                alert.riskScore >= 60 ? "bg-red-500" :
                alert.riskScore >= 30 ? "bg-orange-500" : "bg-yellow-500"
              )}
              style={{ width: `${alert.riskScore}%` }}
            />
          </div>
          <span className="text-sm font-medium">{alert.riskScore}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge className={statusConfig[alert.status as keyof typeof statusConfig]}>
          {alert.status}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-gray-500">
          {new Date(alert.createdAt).toLocaleString()}
        </span>
      </td>
      <td className="py-3 px-4">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
          View
        </Button>
      </td>
    </tr>
  );
}

// ============================================
// Helpers
// ============================================

function formatAlertType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default FraudMonitoringEnhanced;

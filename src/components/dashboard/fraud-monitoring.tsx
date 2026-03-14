'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Shield,
  Users,
  UserX,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Ban,
  Unlock,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Smartphone,
  MapPin,
  CreditCard,
  Package,
  Pill,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FraudAlert {
  id: string;
  alertNumber: string;
  entityType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'PHARMACY';
  entityId: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'DISMISSED';
  detectionMethod: string;
  riskScoreAtDetection: number;
  createdAt: string;
  reviewedBy?: string;
  resolvedAt?: string;
  isFalsePositive: boolean;
}

interface RiskScore {
  id: string;
  entityType: 'CLIENT' | 'RIDER' | 'MERCHANT' | 'PHARMACY';
  entityId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isRestricted: boolean;
  hasSuspiciousActivity: boolean;
}

interface DashboardStats {
  summary: {
    totalAlerts: number;
    openAlerts: number;
    criticalAlerts: number;
    resolvedAlerts: number;
    falsePositives: number;
    totalFlaggedAccounts: number;
    suspendedAccounts: number;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  alertsByType: Array<{ type: string; count: number }>;
  alertsByEntityType: Array<{ type: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
  recentAlerts: FraudAlert[];
  performance: {
    detectionAccuracy: number | null;
    falsePositiveRate: number | null;
  };
}

export function FraudMonitoringDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'accounts' | 'patterns'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardStats();
    fetchAlerts();
    fetchRiskScores();
  }, [selectedPeriod]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`/api/fraud/dashboard?period=${selectedPeriod}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      params.append('limit', '50');
      
      const response = await fetch(`/api/fraud/alerts?${params}`);
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchRiskScores = async () => {
    try {
      // For demo, we'll use mock data
      setRiskScores([
        { id: '1', entityType: 'CLIENT', entityId: 'user_001', riskScore: 78, riskLevel: 'CRITICAL', isRestricted: true, hasSuspiciousActivity: true },
        { id: '2', entityType: 'RIDER', entityId: 'rider_001', riskScore: 62, riskLevel: 'HIGH', isRestricted: false, hasSuspiciousActivity: true },
        { id: '3', entityType: 'MERCHANT', entityId: 'merchant_001', riskScore: 45, riskLevel: 'MEDIUM', isRestricted: false, hasSuspiciousActivity: true },
        { id: '4', entityType: 'CLIENT', entityId: 'user_002', riskScore: 15, riskLevel: 'LOW', isRestricted: false, hasSuspiciousActivity: false },
        { id: '5', entityType: 'RIDER', entityId: 'rider_002', riskScore: 82, riskLevel: 'CRITICAL', isRestricted: true, hasSuspiciousActivity: true },
      ]);
    } catch (error) {
      console.error('Error fetching risk scores:', error);
    }
  };

  const handleAlertAction = async (alertId: string, action: string, notes?: string) => {
    try {
      const response = await fetch('/api/fraud/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          action,
          adminId: 'admin_demo',
          notes,
        }),
      });
      
      if (response.ok) {
        fetchAlerts();
        fetchDashboardStats();
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <ShieldX className="h-5 w-5 text-red-600" />;
      case 'HIGH': return <ShieldAlert className="h-5 w-5 text-orange-600" />;
      case 'MEDIUM': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default: return <ShieldCheck className="h-5 w-5 text-green-600" />;
    }
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'CLIENT': return <Users className="h-4 w-4" />;
      case 'RIDER': return <MapPin className="h-4 w-4" />;
      case 'MERCHANT': return <Package className="h-4 w-4" />;
      case 'PHARMACY': return <Pill className="h-4 w-4" />;
      default: return <UserX className="h-4 w-4" />;
    }
  };

  const formatAlertType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading fraud monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-emerald-400" />
              <div>
                <h1 className="text-xl font-bold">Fraud & Abuse Detection</h1>
                <p className="text-slate-400 text-sm">Real-time monitoring and risk management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <button
                onClick={() => { fetchDashboardStats(); fetchAlerts(); }}
                className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
              { id: 'accounts', label: 'Flagged Accounts', icon: Users },
              { id: 'patterns', label: 'Patterns', icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.totalAlerts}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600">{stats.summary.openAlerts} open</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Critical Alerts</p>
                    <p className="text-2xl font-bold text-red-600">{stats.summary.criticalAlerts}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <ShieldX className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Requires immediate attention</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Flagged Accounts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.totalFlaggedAccounts}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <UserX className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm text-orange-600">
                  <Ban className="h-4 w-4" />
                  <span>{stats.summary.suspendedAccounts} suspended</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Detection Accuracy</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.performance.detectionAccuracy 
                        ? `${(stats.performance.detectionAccuracy * 100).toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-sm text-gray-500">
                  <XCircle className="h-4 w-4" />
                  <span>{stats.summary.falsePositives} false positives</span>
                </div>
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Risk Distribution</h3>
                <div className="space-y-3">
                  {[
                    { level: 'LOW', count: stats.riskDistribution.low, color: 'bg-green-500' },
                    { level: 'MEDIUM', count: stats.riskDistribution.medium, color: 'bg-yellow-500' },
                    { level: 'HIGH', count: stats.riskDistribution.high, color: 'bg-orange-500' },
                    { level: 'CRITICAL', count: stats.riskDistribution.critical, color: 'bg-red-500' },
                  ].map((item) => {
                    const total = stats.riskDistribution.low + stats.riskDistribution.medium + 
                                  stats.riskDistribution.high + stats.riskDistribution.critical;
                    const percentage = total > 0 ? (item.count / total) * 100 : 0;
                    return (
                      <div key={item.level}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{item.level}</span>
                          <span className="text-gray-500">{item.count} accounts</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', item.color)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Alerts by Entity Type</h3>
                <div className="space-y-3">
                  {stats.alertsByEntityType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          {getEntityTypeIcon(item.type)}
                        </div>
                        <span className="font-medium text-gray-700">{item.type}</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Alerts</h3>
                <button 
                  onClick={() => setActiveTab('alerts')}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {stats.recentAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className="flex-shrink-0">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{formatAlertType(alert.alertType)}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          {getEntityTypeIcon(alert.entityType)}
                          {alert.entityType}
                        </span>
                        <span>•</span>
                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className={cn('px-3 py-1 rounded-full text-xs font-medium', getRiskLevelColor(alert.severity))}>
                      {alert.severity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
              <button
                onClick={fetchAlerts}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Apply
              </button>
            </div>

            {/* Alerts List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alert</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {alerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(alert.severity)}
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{formatAlertType(alert.alertType)}</p>
                              <p className="text-xs text-gray-500">{alert.alertNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getEntityTypeIcon(alert.entityType)}
                            <div>
                              <p className="text-sm text-gray-900">{alert.entityType}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[100px]">{alert.entityId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRiskLevelColor(alert.severity))}>
                            {alert.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            alert.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                            alert.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                            alert.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {alert.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  'h-full rounded-full',
                                  alert.riskScoreAtDetection >= 75 ? 'bg-red-500' :
                                  alert.riskScoreAtDetection >= 50 ? 'bg-orange-500' :
                                  alert.riskScoreAtDetection >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                                )}
                                style={{ width: `${alert.riskScoreAtDetection}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{alert.riskScoreAtDetection}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedAlert(alert)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 text-gray-500" />
                            </button>
                            {alert.status === 'OPEN' && (
                              <>
                                <button
                                  onClick={() => handleAlertAction(alert.id, 'resolve', 'Resolved by admin')}
                                  className="p-1 hover:bg-green-50 rounded"
                                  title="Resolve"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => handleAlertAction(alert.id, 'take_action', 'Account suspended')}
                                  className="p-1 hover:bg-red-50 rounded"
                                  title="Suspend Account"
                                >
                                  <Ban className="h-4 w-4 text-red-600" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Flagged Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {riskScores.map((score) => (
                      <tr key={score.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{score.entityId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getEntityTypeIcon(score.entityType)}
                            <span className="text-sm text-gray-700">{score.entityType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  'h-full rounded-full',
                                  score.riskScore >= 75 ? 'bg-red-500' :
                                  score.riskScore >= 50 ? 'bg-orange-500' :
                                  score.riskScore >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                                )}
                                style={{ width: `${score.riskScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{score.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRiskLevelColor(score.riskLevel))}>
                            {score.riskLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {score.isRestricted && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                Restricted
                              </span>
                            )}
                            {score.hasSuspiciousActivity && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                Flagged
                              </span>
                            )}
                            {!score.isRestricted && !score.hasSuspiciousActivity && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className="p-1 hover:bg-gray-100 rounded" title="View Profile">
                              <Eye className="h-4 w-4 text-gray-500" />
                            </button>
                            {score.isRestricted ? (
                              <button className="p-1 hover:bg-green-50 rounded" title="Restore Account">
                                <Unlock className="h-4 w-4 text-green-600" />
                              </button>
                            ) : (
                              <button className="p-1 hover:bg-red-50 rounded" title="Restrict Account">
                                <Ban className="h-4 w-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { code: 'EXCESSIVE_CANCELLATIONS', name: 'Excessive Cancellations', category: 'USER_BEHAVIOR', severity: 'MEDIUM', accuracy: 92 },
                { code: 'LOCATION_SPOOFING', name: 'Location Spoofing', category: 'RIDER_BEHAVIOR', severity: 'HIGH', accuracy: 87 },
                { code: 'PROMOTION_ABUSE', name: 'Promotion Abuse', category: 'USER_BEHAVIOR', severity: 'MEDIUM', accuracy: 85 },
                { code: 'FAKE_RIDE_COMPLETION', name: 'Fake Ride Completion', category: 'RIDER_BEHAVIOR', severity: 'HIGH', accuracy: 78 },
                { code: 'MULTIPLE_ACCOUNTS', name: 'Multiple Accounts', category: 'DEVICE_ANOMALY', severity: 'HIGH', accuracy: 91 },
                { code: 'IMPOSSIBLE_TRAVEL', name: 'Impossible Travel', category: 'LOCATION_ANOMALY', severity: 'CRITICAL', accuracy: 95 },
              ].map((pattern) => (
                <div key={pattern.code} className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{pattern.name}</h4>
                      <p className="text-sm text-gray-500">{pattern.category.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRiskLevelColor(pattern.severity))}>
                      {pattern.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${pattern.accuracy}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{pattern.accuracy}%</span>
                    </div>
                    <span className="text-xs text-gray-400">accuracy</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(selectedAlert.severity)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{formatAlertType(selectedAlert.alertType)}</h3>
                    <p className="text-sm text-gray-500">{selectedAlert.alertNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Entity Type</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getEntityTypeIcon(selectedAlert.entityType)}
                    <span className="font-medium">{selectedAlert.entityType}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={cn(
                    'inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium',
                    selectedAlert.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                    selectedAlert.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  )}>
                    {selectedAlert.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Risk Score</p>
                  <p className="font-medium text-lg">{selectedAlert.riskScoreAtDetection}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Detection Method</p>
                  <p className="font-medium">{selectedAlert.detectionMethod.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Entity ID</p>
                <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1">{selectedAlert.entityId}</p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-3">
              {selectedAlert.status === 'OPEN' && (
                <>
                  <button
                    onClick={() => handleAlertAction(selectedAlert.id, 'review')}
                    className="flex-1 bg-yellow-600 text-white py-2 rounded-lg font-medium"
                  >
                    Start Review
                  </button>
                  <button
                    onClick={() => handleAlertAction(selectedAlert.id, 'resolve')}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => handleAlertAction(selectedAlert.id, 'take_action')}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium"
                  >
                    Take Action
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

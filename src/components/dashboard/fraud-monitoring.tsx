'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Shield, 
  Loader2,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Activity,
  UserCheck,
  RefreshCw
} from 'lucide-react';

interface FraudAlert {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  isAcknowledged: boolean;
  createdAt: string;
  rider: { fullName: string } | null;
  user: { name: string } | null;
}

interface FraudStats {
  totalAlerts: number;
  criticalAlerts: number;
  acknowledgedToday: number;
  resolvedToday: number;
}

const getSeverityStyle = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
    case 'HIGH': return { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' };
    case 'MEDIUM': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
    case 'LOW': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
    default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
  }
};

const getAlertTypeStyle = (alertType: string) => {
  if (alertType.includes('SUSPICIOUS')) return { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangle };
  if (alertType.includes('FRAUD')) return { bg: 'bg-red-500/10', text: 'text-red-400', icon: Shield };
  if (alertType.includes('LOCATION')) return { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Activity };
  return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: AlertCircle };
};

export function FraudMonitoring() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState<FraudStats>({
    totalAlerts: 0,
    criticalAlerts: 0,
    acknowledgedToday: 0,
    resolvedToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/fraud/alerts?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
        setStats({
          totalAlerts: data.alerts?.length || 0,
          criticalAlerts: data.alerts?.filter((a: FraudAlert) => a.severity === 'CRITICAL' || a.severity === 'HIGH').length || 0,
          acknowledgedToday: data.alerts?.filter((a: FraudAlert) => a.isAcknowledged).length || 0,
          resolvedToday: 0,
        });
      } else {
        throw new Error('Failed to fetch fraud alerts');
      }
    } catch (err) {
      console.error('Failed to fetch fraud alerts:', err);
      setError('Failed to load fraud alerts');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading fraud alerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="glass-card rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4 mx-auto" />
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-6 py-2.5 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            Fraud Monitoring
          </h1>
          <p className="text-gray-400 mt-1">Monitor suspicious activities and fraud prevention</p>
        </div>
        <button
          onClick={fetchData}
          className="glass-button text-gray-300 border-white/10 hover:bg-white/5 px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Alerts</p>
                <p className="text-2xl font-bold text-white">{stats.totalAlerts}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Critical/High</p>
                <p className="text-2xl font-bold text-red-400">{stats.criticalAlerts}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Acknowledged</p>
                <p className="text-2xl font-bold text-amber-400">{stats.acknowledgedToday}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <UserCheck className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.resolvedToday}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Fraud Alerts
          </CardTitle>
          <CardDescription className="text-gray-500">System-detected suspicious activities</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-gray-400">No fraud alerts</p>
              <p className="text-gray-500 text-sm mt-1">System is monitoring for suspicious activities</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400">Alert Type</TableHead>
                    <TableHead className="text-gray-400">Severity</TableHead>
                    <TableHead className="text-gray-400">Message</TableHead>
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const severityStyle = getSeverityStyle(alert.severity);
                    const alertStyle = getAlertTypeStyle(alert.alertType);
                    const AlertIcon = alertStyle.icon;
                    return (
                      <TableRow key={alert.id} className={`border-white/5 hover:bg-white/5 ${alert.severity === 'CRITICAL' ? 'bg-red-500/5' : ''}`}>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${alertStyle.bg} border border-white/10`}>
                            <AlertIcon className={`h-3.5 w-3.5 ${alertStyle.text}`} />
                            <span className={`text-sm ${alertStyle.text}`}>{alert.alertType.replace(/_/g, ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${severityStyle.bg} ${severityStyle.text} ${severityStyle.border} border`}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-gray-300">{alert.message}</TableCell>
                        <TableCell className="text-gray-300">{alert.rider?.fullName || alert.user?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={alert.isAcknowledged ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}>
                            {alert.isAcknowledged ? 'Acknowledged' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">{new Date(alert.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

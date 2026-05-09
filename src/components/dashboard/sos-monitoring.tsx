'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Loader2,
  MapPin,
  Phone,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  Activity,
  RefreshCw,
  Eye,
  Navigation
} from 'lucide-react';

interface SOSAlert {
  id: string;
  alertNumber: string;
  userName: string;
  userPhone: string;
  userType: string;
  riderName?: string;
  riderPhone?: string;
  vehicleInfo?: string;
  taskNumber?: string;
  taskType?: string;
  latitude: number;
  longitude: number;
  locationAddress: string | null;
  status: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'ACTIVE': return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', pulse: true };
    case 'ACKNOWLEDGED': return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', pulse: false };
    case 'RESOLVED': return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', pulse: false };
    case 'FALSE_ALARM': return { bg: 'bg-gray-500/15', border: 'border-gray-500/30', text: 'text-gray-400', pulse: false };
    default: return { bg: 'bg-gray-500/15', border: 'border-gray-500/30', text: 'text-gray-400', pulse: false };
  }
};

export function SOSMonitoring() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);

  useEffect(() => {
    fetchAlerts();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/sos?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
        setError(null);
      } else {
        throw new Error('Failed to fetch alerts');
      }
    } catch (err) {
      console.error('Failed to fetch SOS alerts:', err);
      setError('Failed to load SOS alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, action: 'acknowledge' | 'resolve' | 'false_alarm') => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/sos/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} alert`);
      }
      
      await fetchAlerts();
      setSelectedAlert(null);
    } catch (err) {
      console.error(`Error ${action}ing alert:`, err);
      alert(`Failed to ${action} alert. Please try again.`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-red-400" />
          <p className="text-gray-400 text-sm">Loading SOS alerts...</p>
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
            onClick={fetchAlerts}
            className="px-6 py-2.5 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              {activeCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            SOS Emergency Monitoring
          </h1>
          <p className="text-gray-400 mt-1">Monitor and respond to emergency alerts</p>
        </div>
        <Button onClick={fetchAlerts} variant="outline" size="sm" className="glass-button text-gray-300 border-white/10 hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`glass-card glow-hover rounded-2xl ${activeCount > 0 ? 'border-red-500/30' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Alerts</p>
                <p className={`text-2xl font-bold ${activeCount > 0 ? 'text-red-400' : 'text-white'}`}>{activeCount}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${activeCount > 0 ? 'bg-red-500/15 border-red-500/30' : 'bg-gray-500/10 border-gray-500/20'}`}>
                <div className="relative">
                  <AlertTriangle className={`h-5 w-5 ${activeCount > 0 ? 'text-red-400' : 'text-gray-400'}`} />
                  {activeCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Acknowledged</p>
                <p className="text-2xl font-bold text-amber-400">{alerts.filter(a => a.status === 'ACKNOWLEDGED').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Resolved Today</p>
                <p className="text-2xl font-bold text-emerald-400">{alerts.filter(a => a.status === 'RESOLVED').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Alerts</p>
                <p className="text-2xl font-bold text-white">{alerts.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-400" />
            SOS Alerts
          </CardTitle>
          <CardDescription className="text-gray-500">Emergency alerts from riders and clients</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-gray-400">No SOS alerts</p>
              <p className="text-gray-500 text-sm mt-1">All clear - no emergency situations reported</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400">Alert #</TableHead>
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Location</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const statusStyle = getStatusStyle(alert.status);
                    return (
                      <TableRow key={alert.id} className={`border-white/5 hover:bg-white/5 ${alert.status === 'ACTIVE' ? 'bg-red-500/5' : ''}`}>
                        <TableCell className="font-medium text-white">{alert.alertNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                              <User className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{alert.userName}</p>
                              <p className="text-sm text-gray-500">{alert.userPhone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-white/10 text-gray-300">{alert.userType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-[#00FF88]" />
                            <span className="text-sm text-gray-300 truncate max-w-32">{alert.locationAddress || `${alert.latitude}, ${alert.longitude}`}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusStyle.pulse && <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />}
                            <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
                              {alert.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400">{new Date(alert.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {alert.status === 'ACTIVE' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={() => updateAlertStatus(alert.id, 'acknowledge')}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            )}
                            {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={() => updateAlertStatus(alert.id, 'resolve')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              SOS Alert Details
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Alert Number</p>
                  <p className="font-medium text-white">{selectedAlert.alertNumber}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={`${getStatusStyle(selectedAlert.status).bg} ${getStatusStyle(selectedAlert.status).text} ${getStatusStyle(selectedAlert.status).border} border mt-1`}>
                    {selectedAlert.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">User Name</p>
                  <p className="font-medium text-white">{selectedAlert.userName}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">User Phone</p>
                  <p className="font-medium text-white">{selectedAlert.userPhone}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">User Type</p>
                  <p className="font-medium text-white">{selectedAlert.userType}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="font-medium text-white">{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedAlert.riderName && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-xl border border-white/5">
                    <p className="text-sm text-gray-500">Rider Name</p>
                    <p className="font-medium text-white">{selectedAlert.riderName}</p>
                  </div>
                  <div className="glass p-4 rounded-xl border border-white/5">
                    <p className="text-sm text-gray-500">Rider Phone</p>
                    <p className="font-medium text-white">{selectedAlert.riderPhone || '-'}</p>
                  </div>
                </div>
              )}

              {selectedAlert.vehicleInfo && (
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Vehicle Info</p>
                  <p className="font-medium text-white">{selectedAlert.vehicleInfo}</p>
                </div>
              )}

              <div className="glass p-4 rounded-xl border border-white/5">
                <p className="text-sm text-gray-500 mb-2">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#00FF88]" />
                  <span className="text-white">{selectedAlert.locationAddress || 'No address provided'}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Navigation className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-400 text-sm">
                    {selectedAlert.latitude.toFixed(6)}, {selectedAlert.longitude.toFixed(6)}
                  </span>
                  <a 
                    href={`https://www.google.com/maps?q=${selectedAlert.latitude},${selectedAlert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-[#00FF88] hover:underline"
                  >
                    Open in Maps
                  </a>
                </div>
              </div>

              {selectedAlert.taskNumber && (
                <div className="glass p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-gray-500">Associated Task</p>
                  <p className="font-medium text-white">{selectedAlert.taskNumber} ({selectedAlert.taskType})</p>
                </div>
              )}

              {/* Action Buttons */}
              {selectedAlert.status === 'ACTIVE' && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => updateAlertStatus(selectedAlert.id, 'acknowledge')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => updateAlertStatus(selectedAlert.id, 'resolve')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                </div>
              )}

              {selectedAlert.status === 'ACKNOWLEDGED' && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => updateAlertStatus(selectedAlert.id, 'resolve')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                    onClick={() => updateAlertStatus(selectedAlert.id, 'false_alarm')}
                  >
                    False Alarm
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

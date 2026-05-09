'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Battery, 
  BatteryLow, 
  BatteryWarning, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Radio, 
  Smartphone, 
  Wifi, 
  WifiOff,
  XCircle,
  AlertCircle,
  Bell,
  User,
  Map,
  Activity,
  Zap
} from 'lucide-react';

// ==========================================
// Types
// ==========================================

interface RiderStatus {
  riderId: string;
  riderName: string;
  riderRole: string;
  taskId: string | null;
  taskNumber: string | null;
  lastHeartbeatAt: Date | null;
  connectionStatus: 'ACTIVE' | 'UNSTABLE' | 'DISCONNECTED';
  lastKnownLocation: { latitude: number; longitude: number } | null;
  batteryLevel: number | null;
  secondsSinceHeartbeat: number;
}

interface ConnectionAlert {
  id: string;
  riderId: string;
  taskId: string | null;
  alertType: 'CONNECTION_UNSTABLE' | 'CONNECTION_LOST' | 'LONG_DISCONNECT' | 'BATTERY_LOW' | 'GPS_UNRELIABLE' | 'TASK_TIMEOUT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  isAcknowledged: boolean;
  createdAt: Date;
}

interface MonitoringStats {
  totalActiveRiders: number;
  activeConnections: number;
  unstableConnections: number;
  disconnectedRiders: number;
  activeAlerts: number;
}

const HEARTBEAT_MONITOR_PORT = 3004;

// ==========================================
// Helper Functions
// ==========================================

function formatTimeSince(date: Date | null): string {
  if (!date) return 'Never';
  
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function getConnectionColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-green-500';
    case 'UNSTABLE': return 'bg-yellow-500';
    case 'DISCONNECTED': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'LOW': return 'bg-blue-500';
    case 'MEDIUM': return 'bg-yellow-500';
    case 'HIGH': return 'bg-orange-500';
    case 'CRITICAL': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function getBatteryIcon(level: number | null): React.ReactNode {
  if (level === null) return <Battery className="h-4 w-4" />;
  if (level < 10) return <BatteryLow className="h-4 w-4 text-red-500" />;
  if (level < 20) return <BatteryWarning className="h-4 w-4 text-yellow-500" />;
  return <Battery className="h-4 w-4 text-green-500" />;
}

// ==========================================
// Component: ConnectionMonitoringDashboard
// ==========================================

export function ConnectionMonitoringDashboard() {
  const [stats, setStats] = useState<MonitoringStats>({
    totalActiveRiders: 0,
    activeConnections: 0,
    unstableConnections: 0,
    disconnectedRiders: 0,
    activeAlerts: 0,
  });
  
  const [riders, setRiders] = useState<RiderStatus[]>([]);
  const [alerts, setAlerts] = useState<ConnectionAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRider, setSelectedRider] = useState<RiderStatus | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  // Update stats based on rider data - defined first to avoid hoisting issues
  const updateStats = useCallback((riderData: RiderStatus[], currentAlerts: ConnectionAlert[]) => {
    const active = riderData.filter(r => r.connectionStatus === 'ACTIVE').length;
    const unstable = riderData.filter(r => r.connectionStatus === 'UNSTABLE').length;
    const disconnected = riderData.filter(r => r.connectionStatus === 'DISCONNECTED').length;

    setStats({
      totalActiveRiders: riderData.length,
      activeConnections: active,
      unstableConnections: unstable,
      disconnectedRiders: disconnected,
      activeAlerts: currentAlerts.filter(a => !a.isAcknowledged).length,
    });
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    socketRef.current = io(`/?XTransformPort=${HEARTBEAT_MONITOR_PORT}`, {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to heartbeat monitor');
      setIsConnected(true);
      socketRef.current?.emit('admin:join');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from heartbeat monitor');
      setIsConnected(false);
    });

    // Receive active riders
    socketRef.current.on('admin:active-riders', (data: any[]) => {
      const riderStatuses: RiderStatus[] = data.map(r => ({
        riderId: r.riderId,
        riderName: `Rider ${r.riderId.slice(0, 4)}`,
        riderRole: 'SMART_BODA_RIDER',
        taskId: r.taskId,
        taskNumber: null,
        lastHeartbeatAt: r.lastHeartbeatAt,
        connectionStatus: r.connectionStatus,
        lastKnownLocation: r.lastKnownLocation,
        batteryLevel: r.batteryLevel,
        secondsSinceHeartbeat: r.lastHeartbeatAt 
          ? Math.floor((Date.now() - new Date(r.lastHeartbeatAt).getTime()) / 1000)
          : 999,
      }));
      
      setRiders(riderStatuses);
      // Use alerts state directly inside the handler
      setAlerts(currentAlerts => {
        updateStats(riderStatuses, currentAlerts);
        return currentAlerts;
      });
    });

    // Receive rider status updates
    socketRef.current.on('admin:rider:status', (data: { riderId: string; connectionStatus: string }) => {
      setRiders(prev => prev.map(r => 
        r.riderId === data.riderId 
          ? { ...r, connectionStatus: data.connectionStatus as any }
          : r
      ));
    });

    // Receive alerts
    socketRef.current.on('admin:alert', (alert: ConnectionAlert) => {
      setAlerts(prev => {
        const updated = [alert, ...prev].slice(0, 50);
        // Update stats with new alerts
        setStats(s => ({ ...s, activeAlerts: updated.filter(a => !a.isAcknowledged).length }));
        return updated;
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [updateStats]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, isAcknowledged: true } : a
    ));
  }, []);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Connection Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time rider heartbeat and connection status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'destructive'} className="flex items-center gap-1">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Disconnected
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Riders</p>
                <p className="text-2xl font-bold">{stats.totalActiveRiders}</p>
              </div>
              <Smartphone className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeConnections}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unstable</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.unstableConnections}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disconnected</p>
                <p className="text-2xl font-bold text-red-600">{stats.disconnectedRiders}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.activeAlerts}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="riders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="riders">
            <User className="h-4 w-4 mr-2" />
            Active Riders
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
            {stats.activeAlerts > 0 && (
              <Badge variant="destructive" className="ml-2">{stats.activeAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-2" />
            Map View
          </TabsTrigger>
        </TabsList>

        {/* Riders Tab */}
        <TabsContent value="riders">
          <Card>
            <CardHeader>
              <CardTitle>Active Riders</CardTitle>
              <CardDescription>
                Riders currently on active tasks with heartbeat monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {riders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active riders at the moment
                  </div>
                ) : (
                  <div className="space-y-2">
                    {riders.map((rider) => (
                      <div
                        key={rider.riderId}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedRider?.riderId === rider.riderId ? 'border-primary bg-muted/50' : ''
                        }`}
                        onClick={() => setSelectedRider(rider)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getConnectionColor(rider.connectionStatus)}`} />
                            <div>
                              <p className="font-medium">{rider.riderName}</p>
                              <p className="text-sm text-muted-foreground">
                                {rider.riderRole.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {rider.taskId && (
                              <Badge variant="outline">
                                Task: {rider.taskId.slice(0, 6)}
                              </Badge>
                            )}
                            {getBatteryIcon(rider.batteryLevel)}
                            {rider.batteryLevel !== null && (
                              <span className="text-sm">{rider.batteryLevel}%</span>
                            )}
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {formatTimeSince(rider.lastHeartbeatAt)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last heartbeat
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Connection Alerts</CardTitle>
              <CardDescription>
                Active alerts requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active alerts
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${
                          alert.isAcknowledged ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                              <AlertCircle className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{alert.alertType.replace(/_/g, ' ')}</p>
                                <Badge variant="outline" className={`
                                  ${alert.severity === 'CRITICAL' ? 'border-red-500 text-red-500' : ''}
                                  ${alert.severity === 'HIGH' ? 'border-orange-500 text-orange-500' : ''}
                                  ${alert.severity === 'MEDIUM' ? 'border-yellow-500 text-yellow-500' : ''}
                                `}>
                                  {alert.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {alert.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Rider: {alert.riderId.slice(0, 8)} • {formatTimeSince(alert.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!alert.isAcknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resolveAlert(alert.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Rider Locations</CardTitle>
              <CardDescription>
                Real-time rider positions on map
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Map integration placeholder
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {riders.filter(r => r.lastKnownLocation).length} riders with location data
                  </p>
                </div>
              </div>
              
              {/* Location list */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {riders.filter(r => r.lastKnownLocation).map((rider) => (
                  <div
                    key={rider.riderId}
                    className="p-2 rounded border text-sm flex items-center gap-2"
                  >
                    <div className={`w-2 h-2 rounded-full ${getConnectionColor(rider.connectionStatus)}`} />
                    <span className="truncate">{rider.riderName}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {rider.lastKnownLocation?.latitude.toFixed(4)}, {rider.lastKnownLocation?.longitude.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Rider Details */}
      {selectedRider && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>{selectedRider.riderName}</CardTitle>
                <Badge className={`${getConnectionColor(selectedRider.connectionStatus)} text-white`}>
                  {selectedRider.connectionStatus}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRider(null)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Last Heartbeat</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTimeSince(selectedRider.lastHeartbeatAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seconds Since</p>
                <p className="font-medium">{selectedRider.secondsSinceHeartbeat}s</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Battery</p>
                <p className="font-medium flex items-center gap-1">
                  {getBatteryIcon(selectedRider.batteryLevel)}
                  {selectedRider.batteryLevel !== null ? `${selectedRider.batteryLevel}%` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Task</p>
                <p className="font-medium">
                  {selectedRider.taskId ? selectedRider.taskId.slice(0, 8) : 'No active task'}
                </p>
              </div>
            </div>

            {selectedRider.lastKnownLocation && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Last Known Location
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedRider.lastKnownLocation.latitude.toFixed(6)}, {selectedRider.lastKnownLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline">
                <Radio className="h-4 w-4 mr-1" />
                Contact Rider
              </Button>
              <Button size="sm" variant="outline">
                <Activity className="h-4 w-4 mr-1" />
                View History
              </Button>
              {selectedRider.connectionStatus === 'DISCONNECTED' && (
                <Button size="sm" variant="destructive">
                  <Zap className="h-4 w-4 mr-1" />
                  Escalate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

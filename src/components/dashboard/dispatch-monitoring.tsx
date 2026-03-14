'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Bike,
  Car,
  Package,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Star,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DispatchStats {
  totalRiders: number;
  onlineRiders: number;
  availableRiders: number;
  pendingTasks: number;
  byRole: {
    SMART_BODA_RIDER: number;
    SMART_CAR_DRIVER: number;
    DELIVERY_PERSONNEL: number;
  };
  surgeMultiplier: number;
}

interface DispatchLog {
  id: string;
  taskId: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
  isAvailable: boolean;
  rating: number;
  safetyScore: number;
  fraudRiskScore: number;
  isFlagged: boolean;
  currentTaskId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export function DispatchMonitoring() {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<DispatchStats | null>(null);
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('/?XTransformPort=3003', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to dispatch service');
      setConnected(true);
      newSocket.emit('admin:join');
      newSocket.emit('admin:stats');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from dispatch service');
      setConnected(false);
    });

    newSocket.on('admin:stats', (data: DispatchStats) => {
      setStats(data);
    });

    newSocket.on('admin:logs', (data: DispatchLog[]) => {
      setLogs(data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Auto-refresh stats
  useEffect(() => {
    if (!autoRefresh || !connected) return;

    const interval = setInterval(() => {
      // Request stats via REST API since we don't have socket in state
      fetch('/api/dispatch?action=stats')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStats(data.data);
          }
        })
        .catch(console.error);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, connected]);

  const refreshStats = useCallback(() => {
    fetch('/api/dispatch?action=stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .catch(console.error);

    fetch('/api/dispatch?action=logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLogs(data.data);
        }
      })
      .catch(console.error);
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes('ACCEPTED') || action.includes('COMPLETED')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (action.includes('REJECTED') || action.includes('CANCELLED') || action.includes('FAILED')) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (action.includes('TIMEOUT') || action.includes('FLAGGED')) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    if (action.includes('OFFER')) {
      return <Activity className="h-4 w-4 text-blue-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SMART_BODA_RIDER':
        return <Bike className="h-4 w-4" />;
      case 'SMART_CAR_DRIVER':
        return <Car className="h-4 w-4" />;
      case 'DELIVERY_PERSONNEL':
        return <Package className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getSurgeColor = (multiplier: number) => {
    if (multiplier <= 1.0) return 'text-gray-500';
    if (multiplier <= 1.5) return 'text-yellow-500';
    if (multiplier <= 2.0) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dispatch Engine</h2>
          <p className="text-muted-foreground">
            Real-time matching and provider management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                connected ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <span className="text-sm text-muted-foreground">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={!connected}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Providers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.onlineRiders || 0}
              <span className="text-sm text-muted-foreground font-normal ml-2">
                / {stats?.totalRiders || 0} total
              </span>
            </div>
            <Progress
              value={
                stats?.totalRiders
                  ? (stats.onlineRiders / stats.totalRiders) * 100
                  : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.availableRiders || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready to accept tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Waiting for assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surge Multiplier</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', getSurgeColor(stats?.surgeMultiplier || 1))}>
              {stats?.surgeMultiplier?.toFixed(1) || '1.0'}x
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Demand-based pricing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Providers by Type</CardTitle>
          <CardDescription>Online providers broken down by service type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Bike className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {stats?.byRole?.SMART_BODA_RIDER || 0}
                </div>
                <p className="text-sm text-muted-foreground">Smart Boda Riders</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {stats?.byRole?.SMART_CAR_DRIVER || 0}
                </div>
                <p className="text-sm text-muted-foreground">Smart Car Drivers</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {stats?.byRole?.DELIVERY_PERSONNEL || 0}
                </div>
                <p className="text-sm text-muted-foreground">Delivery Personnel</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Activity Log</CardTitle>
          <CardDescription>Real-time dispatch events and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No dispatch activity yet. Connect to the dispatch service to see logs.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">{getActionIcon(log.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{log.action}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.entityType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {log.description}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <span
                              key={key}
                              className="text-xs bg-muted px-2 py-1 rounded"
                            >
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dispatch Algorithm Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Scoring Algorithm
          </CardTitle>
          <CardDescription>
            How providers are ranked for task assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">Scoring Weights</h4>
              <div className="space-y-2">
                {[
                  { label: 'Distance (Proximity)', weight: 25, color: 'bg-blue-500' },
                  { label: 'Rating', weight: 15, color: 'bg-yellow-500' },
                  { label: 'Acceptance Rate', weight: 10, color: 'bg-green-500' },
                  { label: 'Completion Rate', weight: 15, color: 'bg-emerald-500' },
                  { label: 'Reliability Score', weight: 15, color: 'bg-purple-500' },
                  { label: 'Safety Score', weight: 10, color: 'bg-red-500' },
                  { label: 'Response Time', weight: 5, color: 'bg-cyan-500' },
                  { label: 'Fraud Risk (Penalty)', weight: 5, color: 'bg-gray-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="flex-1">
                      <Progress value={item.weight} className="h-2" />
                    </div>
                    <div className="w-10 text-sm text-right">{item.weight}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Matching Flow</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                    1
                  </span>
                  <span>Task created with pickup location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                    2
                  </span>
                  <span>Find providers within radius (default 5km)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                    3
                  </span>
                  <span>Filter by type, availability, and safety score</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                    4
                  </span>
                  <span>Score and rank providers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                    5
                  </span>
                  <span>Send offers to top N providers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                    6
                  </span>
                  <span>Wait for response (15s timeout)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                    7
                  </span>
                  <span>Auto-expand radius if no match found</span>
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

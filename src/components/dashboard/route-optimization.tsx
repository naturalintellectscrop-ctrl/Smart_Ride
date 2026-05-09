'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Navigation,
  TrafficCone,
  Clock,
  Zap,
  AlertTriangle,
  Car,
  Bike,
  Route,
  RefreshCw,
  Gauge,
  CloudRain,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface TrafficSegment {
  segmentId: string;
  currentSpeedKmh: number;
  freeFlowSpeedKmh: number;
  congestionLevel: string;
  congestionScore: number;
  delaySeconds: number;
  timestamp: string;
}

interface TrafficIncident {
  id: string;
  type: string;
  location: { latitude: number; longitude: number };
  severity: string;
  description: string;
  isActive: boolean;
  isVerified: boolean;
  affectedSegments: string[];
  reportedAt: string;
}

interface RouteCalculation {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
}

// Traffic Monitor Component
function TrafficMonitor() {
  const [trafficData, setTrafficData] = useState<TrafficSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTraffic = useCallback(async () => {
    try {
      const response = await fetch('/api/route?action=traffic');
      const data = await response.json();
      if (data.success) {
        setTrafficData(data.data);
      }
    } catch (error) {
      console.error('Error fetching traffic:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraffic();
    if (autoRefresh) {
      const interval = setInterval(fetchTraffic, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchTraffic, autoRefresh]);

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'FREE_FLOW': return 'bg-green-500';
      case 'LIGHT': return 'bg-lime-500';
      case 'MODERATE': return 'bg-yellow-500';
      case 'HEAVY': return 'bg-orange-500';
      case 'SEVERE': return 'bg-red-500';
      case 'GRIDLOCK': return 'bg-red-700';
      default: return 'bg-gray-500';
    }
  };

  const getCongestionTextColor = (level: string) => {
    switch (level) {
      case 'FREE_FLOW': return 'text-green-600';
      case 'LIGHT': return 'text-lime-600';
      case 'MODERATE': return 'text-yellow-600';
      case 'HEAVY': return 'text-orange-600';
      case 'SEVERE': return 'text-red-600';
      case 'GRIDLOCK': return 'text-red-700';
      default: return 'text-gray-600';
    }
  };

  // Calculate summary stats
  const avgSpeed = trafficData.length > 0
    ? Math.round(trafficData.reduce((sum, t) => sum + t.currentSpeedKmh, 0) / trafficData.length)
    : 0;

  const avgCongestion = trafficData.length > 0
    ? Math.round((trafficData.reduce((sum, t) => sum + t.congestionScore, 0) / trafficData.length) * 100)
    : 100;

  const incidentsCount = trafficData.filter(t => t.congestionLevel === 'SEVERE' || t.congestionLevel === 'GRIDLOCK').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrafficCone className="h-5 w-5" />
              Traffic Intelligence
            </CardTitle>
            <CardDescription>Real-time road segment monitoring</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Auto</Label>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold">{avgSpeed}</p>
            <p className="text-xs text-muted-foreground">Avg Speed (km/h)</p>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold">{avgCongestion}%</p>
            <p className="text-xs text-muted-foreground">Traffic Flow</p>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold text-red-500">{incidentsCount}</p>
            <p className="text-xs text-muted-foreground">Critical Segments</p>
          </div>
        </div>

        {/* Traffic Legend */}
        <div className="flex flex-wrap gap-2">
          {['FREE_FLOW', 'LIGHT', 'MODERATE', 'HEAVY', 'SEVERE', 'GRIDLOCK'].map((level) => (
            <div key={level} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded-full', getCongestionColor(level))} />
              <span className="text-xs">{level.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Traffic Segments List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Road Segments</h4>
          <ScrollArea className="h-[250px]">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : trafficData.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No traffic data available</p>
            ) : (
              trafficData.map((segment) => (
                <div
                  key={segment.segmentId}
                  className="flex items-center justify-between p-2 border rounded-lg mb-2"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{segment.segmentId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {segment.currentSpeedKmh} / {segment.freeFlowSpeedKmh} km/h
                      </span>
                      {segment.delaySeconds > 60 && (
                        <span className="text-xs text-red-500">
                          +{Math.round(segment.delaySeconds / 60)} min
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={cn('ml-2', getCongestionTextColor(segment.congestionLevel))}
                  >
                    {segment.congestionLevel.replace('_', ' ')}
                  </Badge>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Congestion Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Traffic Flow</span>
            <span>{avgCongestion}%</span>
          </div>
          <Progress value={avgCongestion} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

// Incident Manager Component
function IncidentManager() {
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    try {
      const response = await fetch('/api/route?action=incidents');
      const data = await response.json();
      if (data.success) {
        setIncidents(data.data);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleClearIncident = async (incidentId: string) => {
    try {
      const response = await fetch('/api/route?action=clear-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId }),
      });
      const data = await response.json();
      if (data.success) {
        fetchIncidents();
      }
    } catch (error) {
      console.error('Error clearing incident:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'MAJOR': return 'destructive';
      case 'MODERATE': return 'default';
      case 'MINOR': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Management
            </CardTitle>
            <CardDescription>Active traffic incidents and alerts</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchIncidents}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report Incident Button */}
        <Button className="w-full">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Report New Incident
        </Button>

        <Separator />

        {/* Active Incidents */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Active Incidents ({incidents.filter(i => i.isActive).length})</h4>
          <ScrollArea className="h-[300px]">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : incidents.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground">No active incidents</p>
              </div>
            ) : (
              incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={cn(
                    "p-3 border rounded-lg mb-2",
                    !incident.isActive && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{incident.type.replace('_', ' ')}</span>
                        <Badge variant={getSeverityColor(incident.severity) as any}>
                          {incident.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {incident.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Segments: {incident.affectedSegments.join(', ')}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {incident.isVerified ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600">
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </div>
                    {incident.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearIncident(incident.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

// Route Calculator Component
function RouteCalculator() {
  const [pickup, setPickup] = useState({ lat: 0.3162, lng: 32.5678 });
  const [dropoff, setDropoff] = useState({ lat: 0.3300, lng: 32.5820 });
  const [preference, setPreference] = useState('FASTEST');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const calculateRoute = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/route?action=calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: { latitude: pickup.lat, longitude: pickup.lng },
          dropoff: { latitude: dropoff.lat, longitude: dropoff.lng },
          preference,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Route Calculator
        </CardTitle>
        <CardDescription>Calculate optimal routes between locations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Pickup Latitude</Label>
            <Input
              type="number"
              step="0.0001"
              value={pickup.lat}
              onChange={(e) => setPickup({ ...pickup, lat: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Pickup Longitude</Label>
            <Input
              type="number"
              step="0.0001"
              value={pickup.lng}
              onChange={(e) => setPickup({ ...pickup, lng: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dropoff Latitude</Label>
            <Input
              type="number"
              step="0.0001"
              value={dropoff.lat}
              onChange={(e) => setDropoff({ ...dropoff, lat: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Dropoff Longitude</Label>
            <Input
              type="number"
              step="0.0001"
              value={dropoff.lng}
              onChange={(e) => setDropoff({ ...dropoff, lng: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Route Preference</Label>
          <Select value={preference} onValueChange={setPreference}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FASTEST">Fastest Route</SelectItem>
              <SelectItem value="SHORTEST">Shortest Distance</SelectItem>
              <SelectItem value="BALANCED">Balanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={calculateRoute} disabled={loading} className="w-full">
          {loading ? 'Calculating...' : 'Calculate Route'}
        </Button>

        {result && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold">{result.distanceKm}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{result.estimatedTimeMinutes}</p>
                <p className="text-xs text-muted-foreground">minutes</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{result.trafficLevel}</p>
                <p className="text-xs text-muted-foreground">traffic</p>
              </div>
            </div>

            {result.rerouteRecommended && (
              <div className="flex items-center gap-2 p-2 bg-yellow-100 rounded text-yellow-800">
                <Zap className="h-4 w-4" />
                <span className="text-sm">{result.rerouteReason}</span>
              </div>
            )}

            {result.etaBreakdown && (
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Time:</span>
                  <span>{result.etaBreakdown.baseTravelTime} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Traffic Delay:</span>
                  <span className="text-red-600">+{result.etaBreakdown.trafficDelay} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confidence:</span>
                  <span>{Math.round(result.etaBreakdown.confidence * 100)}%</span>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Calculated in {result.calculationTimeMs}ms using {result.algorithm}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Algorithm Info Component
function AlgorithmInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Routing Algorithms
        </CardTitle>
        <CardDescription>How the route optimization engine works</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              A* Algorithm
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Heuristic-based fastest route calculation. Uses Euclidean distance to estimate remaining cost.
            </p>
          </div>

          <div className="p-3 border rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Route className="h-4 w-4 text-blue-500" />
              Dijkstra's Algorithm
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Guarantees shortest path. Used as fallback when heuristic fails.
            </p>
          </div>

          <div className="p-3 border rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4 text-green-500" />
              Dynamic Rerouting
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically recalculates route when traffic conditions change by 2+ minutes.
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Edge Weight Formula</h4>
          <div className="p-2 bg-muted rounded font-mono text-xs">
            weight = distance + traffic_delay + incident_penalty + weather_penalty + toll_penalty
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">ETA Prediction</h4>
          <div className="p-2 bg-muted rounded font-mono text-xs">
            ETA = base_time + traffic_delay + intersection_delay + weather_penalty
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Performance Targets</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span>Calculation Time:</span>
              <span className="font-medium">{'<'}150ms</span>
            </div>
            <div className="flex justify-between">
              <span>ETA Accuracy:</span>
              <span className="font-medium">±10%</span>
            </div>
            <div className="flex justify-between">
              <span>Update Frequency:</span>
              <span className="font-medium">5-10s</span>
            </div>
            <div className="flex justify-between">
              <span>Ride Time Reduction:</span>
              <span className="font-medium">15-20%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export function RouteOptimizationDashboard() {
  const [stats, setStats] = useState({
    totalSegments: 0,
    activeIncidents: 0,
    avgSpeed: 0,
    reroutesToday: 0,
  });

  useEffect(() => {
    // Fetch initial stats
    const fetchStats = async () => {
      try {
        const [trafficRes, incidentsRes] = await Promise.all([
          fetch('/api/route?action=traffic'),
          fetch('/api/route?action=incidents'),
        ]);
        const traffic = await trafficRes.json();
        const incidents = await incidentsRes.json();

        if (traffic.success && incidents.success) {
          const avgSpeed = traffic.data.length > 0
            ? Math.round(traffic.data.reduce((sum: number, t: any) => sum + t.currentSpeedKmh, 0) / traffic.data.length)
            : 0;

          setStats({
            totalSegments: traffic.data.length,
            activeIncidents: incidents.data.filter((i: any) => i.isActive).length,
            avgSpeed,
            reroutesToday: 47, // Mock data
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Route Optimization</h2>
          <p className="text-muted-foreground">
            Traffic intelligence & dynamic routing engine
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Road Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSegments}</div>
            <p className="text-xs text-muted-foreground">Monitored segments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.activeIncidents}</div>
            <p className="text-xs text-muted-foreground">Affecting routes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSpeed} km/h</div>
            <p className="text-xs text-muted-foreground">Network average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reroutes Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reroutesToday}</div>
            <p className="text-xs text-muted-foreground">Dynamic optimizations</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="traffic">
            <TrafficCone className="h-4 w-4 mr-2" />
            Traffic
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Incidents
          </TabsTrigger>
          <TabsTrigger value="calculator">
            <Route className="h-4 w-4 mr-2" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="algorithms">
            <Activity className="h-4 w-4 mr-2" />
            Algorithms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traffic">
          <TrafficMonitor />
        </TabsContent>

        <TabsContent value="incidents">
          <IncidentManager />
        </TabsContent>

        <TabsContent value="calculator">
          <RouteCalculator />
        </TabsContent>

        <TabsContent value="algorithms">
          <AlgorithmInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
}

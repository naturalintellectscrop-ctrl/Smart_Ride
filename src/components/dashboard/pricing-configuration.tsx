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
  DollarSign,
  TrendingUp,
  Zap,
  Clock,
  Cloud,
  Car,
  Bike,
  Truck,
  RefreshCw,
  Save,
  Calculator,
  MapPin,
  Timer,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface RideTypePricing {
  rideType: string;
  baseFare: number;
  perKilometerRate: number;
  perMinuteRate: number;
  minimumFare: number;
  cancellationFee: number;
  peakHourMultiplier: number;
  nightMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  maxPassengers: number;
  isActive: boolean;
}

interface PricingConfig {
  currency: string;
  defaultBaseFare: number;
  defaultPerKilometerRate: number;
  defaultPerMinuteRate: number;
  defaultMinimumFare: number;
  rideTypePricing: Record<string, RideTypePricing>;
  surgeConfig: {
    enabled: boolean;
    maxSurgeMultiplier: number;
    updateIntervalSeconds: number;
  };
  peakHourConfig: {
    enabled: boolean;
    morningMultiplier: number;
    eveningMultiplier: number;
    nightMultiplier: number;
  };
  serviceFeePercent: number;
  taxPercent: number;
  platformCommissionPercent: number;
}

interface SurgeStatus {
  globalMultiplier: number;
  activeZones: Array<{
    zoneId: string;
    zoneName: string;
    multiplier: number;
    demandRatio: number;
    isActive: boolean;
  }>;
  lastUpdate: string;
  nextUpdate: string;
}

interface FareEstimate {
  estimatedFare: number;
  formatted: string;
  currency: string;
  minimumFare: number;
  baseFare: number;
}

// Pricing Calculator Component
function FareCalculator() {
  const [distance, setDistance] = useState(5);
  const [time, setTime] = useState(15);
  const [rideType, setRideType] = useState('STANDARD');
  const [traffic, setTraffic] = useState('MODERATE');
  const [weather, setWeather] = useState('CLEAR');
  const [demand, setDemand] = useState(0);
  const [drivers, setDrivers] = useState(10);
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateEstimate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing?action=calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimatedDistanceKm: distance,
          estimatedTimeMinutes: time,
          rideType,
          trafficCondition: traffic,
          weatherCondition: weather,
          currentDemandLevel: demand,
          availableDriversNearby: drivers,
          pickupLocation: { latitude: 0, longitude: 0 },
          dropoffLocation: { latitude: 0, longitude: 0 },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEstimate({
          estimatedFare: data.data.fareBreakdown.finalFare,
          formatted: data.formatted.finalFare,
          currency: data.formatted.currency,
          minimumFare: data.data.fareBreakdown.minimumFareApplied 
            ? data.data.estimatedDistanceKm * 0 
            : 0,
          baseFare: data.data.fareBreakdown.baseFare,
        });
      }
    } catch (error) {
      console.error('Error calculating fare:', error);
    } finally {
      setLoading(false);
    }
  }, [distance, time, rideType, traffic, weather, demand, drivers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Fare Calculator
        </CardTitle>
        <CardDescription>Test fare calculations in real-time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Distance (km)</Label>
            <Input
              type="number"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              min={0.1}
              step={0.1}
            />
          </div>
          <div className="space-y-2">
            <Label>Time (minutes)</Label>
            <Input
              type="number"
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              min={1}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ride Type</Label>
            <Select value={rideType} onValueChange={setRideType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ECONOMY">Economy</SelectItem>
                               <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
                <SelectItem value="XL">XL</SelectItem>
                <SelectItem value="LUXURY">Luxury</SelectItem>
                <SelectItem value="BODA">Boda (Motorcycle)</SelectItem>
                <SelectItem value="DELIVERY">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Traffic</Label>
            <Select value={traffic} onValueChange={setTraffic}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIGHT">Light</SelectItem>
                <SelectItem value="MODERATE">Moderate</SelectItem>
                <SelectItem value="HEAVY">Heavy</SelectItem>
                <SelectItem value="SEVERE">Severe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Weather</Label>
            <Select value={weather} onValueChange={setWeather}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLEAR">Clear</SelectItem>
                <SelectItem value="CLOUDY">Cloudy</SelectItem>
                <SelectItem value="RAIN">Rain</SelectItem>
                <SelectItem value="HEAVY_RAIN">Heavy Rain</SelectItem>
                <SelectItem value="STORM">Storm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Available Drivers</Label>
            <Input
              type="number"
              value={drivers}
              onChange={(e) => setDrivers(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Current Demand (ride requests)</Label>
          <Input
            type="number"
            value={demand}
            onChange={(e) => setDemand(Number(e.target.value))}
            min={0}
          />
          <p className="text-xs text-muted-foreground">
            Demand ratio: {drivers > 0 ? (demand / drivers).toFixed(2) : demand > 0 ? '∞' : '0'}
          </p>
        </div>

        <Button onClick={calculateEstimate} disabled={loading} className="w-full">
          {loading ? 'Calculating...' : 'Calculate Fare'}
        </Button>

        {estimate && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Estimated Fare</p>
              <p className="text-3xl font-bold text-primary">{estimate.formatted}</p>
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Base Fare:</span>
                <span className="ml-2 font-medium">{estimate.baseFare}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Currency:</span>
                <span className="ml-2 font-medium">{estimate.currency}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Surge Monitoring Component
function SurgeMonitor() {
  const [surgeStatus, setSurgeStatus] = useState<SurgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchSurge = async () => {
      try {
        const response = await fetch('/api/pricing?action=surge');
        const data = await response.json();
        if (data.success) {
          setSurgeStatus(data.data);
        }
      } catch (error) {
        console.error('Error fetching surge status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurge();

    if (autoRefresh) {
      const interval = setInterval(fetchSurge, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getSurgeColor = (multiplier: number) => {
    if (multiplier <= 1.0) return 'text-gray-500';
    if (multiplier <= 1.5) return 'text-yellow-500';
    if (multiplier <= 2.0) return 'text-orange-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading surge status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Surge Pricing
            </CardTitle>
            <CardDescription>Real-time surge monitoring</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Auto</Label>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Global Multiplier</p>
            <p className={cn('text-3xl font-bold', getSurgeColor(surgeStatus?.globalMultiplier || 1))}>
              {surgeStatus?.globalMultiplier?.toFixed(1) || '1.0'}x
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Active Zones</p>
            <p className="text-2xl font-bold">{surgeStatus?.activeZones?.length || 0}</p>
          </div>
        </div>

        {surgeStatus?.activeZones && surgeStatus.activeZones.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Active Surge Zones</h4>
            <ScrollArea className="h-[200px]">
              {surgeStatus.activeZones.map((zone) => (
                <div
                  key={zone.zoneId}
                  className="flex items-center justify-between p-3 border rounded-lg mb-2"
                >
                  <div>
                    <p className="font-medium">{zone.zoneName}</p>
                    <p className="text-sm text-muted-foreground">
                      Ratio: {zone.demandRatio.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant={zone.multiplier >= 2 ? 'destructive' : 'default'}>
                    {zone.multiplier.toFixed(1)}x
                  </Badge>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Last update: {surgeStatus?.lastUpdate 
            ? new Date(surgeStatus.lastUpdate).toLocaleTimeString() 
            : 'N/A'}
        </div>
      </CardContent>
    </Card>
  );
}

// Ride Type Configuration Component
function RideTypeConfig({
  rideTypes,
  onUpdate,
}: {
  rideTypes: Record<string, RideTypePricing>;
  onUpdate: () => void;
}) {
  const [selectedType, setSelectedType] = useState<string>('STANDARD');
  const [editing, setEditing] = useState(false);
  const [localPricing, setLocalPricing] = useState<Partial<RideTypePricing>>({});

  // Get current ride type pricing
  const pricing = rideTypes[selectedType];
  
  // Merge with local edits
  const displayPricing = { ...pricing, ...localPricing };

  const handleSave = async () => {
    if (!displayPricing) return;

    try {
      const response = await fetch('/api/pricing?action=ride-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rideType: selectedType,
          pricing: displayPricing,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEditing(false);
        setLocalPricing({});
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  };

  const getRideTypeIcon = (type: string) => {
    switch (type) {
      case 'ECONOMY':
        return <Car className="h-4 w-4" />;
      case 'BODA':
        return <Bike className="h-4 w-4" />;
      case 'DELIVERY':
        return <Truck className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  if (!pricing) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Ride Type Pricing
        </CardTitle>
        <CardDescription>Configure pricing for each ride type</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.keys(rideTypes).map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type)}
              className="flex items-center gap-2"
            >
              {getRideTypeIcon(type)}
              {type}
            </Button>
          ))}
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Base Fare</Label>
            <Input
              type="number"
              value={displayPricing.baseFare}
              onChange={(e) => setLocalPricing({ ...localPricing, baseFare: Number(e.target.value) })}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label>Per Km Rate</Label>
            <Input
              type="number"
              value={displayPricing.perKilometerRate}
              onChange={(e) => setLocalPricing({ ...localPricing, perKilometerRate: Number(e.target.value) })}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label>Per Minute Rate</Label>
            <Input
              type="number"
              value={displayPricing.perMinuteRate}
              onChange={(e) => setLocalPricing({ ...localPricing, perMinuteRate: Number(e.target.value) })}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum Fare</Label>
            <Input
              type="number"
              value={displayPricing.minimumFare}
              onChange={(e) => setLocalPricing({ ...localPricing, minimumFare: Number(e.target.value) })}
              disabled={!editing}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium">Multipliers</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peak Hour</Label>
              <Input
                type="number"
                value={displayPricing.peakHourMultiplier}
                onChange={(e) => setLocalPricing({ ...localPricing, peakHourMultiplier: Number(e.target.value) })}
                disabled={!editing}
                step={0.1}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Night</Label>
              <Input
                type="number"
                value={displayPricing.nightMultiplier}
                onChange={(e) => setLocalPricing({ ...localPricing, nightMultiplier: Number(e.target.value) })}
                disabled={!editing}
                step={0.1}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Weekend</Label>
              <Input
                type="number"
                value={displayPricing.weekendMultiplier}
                onChange={(e) => setLocalPricing({ ...localPricing, weekendMultiplier: Number(e.target.value) })}
                disabled={!editing}
                step={0.1}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Holiday</Label>
              <Input
                type="number"
                value={displayPricing.holidayMultiplier}
                onChange={(e) => setLocalPricing({ ...localPricing, holidayMultiplier: Number(e.target.value) })}
                disabled={!editing}
                step={0.1}
                min={1}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => {
                setEditing(false);
                setLocalPricing({});
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>Edit Pricing</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export function PricingConfiguration() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/pricing?action=config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pricing Engine</h2>
          <p className="text-muted-foreground">
            Configure fare calculation and surge pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {config?.currency || 'UGX'}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchConfig}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Base Fare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.defaultBaseFare || 0}</div>
            <p className="text-xs text-muted-foreground">Default starting price</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Per Km Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.defaultPerKilometerRate || 0}</div>
            <p className="text-xs text-muted-foreground">Distance charge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Per Min Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.defaultPerMinuteRate || 0}</div>
            <p className="text-xs text-muted-foreground">Time charge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.platformCommissionPercent || 0}%</div>
            <p className="text-xs text-muted-foreground">Commission rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calculator">
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="surge">
            <Zap className="h-4 w-4 mr-2" />
            Surge
          </TabsTrigger>
          <TabsTrigger value="config">
            <DollarSign className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <FareCalculator />
        </TabsContent>

        <TabsContent value="surge">
          <SurgeMonitor />
        </TabsContent>

        <TabsContent value="config">
          {config && (
            <RideTypeConfig
              rideTypes={config.rideTypePricing}
              onUpdate={fetchConfig}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Pricing Formula Info */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Formula</CardTitle>
          <CardDescription>How fares are calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-muted rounded font-mono">
              Final Fare = (Base + Distance×Km + Time×Min) × Surge × Peak × Weather × Traffic
            </div>
            <div className="grid gap-2 mt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Fare:</span>
                <span>Fixed starting price</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance:</span>
                <span>Km × per-km rate</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span>Minutes × per-min rate (traffic adjusted)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surge:</span>
                <span>1 + (demand_ratio × 0.2), max 3.0x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum:</span>
                <span>Final fare cannot be below minimum</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

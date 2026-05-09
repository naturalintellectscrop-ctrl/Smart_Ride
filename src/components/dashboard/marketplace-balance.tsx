'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/components/auth/auth-provider';
import { canView, canEdit } from '@/lib/permissions';
import { NotificationSender } from '@/components/notifications/notification-sender';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Car, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  MapPin,
  DollarSign,
  Target,
  Plus,
  X,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Bell,
  Send,
  Gift
} from 'lucide-react';

interface ZoneStats {
  id: string;
  name: string;
  code: string;
  zoneType: string;
  centerLatitude: number;
  centerLongitude: number;
  rideRequests: number;
  activeDrivers: number;
  availableDrivers: number;
  ratio: number;
  status: string;
  statusColor: string;
  surgeActive: boolean;
  surgeMultiplier: number;
  recordedAt: string | null;
}

interface MarketplaceOverview {
  totalRideRequests: number;
  totalActiveDrivers: number;
  totalAvailableDrivers: number;
  overallRatio: number;
  overallStatus: string;
  overallStatusLabel: string;
  totalZones: number;
  oversuppliedZones: number;
  balancedZones: number;
  highDemandZones: number;
  surgeZones: number;
  criticalZones: number;
  activeSurges: number;
  activeIncentives: number;
  zones: ZoneStats[];
  recordedAt: string;
}

interface Incentive {
  id: string;
  name: string;
  type: string;
  rewardAmount: number;
  zoneName: string | null;
  startTime: string;
  endTime: string;
  status: string;
}

export function MarketplaceBalance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<MarketplaceOverview | null>(null);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [surgeDialogOpen, setSurgeDialogOpen] = useState(false);
  const [incentiveDialogOpen, setIncentiveDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ZoneStats | null>(null);
  const [surgeMultiplier, setSurgeMultiplier] = useState('1.5');
  const [surgeReason, setSurgeReason] = useState('');
  
  // New incentive form
  const [newIncentive, setNewIncentive] = useState({
    name: '',
    description: '',
    type: 'ZONE_SPECIFIC',
    rewardAmount: '',
    zoneId: '',
    minRides: '5',
  });
  const [submitting, setSubmitting] = useState(false);

  const canEditMarketplace = user?.role && canEdit(user.role, 'pricing' as any);
  const canViewMarketplace = user?.role && canView(user.role, 'pricing' as any);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const [overviewRes, incentivesRes] = await Promise.all([
        fetch('/api/marketplace/overview'),
        fetch('/api/marketplace/incentives?status=ACTIVE'),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.data);
      }

      if (incentivesRes.ok) {
        const data = await incentivesRes.json();
        setIncentives(data.data?.incentives || []);
      }
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (canViewMarketplace) {
      fetchData();
      
      // Auto-refresh every 60 seconds
      const interval = setInterval(() => fetchData(true), 60000);
      return () => clearInterval(interval);
    }
  }, [canViewMarketplace, fetchData]);

  const handleStartSurge = async () => {
    if (!selectedZone) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/marketplace/surge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId: selectedZone.id,
          multiplier: parseFloat(surgeMultiplier),
          reason: surgeReason || 'Manual surge activation',
        }),
      });

      if (response.ok) {
        setSurgeDialogOpen(false);
        setSelectedZone(null);
        setSurgeMultiplier('1.5');
        setSurgeReason('');
        fetchData();
      }
    } catch (error) {
      console.error('Error starting surge:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateIncentive = async () => {
    setSubmitting(true);
    try {
      const startTime = new Date();
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + 4);

      const response = await fetch('/api/marketplace/incentives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIncentive.name,
          description: newIncentive.description,
          incentiveType: newIncentive.type,
          rewardAmount: parseFloat(newIncentive.rewardAmount),
          zoneId: newIncentive.zoneId || null,
          minRides: parseInt(newIncentive.minRides) || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (response.ok) {
        setIncentiveDialogOpen(false);
        setNewIncentive({
          name: '',
          description: '',
          type: 'ZONE_SPECIFIC',
          rewardAmount: '',
          zoneId: '',
          minRides: '5',
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating incentive:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OVERSUPPLIED': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'BALANCED': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'HIGH_DEMAND': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'SURGE': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'CRITICAL': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getRatioColor = (ratio: number) => {
    if (ratio < 0.8) return 'text-blue-600';
    if (ratio < 1.3) return 'text-emerald-600';
    if (ratio < 1.8) return 'text-amber-600';
    if (ratio < 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBalanceBarColor = (ratio: number) => {
    if (ratio < 0.8) return 'bg-blue-500';
    if (ratio < 1.3) return 'bg-emerald-500';
    if (ratio < 1.8) return 'bg-amber-500';
    if (ratio < 2.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!canViewMarketplace) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-gray-500 mt-2">You don't have permission to view marketplace balance data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#7CDA28] mx-auto mb-4" />
          <p className="text-gray-500">Loading marketplace data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Marketplace Balance</h1>
          <p className="text-gray-500 mt-1">Real-time demand-supply equilibrium monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-[#7CDA28]/10 text-[#7CDA28] border-[#7CDA28]/30">
            <Activity className="h-3 w-3 mr-1" />
            Live
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canEditMarketplace && (
            <Button onClick={() => setIncentiveDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Incentive
            </Button>
          )}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Overall Ratio */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Demand-Supply Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="text-4xl font-bold text-gray-900">
                {overview?.overallRatio.toFixed(2) || '0.00'}
              </div>
              <Badge className={getStatusColor(overview?.overallStatus || 'BALANCED')}>
                {overview?.overallStatusLabel || 'Balanced'}
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Oversupplied</span>
                <span>Balanced</span>
                <span>High Demand</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getBalanceBarColor(overview?.overallRatio || 1)}`}
                  style={{ width: `${Math.min(100, ((overview?.overallRatio || 1) / 3) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ride Requests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ride Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {overview?.totalRideRequests.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-[#7CDA28]">
              <Users className="h-4 w-4" />
              <span>Active demand</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Drivers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Available Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {overview?.totalAvailableDrivers.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-blue-600">
              <Car className="h-4 w-4" />
              <span>of {overview?.totalActiveDrivers || 0} active</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Surges */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Surges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {overview?.activeSurges || 0}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-orange-600">
              <Zap className="h-4 w-4" />
              <span>Surge zones</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{overview?.oversuppliedZones || 0}</div>
            <div className="text-xs text-blue-600">Oversupplied</div>
          </CardContent>
        </Card>
        <Card className="bg-[#7CDA28]/10 border-[#7CDA28]/30">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-[#7CDA28]">{overview?.balancedZones || 0}</div>
            <div className="text-xs text-[#7CDA28]">Balanced</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-amber-700">{overview?.highDemandZones || 0}</div>
            <div className="text-xs text-amber-600">High Demand</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{overview?.surgeZones || 0}</div>
            <div className="text-xs text-orange-600">Surge</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-700">{overview?.criticalZones || 0}</div>
            <div className="text-xs text-red-600">Critical</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Zone Overview</TabsTrigger>
          <TabsTrigger value="critical">Critical Zones</TabsTrigger>
          <TabsTrigger value="incentives">Active Incentives</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-1" />
            Broadcasts
          </TabsTrigger>
        </TabsList>

        {/* Zone Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Zones Status</CardTitle>
              <CardDescription>Real-time balance status across all service zones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Ride Requests</TableHead>
                      <TableHead className="text-center">Available Drivers</TableHead>
                      <TableHead className="text-center">Ratio</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Surge</TableHead>
                      {canEditMarketplace && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview?.zones.map((zone) => (
                      <TableRow key={zone.id} className={zone.status === 'CRITICAL' ? 'bg-red-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{zone.name}</div>
                              <div className="text-xs text-gray-500">{zone.code}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {zone.zoneType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {zone.rideRequests}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Car className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{zone.availableDrivers}</span>
                            <span className="text-xs text-gray-400">/ {zone.activeDrivers}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${getRatioColor(zone.ratio)}`}>
                            {zone.ratio.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(zone.status)}>
                            {zone.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {zone.surgeActive ? (
                            <div className="flex items-center gap-1">
                              <Zap className="h-4 w-4 text-orange-500" />
                              <span className="font-bold text-orange-600">{zone.surgeMultiplier}x</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">None</span>
                          )}
                        </TableCell>
                        {canEditMarketplace && (
                          <TableCell className="text-right">
                            {!zone.surgeActive && zone.status !== 'OVERSUPPLIED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedZone(zone);
                                  setSurgeDialogOpen(true);
                                }}
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Surge
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Critical Zones Tab */}
        <TabsContent value="critical" className="mt-4">
          <div className="grid gap-4">
            {overview?.zones.filter(z => z.status === 'CRITICAL' || z.status === 'SURGE' || z.status === 'HIGH_DEMAND').length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">All Zones Balanced</h3>
                  <p className="text-gray-500 mt-2">No critical zones detected at this time.</p>
                </CardContent>
              </Card>
            ) : (
              overview?.zones
                .filter(z => z.status === 'CRITICAL' || z.status === 'SURGE' || z.status === 'HIGH_DEMAND')
                .sort((a, b) => b.ratio - a.ratio)
                .map((zone) => (
                  <Card key={zone.id} className={`border-l-4 ${
                    zone.status === 'CRITICAL' ? 'border-l-red-500 bg-red-50' :
                    zone.status === 'SURGE' ? 'border-l-orange-500 bg-orange-50' :
                    'border-l-amber-500 bg-amber-50'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Flame className={`h-5 w-5 ${
                              zone.status === 'CRITICAL' ? 'text-red-500' :
                              zone.status === 'SURGE' ? 'text-orange-500' : 'text-amber-500'
                            }`} />
                            <h3 className="font-bold text-lg">{zone.name}</h3>
                            <Badge className={getStatusColor(zone.status)}>
                              {zone.status}
                            </Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-2xl font-bold text-gray-900">{zone.rideRequests}</div>
                              <div className="text-xs text-gray-500">Ride Requests</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-gray-900">{zone.availableDrivers}</div>
                              <div className="text-xs text-gray-500">Available Drivers</div>
                            </div>
                            <div>
                              <div className={`text-2xl font-bold ${getRatioColor(zone.ratio)}`}>
                                {zone.ratio.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">D/S Ratio</div>
                            </div>
                          </div>
                        </div>
                        {canEditMarketplace && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedZone(zone);
                                setIncentiveDialogOpen(true);
                              }}
                            >
                              <Target className="h-4 w-4 mr-1" />
                              Add Incentive
                            </Button>
                            {!zone.surgeActive && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedZone(zone);
                                  setSurgeDialogOpen(true);
                                }}
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Start Surge
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        {/* Active Incentives Tab */}
        <TabsContent value="incentives" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Incentives</CardTitle>
                  <CardDescription>Driver incentives currently running</CardDescription>
                </div>
                {canEditMarketplace && (
                  <Button size="sm" onClick={() => setIncentiveDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Incentive
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {incentives.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No active incentives</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incentives.map((incentive) => (
                    <div key={incentive.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#7CDA28]/20 rounded-full flex items-center justify-center">
                          <Target className="h-5 w-5 text-[#7CDA28]" />
                        </div>
                        <div>
                          <div className="font-medium">{incentive.name}</div>
                          <div className="text-sm text-gray-500">
                            {incentive.zoneName || 'All Zones'} • {incentive.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#7CDA28]">
                          {formatCurrency(incentive.rewardAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Ends {new Date(incentive.endTime).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications/Broadcast Tab */}
        <TabsContent value="notifications" className="mt-4">
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Send className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">--</div>
                      <div className="text-xs text-gray-500">Total Sent</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">--</div>
                      <div className="text-xs text-gray-500">Delivered</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Bell className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">--</div>
                      <div className="text-xs text-gray-500">Read</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Users className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">--</div>
                      <div className="text-xs text-gray-500">Recipients</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notification Sender */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Send Broadcast</CardTitle>
                    <CardDescription>
                      Send notifications to drivers or clients about incentives, surge pricing, and opportunities
                    </CardDescription>
                  </div>
                  <NotificationSender 
                    zones={overview?.zones || []} 
                    onSend={() => fetchData(true)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Broadcast Notifications</p>
                  <p className="text-sm mt-1">
                    Send surge alerts, incentive notifications, and demand alerts to drivers and clients
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <Badge variant="outline" className="bg-orange-50">
                      <Zap className="h-3 w-3 mr-1" /> Surge Alerts
                    </Badge>
                    <Badge variant="outline" className="bg-green-50">
                      <Gift className="h-3 w-3 mr-1" /> Incentives
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50">
                      <MapPin className="h-3 w-3 mr-1" /> High Demand
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50">
                      <DollarSign className="h-3 w-3 mr-1" /> Earnings
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How Notifications Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Car className="h-4 w-4 text-blue-500" />
                      Driver Notifications
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-orange-500 mt-0.5" />
                        <span><strong>Surge Alerts:</strong> Notify all online riders when surge pricing activates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Gift className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Incentives:</strong> Auto-sent when new incentives are created</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                        <span><strong>High Demand:</strong> Alert drivers to areas needing more coverage</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500 mt-0.5" />
                        <span><strong>Earnings:</strong> Highlight earning opportunities in specific zones</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      Client Notifications
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span><strong>Surge Warnings:</strong> Alert clients about higher prices before booking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-pink-500 mt-0.5" />
                        <span><strong>Promotions:</strong> Notify about discounts and special offers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span><strong>Zone-specific:</strong> Target notifications to clients in specific areas</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Surge Dialog */}
      <Dialog open={surgeDialogOpen} onOpenChange={setSurgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Surge Pricing</DialogTitle>
            <DialogDescription>
              Start surge pricing for {selectedZone?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="surgeMultiplier">Surge Multiplier</Label>
              <Select value={surgeMultiplier} onValueChange={setSurgeMultiplier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.2">1.2x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2.0">2.0x</SelectItem>
                  <SelectItem value="2.5">2.5x</SelectItem>
                  <SelectItem value="3.0">3.0x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="surgeReason">Reason (Optional)</Label>
              <Input
                id="surgeReason"
                value={surgeReason}
                onChange={(e) => setSurgeReason(e.target.value)}
                placeholder="e.g., Heavy rain, Concert event"
              />
            </div>
            {selectedZone && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div>Current ratio: <span className={`font-medium ${getRatioColor(selectedZone.ratio)}`}>{selectedZone.ratio.toFixed(2)}</span></div>
                  <div>Ride requests: <span className="font-medium">{selectedZone.rideRequests}</span></div>
                  <div>Available drivers: <span className="font-medium">{selectedZone.availableDrivers}</span></div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSurgeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartSurge} disabled={submitting}>
              {submitting ? 'Activating...' : 'Activate Surge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incentive Dialog */}
      <Dialog open={incentiveDialogOpen} onOpenChange={setIncentiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Driver Incentive</DialogTitle>
            <DialogDescription>
              Create an incentive to attract drivers to high-demand zones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="incentiveName">Incentive Name</Label>
              <Input
                id="incentiveName"
                value={newIncentive.name}
                onChange={(e) => setNewIncentive({ ...newIncentive, name: e.target.value })}
                placeholder="e.g., Peak Hour Bonus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incentiveDesc">Description</Label>
              <Input
                id="incentiveDesc"
                value={newIncentive.description}
                onChange={(e) => setNewIncentive({ ...newIncentive, description: e.target.value })}
                placeholder="e.g., Complete 5 rides and earn bonus"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="incentiveType">Type</Label>
                <Select value={newIncentive.type} onValueChange={(v) => setNewIncentive({ ...newIncentive, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEAK_HOUR_BONUS">Peak Hour Bonus</SelectItem>
                    <SelectItem value="ZONE_SPECIFIC">Zone Specific</SelectItem>
                    <SelectItem value="RIDE_STREAK">Ride Streak</SelectItem>
                    <SelectItem value="COMPLETION_BONUS">Completion Bonus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rewardAmount">Reward (UGX)</Label>
                <Input
                  id="rewardAmount"
                  type="number"
                  value={newIncentive.rewardAmount}
                  onChange={(e) => setNewIncentive({ ...newIncentive, rewardAmount: e.target.value })}
                  placeholder="15000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minRides">Min Rides</Label>
                <Input
                  id="minRides"
                  type="number"
                  value={newIncentive.minRides}
                  onChange={(e) => setNewIncentive({ ...newIncentive, minRides: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zoneId">Zone (Optional)</Label>
                <Select value={newIncentive.zoneId || "ALL_ZONES"} onValueChange={(v) => setNewIncentive({ ...newIncentive, zoneId: v === "ALL_ZONES" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Zones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_ZONES">All Zones</SelectItem>
                    {overview?.zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncentiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIncentive} disabled={submitting || !newIncentive.name || !newIncentive.rewardAmount}>
              {submitting ? 'Creating...' : 'Create Incentive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

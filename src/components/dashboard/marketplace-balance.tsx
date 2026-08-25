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
import dynamic from 'next/dynamic';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { canView, canEdit } from '@/lib/permissions';
import type { MapMarker, MapMarkerType } from '@/components/maps/openstreet-map';
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
  Gift,
  Search,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';

/**
 * Leaflet touches `window` on import, so the zone map is loaded client-side
 * only. Same pattern the connection-monitoring dashboard uses.
 */
const ZoneMap = dynamic(
  () => import('@/components/maps/openstreet-map').then((mod) => mod.OpenStreetMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-muted/40">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

/** Zone balance status -> map pin colour, and the legend that explains them. */
const ZONE_MARKER_TYPE: Record<string, MapMarkerType> = {
  OVERSUPPLIED: 'zoneOversupplied',
  BALANCED: 'zoneBalanced',
  HIGH_DEMAND: 'zoneHighDemand',
  SURGE: 'zoneSurge',
  CRITICAL: 'zoneCritical',
};

const ZONE_LEGEND: { status: string; label: string; dot: string }[] = [
  { status: 'HIGH_DEMAND', label: 'High Demand', dot: 'bg-amber-500' },
  { status: 'BALANCED', label: 'Balanced', dot: 'bg-emerald-500' },
  { status: 'OVERSUPPLIED', label: 'Oversupplied', dot: 'bg-blue-500' },
  { status: 'SURGE', label: 'Surge Zone', dot: 'bg-orange-500' },
  { status: 'CRITICAL', label: 'Critical', dot: 'bg-red-500' },
];

/**
 * Admin requests carry the admin token.
 *
 * These calls used to go out bare. That worked only because the routes behind
 * them had no authentication — reading them proved nothing about being an
 * admin, because anyone could read them. Now that they are guarded, the token
 * is what makes this dashboard work rather than what makes it safe.
 */
function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || localStorage.getItem('admin_token')
      : null;
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}


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
  /** Overall demand-supply ratio per hourly bucket, oldest first. May be empty
   *  when the metrics collector has not run — the sparkline hides rather than
   *  drawing an invented flat line. */
  ratioTrend: { t: string; ratio: number }[];
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
  // Admin role isn't provided via a React context anywhere in the app — every
  // other dashboard view reads it straight out of localStorage after login,
  // so match that pattern here instead of the unwired useAuth()/AuthProvider.
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<MarketplaceOverview | null>(null);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [surgeDialogOpen, setSurgeDialogOpen] = useState(false);
  const [incentiveDialogOpen, setIncentiveDialogOpen] = useState(false);
  const [updatingIncentiveId, setUpdatingIncentiveId] = useState<string | null>(null);
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

  // Zone table filters. Each one is driven by a control on screen: the search
  // box, the type select, and the five distribution tiles above the tabs.
  const [zoneSearch, setZoneSearch] = useState('');
  const [zoneTypeFilter, setZoneTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      setAdminRole(stored ? JSON.parse(stored)?.role ?? null : null);
    } catch {
      setAdminRole(null);
    }
  }, []);

  const canEditMarketplace = adminRole && canEdit(adminRole, 'pricing' as any);
  const canViewMarketplace = adminRole && canView(adminRole, 'pricing' as any);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const [overviewRes, incentivesRes] = await Promise.all([
        fetch('/api/marketplace/overview', { headers: adminHeaders() }),
        fetch('/api/marketplace/incentives?status=ACTIVE', { headers: adminHeaders() }),
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
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
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

  /**
   * INC-2: stop or resume a live campaign.
   *
   * A campaign could be created and then never stopped — it ran to its end time
   * paying real money whatever happened. The backend already accepted this:
   * PATCH /api/marketplace/incentives takes { incentiveId, status } and has
   * done all along. Only the control was missing, so this calls the existing
   * contract rather than adding a second one.
   *
   * Drivers already enrolled are left to the existing participation rules; this
   * changes the campaign's own state, nothing else.
   */
  const handleSetIncentiveStatus = async (
    incentive: Incentive,
    status: 'ACTIVE' | 'PAUSED' | 'ENDED',
  ) => {
    if (status === 'ENDED' && !confirm(`End "${incentive.name}"? This cannot be undone.`)) {
      return;
    }

    setUpdatingIncentiveId(incentive.id);
    try {
      const response = await fetch('/api/marketplace/incentives', {
        method: 'PATCH',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ incentiveId: incentive.id, status }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        alert(body?.error || `Could not update the campaign (${response.status})`);
        return;
      }

      // Re-read rather than patching local state: the server decides what the
      // campaign now is, and an optimistic row that disagrees with it is how a
      // paused campaign keeps looking active.
      await fetchData();
    } catch {
      alert('Could not reach the server. The campaign was not changed.');
    } finally {
      setUpdatingIncentiveId(null);
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
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
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

  // Zone types actually present in the data, so the select can never offer a
  // filter that matches nothing.
  const zoneTypes = Array.from(
    new Set((overview?.zones ?? []).map((z) => z.zoneType))
  ).sort();

  const filteredZones = (overview?.zones ?? []).filter((zone) => {
    if (statusFilter && zone.status !== statusFilter) return false;
    if (zoneTypeFilter !== 'ALL' && zone.zoneType !== zoneTypeFilter) return false;
    const q = zoneSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      zone.name.toLowerCase().includes(q) || zone.code.toLowerCase().includes(q)
    );
  });

  const filtersActive =
    !!statusFilter || zoneTypeFilter !== 'ALL' || zoneSearch.trim().length > 0;

  const clearZoneFilters = () => {
    setStatusFilter(null);
    setZoneTypeFilter('ALL');
    setZoneSearch('');
  };

  /** Distribution tiles double as status filters for the table below. */
  const toggleStatusFilter = (status: string) => {
    setStatusFilter((current) => (current === status ? null : status));
    setActiveTab('overview');
  };

  // Only zones with real coordinates get a pin. A zone missing its centre is
  // left off the map rather than dropped at 0,0 in the Gulf of Guinea.
  const zoneMarkers: MapMarker[] = filteredZones
    .filter((z) => typeof z.centerLatitude === 'number' && typeof z.centerLongitude === 'number')
    .map((z) => ({
      id: z.id,
      coordinates: { latitude: z.centerLatitude, longitude: z.centerLongitude },
      type: ZONE_MARKER_TYPE[z.status] ?? 'zoneBalanced',
      label: `${z.name} — ratio ${z.ratio.toFixed(2)}`,
    }));

  const mapCenter = zoneMarkers.length
    ? zoneMarkers[0].coordinates
    : { latitude: 0.3476, longitude: 32.5825 };

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
            <p className="text-muted-foreground mt-2">You don't have permission to view marketplace balance data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#00D97E] mx-auto mb-4" />
          <p className="text-muted-foreground">Loading marketplace data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#00D97E]/10">
            <ShoppingCart className="h-7 w-7 text-[#00D97E]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Marketplace Balance</h1>
            <p className="text-muted-foreground mt-1">Real-time demand-supply equilibrium monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-[#00D97E]/10 text-[#00D97E] border-[#00D97E]/30">
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
            <Button
              onClick={() => {
                // Starts a fresh campaign: clear any zone carried over from a
                // previous critical-zone click so "All Zones" really means it.
                setNewIncentive((prev) => ({ ...prev, zoneId: '' }));
                setIncentiveDialogOpen(true);
              }}
            >
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Demand-Supply Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="text-4xl font-bold text-foreground">
                  {overview?.overallRatio.toFixed(2) || '0.00'}
                </div>
                <Badge className={getStatusColor(overview?.overallStatus || 'BALANCED')}>
                  {overview?.overallStatusLabel || 'Balanced'}
                </Badge>
              </div>

              {/* Ratio over the last 24 hourly buckets, from ZoneMetric. Hidden
                  when there is no history rather than drawn as a flat line. */}
              {overview?.ratioTrend && overview.ratioTrend.length > 1 && (
                <div className="h-14 w-32 sm:w-44" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.ratioTrend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="ratioTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00D97E" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#00D97E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        labelFormatter={(v) => new Date(v as string).toLocaleString()}
                        formatter={(v) => [Number(v).toFixed(2), 'Ratio']}
                      />
                      <Area
                        type="monotone"
                        dataKey="ratio"
                        stroke="#00D97E"
                        strokeWidth={2}
                        fill="url(#ratioTrendFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Oversupplied</span>
                <span>Balanced</span>
                <span>High Demand</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Ride Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {overview?.totalRideRequests.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-[#00D97E]">
              <Users className="h-4 w-4" />
              <span>Active demand</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Drivers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Surges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {overview?.activeSurges || 0}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-orange-600">
              <Zap className="h-4 w-4" />
              <span>Surge zones</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Distribution — each tile filters the zone table below it.
          The reference draws an arrow on these; an arrow that goes nowhere is
          worse than no arrow, so the tiles are real buttons: click to filter,
          click the active one again to clear. */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          { status: 'OVERSUPPLIED', label: 'Oversupplied', count: overview?.oversuppliedZones || 0, icon: Users, card: 'bg-blue-50 border-blue-100 hover:border-blue-300', num: 'text-blue-700', text: 'text-blue-600', ring: 'ring-blue-500' },
          { status: 'BALANCED', label: 'Balanced', count: overview?.balancedZones || 0, icon: CheckCircle, card: 'bg-[#00D97E]/10 border-[#00D97E]/30 hover:border-[#00D97E]/60', num: 'text-[#00D97E]', text: 'text-[#00D97E]', ring: 'ring-[#00D97E]' },
          { status: 'HIGH_DEMAND', label: 'High Demand', count: overview?.highDemandZones || 0, icon: Flame, card: 'bg-amber-50 border-amber-100 hover:border-amber-300', num: 'text-amber-700', text: 'text-amber-600', ring: 'ring-amber-500' },
          { status: 'SURGE', label: 'Surge', count: overview?.surgeZones || 0, icon: Zap, card: 'bg-orange-50 border-orange-100 hover:border-orange-300', num: 'text-orange-700', text: 'text-orange-600', ring: 'ring-orange-500' },
          { status: 'CRITICAL', label: 'Critical', count: overview?.criticalZones || 0, icon: AlertTriangle, card: 'bg-red-50 border-red-100 hover:border-red-300', num: 'text-red-700', text: 'text-red-600', ring: 'ring-red-500' },
        ] as const).map((tile) => {
          const Icon = tile.icon;
          const active = statusFilter === tile.status;
          return (
            <button
              key={tile.status}
              type="button"
              onClick={() => toggleStatusFilter(tile.status)}
              aria-pressed={active}
              aria-label={`${tile.count} ${tile.label} zones. ${active ? 'Clear this filter' : 'Filter the zone table to these'}`}
              className={`rounded-xl border text-left transition-all ${tile.card} ${active ? `ring-2 ring-offset-1 ${tile.ring}` : ''}`}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/60">
                  <Icon className={`h-4 w-4 ${tile.text}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-2xl font-bold leading-none ${tile.num}`}>{tile.count}</span>
                  <span className={`block text-xs mt-1 leading-tight ${tile.text}`}>{tile.label}</span>
                </span>
                <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${tile.text} ${active ? 'opacity-100' : 'opacity-40'}`} />
              </div>
            </button>
          );
        })}
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
          <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle>All Zones Status</CardTitle>
                  <CardDescription>Real-time balance status across all service zones</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={zoneSearch}
                      onChange={(e) => setZoneSearch(e.target.value)}
                      placeholder="Search zones..."
                      aria-label="Search zones by name or code"
                      className="h-9 w-40 pl-8 sm:w-48"
                    />
                  </div>
                  <Select value={zoneTypeFilter} onValueChange={setZoneTypeFilter}>
                    <SelectTrigger className="h-9 w-32" aria-label="Filter by zone type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      {zoneTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filtersActive && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Showing {filteredZones.length} of {overview?.zones.length ?? 0} zones
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clearZoneFilters}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear filters
                  </Button>
                </div>
              )}
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
                    {filteredZones.map((zone) => (
                      <TableRow key={zone.id} className={zone.status === 'CRITICAL' ? 'bg-red-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{zone.name}</div>
                              <div className="text-xs text-muted-foreground">{zone.code}</div>
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
                            <span className="text-xs text-muted-foreground">/ {zone.activeDrivers}</span>
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
                            <span className="text-muted-foreground text-sm">None</span>
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

                {/* Two different empty states: nothing collected yet, versus a
                    filter that excluded everything. The second one has to offer
                    a way back or it is a dead end. */}
                {filteredZones.length === 0 && (
                  <div className="py-12 text-center">
                    <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    {overview?.zones.length ? (
                      <>
                        <p className="mt-3 font-medium text-foreground">No zones match these filters</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={clearZoneFilters}>
                          Clear filters
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="mt-3 font-medium text-foreground">No zone data available</p>
                        <p className="mt-1 text-sm text-muted-foreground">Zone data will appear here in real-time</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live Zone Map — the same filtered zones, placed by their real
              recorded centre coordinates. */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-[#00D97E]" />
                  Live Zone Map
                </CardTitle>
                <Badge variant="outline" className="bg-[#00D97E]/10 text-[#00D97E] border-[#00D97E]/30">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                {ZONE_LEGEND.map((l) => (
                  <span key={l.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${l.dot}`} />
                    {l.label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full overflow-hidden rounded-lg border border-border lg:h-[420px]">
                {zoneMarkers.length > 0 ? (
                  <ZoneMap
                    className="h-full w-full"
                    center={mapCenter}
                    zoom={11}
                    markers={zoneMarkers}
                    onMarkerClick={(marker) => {
                      // Selecting a pin narrows the table to that zone, so the
                      // map and the list stay one view of the same thing.
                      const zone = overview?.zones.find((z) => z.id === marker.id);
                      if (zone) {
                        setStatusFilter(null);
                        setZoneTypeFilter('ALL');
                        setZoneSearch(zone.name);
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <MapPin className="h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 font-medium text-foreground">
                      {overview?.zones.length ? 'No zones match these filters' : 'No mapped zones yet'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {overview?.zones.length
                        ? 'Adjust the filters to see zones on the map.'
                        : 'Zones appear here once they have recorded centre coordinates.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <Car className="h-4 w-4 text-blue-500" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {overview?.totalAvailableDrivers ?? 0}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">Drivers online</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <Users className="h-4 w-4 text-[#00D97E]" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {overview?.totalRideRequests ?? 0}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">Ride requests</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* Critical Zones Tab */}
        <TabsContent value="critical" className="mt-4">
          <div className="grid gap-4">
            {overview?.zones.filter(z => z.status === 'CRITICAL' || z.status === 'SURGE' || z.status === 'HIGH_DEMAND').length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">All Zones Balanced</h3>
                  <p className="text-muted-foreground mt-2">No critical zones detected at this time.</p>
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
                                // Carry the zone into the form, not just into
                                // `selectedZone` — the incentive dialog reads
                                // newIncentive.zoneId, so setting only the
                                // former dropped the admin's choice and created
                                // an all-zones campaign instead.
                                setSelectedZone(zone);
                                setNewIncentive((prev) => ({ ...prev, zoneId: zone.id }));
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
                  <Button
                    size="sm"
                    onClick={() => {
                      setNewIncentive((prev) => ({ ...prev, zoneId: '' }));
                      setIncentiveDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Incentive
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {incentives.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground">No active incentives</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incentives.map((incentive) => (
                    <div key={incentive.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#00D97E]/20 rounded-full flex items-center justify-center">
                          <Target className="h-5 w-5 text-[#00D97E]" />
                        </div>
                        <div>
                          <div className="font-medium">{incentive.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {incentive.zoneName || 'All Zones'} • {incentive.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-[#00D97E]">
                            {formatCurrency(incentive.rewardAmount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {incentive.status === 'PAUSED'
                              ? 'Paused'
                              : `Ends ${new Date(incentive.endTime).toLocaleTimeString()}`}
                          </div>
                        </div>

                        {/* INC-2: a live campaign could be created but never stopped.
                            PATCH /api/marketplace/incentives already accepted
                            { incentiveId, status } — there was simply no control
                            wired to it, so a campaign paying real money ran until
                            its end time no matter what. */}
                        {canEditMarketplace && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={updatingIncentiveId === incentive.id}
                              onClick={() =>
                                handleSetIncentiveStatus(
                                  incentive,
                                  incentive.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED',
                                )
                              }
                            >
                              {incentive.status === 'PAUSED' ? 'Resume' : 'Pause'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={updatingIncentiveId === incentive.id}
                              onClick={() => handleSetIncentiveStatus(incentive, 'ENDED')}
                            >
                              End
                            </Button>
                          </div>
                        )}
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
                      <div className="text-xs text-muted-foreground">Total Sent</div>
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
                      <div className="text-xs text-muted-foreground">Delivered</div>
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
                      <div className="text-xs text-muted-foreground">Read</div>
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
                      <div className="text-xs text-muted-foreground">Recipients</div>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
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
              <div className="bg-muted/40 p-3 rounded-lg">
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

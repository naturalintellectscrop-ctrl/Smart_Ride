'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { 
  Search, 
  Filter, 
  Star, 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Award,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// Types
interface Rider {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  riderRole: string;
  status: string;
  isOnline: boolean;
  rating: number;
  totalTrips: number;
  completedTrips: number;
}

interface DriverReputation {
  id: string;
  riderId: string;
  trustScore: number;
  trustTier: string;
  averageRating: number;
  totalRatings: number;
  completionRate: number;
  acceptanceRate: number;
  safetyScore: number;
  fraudRiskScore: number;
  isSuspended: boolean;
  currentStreak: number;
  totalTasksCompleted: number;
  totalTasksCancelled: number;
  rider: Rider;
}

interface ReputationStats {
  averageTrustScore: number;
  averageRating: number;
  averageCompletionRate: number;
  averageAcceptanceRate: number;
  averageSafetyScore: number;
  totalDrivers: number;
  tierDistribution: {
    PLATINUM: number;
    GOLD: number;
    SILVER: number;
    WARNING: number;
    SUSPENDED: number;
  };
}

const TIER_COLORS: Record<string, string> = {
  PLATINUM: '#E5E4E2',
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  WARNING: '#FFA500',
  SUSPENDED: '#FF4444',
};

const TIER_BG_COLORS: Record<string, string> = {
  PLATINUM: 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800',
  GOLD: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900',
  SILVER: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800',
  WARNING: 'bg-gradient-to-r from-orange-400 to-orange-500 text-white',
  SUSPENDED: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
};

export function DriverReputationDashboard() {
  const [reputations, setReputations] = useState<DriverReputation[]>([]);
  const [stats, setStats] = useState<ReputationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [suspendedFilter, setSuspendedFilter] = useState<string>('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Selected driver detail
  const [selectedDriver, setSelectedDriver] = useState<DriverReputation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const fetchReputations = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (tierFilter && tierFilter !== 'all') params.set('tier', tierFilter);
      if (suspendedFilter === 'true') params.set('isSuspended', 'true');
      else if (suspendedFilter === 'false') params.set('isSuspended', 'false');
      if (search) params.set('search', search);

      const response = await fetch(`/api/driver-reputation?${params}`);
      const data = await response.json();

      if (data.success) {
        setReputations(data.data);
        setStats(data.stats);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching reputations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReputations();
  }, [page, tierFilter, suspendedFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (page === 1) fetchReputations();
      else setPage(1);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleAdjustment = async () => {
    if (!selectedDriver || !adjustmentReason) return;

    try {
      const response = await fetch(`/api/driver-reputation/${selectedDriver.riderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment: adjustmentAmount,
          reason: adjustmentReason,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchReputations(true);
        setAdjustmentOpen(false);
        setAdjustmentAmount(0);
        setAdjustmentReason('');
      }
    } catch (error) {
      console.error('Error adjusting score:', error);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return <Award className="h-4 w-4" />;
      case 'GOLD': return <Star className="h-4 w-4" />;
      case 'SILVER': return <Shield className="h-4 w-4" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4" />;
      case 'SUSPENDED': return <Ban className="h-4 w-4" />;
      default: return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  // Chart data
  const tierChartData = stats ? [
    { name: 'Platinum', value: stats.tierDistribution.PLATINUM, color: TIER_COLORS.PLATINUM },
    { name: 'Gold', value: stats.tierDistribution.GOLD, color: TIER_COLORS.GOLD },
    { name: 'Silver', value: stats.tierDistribution.SILVER, color: TIER_COLORS.SILVER },
    { name: 'Warning', value: stats.tierDistribution.WARNING, color: TIER_COLORS.WARNING },
    { name: 'Suspended', value: stats.tierDistribution.SUSPENDED, color: TIER_COLORS.SUSPENDED },
  ] : [];

  const metricsChartData = stats ? [
    { name: 'Trust Score', value: stats.averageTrustScore },
    { name: 'Rating', value: stats.averageRating * 20 },
    { name: 'Completion', value: stats.averageCompletionRate * 100 },
    { name: 'Acceptance', value: stats.averageAcceptanceRate * 100 },
    { name: 'Safety', value: stats.averageSafetyScore },
  ] : [];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Driver Reputation & Trust System
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor driver trust scores, performance metrics, and safety compliance
          </p>
        </div>
        <Button 
          onClick={() => fetchReputations(true)}
          disabled={refreshing}
          className="bg-[#7CDA28] hover:bg-[#6BC41E] text-black"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Drivers
              </div>
              <div className="text-2xl font-bold mt-1">
                {stats.totalDrivers}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Avg Trust Score
              </div>
              <div className={`text-2xl font-bold mt-1 ${getScoreColor(stats.averageTrustScore)}`}>
                {stats.averageTrustScore.toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Avg Rating
              </div>
              <div className="text-2xl font-bold mt-1 flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                {stats.averageRating.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Completion Rate
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">
                {(stats.averageCompletionRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Acceptance Rate
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-600">
                {(stats.averageAcceptanceRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Avg Safety Score
              </div>
              <div className="text-2xl font-bold mt-1 text-purple-600">
                {stats.averageSafetyScore.toFixed(1)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Trust Tier Distribution</CardTitle>
              <CardDescription>Drivers by trust tier status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {tierChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Average Metrics</CardTitle>
              <CardDescription>Platform-wide driver performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricsChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7CDA28" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Trust Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="PLATINUM">Platinum</SelectItem>
                <SelectItem value="GOLD">Gold</SelectItem>
                <SelectItem value="SILVER">Silver</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={suspendedFilter} onValueChange={setSuspendedFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="false">Active</SelectItem>
                <SelectItem value="true">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Reputation List</CardTitle>
          <CardDescription>
            {total} drivers found • Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#7CDA28]" />
            </div>
          ) : reputations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No drivers found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Trust Score</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Acceptance</TableHead>
                    <TableHead>Safety</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reputations.map((rep) => (
                    <TableRow key={rep.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell>
                        <div>
                          <div className="font-medium">{rep.rider.fullName}</div>
                          <div className="text-sm text-gray-500">{rep.rider.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(rep.trustScore)}`}>
                            {rep.trustScore.toFixed(1)}
                          </span>
                          <Progress value={rep.trustScore} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${TIER_BG_COLORS[rep.trustTier]} flex items-center gap-1 w-fit`}>
                          {getTierIcon(rep.trustTier)}
                          {rep.trustTier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{rep.averageRating.toFixed(2)}</span>
                          <span className="text-xs text-gray-500">({rep.totalRatings})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={rep.completionRate >= 0.9 ? 'text-green-600' : rep.completionRate >= 0.8 ? 'text-yellow-600' : 'text-red-600'}>
                          {(rep.completionRate * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={rep.acceptanceRate >= 0.8 ? 'text-green-600' : rep.acceptanceRate >= 0.6 ? 'text-yellow-600' : 'text-red-600'}>
                          {(rep.acceptanceRate * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={rep.safetyScore >= 90 ? 'text-green-600' : rep.safetyScore >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {rep.safetyScore.toFixed(0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {rep.isSuspended ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <Ban className="h-3 w-3" />
                            Suspended
                          </Badge>
                        ) : rep.rider.isOnline ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            Offline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDriver(rep);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} drivers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Driver Reputation Details</DialogTitle>
            <DialogDescription>
              Comprehensive view of driver performance and trust metrics
            </DialogDescription>
          </DialogHeader>
          
          {selectedDriver && (
            <div className="space-y-6">
              {/* Driver Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#7CDA28]/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#7CDA28]">
                    {selectedDriver.rider.fullName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedDriver.rider.fullName}</h3>
                  <p className="text-gray-500">{selectedDriver.rider.phone}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={TIER_BG_COLORS[selectedDriver.trustTier]}>
                      {getTierIcon(selectedDriver.trustTier)}
                      {selectedDriver.trustTier}
                    </Badge>
                    <Badge variant="outline">
                      {selectedDriver.rider.riderRole.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getScoreColor(selectedDriver.trustScore)}`}>
                    {selectedDriver.trustScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">Trust Score</div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-2xl font-bold">{selectedDriver.averageRating.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {selectedDriver.totalRatings} ratings
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(selectedDriver.completionRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Completion Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(selectedDriver.acceptanceRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Acceptance Rate</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedDriver.safetyScore.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Safety Score</div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Metrics */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Performance Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Tasks Completed:</span>
                      <span className="font-medium">{selectedDriver.totalTasksCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Tasks Cancelled:</span>
                      <span className="font-medium">{selectedDriver.totalTasksCancelled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Current Streak:</span>
                      <span className="font-medium">{selectedDriver.currentStreak} rides</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fraud Risk Score:</span>
                      <span className={`font-medium ${selectedDriver.fraudRiskScore >= 80 ? 'text-green-600' : selectedDriver.fraudRiskScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {selectedDriver.fraudRiskScore.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Benefits & Status</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Bonus Eligible:</span>
                      {selectedDriver.bonusEligible ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Priority Dispatch:</span>
                      {selectedDriver.priorityDispatch ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Premium Access:</span>
                      {selectedDriver.premiumAccess ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Bonus Earned:</span>
                      <span className="font-medium text-[#7CDA28]">
                        Ugx {selectedDriver.totalBonusEarned?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailOpen(false);
                    setAdjustmentOpen(true);
                  }}
                >
                  Adjust Score
                </Button>
                <Button
                  variant="destructive"
                  disabled={selectedDriver.isSuspended}
                >
                  Suspend Driver
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Score Adjustment Dialog */}
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Trust Score</DialogTitle>
            <DialogDescription>
              Manually adjust the driver's trust score. Use positive values to increase, negative to decrease.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Adjustment Amount</label>
              <Input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                placeholder="Enter amount (e.g., 5 or -5)"
              />
              <p className="text-xs text-gray-500">
                New score will be: {selectedDriver ? (selectedDriver.trustScore + adjustmentAmount).toFixed(1) : 0}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Input
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Enter reason for adjustment"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdjustment}
              className="bg-[#7CDA28] hover:bg-[#6BC41E] text-black"
              disabled={!adjustmentReason}
            >
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

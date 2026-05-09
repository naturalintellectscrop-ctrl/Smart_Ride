'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Bike, 
  Store, 
  ShoppingCart, 
  DollarSign,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  totalRiders: number;
  activeRiders: number;
  totalMerchants: number;
  activeMerchants: number;
  todayTasks: number;
  todayOrders: number;
  todayRevenue: number;
  pendingApprovals: number;
  activeTasks: number;
}

interface PendingBreakdown {
  riders: number;
  merchants: number;
  healthProviders: number;
}

interface ServiceStats {
  name: string;
  orders: number;
  revenue: number;
}

interface RecentActivity {
  id: string;
  action: string;
  description: string | null;
  entityType: string | null;
  createdAt: string;
}

const SERVICE_LABELS: Record<string, string> = {
  'SMART_BODA_RIDE': 'Smart Boda',
  'SMART_CAR_RIDE': 'Smart Car',
  'FOOD_DELIVERY': 'Food Delivery',
  'SHOPPING': 'Smart Grocery',
  'ITEM_DELIVERY': 'Smart Courier',
  'SMART_HEALTH_DELIVERY': 'Smart Health',
};

const SERVICE_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'SMART_BODA_RIDE': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'bg-emerald-500/20' },
  'SMART_CAR_RIDE': { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'bg-blue-500/20' },
  'FOOD_DELIVERY': { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: 'bg-orange-500/20' },
  'SHOPPING': { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'bg-purple-500/20' },
  'ITEM_DELIVERY': { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', icon: 'bg-teal-500/20' },
  'SMART_HEALTH_DELIVERY': { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', icon: 'bg-rose-500/20' },
};

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingBreakdown, setPendingBreakdown] = useState<PendingBreakdown | null>(null);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
      setPendingBreakdown(data.pendingBreakdown);
      setServiceStats(data.serviceStats);
      setRecentActivity(data.recentActivity);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard statistics. Please check your database connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading dashboard data...</p>
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
            onClick={fetchStats}
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
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's what's happening with Smart Ride today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="glass-button text-[#00FF88] border-[#00FF88]/30 px-3 py-1">
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            Live
          </Badge>
          <span className="text-sm text-gray-500">Last updated: Just now</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clients */}
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Clients</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{(stats?.totalClients || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Registered users</p>
          </CardContent>
        </Card>

        {/* Active Riders */}
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Riders</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
              <Bike className="h-5 w-5 text-[#00FF88]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.activeRiders || 0}</div>
            <p className="text-xs text-gray-500 mt-1">of {stats?.totalRiders || 0} total riders</p>
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Today's Tasks</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center border border-[#00D4FF]/20">
              <ShoppingCart className="h-5 w-5 text-[#00D4FF]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{(stats?.todayTasks || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">{stats?.todayOrders || 0} orders</p>
          </CardContent>
        </Card>

        {/* Today's Revenue */}
        <Card className="glass-card glow-hover rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Today's Revenue</CardTitle>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats?.todayRevenue || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">From completed tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Stats & Pending Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Statistics */}
        <Card className="lg:col-span-2 glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#00FF88]" />
              Service Performance
            </CardTitle>
            <CardDescription className="text-gray-500">Revenue and orders by service type today</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceStats.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                  <Activity className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-gray-400">No service activity today</p>
                <p className="text-gray-500 text-sm mt-1">Check back later for updates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceStats.map((service) => {
                  const colors = SERVICE_COLORS[service.name] || SERVICE_COLORS['SMART_BODA_RIDE'];
                  return (
                    <div key={service.name} className={`flex items-center justify-between p-4 ${colors.bg} rounded-xl border ${colors.border} backdrop-blur-sm`}>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{SERVICE_LABELS[service.name] || service.name}</span>
                          <span className="text-lg font-semibold text-white">{formatCurrency(service.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${colors.icon} rounded-full transition-all duration-500`}
                              style={{ width: `${(service.orders / Math.max(...serviceStats.map(s => s.orders), 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-16 text-right">{service.orders} orders</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Action Required
            </CardTitle>
            <CardDescription className="text-gray-500">Items needing your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Pending Approvals */}
            <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Pending Approvals</p>
                  <p className="text-sm text-gray-500">Awaiting verification</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-base px-3">
                {stats?.pendingApprovals || 0}
              </Badge>
            </div>

            {/* Active Tasks */}
            <div className="flex items-center justify-between p-4 bg-[#00D4FF]/10 rounded-xl border border-[#00D4FF]/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#00D4FF]/20 rounded-xl flex items-center justify-center border border-[#00D4FF]/30">
                  <Activity className="h-5 w-5 text-[#00D4FF]" />
                </div>
                <div>
                  <p className="font-medium text-white">Active Tasks</p>
                  <p className="text-sm text-gray-500">In progress now</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30 text-base px-3">
                {stats?.activeTasks || 0}
              </Badge>
            </div>

            {/* Active Merchants */}
            <div className="flex items-center justify-between p-4 bg-[#00FF88]/10 rounded-xl border border-[#00FF88]/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#00FF88]/20 rounded-xl flex items-center justify-center border border-[#00FF88]/30">
                  <Store className="h-5 w-5 text-[#00FF88]" />
                </div>
                <div>
                  <p className="font-medium text-white">Active Merchants</p>
                  <p className="text-sm text-gray-500">Currently open</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]/30 text-base px-3">
                {stats?.activeMerchants || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#00FF88]" />
            Recent Activity
          </CardTitle>
          <CardDescription className="text-gray-500">Latest events across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                <Activity className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No recent activity</p>
              <p className="text-gray-500 text-sm mt-1">Activity will appear here as it happens</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00FF88]/10 border border-[#00FF88]/20 group-hover:bg-[#00FF88]/20 transition-colors">
                      <Activity className="h-5 w-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.description || activity.entityType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTime(activity.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Bike, 
  Store, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Mock data for demonstration
const stats = {
  totalClients: 12450,
  totalRiders: 892,
  activeRiders: 342,
  totalMerchants: 156,
  todayOrders: 2847,
  todayRevenue: 15240000,
  pendingApprovals: 23,
  activeTasks: 156,
};

const recentActivity = [
  { type: 'rider', action: 'New rider registered', name: 'John Okello', time: '2 min ago', status: 'pending' },
  { type: 'order', action: 'Food order completed', name: 'Order #2847', time: '5 min ago', status: 'completed' },
  { type: 'merchant', action: 'Merchant approved', name: 'Cafe Java', time: '12 min ago', status: 'approved' },
  { type: 'payment', action: 'Payment processed', name: 'UGX 45,000', time: '15 min ago', status: 'completed' },
  { type: 'task', action: 'Boda ride completed', name: 'Task #9823', time: '18 min ago', status: 'completed' },
];

const serviceStats = [
  { name: 'Smart Boda', orders: 1245, revenue: 4500000, growth: 12.5, color: 'emerald' },
  { name: 'Smart Car', orders: 892, revenue: 5200000, growth: 8.2, color: 'blue' },
  { name: 'Food Delivery', orders: 1456, revenue: 3800000, growth: 15.8, color: 'orange' },
  { name: 'Smart Grocery', orders: 567, revenue: 1200000, growth: -2.4, color: 'purple' },
  { name: 'Smart Courier', orders: 389, revenue: 540000, growth: 5.1, color: 'teal' },
];

export function DashboardOverview() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's what's happening with Smart Ride today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30">
            <Activity className="h-3 w-3 mr-1" />
            Live
          </Badge>
          <span className="text-sm text-gray-500">Last updated: Just now</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Clients</CardTitle>
            <Users className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalClients.toLocaleString()}</div>
            <p className="text-xs text-[#00FF88] flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Riders</CardTitle>
            <Bike className="h-5 w-5 text-[#00FF88]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeRiders}</div>
            <p className="text-xs text-gray-500 mt-1">of {stats.totalRiders} total riders</p>
          </CardContent>
        </Card>

        <Card className="bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Today's Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-[#00D4FF]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.todayOrders.toLocaleString()}</div>
            <p className="text-xs text-[#00FF88] flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +8% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Today's Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-[#00FF88]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-[#00FF88] flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +15% from yesterday
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Stats & Pending Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Statistics */}
        <Card className="lg:col-span-2 bg-[#13131A] border-white/5">
          <CardHeader>
            <CardTitle className="text-white">Service Performance</CardTitle>
            <CardDescription className="text-gray-500">Revenue and orders by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceStats.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 bg-[#1A1A24] rounded-xl border border-white/5">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{service.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{formatCurrency(service.revenue)}</span>
                        <span className={`text-xs flex items-center ${service.growth >= 0 ? 'text-[#00FF88]' : 'text-[#FF3B5C]'}`}>
                          {service.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(service.growth)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(service.orders / 1500) * 100} className="h-2 flex-1 bg-[#1A1A24]" />
                      <span className="text-xs text-gray-500 w-20">{service.orders} orders</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card className="bg-[#13131A] border-white/5">
          <CardHeader>
            <CardTitle className="text-white">Action Required</CardTitle>
            <CardDescription className="text-gray-500">Items needing your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Pending Approvals</p>
                  <p className="text-sm text-gray-500">Rider verification</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">{stats.pendingApprovals}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#00D4FF]/10 rounded-xl border border-[#00D4FF]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-full flex items-center justify-center">
                  <Activity className="h-5 w-5 text-[#00D4FF]" />
                </div>
                <div>
                  <p className="font-medium text-white">Active Tasks</p>
                  <p className="text-sm text-gray-500">In progress now</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30">{stats.activeTasks}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#00FF88]/10 rounded-xl border border-[#00FF88]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00FF88]/20 rounded-full flex items-center justify-center">
                  <Store className="h-5 w-5 text-[#00FF88]" />
                </div>
                <div>
                  <p className="font-medium text-white">Active Merchants</p>
                  <p className="text-sm text-gray-500">Currently online</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]/30">{stats.totalMerchants}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-[#13131A] border-white/5">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-gray-500">Latest events across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-[#1A1A24] rounded-xl transition-colors border border-transparent hover:border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'rider' ? 'bg-purple-500/20' :
                    activity.type === 'order' ? 'bg-orange-500/20' :
                    activity.type === 'merchant' ? 'bg-blue-500/20' :
                    activity.type === 'payment' ? 'bg-[#00FF88]/20' :
                    'bg-gray-500/20'
                  }`}>
                    {activity.type === 'rider' && <Bike className="h-5 w-5 text-purple-400" />}
                    {activity.type === 'order' && <ShoppingCart className="h-5 w-5 text-orange-400" />}
                    {activity.type === 'merchant' && <Store className="h-5 w-5 text-blue-400" />}
                    {activity.type === 'payment' && <DollarSign className="h-5 w-5 text-[#00FF88]" />}
                    {activity.type === 'task' && <CheckCircle className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div>
                    <p className="font-medium text-white">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={
                    activity.status === 'completed' ? 'bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]/30' :
                    activity.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    activity.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : ''
                  }>
                    {activity.status}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

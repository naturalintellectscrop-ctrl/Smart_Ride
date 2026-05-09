'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Bell,
  Power,
  UtensilsCrossed,
  ShoppingCart,
  Plus
} from 'lucide-react';
import { useNotifications } from '../../../context/notification-context';

interface MerchantHomeProps {
  onBellClick?: () => void;
}

export function MerchantHome({ onBellClick }: MerchantHomeProps) {
  const [isOnline, setIsOnline] = useState(true);
  const { unreadCount } = useNotifications();

  const stats = {
    todayOrders: 24,
    pendingOrders: 5,
    preparingOrders: 3,
    todayRevenue: 875000,
    weeklyRevenue: 4250000,
  };

  const preparationQueue = [
    {
      id: 'KOT-001',
      orderNumber: 'ORD-2024-09823',
      items: ['Margherita Pizza x2', 'Caesar Salad x1'],
      total: 88000,
      customer: 'John Doe',
      time: '5 min ago',
      status: 'PAYMENT_CONFIRMED',
    },
    {
      id: 'KOT-002',
      orderNumber: 'ORD-2024-09824',
      items: ['Chicken Wings x1', 'Fish & Chips x1'],
      total: 63000,
      customer: 'Sarah N.',
      time: '12 min ago',
      status: 'PREPARING',
    },
    {
      id: 'KOT-003',
      orderNumber: 'ORD-2024-09825',
      items: ['Pepperoni Pizza x1'],
      total: 42000,
      customer: 'Mike K.',
      time: '18 min ago',
      status: 'READY_FOR_PICKUP',
    },
  ];

  const recentOrders = [
    { id: 'ORD-001', customer: 'John D.', amount: 45000, status: 'Delivered', time: '30 min ago' },
    { id: 'ORD-002', customer: 'Sarah M.', amount: 72000, status: 'Delivered', time: '1 hr ago' },
    { id: 'ORD-003', customer: 'Peter K.', amount: 38000, status: 'Picked Up', time: '1.5 hr ago' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAYMENT_CONFIRMED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'MERCHANT_ACCEPTED':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'PREPARING':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'READY_FOR_PICKUP':
        return 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30';
      default:
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAYMENT_CONFIRMED':
        return 'New Order';
      case 'MERCHANT_ACCEPTED':
        return 'Accepted';
      case 'PREPARING':
        return 'Preparing';
      case 'READY_FOR_PICKUP':
        return 'Ready';
      default:
        return status;
    }
  };

  const quickActions = [
    { icon: UtensilsCrossed, label: 'Add Item', color: 'bg-orange-500/15 text-orange-400' },
    { icon: ShoppingCart, label: 'View Stock', color: 'bg-blue-500/15 text-blue-400' },
    { icon: DollarSign, label: 'Earnings', color: 'bg-[#00FF88]/15 text-[#00FF88]' },
    { icon: Package, label: 'Orders', color: 'bg-purple-500/15 text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Cafe Java</h1>
            <p className="text-orange-100 text-sm">Kampala Central Branch</p>
          </div>
          <button className="relative" onClick={onBellClick}>
            <Bell className="h-6 w-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Open/Close Toggle */}
        <Card className="p-4 bg-white/10 border-white/20 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                isOnline ? "bg-[#00FF88]" : "bg-gray-400"
              )}
              style={isOnline ? { boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)' } : {}}
              >
                <Store className="h-6 w-6 text-[#0D0D12]" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {isOnline ? 'Store is Open' : 'Store is Closed'}
                </p>
                <p className="text-orange-100 text-sm">
                  {isOnline ? 'Accepting orders' : 'Not accepting orders'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={cn(
                "w-14 h-8 rounded-full transition-all relative",
                isOnline ? "bg-[#00FF88]" : "bg-gray-500"
              )}
              style={isOnline ? { boxShadow: '0 0 15px rgba(0, 255, 136, 0.5)' } : {}}
            >
              <div className={cn(
                "w-6 h-6 bg-white rounded-full transition-transform absolute top-1",
                isOnline ? "translate-x-7" : "translate-x-1"
              )} />
            </button>
          </div>
        </Card>
      </div>

      <div className="px-4 -mt-2">
        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-[#13131A] border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/15 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Today&apos;s Orders</p>
                <p className="text-xl font-bold text-white">{stats.todayOrders}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-[#13131A] border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00FF88]/15 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#00FF88]" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Revenue Today</p>
                <p className="text-xl font-bold text-white">UGX {(stats.todayRevenue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Orders Alert */}
        {stats.pendingOrders > 0 && (
          <Card className="mt-4 p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-300">{stats.pendingOrders} orders need attention</p>
                <p className="text-sm text-amber-200/70">Accept or prepare pending orders</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-400" />
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", action.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-gray-400">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preparation Queue */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Preparation Queue</h3>
            <span className="text-sm text-orange-400 font-medium">{stats.preparingOrders} active</span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto">
            {preparationQueue.map((order) => (
              <Card key={order.id} className="p-4 bg-[#13131A] border-white/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{order.id}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border", getStatusColor(order.status))}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">UGX {order.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{order.time}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-[#1A1A24] rounded-lg p-2 mb-3">
                  <ul className="space-y-1">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                {order.status === 'PAYMENT_CONFIRMED' && (
                  <div className="flex gap-3">
                    <button className="flex-1 py-2 rounded-xl bg-[#FF3B5C]/15 text-[#FF3B5C] font-medium flex items-center justify-center gap-2 hover:bg-[#FF3B5C]/25 transition-colors border border-[#FF3B5C]/30">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button className="flex-1 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                      <CheckCircle className="h-4 w-4" />
                      Accept
                    </button>
                  </div>
                )}

                {order.status === 'PREPARING' && (
                  <button className="w-full py-2 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    <CheckCircle className="h-4 w-4" />
                    Mark Ready for Pickup
                  </button>
                )}

                {order.status === 'READY_FOR_PICKUP' && (
                  <div className="flex items-center gap-2 text-[#00FF88] bg-[#00FF88]/10 p-2 rounded-lg border border-[#00FF88]/20">
                    <Package className="h-4 w-4" />
                    <span className="text-sm font-medium">Waiting for rider pickup</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Recent Orders</h3>
            <button className="text-orange-400 text-sm font-medium">View All</button>
          </div>

          <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
            {recentOrders.map((order, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{order.id}</p>
                  <p className="text-sm text-gray-500">{order.customer} • {order.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">UGX {order.amount.toLocaleString()}</p>
                  <p className="text-xs text-[#00FF88]">{order.status}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Weekly Performance */}
        <Card className="p-4 mb-6 bg-[#13131A] border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Weekly Performance</h3>
            <TrendingUp className="h-5 w-5 text-[#00FF88]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white">156</p>
              <p className="text-xs text-[#00FF88]">+12% from last week</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-[#00FF88]">UGX {(stats.weeklyRevenue / 1000).toFixed(0)}K</p>
              <p className="text-xs text-[#00FF88]">+8% from last week</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

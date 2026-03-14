'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
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
  Bell
} from 'lucide-react';

export function MerchantDashboard() {
  const [isOnline, setIsOnline] = useState(true);

  const stats = {
    todayOrders: 12,
    pendingOrders: 3,
    completedOrders: 9,
    todayRevenue: 485000,
    weeklyRevenue: 2850000,
  };

  const pendingOrders = [
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
      status: 'MERCHANT_ACCEPTED',
    },
    {
      id: 'KOT-003',
      orderNumber: 'ORD-2024-09825',
      items: ['Pepperoni Pizza x1'],
      total: 42000,
      customer: 'Mike K.',
      time: '18 min ago',
      status: 'PREPARING',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAYMENT_CONFIRMED':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'MERCHANT_ACCEPTED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PREPARING':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'READY_FOR_PICKUP':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Cafe Java</h1>
            <p className="text-orange-100 text-sm">Kampala Central Branch</p>
          </div>
          <button className="relative">
            <Bell className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
              {stats.pendingOrders}
            </span>
          </button>
        </div>

        {/* Online/Offline Toggle */}
        <MobileCard className="p-4 bg-white/10 border-white/20 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}>
                <Store className={`h-6 w-6 text-white`} />
              </div>
              <div>
                <p className="font-semibold text-white">{isOnline ? 'Store is Open' : 'Store is Closed'}</p>
                <p className="text-orange-100 text-sm">
                  {isOnline ? 'Accepting orders' : 'Not accepting orders'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`w-14 h-8 rounded-full transition-all ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${isOnline ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </MobileCard>
      </div>

      <div className="px-4 -mt-2">
        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <MobileCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Today's Orders</p>
                <p className="text-xl font-bold text-gray-900">{stats.todayOrders}</p>
              </div>
            </div>
          </MobileCard>
          <MobileCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Today's Revenue</p>
                <p className="text-xl font-bold text-gray-900">UGX {(stats.todayRevenue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </MobileCard>
        </div>

        {/* Pending Orders Alert */}
        {stats.pendingOrders > 0 && (
          <MobileCard className="mt-4 p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-yellow-800">{stats.pendingOrders} orders need attention</p>
                <p className="text-sm text-yellow-600">Accept or prepare pending orders</p>
              </div>
              <ChevronRight className="h-5 w-5 text-yellow-600" />
            </div>
          </MobileCard>
        )}

        {/* KOT Orders */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Kitchen Order Tickets (KOT)</h3>
            <button className="text-orange-600 text-sm font-medium">View All</button>
          </div>

          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <MobileCard key={order.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{order.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">UGX {order.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{order.time}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <ul className="space-y-1">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Customer Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Customer: {order.customer}</span>
                </div>

                {/* Actions */}
                {order.status === 'PAYMENT_CONFIRMED' && (
                  <div className="flex gap-3 mt-3">
                    <button className="flex-1 py-2 rounded-xl bg-red-100 text-red-700 font-medium flex items-center justify-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button className="flex-1 py-2 rounded-xl bg-orange-600 text-white font-medium flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Accept
                    </button>
                  </div>
                )}

                {order.status === 'MERCHANT_ACCEPTED' && (
                  <button className="w-full mt-3 py-2 rounded-xl bg-purple-600 text-white font-medium flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    Start Preparing
                  </button>
                )}

                {order.status === 'PREPARING' && (
                  <button className="w-full mt-3 py-2 rounded-xl bg-green-600 text-white font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mark Ready for Pickup
                  </button>
                )}
              </MobileCard>
            ))}
          </div>
        </div>

        {/* Weekly Performance */}
        <MobileCard className="mt-6 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Weekly Performance</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">87</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">UGX {(stats.weeklyRevenue / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </MobileCard>
      </div>
    </div>
  );
}

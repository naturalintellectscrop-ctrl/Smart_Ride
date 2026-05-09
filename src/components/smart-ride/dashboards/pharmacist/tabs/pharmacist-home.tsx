'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Store,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Bell,
  Power,
  FileText,
  Pill,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useNotifications } from '../../../context/notification-context';

interface PharmacistHomeProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  onBellClick?: () => void;
}

export function PharmacistHome({ isOnline, onToggleOnline, onBellClick }: PharmacistHomeProps) {
  const { unreadCount } = useNotifications();
  const stats = {
    todayOrders: 18,
    pendingPrescriptions: 7,
    todayRevenue: 1250000,
    weeklyRevenue: 6850000,
  };

  const pendingPrescriptions = [
    { id: 'RX-001', patient: 'John Doe', medicines: 3, time: '10 min ago', status: 'pending' },
    { id: 'RX-002', patient: 'Sarah N.', medicines: 2, time: '25 min ago', status: 'pending' },
    { id: 'RX-003', patient: 'Peter K.', medicines: 5, time: '45 min ago', status: 'under_review' },
  ];

  const recentOrders = [
    { id: 'ORD-001', patient: 'Mary S.', amount: 85000, status: 'ready', time: '30 min ago' },
    { id: 'ORD-002', patient: 'James M.', amount: 120000, status: 'picked_up', time: '1 hr ago' },
    { id: 'ORD-003', patient: 'Grace L.', amount: 65000, status: 'delivered', time: '2 hr ago' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'under_review':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'verified':
        return 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30';
      case 'ready':
        return 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30';
      case 'picked_up':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'delivered':
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'under_review':
        return 'Under Review';
      case 'verified':
        return 'Verified';
      case 'ready':
        return 'Ready for Pickup';
      case 'picked_up':
        return 'Picked Up';
      case 'delivered':
        return 'Delivered';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-500 px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">HealthCare Pharmacy</h1>
            <p className="text-rose-100 text-sm">Kampala Central Branch</p>
          </div>
          <button className="relative" onClick={onBellClick}>
            <Bell className="h-6 w-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full text-xs flex items-center justify-center text-[#0D0D12] font-bold">
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
                  {isOnline ? 'Pharmacy is Open' : 'Pharmacy is Closed'}
                </p>
                <p className="text-rose-100 text-sm">
                  {isOnline ? 'Accepting orders' : 'Not accepting orders'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleOnline}
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
              <div className="w-10 h-10 bg-rose-500/15 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-rose-400" />
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

        {/* Pending Prescriptions Alert */}
        {stats.pendingPrescriptions > 0 && (
          <Card className="mt-4 p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-300">{stats.pendingPrescriptions} prescriptions need review</p>
                <p className="text-sm text-amber-200/70">Verify and process pending prescriptions</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-400" />
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            <button className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-xs text-gray-400">Verify Rx</span>
            </button>
            <button className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Pill className="h-5 w-5" />
              </div>
              <span className="text-xs text-gray-400">Stock</span>
            </button>
            <button className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#00FF88]/15 text-[#00FF88] flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-xs text-gray-400">Earnings</span>
            </button>
            <button className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <span className="text-xs text-gray-400">Orders</span>
            </button>
          </div>
        </div>

        {/* Pending Prescriptions */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Pending Prescriptions</h3>
            <span className="text-sm text-rose-400 font-medium">{stats.pendingPrescriptions} awaiting</span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto">
            {pendingPrescriptions.map((rx) => (
              <Card key={rx.id} className="p-4 bg-[#13131A] border-white/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{rx.id}</span>
                      <Badge className={cn("text-xs border", getStatusColor(rx.status))}>
                        {getStatusLabel(rx.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{rx.patient}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-300">{rx.medicines} items</p>
                    <p className="text-xs text-gray-500">{rx.time}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    <CheckCircle className="h-4 w-4" />
                    Review
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Recent Orders</h3>
            <button className="text-rose-400 text-sm font-medium">View All</button>
          </div>

          <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{order.id}</p>
                  <p className="text-sm text-gray-500">{order.patient} • {order.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">UGX {order.amount.toLocaleString()}</p>
                  <Badge className={cn("text-xs border", getStatusColor(order.status))}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import {
  Clock,
  Package,
  TrendingUp,
  DollarSign,
  Bell,
  ChevronRight,
  Pill,
  FileText,
  Truck,
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderDashboardScreenProps {
  providerId: string | null;
  onNavigate: (screen: any) => void;
}

export function ProviderDashboardScreen({ providerId, onNavigate }: ProviderDashboardScreenProps) {
  const [provider, setProvider] = useState({
    businessName: 'Kampala Central Pharmacy',
    providerType: 'PHARMACY',
    isOpenNow: true,
    rating: 4.8,
    totalOrders: 156,
    todayOrders: 8,
    todayEarnings: 245000,
    pendingOrders: 3,
    readyOrders: 2,
    prescriptionPending: 1,
  });

  const toggleOpenStatus = () => {
    setProvider(prev => ({ ...prev, isOpenNow: !prev.isOpenNow }));
  };

  const quickStats = [
    { label: 'Today\'s Orders', value: provider.todayOrders, icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { label: 'Earnings', value: `UGX ${(provider.todayEarnings / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    { label: 'Rating', value: provider.rating, icon: TrendingUp, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { label: 'Total Orders', value: provider.totalOrders, icon: CheckCircle, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ];

  const pendingOrders = [
    {
      id: '1',
      orderNumber: 'HPO-12345',
      customerName: 'John D.',
      items: 3,
      total: 45000,
      type: 'PRESCRIPTION',
      time: '10 min ago',
      prescriptionRequired: true,
    },
    {
      id: '2',
      orderNumber: 'HPO-12346',
      customerName: 'Mary S.',
      items: 5,
      total: 32000,
      type: 'OTC',
      time: '25 min ago',
      prescriptionRequired: false,
    },
    {
      id: '3',
      orderNumber: 'HPO-12347',
      customerName: 'Peter K.',
      items: 2,
      total: 18000,
      type: 'OTC',
      time: '45 min ago',
      prescriptionRequired: false,
    },
  ];

  const recentActivity = [
    { type: 'order_delivered', message: 'Order HPO-12340 delivered', time: '1 hour ago' },
    { type: 'prescription_verified', message: 'Prescription #1234 verified', time: '2 hours ago' },
    { type: 'payout', message: 'Payout of UGX 180,000 processed', time: '5 hours ago' },
    { type: 'new_review', message: 'New 5-star review from Sarah M.', time: 'Yesterday' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">{provider.businessName}</h1>
            <p className="text-emerald-100 text-sm">{provider.providerType.replace(/_/g, ' ')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 bg-white/20 rounded-full">
              <Bell className="h-5 w-5 text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {provider.pendingOrders}
              </span>
            </button>
          </div>
        </div>

        {/* Open/Closed Toggle */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${provider.isOpenNow ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white font-medium">
              {provider.isOpenNow ? 'Open for Orders' : 'Closed'}
            </span>
          </div>
          <button
            onClick={toggleOpenStatus}
            className={cn(
              'relative w-12 h-7 rounded-full transition-colors',
              provider.isOpenNow ? 'bg-emerald-500' : 'bg-gray-400'
            )}
          >
            <div className={cn(
              'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform',
              provider.isOpenNow ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-3 text-center">
              <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="font-bold text-gray-900 text-sm">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Pending Actions */}
        {(provider.pendingOrders > 0 || provider.prescriptionPending > 0) && (
          <MobileCard className="p-4 mb-4 border-orange-200 bg-orange-50">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Action Required
            </h3>
            <div className="space-y-2">
              {provider.prescriptionPending > 0 && (
                <button
                  onClick={() => onNavigate('orders')}
                  className="w-full flex items-center justify-between bg-white rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">{provider.prescriptionPending} prescription(s) pending verification</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              )}
              {provider.pendingOrders > 0 && (
                <button
                  onClick={() => onNavigate('orders')}
                  className="w-full flex items-center justify-between bg-white rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    <span className="text-gray-700">{provider.pendingOrders} new order(s) to review</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              )}
            </div>
          </MobileCard>
        )}

        {/* Pending Orders */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Pending Orders</h3>
            <button 
              onClick={() => onNavigate('orders')}
              className="text-emerald-600 text-sm font-medium"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <MobileCard key={order.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{order.customerName}</p>
                    <p className="text-xs text-gray-500">{order.orderNumber} • {order.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">UGX {order.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{order.items} items</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {order.prescriptionRequired ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        Prescription
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        OTC
                      </span>
                    )}
                  </div>
                  <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Review
                  </button>
                </div>
              </MobileCard>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            <button 
              onClick={() => onNavigate('catalog')}
              className="bg-white rounded-xl p-3 text-center"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Pill className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-xs text-gray-700">Catalog</p>
            </button>
            <button className="bg-white rounded-xl p-3 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs text-gray-700">Prescriptions</p>
            </button>
            <button className="bg-white rounded-xl p-3 text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-xs text-gray-700">Delivery</p>
            </button>
            <button className="bg-white rounded-xl p-3 text-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-xs text-gray-700">Earnings</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <MobileCard className="p-4">
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 pb-3 last:pb-0 last:border-0 border-b border-gray-100">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {activity.type === 'order_delivered' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {activity.type === 'prescription_verified' && <FileText className="h-4 w-4 text-blue-600" />}
                    {activity.type === 'payout' && <DollarSign className="h-4 w-4 text-emerald-600" />}
                    {activity.type === 'new_review' && <Users className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{activity.message}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </MobileCard>
        </div>
      </div>
    </div>
  );
}

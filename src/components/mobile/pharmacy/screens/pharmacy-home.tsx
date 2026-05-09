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
  Bell,
  FileText,
  Pill,
  Thermometer,
  Shield,
  Plus,
  Eye,
  Truck,
  ShoppingBag
} from 'lucide-react';

interface PharmacyHomeProps {
  onNavigate: (screen: string) => void;
}

export function PharmacyHome({ onNavigate }: PharmacyHomeProps) {
  const [isOnline, setIsOnline] = useState(true);

  const stats = {
    todayOrders: 8,
    pendingOrders: 2,
    completedOrders: 6,
    todayRevenue: 285000,
    weeklyRevenue: 1450000,
    pendingPrescriptions: 3,
  };

  const pendingOrders = [
    {
      id: 'POT-001',
      orderNumber: 'HLTH-2024-09823',
      type: 'PRESCRIPTION',
      items: ['Paracetamol 500mg x2', 'Amoxicillin 250mg x1'],
      total: 45000,
      customer: 'John Doe',
      time: '5 min ago',
      status: 'REVIEW',
      isFragile: false,
      isTemperatureSensitive: false,
    },
    {
      id: 'POT-002',
      orderNumber: 'HLTH-2024-09824',
      type: 'OTC',
      items: ['Vitamin C 1000mg x1', 'Cold & Flu Relief x1'],
      total: 27000,
      customer: 'Sarah N.',
      time: '12 min ago',
      status: 'PREPARING',
      isFragile: false,
      isTemperatureSensitive: true,
    },
    {
      id: 'POT-003',
      orderNumber: 'HLTH-2024-09825',
      type: 'OTC',
      items: ['Hand Sanitizer 500ml x2', 'Bandages x1'],
      total: 20000,
      customer: 'Mike K.',
      time: '18 min ago',
      status: 'READY',
      isFragile: true,
      isTemperatureSensitive: false,
    },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'REVIEW':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Review Rx' };
      case 'PREPARING':
        return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Preparing' };
      case 'READY':
        return { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Ready' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">HealthFirst Pharmacy</h1>
            <p className="text-rose-100 text-sm">Kampala Central Branch</p>
          </div>
          <div className="relative">
            <Bell className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
              {stats.pendingOrders + stats.pendingPrescriptions}
            </span>
          </div>
        </div>

        {/* Online/Offline Toggle */}
        <MobileCard className="p-4 bg-white/10 border-white/20 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}>
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">{isOnline ? 'Pharmacy is Open' : 'Pharmacy is Closed'}</p>
                <p className="text-rose-100 text-sm">
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
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-rose-600" />
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

        {/* Prescription Verification Alert */}
        {stats.pendingPrescriptions > 0 && (
          <MobileCard 
            className="mt-4 p-4 bg-amber-50 border-amber-200 cursor-pointer active:bg-amber-100"
            onClick={() => onNavigate('prescriptions')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">{stats.pendingPrescriptions} prescriptions need verification</p>
                <p className="text-sm text-amber-600">Tap to review and verify</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-600" />
            </div>
          </MobileCard>
        )}

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            <MobileCard 
              className="p-4 text-center cursor-pointer active:bg-gray-100"
              onClick={() => onNavigate('catalog')}
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Plus className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Add Medicine</p>
            </MobileCard>
            <MobileCard 
              className="p-4 text-center cursor-pointer active:bg-gray-100"
              onClick={() => onNavigate('orders')}
            >
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Eye className="h-6 w-6 text-teal-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">View Orders</p>
            </MobileCard>
            <MobileCard 
              className="p-4 text-center cursor-pointer active:bg-gray-100"
              onClick={() => onNavigate('prescriptions')}
            >
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Shield className="h-6 w-6 text-rose-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Verify Rx</p>
            </MobileCard>
          </div>
        </div>

        {/* Pharmacy Order Tickets (POT) */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Active Orders (POT)</h3>
            <button 
              onClick={() => onNavigate('orders')}
              className="text-rose-600 text-sm font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {pendingOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              return (
                <MobileCard key={order.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{order.id}</span>
                        {order.type === 'PRESCRIPTION' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                            Rx
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{order.orderNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">UGX {order.total.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{order.time}</p>
                    </div>
                  </div>

                  {/* Handling Flags */}
                  {(order.isFragile || order.isTemperatureSensitive) && (
                    <div className="flex gap-2 mb-3">
                      {order.isFragile && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Fragile
                        </span>
                      )}
                      {order.isTemperatureSensitive && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
                          Keep Cool
                        </span>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <ul className="space-y-1">
                      {order.items.map((item, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-center gap-2">
                          <Pill className="h-3 w-3 text-rose-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-500">Customer: {order.customer}</span>
                  </div>

                  {/* Actions */}
                  {order.status === 'REVIEW' && (
                    <button 
                      onClick={() => onNavigate('prescriptions')}
                      className="w-full py-2 rounded-xl bg-amber-100 text-amber-700 font-medium flex items-center justify-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Review Prescription
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button className="w-full py-2 rounded-xl bg-rose-600 text-white font-medium flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Mark Ready for Pickup
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <div className="bg-teal-50 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <Truck className="h-5 w-5 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-teal-800">Ready for Pickup</p>
                        <p className="text-xs text-teal-600">Rider will be assigned soon</p>
                      </div>
                    </div>
                  )}
                </MobileCard>
              );
            })}
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
              <p className="text-2xl font-bold text-gray-900">42</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Prescriptions Verified</p>
              <p className="text-2xl font-bold text-gray-900">18</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">UGX {(stats.weeklyRevenue / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </MobileCard>
      </div>
    </div>
  );
}

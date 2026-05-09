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
  Shield
} from 'lucide-react';

type ViewType = 'dashboard' | 'orders' | 'prescriptions' | 'catalog';

export function PharmacyDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const stats = {
    todayOrders: 8,
    pendingOrders: 2,
    completedOrders: 6,
    todayRevenue: 285000,
    weeklyRevenue: 1450000,
    pendingPrescriptions: 3,
  };

  // Sample pending orders with POT
  const pendingOrders = [
    {
      id: 'POT-001',
      orderNumber: 'HLTH-2024-09823',
      type: 'PRESCRIPTION_MEDICINE',
      items: ['Paracetamol 500mg x2', 'Amoxicillin 250mg x1'],
      total: 45000,
      customer: 'John Doe',
      time: '5 min ago',
      status: 'PHARMACY_REVIEW',
      hasPrescription: true,
      prescriptionNumber: 'RX-2024-001',
      isFragile: false,
      isTemperatureSensitive: false,
    },
    {
      id: 'POT-002',
      orderNumber: 'HLTH-2024-09824',
      type: 'OVER_THE_COUNTER',
      items: ['Vitamin C 1000mg x1', 'Cold & Flu Relief x1'],
      total: 27000,
      customer: 'Sarah N.',
      time: '12 min ago',
      status: 'PREPARING_ORDER',
      hasPrescription: false,
      isFragile: false,
      isTemperatureSensitive: true,
    },
    {
      id: 'POT-003',
      orderNumber: 'HLTH-2024-09825',
      type: 'OVER_THE_COUNTER',
      items: ['Hand Sanitizer 500ml x2'],
      total: 20000,
      customer: 'Mike K.',
      time: '18 min ago',
      status: 'READY_FOR_PICKUP',
      hasPrescription: false,
      riderName: 'David M.',
      isFragile: false,
      isTemperatureSensitive: false,
    },
  ];

  // Sample prescriptions pending verification
  const pendingPrescriptions = [
    {
      id: 'RX-2024-001',
      orderNumber: 'HLTH-2024-09823',
      doctorName: 'Dr. Mukasa',
      clinicName: 'Kampala Medical Center',
      uploadedAt: '5 min ago',
      status: 'PENDING',
      medicines: ['Paracetamol 500mg', 'Amoxicillin 250mg'],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PHARMACY_REVIEW':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'PRESCRIPTION_VERIFIED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PREPARING_ORDER':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'READY_FOR_PICKUP':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'RIDER_ASSIGNED':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'OUT_FOR_DELIVERY':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PHARMACY_REVIEW':
        return 'Reviewing Prescription';
      case 'PRESCRIPTION_VERIFIED':
        return 'Prescription Verified';
      case 'PREPARING_ORDER':
        return 'Preparing Order';
      case 'READY_FOR_PICKUP':
        return 'Ready for Pickup';
      case 'RIDER_ASSIGNED':
        return 'Rider Assigned';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      default:
        return status;
    }
  };

  // Prescription Verification View
  if (currentView === 'prescriptions') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Prescription Verification</h1>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="text-emerald-600 font-medium"
            >
              Back
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          {pendingPrescriptions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No prescriptions pending verification</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPrescriptions.map((rx) => (
                <MobileCard key={rx.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{rx.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-100 text-yellow-700">
                          Pending Review
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Order: {rx.orderNumber}</p>
                    </div>
                  </div>

                  {/* Prescription Image Placeholder */}
                  <div className="bg-gray-100 rounded-xl p-8 text-center mb-4">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Tap to view prescription image</p>
                  </div>

                  {/* Doctor Info */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-gray-900">{rx.doctorName}</span>
                    </div>
                    <p className="text-sm text-gray-500">{rx.clinicName}</p>
                  </div>

                  {/* Medicines */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Prescribed Medicines:</p>
                    <ul className="space-y-1">
                      {rx.medicines.map((med, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                          {med}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button className="flex-1 py-2 rounded-xl bg-red-100 text-red-700 font-medium flex items-center justify-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-medium flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Verify
                    </button>
                  </div>
                </MobileCard>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Orders View
  if (currentView === 'orders') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">All Orders</h1>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="text-emerald-600 font-medium"
            >
              Back
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <MobileCard key={order.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{order.id}</span>
                      {order.hasPrescription && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          Rx
                        </span>
                      )}
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
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Customer Info */}
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-gray-500">Customer: {order.customer}</span>
                </div>

                {/* Prescription Reference */}
                {order.hasPrescription && order.prescriptionNumber && (
                  <div className="flex items-center gap-2 text-sm mb-3 text-rose-600">
                    <FileText className="h-4 w-4" />
                    <span>Prescription: {order.prescriptionNumber}</span>
                  </div>
                )}

                {/* Rider Info */}
                {order.riderName && (
                  <div className="bg-teal-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-teal-700">
                          {order.riderName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.riderName}</p>
                        <p className="text-xs text-teal-600">Delivery Personnel</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {order.status === 'PHARMACY_REVIEW' && (
                  <button 
                    onClick={() => setCurrentView('prescriptions')}
                    className="w-full mt-2 py-2 rounded-xl bg-yellow-100 text-yellow-700 font-medium flex items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Review Prescription
                  </button>
                )}

                {order.status === 'PREPARING_ORDER' && (
                  <button className="w-full mt-2 py-2 rounded-xl bg-emerald-600 text-white font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mark Ready for Pickup
                  </button>
                )}
              </MobileCard>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with Online Toggle */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">HealthFirst Pharmacy</h1>
            <p className="text-emerald-100 text-sm">Kampala Central Branch</p>
          </div>
          <button className="relative">
            <Bell className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
              {stats.pendingOrders + stats.pendingPrescriptions}
            </span>
          </button>
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
                <p className="text-emerald-100 text-sm">
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
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-emerald-600" />
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
            className="mt-4 p-4 bg-rose-50 border-rose-200 cursor-pointer"
            onClick={() => setCurrentView('prescriptions')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-rose-800">{stats.pendingPrescriptions} prescriptions need verification</p>
                <p className="text-sm text-rose-600">Review and verify pending prescriptions</p>
              </div>
              <ChevronRight className="h-5 w-5 text-rose-600" />
            </div>
          </MobileCard>
        )}

        {/* Pending Orders Alert */}
        {stats.pendingOrders > 0 && (
          <MobileCard 
            className="mt-4 p-4 bg-yellow-50 border-yellow-200 cursor-pointer"
            onClick={() => setCurrentView('orders')}
          >
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

        {/* Pharmacy Order Tickets (POT) */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Pharmacy Order Tickets (POT)</h3>
            <button 
              onClick={() => setCurrentView('orders')}
              className="text-emerald-600 text-sm font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {pendingOrders.slice(0, 3).map((order) => (
              <MobileCard key={order.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{order.id}</span>
                      {order.hasPrescription && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          Rx
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{order.orderNumber}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
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
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                {order.status === 'PHARMACY_REVIEW' && (
                  <button 
                    onClick={() => setCurrentView('prescriptions')}
                    className="w-full py-2 rounded-xl bg-yellow-100 text-yellow-700 font-medium flex items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Review Prescription
                  </button>
                )}

                {order.status === 'PREPARING_ORDER' && (
                  <button className="w-full py-2 rounded-xl bg-emerald-600 text-white font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mark Ready for Pickup
                  </button>
                )}

                {order.status === 'READY_FOR_PICKUP' && (
                  <div className="bg-teal-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-teal-700">
                      ✓ Order ready • Rider {order.riderName} assigned
                    </p>
                  </div>
                )}
              </MobileCard>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <MobileCard 
              className="p-4 cursor-pointer active:bg-gray-100"
              onClick={() => setCurrentView('catalog')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Pill className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Medicine Catalog</p>
                  <p className="text-xs text-gray-500">Manage inventory</p>
                </div>
              </div>
            </MobileCard>
            <MobileCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Analytics</p>
                  <p className="text-xs text-gray-500">View reports</p>
                </div>
              </div>
            </MobileCard>
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

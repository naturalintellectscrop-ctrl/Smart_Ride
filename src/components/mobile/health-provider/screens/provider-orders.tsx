'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import {
  Package,
  FileText,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  User,
  Phone,
  MessageSquare,
  ChevronDown,
  Filter,
  Search,
  Eye,
  Check,
  X,
  AlertCircle,
  Pill,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderOrdersScreenProps {
  providerId: string | null;
}

type OrderFilter = 'all' | 'pending' | 'preparing' | 'ready' | 'completed';

export function ProviderOrdersScreen({ providerId }: ProviderOrdersScreenProps) {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { id: 'all' as OrderFilter, label: 'All', count: 12 },
    { id: 'pending' as OrderFilter, label: 'Pending', count: 3 },
    { id: 'preparing' as OrderFilter, label: 'Preparing', count: 2 },
    { id: 'ready' as OrderFilter, label: 'Ready', count: 1 },
    { id: 'completed' as OrderFilter, label: 'Completed', count: 6 },
  ];

  const orders = [
    {
      id: '1',
      orderNumber: 'HPO-2024-12345',
      customerName: 'John Doe',
      customerPhone: '+256 700 123 456',
      items: [
        { name: 'Paracetamol 500mg', quantity: 2, price: 10000 },
        { name: 'Vitamin C 1000mg', quantity: 1, price: 15000 },
      ],
      total: 45000,
      deliveryFee: 5000,
      status: 'ORDER_RECEIVED',
      orderType: 'PRESCRIPTION_MEDICINE',
      prescriptionRequired: true,
      prescriptionVerified: false,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      deliveryAddress: 'Plot 12, Kampala Road',
    },
    {
      id: '2',
      orderNumber: 'HPO-2024-12346',
      customerName: 'Mary Smith',
      customerPhone: '+256 755 987 654',
      items: [
        { name: 'Ibuprofen 400mg', quantity: 1, price: 8000 },
        { name: 'Antacid Tablets', quantity: 2, price: 12000 },
      ],
      total: 32000,
      deliveryFee: 5000,
      status: 'PREPARING',
      orderType: 'OVER_THE_COUNTER',
      prescriptionRequired: false,
      prescriptionVerified: null,
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
      deliveryAddress: 'Nakasero, Kampala',
    },
    {
      id: '3',
      orderNumber: 'HPO-2024-12347',
      customerName: 'Peter Kato',
      customerPhone: '+256 777 111 222',
      items: [
        { name: 'Cold & Flu Relief', quantity: 1, price: 18000 },
      ],
      total: 23000,
      deliveryFee: 5000,
      status: 'READY_FOR_PICKUP',
      orderType: 'OVER_THE_COUNTER',
      prescriptionRequired: false,
      prescriptionVerified: null,
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
      deliveryAddress: 'Kololo, Kampala',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ORDER_RECEIVED':
        return 'bg-yellow-100 text-yellow-700';
      case 'ORDER_ACCEPTED':
      case 'PREPARING':
        return 'bg-blue-100 text-blue-700';
      case 'READY_FOR_PICKUP':
        return 'bg-purple-100 text-purple-700';
      case 'OUT_FOR_DELIVERY':
        return 'bg-indigo-100 text-indigo-700';
      case 'DELIVERED':
        return 'bg-green-100 text-green-700';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return ['ORDER_RECEIVED'].includes(order.status);
    if (activeFilter === 'preparing') return ['ORDER_ACCEPTED', 'PREPARING'].includes(order.status);
    if (activeFilter === 'ready') return ['READY_FOR_PICKUP', 'AWAITING_RIDER'].includes(order.status);
    if (activeFilter === 'completed') return ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <MobileHeader title="Orders" />

      <div className="px-4 pt-4">
        {/* Search */}
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-200 mb-4">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                activeFilter === filter.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              )}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <MobileCard key={order.id} className="overflow-hidden">
              {/* Order Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {order.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getStatusColor(order.status)
                  )}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {order.orderType === 'PRESCRIPTION_MEDICINE' ? (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      <FileText className="h-3 w-3" />
                      Prescription
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                      <Pill className="h-3 w-3" />
                      OTC
                    </span>
                  )}
                  
                  {order.prescriptionRequired && !order.prescriptionVerified && (
                    <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                      <AlertCircle className="h-3 w-3" />
                      Prescription Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.customerName}</p>
                      <p className="text-sm text-gray-500">{order.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-emerald-600" />
                    </button>
                    <button className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Items</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <p className="text-gray-900">{item.name} x{item.quantity}</p>
                      <p className="text-gray-700">UGX {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-xl font-bold text-gray-900">UGX {order.total.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Delivery</p>
                    <p className="text-gray-700">UGX {order.deliveryFee.toLocaleString()}</p>
                  </div>
                </div>

                {/* Actions */}
                {order.status === 'ORDER_RECEIVED' && (
                  <div className="flex gap-3">
                    {order.prescriptionRequired && !order.prescriptionVerified && (
                      <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium">
                        Verify Prescription
                      </button>
                    )}
                    <button className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium">
                      Accept Order
                    </button>
                    <button className="px-4 bg-red-100 text-red-600 py-3 rounded-xl font-medium">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {order.status === 'PREPARING' && (
                  <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium">
                    Mark as Ready
                  </button>
                )}

                {order.status === 'READY_FOR_PICKUP' && (
                  <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                    <Truck className="h-5 w-5" />
                    Request Rider Pickup
                  </button>
                )}

                <button className="w-full mt-2 flex items-center justify-center gap-2 text-gray-600 text-sm">
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
              </div>
            </MobileCard>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}

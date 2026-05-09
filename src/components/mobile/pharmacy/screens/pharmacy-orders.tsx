'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  MapPin,
  Phone,
  MessageSquare,
  Filter,
  Search,
  Shield,
  User,
  Thermometer,
  Eye,
  Truck,
  Pill,
  FileText
} from 'lucide-react';

type OrderFilter = 'all' | 'pending' | 'preparing' | 'ready' | 'completed';

export function PharmacyOrders() {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const orders = [
    {
      id: 'POT-001',
      orderNumber: 'HLTH-2024-09823',
      items: [
        { name: 'Paracetamol 500mg', qty: 2, price: 10000 },
        { name: 'Amoxicillin 250mg', qty: 1, price: 25000 },
      ],
      total: 45000,
      customer: 'John Doe',
      deliveryAddress: 'Kololo, Kampala',
      time: '5 min ago',
      status: 'REVIEW',
      hasPrescription: true,
      prescriptionId: 'RX-2024-001',
      isFragile: false,
      isTemperatureSensitive: false,
    },
    {
      id: 'POT-002',
      orderNumber: 'HLTH-2024-09824',
      items: [
        { name: 'Vitamin C 1000mg', qty: 1, price: 15000 },
        { name: 'Cold & Flu Relief', qty: 1, price: 12000 },
      ],
      total: 27000,
      customer: 'Sarah N.',
      deliveryAddress: 'Ntinda, Kampala',
      time: '12 min ago',
      status: 'PREPARING',
      hasPrescription: false,
      isFragile: false,
      isTemperatureSensitive: true,
    },
    {
      id: 'POT-003',
      orderNumber: 'HLTH-2024-09825',
      items: [
        { name: 'Hand Sanitizer 500ml', qty: 2, price: 10000 },
        { name: 'Bandages Pack', qty: 1, price: 5000 },
      ],
      total: 20000,
      customer: 'Mike K.',
      deliveryAddress: 'Nakasero, Kampala',
      time: '18 min ago',
      status: 'READY',
      hasPrescription: false,
      riderName: 'David M.',
      isFragile: true,
      isTemperatureSensitive: false,
    },
    {
      id: 'POT-004',
      orderNumber: 'HLTH-2024-09820',
      items: [
        { name: 'Ibuprofen 400mg', qty: 1, price: 8000 },
      ],
      total: 8000,
      customer: 'Grace M.',
      deliveryAddress: 'Kampala CBD',
      time: '45 min ago',
      status: 'OUT_FOR_DELIVERY',
      hasPrescription: false,
      riderName: 'Peter O.',
      isFragile: false,
      isTemperatureSensitive: false,
    },
    {
      id: 'POT-005',
      orderNumber: 'HLTH-2024-09815',
      items: [
        { name: 'Antacid Tablets', qty: 2, price: 8000 },
      ],
      total: 16000,
      customer: 'David O.',
      deliveryAddress: 'Makindye, Kampala',
      time: '1 hour ago',
      status: 'DELIVERED',
      hasPrescription: false,
      isFragile: false,
      isTemperatureSensitive: false,
    },
  ];

  const filters: { id: OrderFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
    { id: 'completed', label: 'Completed' },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'REVIEW':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Review Rx' };
      case 'PREPARING':
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', label: 'Preparing' };
      case 'READY':
        return { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', label: 'Ready' };
      case 'OUT_FOR_DELIVERY':
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', label: 'Out for Delivery' };
      case 'DELIVERED':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'Delivered' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: status };
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return ['REVIEW'].includes(order.status);
    if (activeFilter === 'preparing') return order.status === 'PREPARING';
    if (activeFilter === 'ready') return ['READY', 'OUT_FOR_DELIVERY'].includes(order.status);
    if (activeFilter === 'completed') return order.status === 'DELIVERED';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Manage all pharmacy orders</p>
      </div>

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
          <button className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4 text-rose-600" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                activeFilter === filter.id
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            return (
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
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{order.orderNumber} • {order.time}</p>
                  </div>
                  <p className="font-bold text-gray-900">UGX {order.total.toLocaleString()}</p>
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
                        <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                        <Pill className="h-3 w-3 text-gray-400" />
                        {item.name} x{item.qty}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Customer & Delivery Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-medium text-gray-900">{order.customer}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{order.deliveryAddress}</span>
                  </div>
                </div>

                {/* Rider Info */}
                {order.riderName && (
                  <div className="bg-teal-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{order.riderName}</p>
                        <p className="text-xs text-teal-600">Delivery Rider • Secure Contact</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Phone className="h-5 w-5 text-emerald-600" />
                        </button>
                        <button className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {order.status === 'REVIEW' && (
                  <div className="flex gap-3">
                    <button className="flex-1 py-2 rounded-xl bg-red-100 text-red-700 font-medium flex items-center justify-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-medium flex items-center justify-center gap-2">
                      <Eye className="h-4 w-4" />
                      Review Rx
                    </button>
                  </div>
                )}

                {order.status === 'PREPARING' && (
                  <button className="w-full py-2 rounded-xl bg-green-600 text-white font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mark Ready for Pickup
                  </button>
                )}

                {order.status === 'READY' && (
                  <div className="bg-teal-50 rounded-xl p-3 flex items-center gap-3">
                    <Truck className="h-5 w-5 text-teal-600" />
                    <div className="flex-1">
                      <p className="font-medium text-teal-800">Awaiting Rider Pickup</p>
                      <p className="text-xs text-teal-600">Keep order at counter</p>
                    </div>
                  </div>
                )}

                {order.status === 'OUT_FOR_DELIVERY' && (
                  <div className="bg-orange-50 rounded-xl p-3 flex items-center gap-3">
                    <Truck className="h-5 w-5 text-orange-600 animate-pulse" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-800">Out for Delivery</p>
                      <p className="text-xs text-orange-600">Order on the way</p>
                    </div>
                  </div>
                )}
              </MobileCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}

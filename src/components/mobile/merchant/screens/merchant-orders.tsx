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
  User
} from 'lucide-react';
import { InAppChat, InAppCall, PrivacyNotice } from '../../shared/in-app-communication';

type OrderFilter = 'all' | 'pending' | 'preparing' | 'ready' | 'completed';

export function MerchantOrders() {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [selectedRider, setSelectedRider] = useState<{ name: string; taskId: string } | null>(null);

  const orders: Array<{
    id: string;
    orderNumber: string;
    items: string[];
    total: number;
    customer: string;
    deliveryAddress: string;
    time: string;
    status: string;
    statusLabel: string;
    riderName?: string;
  }> = [
    {
      id: 'KOT-001',
      orderNumber: 'ORD-2024-09823',
      items: ['Margherita Pizza x2', 'Caesar Salad x1'],
      total: 88000,
      customer: 'John Doe',
      // Phone number NEVER exposed - privacy protected
      deliveryAddress: 'Kololo, Kampala',
      time: '5 min ago',
      status: 'PAYMENT_CONFIRMED',
      statusLabel: 'New Order',
    },
    {
      id: 'KOT-002',
      orderNumber: 'ORD-2024-09824',
      items: ['Chicken Wings x1', 'Fish & Chips x1'],
      total: 63000,
      customer: 'Sarah N.',
      deliveryAddress: 'Ntinda, Kampala',
      time: '12 min ago',
      status: 'PREPARING',
      statusLabel: 'Preparing',
    },
    {
      id: 'KOT-003',
      orderNumber: 'ORD-2024-09825',
      items: ['Pepperoni Pizza x1'],
      total: 42000,
      customer: 'Mike K.',
      deliveryAddress: 'Nakasero, Kampala',
      time: '18 min ago',
      status: 'READY_FOR_PICKUP',
      statusLabel: 'Ready for Pickup',
      riderName: 'David M.',
    },
    {
      id: 'KOT-004',
      orderNumber: 'ORD-2024-09820',
      items: ['Margherita Pizza x1', 'Coke x2'],
      total: 45000,
      customer: 'Grace M.',
      deliveryAddress: 'Kampala CBD',
      time: '45 min ago',
      status: 'PICKED_UP',
      statusLabel: 'Picked Up',
      riderName: 'Peter O.',
    },
    {
      id: 'KOT-005',
      orderNumber: 'ORD-2024-09815',
      items: ['Fish & Chips x2'],
      total: 76000,
      customer: 'David O.',
      deliveryAddress: 'Makindye, Kampala',
      time: '1 hour ago',
      status: 'DELIVERED',
      statusLabel: 'Delivered',
    },
  ];

  const filters: { id: OrderFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
    { id: 'completed', label: 'Completed' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAYMENT_CONFIRMED':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
      case 'MERCHANT_ACCEPTED':
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'PREPARING':
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
      case 'READY_FOR_PICKUP':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
      case 'PICKED_UP':
        return { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' };
      case 'DELIVERED':
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return ['PAYMENT_CONFIRMED', 'MERCHANT_ACCEPTED'].includes(order.status);
    if (activeFilter === 'preparing') return order.status === 'PREPARING';
    if (activeFilter === 'ready') return order.status === 'READY_FOR_PICKUP';
    if (activeFilter === 'completed') return ['PICKED_UP', 'DELIVERED'].includes(order.status);
    return true;
  });

  const handleOpenChat = (riderName: string, taskId: string) => {
    setSelectedRider({ name: riderName, taskId });
    setShowChat(true);
  };

  const handleOpenCall = (riderName: string, taskId: string) => {
    setSelectedRider({ name: riderName, taskId });
    setShowCall(true);
  };

  // In-App Chat Modal
  if (showChat && selectedRider) {
    return (
      <InAppChat
        recipientName={selectedRider.name}
        recipientRole="rider"
        taskId={selectedRider.taskId}
        onClose={() => {
          setShowChat(false);
          setSelectedRider(null);
        }}
      />
    );
  }

  // In-App Call Modal
  if (showCall && selectedRider) {
    return (
      <InAppCall
        recipientName={selectedRider.name}
        recipientRole="rider"
        onEnd={() => {
          setShowCall(false);
          setSelectedRider(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Manage all your orders</p>
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
          <button className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4 text-orange-600" />
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
                  ? 'bg-orange-600 text-white'
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
            const colors = getStatusColor(order.status);
            return (
              <MobileCard key={order.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{order.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {order.statusLabel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{order.orderNumber} • {order.time}</p>
                  </div>
                  <p className="font-bold text-gray-900">UGX {order.total.toLocaleString()}</p>
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

                {/* Actions based on status */}
                {order.status === 'PAYMENT_CONFIRMED' && (
                  <div className="flex gap-3">
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

                {order.status === 'PREPARING' && (
                  <button className="w-full py-2 rounded-xl bg-green-600 text-white font-medium flex items-center justify-center gap-2">
                    <Package className="h-4 w-4" />
                    Mark Ready for Pickup
                  </button>
                )}

                {order.status === 'READY_FOR_PICKUP' && (
                  <div className="bg-teal-50 rounded-xl p-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.riderName}</p>
                          <div className="flex items-center gap-1 text-xs text-teal-600">
                            <Shield className="h-3 w-3" />
                            <span>Rider • Secure Contact</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenCall(order.riderName || 'Rider', order.id)}
                          className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"
                        >
                          <Phone className="h-5 w-5 text-emerald-600" />
                        </button>
                        <button 
                          onClick={() => handleOpenChat(order.riderName || 'Rider', order.id)}
                          className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
                        >
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </button>
                      </div>
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

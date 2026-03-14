'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
  ChefHat,
  Bike,
  FileText,
  Printer
} from 'lucide-react';

type OrderFilter = 'all' | 'new' | 'preparing' | 'ready' | 'picked_up' | 'completed';

type OrderStatus =
  | 'PAYMENT_CONFIRMED'
  | 'MERCHANT_ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED';

interface Order {
  id: string;
  orderNumber: string;
  items: Array<{ name: string; quantity: number; notes?: string }>;
  total: number;
  customer: string;
  customerPhone: string;
  deliveryAddress: string;
  time: string;
  status: OrderStatus;
  riderName?: string;
  riderId?: string;
  preparationTime?: number;
  notes?: string;
}

export function MerchantOrders() {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [selectedRider, setSelectedRider] = useState<{ name: string; orderId: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'KOT-001',
      orderNumber: 'ORD-2024-09823',
      items: [
        { name: 'Margherita Pizza', quantity: 2, notes: 'Extra cheese' },
        { name: 'Caesar Salad', quantity: 1 }
      ],
      total: 88000,
      customer: 'John Doe',
      customerPhone: '+256 700 123 456',
      deliveryAddress: 'Kololo, Kampala - Plot 45, Prince Charles Drive',
      time: '5 min ago',
      status: 'PAYMENT_CONFIRMED',
      notes: 'Please deliver to gate B',
    },
    {
      id: 'KOT-002',
      orderNumber: 'ORD-2024-09824',
      items: [
        { name: 'Chicken Wings', quantity: 1, notes: 'Spicy' },
        { name: 'Fish & Chips', quantity: 1 }
      ],
      total: 63000,
      customer: 'Sarah N.',
      customerPhone: '+256 700 234 567',
      deliveryAddress: 'Ntinda, Kampala - Shopping Mall',
      time: '12 min ago',
      status: 'PREPARING',
      preparationTime: 15,
    },
    {
      id: 'KOT-003',
      orderNumber: 'ORD-2024-09825',
      items: [
        { name: 'Pepperoni Pizza', quantity: 1 }
      ],
      total: 42000,
      customer: 'Mike K.',
      customerPhone: '+256 700 345 678',
      deliveryAddress: 'Nakasero, Kampala - Parliament Avenue',
      time: '18 min ago',
      status: 'READY_FOR_PICKUP',
      riderName: 'David M.',
      riderId: 'RDR-001',
    },
    {
      id: 'KOT-004',
      orderNumber: 'ORD-2024-09820',
      items: [
        { name: 'Margherita Pizza', quantity: 1 },
        { name: 'Coca Cola', quantity: 2 }
      ],
      total: 45000,
      customer: 'Grace M.',
      customerPhone: '+256 700 456 789',
      deliveryAddress: 'Kampala CBD - Constitutional Square',
      time: '45 min ago',
      status: 'PICKED_UP',
      riderName: 'Peter O.',
      riderId: 'RDR-002',
    },
    {
      id: 'KOT-005',
      orderNumber: 'ORD-2024-09815',
      items: [
        { name: 'Fish & Chips', quantity: 2 }
      ],
      total: 76000,
      customer: 'David O.',
      customerPhone: '+256 700 567 890',
      deliveryAddress: 'Makindye, Kampala',
      time: '1 hour ago',
      status: 'DELIVERED',
    },
    {
      id: 'KOT-006',
      orderNumber: 'ORD-2024-09810',
      items: [
        { name: 'Chicken Burger', quantity: 2 },
        { name: 'Fries', quantity: 2 }
      ],
      total: 54000,
      customer: 'Anna T.',
      customerPhone: '+256 700 678 901',
      deliveryAddress: 'Bugolobi, Kampala',
      time: '2 hours ago',
      status: 'COMPLETED',
    },
  ]);

  const filters: { id: OrderFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: orders.length },
    { id: 'new', label: 'New', count: orders.filter(o => o.status === 'PAYMENT_CONFIRMED').length },
    { id: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'PREPARING').length },
    { id: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'READY_FOR_PICKUP').length },
    { id: 'picked_up', label: 'Picked Up', count: orders.filter(o => o.status === 'PICKED_UP').length },
    { id: 'completed', label: 'Completed', count: orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length },
  ];

  const getStatusConfig = (status: OrderStatus) => {
    const configs = {
      PAYMENT_CONFIRMED: {
        label: 'Order Received',
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: Clock,
      },
      MERCHANT_ACCEPTED: {
        label: 'Accepted',
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: CheckCircle,
      },
      PREPARING: {
        label: 'Preparing',
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-200',
        icon: ChefHat,
      },
      READY_FOR_PICKUP: {
        label: 'Ready for Pickup',
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-200',
        icon: Package,
      },
      PICKED_UP: {
        label: 'Picked Up by Rider',
        bg: 'bg-teal-100',
        text: 'text-teal-700',
        border: 'border-teal-200',
        icon: Bike,
      },
      DELIVERED: {
        label: 'Delivered',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        icon: CheckCircle,
      },
      COMPLETED: {
        label: 'Completed',
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: CheckCircle,
      },
    };
    return configs[status];
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'new') return order.status === 'PAYMENT_CONFIRMED';
    if (activeFilter === 'preparing') return ['MERCHANT_ACCEPTED', 'PREPARING'].includes(order.status);
    if (activeFilter === 'ready') return order.status === 'READY_FOR_PICKUP';
    if (activeFilter === 'picked_up') return order.status === 'PICKED_UP';
    if (activeFilter === 'completed') return ['DELIVERED', 'COMPLETED'].includes(order.status);
    return true;
  });

  const handleAcceptOrder = (orderId: string) => {
    setOrders(orders.map(o =>
      o.id === orderId ? { ...o, status: 'MERCHANT_ACCEPTED' as OrderStatus } : o
    ));
  };

  const handleRejectOrder = (orderId: string) => {
    setOrders(orders.filter(o => o.id !== orderId));
  };

  const handleStartPreparing = (orderId: string) => {
    setOrders(orders.map(o =>
      o.id === orderId ? { ...o, status: 'PREPARING' as OrderStatus } : o
    ));
  };

  const handleMarkReady = (orderId: string) => {
    setOrders(orders.map(o =>
      o.id === orderId ? { ...o, status: 'READY_FOR_PICKUP' as OrderStatus } : o
    ));
  };

  const handleOpenChat = (riderName: string, orderId: string) => {
    setSelectedRider({ name: riderName, orderId });
    setShowChat(true);
  };

  const handleOpenCall = (riderName: string, orderId: string) => {
    setSelectedRider({ name: riderName, orderId });
    setShowCall(true);
  };

  const handlePrintKOT = (order: Order) => {
    console.log('Printing KOT for order:', order.id);
  };

  // In-App Chat Modal
  if (showChat && selectedRider) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <button onClick={() => { setShowChat(false); setSelectedRider(null); }} className="text-gray-600">
            ← Back
          </button>
          <h2 className="font-semibold">Chat with {selectedRider.name}</h2>
          <div />
        </div>
        <div className="p-4 flex flex-col items-center justify-center h-96">
          <MessageSquare className="h-16 w-16 text-blue-400 mb-4" />
          <p className="text-gray-500">Chat functionality - Secure messaging with rider</p>
          <p className="text-sm text-gray-400 mt-2">Order: {selectedRider.orderId}</p>
        </div>
      </div>
    );
  }

  // In-App Call Modal
  if (showCall && selectedRider) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6">
            <User className="h-12 w-12 text-teal-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedRider.name}</h2>
          <p className="text-gray-500 mb-8">Secure call via Smart Ride</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowCall(false); setSelectedRider(null); }}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center"
            >
              <Phone className="h-8 w-8 text-white" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-4">Tap to end call</p>
        </div>
      </div>
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
            className="flex-1 outline-none text-gray-900"
          />
          <button className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4 text-orange-600" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors",
                activeFilter === filter.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {filter.label}
              {filter.count !== undefined && filter.count > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  activeFilter === filter.id ? 'bg-white/20' : 'bg-gray-100'
                )}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={order.id} className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{order.id}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border flex items-center gap-1",
                        statusConfig.bg, statusConfig.text, statusConfig.border
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{order.orderNumber} • {order.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">UGX {order.total.toLocaleString()}</p>
                    <button
                      onClick={() => handlePrintKOT(order)}
                      className="text-xs text-orange-600 flex items-center gap-1 mt-1"
                    >
                      <Printer className="h-3 w-3" />
                      KOT
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <ul className="space-y-1.5">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
                        <span className="flex-1">
                          {item.name} x{item.quantity}
                          {item.notes && (
                            <span className="text-gray-400 text-xs ml-1">({item.notes})</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Customer & Delivery Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-medium text-gray-900">{order.customer}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{order.deliveryAddress}</span>
                  </div>
                  {order.notes && (
                    <div className="bg-yellow-50 rounded-lg p-2 text-xs text-yellow-700">
                      Note: {order.notes}
                    </div>
                  )}
                </div>

                {/* Order State Machine Actions */}
                {order.status === 'PAYMENT_CONFIRMED' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRejectOrder(order.id)}
                      className="flex-1 py-2.5 rounded-xl bg-red-100 text-red-700 font-medium flex items-center justify-center gap-2 hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept
                    </button>
                  </div>
                )}

                {order.status === 'MERCHANT_ACCEPTED' && (
                  <button
                    onClick={() => handleStartPreparing(order.id)}
                    className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                  >
                    <ChefHat className="h-4 w-4" />
                    Start Preparing
                  </button>
                )}

                {order.status === 'PREPARING' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-purple-600 bg-purple-50 p-2 rounded-lg">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Est. {order.preparationTime || 15} min remaining</span>
                    </div>
                    <button
                      onClick={() => handleMarkReady(order.id)}
                      className="w-full py-2.5 rounded-xl bg-green-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                    >
                      <Package className="h-4 w-4" />
                      Mark Ready for Pickup
                    </button>
                  </div>
                )}

                {order.status === 'READY_FOR_PICKUP' && (
                  <div className="bg-teal-50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <Bike className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.riderName || 'Rider assigned'}</p>
                          <div className="flex items-center gap-1 text-xs text-teal-600">
                            <Shield className="h-3 w-3" />
                            <span>Secure Contact</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenCall(order.riderName || 'Rider', order.id)}
                          className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-colors"
                        >
                          <Phone className="h-5 w-5 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleOpenChat(order.riderName || 'Rider', order.id)}
                          className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                        >
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {order.status === 'PICKED_UP' && (
                  <div className="bg-teal-50 rounded-xl p-3 flex items-center gap-3">
                    <Bike className="h-5 w-5 text-teal-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-teal-800">On the way to customer</p>
                      <p className="text-xs text-teal-600">Rider: {order.riderName}</p>
                    </div>
                  </div>
                )}

                {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                  <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-800">Order completed successfully</p>
                  </div>
                )}
              </Card>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

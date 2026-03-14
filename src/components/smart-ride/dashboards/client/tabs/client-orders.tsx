'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bike,
  Car,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  Heart,
  Clock,
  MapPin,
  ChevronRight,
  Filter
} from 'lucide-react';

type OrderFilter = 'all' | 'rides' | 'food' | 'shopping' | 'deliveries' | 'health';
type OrderStatus = 'active' | 'completed' | 'cancelled';

interface Order {
  id: string;
  type: string;
  category: OrderFilter;
  status: OrderStatus;
  from: string;
  to: string;
  amount: number;
  time: string;
  merchantName?: string;
  riderName?: string;
  icon: React.ElementType;
}

const filterOptions: { id: OrderFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rides', label: 'Rides' },
  { id: 'food', label: 'Food' },
  { id: 'shopping', label: 'Grocery' },
  { id: 'deliveries', label: 'Courier' },
  { id: 'health', label: 'Health' },
];

const activeOrders: Order[] = [
  {
    id: '1',
    type: 'Boda Ride',
    category: 'rides',
    status: 'active',
    from: 'Kampala Central',
    to: 'Nakasero',
    amount: 8500,
    time: 'In progress',
    riderName: 'James K.',
    icon: Bike,
  },
  {
    id: '2',
    type: 'Food Delivery',
    category: 'food',
    status: 'active',
    from: 'Cafe Java',
    to: 'Kololo',
    amount: 50000,
    time: 'On the way',
    merchantName: 'Cafe Java',
    riderName: 'Peter M.',
    icon: UtensilsCrossed,
  },
];

const pastOrders: Order[] = [
  {
    id: '3',
    type: 'Car Ride',
    category: 'rides',
    status: 'completed',
    from: 'Entebbe Airport',
    to: 'Kampala CBD',
    amount: 75000,
    time: 'Yesterday',
    riderName: 'David S.',
    icon: Car,
  },
  {
    id: '4',
    type: 'Smart Grocery',
    category: 'shopping',
    status: 'completed',
    from: 'Shoprite',
    to: 'Ntinda',
    amount: 125000,
    time: '2 days ago',
    merchantName: 'Shoprite',
    icon: ShoppingCart,
  },
  {
    id: '5',
    type: 'Smart Courier',
    category: 'deliveries',
    status: 'completed',
    from: 'Office',
    to: 'Home',
    amount: 15000,
    time: '3 days ago',
    riderName: 'Robert K.',
    icon: Package,
  },
  {
    id: '6',
    type: 'Smart Health',
    category: 'health',
    status: 'cancelled',
    from: 'Health Pharmacy',
    to: 'Muyenga',
    amount: 45000,
    time: '1 week ago',
    merchantName: 'Health Pharmacy',
    icon: Heart,
  },
];

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'active':
      return 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30';
    case 'completed':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'cancelled':
      return 'bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30';
    default:
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
};

export function ClientOrders() {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');

  const filterOrders = (orders: Order[]) => {
    if (activeFilter === 'all') return orders;
    return orders.filter(order => order.category === activeFilter);
  };

  const filteredActiveOrders = filterOrders(activeOrders);
  const filteredPastOrders = filterOrders(pastOrders);
  const hasOrders = filteredActiveOrders.length > 0 || filteredPastOrders.length > 0;

  return (
    <div className="min-h-screen bg-[#0D0D12] pb-4">
      {/* Header */}
      <div className="bg-[#13131A] px-4 py-4 border-b border-white/5 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-white">My Orders</h1>
      </div>

      {/* Filter Tabs */}
      <div className="bg-[#13131A] px-4 py-3 border-b border-white/5 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeFilter === filter.id
                  ? "bg-[#00FF88] text-[#0D0D12]"
                  : "bg-[#1A1A24] text-gray-400 hover:bg-white/10"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {!hasOrders ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-[#1A1A24] rounded-full flex items-center justify-center mb-4">
              <Filter className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No orders found</h3>
            <p className="text-gray-500 text-center text-sm">
              {activeFilter === 'all'
                ? "You haven't placed any orders yet."
                : `No ${activeFilter} orders to display.`}
            </p>
          </div>
        ) : (
          <>
            {/* Active Orders */}
            {filteredActiveOrders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Active Orders
                </h2>
                <div className="space-y-3">
                  {filteredActiveOrders.map((order) => {
                    const Icon = order.icon;
                    return (
                      <Card key={order.id} className="p-4 bg-[#13131A] border-white/5 border-l-4 border-l-[#00FF88] hover:border-[#00FF88]/30 transition-all cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#00FF88]/15 rounded-xl flex items-center justify-center">
                            <Icon className="h-6 w-6 text-[#00FF88]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-white">{order.type}</h3>
                              <Badge className={cn("text-xs border", getStatusColor(order.status))}>
                                {order.status}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{order.from} → {order.to}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{order.time}</span>
                              </div>
                              <span className="font-semibold text-white">
                                UGX {order.amount.toLocaleString()}
                              </span>
                            </div>
                            {order.riderName && (
                              <p className="text-xs text-gray-400 mt-2">
                                Rider: {order.riderName}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Orders */}
            {filteredPastOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Past Orders
                </h2>
                <div className="space-y-3">
                  {filteredPastOrders.map((order) => {
                    const Icon = order.icon;
                    return (
                      <Card key={order.id} className="p-4 bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#1A1A24] rounded-xl flex items-center justify-center">
                            <Icon className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-white">{order.type}</h3>
                              <Badge className={cn("text-xs border", getStatusColor(order.status))}>
                                {order.status}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{order.from} → {order.to}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{order.time}</span>
                              </div>
                              <span className="font-semibold text-white">
                                UGX {order.amount.toLocaleString()}
                              </span>
                            </div>
                            {order.merchantName && (
                              <p className="text-xs text-gray-400 mt-2">
                                Merchant: {order.merchantName}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

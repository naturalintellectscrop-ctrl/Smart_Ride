'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type OrderFilter = 'all' | 'food' | 'shopping' | 'deliveries' | 'health';

interface OrderDisplay {
  id: string;
  orderNumber: string;
  type: string;
  category: OrderFilter;
  status: string;
  from: string;
  to: string;
  amount: number;
  time: string;
  merchantName?: string;
  riderName?: string;
  icon: React.ElementType;
  isActive: boolean;
}

const filterOptions: { id: OrderFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'shopping', label: 'Grocery' },
  { id: 'deliveries', label: 'Courier' },
  { id: 'health', label: 'Health' },
];

const ACTIVE_STATUSES = ['ORDER_CREATED', 'PAYMENT_CONFIRMED', 'MERCHANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'];
const COMPLETED_STATUSES = ['DELIVERED', 'COMPLETED', 'CLOSED'];
const CANCELLED_STATUSES = ['CANCELLED', 'REJECTED'];

function mapOrderTypeToCategory(orderType: string, taskType?: string): OrderFilter {
  if (orderType === 'SHOPPING') return 'shopping';
  if (orderType === 'FOOD_DELIVERY') return 'food';
  if (taskType === 'ITEM_DELIVERY') return 'deliveries';
  if (taskType === 'SMART_HEALTH_DELIVERY') return 'health';
  if (orderType?.includes('HEALTH') || orderType?.includes('PHARMACY')) return 'health';
  return 'deliveries';
}

function getOrderTypeLabel(orderType: string): string {
  switch (orderType) {
    case 'FOOD_DELIVERY': return 'Food Delivery';
    case 'SHOPPING': return 'Smart Grocery';
    case 'ITEM_DELIVERY': return 'Smart Courier';
    case 'SMART_HEALTH_DELIVERY': return 'Smart Health';
    default: return orderType?.replace(/_/g, ' ') || 'Order';
  }
}

function getOrderTypeIcon(category: OrderFilter): React.ElementType {
  switch (category) {
    case 'food': return UtensilsCrossed;
    case 'shopping': return ShoppingCart;
    case 'deliveries': return Package;
    case 'health': return Heart;
    default: return Package;
  }
}

function getDisplayStatus(status: string): string {
  switch (status) {
    case 'ORDER_CREATED': return 'Created';
    case 'PAYMENT_CONFIRMED': return 'Confirmed';
    case 'MERCHANT_ACCEPTED': return 'Accepted';
    case 'PREPARING': return 'Preparing';
    case 'READY_FOR_PICKUP': return 'Ready';
    case 'PICKED_UP': return 'On the way';
    case 'DELIVERED': return 'Delivered';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    case 'REJECTED': return 'Rejected';
    default: return status?.replace(/_/g, ' ') || 'Unknown';
  }
}

function getStatusColor(status: string): string {
  if (ACTIVE_STATUSES.includes(status)) {
    return 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30';
  }
  if (COMPLETED_STATUSES.includes(status)) {
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  }
  if (CANCELLED_STATUSES.includes(status)) {
    return 'bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30';
  }
  return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function ClientOrders() {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [orders, setOrders] = useState<OrderDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/orders?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      const orderList = data.success && data.data ? (data.data.items || data.data || []) : [];

      const mapped: OrderDisplay[] = orderList.map((o: Record<string, unknown>) => {
        const category = mapOrderTypeToCategory(
          o.orderType as string,
          o.task?.taskType as string | undefined
        );
        const isActive = ACTIVE_STATUSES.includes(o.status as string);
        const merchant = o.merchant as Record<string, unknown> | null;
        const task = o.task as Record<string, unknown> | null;
        const rider = task?.rider as Record<string, unknown> | null;

        return {
          id: o.id as string,
          orderNumber: (o.orderNumber as string) || (o.id as string),
          type: getOrderTypeLabel(o.orderType as string),
          category,
          status: o.status as string,
          from: merchant?.name as string || (o.pickupAddress as string) || 'Store',
          to: (o.deliveryAddress as string) || 'Delivery location',
          amount: (o.totalAmount as number) || 0,
          time: isActive ? getDisplayStatus(o.status as string) : formatTimeAgo(o.createdAt as string),
          merchantName: merchant?.name as string | undefined,
          riderName: rider?.fullName as string | undefined,
          icon: getOrderTypeIcon(category),
          isActive,
        };
      });

      setOrders(mapped);
    } catch (err: any) {
      console.error('[ClientOrders] Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filterOrders = (orderList: OrderDisplay[]) => {
    if (activeFilter === 'all') return orderList;
    return orderList.filter(order => order.category === activeFilter);
  };

  const activeOrdersList = orders.filter(o => o.isActive);
  const pastOrdersList = orders.filter(o => !o.isActive);
  const filteredActiveOrders = filterOrders(activeOrdersList);
  const filteredPastOrders = filterOrders(pastOrdersList);
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 text-[#00FF88] animate-spin mb-4" />
            <p className="text-gray-400">Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
            <p className="text-white font-medium mb-2">Failed to load orders</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <Button onClick={fetchOrders} variant="outline" className="border-[#00FF88]/30 text-[#00FF88]">
              Retry
            </Button>
          </div>
        ) : !hasOrders ? (
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
                                {getDisplayStatus(order.status)}
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
                <div className="space-y-3 max-h-96 overflow-y-auto">
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
                                {getDisplayStatus(order.status)}
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

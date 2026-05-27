'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Printer,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type OrderFilter = 'all' | 'new' | 'preparing' | 'ready' | 'picked_up' | 'completed';

type OrderStatus =
  | 'PAYMENT_CONFIRMED'
  | 'MERCHANT_ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  client: { id: string; name: string; phone: string };
  deliveryAddress: string;
  status: OrderStatus;
  rider?: { id: string; fullName: string; phone: string; rating: number };
  kot?: { id: string; kotNumber: string; status: string };
  createdAt: string;
  paymentMethod: string;
  notes?: string;
}

interface MerchantOrdersProps {
  merchantId?: string;
}

export function MerchantOrders({ merchantId }: MerchantOrdersProps) {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '50',
      });
      if (merchantId) {
        params.set('merchantId', merchantId);
      }
      const response = await fetch(`/api/orders?${params}`);
      const data = await response.json();

      if (data.success === false) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      const orderList = Array.isArray(data.data) ? data.data : [];
      setOrders(orderList.map((o: Record<string, unknown>) => ({
        id: o.id,
        orderNumber: o.orderNumber || o.id,
        items: (o.items || []).map((i: Record<string, unknown>) => ({
          id: i.id,
          itemName: i.itemName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          specialInstructions: i.specialInstructions,
        })),
        totalAmount: o.totalAmount || 0,
        client: o.client || { id: '', name: 'Customer', phone: '' },
        deliveryAddress: o.deliveryAddress || '',
        status: o.status || 'PAYMENT_CONFIRMED',
        rider: o.task?.rider || null,
        kot: o.kot || null,
        createdAt: o.createdAt || new Date().toISOString(),
        paymentMethod: o.paymentMethod || 'CASH',
        notes: o.deliveryInstructions || '',
      })));
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      const response = await fetch(`/api/orders/${orderId}?action=accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchantId || '',
          estimatedPrepTime: 15,
        }),
      });
      const data = await response.json();
      if (data.success === false) throw new Error(data.error);

      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'MERCHANT_ACCEPTED' as OrderStatus } : o
      ));
    } catch (err) {
      console.error('Failed to accept order:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}?action=reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchantId || '',
          reason: 'Unable to fulfill order at this time',
        }),
      });
      const data = await response.json();
      if (data.success === false) throw new Error(data.error);

      setOrders(orders.filter(o => o.id !== orderId));
    } catch (err) {
      console.error('Failed to reject order:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartPreparing = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}?action=preparing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (data.success === false) throw new Error(data.error);

      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'PREPARING' as OrderStatus } : o
      ));
    } catch (err) {
      console.error('Failed to start preparing:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}?action=ready`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchantId || '',
        }),
      });
      const data = await response.json();
      if (data.success === false) throw new Error(data.error);

      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: 'READY_FOR_PICKUP' as OrderStatus } : o
      ));
    } catch (err) {
      console.error('Failed to mark ready:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintKOT = (order: Order) => {
    // KOT is already created in the backend on payment confirmation
    // This just triggers a print action in the merchant's browser
    const kotContent = `
KITCHEN ORDER TICKET
====================
Order: ${order.orderNumber}
Time: ${new Date(order.createdAt).toLocaleTimeString()}
Status: ${order.kot?.status || 'GENERATED'}

ITEMS:
${order.items.map(i => `  ${i.quantity}x ${i.itemName}${i.specialInstructions ? ` (${i.specialInstructions})` : ''}`).join('\n')}

${order.notes ? `NOTES: ${order.notes}` : ''}
====================
    `;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; font-size: 14px; padding: 20px;">${kotContent}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filters: { id: OrderFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: orders.length },
    { id: 'new', label: 'New', count: orders.filter(o => o.status === 'PAYMENT_CONFIRMED').length },
    { id: 'preparing', label: 'Preparing', count: orders.filter(o => ['MERCHANT_ACCEPTED', 'PREPARING'].includes(o.status)).length },
    { id: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'READY_FOR_PICKUP').length },
    { id: 'picked_up', label: 'Picked Up', count: orders.filter(o => o.status === 'PICKED_UP').length },
    { id: 'completed', label: 'Completed', count: orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length },
  ];

  const getStatusConfig = (status: OrderStatus) => {
    const configs: Record<OrderStatus, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
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
      CANCELLED: {
        label: 'Cancelled',
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: XCircle,
      },
      REJECTED: {
        label: 'Rejected',
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: XCircle,
      },
    };
    return configs[status] || configs.PAYMENT_CONFIRMED;
  };

  const filteredOrders = orders.filter((order) => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !order.orderNumber.toLowerCase().includes(query) &&
        !order.client.name.toLowerCase().includes(query) &&
        !order.items.some(i => i.itemName.toLowerCase().includes(query))
      ) {
        return false;
      }
    }

    if (activeFilter === 'all') return true;
    if (activeFilter === 'new') return order.status === 'PAYMENT_CONFIRMED';
    if (activeFilter === 'preparing') return ['MERCHANT_ACCEPTED', 'PREPARING'].includes(order.status);
    if (activeFilter === 'ready') return order.status === 'READY_FOR_PICKUP';
    if (activeFilter === 'picked_up') return order.status === 'PICKED_UP';
    if (activeFilter === 'completed') return ['DELIVERED', 'COMPLETED'].includes(order.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500">Manage all your orders</p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={cn("h-5 w-5 text-gray-500", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">x</button>
          </div>
        </div>
      )}

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

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-orange-400 mb-4" />
            <p className="text-gray-500">Loading orders...</p>
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              const isActionLoading = actionLoading === order.id;

              return (
                <Card key={order.id} className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{order.orderNumber}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full border flex items-center gap-1",
                          statusConfig.bg, statusConfig.text, statusConfig.border
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">UGX {order.totalAmount.toLocaleString()}</p>
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
                            {item.itemName} x{item.quantity}
                            {item.specialInstructions && (
                              <span className="text-gray-400 text-xs ml-1">({item.specialInstructions})</span>
                            )}
                          </span>
                          <span className="text-gray-500 text-xs">UGX {(item.unitPrice * item.quantity).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Customer & Delivery Info */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Customer:</span>
                      <span className="font-medium text-gray-900">{order.client.name}</span>
                      {order.client.phone && (
                        <a href={`tel:${order.client.phone}`} className="text-orange-600 hover:underline">
                          <Phone className="h-3 w-3" />
                        </a>
                      )}
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

                  {/* Loading overlay */}
                  {isActionLoading && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      <span className="ml-2 text-sm text-gray-500">Processing...</span>
                    </div>
                  )}

                  {/* Order State Machine Actions */}
                  {!isActionLoading && order.status === 'PAYMENT_CONFIRMED' && (
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

                  {!isActionLoading && order.status === 'MERCHANT_ACCEPTED' && (
                    <button
                      onClick={() => handleStartPreparing(order.id)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                    >
                      <ChefHat className="h-4 w-4" />
                      Start Preparing
                    </button>
                  )}

                  {!isActionLoading && order.status === 'PREPARING' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-purple-600 bg-purple-50 p-2 rounded-lg">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Preparing in progress</span>
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

                  {!isActionLoading && order.status === 'READY_FOR_PICKUP' && (
                    <div className="bg-teal-50 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                            <Bike className="h-5 w-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.rider ? order.rider.fullName : 'Searching for rider...'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-teal-600">
                              <Shield className="h-3 w-3" />
                              <span>Secure Contact</span>
                            </div>
                          </div>
                        </div>
                        {order.rider && (
                          <div className="flex gap-2">
                            <a
                              href={`tel:${order.rider.phone}`}
                              className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-colors"
                            >
                              <Phone className="h-5 w-5 text-emerald-600" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isActionLoading && order.status === 'PICKED_UP' && (
                    <div className="bg-teal-50 rounded-xl p-3 flex items-center gap-3">
                      <Bike className="h-5 w-5 text-teal-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-teal-800">On the way to customer</p>
                        <p className="text-xs text-teal-600">Rider: {order.rider?.fullName || 'Assigned rider'}</p>
                      </div>
                    </div>
                  )}

                  {!isActionLoading && (order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                    <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-800">Order completed successfully</p>
                    </div>
                  )}
                </Card>
              );
            })}

            {filteredOrders.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No orders found</p>
                <button
                  onClick={fetchOrders}
                  className="mt-2 text-sm text-orange-600 hover:underline"
                >
                  Refresh orders
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

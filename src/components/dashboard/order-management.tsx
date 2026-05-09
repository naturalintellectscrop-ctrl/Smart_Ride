'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ClipboardList, 
  Loader2,
  Package,
  ShoppingBag,
  Utensils,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  client: { name: string; email: string };
  merchant: { name: string } | null;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'ORDER_CREATED': return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' };
    case 'PAYMENT_CONFIRMED': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
    case 'MERCHANT_ACCEPTED': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' };
    case 'PREPARING': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
    case 'READY_FOR_PICKUP': return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' };
    case 'PICKED_UP': return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' };
    case 'DELIVERED': return { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' };
    case 'CANCELLED':
    case 'REJECTED': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
    default: return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getOrderTypeStyle = (type: string) => {
  switch (type) {
    case 'FOOD_DELIVERY': return { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Utensils };
    case 'SHOPPING': return { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: ShoppingBag };
    default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Package };
  }
};

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/orders?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00FF88]" />
          <p className="text-gray-400 text-sm">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="glass-card rounded-2xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4 mx-auto" />
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchOrders}
            className="px-6 py-2.5 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
              <ClipboardList className="h-5 w-5 text-[#00FF88]" />
            </div>
            Order Management
          </h1>
          <p className="text-gray-400 mt-1">Track and manage all orders</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-white">{orders.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <ShoppingCart className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-amber-400">{orders.filter(o => o.status === 'ORDER_CREATED').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-blue-400">{orders.filter(o => ['PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'].includes(o.status)).length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card glow-hover rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-emerald-400">{orders.filter(o => o.status === 'DELIVERED').length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">All Orders</CardTitle>
          <CardDescription className="text-gray-500">View and manage customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4 border border-gray-500/20">
                <ClipboardList className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-400">No orders yet</p>
              <p className="text-gray-500 text-sm mt-1">Orders will appear here when customers place them</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400">Order #</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Customer</TableHead>
                    <TableHead className="text-gray-400">Merchant</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const statusStyle = getStatusStyle(order.status);
                    const typeStyle = getOrderTypeStyle(order.orderType);
                    const TypeIcon = typeStyle.icon;
                    return (
                      <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{order.orderNumber}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${typeStyle.bg} border border-white/10`}>
                            <TypeIcon className={`h-3.5 w-3.5 ${typeStyle.text}`} />
                            <span className={`text-sm ${typeStyle.text}`}>{order.orderType.replace(/_/g, ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{order.client?.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{order.client?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">{order.merchant?.name || 'N/A'}</TableCell>
                        <TableCell className="font-medium text-white">{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

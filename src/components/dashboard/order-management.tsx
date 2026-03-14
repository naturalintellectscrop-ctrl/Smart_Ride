'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ShoppingCart, 
  Search, 
  MoreHorizontal, 
  Download,
  Clock,
  Eye,
  ChefHat,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  Utensils,
  Store
} from 'lucide-react';

// Mock data
const mockOrders = [
  { 
    id: 'ORD001', 
    orderNumber: 'SR-2024-02847',
    client: { name: 'John Doe', phone: '+256 700 123 456' },
    merchant: { name: 'Cafe Java', type: 'RESTAURANT' },
    orderType: 'FOOD_DELIVERY',
    status: 'DELIVERED',
    paymentStatus: 'COMPLETED',
    paymentMethod: 'MOBILE_MONEY_MTN',
    items: 3,
    subtotal: 45000,
    deliveryFee: 5000,
    totalAmount: 50000,
    deliveryAddress: 'Plot 45, Kampala Road',
    createdAt: '2024-03-15 12:30',
    deliveredAt: '2024-03-15 13:15',
  },
  { 
    id: 'ORD002', 
    orderNumber: 'SR-2024-02848',
    client: { name: 'Jane Smith', phone: '+256 701 234 567' },
    merchant: { name: 'Uchumi Supermarket', type: 'SUPERMARKET' },
    orderType: 'SHOPPING',
    status: 'READY_FOR_PICKUP',
    paymentStatus: 'COMPLETED',
    paymentMethod: 'VISA',
    items: 8,
    subtotal: 120000,
    deliveryFee: 8000,
    totalAmount: 128000,
    deliveryAddress: 'Ntinda, Kampala',
    createdAt: '2024-03-15 12:45',
    deliveredAt: null,
  },
  { 
    id: 'ORD003', 
    orderNumber: 'SR-2024-02849',
    client: { name: 'Mike Johnson', phone: '+256 702 345 678' },
    merchant: { name: 'Pizza Hut', type: 'RESTAURANT' },
    orderType: 'FOOD_DELIVERY',
    status: 'PREPARING',
    paymentStatus: 'COMPLETED',
    paymentMethod: 'CASH',
    items: 2,
    subtotal: 65000,
    deliveryFee: 5000,
    totalAmount: 70000,
    deliveryAddress: 'Kololo, Kampala',
    createdAt: '2024-03-15 13:00',
    deliveredAt: null,
  },
  { 
    id: 'ORD004', 
    orderNumber: 'SR-2024-02850',
    client: { name: 'Sarah Wilson', phone: '+256 703 456 789' },
    merchant: { name: 'Cafe Java', type: 'RESTAURANT' },
    orderType: 'FOOD_DELIVERY',
    status: 'MERCHANT_ACCEPTED',
    paymentStatus: 'COMPLETED',
    paymentMethod: 'MOBILE_MONEY_AIRTEL',
    items: 4,
    subtotal: 80000,
    deliveryFee: 5000,
    totalAmount: 85000,
    deliveryAddress: 'Makindye, Kampala',
    createdAt: '2024-03-15 13:10',
    deliveredAt: null,
  },
  { 
    id: 'ORD005', 
    orderNumber: 'SR-2024-02851',
    client: { name: 'Peter Brown', phone: '+256 704 567 890' },
    merchant: { name: 'Health Plus Pharmacy', type: 'PHARMACY' },
    orderType: 'SHOPPING',
    status: 'PAYMENT_CONFIRMED',
    paymentStatus: 'COMPLETED',
    paymentMethod: 'MASTERCARD',
    items: 2,
    subtotal: 35000,
    deliveryFee: 4000,
    totalAmount: 39000,
    deliveryAddress: 'Entebbe Road',
    createdAt: '2024-03-15 13:15',
    deliveredAt: null,
  },
  { 
    id: 'ORD006', 
    orderNumber: 'SR-2024-02852',
    client: { name: 'Grace Nakamya', phone: '+256 705 678 901' },
    merchant: { name: 'Fresh Mart', type: 'GROCERY' },
    orderType: 'SHOPPING',
    status: 'ORDER_CREATED',
    paymentStatus: 'PENDING',
    paymentMethod: 'CASH',
    items: 5,
    subtotal: 55000,
    deliveryFee: 6000,
    totalAmount: 61000,
    deliveryAddress: 'Nakasero, Kampala',
    createdAt: '2024-03-15 13:20',
    deliveredAt: null,
  },
];

export function OrderManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || order.orderType === typeFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeOrders = filteredOrders.filter(o => 
    ['ORDER_CREATED', 'PAYMENT_CONFIRMED', 'MERCHANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'].includes(o.status)
  );
  const completedOrders = filteredOrders.filter(o => o.status === 'DELIVERED');
  const cancelledOrders = filteredOrders.filter(o => ['CANCELLED', 'REJECTED'].includes(o.status));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ORDER_CREATED': return 'bg-gray-100 text-gray-700';
      case 'PAYMENT_CONFIRMED': return 'bg-blue-100 text-blue-700';
      case 'MERCHANT_ACCEPTED': return 'bg-indigo-100 text-indigo-700';
      case 'PREPARING': return 'bg-orange-100 text-orange-700';
      case 'READY_FOR_PICKUP': return 'bg-amber-100 text-amber-700';
      case 'PICKED_UP': return 'bg-teal-100 text-teal-700';
      case 'DELIVERED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      case 'REJECTED': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ORDER_CREATED': return <ShoppingCart className="h-4 w-4" />;
      case 'PAYMENT_CONFIRMED': return <CheckCircle className="h-4 w-4" />;
      case 'MERCHANT_ACCEPTED': return <Store className="h-4 w-4" />;
      case 'PREPARING': return <ChefHat className="h-4 w-4" />;
      case 'READY_FOR_PICKUP': return <Package className="h-4 w-4" />;
      case 'PICKED_UP': return <Truck className="h-4 w-4" />;
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderOrderTable = (orders: typeof mockOrders) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">{order.items} items</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{order.client.name}</p>
                  <p className="text-sm text-gray-500">{order.client.phone}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {order.merchant.type === 'RESTAURANT' ? (
                    <Utensils className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Store className="h-4 w-4 text-blue-500" />
                  )}
                  <span>{order.merchant.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {order.orderType === 'FOOD_DELIVERY' ? 'Food' : 'Smart Grocery'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.status)} variant="secondary">
                  <span className="flex items-center gap-1">
                    {getStatusIcon(order.status)}
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getPaymentStatusColor(order.paymentStatus)} variant="secondary">
                  {order.paymentStatus}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{formatCurrency(order.totalAmount)}</TableCell>
              <TableCell className="text-gray-500">{order.createdAt}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Dialog>
                      <DialogTrigger asChild>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Order {order.orderNumber}</DialogTitle>
                          <DialogDescription>
                            Order details and status
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                          <div>
                            <p className="text-sm text-gray-500">Client</p>
                            <p className="font-medium">{order.client.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Merchant</p>
                            <p className="font-medium">{order.merchant.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <Badge className={getStatusColor(order.status)} variant="secondary">
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Payment</p>
                            <Badge className={getPaymentStatusColor(order.paymentStatus)} variant="secondary">
                              {order.paymentStatus}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-500">Delivery Address</p>
                            <p className="font-medium">{order.deliveryAddress}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Subtotal</p>
                            <p className="font-medium">{formatCurrency(order.subtotal)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Delivery Fee</p>
                            <p className="font-medium">{formatCurrency(order.deliveryFee)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-xl font-bold">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <DropdownMenuItem>
                      <Package className="h-4 w-4 mr-2" />
                      View KOT
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Order
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 mt-1">Food delivery and shopping orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Orders</p>
                <p className="text-2xl font-bold">1,245</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Orders</p>
                <p className="text-2xl font-bold text-amber-600">156</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">1,078</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's Revenue</p>
                <p className="text-2xl font-bold text-green-600">UGX 15.2M</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="FOOD_DELIVERY">Food Delivery</SelectItem>
                  <SelectItem value="SHOPPING">Smart Grocery</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ORDER_CREATED">Order Created</SelectItem>
                  <SelectItem value="PAYMENT_CONFIRMED">Payment Confirmed</SelectItem>
                  <SelectItem value="MERCHANT_ACCEPTED">Merchant Accepted</SelectItem>
                  <SelectItem value="PREPARING">Preparing</SelectItem>
                  <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                  <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Clock className="h-4 w-4" />
            Active
            <Badge variant="secondary" className="ml-1">{activeOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
              <CardDescription>Orders currently in progress</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrderTable(activeOrders)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Orders</CardTitle>
              <CardDescription>Successfully delivered orders</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrderTable(completedOrders)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Orders</CardTitle>
              <CardDescription>Orders that were cancelled or rejected</CardDescription>
            </CardHeader>
            <CardContent>
              {cancelledOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No cancelled orders
                </div>
              ) : (
                renderOrderTable(cancelledOrders)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>Complete order history</CardDescription>
            </CardHeader>
            <CardContent>
              {renderOrderTable(filteredOrders)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

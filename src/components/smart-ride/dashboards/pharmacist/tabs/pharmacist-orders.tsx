'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Package,
  Search,
  Filter,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  Navigation
} from 'lucide-react';

type OrderFilter = 'all' | 'pending' | 'preparing' | 'ready' | 'completed';

export function PharmacistOrders() {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');

  const orders = [
    {
      id: 'ORD-2024-001',
      customer: 'Mary Ssebunya',
      phone: '+256 700 111 222',
      address: 'Plot 45, Ntinda Road',
      items: [
        { name: 'Paracetamol 500mg', qty: 2, price: 15000 },
        { name: 'Vitamin C 1000mg', qty: 1, price: 25000 },
      ],
      total: 55000,
      status: 'pending',
      time: '10 min ago',
      prescription: true,
    },
    {
      id: 'ORD-2024-002',
      customer: 'James Mukasa',
      phone: '+256 700 333 444',
      address: 'Kampala CBD, Suite 12',
      items: [
        { name: 'Amoxicillin 250mg', qty: 1, price: 45000 },
        { name: 'Ibuprofen 400mg', qty: 2, price: 20000 },
      ],
      total: 85000,
      status: 'preparing',
      time: '25 min ago',
      prescription: true,
    },
    {
      id: 'ORD-2024-003',
      customer: 'Grace Namugga',
      phone: '+256 700 555 666',
      address: 'Kololo Hill, House 23',
      items: [
        { name: 'ORS Sachets', qty: 5, price: 5000 },
        { name: 'Zinc Tablets', qty: 1, price: 12000 },
      ],
      total: 37000,
      status: 'ready',
      time: '45 min ago',
      prescription: false,
    },
    {
      id: 'ORD-2024-004',
      customer: 'Peter Kato',
      phone: '+256 700 777 888',
      address: 'Nakasero Market Area',
      items: [
        { name: 'Antihistamine', qty: 1, price: 35000 },
      ],
      total: 42000,
      status: 'completed',
      time: '1 hr ago',
      prescription: false,
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'preparing':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ready':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'New Order';
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready for Pickup';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const filteredOrders = activeFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === activeFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
      </div>

      {/* Search and Filter */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders..."
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <button className="w-12 h-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center">
            <Filter className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeFilter === filter.id
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 mt-4 pb-6">
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{order.id}</span>
                    {order.prescription && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Rx Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{order.time}</p>
                </div>
                <Badge className={cn("text-xs", getStatusColor(order.status))}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                    <span className="font-bold text-rose-600">
                      {order.customer.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{order.customer}</p>
                    <p className="text-sm text-gray-500">{order.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span>{order.address}</span>
                </div>
              </div>

              {/* Items */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                <div className="space-y-1">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.name} x{item.qty}</span>
                      <span className="text-gray-900 font-medium">UGX {item.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="font-bold text-rose-600">UGX {order.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              {order.status === 'pending' && (
                <button className="w-full py-3 rounded-xl bg-rose-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors">
                  <CheckCircle className="h-5 w-5" />
                  Start Preparing
                </button>
              )}
              {order.status === 'preparing' && (
                <button className="w-full py-3 rounded-xl bg-green-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
                  <CheckCircle className="h-5 w-5" />
                  Mark as Ready
                </button>
              )}
              {order.status === 'ready' && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <Navigation className="h-5 w-5" />
                  <span className="text-sm font-medium">Waiting for rider pickup</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

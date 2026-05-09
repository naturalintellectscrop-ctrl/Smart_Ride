'use client';

import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { 
  Bike,
  Car,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

type OrderStatus = 'completed' | 'cancelled' | 'in_progress';

interface Order {
  id: string;
  type: string;
  typeLabel: string;
  from: string;
  to: string;
  amount: number;
  status: OrderStatus;
  date: string;
  riderName?: string;
}

export function OrdersHistory() {
  const orders: Order[] = [
    {
      id: '1',
      type: 'boda',
      typeLabel: 'Boda Ride',
      from: 'Kampala Central',
      to: 'Nakasero',
      amount: 8500,
      status: 'completed',
      date: 'Today, 2:30 PM',
      riderName: 'Emmanuel O.',
    },
    {
      id: '2',
      type: 'food',
      typeLabel: 'Food Delivery',
      from: 'Cafe Java',
      to: 'Kololo',
      amount: 50000,
      status: 'completed',
      date: 'Today, 12:45 PM',
      riderName: 'Grace N.',
    },
    {
      id: '3',
      type: 'smart-courier',
      typeLabel: 'Smart Courier',
      from: 'DTB Bank',
      to: 'Ntinda',
      amount: 15000,
      status: 'in_progress',
      date: 'Today, 11:00 AM',
      riderName: 'David M.',
    },
    {
      id: '4',
      type: 'car',
      typeLabel: 'Car Ride',
      from: 'Airport',
      to: 'Kampala CBD',
      amount: 85000,
      status: 'cancelled',
      date: 'Yesterday',
    },
    {
      id: '5',
      type: 'smart-grocery',
      typeLabel: 'Smart Grocery',
      from: 'Uchumi Supermarket',
      to: 'Makindye',
      amount: 128000,
      status: 'completed',
      date: 'Yesterday',
      riderName: 'Sarah N.',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'boda': return <Bike className="h-5 w-5" />;
      case 'car': return <Car className="h-5 w-5" />;
      case 'food': return <UtensilsCrossed className="h-5 w-5" />;
      case 'smart-grocery': return <ShoppingCart className="h-5 w-5" />;
      case 'smart-courier': return <Package className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
            <CheckCircle className="h-3 w-3" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'boda': return 'bg-emerald-100 text-emerald-600';
      case 'car': return 'bg-blue-100 text-blue-600';
      case 'food': return 'bg-orange-100 text-orange-600';
      case 'smart-grocery': return 'bg-purple-100 text-purple-600';
      case 'smart-courier': return 'bg-teal-100 text-teal-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="My Orders" />
      
      <div className="px-4 pt-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {['All', 'Rides', 'Food', 'Grocery', 'Courier'].map((filter) => (
            <button
              key={filter}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === 'All' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {orders.map((order) => (
            <MobileCard key={order.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(order.type)}`}>
                  {getTypeIcon(order.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{order.typeLabel}</h3>
                      <p className="text-sm text-gray-500">{order.date}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{order.from}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Navigation className="h-3 w-3 text-orange-500 flex-shrink-0" />
                      <span className="truncate">{order.to}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {order.riderName && (
                      <span className="text-sm text-gray-500">by {order.riderName}</span>
                    )}
                    <span className="font-bold text-gray-900">UGX {order.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      </div>
    </div>
  );
}

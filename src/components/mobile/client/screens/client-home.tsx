'use client';

import { useState, useEffect } from 'react';
import { MobileCard, ServiceButton } from '../../shared/mobile-components';
import { 
  Bike, 
  Car, 
  UtensilsCrossed, 
  ShoppingCart, 
  Package,
  Heart,
  MapPin,
  Search,
  Clock,
  Star,
  ChevronRight
} from 'lucide-react';

// Helper function to get time-based greeting
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
}

// Helper function to get greeting emoji
function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return '👋';
  } else if (hour >= 12 && hour < 17) {
    return '☀️';
  } else if (hour >= 17 && hour < 21) {
    return '🌅';
  } else {
    return '🌙';
  }
}

interface ClientHomeProps {
  onServiceSelect: (service: string) => void;
}

export function ClientHome({ onServiceSelect }: ClientHomeProps) {
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const [emoji, setEmoji] = useState(getGreetingEmoji());

  // Update greeting every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
      setEmoji(getGreetingEmoji());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const services = [
    { 
      id: 'boda', 
      label: 'Smart Boda', 
      icon: <Bike className="h-8 w-8" />, 
      color: 'emerald',
      description: 'Quick motorcycle rides'
    },
    { 
      id: 'car', 
      label: 'Smart Car', 
      icon: <Car className="h-8 w-8" />, 
      color: 'blue',
      description: 'Comfortable car rides'
    },
    { 
      id: 'food', 
      label: 'Food Delivery', 
      icon: <UtensilsCrossed className="h-8 w-8" />, 
      color: 'orange',
      description: 'Restaurant deliveries'
    },
    { 
      id: 'health', 
      label: 'Smart Health', 
      icon: <Heart className="h-8 w-8" />, 
      color: 'rose',
      description: 'Pharmacy & medicines'
    },
    { 
      id: 'smart-grocery', 
      label: 'Smart Grocery', 
      icon: <ShoppingCart className="h-8 w-8" />, 
      color: 'purple',
      description: 'Groceries & retail'
    },
    { 
      id: 'smart-courier', 
      label: 'Smart Courier', 
      icon: <Package className="h-8 w-8" />, 
      color: 'teal',
      description: 'Send packages anywhere'
    },
  ];

  const recentOrders = [
    { id: '1', type: 'Boda Ride', from: 'Kampala Central', to: 'Nakasero', amount: 8500, time: '2 hours ago' },
    { id: '2', type: 'Food Delivery', from: 'Cafe Java', to: 'Kololo', amount: 50000, time: 'Yesterday' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Location */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-emerald-100 text-sm">{greeting} {emoji}</p>
            <h1 className="text-white text-xl font-bold">John Doe</h1>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <MapPin className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-lg">
          <Search className="h-5 w-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Where to?" 
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-4 -mt-4">
        <MobileCard className="p-2">
          <div className="grid grid-cols-3 gap-2">
            {services.slice(0, 3).map((service) => (
              <ServiceButton
                key={service.id}
                icon={service.icon}
                label={service.label}
                color={service.color}
                onClick={() => onServiceSelect(service.id)}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {services.slice(3).map((service) => (
              <ServiceButton
                key={service.id}
                icon={service.icon}
                label={service.label}
                color={service.color}
                onClick={() => onServiceSelect(service.id)}
              />
            ))}
          </div>
        </MobileCard>
      </div>

      {/* Promotions */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-100">Special Offer</p>
              <h3 className="text-xl font-bold">20% OFF</h3>
              <p className="text-sm mt-1">On your next 3 rides!</p>
            </div>
            <div className="text-5xl">🎉</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 mt-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <button className="text-emerald-600 text-sm font-medium">See all</button>
        </div>
        
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <MobileCard key={order.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                  {order.type === 'Boda Ride' ? (
                    <Bike className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{order.type}</h3>
                    <span className="font-semibold text-gray-900">UGX {order.amount.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{order.from} → {order.to}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{order.time}</span>
                  </div>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>

        {/* Favorite Places */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Favorite Places</h2>
          <div className="grid grid-cols-2 gap-3">
            <MobileCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Home</p>
                  <p className="text-xs text-gray-500">Ntinda, Kampala</p>
                </div>
              </div>
            </MobileCard>
            <MobileCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Work</p>
                  <p className="text-xs text-gray-500">Kampala CBD</p>
                </div>
              </div>
            </MobileCard>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ChevronRight,
  Star,
  Bell,
  Zap
} from 'lucide-react';
// Client Home Component
import { useNotifications } from '../../../context/notification-context';
import { RideBooking } from '../../../services/ride-booking';
import { FoodDelivery } from '../../../services/food-delivery';
import { SmartGrocery } from '../../../services/smart-grocery';
import { SmartHealthOrder } from '../../../services/smart-health-order';

interface ClientHomeProps {
  onBellClick?: () => void;
}

// Helper function to get time-based greeting
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '👋';
  if (hour >= 12 && hour < 17) return '☀️';
  if (hour >= 17 && hour < 21) return '🌅';
  return '🌙';
}

const services = [
  {
    id: 'boda',
    label: 'Smart Boda',
    icon: Bike,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'rgba(0, 255, 136, 0.3)',
    description: 'Quick motorcycle rides'
  },
  {
    id: 'car',
    label: 'Smart Car',
    icon: Car,
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    shadowColor: 'rgba(0, 212, 255, 0.3)',
    description: 'Comfortable car rides'
  },
  {
    id: 'food',
    label: 'Food Delivery',
    icon: UtensilsCrossed,
    color: 'orange',
    gradient: 'from-orange-500 to-red-500',
    shadowColor: 'rgba(255, 107, 53, 0.3)',
    description: 'Restaurant deliveries'
  },
  {
    id: 'smart-grocery',
    label: 'Smart Grocery',
    icon: ShoppingCart,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    shadowColor: 'rgba(168, 85, 247, 0.3)',
    description: 'Groceries & retail'
  },
  {
    id: 'smart-courier',
    label: 'Smart Courier',
    icon: Package,
    color: 'teal',
    gradient: 'from-teal-500 to-cyan-500',
    shadowColor: 'rgba(20, 184, 166, 0.3)',
    description: 'Send packages anywhere'
  },
  {
    id: 'health',
    label: 'Smart Health',
    icon: Heart,
    color: 'rose',
    gradient: 'from-rose-500 to-red-500',
    shadowColor: 'rgba(255, 59, 92, 0.3)',
    description: 'Pharmacy & medicines'
  },
];

const recentOrders = [
  { id: '1', type: 'Boda Ride', from: 'Kampala Central', to: 'Nakasero', amount: 8500, time: '2 hours ago', icon: Bike },
  { id: '2', type: 'Food Delivery', from: 'Cafe Java', to: 'Kololo', amount: 50000, time: 'Yesterday', icon: UtensilsCrossed },
  { id: '3', type: 'Smart Grocery', from: 'Shoprite', to: 'Ntinda', amount: 125000, time: '2 days ago', icon: ShoppingCart },
];

const promotions = [
  {
    id: '1',
    title: '20% OFF',
    subtitle: 'On your next 3 rides!',
    gradient: 'from-orange-500 to-red-500',
    emoji: '🎉'
  },
  {
    id: '2',
    title: 'Free Delivery',
    subtitle: 'On orders above UGX 50,000',
    gradient: 'from-emerald-500 to-teal-600',
    emoji: '🚀'
  }
];

export function ClientHome({ onBellClick }: ClientHomeProps) {
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const [emoji, setEmoji] = useState(getGreetingEmoji());
  const { unreadCount } = useNotifications();
  const [activeService, setActiveService] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
      setEmoji(getGreetingEmoji());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleServiceClick = (serviceId: string) => {
    setActiveService(serviceId);
  };

  const handleCloseService = () => {
    setActiveService(null);
  };

  // Show ride booking for boda or car
  if (activeService === 'boda' || activeService === 'car') {
    return (
      <RideBooking
        onClose={handleCloseService}
        initialService={activeService}
      />
    );
  }

  // Show food delivery
  if (activeService === 'food') {
    return <FoodDelivery onBack={handleCloseService} />;
  }

  // Show smart grocery
  if (activeService === 'smart-grocery') {
    return <SmartGrocery onBack={handleCloseService} />;
  }

  // Show smart health
  if (activeService === 'health') {
    return <SmartHealthOrder onBack={handleCloseService} />;
  }

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-4 pt-4 pb-8 rounded-b-3xl">
        {/* User Greeting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400 text-sm">{greeting} {emoji}</p>
            <h1 className="text-white text-xl font-bold">John Doe</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onBellClick}
              className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5 relative"
            >
              <Bell className="h-6 w-6 text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button 
              className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5"
            >
              <MapPin className="h-6 w-6 text-[#00FF88]" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#13131A] rounded-xl p-3 flex items-center gap-3 border border-white/5">
          <Search className="h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Where to?"
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-base"
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-4 -mt-4">
        <Card className="p-2 bg-[#13131A] border-white/5">
          <div className="grid grid-cols-3 gap-2">
            {services.slice(0, 3).map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all active:scale-95",
                    "bg-[#1A1A24] border-white/5 hover:border-[#00FF88]/30"
                  )}
                >
                  <div 
                    className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br", service.gradient)}
                    style={{ boxShadow: `0 4px 20px ${service.shadowColor}` }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-white text-center">
                    {service.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {services.slice(3).map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all active:scale-95",
                    "bg-[#1A1A24] border-white/5 hover:border-[#00FF88]/30"
                  )}
                >
                  <div 
                    className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br", service.gradient)}
                    style={{ boxShadow: `0 4px 20px ${service.shadowColor}` }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-white text-center">
                    {service.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Promotions Banner */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold text-white mb-3">Promotions</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {promotions.map((promo) => (
            <Card
              key={promo.id}
              className={cn(
                "min-w-[280px] p-4 text-white border-0 bg-gradient-to-r",
                promo.gradient
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Special Offer</p>
                  <h3 className="text-2xl font-bold">{promo.title}</h3>
                  <p className="text-sm mt-1">{promo.subtitle}</p>
                </div>
                <div className="text-5xl">{promo.emoji}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="px-4 mt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
          <button className="text-[#00FF88] text-sm font-medium flex items-center gap-1">
            See all
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {recentOrders.map((order) => {
            const Icon = order.icon;
            return (
              <Card key={order.id} className="bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#1A1A24] rounded-xl flex items-center justify-center">
                      <Icon className="h-6 w-6 text-[#00FF88]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">{order.type}</h3>
                        <span className="font-semibold text-white whitespace-nowrap">
                          UGX {order.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{order.from} → {order.to}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{order.time}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Favorite Places */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-3">Favorite Places</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Star className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Home</p>
                    <p className="text-xs text-gray-400">Ntinda, Kampala</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#13131A] border-white/5 hover:border-[#00FF88]/30 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Star className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Work</p>
                    <p className="text-xs text-gray-400">Kampala CBD</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

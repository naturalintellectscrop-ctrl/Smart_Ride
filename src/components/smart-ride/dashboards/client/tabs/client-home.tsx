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
  Zap,
  Wallet,
  Headphones
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
    label: 'Ride',
    icon: Bike,
    color: '#005f3a',
    bgColor: 'bg-[#005f3a]',
    description: 'Quick motorcycle rides'
  },
  {
    id: 'car',
    label: 'Ride',
    icon: Car,
    color: '#005f3a',
    bgColor: 'bg-[#005f3a]',
    description: 'Comfortable car rides'
  },
  {
    id: 'food',
    label: 'Food',
    icon: UtensilsCrossed,
    color: '#006e2f',
    bgColor: 'bg-[#006e2f]',
    description: 'Restaurant deliveries'
  },
  {
    id: 'smart-grocery',
    label: 'Shopping',
    icon: ShoppingCart,
    color: '#4b5264',
    bgColor: 'bg-[#4b5264]',
    description: 'Groceries & retail'
  },
  {
    id: 'smart-courier',
    label: 'Parcel',
    icon: Package,
    color: '#7cd9a4',
    bgColor: 'bg-[#7cd9a4]',
    description: 'Send packages anywhere'
  },
  {
    id: 'health',
    label: 'Health',
    icon: Heart,
    color: '#005f3a',
    bgColor: 'bg-[#005f3a]',
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
    emoji: '🎉'
  },
  {
    id: '2',
    title: 'Free Delivery',
    subtitle: 'On orders above UGX 50,000',
    emoji: '🚀'
  }
];

const nearbyFavorites = [
  { id: '1', name: 'Cafe Java', type: 'Restaurant', rating: 4.5, icon: UtensilsCrossed },
  { id: '2', name: 'Shoprite', type: 'Grocery', rating: 4.3, icon: ShoppingCart },
  { id: '3', name: 'Capital Shoppers', type: 'Grocery', rating: 4.1, icon: ShoppingCart },
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
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* TopAppBar with user avatar, location, support/notification */}
      <div className="bg-white px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#005f3a] flex items-center justify-center">
              <span className="text-white text-sm font-bold">JD</span>
            </div>
            <div className="flex items-center gap-1 text-[#6f7a71]">
              <MapPin className="h-4 w-4 text-[#005f3a]" />
              <span className="text-sm">Kampala, UG</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 bg-[#f3f4f5] rounded-full flex items-center justify-center hover:bg-[#edeeef] transition-colors">
              <Headphones className="h-5 w-5 text-[#6f7a71]" />
            </button>
            <button 
              onClick={onBellClick}
              className="w-10 h-10 bg-[#f3f4f5] rounded-full flex items-center justify-center hover:bg-[#edeeef] transition-colors relative"
            >
              <Bell className="h-5 w-5 text-[#6f7a71]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ba1a1a] rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Logo + Greeting Section */}
      <div className="bg-white px-4 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-[#005f3a]" />
          <span className="font-[family-name:var(--font-plus-jakarta)] text-lg font-bold text-[#005f3a]">Smart Ride</span>
        </div>
        <p className="text-[#6f7a71] text-sm">{greeting} {emoji}</p>
        <h1 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold text-[#191c1d]">John Doe</h1>
      </div>

      {/* Wallet Balance Card — Deep Green bg with decorative circles */}
      <div className="px-4 mb-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-[#005f3a]">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white/5 rounded-full" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-5 w-5 text-white" />
              <span className="text-sm font-medium text-white/80">Smart Ride Wallet</span>
            </div>
            <p className="text-sm text-white/70">Available Balance</p>
            <h2 className="text-3xl font-bold text-white mt-1">UGX 245,000</h2>
            <div className="flex gap-2 mt-4">
              <button className="px-4 py-2 bg-white text-[#005f3a] rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors">
                Top Up
              </button>
              <button className="px-4 py-2 bg-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors">
                Transfer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2x2 Quick Services Grid */}
      <div className="px-4 mb-4">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-base font-semibold text-[#191c1d] mb-3">Services</h2>
        <Card className="p-3 bg-white border border-[#bec9bf]/30 shadow-sm rounded-2xl">
          <div className="grid grid-cols-2 gap-2">
            {services.slice(0, 4).map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]",
                    "bg-[#f8f9fa] border-[#bec9bf]/20 hover:border-[#005f3a]/30 hover:shadow-sm"
                  )}
                >
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: service.color }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-sm font-semibold text-[#191c1d] block">
                      {service.label}
                    </span>
                    <span className="text-xs text-[#6f7a71] truncate block">
                      {service.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Row 2 with remaining services */}
          {services.length > 4 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {services.slice(4).map((service) => {
                const Icon = service.icon;
                return (
                  <button
                    key={service.id}
                    onClick={() => handleServiceClick(service.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]",
                      "bg-[#f8f9fa] border-[#bec9bf]/20 hover:border-[#005f3a]/30 hover:shadow-sm"
                    )}
                  >
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: service.color }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="text-sm font-semibold text-[#191c1d] block">
                        {service.label}
                      </span>
                      <span className="text-xs text-[#6f7a71] truncate block">
                        {service.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Support Prompt Card */}
      <div className="px-4 mb-4">
        <Card className="p-4 bg-white border border-[#bec9bf]/30 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#edeeef] rounded-full flex items-center justify-center">
              <Headphones className="h-5 w-5 text-[#005f3a]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#191c1d] text-sm">Need help?</p>
              <p className="text-xs text-[#6f7a71]">24/7 support available</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#bec9bf]" />
          </div>
        </Card>
      </div>

      {/* Promo Banner with gradient overlay */}
      <div className="px-4 mb-4">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-base font-semibold text-[#191c1d] mb-3">Promotions</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="min-w-[280px] p-4 rounded-2xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #005f3a 0%, #0e7a4d 100%)',
                boxShadow: '0 4px 15px rgba(0, 95, 58, 0.2)'
              }}
            >
              {/* Decorative circle */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">Special Offer</p>
                  <h3 className="text-2xl font-bold text-white">{promo.title}</h3>
                  <p className="text-sm mt-1 text-white/80">{promo.subtitle}</p>
                </div>
                <div className="text-5xl">{promo.emoji}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="px-4 mt-2 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-base font-semibold text-[#191c1d]">Recent Orders</h2>
          <button className="text-[#005f3a] text-sm font-medium flex items-center gap-1">
            See all
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {recentOrders.map((order) => {
            const Icon = order.icon;
            return (
              <Card key={order.id} className="bg-white border border-[#bec9bf]/30 hover:border-[#005f3a]/30 transition-all cursor-pointer shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-[#edeeef] rounded-xl flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[#005f3a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-[#191c1d]">{order.type}</h3>
                        <span className="font-semibold text-[#191c1d] whitespace-nowrap">
                          UGX {order.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-[#3f4941]">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{order.from} → {order.to}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#6f7a71]">
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

        {/* Nearby Favorites — Horizontal scroll */}
        <div className="mt-6">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-base font-semibold text-[#191c1d] mb-3">Nearby Favorites</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {nearbyFavorites.map((fav) => {
              const Icon = fav.icon;
              return (
                <Card key={fav.id} className="min-w-[160px] bg-white border border-[#bec9bf]/30 shadow-sm rounded-2xl cursor-pointer hover:border-[#005f3a]/30 transition-all">
                  <CardContent className="p-3">
                    <div className="w-10 h-10 bg-[#edeeef] rounded-xl flex items-center justify-center mb-2">
                      <Icon className="h-5 w-5 text-[#005f3a]" />
                    </div>
                    <p className="font-medium text-sm text-[#191c1d]">{fav.name}</p>
                    <p className="text-xs text-[#6f7a71]">{fav.type}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 text-[#6bff8f] fill-[#6bff8f]" />
                      <span className="text-xs text-[#3f4941]">{fav.rating}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

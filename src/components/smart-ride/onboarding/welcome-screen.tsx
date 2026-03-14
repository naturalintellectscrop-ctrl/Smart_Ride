'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bike, 
  Car,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  Heart,
  Smartphone,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '../types';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Bike: <Bike className="h-6 w-6" />,
  Car: <Car className="h-6 w-6" />,
  UtensilsCrossed: <UtensilsCrossed className="h-6 w-6" />,
  ShoppingCart: <ShoppingCart className="h-6 w-6" />,
  Package: <Package className="h-6 w-6" />,
  Heart: <Heart className="h-6 w-6" />,
};

const colorConfig: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  teal: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' },
  rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  // Clear any stale user data on mount to ensure fresh start
  React.useEffect(() => {
    localStorage.removeItem('smart_ride_user');
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-8">
        <div className="flex items-center justify-center mb-8">
          <div 
            className="w-20 h-20 bg-[#00FF88] rounded-2xl flex items-center justify-center"
            style={{ boxShadow: '0 0 30px rgba(0, 255, 136, 0.4)' }}
          >
            <Bike className="h-10 w-10 text-[#0D0D12]" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white text-center mb-3">
          Welcome to Smart Ride
        </h1>
        
        <p className="text-gray-400 text-center mb-8">
          Your all-in-one platform for rides, deliveries, shopping, and healthcare services.
        </p>
      </div>

      {/* Services Grid */}
      <div className="px-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Our Services</h2>
        <div className="grid grid-cols-2 gap-3">
          {SERVICE_CATEGORIES.map((service) => {
            const Icon = iconMap[service.icon];
            const colors = colorConfig[service.color] || colorConfig.emerald;
            
            return (
              <Card 
                key={service.id} 
                className="bg-[#13131A] border border-white/5 hover:border-[#00FF88]/30 transition-all cursor-pointer active:scale-[0.98]"
              >
                <CardContent className="p-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                    colors.bg
                  )}>
                    <span className={colors.text}>{Icon}</span>
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">
                    {service.name}
                  </h3>
                  <p className="text-xs text-gray-500">{service.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature Highlight */}
      <div className="px-6 mb-8">
        <Card className="bg-[#13131A] border border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00FF88]/15 rounded-full flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-[#00FF88]" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">One App, Everything</p>
                <p className="text-xs text-gray-500">Access all services from a single account</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="px-6 pb-8">
        <Button 
          onClick={onGetStarted}
          className="w-full h-14 bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] font-semibold text-lg rounded-xl shadow-lg transition-all hover:shadow-xl"
          style={{ boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)' }}
        >
          Get Started
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        
        <p className="text-center text-xs text-gray-500 mt-4">
          By continuing, you agree to our{' '}
          <span className="text-[#00FF88] font-medium">Terms of Service</span>
          {' '}and{' '}
          <span className="text-[#00FF88] font-medium">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Image from 'next/image';
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
  ArrowRight
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
  emerald: { bg: 'bg-[#98f6be]/20', text: 'text-[#005f3a]', border: 'border-[#005f3a]/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20' },
};

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  // Clear any stale user data on mount to ensure fresh start
  React.useEffect(() => {
    localStorage.removeItem('smart_ride_user');
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-12 pb-8">
        <div className="flex items-center justify-center mb-8">
          <Image 
            src="/smartride-logo-transparent.png"
            alt="Smart Ride"
            width={80}
            height={80}
            className="rounded-2xl"
            priority
          />
        </div>
        
        <h1 className="text-3xl font-bold text-[#191c1d] text-center mb-3 font-[family-name:var(--font-plus-jakarta)]">
          Welcome to Smart Ride
        </h1>
        
        <p className="text-[#3f4941] text-center mb-8">
          Your all-in-one platform for rides, deliveries, shopping, and healthcare services.
        </p>
      </div>

      {/* Services Grid */}
      <div className="px-6 mb-8">
        <h2 className="text-lg font-semibold text-[#191c1d] mb-4 font-[family-name:var(--font-plus-jakarta)]">Our Services</h2>
        <div className="grid grid-cols-2 gap-3">
          {SERVICE_CATEGORIES.map((service) => {
            const Icon = iconMap[service.icon];
            const colors = colorConfig[service.color] || colorConfig.emerald;
            
            return (
              <Card 
                key={service.id} 
                className="bg-white border border-[#bec9bf]/30 hover:border-[#005f3a]/30 transition-all cursor-pointer active:scale-[0.98] shadow-sm"
              >
                <CardContent className="p-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                    colors.bg
                  )}>
                    <span className={colors.text}>{Icon}</span>
                  </div>
                  <h3 className="font-semibold text-[#191c1d] text-sm mb-1">
                    {service.name}
                  </h3>
                  <p className="text-xs text-[#6f7a71]">{service.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature Highlight */}
      <div className="px-6 mb-8">
        <Card className="bg-white border border-[#bec9bf]/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#98f6be]/20 rounded-full flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-[#005f3a]" />
              </div>
              <div>
                <p className="font-medium text-[#191c1d] text-sm">One App, Everything</p>
                <p className="text-xs text-[#6f7a71]">Access all services from a single account</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="px-6 pb-8">
        <Button 
          onClick={onGetStarted}
          className="w-full h-14 bg-[#005f3a] text-white font-semibold text-lg rounded-xl shadow-lg shadow-[#005f3a]/15 hover:bg-[#0e7a4d] active:scale-95 transition-all"
        >
          Get Started
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        
        <p className="text-center text-xs text-[#6f7a71] mt-4">
          By continuing, you agree to our{' '}
          <span className="text-[#005f3a] font-medium">Terms of Service</span>
          {' '}and{' '}
          <span className="text-[#005f3a] font-medium">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

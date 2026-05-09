'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Bike, 
  Car, 
  Package,
  Check,
  AlertCircle
} from 'lucide-react';
import { RiderRoleType, RIDER_ROLE_DESCRIPTIONS } from '../types';

interface RiderRoleSelectionProps {
  onBack: () => void;
  onRoleSelect: (role: RiderRoleType) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Bike: <Bike className="h-8 w-8" />,
  Car: <Car className="h-8 w-8" />,
  Package: <Package className="h-8 w-8" />,
};

const colorConfig: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  emerald: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-600',
  },
  blue: {
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    gradient: 'from-blue-500 to-indigo-600',
  },
  orange: {
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    gradient: 'from-orange-500 to-red-500',
  },
};

export function RiderRoleSelection({ onBack, onRoleSelect }: RiderRoleSelectionProps) {
  const roles = Object.entries(RIDER_ROLE_DESCRIPTIONS) as [RiderRoleType, typeof RIDER_ROLE_DESCRIPTIONS[RiderRoleType]][];

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-4 pt-4 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="text-gray-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-white">Choose Your Rider Type</h1>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <p className="text-gray-300 text-sm">
            Select the type of rider you want to become. This determines the services you can provide.
            <span className="font-semibold text-[#00FF88] block mt-2">⚠️ This cannot be changed later!</span>
          </p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="px-4 -mt-4 space-y-4">
        {roles.map(([roleKey, role]) => {
          const colors = colorConfig[role.color];
          
          return (
            <Card 
              key={roleKey}
              className={cn(
                "cursor-pointer transition-all border-2 bg-[#13131A] hover:border-white/20",
                colors.border
              )}
              onClick={() => onRoleSelect(roleKey)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div 
                    className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center text-white bg-gradient-to-br",
                      colors.gradient
                    )}
                    style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
                  >
                    {iconMap[role.icon]}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg mb-1">
                      {role.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {role.subtitle}
                    </p>
                    <p className="text-sm text-gray-400 mb-3">
                      {role.description}
                    </p>
                    
                    {/* Capabilities */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {role.capabilities.map((cap, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {cap}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {role.cannot.map((cap, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="bg-red-500/15 text-red-400 border-red-500/30 text-xs"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            No {cap.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Important Notice */}
        <Card className="bg-amber-500/10 border-amber-500/30 mt-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-300 mb-1">Important Information</h4>
                <ul className="text-sm text-amber-200/70 space-y-1">
                  <li>• You must undergo physical verification before going online</li>
                  <li>• Documents required: National ID, Driver&apos;s License, Face Photo</li>
                  <li>• Equipment will be issued after approval</li>
                  <li>• Your role cannot be changed after registration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

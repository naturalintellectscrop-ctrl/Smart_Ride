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
    bg: 'bg-[#98f6be]/20',
    border: 'border-[#005f3a]/30',
    text: 'text-[#005f3a]',
    gradient: 'from-[#005f3a] to-[#0e7a4d]',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-600',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-600',
    gradient: 'from-orange-500 to-red-500',
  },
};

export function RiderRoleSelection({ onBack, onRoleSelect }: RiderRoleSelectionProps) {
  const roles = Object.entries(RIDER_ROLE_DESCRIPTIONS) as [RiderRoleType, typeof RIDER_ROLE_DESCRIPTIONS[RiderRoleType]][];

  return (
    <div className="min-h-screen bg-[#f8f9fa] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-8 rounded-b-3xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="text-[#6f7a71] hover:text-[#191c1d] hover:bg-[#f3f4f5]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#191c1d] font-[family-name:var(--font-plus-jakarta)]">Choose Your Rider Type</h1>
        </div>
        
        <div className="bg-[#f3f4f5] rounded-xl p-4 border border-[#bec9bf]/30">
          <p className="text-[#3f4941] text-sm">
            Select the type of rider you want to become. This determines the services you can provide.
            <span className="font-semibold text-[#005f3a] block mt-2">⚠️ This cannot be changed later!</span>
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
                "cursor-pointer transition-all border-2 bg-white shadow-sm hover:border-[#005f3a]/20",
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
                    style={{ boxShadow: '0 4px 20px rgba(0, 95, 58, 0.1)' }}
                  >
                    {iconMap[role.icon]}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-[#191c1d] text-lg mb-1">
                      {role.title}
                    </h3>
                    <p className="text-sm text-[#6f7a71] mb-2">
                      {role.subtitle}
                    </p>
                    <p className="text-sm text-[#3f4941] mb-3">
                      {role.description}
                    </p>
                    
                    {/* Capabilities */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {role.capabilities.map((cap, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="bg-[#98f6be]/20 text-[#005f3a] border-[#005f3a]/20 text-xs"
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
                            className="bg-red-50 text-red-600 border-red-200 text-xs"
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
        <Card className="bg-amber-50 border-amber-200 mt-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-700 mb-1">Important Information</h4>
                <ul className="text-sm text-amber-600 space-y-1">
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

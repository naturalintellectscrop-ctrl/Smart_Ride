'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  User, 
  Bike, 
  Store,
  Heart,
  Check
} from 'lucide-react';
import { UserRole } from '../types';
import { MOBILE_APP_CONFIG, isMobileRole } from '@/lib/config/mobile-access';

interface RoleSelectionScreenProps {
  onBack: () => void;
  onRoleSelect: (role: UserRole) => void;
  currentRole?: UserRole | null;
}

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="h-8 w-8" />,
  Bike: <Bike className="h-8 w-8" />,
  Store: <Store className="h-8 w-8" />,
  Heart: <Heart className="h-8 w-8" />,
};

const colorConfig: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  emerald: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-600',
  },
  orange: {
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    gradient: 'from-orange-500 to-red-500',
  },
  blue: {
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    gradient: 'from-blue-500 to-indigo-600',
  },
  rose: {
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    gradient: 'from-rose-500 to-pink-600',
  },
};

/**
 * Role Selection Screen for Mobile App
 * 
 * IMPORTANT: This only shows MOBILE USER roles.
 * Admin roles are NEVER shown here.
 * Admin access is available only at admin.smartride.com
 */
export function RoleSelectionScreen({ onBack, onRoleSelect, currentRole }: RoleSelectionScreenProps) {
  // ONLY mobile roles - no admin roles
  const mobileRoles = MOBILE_APP_CONFIG.availableRoles;

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 py-4 flex items-center border-b border-white/5">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="mr-2 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-white">
          {currentRole ? 'Switch Role' : 'Choose Your Role'}
        </h1>
      </div>

      {/* Content */}
      <div className="px-6 pt-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white mb-2">
            {currentRole ? 'What would you like to do?' : 'How would you like to use Smart Ride?'}
          </h2>
          <p className="text-gray-400 text-sm">
            {currentRole 
              ? 'You can switch between roles anytime from your profile.'
              : 'Select how you want to use the app. You can change this later.'}
          </p>
        </div>

        {/* Role Cards - MOBILE ROLES ONLY */}
        <div className="space-y-3">
          {mobileRoles.map((role) => {
            const colors = colorConfig[role.color] || colorConfig.emerald;
            const isSelected = currentRole === role.id;
            const IconComponent = iconMap[role.icon] || <User className="h-8 w-8" />;
            
            return (
              <Card 
                key={role.id}
                className={cn(
                  "cursor-pointer transition-all border-2 bg-[#13131A]",
                  isSelected 
                    ? `${colors.border} ${colors.bg}` 
                    : 'border-white/5 hover:border-white/10'
                )}
                onClick={() => onRoleSelect(role.id as UserRole)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div 
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center text-white bg-gradient-to-br",
                        colors.gradient
                      )}
                      style={{ boxShadow: `0 4px 20px rgba(0, 255, 136, ${isSelected ? 0.3 : 0.1})` }}
                    >
                      {IconComponent}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white text-base">
                          {role.title}
                        </h3>
                        {isSelected && (
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center",
                            colors.bg
                          )}>
                            <Check className={cn("h-3 w-3", colors.text)} />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-1">
                        {role.subtitle}
                      </p>
                      <p className="text-sm text-gray-400">
                        {role.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="mt-6 border-0 bg-[#13131A]">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400 text-center">
              <span className="font-medium text-white">Note:</span> As a rider or merchant, 
              additional verification may be required before you can start earning.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

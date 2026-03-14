'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  Bike,
  Car,
  Crown,
  Zap,
  Clock,
  Users,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  VehicleType,
  VehiclePricingConfig,
  VEHICLE_CONFIGS,
  PricingBreakdown,
  getAvailableVehicles,
} from './ride-pricing';

interface VehicleOption {
  type: VehicleType;
  config: VehiclePricingConfig;
  pricing: PricingBreakdown;
  isAvailable: boolean;
  unavailableReason?: string;
}

interface VehicleSelectionProps {
  selectedVehicle: VehicleType | null;
  onSelectVehicle: (vehicle: VehicleType) => void;
  pricing: Record<VehicleType, PricingBreakdown | null>;
  passengers: number;
  distanceKm: number;
  estimatedTimeMinutes: number;
  className?: string;
}

// Map icon names to components
const iconMap: Record<string, React.ReactNode> = {
  Bike: <Bike className="h-6 w-6" />,
  Car: <Car className="h-6 w-6" />,
  Crown: <Crown className="h-6 w-6" />,
  Zap: <Zap className="h-6 w-6" />,
};

export function VehicleSelection({
  selectedVehicle,
  onSelectVehicle,
  pricing,
  passengers,
  distanceKm,
  estimatedTimeMinutes,
  className,
}: VehicleSelectionProps) {
  const availableVehicles = getAvailableVehicles(passengers);

  const vehicleOptions: VehicleOption[] = Object.entries(VEHICLE_CONFIGS).map(
    ([type, config]) => {
      const vehicleType = type as VehicleType;
      const isAvailable = availableVehicles.includes(vehicleType);
      const vehiclePricing = pricing[vehicleType];

      let unavailableReason: string | undefined;
      if (!isAvailable) {
        if (passengers > 1 && vehicleType === 'smart_boda') {
          unavailableReason = 'Only 1 passenger allowed';
        } else if (passengers > 4) {
          unavailableReason = 'XL vehicle needed';
        }
      }

      return {
        type: vehicleType,
        config,
        pricing: vehiclePricing || {
          baseFare: 0,
          distanceFare: 0,
          timeFare: 0,
          bookingFee: 0,
          subtotal: 0,
          multiplierApplied: 0,
          totalFare: 0,
          formattedFare: 'N/A',
        },
        isAvailable,
        unavailableReason,
      };
    }
  );

  // Sort: available first, then by price
  const sortedOptions = vehicleOptions.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }
    return a.pricing.totalFare - b.pricing.totalFare;
  });

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Select Ride Type</h3>
        <div className="flex items-center gap-1 text-gray-400 text-sm">
          <Clock className="h-4 w-4" />
          <span>~{estimatedTimeMinutes} min</span>
        </div>
      </div>

      <div className="space-y-2">
        {sortedOptions.map((option) => {
          const isSelected = selectedVehicle === option.type;
          const Icon = iconMap[option.config.icon] || <Car className="h-6 w-6" />;

          return (
            <Card
              key={option.type}
              className={cn(
                'cursor-pointer transition-all overflow-hidden',
                option.isAvailable
                  ? isSelected
                    ? 'bg-[#00FF88]/10 border-[#00FF88]/50'
                    : 'bg-[#13131A] border-white/5 hover:border-white/10'
                  : 'bg-[#13131A]/50 border-white/5 opacity-50 cursor-not-allowed'
              )}
              onClick={() => {
                if (option.isAvailable) {
                  onSelectVehicle(option.type);
                }
              }}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Vehicle Icon */}
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
                      option.isAvailable
                        ? isSelected
                          ? 'bg-[#00FF88]/20'
                          : 'bg-[#1A1A24]'
                        : 'bg-[#1A1A24]/50'
                    )}
                  >
                    <div
                      className={cn(
                        option.isAvailable
                          ? isSelected
                            ? 'text-[#00FF88]'
                            : 'text-white'
                          : 'text-gray-500'
                      )}
                    >
                      {Icon}
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={cn(
                          'font-semibold',
                          option.isAvailable
                            ? isSelected
                              ? 'text-[#00FF88]'
                              : 'text-white'
                            : 'text-gray-500'
                        )}
                      >
                        {option.config.name}
                      </h4>
                      {option.config.multiplier !== 1.0 && (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            option.config.multiplier < 1
                              ? 'bg-green-500/20 text-green-400'
                              : option.config.multiplier > 1.3
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                          )}
                        >
                          {option.config.multiplier < 1
                            ? `${Math.round((1 - option.config.multiplier) * 100)}% off`
                            : `${option.config.multiplier}x`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Users className="h-3.5 w-3.5" />
                        <span>{option.config.maxPassengers}</span>
                      </div>
                      <span className="text-gray-600">•</span>
                      <p className="text-gray-500 text-sm truncate">
                        {option.config.description}
                      </p>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {option.config.features.slice(0, 2).map((feature, idx) => (
                        <span
                          key={idx}
                          className="text-xs text-gray-500 bg-[#1A1A24] px-2 py-0.5 rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Unavailable reason */}
                    {!option.isAvailable && option.unavailableReason && (
                      <div className="flex items-center gap-1 mt-2 text-orange-400 text-sm">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{option.unavailableReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Price and Selection */}
                  <div className="text-right shrink-0">
                    {option.isAvailable ? (
                      <>
                        <p
                          className={cn(
                            'text-lg font-bold',
                            isSelected ? 'text-[#00FF88]' : 'text-white'
                          )}
                        >
                          {option.pricing.formattedFare}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {distanceKm.toFixed(1)} km
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">Unavailable</p>
                    )}

                    {/* Selection indicator */}
                    {option.isAvailable && (
                      <div
                        className={cn(
                          'mt-2 w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-all',
                          isSelected
                            ? 'border-[#00FF88] bg-[#00FF88]'
                            : 'border-gray-600'
                        )}
                      >
                        {isSelected && <Check className="h-4 w-4 text-black" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected highlight bar */}
              {isSelected && (
                <div className="h-1 bg-gradient-to-r from-[#00FF88] to-[#00CC6E]" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Selected vehicle details */}
      {selectedVehicle && (
        <Card className="bg-[#13131A] border-white/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Selected</span>
            <span className="text-[#00FF88] font-medium">
              {VEHICLE_CONFIGS[selectedVehicle].name}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

// Compact vehicle badge component
interface VehicleBadgeProps {
  type: VehicleType;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function VehicleBadge({
  type,
  selected,
  onClick,
  compact,
}: VehicleBadgeProps) {
  const config = VEHICLE_CONFIGS[type];
  const Icon = iconMap[config.icon] || <Car className="h-4 w-4" />;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full transition-all',
        compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2',
        selected
          ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50'
          : 'bg-[#1A1A24] text-gray-400 border border-white/5 hover:border-white/10'
      )}
    >
      {Icon}
      <span className="font-medium">{config.name}</span>
    </button>
  );
}

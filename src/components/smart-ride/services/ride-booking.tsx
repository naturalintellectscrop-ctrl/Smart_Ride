'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  User,
  Plus,
  Minus,
  ArrowRight,
  Clock,
  MapPin,
  Navigation,
  Check,
  Loader2,
  Bike,
  Car,
  Shield,
  Star,
  Phone,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { LocationPicker, Location } from './location-picker';
import { VehicleSelection } from './vehicle-selection';
import { PaymentMethodSelector, PaymentMethod, paymentMethodLabels } from '@/components/mobile/shared/payment-method-selector';
import {
  VehicleType,
  PricingBreakdown,
  calculateFare,
  calculateAllFares,
  estimateRoute,
  VEHICLE_CONFIGS,
  formatCurrency,
} from './ride-pricing';

type BookingStep = 
  | 'location' 
  | 'passengers' 
  | 'vehicle' 
  | 'payment' 
  | 'confirm' 
  | 'searching' 
  | 'matched';

interface RideBookingProps {
  onClose: () => void;
  initialService?: 'boda' | 'car';
}

export function RideBooking({ onClose, initialService }: RideBookingProps) {
  // Step state
  const [step, setStep] = useState<BookingStep>('location');
  
  // Location state
  const [pickup, setPickup] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  
  // Route details - computed from locations
  const pickupAddress = pickup?.address;
  const destinationAddress = destination?.address;
  
  const distanceKm = React.useMemo(() => {
    if (pickupAddress && destinationAddress) {
      return estimateRoute(pickupAddress, destinationAddress).distanceKm;
    }
    return 0;
  }, [pickupAddress, destinationAddress]);
  
  const estimatedTimeMinutes = React.useMemo(() => {
    if (pickupAddress && destinationAddress) {
      return estimateRoute(pickupAddress, destinationAddress).estimatedTimeMinutes;
    }
    return 0;
  }, [pickupAddress, destinationAddress]);
  
  // Passenger state
  const [passengers, setPassengers] = useState(1);
  
  // Vehicle state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(
    initialService === 'boda' ? 'smart_boda' : initialService === 'car' ? 'economy_car' : null
  );
  
  // Pricing - computed from route and passengers
  const pricing = React.useMemo<Record<VehicleType, PricingBreakdown | null>>(() => {
    if (pickupAddress && destinationAddress) {
      return calculateAllFares(distanceKm, estimatedTimeMinutes, passengers);
    }
    return {
      smart_boda: null,
      economy_car: null,
      premium_car: null,
      electric_vehicle: null,
    };
  }, [pickupAddress, destinationAddress, distanceKm, estimatedTimeMinutes, passengers]);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  
  // Matching state
  const [matchTimer, setMatchTimer] = useState(0);



  // Match timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'searching') {
      interval = setInterval(() => {
        setMatchTimer((prev) => {
          if (prev >= 3) {
            setStep('matched');
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Auto-select best available vehicle when pricing is ready - using callback pattern
  const autoSelectVehicle = React.useCallback(() => {
    if (pickupAddress && destinationAddress && !selectedVehicle) {
      const availableVehicles = Object.entries(pricing)
        .filter(([_, p]) => p !== null)
        .sort((a, b) => (a[1]?.totalFare || 0) - (b[1]?.totalFare || 0));
      
      if (availableVehicles.length > 0) {
        return availableVehicles[0][0] as VehicleType;
      }
    }
    return selectedVehicle;
  }, [pricing, pickupAddress, destinationAddress, selectedVehicle]);
  
  // Use the auto-selected vehicle
  const effectiveVehicle = selectedVehicle || autoSelectVehicle();
  if (effectiveVehicle !== selectedVehicle && effectiveVehicle) {
    // This runs during render, which is valid for derived state
    setSelectedVehicle(effectiveVehicle);
  }

  const handleSwapLocations = () => {
    const temp = pickup;
    setPickup(destination);
    setDestination(temp);
  };

  const canProceedFromLocation = pickup?.address && destination?.address;
  
  const selectedPricing = selectedVehicle ? pricing[selectedVehicle] : null;

  // Handle booking confirmation
  const handleConfirmBooking = () => {
    setStep('searching');
  };

  // Render step header
  const renderHeader = () => (
    <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-white/5">
      <button
        onClick={() => {
          if (step === 'location') {
            onClose();
          } else if (step === 'searching' || step === 'matched') {
            setStep('confirm');
          } else {
            const steps: BookingStep[] = ['location', 'passengers', 'vehicle', 'payment', 'confirm'];
            const currentIndex = steps.indexOf(step);
            if (currentIndex > 0) {
              setStep(steps[currentIndex - 1]);
            }
          }
        }}
        className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>
      <div>
        <h1 className="text-lg font-bold text-white">
          {step === 'location' && 'Book a Ride'}
          {step === 'passengers' && 'Passengers'}
          {step === 'vehicle' && 'Choose Ride'}
          {step === 'payment' && 'Payment'}
          {step === 'confirm' && 'Confirm Booking'}
          {step === 'searching' && 'Finding Rider...'}
          {step === 'matched' && 'Rider Found!'}
        </h1>
        <p className="text-gray-400 text-sm">
          {step === 'location' && 'Enter pickup and destination'}
          {step === 'passengers' && 'How many passengers?'}
          {step === 'vehicle' && `${distanceKm.toFixed(1)} km • ~${estimatedTimeMinutes} min`}
          {step === 'payment' && 'Select payment method'}
          {step === 'confirm' && 'Review your booking'}
          {step === 'searching' && 'Please wait...'}
          {step === 'matched' && 'Your rider is on the way'}
        </p>
      </div>
    </div>
  );

  // Location step
  if (step === 'location') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          <LocationPicker
            pickup={pickup}
            destination={destination}
            onPickupChange={setPickup}
            onDestinationChange={setDestination}
            onSwapLocations={handleSwapLocations}
          />

          {/* Continue button */}
          <Button
            disabled={!canProceedFromLocation}
            onClick={() => setStep('passengers')}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-base transition-all',
              canProceedFromLocation
                ? 'bg-[#00FF88] text-black hover:bg-[#00CC6E]'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            Continue
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          {/* Price hint */}
          {canProceedFromLocation && (
            <Card className="bg-[#13131A] border-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Estimated fare range</p>
                  <p className="text-white font-semibold">
                    {formatCurrency(Math.min(...Object.values(pricing).filter(Boolean).map(p => p?.totalFare || Infinity)))}
                    {' - '}
                    {formatCurrency(Math.max(...Object.values(pricing).filter(Boolean).map(p => p?.totalFare || 0)))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Distance</p>
                  <p className="text-white font-semibold">{distanceKm.toFixed(1)} km</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Passengers step
  if (step === 'passengers') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {renderHeader()}
        <div className="p-4 space-y-6">
          {/* Route summary */}
          <Card className="bg-[#13131A] border-white/5 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#00FF88] rounded-full" />
                <p className="text-white">{pickup?.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <p className="text-white">{destination?.address}</p>
              </div>
            </div>
          </Card>

          {/* Passenger selector */}
          <Card className="bg-[#13131A] border-white/5 p-6">
            <h3 className="text-white font-medium mb-6">Number of Passengers</h3>
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => setPassengers(Math.max(1, passengers - 1))}
                className="w-14 h-14 rounded-full bg-[#1A1A24] border border-white/10 flex items-center justify-center hover:border-[#00FF88]/50 transition-colors"
              >
                <Minus className="h-6 w-6 text-white" />
              </button>
              <div className="text-center">
                <span className="text-5xl font-bold text-white">{passengers}</span>
                <p className="text-gray-400 text-sm mt-1">
                  {passengers === 1 ? 'passenger' : 'passengers'}
                </p>
              </div>
              <button
                onClick={() => setPassengers(Math.min(6, passengers + 1))}
                className="w-14 h-14 rounded-full bg-[#1A1A24] border border-white/10 flex items-center justify-center hover:border-[#00FF88]/50 transition-colors"
              >
                <Plus className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Passenger hints */}
            <div className="mt-6 space-y-2">
              {passengers === 1 && (
                <p className="text-[#00FF88] text-sm text-center">
                  Available: Smart Boda, Economy Car, Premium Car
                </p>
              )}
              {passengers >= 2 && passengers <= 4 && (
                <p className="text-blue-400 text-sm text-center">
                  Car required for {passengers} passengers
                </p>
              )}
              {passengers >= 5 && (
                <p className="text-orange-400 text-sm text-center">
                  XL vehicle may be required for {passengers} passengers
                </p>
              )}
            </div>
          </Card>

          {/* Continue button */}
          <Button
            onClick={() => setStep('vehicle')}
            className="w-full py-4 rounded-xl font-semibold text-base bg-[#00FF88] text-black hover:bg-[#00CC6E]"
          >
            Continue
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Vehicle selection step
  if (step === 'vehicle') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          {/* Route summary mini */}
          <Card className="bg-[#13131A] border-white/5 p-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-[#00FF88]" />
              <p className="text-gray-400 text-sm flex-1 truncate">{pickup?.address}</p>
              <ArrowRight className="h-4 w-4 text-gray-600" />
              <Navigation className="h-4 w-4 text-orange-500" />
              <p className="text-gray-400 text-sm flex-1 truncate text-right">{destination?.address}</p>
            </div>
          </Card>

          {/* Vehicle selection */}
          <VehicleSelection
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            pricing={pricing}
            passengers={passengers}
            distanceKm={distanceKm}
            estimatedTimeMinutes={estimatedTimeMinutes}
          />

          {/* Continue button */}
          <Button
            disabled={!selectedVehicle}
            onClick={() => setStep('payment')}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-base transition-all mt-4',
              selectedVehicle
                ? 'bg-[#00FF88] text-black hover:bg-[#00CC6E]'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {selectedVehicle ? (
              <>
                Continue with {VEHICLE_CONFIGS[selectedVehicle].name}
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            ) : (
              'Select a ride type'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Payment step
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          {/* Selected vehicle */}
          <Card className="bg-[#13131A] border-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Selected ride</p>
                <p className="text-white font-medium">
                  {selectedVehicle && VEHICLE_CONFIGS[selectedVehicle].name}
                </p>
              </div>
              {selectedPricing && (
                <p className="text-[#00FF88] font-bold text-xl">
                  {selectedPricing.formattedFare}
                </p>
              )}
            </div>
          </Card>

          {/* Payment method selector */}
          <div>
            <h3 className="text-white font-medium mb-3">Select Payment Method</h3>
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelect={setPaymentMethod}
            />
          </div>

          {/* Continue button */}
          <Button
            onClick={() => setStep('confirm')}
            className="w-full py-4 rounded-xl font-semibold text-base bg-[#00FF88] text-black hover:bg-[#00CC6E] mt-4"
          >
            Continue
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Confirmation step
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          {/* Trip summary */}
          <Card className="bg-[#13131A] border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-white font-medium">Trip Summary</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Route */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-[#00FF88] rounded-full mt-1" />
                  <div>
                    <p className="text-gray-400 text-xs">Pickup</p>
                    <p className="text-white">{pickup?.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mt-1" />
                  <div>
                    <p className="text-gray-400 text-xs">Destination</p>
                    <p className="text-white">{destination?.address}</p>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-gray-400 text-xs">Distance</p>
                  <p className="text-white font-medium">{distanceKm.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Est. Time</p>
                  <p className="text-white font-medium">~{estimatedTimeMinutes} min</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Passengers</p>
                  <p className="text-white font-medium">{passengers}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Vehicle</p>
                  <p className="text-white font-medium">
                    {selectedVehicle && VEHICLE_CONFIGS[selectedVehicle].name}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Fare breakdown */}
          {selectedPricing && (
            <Card className="bg-[#13131A] border-white/5 p-4">
              <h3 className="text-white font-medium mb-3">Fare Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Base fare</span>
                  <span className="text-white">{formatCurrency(selectedPricing.baseFare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Distance ({distanceKm.toFixed(1)} km)</span>
                  <span className="text-white">{formatCurrency(selectedPricing.distanceFare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Time ({estimatedTimeMinutes} min)</span>
                  <span className="text-white">{formatCurrency(selectedPricing.timeFare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Booking fee</span>
                  <span className="text-white">{formatCurrency(selectedPricing.bookingFee)}</span>
                </div>
                {selectedPricing.multiplierApplied !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Vehicle rate adjustment</span>
                    <span className={cn(
                      selectedPricing.multiplierApplied > 0 ? 'text-orange-400' : 'text-[#00FF88]'
                    )}>
                      {selectedPricing.multiplierApplied > 0 ? '+' : ''}
                      {formatCurrency(selectedPricing.multiplierApplied)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-[#00FF88] font-bold text-lg">
                    {selectedPricing.formattedFare}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Payment method */}
          <Card className="bg-[#13131A] border-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Payment Method</p>
                <p className="text-white font-medium">{paymentMethodLabels[paymentMethod]}</p>
              </div>
              <button
                onClick={() => setStep('payment')}
                className="text-[#00FF88] text-sm"
              >
                Change
              </button>
            </div>
          </Card>

          {/* Confirm button */}
          <Button
            onClick={handleConfirmBooking}
            className="w-full py-4 rounded-xl font-semibold text-base bg-[#00FF88] text-black hover:bg-[#00CC6E] mt-4"
          >
            Confirm Booking
            <Check className="h-5 w-5 ml-2" />
          </Button>

          {/* Disclaimer */}
          <p className="text-gray-500 text-xs text-center">
            Final fare may vary based on actual route and traffic conditions
          </p>
        </div>
      </div>
    );
  }

  // Searching step
  if (step === 'searching') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {renderHeader()}
        <div className="p-4">
          {/* Animated searching */}
          <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] rounded-3xl h-72 flex items-center justify-center relative overflow-hidden">
            {/* Animated dots */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-[#00FF88] rounded-full animate-ping" />
              <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-[#00FF88] rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 left-1/2 w-5 h-5 bg-[#00FF88] rounded-full animate-ping" />
              <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-[#00FF88] rounded-full animate-pulse" />
            </div>
            
            <div className="text-center z-10">
              <div className="w-24 h-24 bg-[#00FF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {selectedVehicle === 'smart_boda' ? (
                  <Bike className="h-12 w-12 text-[#00FF88] animate-bounce" />
                ) : (
                  <Car className="h-12 w-12 text-[#00FF88] animate-bounce" />
                )}
              </div>
              <p className="text-white font-medium text-lg">Finding nearby riders...</p>
              <p className="text-gray-400 text-sm mt-1">
                {matchTimer < 3 ? 'This usually takes 1-2 minutes' : 'Almost there...'}
              </p>
            </div>
          </div>

          {/* Route reminder */}
          <Card className="bg-[#13131A] border-white/5 p-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#00FF88] rounded-full" />
                <p className="text-white text-sm">{pickup?.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <p className="text-white text-sm">{destination?.address}</p>
              </div>
            </div>
          </Card>

          {/* Cancel button */}
          <Button
            onClick={() => setStep('confirm')}
            variant="outline"
            className="w-full py-4 rounded-xl font-medium text-base mt-6 border-white/10 text-gray-400 hover:bg-white/5"
          >
            Cancel Search
          </Button>
        </div>
      </div>
    );
  }

  // Matched step
  if (step === 'matched') {
    const rider = {
      name: 'Emmanuel Okello',
      rating: 4.8,
      trips: 234,
      vehicle: selectedVehicle === 'smart_boda' ? 'Bajaj Boxer' : 'Toyota Corolla',
      plateNumber: 'UAX 123A',
      eta: '3 min',
    };

    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          {/* Success badge */}
          <div className="flex justify-center">
            <Badge className="bg-[#00FF88]/20 text-[#00FF88] px-4 py-2 text-sm">
              <Check className="h-4 w-4 mr-2" />
              Rider Found
            </Badge>
          </div>

          {/* Rider card */}
          <Card className="bg-[#13131A] border-[#00FF88]/30 p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#00FF88]/20 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-[#00FF88]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white">{rider.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-white">{rider.rating}</span>
                  </div>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-400">{rider.trips} rides</span>
                  <Badge className="bg-[#00FF88]/10 text-[#00FF88] text-xs ml-1">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Vehicle</p>
                  <p className="font-medium text-white">{rider.vehicle}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Plate Number</p>
                  <p className="font-medium text-white">{rider.plateNumber}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ETA */}
          <div className="text-center py-4">
            <p className="text-gray-400">Arriving in</p>
            <p className="text-4xl font-bold text-[#00FF88]">{rider.eta}</p>
          </div>

          {/* Route */}
          <Card className="bg-[#13131A] border-white/5 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#00FF88]" />
                <p className="text-white">{pickup?.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-orange-500" />
                <p className="text-white">{destination?.address}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
              <div>
                <p className="text-sm text-gray-400">Trip fare</p>
                <p className="font-bold text-lg text-white">
                  {selectedPricing?.formattedFare}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Payment</p>
                <p className="font-medium text-white">{paymentMethodLabels[paymentMethod]}</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button className="bg-[#00FF88] text-black py-4 rounded-xl font-semibold hover:bg-[#00CC6E]">
              <Phone className="h-5 w-5 mr-2" />
              Call Rider
            </Button>
            <Button className="bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700">
              <MessageSquare className="h-5 w-5 mr-2" />
              Message
            </Button>
          </div>

          {/* Cancel */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full py-3 text-red-400 border-red-500/20 hover:bg-red-500/10"
          >
            Cancel Ride
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

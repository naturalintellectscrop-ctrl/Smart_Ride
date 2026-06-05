'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';
import { LocationPicker, Location } from './location-picker';
import { VehicleSelection } from './vehicle-selection';
import { PaymentMethodSelector, PaymentMethod, paymentMethodLabels } from '@/components/smart-ride/shared/payment-method-selector';
import {
  VehicleType,
  PricingBreakdown,
  calculateFare,
  calculateAllFares,
  estimateRouteAsync,
  VEHICLE_CONFIGS,
  formatCurrency,
} from './ride-pricing';
import { socketService, DriverRequestData, TaskStatusUpdateData, RiderTaskMatchedData } from '@/services/socket';
import { fetchWithRetry } from '@/lib/api/client-retry';

type BookingStep = 
  | 'location' 
  | 'passengers' 
  | 'vehicle' 
  | 'payment' 
  | 'confirm' 
  | 'searching' 
  | 'matched'
  | 'no_riders';

interface RideBookingProps {
  onClose: () => void;
  initialService?: 'boda' | 'car';
  clientId?: string;
}

// Map frontend vehicle type to backend TaskType
function vehicleTypeToTaskType(v: VehicleType): 'SMART_BODA_RIDE' | 'SMART_CAR_RIDE' {
  return v === 'smart_boda' ? 'SMART_BODA_RIDE' : 'SMART_CAR_RIDE';
}

// Map frontend vehicle type to payment method enum
function paymentMethodToApi(method: PaymentMethod): string {
  switch (method) {
    case 'CASH': return 'CASH';
    case 'MTN_MOMO': return 'MTN_MOMO';
    case 'AIRTEL_MONEY': return 'AIRTEL_MONEY';
    case 'CARD': return 'VISA';
    default: return 'CASH';
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function RideBooking({ onClose, initialService, clientId }: RideBookingProps) {
  // Step state
  const [step, setStep] = useState<BookingStep>('location');
  
  // Location state
  const [pickup, setPickup] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  
  // Route estimation (async)
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; estimatedTimeMinutes: number }>({ distanceKm: 0, estimatedTimeMinutes: 0 });
  const [routeLoading, setRouteLoading] = useState(false);

  const distanceKm = routeInfo.distanceKm;
  const estimatedTimeMinutes = routeInfo.estimatedTimeMinutes;
  
  // Passenger state
  const [passengers, setPassengers] = useState(1);
  
  // Vehicle state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(
    initialService === 'boda' ? 'smart_boda' : initialService === 'car' ? 'economy_car' : null
  );
  
  // Pricing - computed from route and passengers
  const pricing = React.useMemo<Record<VehicleType, PricingBreakdown | null>>(() => {
    if (distanceKm > 0) {
      return calculateAllFares(distanceKm, estimatedTimeMinutes, passengers);
    }
    return {
      smart_boda: null,
      economy_car: null,
      premium_car: null,
      electric_vehicle: null,
    };
  }, [distanceKm, estimatedTimeMinutes, passengers]);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  
  // Task/ride state
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskNumber, setTaskNumber] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [matchTimer, setMatchTimer] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  // Matched rider info (from socket event)
  const [matchedRider, setMatchedRider] = useState<{
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicle: string;
    plateNumber: string;
    eta: string;
    riderRole: string;
  } | null>(null);

  // Refs
  const socketUnsubs = useRef<Array<() => void>>([]);
  const matchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connect to Supabase Realtime on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token && !socketService.isConnectedToSocket()) {
      socketService.connect(token);
    }
  }, []);

  // Auto-select best available vehicle when pricing is ready
  const effectiveVehicle = React.useMemo(() => {
    if (!selectedVehicle && distanceKm > 0) {
      const availableVehicles = Object.entries(pricing)
        .filter(([_, p]) => p !== null)
        .sort((a, b) => (a[1]?.totalFare || 0) - (b[1]?.totalFare || 0));
      if (availableVehicles.length > 0) {
        return availableVehicles[0][0] as VehicleType;
      }
    }
    return selectedVehicle;
  }, [selectedVehicle, pricing, distanceKm]);

  // Sync selected vehicle
  useEffect(() => {
    if (effectiveVehicle && effectiveVehicle !== selectedVehicle) {
      setSelectedVehicle(effectiveVehicle);
    }
  }, [effectiveVehicle, selectedVehicle]);

  // Async route estimation when locations change
  useEffect(() => {
    if (!pickup?.address || !destination?.address) {
      setRouteInfo({ distanceKm: 0, estimatedTimeMinutes: 0 });
      return;
    }

    let cancelled = false;
    setRouteLoading(true);

    estimateRouteAsync(pickup.address, destination.address, 
      pickup.lat && pickup.lng ? { lat: pickup.lat, lng: pickup.lng } : undefined,
      destination.lat && destination.lng ? { lat: destination.lat, lng: destination.lng } : undefined
    ).then((result) => {
      if (!cancelled) {
        setRouteInfo(result);
        setRouteLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setRouteInfo({ distanceKm: 0, estimatedTimeMinutes: 0 });
        setRouteLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [pickup?.address, destination?.address, pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  const selectedPricing = selectedVehicle ? pricing[selectedVehicle] : null;

  // ========================================
  // SOCKET EVENT HANDLING
  // ========================================

  // Cleanup socket listeners on unmount
  useEffect(() => {
    return () => {
      socketUnsubs.current.forEach(unsub => unsub());
      socketUnsubs.current = [];
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Start listening for ride matching events
  const startListeningForMatch = useCallback((createdTaskId: string) => {
    // Clear any previous listeners
    socketUnsubs.current.forEach(unsub => unsub());
    socketUnsubs.current = [];

    // Ensure socket is connected before joining room
    if (!socketService.isConnectedToSocket()) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) socketService.connect(token);
    }

    // Join the task room to receive status updates
    socketService.joinTaskRoom(createdTaskId);

    // Listen for rider:task:matched event (rider accepted)
    const unsubMatched = socketService.on('rider:task:matched', async (data: RiderTaskMatchedData) => {
      if (data.taskId === createdTaskId) {
        // Fetch rider details from the task
        try {
          const result = await fetchWithRetry(`/api/tasks?limit=1`, {
            headers: getAuthHeaders(),
            maxRetries: 2,
          });
          if (result.ok) {
            const taskData = result.data as { data?: any[] } | null;
            const task = taskData?.data?.find((t: any) => t.id === createdTaskId);
            if (task?.rider) {
              setMatchedRider({
                id: task.rider.id,
                name: task.rider.fullName || 'Rider',
                phone: task.rider.phone || '',
                rating: 4.5, // Will be enriched from rider profile
                vehicle: task.rider.riderRole === 'SMART_BODA_RIDER' ? 'Motorcycle' : 'Car',
                plateNumber: '', // Will need vehicle API
                eta: '3-5',
                riderRole: task.rider.riderRole,
              });
            }
          }
        } catch {
          setMatchedRider({
            id: data.riderId || '',
            name: 'Your Rider',
            phone: '',
            rating: 4.5,
            vehicle: 'Vehicle',
            plateNumber: '',
            eta: '3-5',
            riderRole: '',
          });
        }
        setStep('matched');
        if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      }
    });

    // Listen for task status updates
    const unsubStatus = socketService.on('task:status:update', async (data: TaskStatusUpdateData) => {
      if (data.taskId === createdTaskId) {
        if (data.status === 'ASSIGNED' || data.status === 'ACCEPTED') {
          // Task has been assigned - fetch rider details
          try {
            const result = await fetchWithRetry(`/api/tasks/${createdTaskId}`, {
              headers: getAuthHeaders(),
              maxRetries: 2,
            });
            if (result.ok) {
              const taskData = result.data as { data?: any } | null;
              const task = taskData?.data;
              if (task?.rider) {
                setMatchedRider({
                  id: task.rider.id,
                  name: task.rider.fullName || 'Rider',
                  phone: task.rider.phone || '',
                  rating: 4.5,
                  vehicle: task.rider.riderRole === 'SMART_BODA_RIDER' ? 'Motorcycle' : 'Car',
                  plateNumber: '',
                  eta: '3-5',
                  riderRole: task.rider.riderRole,
                });
              }
            }
          } catch {}
          setStep('matched');
          if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        } else if (data.status === 'CANCELLED' || data.status === 'FAILED') {
          setStep('no_riders');
          if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        }
      }
    });

    socketUnsubs.current = [unsubMatched, unsubStatus];
  }, []);

  // ========================================
  // RIDE CREATION
  // ========================================

  const handleConfirmBooking = useCallback(async () => {
    if (!pickup?.address || !destination?.address || !selectedVehicle || !clientId) {
      setCreateError('Missing required booking information');
      return;
    }

    setCreating(true);
    setCreateError(null);
    setStep('searching');

    try {
      const taskType = vehicleTypeToTaskType(selectedVehicle);
      const fare = selectedPricing;

      const payload = {
        taskType,
        clientId,
        pickupAddress: pickup.address,
        pickupLatitude: pickup.lat || null,
        pickupLongitude: pickup.lng || null,
        dropoffAddress: destination.address,
        dropoffLatitude: destination.lat || null,
        dropoffLongitude: destination.lng || null,
        distanceKm: distanceKm || 1,
        paymentMethod: paymentMethodToApi(paymentMethod),
        passengerCount: passengers,
        customPricing: fare ? {
          baseFare: fare.baseFare,
          totalAmount: fare.totalFare,
        } : undefined,
      };

      const result = await fetchWithRetry('/api/tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
        maxRetries: 2,
      });

      if (!result.ok) {
        const errorData = result.data as { error?: string } | null;
        throw new Error(errorData?.error || result.error?.message || 'Failed to create ride');
      }

      const data = result.data as { data?: any } | null;
      const createdTask = data?.data;
      
      if (createdTask?.id) {
        setTaskId(createdTask.id);
        setTaskNumber(createdTask.taskNumber);
        startListeningForMatch(createdTask.id);

        // Start match timer
        matchTimerRef.current = setInterval(() => {
          setMatchTimer(prev => prev + 1);
        }, 1000);

        // Start HTTP polling fallback for status checks
        pollingRef.current = setInterval(async () => {
          if (!createdTask?.id) return;
          try {
            const pollResult = await fetchWithRetry(`/api/tasks/${createdTask.id}`, {
              headers: getAuthHeaders(),
              maxRetries: 1,
            });
            if (pollResult.ok) {
              const pollData = pollResult.data as { data?: any } | null;
              const task = pollData?.data;
              if (task?.status === 'ASSIGNED' || task?.status === 'ACCEPTED') {
                if (task?.rider) {
                  setMatchedRider({
                    id: task.rider.id,
                    name: task.rider.fullName || 'Rider',
                    phone: task.rider.phone || '',
                    rating: 4.5,
                    vehicle: task.rider.riderRole === 'SMART_BODA_RIDER' ? 'Motorcycle' : 'Car',
                    plateNumber: '',
                    eta: '3-5',
                    riderRole: task.rider.riderRole,
                  });
                }
                setStep('matched');
                if (matchTimerRef.current) clearInterval(matchTimerRef.current);
                if (pollingRef.current) clearInterval(pollingRef.current);
              } else if (task?.status === 'CANCELLED' || task?.status === 'FAILED') {
                setStep('no_riders');
                if (matchTimerRef.current) clearInterval(matchTimerRef.current);
                if (pollingRef.current) clearInterval(pollingRef.current);
              }
            }
          } catch {}
        }, 5000); // Poll every 5 seconds as fallback
      }
    } catch (err) {
      console.error('Error creating ride:', err);
      setCreateError(err instanceof Error ? err.message : 'Failed to create ride');
      setStep('confirm');
    } finally {
      setCreating(false);
    }
  }, [pickup, destination, selectedVehicle, clientId, distanceKm, passengers, paymentMethod, selectedPricing, startListeningForMatch]);

  // ========================================
  // CANCELLATION
  // ========================================

  const handleCancelRide = useCallback(async () => {
    if (!taskId) {
      onClose();
      return;
    }
    setCancelling(true);
    try {
      await fetchWithRetry(`/api/tasks/${taskId}/transition`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          toStatus: 'CANCELLED',
          reason: 'CLIENT_CANCELLED',
        }),
        maxRetries: 2,
      });
    } catch (err) {
      console.error('Error cancelling ride:', err);
    }
    // Cleanup
    if (taskId) socketService.leaveTaskRoom(taskId);
    socketUnsubs.current.forEach(unsub => unsub());
    socketUnsubs.current = [];
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    if (pollingRef.current) clearInterval(pollingRef.current);
    setCancelling(false);
    onClose();
  }, [taskId, onClose]);

  const handleSwapLocations = () => {
    const temp = pickup;
    setPickup(destination);
    setDestination(temp);
  };

  const canProceedFromLocation = pickup?.address && destination?.address;

  // Format match timer as mm:ss
  const formatMatchTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Render step header
  const renderHeader = () => (
    <div className="bg-gradient-to-br from-white to-[#f3f4f5] px-4 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-[#bec9bf]/30">
      <button
        onClick={() => {
          if (step === 'location') {
            onClose();
          } else if (step === 'searching' || step === 'matched') {
            // Don't allow back during search/match - must cancel
            return;
          } else if (step === 'no_riders') {
            setStep('confirm');
          } else {
            const steps: BookingStep[] = ['location', 'passengers', 'vehicle', 'payment', 'confirm'];
            const currentIndex = steps.indexOf(step);
            if (currentIndex > 0) {
              setStep(steps[currentIndex - 1]);
            }
          }
        }}
        className="w-10 h-10 bg-[#f3f4f5] rounded-full flex items-center justify-center hover:bg-[#e8ebe8] transition-colors"
      >
        <ArrowLeft className="h-5 w-5 text-[#191c1d]" />
      </button>
      <div>
        <h1 className="text-lg font-bold text-[#191c1d]">
          {step === 'location' && 'Book a Ride'}
          {step === 'passengers' && 'Passengers'}
          {step === 'vehicle' && 'Choose Ride'}
          {step === 'payment' && 'Payment'}
          {step === 'confirm' && 'Confirm Booking'}
          {step === 'searching' && 'Finding Rider...'}
          {step === 'matched' && 'Rider Found!'}
          {step === 'no_riders' && 'No Riders Available'}
        </h1>
        <p className="text-[#6f7a71] text-sm">
          {step === 'location' && 'Enter pickup and destination'}
          {step === 'passengers' && 'How many passengers?'}
          {step === 'vehicle' && `${distanceKm.toFixed(1)} km - ~${estimatedTimeMinutes} min`}
          {step === 'payment' && 'Select payment method'}
          {step === 'confirm' && 'Review your booking'}
          {step === 'searching' && `Searching... ${formatMatchTimer(matchTimer)}`}
          {step === 'matched' && 'Your rider is on the way'}
          {step === 'no_riders' && 'Please try again later'}
        </p>
      </div>
    </div>
  );

  // Location step
  if (step === 'location') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
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
            disabled={!canProceedFromLocation || routeLoading}
            onClick={() => setStep('passengers')}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-base transition-all',
              canProceedFromLocation && !routeLoading
                ? 'bg-[#005f3a] text-white hover:bg-[#0e7a4d]'
                : 'bg-[#bec9bf] text-[#6f7a71] cursor-not-allowed'
            )}
          >
            {routeLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Calculating route...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          {/* Price hint */}
          {canProceedFromLocation && distanceKm > 0 && (
            <Card className="bg-white border-[#bec9bf]/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#6f7a71] text-sm">Estimated fare range</p>
                  <p className="text-[#191c1d] font-semibold">
                    {formatCurrency(Math.min(...Object.values(pricing).filter(Boolean).map(p => p?.totalFare || Infinity)))}
                    {' - '}
                    {formatCurrency(Math.max(...Object.values(pricing).filter(Boolean).map(p => p?.totalFare || 0)))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#6f7a71] text-sm">Distance</p>
                  <p className="text-[#191c1d] font-semibold">{distanceKm.toFixed(1)} km</p>
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
      <div className="min-h-screen bg-[#f8f9fa]">
        {renderHeader()}
        <div className="p-4 space-y-6">
          {/* Route summary */}
          <Card className="bg-white border-[#bec9bf]/30 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#005f3a] rounded-full" />
                <p className="text-[#191c1d]">{pickup?.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <p className="text-[#191c1d]">{destination?.address}</p>
              </div>
            </div>
          </Card>

          {/* Passenger selector */}
          <Card className="bg-white border-[#bec9bf]/30 p-6">
            <h3 className="text-[#191c1d] font-medium mb-6">Number of Passengers</h3>
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => setPassengers(Math.max(1, passengers - 1))}
                className="w-14 h-14 rounded-full bg-[#f3f4f5] border border-[#bec9bf]/40 flex items-center justify-center hover:border-[#005f3a]/50 transition-colors"
              >
                <Minus className="h-6 w-6 text-[#191c1d]" />
              </button>
              <div className="text-center">
                <span className="text-5xl font-bold text-[#191c1d]">{passengers}</span>
                <p className="text-[#6f7a71] text-sm mt-1">
                  {passengers === 1 ? 'passenger' : 'passengers'}
                </p>
              </div>
              <button
                onClick={() => setPassengers(Math.min(6, passengers + 1))}
                className="w-14 h-14 rounded-full bg-[#f3f4f5] border border-[#bec9bf]/40 flex items-center justify-center hover:border-[#005f3a]/50 transition-colors"
              >
                <Plus className="h-6 w-6 text-[#191c1d]" />
              </button>
            </div>

            {/* Passenger hints */}
            <div className="mt-6 space-y-2">
              {passengers === 1 && (
                <p className="text-[#005f3a] text-sm text-center">
                  Available: Smart Boda, Economy Car, Premium Car
                </p>
              )}
              {passengers >= 2 && passengers <= 4 && (
                <p className="text-cyan-400 text-sm text-center">
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
            className="w-full py-4 rounded-2xl font-semibold text-base bg-[#005f3a] text-white hover:bg-[#0e7a4d]"
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
      <div className="min-h-screen bg-[#f8f9fa]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          {/* Route summary mini */}
          <Card className="bg-white border-[#bec9bf]/30 p-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-[#005f3a]" />
              <p className="text-[#6f7a71] text-sm flex-1 truncate">{pickup?.address}</p>
              <ArrowRight className="h-4 w-4 text-[#bec9bf]" />
              <Navigation className="h-4 w-4 text-red-500" />
              <p className="text-[#6f7a71] text-sm flex-1 truncate text-right">{destination?.address}</p>
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
                ? 'bg-[#005f3a] text-white hover:bg-[#0e7a4d]'
                : 'bg-[#bec9bf] text-[#6f7a71] cursor-not-allowed'
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
      <div className="min-h-screen bg-[#f8f9fa]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          {/* Selected vehicle */}
          <Card className="bg-white border-[#bec9bf]/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6f7a71] text-sm">Selected ride</p>
                <p className="text-[#191c1d] font-medium">
                  {selectedVehicle && VEHICLE_CONFIGS[selectedVehicle].name}
                </p>
              </div>
              {selectedPricing && (
                <p className="text-[#005f3a] font-bold text-xl">
                  {selectedPricing.formattedFare}
                </p>
              )}
            </div>
          </Card>

          {/* Payment method selector */}
          <div>
            <h3 className="text-[#191c1d] font-medium mb-3">Select Payment Method</h3>
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelect={setPaymentMethod}
            />
          </div>

          {/* Continue button */}
          <Button
            onClick={() => setStep('confirm')}
            className="w-full py-4 rounded-2xl font-semibold text-base bg-[#005f3a] text-white hover:bg-[#0e7a4d] mt-4"
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
      <div className="min-h-screen bg-[#f8f9fa]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          {/* Trip summary */}
          <Card className="bg-white border-[#bec9bf]/30 overflow-hidden">
            <div className="p-4 border-b border-[#bec9bf]/30">
              <h3 className="text-[#191c1d] font-medium">Trip Summary</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Route */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-[#005f3a] rounded-full mt-1" />
                  <div>
                    <p className="text-[#6f7a71] text-xs">Pickup</p>
                    <p className="text-[#191c1d]">{pickup?.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-1" />
                  <div>
                    <p className="text-[#6f7a71] text-xs">Destination</p>
                    <p className="text-[#191c1d]">{destination?.address}</p>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#bec9bf]/30">
                <div>
                  <p className="text-[#6f7a71] text-xs">Distance</p>
                  <p className="text-[#191c1d] font-medium">{distanceKm.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-[#6f7a71] text-xs">Est. Time</p>
                  <p className="text-[#191c1d] font-medium">~{estimatedTimeMinutes} min</p>
                </div>
                <div>
                  <p className="text-[#6f7a71] text-xs">Passengers</p>
                  <p className="text-[#191c1d] font-medium">{passengers}</p>
                </div>
                <div>
                  <p className="text-[#6f7a71] text-xs">Vehicle</p>
                  <p className="text-[#191c1d] font-medium">
                    {selectedVehicle && VEHICLE_CONFIGS[selectedVehicle].name}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Fare breakdown */}
          {selectedPricing && (
            <Card className="bg-white border-[#bec9bf]/30 p-4">
              <h3 className="text-[#191c1d] font-medium mb-3">Fare Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6f7a71]">Base fare</span>
                  <span className="text-[#191c1d]">{formatCurrency(selectedPricing.baseFare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6f7a71]">Distance ({distanceKm.toFixed(1)} km)</span>
                  <span className="text-[#191c1d]">{formatCurrency(selectedPricing.distanceFare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6f7a71]">Time ({estimatedTimeMinutes} min)</span>
                  <span className="text-[#191c1d]">{formatCurrency(selectedPricing.timeFare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6f7a71]">Booking fee</span>
                  <span className="text-[#191c1d]">{formatCurrency(selectedPricing.bookingFee)}</span>
                </div>
                {selectedPricing.multiplierApplied !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6f7a71]">Vehicle rate adjustment</span>
                    <span className={cn(
                      selectedPricing.multiplierApplied > 0 ? 'text-orange-400' : 'text-[#005f3a]'
                    )}>
                      {selectedPricing.multiplierApplied > 0 ? '+' : ''}
                      {formatCurrency(selectedPricing.multiplierApplied)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#bec9bf]/30">
                  <span className="text-[#191c1d] font-medium">Total</span>
                  <span className="text-[#005f3a] font-bold text-lg">
                    {selectedPricing.formattedFare}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Payment method */}
          <Card className="bg-white border-[#bec9bf]/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6f7a71] text-xs">Payment Method</p>
                <p className="text-[#191c1d] font-medium">{paymentMethodLabels[paymentMethod]}</p>
              </div>
              <button
                onClick={() => setStep('payment')}
                className="text-[#005f3a] text-sm"
              >
                Change
              </button>
            </div>
          </Card>

          {/* Error message */}
          {createError && (
            <Card className="bg-red-500/10 border-red-500/30 p-4">
              <p className="text-red-400 text-sm">{createError}</p>
            </Card>
          )}

          {/* Confirm button */}
          <Button
            onClick={handleConfirmBooking}
            disabled={creating}
            className="w-full py-4 rounded-2xl font-semibold text-base bg-[#005f3a] text-white hover:bg-[#0e7a4d] mt-4"
          >
            {creating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating ride...
              </>
            ) : (
              <>
                Confirm Booking
                <Check className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          {/* Disclaimer */}
          <p className="text-[#6f7a71] text-xs text-center">
            Final fare may vary based on actual route and traffic conditions
          </p>
        </div>
      </div>
    );
  }

  // Searching step
  if (step === 'searching') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        {renderHeader()}
        <div className="p-4">
          {/* Animated searching */}
          <div className="bg-gradient-to-br from-white to-[#f3f4f5] rounded-3xl h-72 flex items-center justify-center relative overflow-hidden">
            {/* Animated dots */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-[#005f3a] rounded-full animate-ping" />
              <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-[#005f3a] rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 left-1/2 w-5 h-5 bg-[#005f3a] rounded-full animate-ping" />
              <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-[#005f3a] rounded-full animate-pulse" />
            </div>
            
            <div className="text-center z-10">
              <div className="w-24 h-24 bg-[#98f6be]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                {selectedVehicle === 'smart_boda' ? (
                  <Bike className="h-12 w-12 text-[#005f3a] animate-bounce" />
                ) : (
                  <Car className="h-12 w-12 text-[#005f3a] animate-bounce" />
                )}
              </div>
              <p className="text-[#191c1d] font-medium text-lg">Finding nearby riders...</p>
              <p className="text-[#6f7a71] text-sm mt-1">
                {matchTimer < 30 ? 'This usually takes 1-2 minutes' : matchTimer < 60 ? 'Still searching...' : 'Taking longer than usual'}
              </p>
              {taskNumber && (
                <p className="text-[#6f7a71] text-xs mt-2">Ride #{taskNumber}</p>
              )}
            </div>
          </div>

          {/* Route reminder */}
          <Card className="bg-white border-[#bec9bf]/30 p-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#005f3a] rounded-full" />
                <p className="text-[#191c1d] text-sm">{pickup?.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <p className="text-[#191c1d] text-sm">{destination?.address}</p>
              </div>
            </div>
          </Card>

          {/* Cancel button */}
          <Button
            onClick={handleCancelRide}
            disabled={cancelling}
            variant="outline"
            className="w-full py-4 rounded-xl font-medium text-base mt-6 border-[#bec9bf]/40 text-[#6f7a71] hover:bg-[#f3f4f5]"
          >
            {cancelling ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : null}
            Cancel Search
          </Button>
        </div>
      </div>
    );
  }

  // No riders available step
  if (step === 'no_riders') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        {renderHeader()}
        <div className="p-4">
          <div className="bg-gradient-to-br from-white to-[#f3f4f5] rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <p className="text-[#191c1d] font-medium text-lg">No riders available</p>
            <p className="text-[#6f7a71] text-sm mt-2">
              We couldn&apos;t find a nearby rider. Please try again in a moment.
            </p>
            {taskNumber && (
              <p className="text-[#6f7a71] text-xs mt-2">Ride #{taskNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              onClick={handleConfirmBooking}
              className="bg-[#005f3a] text-white py-4 rounded-2xl font-semibold hover:bg-[#0e7a4d]"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="py-4 rounded-xl font-medium border-[#bec9bf]/40 text-[#6f7a71] hover:bg-[#f3f4f5]"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Matched step
  if (step === 'matched') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        {renderHeader()}
        <div className="p-4 space-y-4">
          {/* Success badge */}
          <div className="flex justify-center">
            <Badge className="bg-[#005f3a]/20 text-[#005f3a] px-4 py-2 text-sm">
              <Check className="h-4 w-4 mr-2" />
              Rider Found
            </Badge>
          </div>

          {/* Rider card */}
          {matchedRider ? (
            <Card className="bg-white border-[#005f3a]/30 p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#98f6be]/40 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-[#005f3a]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[#191c1d]">{matchedRider.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-[#191c1d]">{matchedRider.rating}</span>
                    </div>
                    <Badge className="bg-[#005f3a]/10 text-[#005f3a] text-xs ml-1">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#bec9bf]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#6f7a71]">Vehicle</p>
                    <p className="font-medium text-[#191c1d]">{matchedRider.vehicle}</p>
                  </div>
                  {matchedRider.plateNumber && (
                    <div className="text-right">
                      <p className="text-sm text-[#6f7a71]">Plate Number</p>
                      <p className="font-medium text-[#191c1d]">{matchedRider.plateNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-white border-[#005f3a]/30 p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#98f6be]/40 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-[#005f3a] animate-spin" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#191c1d]">Loading rider info...</h3>
                  <p className="text-[#6f7a71] text-sm">Fetching rider details</p>
                </div>
              </div>
            </Card>
          )}

          {/* ETA */}
          <div className="text-center py-4">
            <p className="text-[#6f7a71]">Arriving in</p>
            <p className="text-4xl font-bold text-[#005f3a]">{matchedRider?.eta || '3-5'} min</p>
          </div>

          {/* Route */}
          <Card className="bg-white border-[#bec9bf]/30 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-[#005f3a]" />
                <p className="text-[#191c1d]">{pickup?.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-red-500" />
                <p className="text-[#191c1d]">{destination?.address}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#bec9bf]/30 flex justify-between">
              <div>
                <p className="text-sm text-[#6f7a71]">Trip fare</p>
                <p className="font-bold text-lg text-[#191c1d]">
                  {selectedPricing?.formattedFare}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#6f7a71]">Payment</p>
                <p className="font-medium text-[#191c1d]">{paymentMethodLabels[paymentMethod]}</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button className="bg-[#005f3a] text-white py-4 rounded-2xl font-semibold hover:bg-[#0e7a4d]">
              <Phone className="h-5 w-5 mr-2" />
              Call Rider
            </Button>
            <Button className="bg-cyan-600 text-[#191c1d] py-4 rounded-xl font-semibold hover:bg-cyan-700">
              <MessageSquare className="h-5 w-5 mr-2" />
              Message
            </Button>
          </div>

          {/* Cancel */}
          <Button
            onClick={handleCancelRide}
            disabled={cancelling}
            variant="outline"
            className="w-full py-3 text-red-400 border-red-500/20 hover:bg-red-500/10"
          >
            {cancelling ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
            Cancel Ride
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

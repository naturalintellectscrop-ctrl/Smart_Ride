'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  User,
  Clock,
  Bike,
  Car,
  Plus,
  Minus,
  Star,
  Phone,
  MessageSquare,
  Check,
  Shield,
  AlertTriangle,
  Loader2,
  Zap,
  RefreshCw,
  Target,
  Search,
  ChevronRight,
  CreditCard,
  Wallet,
  Smartphone
} from 'lucide-react';
import { SOSButtonModal } from '@/components/mobile/shared/sos-button';
import { SOSEmergencyScreen } from '@/components/mobile/shared/sos-emergency-screen';
import { 
  useCreateTask, 
  useCreateDispatch,
  TaskRequest 
} from '@/lib/api/client-api';
import { getServiceColors } from '@/lib/theme/smart-ride-theme';
import { useUser } from '@/components/smart-ride/context/user-context';

// ============================================
// Types
// ============================================

type BookingStep = 'location' | 'vehicle' | 'confirmation' | 'searching' | 'matched' | 'inTrip';

type VehicleType = 'moto' | 'economy' | 'premium' | 'electric';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface RouteData {
  distanceKm: number;
  durationMin: number;
  geometry: string;
}

interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  subtotal: number;
  surgeMultiplier: number;
  total: number;
}

interface VehicleOption {
  id: VehicleType;
  name: string;
  description: string;
  icon: React.ElementType;
  multiplier: number;
  eta: string;
  fare: FareBreakdown;
}

// ============================================
// Constants
// ============================================

// SECURITY: Use authenticated user ID from context instead of hardcoded demo ID

const VEHICLE_CONFIG: Record<VehicleType, {
  name: string;
  description: string;
  icon: React.ElementType;
  multiplier: number;
  avgSpeed: number;
  maxPassengers: number;
  color: string;
}> = {
  moto: {
    name: 'Smart Ride',
    description: 'Quick motorcycle ride',
    icon: Bike,
    multiplier: 0.7,
    avgSpeed: 40,
    maxPassengers: 1,
    color: '#10B981'
  },
  economy: {
    name: 'Smart Car',
    description: 'Affordable car ride',
    icon: Car,
    multiplier: 1.0,
    avgSpeed: 35,
    maxPassengers: 4,
    color: '#3B82F6'
  },
  premium: {
    name: 'Premium',
    description: 'Luxury comfort ride',
    icon: Car,
    multiplier: 1.5,
    avgSpeed: 35,
    maxPassengers: 4,
    color: '#8B5CF6'
  },
  electric: {
    name: 'Electric',
    description: 'Eco-friendly ride',
    icon: Zap,
    multiplier: 1.3,
    avgSpeed: 40,
    maxPassengers: 4,
    color: '#00FF88'
  }
};

// ============================================
// Pricing Calculator (Client-side preview)
// ============================================

function calculateFare(
  distanceKm: number,
  durationMin: number,
  vehicleType: VehicleType,
  surgeMultiplier: number = 1.0
): FareBreakdown {
  const BASE_FARE = 2000;
  const PRICE_PER_KM = 150;
  const PRICE_PER_MIN = 30;
  const BOOKING_FEE = 500;

  const config = VEHICLE_CONFIG[vehicleType];
  
  const baseFare = BASE_FARE;
  const distanceFare = distanceKm * PRICE_PER_KM;
  const timeFare = durationMin * PRICE_PER_MIN;
  const bookingFee = BOOKING_FEE;
  
  const subtotal = baseFare + distanceFare + timeFare + bookingFee;
  const total = Math.round(subtotal * config.multiplier * surgeMultiplier);

  return {
    baseFare,
    distanceFare: Math.round(distanceFare),
    timeFare: Math.round(timeFare),
    bookingFee,
    subtotal: Math.round(subtotal),
    surgeMultiplier,
    total
  };
}

// ============================================
// Mock Geocoding (Kampala areas)
// ============================================

const KAMPALA_LOCATIONS = [
  { name: 'Nakasero', lat: 0.3180, lng: 32.5810 },
  { name: 'Kololo', lat: 0.3330, lng: 32.5870 },
  { name: 'Ntinda', lat: 0.3510, lng: 32.6120 },
  { name: 'Kampala CBD', lat: 0.3150, lng: 32.5710 },
  { name: 'Makindye', lat: 0.2930, lng: 32.5780 },
  { name: 'Mengo', lat: 0.3050, lng: 32.5580 },
  { name: 'Kisenyi', lat: 0.3160, lng: 32.5610 },
  { name: 'Katwe', lat: 0.3090, lng: 32.5700 },
  { name: 'Wandegeya', lat: 0.3390, lng: 32.5730 },
  { name: 'Kamwokya', lat: 0.3320, lng: 32.5780 },
];

function geocodeAddress(address: string): LocationData | null {
  const found = KAMPALA_LOCATIONS.find(loc => 
    address.toLowerCase().includes(loc.name.toLowerCase())
  );
  
  if (found) {
    return {
      address: found.name,
      latitude: found.lat,
      longitude: found.lng
    };
  }
  
  // Default to Kampala CBD
  return {
    address: address || 'Kampala',
    latitude: 0.3150,
    longitude: 32.5710
  };
}

function calculateRoute(pickup: LocationData, destination: LocationData): RouteData {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (destination.latitude - pickup.latitude) * Math.PI / 180;
  const dLng = (destination.longitude - pickup.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pickup.latitude * Math.PI / 180) * Math.cos(destination.latitude * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  
  // Estimate time based on average speed (30 km/h in city traffic)
  const durationMin = Math.round((distanceKm / 30) * 60);
  
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.max(5, durationMin),
    geometry: '' // Would contain encoded polyline in production
  };
}

// ============================================
// Main Component
// ============================================

interface ServiceScreenProps {
  serviceType: 'boda' | 'car' | 'food' | 'shopping' | 'item' | 'health';
  onBack: () => void;
}

export function ServiceScreen({ serviceType, onBack }: ServiceScreenProps) {
  const serviceColors = getServiceColors(serviceType);
  const { user } = useUser();
  
  // SECURITY: Get client ID from authenticated user context
  const clientId = user?.id || '';
  
  // Booking state
  const [step, setStep] = useState<BookingStep>('location');
  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('economy');
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'WALLET'>('CASH');
  const [calculating, setCalculating] = useState(false);
  
  // Trip state
  const [currentTask, setCurrentTask] = useState<{
    id: string;
    taskNumber: string;
    status: string;
  } | null>(null);
  
  const [matchedProvider, setMatchedProvider] = useState<{
    id: string;
    name: string;
    rating: number;
    trips: number;
    vehicle?: string;
    plateNumber?: string;
    phone?: string;
    eta?: number;
  } | null>(null);
  
  const [showSOS, setShowSOS] = useState(false);
  
  // API hooks
  const { createTask, loading: creatingTask, error: taskError } = useCreateTask();
  const { createDispatch, loading: dispatching } = useCreateDispatch();
  
  const isRideService = serviceType === 'boda' || serviceType === 'car';

  // ============================================
  // Calculate route and vehicle options
  // ============================================
  
  const handleCalculateRoute = useCallback(async () => {
    if (!pickupInput || !destinationInput) return;
    
    setCalculating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const pickupLocation = geocodeAddress(pickupInput);
    const destinationLocation = geocodeAddress(destinationInput);
    
    if (pickupLocation && destinationLocation) {
      setPickup(pickupLocation);
      setDestination(destinationLocation);
      
      const routeData = calculateRoute(pickupLocation, destinationLocation);
      setRoute(routeData);
      
      // Calculate surge (mock)
      const hour = new Date().getHours();
      let surge = 1.0;
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        surge = 1.25;
      } else if (hour >= 22 || hour <= 5) {
        surge = 1.15;
      }
      
      // Generate vehicle options
      const options: VehicleOption[] = Object.entries(VEHICLE_CONFIG)
        .filter(([id, config]) => {
          // Filter by passenger count
          if (passengers > config.maxPassengers) return false;
          // Moto only for 1 passenger
          if (id === 'moto' && passengers > 1) return false;
          return true;
        })
        .map(([id, config]) => ({
          id: id as VehicleType,
          name: config.name,
          description: config.description,
          icon: config.icon,
          multiplier: config.multiplier,
          eta: `${Math.round(routeData.durationMin / (config.avgSpeed / 30)) + Math.floor(Math.random() * 3)}-${Math.round(routeData.durationMin / (config.avgSpeed / 30)) + 3 + Math.floor(Math.random() * 3)} min`,
          fare: calculateFare(routeData.distanceKm, routeData.durationMin, id as VehicleType, surge)
        }));
      
      setVehicleOptions(options);
      
      // Auto-select cheapest available option
      if (options.length > 0) {
        setSelectedVehicle(options[0].id);
      }
      
      setStep('vehicle');
    }
    
    setCalculating(false);
  }, [pickupInput, destinationInput, passengers]);

  // ============================================
  // Handle ride confirmation
  // ============================================
  
  const handleConfirmRide = useCallback(async () => {
    if (!pickup || !destination || !route) return;
    
    setStep('searching');
    
    try {
      const taskData: TaskRequest = {
        taskType: selectedVehicle === 'moto' ? 'SMART_BODA_RIDE' : 'SMART_CAR_RIDE',
        clientId,
        pickupAddress: pickup.address,
        dropoffAddress: destination.address,
        distanceKm: route.distanceKm,
        paymentMethod: paymentMethod,
        passengerCount: isRideService ? passengers : undefined,
      };
      
      const result = await createTask(taskData);
      
      if (result.success && result.data) {
        setCurrentTask({
          id: result.data.id,
          taskNumber: result.data.taskNumber,
          status: result.data.status,
        });
        
        await createDispatch(
          result.data.id,
          selectedVehicle === 'moto' ? 'SMART_BODA_RIDE' : 'SMART_CAR_RIDE',
          { latitude: pickup.latitude, longitude: pickup.longitude }
        );
        
        // Simulate matching
        setTimeout(() => {
          setMatchedProvider({
            id: 'rider_demo_001',
            name: 'Emmanuel Okello',
            rating: 4.8,
            trips: 234,
            vehicle: VEHICLE_CONFIG[selectedVehicle].name,
            plateNumber: 'UAX 123A',
            phone: '+256 700 123 456',
            eta: 3,
          });
          setStep('matched');
        }, 2000 + Math.random() * 2000);
      } else {
        setStep('confirmation');
        alert('Failed to create request. Please try again.');
      }
    } catch (error) {
      setStep('confirmation');
      alert('An error occurred. Please try again.');
    }
  }, [pickup, destination, route, selectedVehicle, paymentMethod, passengers, isRideService, createTask, createDispatch]);

  // ============================================
  // Get selected vehicle fare
  // ============================================
  
  const selectedVehicleOption = vehicleOptions.find(v => v.id === selectedVehicle);
  
  // ============================================
  // SOS active task
  // ============================================
  
  const activeTask = (step === 'matched' || step === 'inTrip') && currentTask ? {
    id: currentTask.id,
    taskNumber: currentTask.taskNumber,
    taskType: 'SMART_BODA_RIDE',
    pickupAddress: pickup?.address || 'Pickup',
    dropoffAddress: destination?.address || 'Destination',
    riderInfo: {
      name: matchedProvider?.name || 'Driver',
      phone: matchedProvider?.phone || '+256 700 000 000',
      vehicleMake: 'Toyota',
      vehicleModel: 'Premio',
      plateNumber: matchedProvider?.plateNumber || 'UAX 123A',
    },
  } : undefined;

  // ============================================
  // Render: SOS Emergency Screen
  // ============================================
  
  if (showSOS && activeTask) {
    return (
      <SOSEmergencyScreen
        userType="CLIENT"
        userId={clientId}
        activeTask={activeTask}
        onClose={() => setShowSOS(false)}
      />
    );
  }

  // ============================================
  // Render: Searching Screen
  // ============================================
  
  if (step === 'searching') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        <div 
          className="px-4 py-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, ${serviceColors.primary}10)` }}
        >
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Finding your ride</h1>
            <p className="text-white/60 text-sm">Searching for nearby drivers...</p>
          </div>
        </div>
        
        <div className="px-4 pt-8">
          <div 
            className="rounded-3xl h-64 flex items-center justify-center relative overflow-hidden mt-6 glass-panel"
            style={{ background: `linear-gradient(135deg, ${serviceColors.primary}10, rgba(26, 26, 36, 0.8))` }}
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full animate-ping" style={{ backgroundColor: serviceColors.primary }} />
              <div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: serviceColors.primary }} />
              <div className="absolute bottom-1/4 left-1/2 w-5 h-5 rounded-full animate-ping" style={{ backgroundColor: serviceColors.primary }} />
            </div>
            <div className="text-center z-10">
              <div 
                className="w-20 h-20 bg-[#1A1A24] rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: `0 0 30px ${serviceColors.glow}` }}
              >
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: serviceColors.primary }} />
              </div>
              <p className="font-medium text-white">Looking for nearby drivers...</p>
              <p className="text-white/40 text-sm mt-1">This usually takes 1-2 minutes</p>
            </div>
          </div>

          <Card className="mt-4 p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: serviceColors.primary }} />
                <p className="text-white">{pickup?.address || pickupInput}</p>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-white/10 h-4" />
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#F97316] rounded-full" />
                <p className="text-white">{destination?.address || destinationInput}</p>
              </div>
            </div>
            
            {currentTask && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-sm text-white/40">Request ID: <span className="font-mono text-[#00FF88]">{currentTask.taskNumber}</span></p>
              </div>
            )}
          </Card>
          
          <button 
            onClick={() => { setStep('confirmation'); setCurrentTask(null); }}
            className="w-full mt-4 text-[#EF4444] py-3 font-medium hover:text-red-400 transition-colors"
          >
            Cancel Request
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Matched / In Trip Screen
  // ============================================
  
  if (step === 'matched' || step === 'inTrip') {
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-24">
        <div className="fixed top-4 right-4 z-50">
          <SOSButtonModal onOpen={() => setShowSOS(true)} />
        </div>

        <div 
          className="px-4 py-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, ${serviceColors.primary}10)` }}
        >
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">
              {step === 'inTrip' ? 'Trip in Progress' : 'Driver Found!'}
            </h1>
          </div>
        </div>
        
        <div className="px-4 pt-4">
          <Card 
            className="p-6 border-2 bg-[#1A1A24]/80 glass-panel"
            style={{ borderColor: `${serviceColors.primary}40` }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${serviceColors.primary}20` }}
              >
                <User className="h-8 w-8" style={{ color: serviceColors.primary }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white">{matchedProvider?.name || 'Driver'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-white">{matchedProvider?.rating || 4.8}</span>
                  </div>
                  <span className="text-white/30">•</span>
                  <span className="text-sm text-white/60">{matchedProvider?.trips || 0} rides</span>
                  <div 
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${serviceColors.primary}20`, color: serviceColors.primary }}
                  >
                    <Shield className="h-3 w-3" />
                    <span>Verified</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/50">Vehicle</p>
                  <p className="font-medium text-white">{matchedProvider?.vehicle || 'Vehicle'} • Red</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/50">Plate</p>
                  <p className="font-medium text-white">{matchedProvider?.plateNumber || 'UAX 123A'}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-4 text-center">
            <p className="text-white/50">{step === 'inTrip' ? 'Arriving at destination in' : 'Arriving in'}</p>
            <p className="text-4xl font-bold text-neon-glow" style={{ color: serviceColors.primary }}>
              {step === 'inTrip' ? '8 min' : `${matchedProvider?.eta || 3} min`}
            </p>
          </div>

          <Card className="mt-4 p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5" style={{ color: serviceColors.primary }} />
                <p className="text-white">{pickup?.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-[#F97316]" />
                <p className="text-white">{destination?.address}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
              <div>
                <p className="text-sm text-white/50">Trip fare</p>
                <p className="font-bold text-lg text-white">UGX {selectedVehicleOption?.fare.total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-white/50">Payment</p>
                <p className="font-medium text-[#00FF88]">{paymentMethod === 'MOBILE_MONEY' ? 'MTN MoMo' : paymentMethod}</p>
              </div>
            </div>
          </Card>

          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  if (matchedProvider?.phone) {
                    window.location.href = `tel:${matchedProvider.phone}`;
                  }
                }}
                className="py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-white transition-all hover:scale-[1.02]"
                style={{ backgroundColor: serviceColors.primary, boxShadow: `0 0 20px ${serviceColors.glow}` }}
              >
                <Phone className="h-5 w-5" />
                Call Driver
              </button>
              <button className="bg-[#3B82F6] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 electric-glow-sm hover:bg-blue-500 transition-all hover:scale-[1.02]">
                <MessageSquare className="h-5 w-5" />
                Message
              </button>
            </div>
            {step === 'matched' && (
              <button 
                onClick={() => setStep('inTrip')}
                className="w-full bg-[#1A1A24] text-white py-4 rounded-xl font-medium border border-white/10 hover:border-white/20 transition-all"
              >
                Start Trip
              </button>
            )}
            {step === 'inTrip' && (
              <button 
                onClick={onBack}
                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: `${serviceColors.primary}20`, color: serviceColors.primary }}
              >
                <Check className="h-5 w-5" />
                Complete Trip
              </button>
            )}
            <button onClick={onBack} className="w-full text-[#EF4444] py-3 font-medium hover:text-red-400 transition-colors">
              Cancel Ride
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Confirmation Screen
  // ============================================
  
  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('vehicle')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Confirm Your Ride</h1>
              <p className="text-white/60 text-sm">Review your trip details</p>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-4 space-y-4">
          {/* Route Summary */}
          <Card className="p-4 bg-[#1A1A24]/90 border-white/5 glass-panel">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${serviceColors.primary}20` }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: serviceColors.primary }} />
                </div>
                <div>
                  <p className="text-xs text-white/50">Pickup</p>
                  <p className="text-white font-medium">{pickup?.address}</p>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-dashed border-white/10 h-4" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#F97316]/20 rounded-full flex items-center justify-center">
                  <Navigation className="h-4 w-4 text-[#F97316]" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Destination</p>
                  <p className="text-white font-medium">{destination?.address}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Trip Stats */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-white/50">Distance</p>
                <p className="text-lg font-bold text-white">{route?.distanceKm} km</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Est. Time</p>
                <p className="text-lg font-bold text-white">{route?.durationMin} min</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Passengers</p>
                <p className="text-lg font-bold text-white">{passengers}</p>
              </div>
            </div>
          </Card>

          {/* Vehicle Selected */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <p className="text-xs text-white/50 mb-3">Vehicle</p>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${VEHICLE_CONFIG[selectedVehicle].color}20` }}
              >
                {React.createElement(VEHICLE_CONFIG[selectedVehicle].icon, { 
                  className: "h-6 w-6",
                  style: { color: VEHICLE_CONFIG[selectedVehicle].color }
                })}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{VEHICLE_CONFIG[selectedVehicle].name}</p>
                <p className="text-sm text-white/50">{VEHICLE_CONFIG[selectedVehicle].description}</p>
              </div>
              <button 
                onClick={() => setStep('vehicle')}
                className="text-[#00FF88] text-sm font-medium"
              >
                Change
              </button>
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <p className="text-xs text-white/50 mb-3">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: '💵' },
                { id: 'MOBILE_MONEY', label: 'MoMo', icon: '📱' },
                { id: 'WALLET', label: 'Wallet', icon: '💳' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                  className={cn(
                    "p-3 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    paymentMethod === method.id
                      ? "border-[#00FF88] bg-[#00FF88]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    paymentMethod === method.id ? "text-[#00FF88]" : "text-white/60"
                  )}>{method.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Fare Breakdown */}
          <Card className="p-4 border-2 bg-[#1A1A24]/80 glass-card" style={{ borderColor: `${serviceColors.primary}30` }}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Base fare</span>
                <span className="text-white">UGX {selectedVehicleOption?.fare.baseFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Distance ({route?.distanceKm} km)</span>
                <span className="text-white">UGX {selectedVehicleOption?.fare.distanceFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Time ({route?.durationMin} min)</span>
                <span className="text-white">UGX {selectedVehicleOption?.fare.timeFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Booking fee</span>
                <span className="text-white">UGX {selectedVehicleOption?.fare.bookingFee.toLocaleString()}</span>
              </div>
              {selectedVehicleOption?.fare.surgeMultiplier && selectedVehicleOption.fare.surgeMultiplier > 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#F59E0B]">Surge ({selectedVehicleOption.fare.surgeMultiplier}x)</span>
                  <span className="text-[#F59E0B]">+UGX {Math.round(selectedVehicleOption.fare.subtotal * (selectedVehicleOption.fare.surgeMultiplier - 1)).toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-white/10 flex justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-xl font-bold text-[#00FF88]">UGX {selectedVehicleOption?.fare.total.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Confirm Button */}
          <Button 
            onClick={handleConfirmRide}
            className="w-full h-14 text-lg font-semibold rounded-xl bg-[#00FF88] text-[#0D0D12] hover:bg-[#10B981] neon-glow"
          >
            Confirm Ride • UGX {selectedVehicleOption?.fare.total.toLocaleString()}
          </Button>
          
          <p className="text-center text-xs text-white/30">
            By confirming, you agree to our Terms of Service
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Vehicle Selection Screen
  // ============================================
  
  if (step === 'vehicle') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('location')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Choose Your Ride</h1>
              <p className="text-white/60 text-sm">Select vehicle type</p>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-4">
          {/* Route Preview */}
          <Card className="p-3 bg-[#1A1A24]/90 border-white/5 glass-panel mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: serviceColors.primary }} />
                  <p className="text-sm text-white truncate">{pickup?.address}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[#F97316]" />
                  <p className="text-sm text-white truncate">{destination?.address}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{route?.distanceKm} km</p>
                <p className="text-xs text-white/50">{route?.durationMin} min</p>
              </div>
            </div>
          </Card>

          {/* Vehicle Options */}
          <div className="space-y-3">
            {vehicleOptions.map((vehicle) => {
              const isSelected = selectedVehicle === vehicle.id;
              const config = VEHICLE_CONFIG[vehicle.id];
              
              return (
                <Card 
                  key={vehicle.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all",
                    isSelected 
                      ? "border-2 glass-panel" 
                      : "bg-[#1A1A24]/80 border-white/5 hover:border-white/10"
                  )}
                  style={isSelected ? { borderColor: config.color } : undefined}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}20` }}
                    >
                      <vehicle.icon className="h-7 w-7" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{vehicle.name}</p>
                        {isSelected && (
                          <Check className="h-4 w-4" style={{ color: config.color }} />
                        )}
                      </div>
                      <p className="text-sm text-white/50">{vehicle.description}</p>
                      <p className="text-xs text-white/40 mt-1">{vehicle.eta} away</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: config.color }}>
                        UGX {vehicle.fare.total.toLocaleString()}
                      </p>
                      {vehicle.multiplier !== 1.0 && (
                        <p className="text-xs text-white/40">
                          {vehicle.multiplier < 1 ? `${Math.round((1 - vehicle.multiplier) * 100)}% off` : `${vehicle.multiplier}x`}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Passenger Info */}
          <Card className="mt-4 p-3 bg-[#1A1A24]/80 border-white/5 glass-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-white/50" />
                <span className="text-sm text-white/70">{passengers} passenger{passengers > 1 ? 's' : ''}</span>
              </div>
              <button 
                onClick={() => setStep('location')}
                className="text-[#00FF88] text-sm font-medium"
              >
                Change
              </button>
            </div>
          </Card>

          {/* Continue Button */}
          <Button 
            onClick={() => setStep('confirmation')}
            disabled={!selectedVehicle}
            className="w-full h-14 text-lg font-semibold rounded-xl mt-6 bg-[#00FF88] text-[#0D0D12] hover:bg-[#10B981] neon-glow"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Location Selection Screen (Default)
  // ============================================
  
  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header */}
      <div 
        className="px-4 pt-4 pb-6"
        style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {isRideService ? 'Book a Ride' : 'Book Delivery'}
            </h1>
            <p className="text-white/60 text-sm">Enter your trip details</p>
          </div>
        </div>
      </div>

      {/* Location Inputs */}
      <div className="px-4 -mt-4">
        <Card className="p-4 bg-[#1A1A24]/90 border-white/5 glass-panel">
          <div className="space-y-3">
            {/* Pickup */}
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${serviceColors.primary}20` }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: serviceColors.primary }} />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={pickupInput}
                  onChange={(e) => setPickupInput(e.target.value)}
                  placeholder="Enter pickup location"
                  className="w-full h-12 px-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#00FF88]/50 focus:outline-none transition-colors"
                />
                <Target className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              </div>
            </div>

            {/* Connector */}
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                <div className="w-0.5 h-4 bg-white/10" />
              </div>
            </div>

            {/* Destination */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#F97316]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Navigation className="h-4 w-4 text-[#F97316]" />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  placeholder="Where are you going?"
                  className="w-full h-12 px-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#00FF88]/50 focus:outline-none transition-colors"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Passenger Count - Only for rides */}
      {isRideService && (
        <div className="px-4 mt-4">
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5 text-white/60" />
                </div>
                <div>
                  <p className="font-medium text-white">Passengers</p>
                  <p className="text-sm text-white/40">How many people?</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPassengers(Math.max(1, passengers - 1))} 
                  className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <Minus className="h-5 w-5 text-white/60" />
                </button>
                <span className="w-8 text-center font-semibold text-lg text-white">{passengers}</span>
                <button 
                  onClick={() => setPassengers(Math.min(4, passengers + 1))} 
                  className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <Plus className="h-5 w-5 text-white/60" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Popular Locations */}
      <div className="px-4 mt-4">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Popular Locations</p>
        <Card className="divide-y divide-white/5 bg-[#1A1A24]/80 border-white/5">
          {KAMPALA_LOCATIONS.slice(0, 5).map((loc, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!pickupInput) {
                  setPickupInput(loc.name);
                } else if (!destinationInput) {
                  setDestinationInput(loc.name);
                }
              }}
              className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
            >
              <MapPin className="h-4 w-4 text-white/30" />
              <span className="text-white">{loc.name}</span>
            </button>
          ))}
        </Card>
      </div>

      {/* Calculate Route Button - NO PRICE SHOWN YET */}
      <div className="px-4 mt-6">
        <Button 
          onClick={handleCalculateRoute}
          disabled={!pickupInput || !destinationInput || calculating}
          className={cn(
            "w-full h-14 text-lg font-semibold rounded-xl transition-all",
            !pickupInput || !destinationInput || calculating
              ? "bg-white/5 text-white/30 border border-white/5"
              : "bg-[#00FF88] text-[#0D0D12] hover:bg-[#10B981] neon-glow"
          )}
        >
          {calculating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Calculating route...
            </>
          ) : (
            <>
              <Navigation className="h-5 w-5 mr-2" />
              See Available Rides
            </>
          )}
        </Button>
        
        <p className="text-center text-xs text-white/30 mt-3">
          Enter pickup and destination to see available rides and prices
        </p>
      </div>
    </div>
  );
}

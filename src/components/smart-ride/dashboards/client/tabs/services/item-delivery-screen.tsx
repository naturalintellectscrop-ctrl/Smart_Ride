'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Package,
  Scale,
  DollarSign,
  Shield,
  Clock,
  Phone,
  MessageSquare,
  Check,
  AlertTriangle,
  Loader2,
  Search,
  ChevronRight,
  User,
  Star,
  Truck,
  Box,
  CreditCard,
  Wallet,
  Smartphone,
  Info,
} from 'lucide-react';
import { SOSButtonModal } from '@/components/mobile/shared/sos-button';
import { SOSEmergencyScreen } from '@/components/mobile/shared/sos-emergency-screen';
import { 
  useCreateTask, 
  useCreateDispatch,
  TaskRequest 
} from '@/lib/api/client-api';
import { useUser } from '@/components/smart-ride/context/user-context';

// ============================================
// Types
// ============================================

type BookingStep = 'location' | 'details' | 'confirmation' | 'searching' | 'matched' | 'inDelivery' | 'completed';

type PackageSize = 'small' | 'medium' | 'large' | 'extra_large';

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

interface ItemDetails {
  description: string;
  weight: number;
  value: number;
  size: PackageSize;
  isFragile: boolean;
  specialInstructions: string;
}

interface DeliveryFare {
  baseFare: number;
  distanceFare: number;
  weightFare: number;
  insuranceFee: number;
  subtotal: number;
  total: number;
}

interface DeliveryProvider {
  id: string;
  name: string;
  rating: number;
  deliveries: number;
  vehicle: string;
  plateNumber: string;
  phone: string;
  eta: number;
}

// ============================================
// Constants
// ============================================

// SECURITY: Use authenticated user ID from context instead of hardcoded demo ID

// Teal theme color for item delivery
const TEAL_PRIMARY = '#14B8A6';
const TEAL_GLOW = 'rgba(20, 184, 166, 0.4)';

// Pricing configuration
const PRICING = {
  BASE_FARE: 2000,           // Base fare in UGX
  PRICE_PER_KM: 150,         // Per kilometer rate
  PRICE_PER_KG: 50,          // Per kilogram rate
  INSURANCE_RATE: 0.02,      // 2% of item value for insurance
  MIN_INSURANCE_FEE: 500,    // Minimum insurance fee
};

const PACKAGE_SIZES: Record<PackageSize, { label: string; maxWeight: number; description: string }> = {
  small: { label: 'Small', maxWeight: 5, description: 'Fits in backpack' },
  medium: { label: 'Medium', maxWeight: 15, description: 'Fits in car trunk' },
  large: { label: 'Large', maxWeight: 30, description: 'Needs pickup truck' },
  extra_large: { label: 'Extra Large', maxWeight: 100, description: 'Large items' },
};

const WEIGHT_OPTIONS = [1, 2, 5, 10, 15, 20, 30, 50];

// Kampala locations for demo geocoding
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
  { name: 'Kiswa', lat: 0.3280, lng: 32.6020 },
  { name: 'Bugolobi', lat: 0.3150, lng: 32.6050 },
];

// ============================================
// Utility Functions
// ============================================

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
  
  return {
    address: address || 'Kampala',
    latitude: 0.3150,
    longitude: 32.5710
  };
}

function calculateRoute(pickup: LocationData, destination: LocationData): RouteData {
  const R = 6371;
  const dLat = (destination.latitude - pickup.latitude) * Math.PI / 180;
  const dLng = (destination.longitude - pickup.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pickup.latitude * Math.PI / 180) * Math.cos(destination.latitude * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  
  const durationMin = Math.round((distanceKm / 25) * 60); // Slower for deliveries
  
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: Math.max(10, durationMin),
    geometry: ''
  };
}

function calculateDeliveryFare(
  distanceKm: number,
  weightKg: number,
  itemValue: number
): DeliveryFare {
  const baseFare = PRICING.BASE_FARE;
  const distanceFare = Math.round(distanceKm * PRICING.PRICE_PER_KM);
  const weightFare = Math.round(weightKg * PRICING.PRICE_PER_KG);
  const insuranceFee = Math.max(
    PRICING.MIN_INSURANCE_FEE,
    Math.round(itemValue * PRICING.INSURANCE_RATE)
  );
  
  const subtotal = baseFare + distanceFare + weightFare;
  const total = subtotal + insuranceFee;
  
  return {
    baseFare,
    distanceFare,
    weightFare,
    insuranceFee,
    subtotal,
    total
  };
}

// ============================================
// Main Component
// ============================================

interface ItemDeliveryScreenProps {
  onBack: () => void;
}

export function ItemDeliveryScreen({ onBack }: ItemDeliveryScreenProps) {
  const { user } = useUser();
  
  // SECURITY: Get client ID from authenticated user context
  const clientId = user?.id || '';
  
  // Booking state
  const [step, setStep] = useState<BookingStep>('location');
  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [dropoff, setDropoff] = useState<LocationData | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [dropoffInput, setDropoffInput] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [route, setRoute] = useState<RouteData | null>(null);
  const [fare, setFare] = useState<DeliveryFare | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'WALLET'>('CASH');
  const [calculating, setCalculating] = useState(false);
  
  // Item details state
  const [itemDetails, setItemDetails] = useState<ItemDetails>({
    description: '',
    weight: 5,
    value: 50000,
    size: 'medium',
    isFragile: false,
    specialInstructions: '',
  });
  
  // Delivery state
  const [currentTask, setCurrentTask] = useState<{
    id: string;
    taskNumber: string;
    status: string;
  } | null>(null);
  
  const [matchedProvider, setMatchedProvider] = useState<DeliveryProvider | null>(null);
  const [showSOS, setShowSOS] = useState(false);
  
  // API hooks
  const { createTask, loading: creatingTask } = useCreateTask();
  const { createDispatch, loading: dispatching } = useCreateDispatch();

  // ============================================
  // Calculate route and fare
  // ============================================
  
  const handleCalculateRoute = useCallback(async () => {
    if (!pickupInput || !dropoffInput) return;
    
    setCalculating(true);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const pickupLocation = geocodeAddress(pickupInput);
    const dropoffLocation = geocodeAddress(dropoffInput);
    
    if (pickupLocation && dropoffLocation) {
      setPickup(pickupLocation);
      setDropoff(dropoffLocation);
      
      const routeData = calculateRoute(pickupLocation, dropoffLocation);
      setRoute(routeData);
      
      const fareData = calculateDeliveryFare(
        routeData.distanceKm,
        itemDetails.weight,
        itemDetails.value
      );
      setFare(fareData);
      
      setStep('details');
    }
    
    setCalculating(false);
  }, [pickupInput, dropoffInput, itemDetails.weight, itemDetails.value]);

  // ============================================
  // Recalculate fare when item details change
  // ============================================
  
  const updateFare = useCallback(() => {
    if (route) {
      const fareData = calculateDeliveryFare(
        route.distanceKm,
        itemDetails.weight,
        itemDetails.value
      );
      setFare(fareData);
    }
  }, [route, itemDetails.weight, itemDetails.value]);

  // ============================================
  // Handle delivery confirmation
  // ============================================
  
  const handleConfirmDelivery = useCallback(async () => {
    if (!pickup || !dropoff || !route) return;
    
    setStep('searching');
    
    try {
      const taskData: TaskRequest = {
        taskType: 'ITEM_DELIVERY',
        clientId,
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        distanceKm: route.distanceKm,
        paymentMethod: paymentMethod,
        itemDetails: {
          description: itemDetails.description,
          weight: itemDetails.weight,
          value: itemDetails.value,
          size: itemDetails.size,
        },
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
          'ITEM_DELIVERY',
          { latitude: pickup.latitude, longitude: pickup.longitude }
        );
        
        // Simulate matching
        setTimeout(() => {
          setMatchedProvider({
            id: 'rider_delivery_001',
            name: 'David Mukasa',
            rating: 4.9,
            deliveries: 567,
            vehicle: 'Toyota Probox',
            plateNumber: 'UBD 456X',
            phone: '+256 701 234 567',
            eta: 5,
          });
          setStep('matched');
        }, 2000 + Math.random() * 2000);
      } else {
        setStep('confirmation');
        alert('Failed to create delivery request. Please try again.');
      }
    } catch (error) {
      setStep('confirmation');
      alert('An error occurred. Please try again.');
    }
  }, [pickup, dropoff, route, paymentMethod, itemDetails, createTask, createDispatch]);

  // ============================================
  // SOS active task
  // ============================================
  
  const activeTask = (step === 'matched' || step === 'inDelivery') && currentTask ? {
    id: currentTask.id,
    taskNumber: currentTask.taskNumber,
    taskType: 'ITEM_DELIVERY',
    pickupAddress: pickup?.address || 'Pickup',
    dropoffAddress: dropoff?.address || 'Destination',
    riderInfo: {
      name: matchedProvider?.name || 'Driver',
      phone: matchedProvider?.phone || '+256 700 000 000',
      vehicleMake: 'Toyota',
      vehicleModel: matchedProvider?.vehicle || 'Probox',
      plateNumber: matchedProvider?.plateNumber || 'UBD 456X',
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
  // Render: Completed Screen
  // ============================================
  
  if (step === 'completed') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        <div className="px-4 py-4 flex items-center gap-4 bg-gradient-to-r from-[#14B8A6]/20 to-transparent">
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Delivery Complete</h1>
          </div>
        </div>
        
        <div className="px-4 pt-8">
          <div className="text-center">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${TEAL_PRIMARY}20`, boxShadow: `0 0 30px ${TEAL_GLOW}` }}
            >
              <Check className="h-12 w-12" style={{ color: TEAL_PRIMARY }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Package Delivered!</h2>
            <p className="text-white/60 mb-8">Your package has been successfully delivered</p>
            
            <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-white/50">Delivery ID</span>
                  <span className="font-mono text-[#00FF88]">{currentTask?.taskNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Total Cost</span>
                  <span className="font-bold text-white">UGX {fare?.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Payment</span>
                  <span className="text-[#00FF88]">{paymentMethod === 'MOBILE_MONEY' ? 'MTN MoMo' : paymentMethod}</span>
                </div>
              </div>
            </Card>
            
            <button 
              onClick={onBack}
              className="w-full mt-6 py-4 rounded-xl font-semibold text-[#0D0D12]"
              style={{ backgroundColor: TEAL_PRIMARY }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Searching Screen
  // ============================================
  
  if (step === 'searching') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        <div className="px-4 py-4 bg-gradient-to-r from-[#14B8A6]/20 to-transparent">
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold text-white mt-4">Finding a Courier</h1>
          <p className="text-white/60 text-sm">Searching for nearby delivery partners...</p>
        </div>
        
        <div className="px-4 pt-8">
          <div 
            className="rounded-3xl h-64 flex items-center justify-center relative overflow-hidden mt-6"
            style={{ background: `linear-gradient(135deg, ${TEAL_PRIMARY}10, rgba(26, 26, 36, 0.8))` }}
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full animate-ping" style={{ backgroundColor: TEAL_PRIMARY }} />
              <div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: TEAL_PRIMARY }} />
              <div className="absolute bottom-1/4 left-1/2 w-5 h-5 rounded-full animate-ping" style={{ backgroundColor: TEAL_PRIMARY }} />
            </div>
            <div className="text-center z-10">
              <div 
                className="w-20 h-20 bg-[#1A1A24] rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: `0 0 30px ${TEAL_GLOW}` }}
              >
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: TEAL_PRIMARY }} />
              </div>
              <p className="font-medium text-white">Looking for couriers...</p>
              <p className="text-white/40 text-sm mt-1">This usually takes 1-2 minutes</p>
            </div>
          </div>

          <Card className="mt-4 p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TEAL_PRIMARY }} />
                <p className="text-white">{pickup?.address || pickupInput}</p>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-white/10 h-4" />
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#F97316] rounded-full" />
                <p className="text-white">{dropoff?.address || dropoffInput}</p>
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
  // Render: Matched / In Delivery Screen
  // ============================================
  
  if (step === 'matched' || step === 'inDelivery') {
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-24">
        <div className="fixed top-4 right-4 z-50">
          <SOSButtonModal onOpen={() => setShowSOS(true)} />
        </div>

        <div className="px-4 py-4 bg-gradient-to-r from-[#14B8A6]/20 to-transparent">
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold text-white mt-4">
            {step === 'inDelivery' ? 'Delivery in Progress' : 'Courier Found!'}
          </h1>
        </div>
        
        <div className="px-4 pt-4">
          <Card 
            className="p-6 border-2 bg-[#1A1A24]/80"
            style={{ borderColor: `${TEAL_PRIMARY}40` }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${TEAL_PRIMARY}20` }}
              >
                <User className="h-8 w-8" style={{ color: TEAL_PRIMARY }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white">{matchedProvider?.name || 'Courier'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-white">{matchedProvider?.rating || 4.9}</span>
                  </div>
                  <span className="text-white/30">•</span>
                  <span className="text-sm text-white/60">{matchedProvider?.deliveries || 0} deliveries</span>
                  <div 
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${TEAL_PRIMARY}20`, color: TEAL_PRIMARY }}
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
                  <p className="font-medium text-white">{matchedProvider?.vehicle || 'Vehicle'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/50">Plate</p>
                  <p className="font-medium text-white">{matchedProvider?.plateNumber || 'UBD 456X'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Package Info */}
          <Card className="mt-4 p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5" style={{ color: TEAL_PRIMARY }} />
              <span className="font-medium text-white">Package Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-white/50">Item</span>
                <p className="text-white truncate">{itemDetails.description}</p>
              </div>
              <div>
                <span className="text-white/50">Weight</span>
                <p className="text-white">{itemDetails.weight} kg</p>
              </div>
              <div>
                <span className="text-white/50">Size</span>
                <p className="text-white">{PACKAGE_SIZES[itemDetails.size].label}</p>
              </div>
              <div>
                <span className="text-white/50">Value</span>
                <p className="text-white">UGX {itemDetails.value.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <div className="mt-4 text-center">
            <p className="text-white/50">{step === 'inDelivery' ? 'Estimated arrival' : 'Courier arriving in'}</p>
            <p className="text-4xl font-bold" style={{ color: TEAL_PRIMARY }}>
              {step === 'inDelivery' ? `${Math.round(route?.durationMin || 15)} min` : `${matchedProvider?.eta || 5} min`}
            </p>
          </div>

          <Card className="mt-4 p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5" style={{ color: TEAL_PRIMARY }} />
                <div>
                  <p className="text-xs text-white/50">Pickup</p>
                  <p className="text-white">{pickup?.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-[#F97316]" />
                <div>
                  <p className="text-xs text-white/50">Dropoff</p>
                  <p className="text-white">{dropoff?.address}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
              <div>
                <p className="text-sm text-white/50">Delivery fee</p>
                <p className="font-bold text-lg text-white">UGX {fare?.total.toLocaleString()}</p>
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
                style={{ backgroundColor: TEAL_PRIMARY, boxShadow: `0 0 20px ${TEAL_GLOW}` }}
              >
                <Phone className="h-5 w-5" />
                Call
              </button>
              <button className="bg-[#3B82F6] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all hover:scale-[1.02]">
                <MessageSquare className="h-5 w-5" />
                Message
              </button>
            </div>
            {step === 'matched' && (
              <button 
                onClick={() => setStep('inDelivery')}
                className="w-full bg-[#1A1A24] text-white py-4 rounded-xl font-medium border border-white/10 hover:border-white/20 transition-all"
              >
                Start Delivery
              </button>
            )}
            {step === 'inDelivery' && (
              <button 
                onClick={() => setStep('completed')}
                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: `${TEAL_PRIMARY}20`, color: TEAL_PRIMARY }}
              >
                <Check className="h-5 w-5" />
                Complete Delivery
              </button>
            )}
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
        <div className="px-4 pt-4 pb-6 bg-gradient-to-r from-[#14B8A6]/20 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('details')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Confirm Delivery</h1>
              <p className="text-white/60 text-sm">Review your delivery details</p>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-4 space-y-4">
          {/* Route Summary */}
          <Card className="p-4 bg-[#1A1A24]/90 border-white/5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${TEAL_PRIMARY}20` }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TEAL_PRIMARY }} />
                </div>
                <div>
                  <p className="text-xs text-white/50">Pickup</p>
                  <p className="text-white font-medium">{pickup?.address}</p>
                  <p className="text-xs text-white/40">{senderName} • {senderPhone}</p>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-dashed border-white/10 h-4" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#F97316]/20 rounded-full flex items-center justify-center">
                  <Navigation className="h-4 w-4 text-[#F97316]" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Dropoff</p>
                  <p className="text-white font-medium">{dropoff?.address}</p>
                  <p className="text-xs text-white/40">{receiverName} • {receiverPhone}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Package Details */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5" style={{ color: TEAL_PRIMARY }} />
              <span className="font-medium text-white">Package Details</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Description</span>
                <span className="text-white">{itemDetails.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Size</span>
                <span className="text-white">{PACKAGE_SIZES[itemDetails.size].label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Weight</span>
                <span className="text-white">{itemDetails.weight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Declared Value</span>
                <span className="text-white">UGX {itemDetails.value.toLocaleString()}</span>
              </div>
              {itemDetails.isFragile && (
                <div className="flex items-center gap-2 text-[#F59E0B]">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Fragile Item</span>
                </div>
              )}
            </div>
          </Card>

          {/* Trip Stats */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-white/50">Distance</p>
                <p className="text-lg font-bold text-white">{route?.distanceKm} km</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Est. Time</p>
                <p className="text-lg font-bold text-white">{route?.durationMin} min</p>
              </div>
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
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
                      ? "border-[#14B8A6] bg-[#14B8A6]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    paymentMethod === method.id ? "text-[#14B8A6]" : "text-white/60"
                  )}>{method.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Fare Breakdown */}
          <Card className="p-4 border-2 bg-[#1A1A24]/80" style={{ borderColor: `${TEAL_PRIMARY}30` }}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Base fare</span>
                <span className="text-white">UGX {fare?.baseFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Distance ({route?.distanceKm} km)</span>
                <span className="text-white">UGX {fare?.distanceFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Weight ({itemDetails.weight} kg)</span>
                <span className="text-white">UGX {fare?.weightFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Insurance
                </span>
                <span className="text-white">UGX {fare?.insuranceFee.toLocaleString()}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-white/10 flex justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-xl font-bold text-[#00FF88]">UGX {fare?.total.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Confirm Button */}
          <Button 
            onClick={handleConfirmDelivery}
            className="w-full h-14 text-lg font-semibold rounded-xl text-[#0D0D12]"
            style={{ backgroundColor: TEAL_PRIMARY }}
          >
            <Truck className="h-5 w-5 mr-2" />
            Confirm Delivery • UGX {fare?.total.toLocaleString()}
          </Button>
          
          <p className="text-center text-xs text-white/30">
            By confirming, you agree to our Terms of Service
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Item Details Screen
  // ============================================
  
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        <div className="px-4 pt-4 pb-6 bg-gradient-to-r from-[#14B8A6]/20 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('location')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Item Details</h1>
              <p className="text-white/60 text-sm">Tell us about your package</p>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-4 space-y-4">
          {/* Route Preview */}
          <Card className="p-3 bg-[#1A1A24]/90 border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAL_PRIMARY }} />
                  <p className="text-sm text-white truncate">{pickup?.address}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[#F97316]" />
                  <p className="text-sm text-white truncate">{dropoff?.address}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{route?.distanceKm} km</p>
                <p className="text-xs text-white/50">{route?.durationMin} min</p>
              </div>
            </div>
          </Card>

          {/* Package Description */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">What are you sending?</label>
            <textarea
              value={itemDetails.description}
              onChange={(e) => setItemDetails(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Documents, Electronics, Gift box..."
              rows={2}
              className="w-full p-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors resize-none"
            />
          </Card>

          {/* Package Size */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <label className="text-xs text-white/50 uppercase tracking-wider mb-3 block">Package Size</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PACKAGE_SIZES) as PackageSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setItemDetails(prev => ({ ...prev, size }))}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    itemDetails.size === size
                      ? "border-[#14B8A6] bg-[#14B8A6]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Box className="h-5 w-5" style={{ color: itemDetails.size === size ? TEAL_PRIMARY : 'rgba(255,255,255,0.5)' }} />
                    <div>
                      <p className={cn(
                        "font-medium",
                        itemDetails.size === size ? "text-[#14B8A6]" : "text-white"
                      )}>{PACKAGE_SIZES[size].label}</p>
                      <p className="text-xs text-white/40">{PACKAGE_SIZES[size].description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Weight Selection */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <label className="text-xs text-white/50 uppercase tracking-wider mb-3 block flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Weight (kg)
            </label>
            <div className="flex flex-wrap gap-2">
              {WEIGHT_OPTIONS.map((weight) => (
                <button
                  key={weight}
                  onClick={() => {
                    setItemDetails(prev => ({ ...prev, weight }));
                    updateFare();
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg border font-medium transition-all",
                    itemDetails.weight === weight
                      ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                  )}
                >
                  {weight} kg
                </button>
              ))}
            </div>
          </Card>

          {/* Item Value */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Item Value (for insurance)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">UGX</span>
              <input
                type="number"
                value={itemDetails.value}
                onChange={(e) => {
                  setItemDetails(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }));
                  updateFare();
                }}
                className="w-full p-3 pl-16 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Insurance fee: {PRICING.INSURANCE_RATE * 100}% of value (min UGX {PRICING.MIN_INSURANCE_FEE})
            </p>
          </Card>

          {/* Fragile Toggle */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <button
              onClick={() => setItemDetails(prev => ({ ...prev, isFragile: !prev.isFragile }))}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                <div className="text-left">
                  <p className="font-medium text-white">Fragile Item</p>
                  <p className="text-xs text-white/50">Handle with extra care</p>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors",
                itemDetails.isFragile ? "bg-[#14B8A6]" : "bg-white/10"
              )}>
                <div className={cn(
                  "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                  itemDetails.isFragile ? "translate-x-6" : "translate-x-0.5"
                )} />
              </div>
            </button>
          </Card>

          {/* Special Instructions */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Special Instructions (Optional)</label>
            <textarea
              value={itemDetails.specialInstructions}
              onChange={(e) => setItemDetails(prev => ({ ...prev, specialInstructions: e.target.value }))}
              placeholder="Any special handling instructions..."
              rows={2}
              className="w-full p-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors resize-none"
            />
          </Card>

          {/* Price Estimate */}
          <Card 
            className="p-4 border-2"
            style={{ backgroundColor: `${TEAL_PRIMARY}10`, borderColor: `${TEAL_PRIMARY}30` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Estimated Price</p>
                <p className="text-2xl font-bold" style={{ color: TEAL_PRIMARY }}>
                  UGX {fare?.total.toLocaleString()}
                </p>
              </div>
              <Package className="h-10 w-10" style={{ color: `${TEAL_PRIMARY}40` }} />
            </div>
          </Card>

          {/* Continue Button */}
          <Button 
            onClick={() => setStep('confirmation')}
            disabled={!itemDetails.description || itemDetails.weight <= 0}
            className="w-full h-14 text-lg font-semibold rounded-xl text-[#0D0D12] disabled:opacity-50"
            style={{ backgroundColor: TEAL_PRIMARY }}
          >
            Continue
            <ChevronRight className="h-5 w-5 ml-2" />
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
      <div className="px-4 pt-4 pb-6 bg-gradient-to-r from-[#14B8A6]/20 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">Smart Courier</h1>
            <p className="text-white/60 text-sm">Send packages anywhere</p>
          </div>
        </div>
      </div>

      {/* Location Inputs */}
      <div className="px-4 -mt-4">
        <Card className="p-4 bg-[#1A1A24]/90 border-white/5">
          <div className="space-y-3">
            {/* Pickup */}
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${TEAL_PRIMARY}20` }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TEAL_PRIMARY }} />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={pickupInput}
                  onChange={(e) => setPickupInput(e.target.value)}
                  placeholder="Enter pickup location"
                  className="w-full h-12 px-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
                />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              </div>
            </div>

            {/* Connector */}
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                <div className="w-0.5 h-4 bg-white/10" />
              </div>
            </div>

            {/* Dropoff */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#F97316]/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Navigation className="h-4 w-4 text-[#F97316]" />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={dropoffInput}
                  onChange={(e) => setDropoffInput(e.target.value)}
                  placeholder="Enter delivery destination"
                  className="w-full h-12 px-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              </div>
            </div>
          </div>
        </Card>

        {/* Sender Information */}
        <Card className="mt-4 p-4 bg-[#1A1A24]/80 border-white/5">
          <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Sender Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your name"
                className="w-full p-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Phone</label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="Your phone"
                className="w-full p-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Receiver Information */}
        <Card className="mt-4 p-4 bg-[#1A1A24]/80 border-white/5">
          <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Receiver Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Name</label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Receiver name"
                className="w-full p-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Phone</label>
              <input
                type="tel"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="Receiver phone"
                className="w-full p-3 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <div className="mt-4 p-4 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 flex-shrink-0" style={{ color: TEAL_PRIMARY }} />
            <div>
              <p className="font-medium text-white text-sm">Item Delivery</p>
              <p className="text-xs text-white/50 mt-1">
                Send packages anywhere in Kampala. Pricing based on distance and weight.
              </p>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <Button 
          onClick={handleCalculateRoute}
          disabled={!pickupInput || !dropoffInput || calculating}
          className="w-full h-14 text-lg font-semibold rounded-xl mt-6 text-[#0D0D12] disabled:opacity-50"
          style={{ backgroundColor: TEAL_PRIMARY }}
        >
          {calculating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ItemDeliveryScreen;

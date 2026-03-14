'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import { PaymentMethodSelector, PaymentMethod, paymentMethodLabels } from '../../shared/payment-method-selector';
import { SOSEmergencyScreen } from '../../shared/sos-emergency-screen';
import { SOSButtonModal } from '../../shared/sos-button';
import {
  MapPin,
  Navigation,
  Clock,
  DollarSign,
  User,
  Bike,
  Plus,
  Minus,
  ArrowRight,
  Check,
  Shield,
  Phone,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BodaRideScreenProps {
  onBack: () => void;
}

export function BodaRideScreen({ onBack }: BodaRideScreenProps) {
  const [step, setStep] = useState<'location' | 'searching' | 'matched' | 'inTrip'>('location');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [showSOS, setShowSOS] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  
  const baseFare = 2000;
  const perKm = 150;
  const estimatedKm = 5;
  const estimatedFare = baseFare + (perKm * estimatedKm);

  const clientId = 'client_demo_001';
  const riderId = 'rider_demo_001';
  const taskId = 'task_boda_001';

  const rider = {
    name: 'Emmanuel Okello',
    rating: 4.8,
    trips: 234,
    vehicle: 'Bajaj Boxer',
    plateNumber: 'UAX 123A',
  };

  const activeTask = (step === 'matched' || step === 'inTrip') ? {
    id: taskId,
    taskNumber: 'TASK-2024-001',
    taskType: 'SMART_BODA_RIDE',
    pickupAddress: pickup || 'Kampala Central',
    dropoffAddress: dropoff || 'Nakasero',
    riderInfo: {
      name: rider.name,
      phone: '+256 700 123 456',
      vehicleMake: 'Bajaj',
      vehicleModel: 'Boxer',
      plateNumber: rider.plateNumber,
    },
  } : undefined;

  // Show SOS Emergency Screen
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

  const handleConfirm = () => {
    setStep('searching');
    setTimeout(() => {
      setStep('matched');
    }, 3000);
  };

  // Searching Screen
  if (step === 'searching') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-emerald-600 px-4 py-4 flex items-center gap-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Finding your ride</h1>
            <p className="text-emerald-100 text-sm">Searching for nearby riders...</p>
          </div>
        </div>
        
        <div className="px-4 pt-8">
          <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl h-64 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
              <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-emerald-600 rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 left-1/2 w-5 h-5 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <div className="text-center z-10">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Bike className="h-10 w-10 text-emerald-600 animate-bounce" />
              </div>
              <p className="text-emerald-800 font-medium">Looking for nearby riders...</p>
              <p className="text-emerald-600 text-sm mt-1">This usually takes 1-2 minutes</p>
            </div>
          </div>

          <MobileCard className="mt-4 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <p className="text-gray-900">{pickup || 'Pickup location'}</p>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-gray-200 h-4" />
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <p className="text-gray-900">{dropoff || 'Dropoff location'}</p>
              </div>
            </div>
          </MobileCard>
        </div>
      </div>
    );
  }

  // Matched / In Trip Screen
  if (step === 'matched' || step === 'inTrip') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* SOS Button - Fixed Position */}
        <div className="fixed top-4 right-4 z-50">
          <SOSButtonModal onOpen={() => setShowSOS(true)} />
        </div>

        <div className="bg-emerald-600 px-4 py-4 flex items-center gap-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">
              {step === 'inTrip' ? 'Trip in Progress' : 'Rider Found!'}
            </h1>
          </div>
        </div>
        
        <div className="px-4 pt-4">
          {/* Rider Card */}
          <MobileCard className="p-6 bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-200 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-emerald-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">{rider.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{rider.rating}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-600">{rider.trips} rides</span>
                  <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Shield className="h-3 w-3" />
                    <span>Verified</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vehicle</p>
                  <p className="font-medium">{rider.vehicle} • Red</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Plate</p>
                  <p className="font-medium">{rider.plateNumber}</p>
                </div>
              </div>
            </div>
          </MobileCard>

          {/* ETA */}
          <div className="mt-4 text-center">
            <p className="text-gray-500">{step === 'inTrip' ? 'Arriving at destination in' : 'Arriving in'}</p>
            <p className="text-4xl font-bold text-emerald-600">{step === 'inTrip' ? '8 min' : '3 min'}</p>
          </div>

          {/* Route */}
          <MobileCard className="mt-4 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-emerald-500" />
                <p className="text-gray-900">{pickup}</p>
              </div>
              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-orange-500" />
                <p className="text-gray-900">{dropoff}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Trip fare</p>
                <p className="font-bold text-lg">UGX {estimatedFare.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment</p>
                <p className="font-medium">{paymentMethodLabels[paymentMethod]}</p>
              </div>
            </div>
          </MobileCard>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                <Phone className="h-5 w-5" />
                Call Rider
              </button>
              <button className="bg-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message
              </button>
            </div>
            {step === 'matched' && (
              <button 
                onClick={() => setStep('inTrip')}
                className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-medium"
              >
                Start Trip
              </button>
            )}
            {step === 'inTrip' && (
              <button className="w-full bg-emerald-100 text-emerald-700 py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                <Check className="h-5 w-5" />
                Complete Trip
              </button>
            )}
            <button 
              onClick={onBack}
              className="w-full text-red-600 py-3 font-medium"
            >
              Cancel Ride
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Location Selection Screen
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="text-white">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Smart Boda</h1>
          <p className="text-emerald-100 text-sm">Quick motorcycle rides</p>
        </div>
      </div>
      
      <div className="px-4 pt-4">
        {/* Location Inputs */}
        <MobileCard className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <input
                type="text"
                placeholder="Pickup location"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              />
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <div className="ml-1.5 border-l-2 border-dashed border-gray-200 h-4" />
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <input
                type="text"
                placeholder="Where to?"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              />
              <Navigation className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </MobileCard>

        {/* Passengers */}
        <MobileCard className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">Passengers</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setPassengers(Math.max(1, passengers - 1))}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-semibold text-lg w-6 text-center">{passengers}</span>
              <button 
                onClick={() => setPassengers(Math.min(2, passengers + 1))}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </MobileCard>

        {/* Fare Estimate */}
        <MobileCard className="mt-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600">Estimated Fare</span>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">~{estimatedKm} km</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">UGX {estimatedFare.toLocaleString()}</span>
            <span className="text-gray-500 text-sm mb-1">estimated</span>
          </div>
        </MobileCard>

        {/* Payment Method - Inline Dropdown */}
        <div className="mt-4">
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
          />
        </div>

        {/* Book Button */}
        <button 
          onClick={handleConfirm}
          disabled={!pickup || !dropoff}
          className="mt-6 w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Bike className="h-5 w-5" />
          Book Boda Ride
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

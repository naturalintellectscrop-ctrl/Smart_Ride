'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { PaymentMethodSelector, PaymentMethod, paymentMethodLabels } from '../../shared/payment-method-selector';
import {
  MapPin,
  Navigation,
  Clock,
  DollarSign,
  User,
  Car,
  Plus,
  Minus,
  ArrowRight,
  Check
} from 'lucide-react';

interface CarRideScreenProps {
  onBack: () => void;
}

export function CarRideScreen({ onBack }: CarRideScreenProps) {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const baseFare = 5000;
  const perKm = 300;
  const estimatedKm = 10;
  const estimatedFare = baseFare + (perKm * estimatedKm);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader 
        title="Smart Car" 
        subtitle="Comfortable car trips"
        showBack 
        onBack={onBack}
      />
      
      <div className="px-4 pt-4">
        {/* Location Inputs */}
        <MobileCard className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
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
                onClick={() => setPassengers(Math.min(4, passengers + 1))}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </MobileCard>

        {/* Car Type Selection */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">Select Car Type</h3>
          <div className="grid grid-cols-2 gap-3">
            <MobileCard className="p-4 border-2 border-blue-500 bg-blue-50">
              <div className="flex items-center gap-3">
                <Car className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Standard</p>
                  <p className="text-sm text-gray-500">4 seats</p>
                </div>
              </div>
              <p className="mt-2 font-bold text-blue-600">UGX {estimatedFare.toLocaleString()}</p>
            </MobileCard>
            <MobileCard className="p-4 border-2 border-gray-200">
              <div className="flex items-center gap-3">
                <Car className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900">Premium</p>
                  <p className="text-sm text-gray-500">4 seats • AC</p>
                </div>
              </div>
              <p className="mt-2 font-bold text-gray-600">UGX {(estimatedFare * 1.5).toLocaleString()}</p>
            </MobileCard>
          </div>
        </div>

        {/* Fare Estimate */}
        <MobileCard className="mt-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600">Estimated Fare</span>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">~{estimatedKm} km • ~25 min</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">UGX {estimatedFare.toLocaleString()}</span>
            <span className="text-gray-500 text-sm mb-1">estimated</span>
          </div>
        </MobileCard>

        {/* Payment Method */}
        <div className="mt-4">
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
            themeColor="blue"
          />
        </div>

        {/* Book Button */}
        <button
          disabled={!pickup || !dropoff}
          className="mt-6 w-full bg-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Car className="h-5 w-5" />
          Book Car Ride
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

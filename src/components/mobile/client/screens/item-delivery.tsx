'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { PaymentMethodSelector, PaymentMethod, paymentMethodLabels } from '../../shared/payment-method-selector';
import {
  Package,
  MapPin,
  Navigation,
  Phone,
  User,
  DollarSign,
  Scale,
  ArrowRight,
  Check
} from 'lucide-react';

interface ItemDeliveryScreenProps {
  onBack: () => void;
}

export function ItemDeliveryScreen({ onBack }: ItemDeliveryScreenProps) {
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemWeight, setItemWeight] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const baseFare = 1000;
  const perKm = 100;
  const perKg = 50;
  const estimatedKm = 8;
  const estimatedWeight = parseFloat(itemWeight) || 1;
  const estimatedFare = baseFare + (perKm * estimatedKm) + (perKg * estimatedWeight);

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <MobileHeader 
          title="Confirm Delivery" 
          showBack 
          onBack={() => setStep('details')}
        />
        
        <div className="px-4 pt-4">
          <MobileCard className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Delivery Details</h3>
            
            <div className="space-y-4">
              {/* Pickup */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pickup</p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{senderName}</p>
                    <p className="text-sm text-gray-500">{senderPhone}</p>
                    <p className="text-sm text-gray-600">{pickupAddress}</p>
                  </div>
                </div>
              </div>

              <div className="border-l-2 border-dashed border-gray-200 ml-4 h-6" />

              {/* Dropoff */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Dropoff</p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Navigation className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{receiverName}</p>
                    <p className="text-sm text-gray-500">{receiverPhone}</p>
                    <p className="text-sm text-gray-600">{dropoffAddress}</p>
                  </div>
                </div>
              </div>
            </div>
          </MobileCard>

          <MobileCard className="mt-4 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Item Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Description</span>
                <span className="text-gray-900">{itemDescription}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Weight</span>
                <span className="text-gray-900">{estimatedWeight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Distance</span>
                <span className="text-gray-900">~{estimatedKm} km</span>
              </div>
            </div>
          </MobileCard>

          <MobileCard className="mt-4 p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Base Fare</span>
                <span>UGX {baseFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Distance ({estimatedKm} km)</span>
                <span>UGX {(perKm * estimatedKm).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Weight ({estimatedWeight} kg)</span>
                <span>UGX {(perKg * estimatedWeight).toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>UGX {estimatedFare.toLocaleString()}</span>
              </div>
            </div>
          </MobileCard>

          {/* Payment Method */}
          <div className="mt-4">
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelect={setPaymentMethod}
              themeColor="teal"
            />
          </div>

          <button className="mt-6 w-full bg-teal-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
            <Package className="h-5 w-5" />
            Confirm Delivery
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader 
        title="Smart Grocery" 
        subtitle="Groceries delivered fresh"
        showBack 
        onBack={onBack}
      />
      
      <div className="px-4 pt-4 space-y-4">
        {/* Pickup Location */}
        <MobileCard className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            Pickup Details
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Pickup address"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Sender name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="tel"
                placeholder="Sender phone"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </MobileCard>

        {/* Dropoff Location */}
        <MobileCard className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Navigation className="h-5 w-5 text-orange-600" />
            Dropoff Details
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Dropoff address"
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Receiver name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="tel"
                placeholder="Receiver phone"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </MobileCard>

        {/* Item Details */}
        <MobileCard className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            Item Details
          </h3>
          <div className="space-y-3">
            <textarea
              placeholder="What are you sending?"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              rows={2}
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-gray-400" />
              <input
                type="number"
                placeholder="Weight (kg)"
                value={itemWeight}
                onChange={(e) => setItemWeight(e.target.value)}
                className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </MobileCard>

        {/* Price Estimate */}
        <MobileCard className="p-4 bg-teal-50 border-teal-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estimated Price</p>
              <p className="text-2xl font-bold text-teal-700">UGX {estimatedFare.toLocaleString()}</p>
            </div>
            <DollarSign className="h-10 w-10 text-teal-200" />
          </div>
        </MobileCard>

        {/* Payment Method */}
        <div className="mt-4">
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
            themeColor="teal"
          />
        </div>

        {/* Continue Button */}
        <button
          onClick={() => setStep('confirm')}
          disabled={!pickupAddress || !dropoffAddress || !itemDescription}
          className="w-full bg-teal-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

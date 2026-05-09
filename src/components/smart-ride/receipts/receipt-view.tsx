/**
 * Smart Ride Receipt System
 * 
 * Professional receipt generation and display for all service types.
 * Similar to Uber's receipt but branded as Smart Ride.
 */

'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  Share2,
  Star,
  CheckCircle,
  MapPin,
  Navigation,
  Clock,
  Car,
  Bike,
  Package,
  ShoppingBag,
  UtensilsCrossed,
  Pill,
  DollarSign,
  Phone,
  MessageSquare,
  ArrowLeft,
  ExternalLink,
  Receipt,
  QrCode,
  Shield,
  Store,
} from 'lucide-react';

// ==========================================
// Types
// ==========================================

export type ServiceType = 
  | 'BODA_RIDE' 
  | 'CAR_RIDE' 
  | 'FOOD_DELIVERY' 
  | 'GROCERY_DELIVERY' 
  | 'PACKAGE_DELIVERY' 
  | 'PHARMACY_DELIVERY'
  | 'SERVICE';

export type PaymentMethodType = 
  | 'MTN_MOMO' 
  | 'AIRTEL_MONEY' 
  | 'CASH' 
  | 'WALLET'
  | 'CARD';

export interface ReceiptLocation {
  address: string;
  coordinates?: { lat: number; lng: number };
  timestamp?: Date;
}

export interface ReceiptRider {
  id: string;
  name: string;
  rating: number;
  totalTrips: number;
  vehicleType?: string;
  vehicleModel?: string;
  plateNumber?: string;
  profilePhoto?: string;
}

export interface ReceiptMerchant {
  id: string;
  name: string;
  type: string;
  address: string;
  phone?: string;
  logo?: string;
}

export interface ReceiptFareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare?: number;
  serviceFee: number;
  platformFee?: number;
  surgeMultiplier?: number;
  surgeAmount?: number;
  discount?: number;
  discountCode?: string;
  tips?: number;
  total: number;
}

export interface ReceiptData {
  // Trip Info
  receiptId: string;
  taskId: string;
  serviceType: ServiceType;
  status: 'COMPLETED' | 'CANCELLED';
  
  // Timing
  requestTime: Date;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  waitingTime?: number; // minutes
  
  // Route
  pickup: ReceiptLocation;
  dropoff: ReceiptLocation;
  distance: number; // km
  
  // People
  rider?: ReceiptRider;
  merchant?: ReceiptMerchant;
  clientName?: string;
  
  // Payment
  paymentMethod: PaymentMethodType;
  fareBreakdown: ReceiptFareBreakdown;
  currency: string;
  
  // Ratings
  rated?: boolean;
  rating?: number;
  feedback?: string;
  
  // Additional
  notes?: string;
  promoApplied?: boolean;
  invoiceNumber?: string;
}

// ==========================================
// Service Type Config
// ==========================================

const serviceConfig: Record<ServiceType, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}> = {
  BODA_RIDE: {
    icon: <Bike className="h-6 w-6" />,
    label: 'Smart Boda Ride',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
  },
  CAR_RIDE: {
    icon: <Car className="h-6 w-6" />,
    label: 'Smart Car Ride',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
  },
  FOOD_DELIVERY: {
    icon: <UtensilsCrossed className="h-6 w-6" />,
    label: 'Food Delivery',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
  },
  GROCERY_DELIVERY: {
    icon: <ShoppingBag className="h-6 w-6" />,
    label: 'Grocery Delivery',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
  },
  PACKAGE_DELIVERY: {
    icon: <Package className="h-6 w-6" />,
    label: 'Package Delivery',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/15',
  },
  PHARMACY_DELIVERY: {
    icon: <Pill className="h-6 w-6" />,
    label: 'Pharmacy Delivery',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
  },
  SERVICE: {
    icon: <Receipt className="h-6 w-6" />,
    label: 'Service',
    color: 'text-[#00FF88]',
    bgColor: 'bg-[#00FF88]/15',
  },
};

const paymentMethodConfig: Record<PaymentMethodType, {
  icon: React.ReactNode;
  label: string;
  color: string;
}> = {
  MTN_MOMO: {
    icon: <Phone className="h-4 w-4" />,
    label: 'MTN Mobile Money',
    color: 'text-yellow-400',
  },
  AIRTEL_MONEY: {
    icon: <Phone className="h-4 w-4" />,
    label: 'Airtel Money',
    color: 'text-red-400',
  },
  CASH: {
    icon: <DollarSign className="h-4 w-4" />,
    label: 'Cash Payment',
    color: 'text-green-400',
  },
  WALLET: {
    icon: <Package className="h-4 w-4" />,
    label: 'Smart Ride Wallet',
    color: 'text-[#00FF88]',
  },
  CARD: {
    icon: <DollarSign className="h-4 w-4" />,
    label: 'Card Payment',
    color: 'text-blue-400',
  },
};

// ==========================================
// Format Helpers
// ==========================================

const formatCurrency = (amount: number, currency: string = 'UGX'): string => {
  return `${currency} ${amount.toLocaleString('en-UG')}`;
};

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// ==========================================
// Receipt Component
// ==========================================

interface ReceiptViewProps {
  receipt: ReceiptData;
  onClose?: () => void;
  showRating?: boolean;
  onRating?: (rating: number, feedback?: string) => void;
  onShare?: () => void;
  onDownload?: () => void;
}

export function ReceiptView({
  receipt,
  onClose,
  showRating = true,
  onRating,
  onShare,
  onDownload,
}: ReceiptViewProps) {
  const [selectedRating, setSelectedRating] = useState(receipt.rating || 0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const service = serviceConfig[receipt.serviceType];
  const payment = paymentMethodConfig[receipt.paymentMethod];

  const handleRating = async (rating: number) => {
    setSelectedRating(rating);
    if (onRating) {
      setIsSubmittingRating(true);
      await onRating(rating);
      setIsSubmittingRating(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && onShare) {
      try {
        await navigator.share({
          title: `Smart Ride Receipt - ${receipt.taskId}`,
          text: `Thank you for riding with Smart Ride! Trip: ${receipt.taskId}`,
          url: window.location.href,
        });
      } catch {
        console.log('Share cancelled');
      }
    } else {
      onShare?.();
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-[#13131A] border-b border-white/5 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5"
              >
                <ArrowLeft className="h-5 w-5 text-gray-400" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-white">Receipt</h1>
          </div>
          <div className="flex items-center gap-2">
            {onShare && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="text-gray-400 hover:text-white"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            )}
            {onDownload && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDownload}
                className="text-gray-400 hover:text-white"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      <div ref={receiptRef} className="px-4 py-6 space-y-4">
        {/* Success Header */}
        <div className="text-center py-4">
          <div className="w-20 h-20 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-[#00FF88]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Trip Complete!</h2>
          <p className="text-gray-400 text-sm">{formatDate(receipt.endTime)}</p>
        </div>

        {/* Service Type Badge */}
        <div className="flex justify-center">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full",
            service.bgColor
          )}>
            <span className={service.color}>{service.icon}</span>
            <span className={cn("font-medium", service.color)}>{service.label}</span>
          </div>
        </div>

        {/* Trip ID & Invoice */}
        <Card className="bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Trip ID</p>
                <p className="font-mono font-semibold text-white">{receipt.taskId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Receipt #{receipt.receiptId}</p>
                {receipt.invoiceNumber && (
                  <p className="text-xs text-gray-400">Invoice: {receipt.invoiceNumber}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Details */}
        <Card className="bg-[#13131A] border-white/5">
          <CardContent className="p-4 space-y-4">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="font-medium text-white">{receipt.pickup.address}</p>
                <p className="text-xs text-gray-400">{formatTime(receipt.startTime)}</p>
              </div>
            </div>

            {/* Route Line */}
            <div className="ml-5 border-l-2 border-dashed border-[#1A1A24] h-4" />

            {/* Dropoff */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                <Navigation className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Dropoff</p>
                <p className="font-medium text-white">{receipt.dropoff.address}</p>
                <p className="text-xs text-gray-400">{formatTime(receipt.endTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 text-[#00FF88] mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{formatDuration(receipt.duration)}</p>
              <p className="text-xs text-gray-500">Duration</p>
            </CardContent>
          </Card>
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-3 text-center">
              <Navigation className="h-5 w-5 text-[#00FF88] mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{receipt.distance.toFixed(1)} km</p>
              <p className="text-xs text-gray-500">Distance</p>
            </CardContent>
          </Card>
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 text-[#00FF88] mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{formatCurrency(receipt.fareBreakdown.total, receipt.currency)}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Rider Info */}
        {receipt.rider && (
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-[#1A1A24] rounded-full flex items-center justify-center">
                  {receipt.rider.profilePhoto ? (
                    <img src={receipt.rider.profilePhoto} alt={receipt.rider.name} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {receipt.rider.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{receipt.rider.name}</p>
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <span>{receipt.rider.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  {receipt.rider.vehicleModel && (
                    <p className="text-sm text-gray-400">
                      {receipt.rider.vehicleModel}
                      {receipt.rider.plateNumber && ` • ${receipt.rider.plateNumber}`}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{receipt.rider.totalTrips}+ trips completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Merchant Info (for deliveries) */}
        {receipt.merchant && (
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-purple-500/15 rounded-xl flex items-center justify-center">
                  {receipt.merchant.logo ? (
                    <img src={receipt.merchant.logo} alt={receipt.merchant.name} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <Store className="h-7 w-7 text-purple-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{receipt.merchant.name}</p>
                  <p className="text-sm text-gray-400">{receipt.merchant.type}</p>
                  <p className="text-xs text-gray-500">{receipt.merchant.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fare Breakdown */}
        <Card className="bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-white mb-4">Fare Breakdown</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Base fare</span>
                <span className="text-white">{formatCurrency(receipt.fareBreakdown.baseFare, receipt.currency)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Distance ({receipt.distance.toFixed(1)} km)</span>
                <span className="text-white">{formatCurrency(receipt.fareBreakdown.distanceFare, receipt.currency)}</span>
              </div>

              {receipt.fareBreakdown.timeFare ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Time ({formatDuration(receipt.duration)})</span>
                  <span className="text-white">{formatCurrency(receipt.fareBreakdown.timeFare, receipt.currency)}</span>
                </div>
              ) : null}

              {receipt.fareBreakdown.surgeAmount && receipt.fareBreakdown.surgeMultiplier ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-400">
                    Surge pricing ({receipt.fareBreakdown.surgeMultiplier}x)
                  </span>
                  <span className="text-amber-400">+{formatCurrency(receipt.fareBreakdown.surgeAmount, receipt.currency)}</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Service fee</span>
                <span className="text-white">{formatCurrency(receipt.fareBreakdown.serviceFee, receipt.currency)}</span>
              </div>

              {receipt.fareBreakdown.discount ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#00FF88]">
                    Discount {receipt.fareBreakdown.discountCode && `(${receipt.fareBreakdown.discountCode})`}
                  </span>
                  <span className="text-[#00FF88]">-{formatCurrency(receipt.fareBreakdown.discount, receipt.currency)}</span>
                </div>
              ) : null}

              {receipt.fareBreakdown.tips ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Tip</span>
                  <span className="text-white">{formatCurrency(receipt.fareBreakdown.tips, receipt.currency)}</span>
                </div>
              ) : null}

              <Separator className="bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Total</span>
                <span className="text-xl font-bold text-[#00FF88]">
                  {formatCurrency(receipt.fareBreakdown.total, receipt.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-[#1A1A24]")}>
                  <span className={payment.color}>{payment.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid with</p>
                  <p className="font-medium text-white">{payment.label}</p>
                </div>
              </div>
              <Badge className="bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Paid
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Rating Section */}
        {showRating && (
          <Card className="bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3 text-center">Rate your trip</h3>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    disabled={receipt.rated || isSubmittingRating}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                      selectedRating >= star
                        ? "bg-amber-500/20 scale-110"
                        : "bg-[#1A1A24] hover:bg-[#1E1E28]"
                    )}
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-all",
                        selectedRating >= star
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-500"
                      )}
                    />
                  </button>
                ))}
              </div>
              {selectedRating > 0 && (
                <p className="text-center text-sm text-gray-400 mt-3">
                  {selectedRating === 5 ? "Excellent! Thank you!" :
                   selectedRating === 4 ? "Great! Thanks for your feedback!" :
                   selectedRating === 3 ? "Thanks for your honest feedback." :
                   selectedRating === 2 ? "We'll work to improve." :
                   "We're sorry to hear that. We'll do better."}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* QR Code Section */}
        <Card className="bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-[#0D0D12]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Digital Receipt</p>
                  <p className="font-medium text-white text-sm">View in app</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-white/10 bg-[#1A1A24] text-white">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Safety Info */}
        <div className="bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-[#00FF88] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#00FF88] text-sm">Your Safety Matters</p>
              <p className="text-xs text-gray-400 mt-1">
                All trips are GPS tracked. For any concerns about this trip, contact our support team within 24 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#00FF88] rounded-lg flex items-center justify-center">
              <Bike className="h-4 w-4 text-[#0D0D12]" />
            </div>
            <span className="font-bold text-white">Smart Ride</span>
          </div>
          <p className="text-xs text-gray-500">
            Thank you for riding with us!
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {receipt.receiptId} • {formatDate(receipt.endTime)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Receipt Generator Utility
// ==========================================

export function generateReceiptId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SR-${timestamp}-${random}`;
}

export function createMockReceipt(): ReceiptData {
  return {
    receiptId: generateReceiptId(),
    taskId: 'TASK-2024-09823',
    serviceType: 'BODA_RIDE',
    status: 'COMPLETED',
    requestTime: new Date(Date.now() - 45 * 60 * 1000),
    startTime: new Date(Date.now() - 40 * 60 * 1000),
    endTime: new Date(Date.now() - 15 * 60 * 1000),
    duration: 25,
    distance: 8.5,
    pickup: {
      address: 'Plot 45, Kampala Road, Kampala',
      timestamp: new Date(Date.now() - 40 * 60 * 1000),
    },
    dropoff: {
      address: 'Garden City Mall, Yusuf Lule Road',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
    },
    rider: {
      id: 'rider_001',
      name: 'Okello James',
      rating: 4.8,
      totalTrips: 1250,
      vehicleType: 'Motorcycle',
      vehicleModel: 'Bajaj Boxer 150',
      plateNumber: 'UAX 123A',
    },
    paymentMethod: 'MTN_MOMO',
    fareBreakdown: {
      baseFare: 2000,
      distanceFare: 2550,
      serviceFee: 500,
      total: 5050,
    },
    currency: 'UGX',
    rated: false,
  };
}

// ==========================================
// Export
// ==========================================

export default ReceiptView;

/**
 * Trip Summary & Rating Screen — Stitch Design
 * 
 * Shows map section, fare breakdown bento-card, driver avatar with rating,
 * tip buttons, comment textarea, privacy note, and fixed bottom "Done" button.
 * ALL rating logic, tip selection, comment submission, trip data loading preserved.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Shield,
  Star,
  MapPin,
  Navigation,
  Lock,
  CheckCircle,
  Bike,
  Car,
  Package,
  ShoppingBag,
  UtensilsCrossed,
  Pill,
  Receipt,
  MessageSquare,
} from 'lucide-react';
import type { ServiceType } from './receipt-view';

// ==========================================
// Design System Colors
// ==========================================

const DS = {
  surface: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',
  onSurface: '#191c1d',
  onSurfaceVariant: '#3f4941',
  outline: '#6f7a71',
  outlineVariant: '#bec9bf',
  primary: '#005f3a',
  onPrimary: '#ffffff',
  primaryContainer: '#0e7a4d',
  onPrimaryContainer: '#a6ffc9',
  primaryFixed: '#98f6be',
  secondary: '#006e2f',
  secondaryContainer: '#6bff8f',
  onSecondaryContainer: '#007432',
  error: '#ba1a1a',
  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',
  secondaryFixedDim: '#4ae176',
  secondaryFixed: '#6bff8f',
};

// ==========================================
// Helpers
// ==========================================

const formatCurrency = (amount: number, currency: string = 'UGX'): string => {
  return `${currency} ${amount.toLocaleString('en-UG')}`;
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// ==========================================
// Props
// ==========================================

export interface TripSummaryFareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare?: number;
  serviceFee: number;
  discount?: number;
  discountCode?: string;
  tips?: number;
  total: number;
}

export interface TripSummaryDriver {
  id: string;
  name: string;
  rating: number;
  totalTrips: number;
  vehicleModel?: string;
  plateNumber?: string;
  profilePhoto?: string;
  isVerified?: boolean;
}

export interface TripSummaryData {
  taskId: string;
  serviceType: ServiceType;
  pickup: { address: string };
  dropoff: { address: string };
  distance: number;
  duration: number;
  endTime: Date;
  currency: string;
  fareBreakdown: TripSummaryFareBreakdown;
  driver?: TripSummaryDriver;
  alreadyRated?: boolean;
  existingRating?: number;
  existingTip?: number;
  existingComment?: string;
}

interface TripSummaryRatingScreenProps {
  trip: TripSummaryData;
  onBack?: () => void;
  onRate?: (rating: number, tip: number, comment: string) => void | Promise<void>;
  onDone?: () => void;
  isSubmitting?: boolean;
}

export function TripSummaryRatingScreen({
  trip,
  onBack,
  onRate,
  onDone,
  isSubmitting = false,
}: TripSummaryRatingScreenProps) {
  const [selectedRating, setSelectedRating] = useState(trip.existingRating || 0);
  const [selectedTip, setSelectedTip] = useState(trip.existingTip || 0);
  const [comment, setComment] = useState(trip.existingComment || '');
  const [isVisible, setIsVisible] = useState(false);

  // Fade-in animation on load
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const tipOptions = [
    { label: 'No Tip', value: 0 },
    { label: '1,000', value: 1000 },
    { label: '2,000', value: 2000 },
    { label: 'Custom', value: -1 },
  ];

  const [customTipValue, setCustomTipValue] = useState('');

  const currentTip = selectedTip === -1 ? (parseInt(customTipValue) || 0) : selectedTip;

  const handleDone = async () => {
    if (onRate && selectedRating > 0) {
      await onRate(selectedRating, currentTip, comment);
    }
    onDone?.();
  };

  return (
    <div
      className={cn(
        "min-h-screen max-w-md mx-auto pb-24 transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{ backgroundColor: DS.surface }}
    >
      {/* Header: Back + "Trip Summary" + security icon */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10" style={{ borderColor: DS.outlineVariant }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" style={{ color: DS.onSurface }} />
              </button>
            )}
            <h1 className="text-lg font-semibold" style={{ color: DS.onSurface }}>Trip Summary</h1>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <Shield className="h-5 w-5" style={{ color: DS.onSurfaceVariant }} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Map Section: h-48, route overlay pill */}
        <div className="relative h-48 rounded-xl overflow-hidden" style={{ backgroundColor: DS.surfaceContainer }}>
          {/* Placeholder map with gradient */}
          <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${DS.secondaryFixedDim}20, ${DS.primaryFixed}20)` }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <MapPin className="h-16 w-16" style={{ color: DS.outline }} />
          </div>
          {/* Route overlay pill */}
          <div className="absolute top-3 left-3 right-3">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DS.secondary }} />
              <span className="text-xs font-medium truncate flex-1" style={{ color: DS.onSurface }}>{trip.pickup.address}</span>
            </div>
            <div className="ml-1.5 w-0.5 h-3" style={{ backgroundColor: DS.outlineVariant, marginLeft: '18px' }} />
            <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DS.error }} />
              <span className="text-xs font-medium truncate flex-1" style={{ color: DS.onSurface }}>{trip.dropoff.address}</span>
            </div>
          </div>
          {/* Route info badge */}
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-xs font-medium" style={{ color: DS.onSurface }}>
              {trip.distance.toFixed(1)} km &bull; {trip.duration} min
            </span>
          </div>
        </div>

        {/* Fare Breakdown Card: bento-card (rounded-1.5rem), total amount in display-lg primary */}
        <div className="bg-white rounded-3xl p-5 shadow-md" style={{ border: `1px solid ${DS.outlineVariant}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: DS.onSurface }}>Fare Breakdown</h3>
            <span className="text-2xl font-bold" style={{ color: DS.primary }}>
              {formatCurrency(trip.fareBreakdown.total, trip.currency)}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Base fare</span>
              <span style={{ color: DS.onSurface }}>{formatCurrency(trip.fareBreakdown.baseFare, trip.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Distance ({trip.distance.toFixed(1)} km)</span>
              <span style={{ color: DS.onSurface }}>{formatCurrency(trip.fareBreakdown.distanceFare, trip.currency)}</span>
            </div>
            {trip.fareBreakdown.timeFare ? (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: DS.onSurfaceVariant }}>Time</span>
                <span style={{ color: DS.onSurface }}>{formatCurrency(trip.fareBreakdown.timeFare, trip.currency)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Service fee</span>
              <span style={{ color: DS.onSurface }}>{formatCurrency(trip.fareBreakdown.serviceFee, trip.currency)}</span>
            </div>
            {trip.fareBreakdown.discount ? (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: DS.secondary }}>Discount</span>
                <span style={{ color: DS.secondary }}>-{formatCurrency(trip.fareBreakdown.discount, trip.currency)}</span>
              </div>
            ) : null}
            <Separator style={{ backgroundColor: DS.outlineVariant }} />
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold" style={{ color: DS.onSurface }}>Total</span>
              <span className="text-xl font-bold" style={{ color: DS.primary }}>
                {formatCurrency(trip.fareBreakdown.total, trip.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Rating Section */}
        {trip.driver && (
          <div className="bg-white rounded-3xl p-5 shadow-sm" style={{ border: `1px solid ${DS.outlineVariant}` }}>
            {/* Driver avatar (64px, 2px primary border, verified badge) */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden" style={{ border: `2px solid ${DS.primary}`, backgroundColor: DS.surfaceContainer }}>
                  {trip.driver.profilePhoto ? (
                    <img src={trip.driver.profilePhoto} alt={trip.driver.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold" style={{ color: DS.onSurface }}>
                      {trip.driver.name.charAt(0)}
                    </span>
                  )}
                </div>
                {trip.driver.isVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: DS.primary }}>
                    <CheckCircle className="h-3 w-3" style={{ color: DS.onPrimary }} />
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold" style={{ color: DS.onSurface }}>{trip.driver.name}</p>
                {trip.driver.vehicleModel && (
                  <p className="text-xs" style={{ color: DS.onSurfaceVariant }}>
                    {trip.driver.vehicleModel} {trip.driver.plateNumber && `\u2022 ${trip.driver.plateNumber}`}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium" style={{ color: DS.onSurfaceVariant }}>{trip.driver.rating.toFixed(1)}</span>
                  <span className="text-xs" style={{ color: DS.outline }}>&bull; {trip.driver.totalTrips} trips</span>
                </div>
              </div>
            </div>

            {/* 5-star rating (clickable, yellow-500) */}
            {!trip.alreadyRated && (
              <>
                <p className="text-sm font-medium mb-2" style={{ color: DS.onSurface }}>How was your ride?</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelectedRating(star)}
                      disabled={trip.alreadyRated || isSubmitting}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-all",
                          selectedRating >= star
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  ))}
                </div>

                {/* Tip buttons (4-column) */}
                {selectedRating > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2" style={{ color: DS.onSurface }}>Add a tip for {trip.driver.name.split(' ')[0]}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {tipOptions.map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => setSelectedTip(opt.value)}
                          className={cn(
                            "py-2.5 rounded-xl text-sm font-medium transition-all",
                            selectedTip === opt.value
                              ? "shadow-md"
                              : "hover:shadow-sm"
                          )}
                          style={{
                            backgroundColor: selectedTip === opt.value ? DS.primaryContainer : DS.surfaceContainerLow,
                            color: selectedTip === opt.value ? DS.onPrimary : DS.onSurface,
                            border: selectedTip === opt.value ? `2px solid ${DS.primary}` : `1px solid ${DS.outlineVariant}`,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Custom tip input */}
                    {selectedTip === -1 && (
                      <div className="mt-3 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: DS.onSurfaceVariant }}>UGX</span>
                        <input
                          type="number"
                          value={customTipValue}
                          onChange={(e) => setCustomTipValue(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full py-2.5 pl-14 pr-4 rounded-xl text-sm focus:outline-none transition-colors"
                          style={{
                            backgroundColor: DS.surfaceContainerLow,
                            border: `1px solid ${DS.outlineVariant}`,
                            color: DS.onSurface,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Comment textarea */}
                {selectedRating > 0 && (
                  <div className="mb-4">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Leave a comment (optional)"
                      rows={3}
                      className="w-full p-3 rounded-xl text-sm focus:outline-none transition-colors resize-none"
                      style={{
                        backgroundColor: DS.surfaceContainerLow,
                        border: `1px solid ${DS.outlineVariant}`,
                        color: DS.onSurface,
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {trip.alreadyRated && (
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-6 w-6",
                      (trip.existingRating || 0) >= star
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-gray-300"
                    )}
                  />
                ))}
                <span className="ml-2 text-sm" style={{ color: DS.onSurfaceVariant }}>Already rated</span>
              </div>
            )}
          </div>
        )}

        {/* Privacy Note: bg-secondary-container/20 pill with lock_person icon */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ backgroundColor: `${DS.secondaryContainer}20` }}>
          <Lock className="h-4 w-4 flex-shrink-0" style={{ color: DS.secondary }} />
          <span className="text-xs" style={{ color: DS.onSecondaryContainer }}>
            Your rating and tip are private and securely processed
          </span>
        </div>
      </div>

      {/* Bottom Action: Fixed, "Done" button h-56px, bg-primary, rounded-xl */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 py-4 bg-white border-t" style={{ borderColor: DS.outlineVariant }}>
        <Button
          className="w-full h-14 text-base font-semibold rounded-xl"
          style={{ backgroundColor: DS.primary, color: DS.onPrimary }}
          onClick={handleDone}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Done'}
        </Button>
      </div>
    </div>
  );
}

export default TripSummaryRatingScreen;

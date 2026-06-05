/**
 * Transaction Details Screen — Stitch Design
 * 
 * Shows detailed transaction info: status, summary card, map context,
 * service details, fare breakdown, support CTA, and download e-receipt button.
 * All transaction data loading, API integration preserved.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Download,
  MapPin,
  Navigation,
  Clock,
  Receipt,
  CreditCard,
  Phone,
  ChevronRight,
  Shield,
  Star,
  Bike,
  Car,
  Package,
  ShoppingBag,
  UtensilsCrossed,
  Pill,
} from 'lucide-react';
import type { ServiceType, PaymentMethodType, ReceiptData } from './receipt-view';

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

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const serviceIconMap: Record<ServiceType, React.ReactNode> = {
  BODA_RIDE: <Bike className="h-5 w-5" />,
  CAR_RIDE: <Car className="h-5 w-5" />,
  FOOD_DELIVERY: <UtensilsCrossed className="h-5 w-5" />,
  GROCERY_DELIVERY: <ShoppingBag className="h-5 w-5" />,
  PACKAGE_DELIVERY: <Package className="h-5 w-5" />,
  PHARMACY_DELIVERY: <Pill className="h-5 w-5" />,
  SERVICE: <Receipt className="h-5 w-5" />,
};

const paymentLabelMap: Record<PaymentMethodType, { label: string; chipBg: string }> = {
  MTN_MOMO: { label: 'MTN Mobile Money', chipBg: '#FFCB05' },
  AIRTEL_MONEY: { label: 'Airtel Money', chipBg: '#ED1C24' },
  CASH: { label: 'Cash', chipBg: DS.secondaryContainer },
  WALLET: { label: 'Smart Ride Wallet', chipBg: DS.primaryFixed },
  CARD: { label: 'Card Payment', chipBg: DS.primaryFixed },
};

// ==========================================
// Props
// ==========================================

interface TransactionDetailsScreenProps {
  transaction: ReceiptData;
  onBack?: () => void;
  onDownloadReceipt?: () => void;
  onSupport?: () => void;
}

export function TransactionDetailsScreen({
  transaction,
  onBack,
  onDownloadReceipt,
  onSupport,
}: TransactionDetailsScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const serviceIcon = serviceIconMap[transaction.serviceType];
  const paymentInfo = paymentLabelMap[transaction.paymentMethod];

  return (
    <div
      className={cn(
        "min-h-screen max-w-md mx-auto transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{ backgroundColor: DS.surface }}
    >
      {/* Header: Back + "Transaction Details" + help icon */}
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
            <h1 className="text-lg font-semibold" style={{ color: DS.onSurface }}>Transaction Details</h1>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <HelpCircle className="h-5 w-5" style={{ color: DS.onSurfaceVariant }} />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Status Section: 80px check_circle in secondary-container */}
        <div className="text-center py-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${DS.secondaryContainer}30` }}>
            <CheckCircle className="h-10 w-10" style={{ color: DS.secondary }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: DS.onSurface }}>Transaction Successful</h2>
          <p className="text-sm mt-1" style={{ color: DS.onSurfaceVariant }}>{formatDate(transaction.endTime)}</p>
        </div>

        {/* Summary Card: White, shadow, large amount display, watermark icon */}
        <div className="bg-white rounded-xl shadow-md p-6 relative overflow-hidden">
          {/* Watermark icon */}
          <div className="absolute top-3 right-3 opacity-10">
            <Receipt className="h-20 w-20" style={{ color: DS.primary }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: DS.onSurfaceVariant }}>Total Amount</p>
          <p className="text-3xl font-bold" style={{ color: DS.primary }}>
            {formatCurrency(transaction.fareBreakdown.total, transaction.currency)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${DS.secondaryContainer}30`, color: DS.onSecondaryContainer }}>
              <CheckCircle className="h-3 w-3" />
              Paid
            </span>
            <span className="text-xs" style={{ color: DS.onSurfaceVariant }}>
              via {paymentInfo.label}
            </span>
          </div>
        </div>

        {/* Map Context: h-32 image with gradient fade, location label */}
        <div className="relative h-32 rounded-xl overflow-hidden" style={{ backgroundColor: DS.surfaceContainer }}>
          {/* Placeholder map area with gradient */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${DS.surfaceContainer} 0%, transparent 60%)` }} />
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <MapPin className="h-12 w-12" style={{ color: DS.outline }} />
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm">
              <Navigation className="h-4 w-4" style={{ color: DS.secondary }} />
              <span className="text-sm font-medium truncate" style={{ color: DS.onSurface }}>
                {transaction.pickup.address} → {transaction.dropoff.address}
              </span>
            </div>
          </div>
        </div>

        {/* Service Details: Icon + title + transaction ID, payment method */}
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: `1px solid ${DS.outlineVariant}` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${DS.secondaryContainer}20`, color: DS.secondary }}>
              {serviceIcon}
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: DS.onSurface }}>
                {transaction.serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-xs font-mono" style={{ color: DS.onSurfaceVariant }}>
                {transaction.taskId}
              </p>
            </div>
          </div>
          <Separator style={{ backgroundColor: DS.outlineVariant }} />
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Payment Method</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: paymentInfo.chipBg }}>
                  <Phone className="h-3 w-3" style={{ color: paymentInfo.chipBg === '#FFCB05' ? '#000' : '#fff' }} />
                </div>
                <span className="font-medium" style={{ color: DS.onSurface }}>{paymentInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Duration</span>
              <span className="font-medium" style={{ color: DS.onSurface }}>{transaction.duration} min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Distance</span>
              <span className="font-medium" style={{ color: DS.onSurface }}>{transaction.distance.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        {/* Fare Breakdown: bg-surface-container-low, tonal layer, dividers */}
        <div className="rounded-xl p-4" style={{ backgroundColor: DS.surfaceContainerLow }}>
          <h3 className="font-semibold mb-3" style={{ color: DS.onSurface }}>Fare Breakdown</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Base fare</span>
              <span style={{ color: DS.onSurface }}>{formatCurrency(transaction.fareBreakdown.baseFare, transaction.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Distance ({transaction.distance.toFixed(1)} km)</span>
              <span style={{ color: DS.onSurface }}>{formatCurrency(transaction.fareBreakdown.distanceFare, transaction.currency)}</span>
            </div>
            {transaction.fareBreakdown.timeFare ? (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: DS.onSurfaceVariant }}>Time</span>
                <span style={{ color: DS.onSurface }}>{formatCurrency(transaction.fareBreakdown.timeFare, transaction.currency)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: DS.onSurfaceVariant }}>Service fee</span>
              <span style={{ color: DS.onSurface }}>{formatCurrency(transaction.fareBreakdown.serviceFee, transaction.currency)}</span>
            </div>
            {transaction.fareBreakdown.discount ? (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: DS.secondary }}>Discount</span>
                <span style={{ color: DS.secondary }}>-{formatCurrency(transaction.fareBreakdown.discount, transaction.currency)}</span>
              </div>
            ) : null}
            <Separator style={{ backgroundColor: DS.outlineVariant }} />
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold" style={{ color: DS.onSurface }}>Total</span>
              <span className="text-lg font-bold" style={{ color: DS.primary }}>
                {formatCurrency(transaction.fareBreakdown.total, transaction.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Support CTA: Full-width button with chevron_right */}
        {onSupport && (
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl flex items-center justify-between px-4"
            style={{ borderColor: DS.outlineVariant, color: DS.onSurface }}
            onClick={onSupport}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: DS.primary }} />
              <span className="font-medium">Need Help? Contact Support</span>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: DS.outline }} />
          </Button>
        )}

        {/* Download E-Receipt: Full-width h-14 primary button */}
        {onDownloadReceipt && (
          <Button
            className="w-full h-14 text-base font-semibold rounded-xl"
            style={{ backgroundColor: DS.primary, color: DS.onPrimary }}
            onClick={onDownloadReceipt}
          >
            <Download className="h-5 w-5 mr-2" />
            Download E-Receipt
          </Button>
        )}
      </div>
    </div>
  );
}

export default TransactionDetailsScreen;

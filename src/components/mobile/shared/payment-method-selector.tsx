'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Banknote,
  Smartphone,
  CreditCard,
  ChevronDown,
  Check
} from 'lucide-react';

export type PaymentMethod =
  | 'CASH'
  | 'MTN_MOMO'
  | 'AIRTEL_MONEY'
  | 'VISA'
  | 'MASTERCARD'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD';

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const paymentOptions: PaymentOption[] = [
  {
    id: 'CASH',
    label: 'Cash',
    shortLabel: 'Cash',
    icon: <Banknote className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'MTN_MOMO',
    label: 'MTN Mobile Money',
    shortLabel: 'MTN MoMo',
    icon: <Smartphone className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    id: 'AIRTEL_MONEY',
    label: 'Airtel Money',
    shortLabel: 'Airtel',
    icon: <Smartphone className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    id: 'VISA',
    label: 'Visa Card',
    shortLabel: 'Visa',
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'MASTERCARD',
    label: 'Mastercard',
    shortLabel: 'Master',
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
];

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  /** Optional: compact badge style */
  compact?: boolean;
  /** Optional: label to show above the selector */
  label?: string;
  /** Optional: theme color for dark mode styling */
  themeColor?: string;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  compact = false,
  label = 'Payment',
  themeColor: _themeColor,
}: PaymentMethodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = paymentOptions.find((opt) => opt.id === selectedMethod) || paymentOptions[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (method: PaymentMethod) => {
    onSelect(method);
    setIsOpen(false);
  };

  // Compact Badge Style - Small inline dropdown
  if (compact) {
    return (
      <div ref={dropdownRef} className="relative inline-block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1.5 ${selectedOption.bgColor} ${selectedOption.color} px-2.5 py-1.5 rounded-full transition-all active:scale-95 text-sm`}
        >
          {selectedOption.icon}
          <span className="font-medium">{selectedOption.shortLabel}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            {paymentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 transition-colors ${
                  selectedMethod === option.id ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-7 h-7 ${option.bgColor} rounded-full flex items-center justify-center ${option.color}`}>
                  {option.icon}
                </div>
                <span className="flex-1 text-left text-sm text-gray-900">{option.label}</span>
                {selectedMethod === option.id && (
                  <Check className="h-4 w-4 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default Style - Dropdown trigger with expandable menu
  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 ${selectedOption.bgColor} rounded-full flex items-center justify-center ${selectedOption.color}`}>
            {selectedOption.icon}
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-medium text-gray-900 text-sm">{selectedOption.label}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {paymentOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors ${
                selectedMethod === option.id ? 'bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 ${option.bgColor} rounded-full flex items-center justify-center ${option.color}`}>
                {option.icon}
              </div>
              <span className="flex-1 text-left text-sm text-gray-900">{option.label}</span>
              {selectedMethod === option.id && (
                <Check className="h-4 w-4 text-emerald-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact Badge Component - For inline use in headers or small spaces */
export function PaymentMethodBadge({ 
  method, 
  onClick 
}: { 
  method: PaymentMethod;
  onClick?: () => void;
}) {
  const option = paymentOptions.find((opt) => opt.id === method) || paymentOptions[0];
  
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 ${option.bgColor} ${option.color} px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity`}
    >
      {option.icon}
      <span className="text-xs font-medium">{option.shortLabel}</span>
    </button>
  );
}

/** Payment method labels for display */
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  'CASH': 'Cash',
  'MTN_MOMO': 'MTN Mobile Money',
  'AIRTEL_MONEY': 'Airtel Money',
  'VISA': 'Visa Card',
  'MASTERCARD': 'Mastercard',
  'CREDIT_CARD': 'Credit Card',
  'DEBIT_CARD': 'Debit Card',
};

/** Get payment option details */
export function getPaymentOption(method: PaymentMethod) {
  return paymentOptions.find((opt) => opt.id === method) || paymentOptions[0];
}

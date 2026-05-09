'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import {
  Heart,
  Store,
  Shield,
  Smartphone,
  ChevronRight,
  Check,
  FileText,
  Truck,
  Bell,
  BarChart3,
  Pill,
  Users,
  ArrowRight
} from 'lucide-react';

interface PharmacyOnboardingProps {
  onComplete: () => void;
}

export function PharmacyOnboarding({ onComplete }: PharmacyOnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'features' | 'setup' | 'complete'>('welcome');

  const features = [
    {
      icon: FileText,
      title: 'Pharmacy Order Tickets (POT)',
      description: 'Receive and manage orders digitally - no paper tickets needed'
    },
    {
      icon: Shield,
      title: 'Prescription Verification',
      description: 'Securely verify prescriptions with audit logging'
    },
    {
      icon: Truck,
      title: 'Rider Integration',
      description: 'Automatic dispatch to verified delivery riders'
    },
    {
      icon: Bell,
      title: 'Instant Notifications',
      description: 'Get alerted immediately when new orders arrive'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track sales, orders, and performance metrics'
    },
    {
      icon: Pill,
      title: 'Inventory Management',
      description: 'Manage your medicine catalog and stock levels'
    }
  ];

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-500 to-pink-600 flex flex-col items-center justify-center p-6">
        {/* Logo */}
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl">
          <Heart className="h-12 w-12 text-rose-500" />
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Smart Health
        </h1>
        <p className="text-rose-100 text-lg text-center mb-8">
          Pharmacy Partner App
        </p>

        <MobileCard className="w-full max-w-sm p-6 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h2>
            <p className="text-gray-600">
              Join Uganda&apos;s leading pharmacy delivery network. Start receiving orders in minutes.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-rose-600" />
              </div>
              <span className="text-sm">No KOT system needed</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-rose-600" />
              </div>
              <span className="text-sm">Free to join, pay only commissions</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-rose-600" />
              </div>
              <span className="text-sm">24/7 support available</span>
            </div>
          </div>

          <button
            onClick={() => setStep('features')}
            className="w-full py-4 bg-rose-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </button>
        </MobileCard>

        <p className="text-rose-200 text-sm text-center">
          Already have an account?{' '}
          <button className="text-white font-semibold underline">
            Sign In
          </button>
        </p>
      </div>
    );
  }

  if (step === 'features') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 px-4 pt-8 pb-12">
          <h1 className="text-2xl font-bold text-white mb-2">Powerful Features</h1>
          <p className="text-rose-100">Everything you need to run your pharmacy delivery</p>
        </div>

        <div className="px-4 -mt-6 pb-8">
          <MobileCard className="p-4">
            <div className="space-y-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('welcome')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('setup')}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </MobileCard>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 px-4 pt-8 pb-12">
          <h1 className="text-2xl font-bold text-white mb-2">Set Up Your Pharmacy</h1>
          <p className="text-rose-100">Complete your profile to start receiving orders</p>
        </div>

        <div className="px-4 -mt-6 pb-8">
          <MobileCard className="p-4">
            <div className="space-y-4">
              {/* Pharmacy Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Pharmacy Name</label>
                <input
                  type="text"
                  placeholder="e.g., HealthFirst Pharmacy"
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* License Number */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Pharmacy License Number</label>
                <input
                  type="text"
                  placeholder="e.g., PHA-2024-XXXXX"
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
                <input
                  type="text"
                  placeholder="Address or landmark"
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+256 XXX XXX XXX"
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Pharmacist in Charge */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Pharmacist in Charge</label>
                <input
                  type="text"
                  placeholder="Full name"
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Operating Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Opening Time</label>
                  <input
                    type="time"
                    defaultValue="08:00"
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Closing Time</label>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl">
                <input type="checkbox" className="mt-1" />
                <p className="text-sm text-gray-600">
                  I agree to the <span className="text-rose-600 font-medium">Terms of Service</span> and{' '}
                  <span className="text-rose-600 font-medium">Privacy Policy</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('features')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('complete')}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                Complete Setup
                <Check className="h-4 w-4" />
              </button>
            </div>
          </MobileCard>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-500 to-pink-600 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl">
          <Check className="h-10 w-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2">
          All Set!
        </h1>
        <p className="text-rose-100 text-center mb-8 max-w-sm">
          Your pharmacy is now registered. You can start receiving orders right away.
        </p>

        <MobileCard className="w-full max-w-sm p-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Profile created successfully</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Notification preferences set</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Ready to receive orders</span>
            </div>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-4 bg-rose-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            Go to Dashboard
            <ArrowRight className="h-5 w-5" />
          </button>
        </MobileCard>

        <p className="text-rose-200 text-sm text-center mt-6">
          Need help? Call us at 0800-SMARTRIDE
        </p>
      </div>
    );
  }

  return null;
}

'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import {
  Store,
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  Star,
  TrendingUp,
  ChevronRight,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  CreditCard,
  FileText,
  Users,
  Award
} from 'lucide-react';

export function PharmacyProfile() {
  const pharmacy = {
    name: 'HealthFirst Pharmacy',
    license: 'PHA-2024-45678',
    address: 'Plot 45, Kampala Central',
    city: 'Kampala, Uganda',
    phone: '+256 700 123 456',
    email: 'healthfirst@pharmacy.ug',
    openingTime: '08:00',
    closingTime: '22:00',
    isOpen: true,
    rating: 4.7,
    totalReviews: 156,
    totalOrders: 892,
    verifiedOrders: 45,
    pharmacistInCharge: 'Pharm. David Okello',
    pharmacistLicense: 'PPC-2018-1234',
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: Store, label: 'Pharmacy Information', value: pharmacy.name },
        { icon: Shield, label: 'License & Verification', value: 'Verified' },
        { icon: Users, label: 'Staff Management', badge: '3' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { icon: Clock, label: 'Operating Hours', value: `${pharmacy.openingTime} - ${pharmacy.closingTime}` },
        { icon: Bell, label: 'Notifications', value: 'On' },
        { icon: FileText, label: 'Prescription History', value: '45' },
      ],
    },
    {
      title: 'Financial',
      items: [
        { icon: CreditCard, label: 'Payment Methods', value: 'MTN, Airtel, Cash' },
        { icon: TrendingUp, label: 'Revenue Reports', badge: 'View' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', value: '' },
        { icon: Settings, label: 'Settings', value: '' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 px-4 pt-4 pb-8">
        <h1 className="text-xl font-bold text-white mb-4">Profile</h1>
        
        {/* Pharmacy Card */}
        <MobileCard className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center">
              <Store className="h-8 w-8 text-rose-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900">{pharmacy.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  Verified
                </span>
              </div>
              <p className="text-sm text-gray-500">{pharmacy.license}</p>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-gray-700">{pharmacy.rating}</span>
                <span className="text-sm text-gray-500">({pharmacy.totalReviews} reviews)</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{pharmacy.totalOrders}</p>
              <p className="text-xs text-gray-500">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{pharmacy.verifiedOrders}</p>
              <p className="text-xs text-gray-500">Prescriptions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-rose-600">{pharmacy.rating}</p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
          </div>
        </MobileCard>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Pharmacist Info */}
        <MobileCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center">
              <Award className="h-7 w-7 text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pharmacist in Charge</p>
              <p className="font-semibold text-gray-900">{pharmacy.pharmacistInCharge}</p>
              <p className="text-sm text-gray-500">License: {pharmacy.pharmacistLicense}</p>
            </div>
          </div>
        </MobileCard>

        {/* Contact Info */}
        <MobileCard className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{pharmacy.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{pharmacy.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{pharmacy.address}, {pharmacy.city}</span>
            </div>
          </div>
        </MobileCard>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </h3>
            <MobileCard className="divide-y divide-gray-100">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <button 
                    key={itemIndex}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50"
                  >
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      {item.value && (
                        <p className="text-sm text-gray-500">{item.value}</p>
                      )}
                    </div>
                    {item.badge && (
                      <span className="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                );
              })}
            </MobileCard>
          </div>
        ))}

        {/* Logout Button */}
        <button className="w-full py-4 text-red-600 font-medium flex items-center justify-center gap-2">
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Store,
  MapPin,
  Clock,
  FileText,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  User,
  Bike,
  Heart,
  Edit,
  CheckCircle,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { useUser } from '../../../context/user-context';

export function PharmacistProfile() {
  const { user, switchRole, logout } = useUser();

  const pharmacyData = {
    name: 'HealthCare Pharmacy',
    type: 'Licensed Pharmacy',
    licenseNumber: 'NDA/PHM/2024/00001',
    location: 'Kampala Central, Uganda',
    phone: '+256 700 987 654',
    email: 'healthcare.pharmacy@example.com',
    rating: 4.8,
    totalOrders: 450,
    memberSince: 'January 2024',
    isOpen: true,
  };

  const operatingHours = {
    monday: '08:00 - 21:00',
    tuesday: '08:00 - 21:00',
    wednesday: '08:00 - 21:00',
    thursday: '08:00 - 21:00',
    friday: '08:00 - 22:00',
    saturday: '09:00 - 22:00',
    sunday: '10:00 - 20:00',
  };

  const documents = [
    { id: 'nda_license', name: 'NDA License', status: 'verified' },
    { id: 'business_permit', name: 'Business Permit', status: 'verified' },
    { id: 'pharmacist_cert', name: 'Pharmacist Certificate', status: 'verified' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Pharmacy Profile Card */}
      <div className="px-4 pt-4">
        <Card className="p-6 bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                HC
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{pharmacyData.name}</h2>
              </div>
              <p className="text-rose-100 text-sm">{pharmacyData.type}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-white/80">⭐ {pharmacyData.rating}</span>
                <span className="text-white/60">•</span>
                <span className="text-sm text-white/80">{pharmacyData.totalOrders} orders</span>
              </div>
            </div>
            <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              <Edit className="h-5 w-5 text-white" />
            </button>
          </div>
        </Card>
      </div>

      {/* Pharmacy Information */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Pharmacy Information
        </h2>
        <Card className="divide-y divide-gray-100">
          <div className="p-4 flex items-center gap-3">
            <Store className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Business Name</p>
              <p className="text-gray-900">{pharmacyData.name}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-gray-500 text-xs">License Number</p>
              <p className="text-gray-900">{pharmacyData.licenseNumber}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Location</p>
              <p className="text-gray-900">{pharmacyData.location}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-gray-500 text-xs">Operating Hours</p>
              <p className="text-gray-900">Mon-Fri: 8AM - 9PM</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Documents & Licenses */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Documents & Licenses
        </h2>
        <Card className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {doc.status === 'verified' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-gray-700">{doc.name}</span>
              </div>
              <span className={cn(
                "text-xs font-medium",
                doc.status === 'verified' ? "text-green-600" : "text-yellow-600"
              )}>
                {doc.status === 'verified' ? 'Verified' : 'Pending'}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Verification Status */}
      <div className="px-4 mt-6">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Pharmacy Verified</p>
              <p className="text-sm text-green-600">All documents verified • Accepting orders</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Role Switching */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Switch Role
        </h2>
        <Card className="overflow-hidden">
          <button
            onClick={() => switchRole('CLIENT')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Switch to Client</p>
              <p className="text-sm text-gray-500">Order rides, medicines, and deliveries</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={() => switchRole('RIDER')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <Bike className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Switch to Rider</p>
              <p className="text-sm text-gray-500">Deliver orders and earn money</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={() => switchRole('MERCHANT')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Switch to Merchant</p>
              <p className="text-sm text-gray-500">Manage restaurant or shop</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Quick Links
        </h2>
        <Card className="divide-y divide-gray-100">
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">Settings</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">Payment Settings</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">Help & Support</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-6">
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={logout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}

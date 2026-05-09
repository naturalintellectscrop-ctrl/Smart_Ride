'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  User,
  Star,
  Bike,
  Car,
  FileText,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  Store,
  Heart,
  Edit
} from 'lucide-react';
import { useUser } from '../../context/user-context';

export function RiderProfile() {
  const { user, switchRole, logout } = useUser();

  const userData = {
    name: user?.name || 'Emmanuel Okello',
    phone: user?.phone || '+256 700 123 456',
    email: user?.email || 'emmanuel@example.com',
    rating: 4.8,
    totalTrips: 342,
    completionRate: 96,
    acceptanceRate: 92,
    memberSince: 'March 2024',
  };

  const vehicleInfo = {
    type: 'Boda Boda',
    make: 'Bajaj',
    model: 'Boxer 150',
    plateNumber: 'UAX 123A',
    color: 'Red',
    year: 2022,
  };

  const documents = [
    { id: 'national_id', name: 'National ID', status: 'verified' },
    { id: 'license', name: "Driver's License", status: 'verified' },
    { id: 'vehicle_reg', name: 'Vehicle Registration', status: 'verified' },
    { id: 'insurance', name: 'Insurance', status: 'pending' },
  ];

  const handleRoleSwitch = (role: 'CLIENT' | 'MERCHANT' | 'PHARMACIST') => {
    switchRole(role);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="px-4 pt-4">
        <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                {userData.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{userData.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-sm">{userData.rating}</span>
                </div>
                <span className="text-white/60">•</span>
                <span className="text-sm text-white/80">{userData.totalTrips} trips</span>
              </div>
            </div>
            <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              <Edit className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{userData.completionRate}%</p>
              <p className="text-xs text-white/80">Completion</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{userData.acceptanceRate}%</p>
              <p className="text-xs text-white/80">Acceptance</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                <span className="text-xl font-bold">{userData.rating}</span>
              </div>
              <p className="text-xs text-white/80">Rating</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Vehicle Information */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Vehicle Information
        </h2>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Bike className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{vehicleInfo.make} {vehicleInfo.model}</p>
              <p className="text-sm text-gray-500">{vehicleInfo.type} • {vehicleInfo.color} • {vehicleInfo.year}</p>
              <p className="text-sm font-medium text-emerald-600 mt-1">{vehicleInfo.plateNumber}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Documents */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Documents
        </h2>
        <Card className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">{doc.name}</span>
              </div>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                doc.status === 'verified' 
                  ? "bg-green-100 text-green-700" 
                  : "bg-yellow-100 text-yellow-700"
              )}>
                {doc.status === 'verified' ? 'Verified' : 'Pending'}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Account Status */}
      <div className="px-4 mt-6">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Account Verified</p>
              <p className="text-sm text-green-600">You can accept all types of rides</p>
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
            onClick={() => handleRoleSwitch('CLIENT')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Switch to Client</p>
              <p className="text-sm text-gray-500">Order rides and deliveries</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={() => handleRoleSwitch('MERCHANT')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Switch to Merchant</p>
              <p className="text-sm text-gray-500">Manage your business on Smart Ride</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={() => handleRoleSwitch('PHARMACIST')}
            className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
              <Heart className="h-6 w-6 text-rose-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Switch to Pharmacist</p>
              <p className="text-sm text-gray-500">Manage pharmacy and dispense medicines</p>
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
              <Shield className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">Safety & Insurance</span>
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
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}

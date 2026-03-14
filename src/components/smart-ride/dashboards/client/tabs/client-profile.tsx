'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  User,
  Star,
  MapPin,
  Phone,
  Settings,
  LogOut,
  ChevronRight,
  Bike,
  Store,
  Shield,
  HelpCircle,
  Edit,
  Heart
} from 'lucide-react';
import { useUser } from '../../../context/user-context';
import { SettingsScreen } from './client-settings';
import { HelpSupportScreen } from './client-settings';

interface SavedLocation {
  id: string;
  name: string;
  address: string;
  type: 'home' | 'work' | 'other';
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

const savedLocations: SavedLocation[] = [
  { id: '1', name: 'Home', address: 'Ntinda, Kampala', type: 'home' },
  { id: '2', name: 'Work', address: 'Kampala CBD', type: 'work' },
];

const emergencyContacts: EmergencyContact[] = [
  { id: '1', name: 'Jane Doe', relationship: 'Spouse', phone: '+256 700 111 222' },
  { id: '2', name: 'John Doe Sr.', relationship: 'Father', phone: '+256 700 333 444' },
];

export function ClientProfile() {
  const { user, switchRole, logout } = useUser();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Show settings screen
  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  // Show help screen
  if (showHelp) {
    return <HelpSupportScreen onBack={() => setShowHelp(false)} />;
  }

  const userData = {
    name: user?.name || 'John Doe',
    email: user?.email || 'john@example.com',
    phone: user?.phone || '+256 700 123 456',
    totalRides: 45,
    totalSpent: 845000,
    rating: 4.9,
    memberSince: 'January 2024',
  };

  const handleRoleSwitch = (role: 'RIDER' | 'MERCHANT' | 'PHARMACIST') => {
    switchRole(role);
    setShowRoleSwitcher(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] pb-4">
      {/* Header */}
      <div className="bg-[#13131A] px-4 py-4 border-b border-white/5 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-white">Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="px-4 pt-4">
        <Card 
          className="p-6 text-white border-0"
          style={{ 
            background: 'linear-gradient(135deg, #00FF88 0%, #00CC6E 100%)',
            boxShadow: '0 4px 30px rgba(0, 255, 136, 0.2)'
          }}
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-[#0D0D12] text-xl font-bold">
                {userData.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#0D0D12]">{userData.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-[#0D0D12] fill-[#0D0D12]" />
                  <span className="text-sm text-[#0D0D12]/80">{userData.rating}</span>
                </div>
                <span className="text-[#0D0D12]/40">•</span>
                <span className="text-sm text-[#0D0D12]/80">Member since {userData.memberSince}</span>
              </div>
            </div>
            <button className="w-10 h-10 bg-[#0D0D12]/20 rounded-full flex items-center justify-center hover:bg-[#0D0D12]/30 transition-colors">
              <Edit className="h-5 w-5 text-[#0D0D12]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-[#0D0D12]/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#0D0D12]">{userData.totalRides}</p>
              <p className="text-sm text-[#0D0D12]/80">Total Rides</p>
            </div>
            <div className="bg-[#0D0D12]/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#0D0D12]">UGX {(userData.totalSpent / 1000).toFixed(0)}K</p>
              <p className="text-sm text-[#0D0D12]/80">Total Spent</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Personal Information */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Personal Information
        </h2>
        <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <span className="text-gray-400">Phone</span>
            </div>
            <span className="text-white">{userData.phone}</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-500" />
              <span className="text-gray-400">Email</span>
            </div>
            <span className="text-white">{userData.email}</span>
          </div>
        </Card>
      </div>

      {/* Saved Locations */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Saved Locations
          </h2>
          <button className="text-[#00FF88] text-sm font-medium flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            Add New
          </button>
        </div>
        <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
          {savedLocations.map((location) => (
            <div key={location.id} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 bg-blue-500/15 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{location.name}</p>
                <p className="text-sm text-gray-500">{location.address}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </div>
          ))}
        </Card>
      </div>

      {/* Emergency Contacts */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#FF3B5C]" />
            Emergency Contacts
          </h2>
          <button className="text-[#00FF88] text-sm font-medium flex items-center gap-1">
            <Phone className="h-4 w-4" />
            Add New
          </button>
        </div>
        <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
          {emergencyContacts.map((contact) => (
            <div key={contact.id} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[#FF3B5C]/15 text-[#FF3B5C]">
                  {contact.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-white">{contact.name}</p>
                <p className="text-sm text-gray-500">{contact.relationship}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </div>
          ))}
        </Card>
      </div>

      {/* Role Switching */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Switch Role
        </h2>
        <Card className="bg-[#13131A] border-white/5 overflow-hidden">
          <button
            onClick={() => handleRoleSwitch('RIDER')}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="w-12 h-12 bg-orange-500/15 rounded-xl flex items-center justify-center">
              <Bike className="h-6 w-6 text-orange-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Switch to Rider</p>
              <p className="text-sm text-gray-500">Earn money delivering orders</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={() => handleRoleSwitch('MERCHANT')}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <Store className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Switch to Merchant</p>
              <p className="text-sm text-gray-500">Manage your business on Smart Ride</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={() => handleRoleSwitch('PHARMACIST')}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="w-12 h-12 bg-rose-500/15 rounded-xl flex items-center justify-center">
              <Heart className="h-6 w-6 text-rose-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Switch to Pharmacist</p>
              <p className="text-sm text-gray-500">Manage pharmacy and dispense medicines</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Quick Links
        </h2>
        <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-500" />
              <span className="text-gray-300">Settings</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
          <button 
            onClick={() => setShowHelp(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-gray-500" />
              <span className="text-gray-300">Help & Support</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-6">
        <Button
          variant="outline"
          className="w-full border-[#FF3B5C]/30 text-[#FF3B5C] hover:bg-[#FF3B5C]/10 hover:text-[#FF3B5C] hover:border-[#FF3B5C]/50"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}

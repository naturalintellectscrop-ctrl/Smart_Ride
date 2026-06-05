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
    <div className="min-h-screen bg-[#f8f9fa] pb-4">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-[#bec9bf]/30 sticky top-6 z-40 shadow-sm">
        <h1 className="text-xl font-bold text-[#191c1d]">Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="px-4 pt-4">
        <Card 
          className="p-6 text-white border-0 relative overflow-hidden rounded-2xl"
          style={{ 
            background: 'linear-gradient(135deg, #005f3a 0%, #0e7a4d 100%)',
            boxShadow: '0 4px 20px rgba(0, 95, 58, 0.2)'
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          
          <div className="flex items-center gap-4 relative z-10">
            <Avatar className="h-16 w-16 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                {userData.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{userData.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-white fill-white" />
                  <span className="text-sm text-white/80">{userData.rating}</span>
                </div>
                <span className="text-white/40">•</span>
                <span className="text-sm text-white/80">Member since {userData.memberSince}</span>
              </div>
            </div>
            <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              <Edit className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 relative z-10">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{userData.totalRides}</p>
              <p className="text-sm text-white/80">Total Rides</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">UGX {(userData.totalSpent / 1000).toFixed(0)}K</p>
              <p className="text-sm text-white/80">Total Spent</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Personal Information */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-[#6f7a71] uppercase tracking-wider mb-3">
          Personal Information
        </h2>
        <Card className="bg-white border border-[#bec9bf]/30 divide-y divide-[#bec9bf]/20">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-[#6f7a71]" />
              <span className="text-[#3f4941]">Phone</span>
            </div>
            <span className="text-[#191c1d]">{userData.phone}</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-[#6f7a71]" />
              <span className="text-[#3f4941]">Email</span>
            </div>
            <span className="text-[#191c1d]">{userData.email}</span>
          </div>
        </Card>
      </div>

      {/* Saved Locations */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#6f7a71] uppercase tracking-wider">
            Saved Locations
          </h2>
          <button className="text-[#005f3a] text-sm font-medium flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            Add New
          </button>
        </div>
        <Card className="bg-white border border-[#bec9bf]/30 divide-y divide-[#bec9bf]/20">
          {savedLocations.map((location) => (
            <div key={location.id} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[#f3f4f5] transition-colors">
              <div className="w-10 h-10 bg-[#edeeef] rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-[#005f3a]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#191c1d]">{location.name}</p>
                <p className="text-sm text-[#6f7a71]">{location.address}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#bec9bf]" />
            </div>
          ))}
        </Card>
      </div>

      {/* Emergency Contacts */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#6f7a71] uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#ba1a1a]" />
            Emergency Contacts
          </h2>
          <button className="text-[#005f3a] text-sm font-medium flex items-center gap-1">
            <Phone className="h-4 w-4" />
            Add New
          </button>
        </div>
        <Card className="bg-white border border-[#bec9bf]/30 divide-y divide-[#bec9bf]/20">
          {emergencyContacts.map((contact) => (
            <div key={contact.id} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[#f3f4f5] transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[#ba1a1a]/10 text-[#ba1a1a]">
                  {contact.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-[#191c1d]">{contact.name}</p>
                <p className="text-sm text-[#6f7a71]">{contact.relationship}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#bec9bf]" />
            </div>
          ))}
        </Card>
      </div>

      {/* Role Switching */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-[#6f7a71] uppercase tracking-wider mb-3">
          Switch Role
        </h2>
        <Card className="bg-white border border-[#bec9bf]/30 overflow-hidden">
          <button
            onClick={() => handleRoleSwitch('RIDER')}
            className="w-full p-4 flex items-center gap-3 hover:bg-[#f3f4f5] transition-colors border-b border-[#bec9bf]/20"
          >
            <div className="w-12 h-12 bg-[#006e2f]/10 rounded-xl flex items-center justify-center">
              <Bike className="h-6 w-6 text-[#006e2f]" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-[#191c1d]">Switch to Rider</p>
              <p className="text-sm text-[#6f7a71]">Earn money delivering orders</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#bec9bf]" />
          </button>
          <button
            onClick={() => handleRoleSwitch('MERCHANT')}
            className="w-full p-4 flex items-center gap-3 hover:bg-[#f3f4f5] transition-colors border-b border-[#bec9bf]/20"
          >
            <div className="w-12 h-12 bg-[#4b5264]/10 rounded-xl flex items-center justify-center">
              <Store className="h-6 w-6 text-[#4b5264]" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-[#191c1d]">Switch to Merchant</p>
              <p className="text-sm text-[#6f7a71]">Manage your business on Smart Ride</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#bec9bf]" />
          </button>
          <button
            onClick={() => handleRoleSwitch('PHARMACIST')}
            className="w-full p-4 flex items-center gap-3 hover:bg-[#f3f4f5] transition-colors"
          >
            <div className="w-12 h-12 bg-[#ba1a1a]/10 rounded-xl flex items-center justify-center">
              <Heart className="h-6 w-6 text-[#ba1a1a]" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-[#191c1d]">Switch to Pharmacist</p>
              <p className="text-sm text-[#6f7a71]">Manage pharmacy and dispense medicines</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#bec9bf]" />
          </button>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-[#6f7a71] uppercase tracking-wider mb-3">
          Quick Links
        </h2>
        <Card className="bg-white border border-[#bec9bf]/30 divide-y divide-[#bec9bf]/20">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#f3f4f5] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-[#6f7a71]" />
              <span className="text-[#3f4941]">Settings</span>
            </div>
            <ChevronRight className="h-5 w-5 text-[#bec9bf]" />
          </button>
          <button 
            onClick={() => setShowHelp(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#f3f4f5] transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-[#6f7a71]" />
              <span className="text-[#3f4941]">Help & Support</span>
            </div>
            <ChevronRight className="h-5 w-5 text-[#bec9bf]" />
          </button>
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-6">
        <Button
          variant="outline"
          className="w-full border-[#ba1a1a]/30 text-[#ba1a1a] hover:bg-[#ba1a1a]/10 hover:text-[#ba1a1a] hover:border-[#ba1a1a]/50"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}

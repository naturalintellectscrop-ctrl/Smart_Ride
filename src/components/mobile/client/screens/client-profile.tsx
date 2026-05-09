'use client';

import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { 
  User, 
  Phone, 
  Mail, 
  Star,
  Wallet,
  Gift,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';

export function ClientProfile() {
  const user = {
    name: 'John Doe',
    phone: '+256 700 123 456',
    email: 'john@example.com',
    totalRides: 45,
    totalSpent: 845000,
    rating: 4.9,
    memberSince: 'January 2024',
  };

  const menuItems = [
    { icon: <Wallet className="h-5 w-5" />, label: 'Payment Methods', badge: null },
    { icon: <Gift className="h-5 w-5" />, label: 'Promotions', badge: '2 offers' },
    { icon: <HelpCircle className="h-5 w-5" />, label: 'Help & Support', badge: null },
    { icon: <Settings className="h-5 w-5" />, label: 'Settings', badge: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Profile" />
      
      <div className="px-4 pt-4">
        {/* Profile Card */}
        <MobileCard className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-sm">{user.rating}</span>
                </div>
                <span className="text-white/60">•</span>
                <span className="text-sm text-white/80">Member since {user.memberSince}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{user.totalRides}</p>
              <p className="text-sm text-white/80">Total Rides</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">UGX {(user.totalSpent / 1000).toFixed(0)}K</p>
              <p className="text-sm text-white/80">Total Spent</p>
            </div>
          </div>
        </MobileCard>

        {/* Contact Info */}
        <MobileCard className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">{user.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">{user.email}</span>
            </div>
          </div>
        </MobileCard>

        {/* Menu Items */}
        <MobileCard className="mt-4 divide-y divide-gray-100">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-500">{item.icon}</div>
                <span className="text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="text-sm text-emerald-600 font-medium">{item.badge}</span>
                )}
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </button>
          ))}
        </MobileCard>

        {/* Logout */}
        <button className="mt-4 w-full flex items-center justify-center gap-2 text-red-600 py-4">
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
}

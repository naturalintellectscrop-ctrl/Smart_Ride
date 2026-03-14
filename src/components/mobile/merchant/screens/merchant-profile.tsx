'use client';

import { MobileCard } from '../../shared/mobile-components';
import {
  User,
  Store,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Shield,
  FileText,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  CheckCircle,
  Calendar,
  DollarSign
} from 'lucide-react';

export function MerchantProfile() {
  const merchant = {
    name: 'Cafe Java',
    branch: 'Kampala Central',
    owner: 'John Smith',
    phone: '+256 700 111 222',
    email: 'cafejava.kampala@example.com',
    address: 'Plot 45, Kampala Road, Central Business District',
    type: 'Restaurant',
    rating: 4.6,
    totalOrders: 1245,
    memberSince: 'March 2023',
    status: 'APPROVED',
    openTime: '07:00 AM',
    closeTime: '10:00 PM',
    verified: true,
  };

  const stats = [
    { label: 'Total Orders', value: merchant.totalOrders.toLocaleString(), icon: <Store className="h-5 w-5" /> },
    { label: 'Rating', value: merchant.rating, icon: <Star className="h-5 w-5" /> },
    { label: 'This Month', value: 'UGX 4.2M', icon: <DollarSign className="h-5 w-5" /> },
  ];

  const menuItems = [
    { icon: <FileText className="h-5 w-5" />, label: 'Business Documents', badge: 'Verified' },
    { icon: <Clock className="h-5 w-5" />, label: 'Operating Hours', badge: null },
    { icon: <Shield className="h-5 w-5" />, label: 'Verification Status', badge: 'Approved' },
    { icon: <HelpCircle className="h-5 w-5" />, label: 'Help & Support', badge: null },
    { icon: <Settings className="h-5 w-5" />, label: 'Settings', badge: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-4 pt-4 pb-6">
        <h1 className="text-xl font-bold text-white mb-4">Profile</h1>
      </div>

      <div className="px-4 -mt-2">
        {/* Profile Card */}
        <MobileCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Store className="h-8 w-8 text-orange-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{merchant.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{merchant.branch}</span>
                {merchant.verified && (
                  <span className="text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center text-gray-400 mb-1">
                  {stat.icon}
                </div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </MobileCard>

        {/* Business Info */}
        <MobileCard className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Business Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Owner</p>
                <p className="text-gray-900">{merchant.owner}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-gray-900">{merchant.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-gray-900">{merchant.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-gray-900">{merchant.address}</p>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* Operating Hours */}
        <MobileCard className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Operating Hours</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-gray-700">{merchant.openTime} - {merchant.closeTime}</span>
            </div>
            <button className="text-orange-600 text-sm font-medium">Edit</button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-gray-500 text-sm">Open Monday - Sunday</span>
          </div>
        </MobileCard>

        {/* Verification Status */}
        <MobileCard className="mt-4 p-4 bg-green-50 border-green-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-900">Verified Business</p>
              <p className="text-sm text-green-700">Your business is fully verified and active</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
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
                  <span className="text-sm text-green-600 font-medium">{item.badge}</span>
                )}
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </button>
          ))}
        </MobileCard>

        {/* Logout */}
        <button className="mt-4 w-full flex items-center justify-center gap-2 text-red-600 py-4 mb-6">
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import { MobileCard } from '../../shared/mobile-components';
import { 
  User, 
  Bike,
  Phone,
  Mail,
  MapPin,
  Star,
  Shield,
  FileText,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  CheckCircle,
  Clock
} from 'lucide-react';

export function RiderProfile() {
  const rider = {
    name: 'Emmanuel Okello',
    phone: '+256 710 111 222',
    email: 'emmanuel@example.com',
    role: 'Smart Boda Rider',
    rating: 4.8,
    totalTrips: 234,
    completedTrips: 228,
    memberSince: 'January 2024',
    status: 'APPROVED',
    hasReflectorVest: true,
    hasHelmet: true,
    vehicle: {
      type: 'BODA',
      make: 'Bajaj',
      model: 'Boxer',
      plateNumber: 'UAX 123A',
      color: 'Black',
    },
  };

  const menuItems = [
    { icon: <FileText className="h-5 w-5" />, label: 'Documents', badge: null },
    { icon: <Shield className="h-5 w-5" />, label: 'Verification Status', badge: 'Approved' },
    { icon: <HelpCircle className="h-5 w-5" />, label: 'Help & Support', badge: null },
    { icon: <Settings className="h-5 w-5" />, label: 'Settings', badge: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 pt-4 pb-6">
        <h1 className="text-xl font-bold text-white mb-4">Profile</h1>
      </div>

      <div className="px-4 -mt-2">
        {/* Profile Card */}
        <MobileCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{rider.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Bike className="h-3 w-3 text-emerald-600" />
                  <span className="text-xs text-emerald-700 font-medium">{rider.role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-xl font-bold text-gray-900">{rider.rating}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{rider.totalTrips}</p>
              <p className="text-xs text-gray-500 mt-1">Total Trips</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600">{Math.round((rider.completedTrips / rider.totalTrips) * 100)}%</p>
              <p className="text-xs text-gray-500 mt-1">Completion</p>
            </div>
          </div>
        </MobileCard>

        {/* Contact & Vehicle */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <MobileCard className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Contact</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{rider.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 truncate">{rider.email}</span>
              </div>
            </div>
          </MobileCard>
          <MobileCard className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Vehicle</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{rider.vehicle.make} {rider.vehicle.model}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">{rider.vehicle.plateNumber}</span>
              </div>
            </div>
          </MobileCard>
        </div>

        {/* Equipment Status */}
        <MobileCard className="mt-4 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Equipment Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Reflector Vest</span>
              {rider.hasReflectorVest ? (
                <span className="text-emerald-600 flex items-center gap-1 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Issued
                </span>
              ) : (
                <span className="text-gray-400 flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4" />
                  Not Issued
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Helmet</span>
              {rider.hasHelmet ? (
                <span className="text-emerald-600 flex items-center gap-1 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Issued
                </span>
              ) : (
                <span className="text-gray-400 flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4" />
                  Not Issued
                </span>
              )}
            </div>
          </div>
        </MobileCard>

        {/* Verification Status */}
        <MobileCard className="mt-4 p-4 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">Verified Rider</p>
              <p className="text-sm text-emerald-700">Your account is fully verified and active</p>
            </div>
            <CheckCircle className="h-6 w-6 text-emerald-600" />
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
        <button className="mt-4 w-full flex items-center justify-center gap-2 text-red-600 py-4 mb-6">
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
}

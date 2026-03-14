'use client';

import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  Award,
  TrendingUp,
  Clock,
  FileText,
  Edit,
  ChevronRight,
  LogOut,
  Shield,
  BadgeCheck,
} from 'lucide-react';

interface ProviderProfileScreenProps {
  providerId: string | null;
  onNavigate: (screen: any) => void;
}

export function ProviderProfileScreen({ providerId, onNavigate }: ProviderProfileScreenProps) {
  const provider = {
    businessName: 'Kampala Central Pharmacy',
    providerType: 'PHARMACY',
    ownerName: 'Dr. John Mukasa',
    phone: '+256 700 123 456',
    email: 'info@kampalacentralpharma.ug',
    address: 'Plot 12, Kampala Road, Kampala',
    licenseNumber: 'NDA/PHM/2024/00001',
    rating: 4.8,
    totalReviews: 156,
    totalOrders: 1234,
    verifiedAt: new Date('2024-01-15'),
    memberSince: new Date('2024-01-01'),
  };

  const stats = [
    { label: 'Total Orders', value: provider.totalOrders, icon: TrendingUp },
    { label: 'Reviews', value: provider.totalReviews, icon: Star },
    { label: 'Rating', value: provider.rating, icon: Award },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <MobileHeader title="Profile" />

      <div className="px-4 pt-4">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{provider.businessName}</h2>
                <BadgeCheck className="h-5 w-5 text-blue-300" />
              </div>
              <p className="text-emerald-100">{provider.providerType.replace(/_/g, ' ')}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-medium">{provider.rating}</span>
                <span className="text-emerald-200 text-sm">({provider.totalReviews} reviews)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-between">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="h-5 w-5 text-white/80 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-emerald-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Business Info */}
        <MobileCard className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Business Information</h3>
            <button className="text-emerald-600 text-sm font-medium flex items-center gap-1">
              <Edit className="h-4 w-4" />
              Edit
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Owner</p>
                <p className="font-medium text-gray-900">{provider.ownerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{provider.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{provider.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{provider.address}</p>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* License Info */}
        <MobileCard className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">License & Verification</h3>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Verified
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">License Number</span>
              <span className="font-medium text-gray-900">{provider.licenseNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Verified On</span>
              <span className="font-medium text-gray-900">
                {provider.verifiedAt.toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Member Since</span>
              <span className="font-medium text-gray-900">
                {provider.memberSince.toLocaleDateString()}
              </span>
            </div>
          </div>
        </MobileCard>

        {/* Quick Actions */}
        <MobileCard className="overflow-hidden mb-4">
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Operating Hours</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <div className="border-t border-gray-100" />
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Documents</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <div className="border-t border-gray-100" />
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Reviews & Ratings</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </MobileCard>

        {/* Logout */}
        <button className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl font-medium">
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

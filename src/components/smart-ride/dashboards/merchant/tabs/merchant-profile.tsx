'use client';

import React, { useState } from 'react';
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
  Camera,
} from 'lucide-react';
import { UserRole } from '../../../types';
import { EditModal, EditField, useEditModal } from '../../../shared/edit-modal';

interface MerchantProfileProps {
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => void;
}

export function MerchantProfile({ onLogout, onSwitchRole }: MerchantProfileProps) {
  const [businessData, setBusinessData] = useState({
    name: 'Cafe Java',
    type: 'Restaurant',
    location: 'Kampala Central, Uganda',
    phone: '+256 700 987 654',
    email: 'cafejava@example.com',
    rating: 4.7,
    totalOrders: 1250,
    memberSince: 'January 2024',
    isOpen: true,
  });

  const editModal = useEditModal();

  const operatingHours = {
    monday: '08:00 - 22:00',
    tuesday: '08:00 - 22:00',
    wednesday: '08:00 - 22:00',
    thursday: '08:00 - 22:00',
    friday: '08:00 - 23:00',
    saturday: '09:00 - 23:00',
    sunday: '10:00 - 21:00',
  };

  const documents = [
    { id: 'business_license', name: 'Business License', status: 'verified' },
    { id: 'food_permit', name: 'Food Handling Permit', status: 'verified' },
    { id: 'tax_clearance', name: 'Tax Clearance', status: 'verified' },
  ];

  const handleEditBusinessInfo = () => {
    const fields: EditField[] = [
      {
        id: 'name',
        type: 'business_name',
        label: 'Business Name',
        value: businessData.name,
        required: true,
        maxLength: 50,
      },
      {
        id: 'type',
        type: 'business_type',
        label: 'Business Type',
        value: businessData.type,
        placeholder: 'e.g., Restaurant, Pharmacy, Grocery Store',
      },
      {
        id: 'location',
        type: 'business_address',
        label: 'Location',
        value: businessData.location,
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        value: businessData.phone,
        required: true,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        value: businessData.email,
      },
    ];

    editModal.openModal(fields, {
      title: 'Edit Business Information',
      subtitle: 'Update your business details',
    });
  };

  const handleEditOperatingHours = () => {
    const fields: EditField[] = [
      {
        id: 'monday',
        type: 'operating_hours',
        label: 'Monday',
        value: operatingHours.monday,
      },
      {
        id: 'tuesday',
        type: 'operating_hours',
        label: 'Tuesday',
        value: operatingHours.tuesday,
      },
      {
        id: 'wednesday',
        type: 'operating_hours',
        label: 'Wednesday',
        value: operatingHours.wednesday,
      },
      {
        id: 'thursday',
        type: 'operating_hours',
        label: 'Thursday',
        value: operatingHours.thursday,
      },
      {
        id: 'friday',
        type: 'operating_hours',
        label: 'Friday',
        value: operatingHours.friday,
      },
      {
        id: 'saturday',
        type: 'operating_hours',
        label: 'Saturday',
        value: operatingHours.saturday,
      },
      {
        id: 'sunday',
        type: 'operating_hours',
        label: 'Sunday',
        value: operatingHours.sunday,
      },
    ];

    editModal.openModal(fields, {
      title: 'Edit Operating Hours',
      subtitle: 'Set your business hours for each day',
    });
  };

  const handleSave = async (fieldId: string, value: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setBusinessData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] pb-4">
      {/* Header */}
      <div className="bg-[#13131A] px-4 py-4 border-b border-white/5 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-white">Profile</h1>
      </div>

      {/* Business Profile Card */}
      <div className="px-4 pt-4">
        <Card 
          className="p-6 text-white border-0"
          style={{ 
            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
            boxShadow: '0 4px 30px rgba(255, 107, 53, 0.2)'
          }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-white/30">
                <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                  {businessData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Camera className="h-4 w-4 text-[#FF6B35]" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{businessData.name}</h2>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  businessData.isOpen 
                    ? "bg-green-400 text-white" 
                    : "bg-gray-400 text-white"
                )}>
                  {businessData.isOpen ? 'Open' : 'Closed'}
                </div>
              </div>
              <p className="text-orange-100 text-sm">{businessData.type}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-white/80">⭐ {businessData.rating}</span>
                <span className="text-white/60">•</span>
                <span className="text-sm text-white/80">{businessData.totalOrders} orders</span>
              </div>
            </div>
            <button 
              onClick={handleEditBusinessInfo}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Edit className="h-5 w-5 text-white" />
            </button>
          </div>
        </Card>
      </div>

      {/* Business Information */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Business Information
        </h2>
        <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
          <button 
            onClick={handleEditBusinessInfo}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <Store className="h-5 w-5 text-gray-400" />
            <div className="flex-1 text-left">
              <p className="text-gray-500 text-xs">Business Name</p>
              <p className="text-white">{businessData.name}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button 
            onClick={handleEditBusinessInfo}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <MapPin className="h-5 w-5 text-gray-400" />
            <div className="flex-1 text-left">
              <p className="text-gray-500 text-xs">Location</p>
              <p className="text-white">{businessData.location}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button 
            onClick={handleEditOperatingHours}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <Clock className="h-5 w-5 text-gray-400" />
            <div className="flex-1 text-left">
              <p className="text-gray-500 text-xs">Operating Hours</p>
              <p className="text-white">Mon-Fri: 8AM - 10PM</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </Card>
      </div>

      {/* Operating Hours */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Operating Hours
          </h2>
          <button 
            onClick={handleEditOperatingHours}
            className="text-[#00FF88] text-sm font-medium flex items-center gap-1"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
        </div>
        <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
          {Object.entries(operatingHours).map(([day, hours]) => (
            <div key={day} className="p-3 flex items-center justify-between">
              <span className="text-gray-300 capitalize">{day}</span>
              <span className="text-gray-500 text-sm">{hours}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Documents & Licenses */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documents & Licenses
        </h2>
        <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {doc.status === 'verified' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-gray-300">{doc.name}</span>
              </div>
              <span className={cn(
                "text-xs font-medium",
                doc.status === 'verified' ? "text-green-400" : "text-yellow-400"
              )}>
                {doc.status === 'verified' ? 'Verified' : 'Pending'}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Verification Status */}
      <div className="px-4 mt-6">
        <Card className="p-4 bg-[#00FF88]/10 border-[#00FF88]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00FF88]/20 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-[#00FF88]" />
            </div>
            <div>
              <p className="font-semibold text-[#00FF88]">Business Verified</p>
              <p className="text-sm text-gray-400">All documents verified • Accepting orders</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Role Switching */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Switch Role
        </h2>
        <Card className="bg-[#13131A] border-white/5 overflow-hidden">
          <button
            onClick={() => onSwitchRole('CLIENT')}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Switch to Client</p>
              <p className="text-sm text-gray-500">Order rides and deliveries</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={() => onSwitchRole('RIDER')}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="w-12 h-12 bg-orange-500/15 rounded-xl flex items-center justify-center">
              <Bike className="h-6 w-6 text-orange-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Switch to Rider</p>
              <p className="text-sm text-gray-500">Deliver orders and earn money</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={() => onSwitchRole('PHARMACIST')}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="w-12 h-12 bg-rose-500/15 rounded-xl flex items-center justify-center">
              <Heart className="h-6 w-6 text-rose-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-white">Switch to Pharmacist</p>
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
        <Card className="bg-[#13131A] border-white/5 divide-y divide-white/5">
          <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-400" />
              <span className="text-gray-300">Settings</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <span className="text-gray-300">Help & Support</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-6">
        <Button
          variant="outline"
          className="w-full border-[#FF3B5C]/30 text-[#FF3B5C] hover:bg-[#FF3B5C]/10 hover:text-[#FF3B5C] hover:border-[#FF3B5C]/50"
          onClick={onLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Log Out
        </Button>
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={editModal.isOpen}
        onClose={editModal.closeModal}
        onSave={handleSave}
        fields={editModal.fields}
        title={editModal.title}
        subtitle={editModal.subtitle}
      />
    </div>
  );
}

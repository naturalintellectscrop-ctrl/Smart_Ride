'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

type RiderRole = 'SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' | 'DELIVERY_PERSONNEL';

interface PersonalInfoScreenProps {
  role: RiderRole;
  onSubmit: (data: PersonalInfoData) => void;
  onBack: () => void;
}

export interface PersonalInfoData {
  fullName: string;
  phone: string;
  email: string;
  physicalAddress: string;
  city: string;
  district: string;
}

export function PersonalInfoScreen({ role, onSubmit, onBack }: PersonalInfoScreenProps) {
  const [formData, setFormData] = useState<PersonalInfoData>({
    fullName: '',
    phone: '',
    email: '',
    physicalAddress: '',
    city: '',
    district: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInfoData, string>>>({});

  const roleLabels: Record<RiderRole, string> = {
    SMART_BODA_RIDER: 'Smart Boda Rider',
    SMART_CAR_DRIVER: 'Smart Car Driver',
    DELIVERY_PERSONNEL: 'Delivery Personnel',
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PersonalInfoData, string>> = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your full name (at least 2 characters)';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.physicalAddress.trim()) {
      newErrors.physicalAddress = 'Physical address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const updateField = (field: keyof PersonalInfoData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader title="Personal Information" showBack onBack={onBack} />

      <div className="px-4 pt-4 pb-32">
        {/* Role Badge */}
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
            {roleLabels[role]}
          </span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Personal Details</h1>
          <p className="text-gray-500 text-sm">
            Enter your personal information for verification
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Full Name */}
          <MobileCard className="p-4">
            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name *
            </Label>
            <Input
              id="fullName"
              placeholder="Enter your full legal name"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              className={errors.fullName ? 'border-red-500' : ''}
            />
            {errors.fullName && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.fullName}
              </p>
            )}
          </MobileCard>

          {/* Phone Number */}
          <MobileCard className="p-4">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number *
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-gray-100 rounded-lg border border-gray-200">
                <span className="text-gray-600 text-sm">+256</span>
              </div>
              <Input
                id="phone"
                placeholder="7XX XXX XXX"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={10}
                className={`flex-1 ${errors.phone ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.phone}
              </p>
            )}
          </MobileCard>

          {/* Email (Optional) */}
          <MobileCard className="p-4">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}
          </MobileCard>

          {/* Physical Address */}
          <MobileCard className="p-4">
            <Label htmlFor="address" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Physical Address *
            </Label>
            <Input
              id="address"
              placeholder="Street address, landmark, or description"
              value={formData.physicalAddress}
              onChange={(e) => updateField('physicalAddress', e.target.value)}
              className={errors.physicalAddress ? 'border-red-500' : ''}
            />
            {errors.physicalAddress && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.physicalAddress}
              </p>
            )}
          </MobileCard>

          {/* City and District */}
          <div className="grid grid-cols-2 gap-3">
            <MobileCard className="p-4">
              <Label htmlFor="city" className="text-sm font-medium text-gray-700 mb-2">
                City *
              </Label>
              <Input
                id="city"
                placeholder="e.g., Kampala"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && (
                <p className="text-red-500 text-xs mt-1">{errors.city}</p>
              )}
            </MobileCard>

            <MobileCard className="p-4">
              <Label htmlFor="district" className="text-sm font-medium text-gray-700 mb-2">
                District
              </Label>
              <Input
                id="district"
                placeholder="e.g., Central"
                value={formData.district}
                onChange={(e) => updateField('district', e.target.value)}
              />
            </MobileCard>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your phone number will be verified via OTP. Make sure you have access to this number.
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-md mx-auto">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 py-4"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700"
          >
            Continue
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

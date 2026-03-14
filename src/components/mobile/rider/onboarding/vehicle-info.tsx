'use client';

import { useState, useRef } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Car,
  Bike,
  Truck,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Camera,
  Upload,
  X,
} from 'lucide-react';

type RiderRole = 'SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' | 'DELIVERY_PERSONNEL';
type VehicleType = 'BODA' | 'CAR' | 'BICYCLE' | 'SCOOTER';

interface VehicleInfoScreenProps {
  role: RiderRole;
  onSubmit: (data: VehicleData) => void;
  onBack: () => void;
}

export interface VehicleData {
  vehicleType: VehicleType;
  make: string;
  model: string;
  year: string;
  color: string;
  plateNumber: string;
  registrationDocUrl: string | null;
  insuranceDocUrl: string | null;
}

const vehicleTypes = [
  { id: 'BODA' as VehicleType, label: 'Motorcycle', description: 'Boda boda / Motorcycle', icon: Bike },
  { id: 'CAR' as VehicleType, label: 'Car', description: 'Sedan, SUV, or similar', icon: Car },
  { id: 'BICYCLE' as VehicleType, label: 'Bicycle', description: 'Bicycle (delivery only)', icon: Bike },
  { id: 'SCOOTER' as VehicleType, label: 'Scooter', description: 'Motor scooter', icon: Truck },
];

export function VehicleInfoScreen({ role, onSubmit, onBack }: VehicleInfoScreenProps) {
  const [formData, setFormData] = useState<VehicleData>({
    vehicleType: role === 'SMART_BODA_RIDER' ? 'BODA' : role === 'SMART_CAR_DRIVER' ? 'CAR' : 'BODA',
    make: '',
    model: '',
    year: '',
    color: '',
    plateNumber: '',
    registrationDocUrl: null,
    insuranceDocUrl: null,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof VehicleData, string>>>({});

  const registrationInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);

  const getAllowedVehicleTypes = (): VehicleType[] => {
    switch (role) {
      case 'SMART_BODA_RIDER':
        return ['BODA'];
      case 'SMART_CAR_DRIVER':
        return ['CAR'];
      case 'DELIVERY_PERSONNEL':
        return ['BODA', 'BICYCLE', 'SCOOTER'];
      default:
        return ['BODA'];
    }
  };

  const allowedVehicleTypes = getAllowedVehicleTypes();

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VehicleData, string>> = {};

    if (!formData.make.trim()) {
      newErrors.make = 'Vehicle make is required';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Vehicle model is required';
    }

    if (!formData.year.trim()) {
      newErrors.year = 'Year is required';
    } else if (!/^\d{4}$/.test(formData.year) || parseInt(formData.year) < 1990 || parseInt(formData.year) > new Date().getFullYear() + 1) {
      newErrors.year = 'Please enter a valid year (1990 - present)';
    }

    if (!formData.color.trim()) {
      newErrors.color = 'Color is required';
    }

    if ((formData.vehicleType === 'BODA' || formData.vehicleType === 'CAR' || formData.vehicleType === 'SCOOTER') && !formData.plateNumber.trim()) {
      newErrors.plateNumber = 'Plate number is required for motorized vehicles';
    }

    if (!formData.registrationDocUrl) {
      newErrors.registrationDocUrl = 'Registration document is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const updateField = (field: keyof VehicleData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFileSelect = (docId: 'registrationDocUrl' | 'insuranceDocUrl') => {
    const inputRef = docId === 'registrationDocUrl' ? registrationInputRef : insuranceInputRef;
    if (inputRef && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (docId: 'registrationDocUrl' | 'insuranceDocUrl', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, [docId]: url }));
      if (errors[docId]) {
        setErrors(prev => ({ ...prev, [docId]: undefined }));
      }
    }
  };

  const handleRemove = (docId: 'registrationDocUrl' | 'insuranceDocUrl') => {
    setFormData(prev => ({ ...prev, [docId]: null }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader title="Vehicle Information" showBack onBack={onBack} />

      <div className="px-4 pt-4 pb-32">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vehicle Details</h1>
          <p className="text-gray-500 text-sm">
            Enter your vehicle information for verification
          </p>
        </div>

        {/* Vehicle Type Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">Vehicle Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {vehicleTypes
              .filter(vt => allowedVehicleTypes.includes(vt.id))
              .map((vt) => {
                const Icon = vt.icon;
                const isSelected = formData.vehicleType === vt.id;

                return (
                  <MobileCard
                    key={vt.id}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''
                    }`}
                    onClick={() => updateField('vehicleType', vt.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {vt.label}
                        </p>
                        <p className="text-xs text-gray-500">{vt.description}</p>
                      </div>
                    </div>
                  </MobileCard>
                );
              })}
          </div>
        </div>

        {/* Vehicle Details Form */}
        <div className="space-y-4">
          {/* Make and Model */}
          <div className="grid grid-cols-2 gap-3">
            <MobileCard className="p-4">
              <Label className="text-sm font-medium text-gray-700 mb-2">Make *</Label>
              <Input
                placeholder="e.g., Toyota"
                value={formData.make}
                onChange={(e) => updateField('make', e.target.value)}
                className={errors.make ? 'border-red-500' : ''}
              />
              {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make}</p>}
            </MobileCard>

            <MobileCard className="p-4">
              <Label className="text-sm font-medium text-gray-700 mb-2">Model *</Label>
              <Input
                placeholder="e.g., Corolla"
                value={formData.model}
                onChange={(e) => updateField('model', e.target.value)}
                className={errors.model ? 'border-red-500' : ''}
              />
              {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
            </MobileCard>
          </div>

          {/* Year and Color */}
          <div className="grid grid-cols-2 gap-3">
            <MobileCard className="p-4">
              <Label className="text-sm font-medium text-gray-700 mb-2">Year *</Label>
              <Input
                placeholder="e.g., 2020"
                value={formData.year}
                onChange={(e) => updateField('year', e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={4}
                className={errors.year ? 'border-red-500' : ''}
              />
              {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
            </MobileCard>

            <MobileCard className="p-4">
              <Label className="text-sm font-medium text-gray-700 mb-2">Color *</Label>
              <Input
                placeholder="e.g., White"
                value={formData.color}
                onChange={(e) => updateField('color', e.target.value)}
                className={errors.color ? 'border-red-500' : ''}
              />
              {errors.color && <p className="text-red-500 text-xs mt-1">{errors.color}</p>}
            </MobileCard>
          </div>

          {/* Plate Number */}
          {(formData.vehicleType === 'BODA' || formData.vehicleType === 'CAR' || formData.vehicleType === 'SCOOTER') && (
            <MobileCard className="p-4">
              <Label className="text-sm font-medium text-gray-700 mb-2">Plate Number *</Label>
              <Input
                placeholder="e.g., UAX 123A"
                value={formData.plateNumber}
                onChange={(e) => updateField('plateNumber', e.target.value.toUpperCase())}
                className={errors.plateNumber ? 'border-red-500' : ''}
              />
              {errors.plateNumber && <p className="text-red-500 text-xs mt-1">{errors.plateNumber}</p>}
            </MobileCard>
          )}

          {/* Document Uploads */}
          <div className="space-y-3">
            {/* Registration Document */}
            <MobileCard className="p-4">
              <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                Vehicle Registration *
              </Label>
              {formData.registrationDocUrl ? (
                <div className="relative">
                  <img
                    src={formData.registrationDocUrl}
                    alt="Registration"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemove('registrationDocUrl')}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <CheckCircle className="absolute bottom-2 right-2 h-5 w-5 text-emerald-500 bg-white rounded-full" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </button>
                  <button
                    onClick={() => handleFileSelect('registrationDocUrl')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </button>
                  <input
                    ref={registrationInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange('registrationDocUrl', e)}
                  />
                </div>
              )}
              {errors.registrationDocUrl && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.registrationDocUrl}
                </p>
              )}
            </MobileCard>

            {/* Insurance Document (Optional) */}
            <MobileCard className="p-4">
              <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                Insurance Document (Optional)
              </Label>
              {formData.insuranceDocUrl ? (
                <div className="relative">
                  <img
                    src={formData.insuranceDocUrl}
                    alt="Insurance"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemove('insuranceDocUrl')}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <CheckCircle className="absolute bottom-2 right-2 h-5 w-5 text-emerald-500 bg-white rounded-full" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </button>
                  <button
                    onClick={() => handleFileSelect('insuranceDocUrl')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </button>
                  <input
                    ref={insuranceInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange('insuranceDocUrl', e)}
                  />
                </div>
              )}
            </MobileCard>
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
            Submit Application
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

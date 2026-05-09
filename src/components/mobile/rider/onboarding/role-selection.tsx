'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { Button } from '@/components/ui/button';
import {
  Bike,
  Car,
  Package,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Shield,
  Clock,
  MapPin,
} from 'lucide-react';

type RiderRole = 'SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' | 'DELIVERY_PERSONNEL';

interface RoleSelectionScreenProps {
  onSelectRole: (role: RiderRole) => void;
  onBack?: () => void;
}

const roles = [
  {
    id: 'SMART_BODA_RIDER' as RiderRole,
    title: 'Smart Boda Rider',
    description: 'Motorcycle passenger transport',
    icon: Bike,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    capabilities: ['Passenger transport', 'Smart Courier'],
    restrictions: ['No food delivery', 'No Smart Grocery'],
  },
  {
    id: 'SMART_CAR_DRIVER' as RiderRole,
    title: 'Smart Car Driver',
    description: 'Car passenger transport',
    icon: Car,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    capabilities: ['Passenger transport', 'Smart Courier'],
    restrictions: ['No food delivery', 'No Smart Grocery'],
  },
  {
    id: 'DELIVERY_PERSONNEL' as RiderRole,
    title: 'Delivery Personnel',
    description: 'Specialized delivery rider',
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    capabilities: ['Food delivery', 'Smart Grocery', 'Smart Courier'],
    restrictions: ['No passenger transport'],
  },
];

export function RoleSelectionScreen({ onSelectRole, onBack }: RoleSelectionScreenProps) {
  const [selectedRole, setSelectedRole] = useState<RiderRole | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      onSelectRole(selectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader title="Choose Your Role" showBack onBack={onBack} />

      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Your Rider Role</h1>
          <p className="text-gray-500 text-sm">
            Choose carefully - you cannot change your role after registration
          </p>
        </div>

        {/* Important Notice */}
        <MobileCard className="p-4 mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 text-sm">Important</p>
              <p className="text-amber-700 text-xs mt-1">
                Your role determines which tasks you can receive. This choice is permanent and cannot be changed later.
              </p>
            </div>
          </div>
        </MobileCard>

        {/* Role Cards */}
        <div className="space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <MobileCard
                key={role.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'ring-2 ring-emerald-500 bg-emerald-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-14 h-14 ${role.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-7 w-7 ${role.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900">{role.title}</h3>
                      {isSelected && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{role.description}</p>

                    {/* Capabilities */}
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Can do:</p>
                      <div className="flex flex-wrap gap-1">
                        {role.capabilities.map((cap, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Restrictions */}
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Cannot do:</p>
                      <div className="flex flex-wrap gap-1">
                        {role.restrictions.map((res, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full"
                          >
                            {res}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>

        {/* Requirements Notice */}
        <MobileCard className="p-4 mt-6 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Requirements
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              Valid National ID
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              Driver's License (for passenger transport)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              Face photo for verification
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              Vehicle registration documents
            </li>
          </ul>
        </MobileCard>

        {/* Verification Process */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Verification Process</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">1</div>
              <span className="text-sm text-gray-700">Submit your application</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">2</div>
              <span className="text-sm text-gray-700">Admin contacts you for physical verification</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">3</div>
              <span className="text-sm text-gray-700">Documents and vehicle inspection</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">4</div>
              <span className="text-sm text-gray-700">Receive equipment (vest, helmet, box)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-600">✓</div>
              <span className="text-sm text-gray-700">Get approved and start earning!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-md mx-auto">
        <Button
          onClick={handleContinue}
          disabled={!selectedRole}
          className={`w-full py-6 text-lg font-bold ${
            selectedRole 
              ? 'bg-emerald-600 hover:bg-emerald-700' 
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

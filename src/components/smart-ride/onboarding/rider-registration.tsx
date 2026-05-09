'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Camera,
  FileText,
  Car,
  CheckCircle,
  XCircle,
  AlertCircle,
  Check,
  Loader2,
  ChevronRight,
  Phone,
  MapPin,
  User as UserIcon,
  Bike
} from 'lucide-react';
import { RiderRoleType, VehicleType, User } from '../types';

interface RiderRegistrationProps {
  riderRole: RiderRoleType;
  onBack: () => void;
  onComplete: (userData: Partial<User>) => void;
}

type RegistrationStep = 'personal' | 'documents' | 'vehicle' | 'review' | 'submitted';

const vehicleOptions: { type: VehicleType; label: string; icon: React.ReactNode }[] = [
  { type: 'BODA', label: 'Motorcycle (Boda)', icon: <Bike className="h-6 w-6" /> },
  { type: 'CAR', label: 'Car', icon: <Car className="h-6 w-6" /> },
  { type: 'BICYCLE', label: 'Bicycle', icon: <Bike className="h-6 w-6" /> },
  { type: 'SCOOTER', label: 'Scooter', icon: <Bike className="h-6 w-6" /> },
];

export function RiderRegistration({ riderRole, onBack, onComplete }: RiderRegistrationProps) {
  const [step, setStep] = useState<RegistrationStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
  
  // Personal info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  
  // Documents
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [nationalIdFront, setNationalIdFront] = useState<string | null>(null);
  const [nationalIdBack, setNationalIdBack] = useState<string | null>(null);
  const [driversLicense, setDriversLicense] = useState<string | null>(null);
  
  // Vehicle
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');

  const getStepProgress = () => {
    switch (step) {
      case 'personal': return 25;
      case 'documents': return 50;
      case 'vehicle': return 75;
      case 'review': return 90;
      case 'submitted': return 100;
      default: return 0;
    }
  };

  const getRoleLabel = () => {
    switch (riderRole) {
      case 'SMART_BODA': return 'Smart Boda Rider';
      case 'SMART_CAR': return 'Smart Car Driver';
      case 'DELIVERY_PERSONNEL': return 'Delivery Personnel';
      default: return 'Rider';
    }
  };

  const getRoleGradient = () => {
    switch (riderRole) {
      case 'SMART_BODA': return 'from-emerald-500 to-teal-600';
      case 'SMART_CAR': return 'from-blue-500 to-indigo-600';
      case 'DELIVERY_PERSONNEL': return 'from-orange-500 to-red-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const canProceedPersonal = fullName.length >= 2 && phone.length >= 9 && physicalAddress.length >= 5;
  
  const canProceedDocuments = facePhoto && nationalIdFront && nationalIdBack && 
    (riderRole !== 'SMART_BODA' && riderRole !== 'SMART_CAR' || driversLicense);
  
  const canProceedVehicle = vehicleType && vehiclePlate.length >= 3;

  const handleFileUpload = (setter: (value: string | null) => void) => {
    setter(`uploaded_${Date.now()}`);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setStep('submitted');
    
    setTimeout(() => {
      onComplete({
        name: fullName,
        phone,
        physicalAddress,
        riderRoleType: riderRole,
        verificationStatus: 'PENDING_APPROVAL',
        vehicleType: vehicleType || undefined,
        documents: {
          facePhoto: facePhoto || undefined,
          nationalIdFront: nationalIdFront || undefined,
          nationalIdBack: nationalIdBack || undefined,
          driversLicense: driversLicense || undefined,
        },
      });
    }, 2000);
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserIcon className="h-8 w-8 text-[#00FF88]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Personal Information</h2>
        <p className="text-gray-400 text-sm">Enter your details as they appear on your ID</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-[#00FF88] focus:ring-[#00FF88]/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
              +256
            </span>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="7XX XXX XXX"
              className="pl-16 h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-[#00FF88] focus:ring-[#00FF88]/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Physical Address *</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input
              value={physicalAddress}
              onChange={(e) => setPhysicalAddress(e.target.value)}
              placeholder="Enter your address"
              className="pl-12 h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-[#00FF88] focus:ring-[#00FF88]/20"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={() => setStep('documents')}
        disabled={!canProceedPersonal}
        className="w-full h-14 bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] rounded-xl font-semibold"
        style={{ boxShadow: '0 4px 20px rgba(0, 255, 136, 0.25)' }}
      >
        Continue
        <ChevronRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-[#00FF88]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Upload Documents</h2>
        <p className="text-gray-400 text-sm">We need to verify your identity</p>
      </div>

      <div className="space-y-3">
        {/* Document items */}
        {[
          { label: 'Face Photo', desc: 'Clear selfie with your face visible', value: facePhoto, setter: setFacePhoto, required: true },
          { label: 'National ID (Front)', desc: 'Clear photo of front side', value: nationalIdFront, setter: setNationalIdFront, required: true },
          { label: 'National ID (Back)', desc: 'Clear photo of back side', value: nationalIdBack, setter: setNationalIdBack, required: true },
          ...(riderRole === 'SMART_BODA' || riderRole === 'SMART_CAR' ? [{ label: "Driver's License", desc: 'Required for passenger transport', value: driversLicense, setter: setDriversLicense, required: true }] : []),
        ].map((doc, i) => (
          <Card key={i} className={cn(
            "border-2 bg-[#13131A]",
            doc.value ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    doc.value ? 'bg-emerald-500/20' : 'bg-white/5'
                  )}>
                    {doc.value ? (
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <Camera className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{doc.label} {doc.required && '*'}</p>
                    <p className="text-sm text-gray-500">{doc.desc}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload(doc.setter)}
                  className="shrink-0 bg-[#1A1A24] border-white/10 text-gray-300 hover:bg-[#1E1E28] hover:text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {doc.value ? 'Change' : 'Upload'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('personal')}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300 hover:bg-[#1E1E28] hover:text-white"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('vehicle')}
          disabled={!canProceedDocuments}
          className="flex-1 h-14 bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] rounded-xl font-semibold"
          style={{ boxShadow: '0 4px 20px rgba(0, 255, 136, 0.25)' }}
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderVehicleInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car className="h-8 w-8 text-[#00FF88]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Vehicle Information</h2>
        <p className="text-gray-400 text-sm">Tell us about your vehicle</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Type *</label>
          <div className="grid grid-cols-2 gap-3">
            {vehicleOptions.map((option) => (
              <Card
                key={option.type}
                className={cn(
                  "cursor-pointer border-2 transition-all bg-[#13131A]",
                  vehicleType === option.type
                    ? 'border-[#00FF88] bg-[#00FF88]/10'
                    : 'border-white/5 hover:border-white/10'
                )}
                onClick={() => setVehicleType(option.type)}
              >
                <CardContent className="p-4 flex flex-col items-center">
                  <div className={cn(
                    "mb-2",
                    vehicleType === option.type ? 'text-[#00FF88]' : 'text-gray-500'
                  )}>
                    {option.icon}
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    vehicleType === option.type ? 'text-white' : 'text-gray-400'
                  )}>
                    {option.label}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">License Plate Number *</label>
          <Input
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
            placeholder="e.g., UAJ 123A"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-[#00FF88]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
            <Input
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="e.g., Bajaj Boxer"
              className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
            <Input
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
              placeholder="e.g., Red"
              className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('documents')}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('review')}
          disabled={!canProceedVehicle}
          className="flex-1 h-14 bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] rounded-xl font-semibold"
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-[#00FF88]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Review Your Application</h2>
        <p className="text-gray-400 text-sm">Make sure everything is correct before submitting</p>
      </div>

      {/* Role Badge */}
      <Card className="bg-gradient-to-r text-white border-0" style={{ background: `linear-gradient(135deg, ${riderRole === 'SMART_BODA' ? '#00FF88, #00CC6E' : riderRole === 'SMART_CAR' ? '#00D4FF, #0088FF' : '#FF6B35, #FF3B5C'})` }}>
        <CardContent className="p-4 text-center">
          <p className="text-white/80 text-sm">Applying as</p>
          <p className="text-xl font-bold">{getRoleLabel()}</p>
        </CardContent>
      </Card>

      {/* Personal Info Summary */}
      <Card className="bg-[#13131A] border-white/5">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-3">Personal Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Full Name</span>
              <span className="font-medium text-white">{fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-white">+256 {phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Address</span>
              <span className="font-medium text-white">{physicalAddress}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Summary */}
      <Card className="bg-[#13131A] border-white/5">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-3">Documents Uploaded</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <span>Face Photo</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <span>National ID (Front & Back)</span>
            </div>
            {driversLicense && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span>Driver&apos;s License</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Summary */}
      <Card className="bg-[#13131A] border-white/5">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-3">Vehicle Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-white">{vehicleType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plate</span>
              <span className="font-medium text-white">{vehiclePlate}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Next */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200/70">
              <p className="font-medium text-amber-300 mb-1">What happens next?</p>
              <ul className="space-y-1">
                <li>• Your application will be reviewed</li>
                <li>• You&apos;ll be contacted for physical verification</li>
                <li>• Equipment issued after approval</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('vehicle')}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 h-14 bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] rounded-xl font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </Button>
      </div>
    </div>
  );

  const renderSubmitted = () => (
    <div className="text-center py-12">
      <div 
        className="w-20 h-20 bg-[#00FF88]/15 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)' }}
      >
        <CheckCircle className="h-10 w-10 text-[#00FF88]" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        Application Submitted!
      </h2>
      <p className="text-gray-400 text-sm">
        Your application is now pending approval. We&apos;ll contact you soon.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10 bg-[#0D0D12]">
        {step !== 'submitted' && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={step === 'personal' ? onBack : () => {
              if (step === 'documents') setStep('personal');
              else if (step === 'vehicle') setStep('documents');
              else if (step === 'review') setStep('vehicle');
            }}
            className="mr-2 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">
            {step === 'submitted' ? 'Application Status' : 'Rider Registration'}
          </h1>
          {step !== 'submitted' && (
            <Progress 
              value={getStepProgress()} 
              className="h-1.5 mt-2 bg-[#1A1A24]"
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pt-6">
        {step === 'personal' && renderPersonalInfo()}
        {step === 'documents' && renderDocuments()}
        {step === 'vehicle' && renderVehicleInfo()}
        {step === 'review' && renderReview()}
        {step === 'submitted' && renderSubmitted()}
      </div>
    </div>
  );
}

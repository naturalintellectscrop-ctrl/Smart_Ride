'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Upload,
  Camera,
  FileText,
  Heart,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  MapPin,
  Building2,
  Clock,
  Loader2,
  User,
  X
} from 'lucide-react';

interface HealthProviderRegistrationProps {
  onBack: () => void;
  onComplete: (userData: any) => void;
}

type RegistrationStep = 'business' | 'owner' | 'location' | 'services' | 'bank' | 'documents' | 'review' | 'submitted';

const providerTypes = [
  { type: 'PHARMACY', label: 'Pharmacy', description: 'Prescription & OTC medicines' },
  { type: 'CLINIC', label: 'Clinic', description: 'Medical consultations & treatment' },
  { type: 'HOSPITAL', label: 'Hospital', description: 'Full medical services' },
] as const;

export function HealthProviderRegistration({ onBack, onComplete }: HealthProviderRegistrationProps) {
  const [step, setStep] = useState<RegistrationStep>('business');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Business info
  const [businessName, setBusinessName] = useState('');
  const [providerType, setProviderType] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  
  // Owner info
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerNIN, setOwnerNIN] = useState('');
  
  // Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  
  // Services
  const [is24Hours, setIs24Hours] = useState(false);
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [supportsPrescription, setSupportsPrescription] = useState(true);
  const [supportsOTC, setSupportsOTC] = useState(true);
  const [supportsDelivery, setSupportsDelivery] = useState(true);
  const [supportsPickup, setSupportsPickup] = useState(true);
  
  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  
  // Documents
  const [licenseDoc, setLicenseDoc] = useState<string | null>(null);
  const [nationalIdFront, setNationalIdFront] = useState<string | null>(null);
  const [nationalIdBack, setNationalIdBack] = useState<string | null>(null);
  const [facilityPhoto, setFacilityPhoto] = useState<string | null>(null);

  const getStepProgress = () => {
    const steps: RegistrationStep[] = ['business', 'owner', 'location', 'services', 'bank', 'documents', 'review', 'submitted'];
    return ((steps.indexOf(step) + 1) / steps.length) * 100;
  };

  const canProceedBusiness = businessName.length >= 2 && providerType && licenseNumber.length >= 3;
  const canProceedOwner = ownerName.length >= 2 && ownerPhone.length >= 9;
  const canProceedLocation = address.length >= 5;
  const canProceedBank = bankName.length >= 2 && accountName.length >= 2 && accountNumber.length >= 5;
  const canProceedDocuments = licenseDoc && nationalIdFront && nationalIdBack;

  const handleFileUpload = (setter: (value: string | null) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setter(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/health-provider/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          providerType,
          licenseNumber,
          licenseDocumentUrl: licenseDoc,
          issuingAuthority,
          ownerFullName: ownerName,
          ownerPhone: `+256${ownerPhone}`,
          ownerEmail,
          ownerNIN,
          address,
          city,
          district,
          is24Hours,
          operatingHours: is24Hours ? null : JSON.stringify({ open: openingTime, close: closingTime }),
          supportsPrescription,
          supportsOTC,
          supportsDelivery,
          supportsPickup,
          bankName,
          bankAccountName: accountName,
          bankAccountNumber: accountNumber,
          mobileMoneyNumber,
          facilityPhotoUrl: facilityPhoto,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setStep('submitted');
      
      setTimeout(() => {
        onComplete({
          name: ownerName,
          phone: `+256${ownerPhone}`,
          email: ownerEmail,
          role: 'HEALTH_PROVIDER',
          providerId: data.provider?.id,
          verificationStatus: 'PENDING',
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    const steps: RegistrationStep[] = ['business', 'owner', 'location', 'services', 'bank', 'documents', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      onBack();
    }
  };

  const renderBusinessInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="h-8 w-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Facility Information</h2>
        <p className="text-gray-400 text-sm">Tell us about your healthcare facility</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Facility Name *</label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Enter facility name"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Facility Type *</label>
          <div className="space-y-2">
            {providerTypes.map((type) => (
              <Card
                key={type.type}
                className={cn(
                  "cursor-pointer border-2 transition-all bg-[#13131A]",
                  providerType === type.type
                    ? 'border-rose-400 bg-rose-400/10'
                    : 'border-white/5 hover:border-white/10'
                )}
                onClick={() => setProviderType(type.type)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                  {providerType === type.type && (
                    <CheckCircle className="h-5 w-5 text-rose-400" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">License Number *</label>
          <Input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="Enter facility license number"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Issuing Authority</label>
          <Input
            value={issuingAuthority}
            onChange={(e) => setIssuingAuthority(e.target.value)}
            placeholder="e.g., Uganda Pharmacy Board"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('owner')}
          disabled={!canProceedBusiness}
          className="flex-1 h-14 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold"
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderOwnerInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Owner Information</h2>
        <p className="text-gray-400 text-sm">Details of the facility owner/manager</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
          <Input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Enter full name"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">+256</span>
            <Input
              type="tel"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="7XX XXX XXX"
              className="pl-16 h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email (Optional)</label>
          <Input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@example.com"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">National ID Number (NIN)</label>
          <Input
            value={ownerNIN}
            onChange={(e) => setOwnerNIN(e.target.value.toUpperCase())}
            placeholder="Enter NIN"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400 uppercase"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('business')}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('location')}
          disabled={!canProceedOwner}
          className="flex-1 h-14 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold"
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="h-8 w-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Location</h2>
        <p className="text-gray-400 text-sm">Where is your facility located?</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Physical Address *</label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter street address"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Kampala"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">District</label>
          <Input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="e.g., Central"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('owner')}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('services')}
          disabled={!canProceedLocation}
          className="flex-1 h-14 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold"
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderServices = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Services & Hours</h2>
        <p className="text-gray-400 text-sm">What services do you offer?</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-[#13131A] rounded-xl border border-white/5">
          <div>
            <p className="font-medium text-white">24 Hours Service</p>
            <p className="text-sm text-gray-500">Open round the clock</p>
          </div>
          <Checkbox
            checked={is24Hours}
            onCheckedChange={(checked) => setIs24Hours(checked as boolean)}
            className="data-[state=checked]:bg-rose-500"
          />
        </div>

        {!is24Hours && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Opens</label>
              <Input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Closes</label>
              <Input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">Services Offered</p>
          
          {[
            { label: 'Prescription Medicines', checked: supportsPrescription, setter: setSupportsPrescription },
            { label: 'Over-the-Counter (OTC)', checked: supportsOTC, setter: setSupportsOTC },
            { label: 'Delivery Service', checked: supportsDelivery, setter: setSupportsDelivery },
            { label: 'Pickup Service', checked: supportsPickup, setter: setSupportsPickup },
          ].map((service, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-[#13131A] rounded-lg border border-white/5">
              <span className="text-white">{service.label}</span>
              <Checkbox
                checked={service.checked}
                onCheckedChange={(checked) => service.setter(checked as boolean)}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('location')}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('bank')}
          className="flex-1 h-14 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold"
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderBankDetails = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-8 w-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Payout Details</h2>
        <p className="text-gray-400 text-sm">Where should we send your earnings?</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Bank Name *</label>
          <Input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g., Stanbic Bank"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Account Name *</label>
          <Input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Account holder's name"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Account Number *</label>
          <Input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter account number"
            className="h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Mobile Money Number (Optional)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">+256</span>
            <Input
              type="tel"
              value={mobileMoneyNumber}
              onChange={(e) => setMobileMoneyNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="7XX XXX XXX"
              className="pl-16 h-14 bg-[#1A1A24] border-[#1A1A24] text-white placeholder:text-gray-500 focus:border-rose-400"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('services')}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('documents')}
          disabled={!canProceedBank}
          className="flex-1 h-14 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold"
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Upload Documents</h2>
        <p className="text-gray-400 text-sm">We need to verify your facility</p>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Health/Pharmacy License', desc: 'Valid operating license', value: licenseDoc, setter: setLicenseDoc, optional: false },
          { label: 'National ID (Front)', desc: 'Owner\'s ID front', value: nationalIdFront, setter: setNationalIdFront, optional: false },
          { label: 'National ID (Back)', desc: 'Owner\'s ID back', value: nationalIdBack, setter: setNationalIdBack, optional: false },
          { label: 'Facility Photo', desc: 'Optional - exterior photo', value: facilityPhoto, setter: setFacilityPhoto, optional: true },
        ].map((doc, i) => (
          <Card key={i} className={cn(
            "border-2 bg-[#13131A]",
            doc.value ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center overflow-hidden",
                    doc.value ? 'bg-emerald-500/20' : 'bg-white/5'
                  )}>
                    {doc.value ? (
                      <img src={doc.value} alt={doc.label} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{doc.label} {!doc.optional && '*'}</p>
                    <p className="text-sm text-gray-500">{doc.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {doc.value && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => doc.setter(null)}
                      className="shrink-0 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('bank')}
          className="flex-1 h-14 rounded-xl font-semibold bg-[#1A1A24] border-white/10 text-gray-300"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('review')}
          disabled={!canProceedDocuments}
          className="flex-1 h-14 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold"
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
        <div className="w-16 h-16 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Review Application</h2>
        <p className="text-gray-400 text-sm">Make sure everything is correct</p>
      </div>

      <Card className="bg-gradient-to-r text-white border-0" style={{ background: 'linear-gradient(135deg, #F43F5E, #EC4899)' }}>
        <CardContent className="p-4 text-center">
          <p className="text-white/80 text-sm">Registering as</p>
          <p className="text-xl font-bold">{businessName}</p>
          <p className="text-white/80 text-sm">{providerTypes.find(t => t.type === providerType)?.label}</p>
        </CardContent>
      </Card>

      <Card className="bg-[#13131A] border-white/5">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-3">Facility Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">License</span>
              <span className="font-medium text-white">{licenseNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Address</span>
              <span className="font-medium text-white">{address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hours</span>
              <span className="font-medium text-white">{is24Hours ? '24 Hours' : `${openingTime} - ${closingTime}`}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#13131A] border-white/5">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-3">Owner Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-white">{ownerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-white">+256 {ownerPhone}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200/70">
              <p className="font-medium text-amber-300 mb-1">What happens next?</p>
              <ul className="space-y-1">
                <li>• Your application will be reviewed</li>
                <li>• License will be verified with authorities</li>
                <li>• You can start serving patients once approved</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

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
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 h-14 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold"
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
        className="w-20 h-20 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ boxShadow: '0 0 30px rgba(244, 63, 94, 0.3)' }}
      >
        <CheckCircle className="h-10 w-10 text-rose-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        Application Submitted!
      </h2>
      <p className="text-gray-400 text-sm">
        Your health provider application is pending verification. We&apos;ll contact you soon.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      <div className="px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10 bg-[#0D0D12]">
        {step !== 'submitted' && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={goBack}
            className="mr-2 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">
            {step === 'submitted' ? 'Application Status' : 'Health Provider Registration'}
          </h1>
          {step !== 'submitted' && (
            <Progress 
              value={getStepProgress()} 
              className="h-1.5 mt-2 bg-[#1A1A24]"
            />
          )}
        </div>
      </div>

      <div className="px-6 pt-6">
        {step === 'business' && renderBusinessInfo()}
        {step === 'owner' && renderOwnerInfo()}
        {step === 'location' && renderLocation()}
        {step === 'services' && renderServices()}
        {step === 'bank' && renderBankDetails()}
        {step === 'documents' && renderDocuments()}
        {step === 'review' && renderReview()}
        {step === 'submitted' && renderSubmitted()}
      </div>
    </div>
  );
}

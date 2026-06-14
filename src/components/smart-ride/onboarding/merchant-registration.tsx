'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Upload,
  Camera,
  FileText,
  Store,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  MapPin,
  Building2,
  Clock,
  Loader2,
  X
} from 'lucide-react';

interface MerchantRegistrationProps {
  onBack: () => void;
  onComplete: (userData: any) => void;
}

type RegistrationStep = 'business' | 'documents' | 'bank' | 'review' | 'submitted';

const businessTypes = [
  { type: 'RESTAURANT', label: 'Restaurant', description: 'Food service establishment' },
  { type: 'SUPERMARKET', label: 'Supermarket', description: 'Grocery & household items' },
  { type: 'RETAIL_STORE', label: 'Retail Store', description: 'General merchandise' },
  { type: 'PHARMACY', label: 'Pharmacy', description: 'Medicines & health products' },
  { type: 'GROCERY', label: 'Grocery Store', description: 'Fresh produce & foods' },
] as const;

export function MerchantRegistration({ onBack, onComplete }: MerchantRegistrationProps) {
  const [step, setStep] = useState<RegistrationStep>('business');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Business info
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('22:00');
  
  // Documents
  const [businessLicense, setBusinessLicense] = useState<string | null>(null);
  const [nationalIdFront, setNationalIdFront] = useState<string | null>(null);
  const [nationalIdBack, setNationalIdBack] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  
  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const getStepProgress = () => {
    switch (step) {
      case 'business': return 25;
      case 'documents': return 50;
      case 'bank': return 75;
      case 'review': return 90;
      case 'submitted': return 100;
      default: return 0;
    }
  };

  const canProceedBusiness = businessName.length >= 2 && businessType && phone.length >= 9 && address.length >= 5;
  const canProceedDocuments = businessLicense && nationalIdFront && nationalIdBack;
  const canProceedBank = bankName.length >= 2 && accountName.length >= 2 && accountNumber.length >= 5;

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
      const response = await fetch('/api/merchants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName,
          type: businessType,
          phone: `+256${phone}`,
          email: email || null,
          address,
          city,
          openingTime,
          closingTime,
          bankName,
          bankAccountName: accountName,
          bankAccountNumber: accountNumber,
          documents: {
            businessLicense,
            nationalIdFront,
            nationalIdBack,
            logo,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.tokens?.accessToken) {
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setStep('submitted');
      
      setTimeout(() => {
        onComplete({
          id: data.user.id,
          name: data.user.name,
          phone: data.user.phone,
          email: data.user.email,
          role: 'MERCHANT',
          merchantId: data.merchant.id,
          verificationStatus: 'PENDING_APPROVAL',
        });
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderBusinessInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#98f6be]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Store className="h-8 w-8 text-[#005f3a]" />
        </div>
        <h2 className="text-xl font-bold text-[#191c1d] mb-2 font-[family-name:var(--font-plus-jakarta)]">Business Information</h2>
        <p className="text-[#3f4941] text-sm">Tell us about your business</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">Business Name *</label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Enter your business name"
            className="h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">Business Type *</label>
          <div className="grid grid-cols-1 gap-2">
            {businessTypes.map((type) => (
              <Card
                key={type.type}
                className={cn(
                  "cursor-pointer border-2 transition-all bg-white shadow-sm",
                  businessType === type.type
                    ? 'border-[#005f3a] bg-[#98f6be]/10'
                    : 'border-[#bec9bf]/30 hover:border-[#005f3a]/20'
                )}
                onClick={() => setBusinessType(type.type)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#191c1d]">{type.label}</p>
                    <p className="text-xs text-[#6f7a71]">{type.description}</p>
                  </div>
                  {businessType === type.type && (
                    <CheckCircle className="h-5 w-5 text-[#005f3a]" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">Phone Number *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6f7a71] font-medium text-sm">
              +256
            </span>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => {
                const raw = e.target.value;
                const digits = raw.replace(/\D/g, '').slice(0, 9);
                if (digits !== phone) {
                  setPhone(digits);
                }
              }}
              placeholder="7XX XXX XXX"
              className="pl-16 h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">Email (Optional)</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="business@example.com"
            className="h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">Physical Address *</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6f7a71]" />
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter business address"
              className="pl-12 h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">City</label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Kampala"
            className="h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#3f4941] mb-2">Opening Time</label>
            <Input
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#3f4941] mb-2">Closing Time</label>
            <Input
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <Button
        onClick={() => setStep('documents')}
        disabled={!canProceedBusiness}
        className="w-full h-14 bg-[#005f3a] text-white rounded-xl font-semibold hover:bg-[#0e7a4d] active:scale-95 transition-all"
      >
        Continue
        <ChevronRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#98f6be]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-[#005f3a]" />
        </div>
        <h2 className="text-xl font-bold text-[#191c1d] mb-2 font-[family-name:var(--font-plus-jakarta)]">Upload Documents</h2>
        <p className="text-[#3f4941] text-sm">We need to verify your business</p>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Business License', desc: 'Valid trading license', value: businessLicense, setter: setBusinessLicense },
          { label: 'National ID (Front)', desc: 'Owner\'s ID front side', value: nationalIdFront, setter: setNationalIdFront },
          { label: 'National ID (Back)', desc: 'Owner\'s ID back side', value: nationalIdBack, setter: setNationalIdBack },
        ].map((doc, i) => (
          <Card key={i} className={cn(
            "border-2 bg-white shadow-sm",
            doc.value ? 'border-[#005f3a]/30 bg-[#98f6be]/5' : 'border-[#bec9bf]/30'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center overflow-hidden",
                    doc.value ? 'bg-[#98f6be]/20' : 'bg-[#f3f4f5]'
                  )}>
                    {doc.value ? (
                      <img src={doc.value} alt={doc.label} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-[#6f7a71]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#191c1d]">{doc.label} *</p>
                    <p className="text-sm text-[#6f7a71]">{doc.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {doc.value && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => doc.setter(null)}
                      className="shrink-0 bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFileUpload(doc.setter)}
                    className="shrink-0 bg-white border border-[#bec9bf] text-[#3f4941] hover:bg-[#f3f4f5] hover:text-[#191c1d]"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {doc.value ? 'Change' : 'Upload'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className={cn(
          "border-2 bg-white shadow-sm",
          logo ? 'border-blue-500/30 bg-blue-50' : 'border-[#bec9bf]/30'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center overflow-hidden",
                  logo ? 'bg-blue-100' : 'bg-[#f3f4f5]'
                )}>
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-[#6f7a71]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-[#191c1d]">Business Logo</p>
                  <p className="text-sm text-[#6f7a71]">Optional - helps customers recognize you</p>
                </div>
              </div>
              <div className="flex gap-2">
                {logo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogo(null)}
                    className="shrink-0 bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload(setLogo)}
                  className="shrink-0 bg-white border border-[#bec9bf] text-[#3f4941] hover:bg-[#f3f4f5] hover:text-[#191c1d]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logo ? 'Change' : 'Upload'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('business')}
          className="flex-1 h-14 rounded-xl font-semibold bg-white border border-[#bec9bf] text-[#005f3a] hover:bg-[#f3f4f5]"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('bank')}
          disabled={!canProceedDocuments}
          className="flex-1 h-14 bg-[#005f3a] text-white rounded-xl font-semibold hover:bg-[#0e7a4d] active:scale-95 transition-all"
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
        <div className="w-16 h-16 bg-[#98f6be]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-8 w-8 text-[#005f3a]" />
        </div>
        <h2 className="text-xl font-bold text-[#191c1d] mb-2 font-[family-name:var(--font-plus-jakarta)]">Payout Details</h2>
        <p className="text-[#3f4941] text-sm">Where should we send your earnings?</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">Bank Name *</label>
          <Input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g., Stanbic Bank"
            className="h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">Account Name *</label>
          <Input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Account holder's name"
            className="h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#3f4941] mb-2">Account Number *</label>
          <Input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter account number"
            className="h-14 bg-[#f3f4f5] border border-[#bec9bf] rounded-xl text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#005f3a] focus:ring-1 focus:ring-[#005f3a]"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('documents')}
          className="flex-1 h-14 rounded-xl font-semibold bg-white border border-[#bec9bf] text-[#005f3a] hover:bg-[#f3f4f5]"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep('review')}
          disabled={!canProceedBank}
          className="flex-1 h-14 bg-[#005f3a] text-white rounded-xl font-semibold hover:bg-[#0e7a4d] active:scale-95 transition-all"
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
        <div className="w-16 h-16 bg-[#98f6be]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-[#005f3a]" />
        </div>
        <h2 className="text-xl font-bold text-[#191c1d] mb-2 font-[family-name:var(--font-plus-jakarta)]">Review Your Application</h2>
        <p className="text-[#3f4941] text-sm">Make sure everything is correct before submitting</p>
      </div>

      <Card className="bg-gradient-to-r text-white border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #005f3a, #0e7a4d)' }}>
        <CardContent className="p-4 text-center">
          <p className="text-white/80 text-sm">Registering as</p>
          <p className="text-xl font-bold">{businessName}</p>
          <p className="text-white/80 text-sm">{businessTypes.find(t => t.type === businessType)?.label}</p>
        </CardContent>
      </Card>

      <Card className="bg-white border border-[#bec9bf]/30 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-[#191c1d] mb-3">Business Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6f7a71]">Phone</span>
              <span className="font-medium text-[#191c1d]">+256 {phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a71]">Address</span>
              <span className="font-medium text-[#191c1d]">{address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a71]">City</span>
              <span className="font-medium text-[#191c1d]">{city || 'Not specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a71]">Hours</span>
              <span className="font-medium text-[#191c1d]">{openingTime} - {closingTime}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-[#bec9bf]/30 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-[#191c1d] mb-3">Documents Uploaded</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[#005f3a]">
              <CheckCircle className="h-4 w-4" />
              <span>Business License</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#005f3a]">
              <CheckCircle className="h-4 w-4" />
              <span>National ID (Front & Back)</span>
            </div>
            {logo && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <CheckCircle className="h-4 w-4" />
                <span>Business Logo</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-[#bec9bf]/30 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-[#191c1d] mb-3">Payout Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6f7a71]">Bank</span>
              <span className="font-medium text-[#191c1d]">{bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a71]">Account Name</span>
              <span className="font-medium text-[#191c1d]">{accountName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-600">
              <p className="font-medium text-amber-700 mb-1">What happens next?</p>
              <ul className="space-y-1">
                <li>• Your application will be reviewed</li>
                <li>• We may contact you for additional verification</li>
                <li>• You can start accepting orders once approved</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('bank')}
          className="flex-1 h-14 rounded-xl font-semibold bg-white border border-[#bec9bf] text-[#005f3a] hover:bg-[#f3f4f5]"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 h-14 bg-[#005f3a] text-white rounded-xl font-semibold hover:bg-[#0e7a4d] active:scale-95 transition-all"
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
        className="w-20 h-20 bg-[#98f6be]/20 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ boxShadow: '0 0 30px rgba(0, 95, 58, 0.15)' }}
      >
        <CheckCircle className="h-10 w-10 text-[#005f3a]" />
      </div>
      <h2 className="text-xl font-bold text-[#191c1d] mb-2 font-[family-name:var(--font-plus-jakarta)]">
        Application Submitted!
      </h2>
      <p className="text-[#3f4941] text-sm">
        Your merchant application is now pending approval. We&apos;ll contact you soon.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] max-w-md mx-auto">
      <div className="px-4 py-4 flex items-center border-b border-[#bec9bf]/30 sticky top-0 z-10 bg-white">
        {step !== 'submitted' && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={step === 'business' ? onBack : () => {
              if (step === 'documents') setStep('business');
              else if (step === 'bank') setStep('documents');
              else if (step === 'review') setStep('bank');
            }}
            className="mr-2 text-[#6f7a71] hover:text-[#191c1d] hover:bg-[#f3f4f5]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#191c1d] font-[family-name:var(--font-plus-jakarta)]">
            {step === 'submitted' ? 'Application Status' : 'Merchant Registration'}
          </h1>
          {step !== 'submitted' && (
            <Progress 
              value={getStepProgress()} 
              className="h-1.5 mt-2 bg-[#f3f4f5]"
            />
          )}
        </div>
      </div>

      <div className="px-6 pt-6">
        {step === 'business' && renderBusinessInfo()}
        {step === 'documents' && renderDocuments()}
        {step === 'bank' && renderBankDetails()}
        {step === 'review' && renderReview()}
        {step === 'submitted' && renderSubmitted()}
      </div>
    </div>
  );
}

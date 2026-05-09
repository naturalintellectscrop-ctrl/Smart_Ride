'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileText,
  MapPin,
  Phone,
  Mail,
  User,
  Clock,
  Camera,
  Upload,
  Check,
  AlertCircle,
  Building,
  Stethoscope,
  Pill,
  Heart,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderRegistrationScreenProps {
  onBack?: () => void;
  onComplete: (status: string, providerId: string) => void;
}

type Step = 'type' | 'business' | 'owner' | 'license' | 'location' | 'hours' | 'documents' | 'bank' | 'review';

const providerTypes = [
  { id: 'PHARMACY', label: 'Pharmacy', icon: Pill, description: 'Licensed pharmacy with prescription services' },
  { id: 'DRUG_SHOP', label: 'Drug Shop', icon: Building, description: 'Licensed drug shop for OTC medicines' },
  { id: 'CLINIC', label: 'Clinic', icon: Stethoscope, description: 'Medical clinic offering treatment services' },
  { id: 'PRIVATE_DOCTOR', label: 'Private Doctor', icon: Heart, description: 'Private practicing physician' },
];

export function ProviderRegistrationScreen({ onBack, onComplete }: ProviderRegistrationScreenProps) {
  const [step, setStep] = useState<Step>('type');
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Type
    providerType: '',
    
    // Business Info
    businessName: '',
    description: '',
    
    // Owner Info
    ownerFullName: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerNIN: '',
    
    // License Info
    licenseNumber: '',
    issuingAuthority: '',
    licenseExpiryDate: '',
    licenseDocumentUrl: '',
    
    // Location
    address: '',
    city: '',
    district: '',
    latitude: null as number | null,
    longitude: null as number | null,
    serviceRadius: 10,
    
    // Hours
    operatingHours: {
      monday: { open: '08:00', close: '20:00', closed: false },
      tuesday: { open: '08:00', close: '20:00', closed: false },
      wednesday: { open: '08:00', close: '20:00', closed: false },
      thursday: { open: '08:00', close: '20:00', closed: false },
      friday: { open: '08:00', close: '20:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true },
    },
    is24Hours: false,
    
    // Capabilities
    supportsPrescription: true,
    supportsOTC: true,
    supportsDelivery: true,
    supportsPickup: true,
    offersConsultation: false,
    
    // Documents
    facilityPhotoUrl: '',
    interiorPhotoUrl: '',
    additionalDocuments: [] as string[],
    
    // Bank Details
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    mobileMoneyNumber: '',
    mobileMoneyProvider: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    const steps: Step[] = ['type', 'business', 'owner', 'license', 'location', 'hours', 'documents', 'bank', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['type', 'business', 'owner', 'license', 'location', 'hours', 'documents', 'bank', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health-provider/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_demo_001', // In real app, get from auth
          ...formData,
          operatingHours: JSON.stringify(formData.operatingHours),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        onComplete('PENDING', result.provider.id);
      } else {
        alert(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = ['type', 'business', 'owner', 'license', 'location', 'hours', 'documents', 'bank', 'review'];
    const currentIndex = steps.indexOf(step);
    
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-b">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i < currentIndex ? 'bg-emerald-500' :
                i === currentIndex ? 'bg-emerald-600' : 'bg-gray-300'
              )}
            />
            {i < steps.length - 1 && (
              <div className={cn(
                'w-4 h-0.5 mx-0.5',
                i < currentIndex ? 'bg-emerald-500' : 'bg-gray-200'
              )} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Step 1: Provider Type Selection
  if (step === 'type') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="Register as Provider" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Select Provider Type</h2>
          <p className="text-gray-500 text-sm mb-6">What type of health provider are you?</p>
          
          <div className="space-y-3">
            {providerTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  updateFormData('providerType', type.id);
                }}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all',
                  formData.providerType === type.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    formData.providerType === type.id ? 'bg-emerald-100' : 'bg-gray-100'
                  )}>
                    <type.icon className={cn(
                      'h-6 w-6',
                      formData.providerType === type.id ? 'text-emerald-600' : 'text-gray-500'
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                  {formData.providerType === type.id && (
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <button
            onClick={handleNext}
            disabled={!formData.providerType}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Business Information
  if (step === 'business') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="Business Information" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Tell us about your business</h2>
          
          <div className="space-y-4">
            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business / Facility Name *
              </label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => updateFormData('businessName', e.target.value)}
                  placeholder="e.g., Kampala Central Pharmacy"
                  className="flex-1 bg-transparent outline-none text-gray-900"
                />
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Brief description of your services..."
                rows={3}
                className="w-full bg-gray-50 rounded-xl p-3 outline-none resize-none text-gray-900"
              />
            </MobileCard>

            <MobileCard className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Services Offered</h3>
              <div className="space-y-2">
                {[
                  { key: 'supportsPrescription', label: 'Prescription Medicines' },
                  { key: 'supportsOTC', label: 'Over-the-Counter Medicines' },
                  { key: 'supportsDelivery', label: 'Delivery Service' },
                  { key: 'supportsPickup', label: 'Pickup Service' },
                  { key: 'offersConsultation', label: 'Medical Consultation' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between p-2">
                    <span className="text-gray-700">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={formData[item.key as keyof typeof formData] as boolean}
                      onChange={(e) => updateFormData(item.key, e.target.checked)}
                      className="w-5 h-5 rounded text-emerald-600"
                    />
                  </label>
                ))}
              </div>
            </MobileCard>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-xl font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!formData.businessName}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Owner Information
  if (step === 'owner') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="Owner Information" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Owner / Manager Details</h2>
          
          <div className="space-y-4">
            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <User className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.ownerFullName}
                  onChange={(e) => updateFormData('ownerFullName', e.target.value)}
                  placeholder="Full legal name"
                  className="flex-1 bg-transparent outline-none text-gray-900"
                />
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.ownerPhone}
                  onChange={(e) => updateFormData('ownerPhone', e.target.value)}
                  placeholder="+256 700 000 000"
                  className="flex-1 bg-transparent outline-none text-gray-900"
                />
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => updateFormData('ownerEmail', e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 bg-transparent outline-none text-gray-900"
                />
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                National ID Number (NIN)
              </label>
              <input
                type="text"
                value={formData.ownerNIN}
                onChange={(e) => updateFormData('ownerNIN', e.target.value)}
                placeholder="CM123456789ABCD"
                className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
              />
            </MobileCard>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-xl font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!formData.ownerFullName || !formData.ownerPhone}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 4: License Information
  if (step === 'license') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="License Information" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Professional License</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your license details for verification</p>
          
          <div className="space-y-4">
            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License / Certificate Number *
              </label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                  placeholder="e.g., NDA/PHM/2024/00001"
                  className="flex-1 bg-transparent outline-none text-gray-900"
                />
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issuing Authority *
              </label>
              <select
                value={formData.issuingAuthority}
                onChange={(e) => updateFormData('issuingAuthority', e.target.value)}
                className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
              >
                <option value="">Select authority</option>
                <option value="NDA">National Drug Authority (NDA)</option>
                <option value="UMC">Uganda Medical Council</option>
                <option value="UNMC">Uganda Nurses and Midwives Council</option>
                <option value="AHPC">Allied Health Professionals Council</option>
                <option value="OTHER">Other</option>
              </select>
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Expiry Date
              </label>
              <input
                type="date"
                value={formData.licenseExpiryDate}
                onChange={(e) => updateFormData('licenseExpiryDate', e.target.value)}
                className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
              />
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Document
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                {formData.licenseDocumentUrl ? (
                  <div className="flex items-center gap-3 justify-center">
                    <Check className="h-5 w-5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Document uploaded</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Tap to upload license document</p>
                    <p className="text-gray-400 text-xs mt-1">PDF, JPG, PNG (max 5MB)</p>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    // Handle file upload
                    if (e.target.files?.[0]) {
                      updateFormData('licenseDocumentUrl', 'mock_url');
                    }
                  }}
                />
              </div>
            </MobileCard>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Verification Required</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Your license will be verified by our admin team before you can start operating.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-xl font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!formData.licenseNumber || !formData.issuingAuthority}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 5: Location
  if (step === 'location') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="Location" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Business Location</h2>
          <p className="text-gray-500 text-sm mb-6">Where is your business located?</p>
          
          <div className="space-y-4">
            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  placeholder="Street address"
                  className="flex-1 bg-transparent outline-none text-gray-900"
                />
              </div>
            </MobileCard>

            <div className="grid grid-cols-2 gap-3">
              <MobileCard className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  placeholder="City"
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                />
              </MobileCard>

              <MobileCard className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                <select
                  value={formData.district}
                  onChange={(e) => updateFormData('district', e.target.value)}
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                >
                  <option value="">Select</option>
                  <option value="KAMPALA">Kampala</option>
                  <option value="WAKISO">Wakiso</option>
                  <option value="MUKONO">Mukono</option>
                  <option value="MBARARA">Mbarara</option>
                  <option value="GULU">Gulu</option>
                  <option value="JINJA">Jinja</option>
                </select>
              </MobileCard>
            </div>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Radius (km)
              </label>
              <input
                type="number"
                value={formData.serviceRadius}
                onChange={(e) => updateFormData('serviceRadius', parseInt(e.target.value))}
                min={1}
                max={50}
                className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum distance for delivery orders</p>
            </MobileCard>

            <button className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5" />
              Use Current Location
            </button>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-xl font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!formData.address}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 6: Operating Hours
  if (step === 'hours') {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="Operating Hours" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Business Hours</h2>
              <p className="text-gray-500 text-sm">When are you open?</p>
            </div>
            <label className="flex items-center gap-2">
              <span className="text-sm text-gray-600">24/7</span>
              <input
                type="checkbox"
                checked={formData.is24Hours}
                onChange={(e) => updateFormData('is24Hours', e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600"
              />
            </label>
          </div>
          
          {!formData.is24Hours && (
            <div className="space-y-3">
              {days.map((day) => (
                <MobileCard key={day} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!formData.operatingHours[day].closed}
                        onChange={(e) => {
                          const newHours = { ...formData.operatingHours };
                          newHours[day] = { ...newHours[day], closed: !e.target.checked };
                          updateFormData('operatingHours', newHours);
                        }}
                        className="w-5 h-5 rounded text-emerald-600"
                      />
                      <span className="font-medium text-gray-900 capitalize">{day}</span>
                    </div>
                    
                    {!formData.operatingHours[day].closed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={formData.operatingHours[day].open}
                          onChange={(e) => {
                            const newHours = { ...formData.operatingHours };
                            newHours[day] = { ...newHours[day], open: e.target.value };
                            updateFormData('operatingHours', newHours);
                          }}
                          className="bg-gray-50 rounded-lg px-2 py-1 text-sm outline-none"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="time"
                          value={formData.operatingHours[day].close}
                          onChange={(e) => {
                            const newHours = { ...formData.operatingHours };
                            newHours[day] = { ...newHours[day], close: e.target.value };
                            updateFormData('operatingHours', newHours);
                          }}
                          className="bg-gray-50 rounded-lg px-2 py-1 text-sm outline-none"
                        />
                      </div>
                    )}
                    
                    {formData.operatingHours[day].closed && (
                      <span className="text-gray-400 text-sm">Closed</span>
                    )}
                  </div>
                </MobileCard>
              ))}
            </div>
          )}
          
          {formData.is24Hours && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <Clock className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-emerald-800 font-medium">Open 24 hours, 7 days a week</p>
            </div>
          )}
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-xl font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 7: Documents
  if (step === 'documents') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="Documents & Photos" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Documents</h2>
          <p className="text-gray-500 text-sm mb-6">Help us verify your business</p>
          
          <div className="space-y-4">
            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Facility Photo (External)
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center relative">
                {formData.facilityPhotoUrl ? (
                  <div className="flex items-center gap-3 justify-center">
                    <Check className="h-5 w-5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Photo uploaded</span>
                  </div>
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Photo showing business location</p>
                    <p className="text-gray-400 text-xs mt-1">Clear photo of facility exterior</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      updateFormData('facilityPhotoUrl', 'mock_facility_photo_url');
                    }
                  }}
                />
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Interior Photo
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center relative">
                {formData.interiorPhotoUrl ? (
                  <div className="flex items-center gap-3 justify-center">
                    <Check className="h-5 w-5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Photo uploaded</span>
                  </div>
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Photo of inside your facility</p>
                    <p className="text-gray-400 text-xs mt-1">Shows your workspace setup</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      updateFormData('interiorPhotoUrl', 'mock_interior_photo_url');
                    }
                  }}
                />
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Additional Documents (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center relative">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">Upload additional documents</p>
                <p className="text-gray-400 text-xs mt-1">Permits, registrations, certificates</p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </MobileCard>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-xl font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 8: Bank Details
  if (step === 'bank') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="Payout Details" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Details</h2>
          <p className="text-gray-500 text-sm mb-6">How would you like to receive payouts?</p>
          
          <div className="space-y-4">
            <MobileCard className="p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-500" />
                Bank Account
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => updateFormData('bankName', e.target.value)}
                  placeholder="Bank Name"
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                />
                <input
                  type="text"
                  value={formData.bankAccountName}
                  onChange={(e) => updateFormData('bankAccountName', e.target.value)}
                  placeholder="Account Name"
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                />
                <input
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => updateFormData('bankAccountNumber', e.target.value)}
                  placeholder="Account Number"
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                />
              </div>
            </MobileCard>

            <div className="text-center text-gray-400 text-sm">OR</div>

            <MobileCard className="p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-500" />
                Mobile Money
              </h3>
              <div className="space-y-3">
                <select
                  value={formData.mobileMoneyProvider}
                  onChange={(e) => updateFormData('mobileMoneyProvider', e.target.value)}
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                >
                  <option value="">Select Provider</option>
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="AIRTEL">Airtel Money</option>
                </select>
                <input
                  type="tel"
                  value={formData.mobileMoneyNumber}
                  onChange={(e) => updateFormData('mobileMoneyNumber', e.target.value)}
                  placeholder="Mobile Money Number"
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                />
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Emergency Contact</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => updateFormData('emergencyContactName', e.target.value)}
                  placeholder="Contact Name"
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                />
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateFormData('emergencyContactPhone', e.target.value)}
                  placeholder="Contact Phone"
                  className="w-full bg-gray-50 rounded-xl p-3 outline-none text-gray-900"
                />
              </div>
            </MobileCard>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-xl font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!formData.bankName && !formData.mobileMoneyNumber}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 9: Review
  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader title="Review Application" showBack onBack={handleBack} />
        {renderStepIndicator()}
        
        <div className="px-4 pt-6 pb-24">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Review Your Application</h2>
          <p className="text-gray-500 text-sm mb-6">Make sure all information is correct before submitting</p>
          
          <div className="space-y-4">
            <MobileCard className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Provider Type</h3>
              <p className="text-gray-700">{providerTypes.find(t => t.id === formData.providerType)?.label}</p>
            </MobileCard>

            <MobileCard className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Business Info</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Name:</span> {formData.businessName}</p>
                <p><span className="text-gray-500">License:</span> {formData.licenseNumber}</p>
                <p><span className="text-gray-500">Authority:</span> {formData.issuingAuthority}</p>
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Owner Info</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Name:</span> {formData.ownerFullName}</p>
                <p><span className="text-gray-500">Phone:</span> {formData.ownerPhone}</p>
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
              <div className="space-y-2 text-sm">
                <p>{formData.address}</p>
                <p>{formData.city}, {formData.district}</p>
                <p><span className="text-gray-500">Delivery Radius:</span> {formData.serviceRadius} km</p>
              </div>
            </MobileCard>

            <MobileCard className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Services</h3>
              <div className="flex flex-wrap gap-2">
                {formData.supportsPrescription && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">Prescription</span>
                )}
                {formData.supportsOTC && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">OTC Medicines</span>
                )}
                {formData.supportsDelivery && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Delivery</span>
                )}
                {formData.supportsPickup && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">Pickup</span>
                )}
              </div>
            </MobileCard>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
            <p className="text-sm text-blue-800">
              By submitting, you agree to our Terms of Service and confirm that all information provided is accurate.
            </p>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-xl font-medium"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

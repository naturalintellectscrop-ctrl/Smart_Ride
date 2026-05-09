'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bike, 
  Car, 
  Package, 
  Store, 
  Heart, 
  Building,
  Upload,
  FileText,
  CheckCircle,
  X,
  Plus,
  Loader2,
  AlertCircle
} from 'lucide-react';

type UserType = 'rider' | 'merchant' | 'pharmacy' | 'health_provider';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: UserType;
  onSuccess?: (data: Record<string, unknown>) => void;
}

interface DocumentUpload {
  name: string;
  required: boolean;
  file: File | null;
  uploaded: boolean;
}

interface RequiredFieldConfig {
  basic: string[];
  vehicle: string[];
  banking: string[];
}

// Define required fields for each user type
const REQUIRED_FIELDS: Record<UserType, RequiredFieldConfig> = {
  rider: {
    basic: ['fullName', 'phone', 'role', 'address'],
    vehicle: ['vehicleType', 'plateNumber', 'vehicleColor'],
    banking: ['bankName', 'accountName', 'accountNumber'],
  },
  merchant: {
    basic: ['businessName', 'businessType', 'phone', 'email', 'address', 'city'],
    vehicle: [],
    banking: ['bankName', 'accountName', 'accountNumber'],
  },
  pharmacy: {
    basic: ['businessName', 'providerType', 'licenseNumber', 'issuingAuthority', 'ownerName', 'ownerPhone', 'address'],
    vehicle: [],
    banking: ['bankName', 'accountName', 'accountNumber'],
  },
  health_provider: {
    basic: ['businessName', 'providerType', 'licenseNumber', 'issuingAuthority', 'ownerName', 'ownerPhone', 'address'],
    vehicle: [],
    banking: ['bankName', 'accountName', 'accountNumber'],
  },
};

export function AddUserDialog({ open, onOpenChange, userType, onSuccess }: AddUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Set required documents based on user type
  useEffect(() => {
    if (userType === 'pharmacy' || userType === 'health_provider') {
      setDocuments([
        { name: 'Business License', required: true, file: null, uploaded: false },
        { name: 'NDA Certificate', required: true, file: null, uploaded: false },
        { name: 'National ID (Owner)', required: true, file: null, uploaded: false },
        { name: 'Pharmacist License', required: userType === 'pharmacy', file: null, uploaded: false },
        { name: 'Facility Photo', required: false, file: null, uploaded: false },
        { name: 'Interior Photo', required: false, file: null, uploaded: false },
      ]);
    } else if (userType === 'rider') {
      setDocuments([
        { name: 'National ID (Front)', required: true, file: null, uploaded: false },
        { name: 'National ID (Back)', required: true, file: null, uploaded: false },
        { name: 'Driver License', required: true, file: null, uploaded: false },
        { name: 'Face Photo', required: true, file: null, uploaded: false },
        { name: 'Vehicle Registration', required: false, file: null, uploaded: false },
      ]);
    } else {
      setDocuments([
        { name: 'Business License', required: true, file: null, uploaded: false },
        { name: 'National ID (Owner)', required: true, file: null, uploaded: false },
        { name: 'Logo Image', required: false, file: null, uploaded: false },
        { name: 'Cover Image', required: false, file: null, uploaded: false },
      ]);
    }
  }, [userType]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({});
      setTouched({});
      setActiveTab('basic');
    }
  }, [open]);

  const getUserTypeConfig = () => {
    switch (userType) {
      case 'rider':
        return {
          title: 'Add New Rider',
          description: 'Register a new rider/driver on the platform',
          icon: <Bike className="h-5 w-5" />,
          color: 'text-emerald-600',
        };
      case 'merchant':
        return {
          title: 'Add New Merchant',
          description: 'Register a new restaurant or shop partner',
          icon: <Store className="h-5 w-5" />,
          color: 'text-orange-600',
        };
      case 'pharmacy':
        return {
          title: 'Add New Pharmacy',
          description: 'Register a new pharmacy partner',
          icon: <Heart className="h-5 w-5" />,
          color: 'text-rose-600',
        };
      case 'health_provider':
        return {
          title: 'Add Health Provider',
          description: 'Register a new health service provider',
          icon: <Building className="h-5 w-5" />,
          color: 'text-blue-600',
        };
    }
  };

  const config = getUserTypeConfig();
  const requiredConfig = REQUIRED_FIELDS[userType];

  // Check if a field is required
  const isFieldRequired = (field: string): boolean => {
    return (
      requiredConfig.basic.includes(field) ||
      requiredConfig.vehicle.includes(field) ||
      requiredConfig.banking.includes(field)
    );
  };

  // Check if a field has an error (touched and empty)
  const hasError = (field: string): boolean => {
    return touched[field] && !formData[field]?.trim();
  };

  // Validate a section
  const validateSection = (section: 'basic' | 'vehicle' | 'banking'): { valid: boolean; missing: string[] } => {
    const fields = requiredConfig[section];
    const missing = fields.filter(field => !formData[field]?.trim());
    return { valid: missing.length === 0, missing };
  };

  // Check if all required documents are uploaded
  const documentsValid = useMemo(() => {
    return documents.filter(d => d.required).every(d => d.uploaded);
  }, [documents]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const basicValid = validateSection('basic').valid;
    const vehicleValid = userType === 'rider' ? validateSection('vehicle').valid : true;
    const bankingValid = validateSection('banking').valid;
    return basicValid && vehicleValid && bankingValid && documentsValid;
  }, [formData, documents, documentsValid, userType]);

  // Get missing items count for badge
  const getMissingCount = (section: 'basic' | 'vehicle' | 'banking'): number => {
    return validateSection(section).missing.length;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleDocumentUpload = (index: number, file: File) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, file, uploaded: true } : doc
    ));
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, file: null, uploaded: false } : doc
    ));
  };

  const handleSubmit = async () => {
    // Touch all fields to show validation errors
    const allFields = [...requiredConfig.basic, ...requiredConfig.vehicle, ...requiredConfig.banking];
    const allTouched: Record<string, boolean> = {};
    allFields.forEach(field => allTouched[field] = true);
    setTouched(allTouched);

    // Validate all sections
    if (!isFormValid) {
      // Find first invalid section and switch to it
      if (!validateSection('basic').valid) {
        setActiveTab('basic');
      } else if (userType === 'rider' && !validateSection('vehicle').valid) {
        setActiveTab('vehicle');
      } else if (!documentsValid) {
        setActiveTab('documents');
      } else if (!validateSection('banking').valid) {
        setActiveTab('banking');
      }
      return;
    }

    setLoading(true);
    
    try {
      // First, upload all documents
      const uploadedDocs: Record<string, string> = {};
      
      for (const doc of documents) {
        if (doc.file) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', doc.file);
          uploadFormData.append('type', userType);
          uploadFormData.append('documentType', doc.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          });
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedDocs[doc.name] = uploadData.url;
          }
        }
      }

      // Prepare data for API based on user type
      let endpoint = '/api/users';
      let payload: Record<string, unknown> = { ...formData };

      if (userType === 'rider') {
        endpoint = '/api/riders';
        payload = {
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email || null,
          physicalAddress: formData.address,
          riderRole: formData.role,
          vehicleType: formData.vehicleType,
          vehicleMake: formData.vehicleMake,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
          vehicleColor: formData.vehicleColor,
          vehiclePlateNumber: formData.plateNumber,
          facePhotoUrl: uploadedDocs['Face Photo'] || null,
          nationalIdFrontUrl: uploadedDocs['National ID (Front)'] || null,
          nationalIdBackUrl: uploadedDocs['National ID (Back)'] || null,
          driverLicenseUrl: uploadedDocs['Driver License'] || null,
        };
      } else if (userType === 'merchant') {
        endpoint = '/api/merchants';
        payload = {
          name: formData.businessName,
          type: formData.businessType,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          openingTime: formData.openingTime,
          closingTime: formData.closingTime,
          businessLicenseUrl: uploadedDocs['Business License'] || null,
          logoUrl: uploadedDocs['Logo Image'] || null,
          coverImageUrl: uploadedDocs['Cover Image'] || null,
          bankName: formData.bankName,
          bankAccountName: formData.accountName,
          bankAccountNumber: formData.accountNumber,
        };
      } else if (userType === 'pharmacy' || userType === 'health_provider') {
        endpoint = '/api/health-provider/register';
        payload = {
          businessName: formData.businessName,
          providerType: formData.providerType,
          licenseNumber: formData.licenseNumber,
          issuingAuthority: formData.issuingAuthority,
          ownerFullName: formData.ownerName,
          ownerPhone: formData.ownerPhone,
          ownerEmail: formData.ownerEmail || null,
          ownerNIN: formData.ownerNIN || null,
          address: formData.address,
          district: formData.district || null,
          licenseDocumentUrl: uploadedDocs['Business License'] || null,
          ndaCertificateUrl: uploadedDocs['NDA Certificate'] || null,
          ownerNationalIdUrl: uploadedDocs['National ID (Owner)'] || null,
          pharmacistLicenseUrl: uploadedDocs['Pharmacist License'] || null,
          facilityPhotoUrl: uploadedDocs['Facility Photo'] || null,
          interiorPhotoUrl: uploadedDocs['Interior Photo'] || null,
          bankName: formData.bankName,
          bankAccountName: formData.accountName,
          bankAccountNumber: formData.accountNumber,
          mobileMoneyNumber: formData.mobileMoney || null,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        onSuccess?.(data);
        onOpenChange(false);
        resetForm();
      } else {
        console.error('API error:', data);
        alert(data.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({});
    setTouched({});
    setDocuments(prev => prev.map(d => ({ ...d, file: null, uploaded: false })));
    setActiveTab('basic');
  };

  // Field wrapper component with error display
  const FieldWrapper = ({ field, label, children }: { field: string; label: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <Label htmlFor={field} className={hasError(field) ? 'text-red-500' : ''}>
        {label} {isFieldRequired(field) && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {hasError(field) && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          This field is required
        </p>
      )}
    </div>
  );

  const renderBasicInfo = () => (
    <div className="space-y-4">
      {/* Rider-specific fields */}
      {userType === 'rider' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper field="fullName" label="Full Name">
              <Input 
                id="fullName" 
                placeholder="Enter full name"
                value={formData.fullName || ''}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                onBlur={() => handleBlur('fullName')}
                className={hasError('fullName') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
            <FieldWrapper field="phone" label="Phone Number">
              <Input 
                id="phone" 
                type="tel" 
                placeholder="+256 7XX XXX XXX"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                className={hasError('phone') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="email@example.com"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <FieldWrapper field="role" label="Rider Role">
              <Select value={formData.role || ''} onValueChange={(v) => handleInputChange('role', v)}>
                <SelectTrigger className={hasError('role') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMART_BODA_RIDER">
                    <div className="flex items-center gap-2">
                      <Bike className="h-4 w-4" />
                      Smart Boda Rider
                    </div>
                  </SelectItem>
                  <SelectItem value="SMART_CAR_DRIVER">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Smart Car Driver
                    </div>
                  </SelectItem>
                  <SelectItem value="DELIVERY_PERSONNEL">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Delivery Personnel
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FieldWrapper>
          </div>
          <FieldWrapper field="address" label="Physical Address">
            <Textarea 
              id="address" 
              placeholder="Enter physical address"
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              onBlur={() => handleBlur('address')}
              className={hasError('address') ? 'border-red-500' : ''}
            />
          </FieldWrapper>
        </>
      )}

      {/* Merchant-specific fields */}
      {userType === 'merchant' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper field="businessName" label="Business Name">
              <Input 
                id="businessName" 
                placeholder="Enter business name"
                value={formData.businessName || ''}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                onBlur={() => handleBlur('businessName')}
                className={hasError('businessName') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
            <FieldWrapper field="businessType" label="Business Type">
              <Select value={formData.businessType || ''} onValueChange={(v) => handleInputChange('businessType', v)}>
                <SelectTrigger className={hasError('businessType') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                  <SelectItem value="SUPERMARKET">Supermarket</SelectItem>
                  <SelectItem value="RETAIL_STORE">Retail Store</SelectItem>
                  <SelectItem value="GROCERY">Grocery</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper field="phone" label="Phone Number">
              <Input 
                id="phone" 
                type="tel" 
                placeholder="+256 7XX XXX XXX"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                className={hasError('phone') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
            <FieldWrapper field="email" label="Email">
              <Input 
                id="email" 
                type="email" 
                placeholder="orders@business.com"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={hasError('email') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper field="address" label="Address">
              <Input 
                id="address" 
                placeholder="Business address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                onBlur={() => handleBlur('address')}
                className={hasError('address') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
            <FieldWrapper field="city" label="City">
              <Input 
                id="city" 
                placeholder="City"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                onBlur={() => handleBlur('city')}
                className={hasError('city') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openingTime">Opening Time</Label>
              <Input 
                id="openingTime" 
                type="time"
                value={formData.openingTime || '08:00'}
                onChange={(e) => handleInputChange('openingTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closingTime">Closing Time</Label>
              <Input 
                id="closingTime" 
                type="time"
                value={formData.closingTime || '20:00'}
                onChange={(e) => handleInputChange('closingTime', e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Pharmacy/Health Provider fields */}
      {(userType === 'pharmacy' || userType === 'health_provider') && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper field="businessName" label="Business/Facility Name">
              <Input 
                id="businessName" 
                placeholder="Enter business name"
                value={formData.businessName || ''}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                onBlur={() => handleBlur('businessName')}
                className={hasError('businessName') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
            <FieldWrapper field="providerType" label="Provider Type">
              <Select value={formData.providerType || ''} onValueChange={(v) => handleInputChange('providerType', v)}>
                <SelectTrigger className={hasError('providerType') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                  <SelectItem value="DRUG_SHOP">Drug Shop</SelectItem>
                  <SelectItem value="CLINIC">Clinic</SelectItem>
                  <SelectItem value="PRIVATE_DOCTOR">Private Doctor</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper field="licenseNumber" label="License Number">
              <Input 
                id="licenseNumber" 
                placeholder="License/Certificate Number"
                value={formData.licenseNumber || ''}
                onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                onBlur={() => handleBlur('licenseNumber')}
                className={hasError('licenseNumber') ? 'border-red-500' : ''}
              />
            </FieldWrapper>
            <FieldWrapper field="issuingAuthority" label="Issuing Authority">
              <Select value={formData.issuingAuthority || ''} onValueChange={(v) => handleInputChange('issuingAuthority', v)}>
                <SelectTrigger className={hasError('issuingAuthority') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select authority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NDA">NDA (National Drug Authority)</SelectItem>
                  <SelectItem value="MINISTRY_OF_HEALTH">Ministry of Health</SelectItem>
                  <SelectItem value="MEDICAL_COUNCIL">Medical Council</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrapper>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Owner/Manager Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <FieldWrapper field="ownerName" label="Full Name">
                <Input 
                  id="ownerName" 
                  placeholder="Owner/Manager name"
                  value={formData.ownerName || ''}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  onBlur={() => handleBlur('ownerName')}
                  className={hasError('ownerName') ? 'border-red-500' : ''}
                />
              </FieldWrapper>
              <FieldWrapper field="ownerPhone" label="Phone">
                <Input 
                  id="ownerPhone" 
                  type="tel" 
                  placeholder="+256 7XX XXX XXX"
                  value={formData.ownerPhone || ''}
                  onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                  onBlur={() => handleBlur('ownerPhone')}
                  className={hasError('ownerPhone') ? 'border-red-500' : ''}
                />
              </FieldWrapper>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email</Label>
                <Input 
                  id="ownerEmail" 
                  type="email" 
                  placeholder="email@example.com"
                  value={formData.ownerEmail || ''}
                  onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerNIN">National ID Number</Label>
                <Input 
                  id="ownerNIN" 
                  placeholder="NIN"
                  value={formData.ownerNIN || ''}
                  onChange={(e) => handleInputChange('ownerNIN', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Location</h4>
            <div className="grid grid-cols-2 gap-4">
              <FieldWrapper field="address" label="Address">
                <Input 
                  id="address" 
                  placeholder="Street address"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  onBlur={() => handleBlur('address')}
                  className={hasError('address') ? 'border-red-500' : ''}
                />
              </FieldWrapper>
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input 
                  id="district" 
                  placeholder="District"
                  value={formData.district || ''}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      {!documentsValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All required documents must be uploaded before submission.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> All documents will be verified before approval. 
          Upload clear, readable copies of original documents.
        </p>
      </div>
      
      <div className="space-y-3">
        {documents.map((doc, index) => (
          <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${doc.required && !doc.uploaded ? 'border-red-200 bg-red-50' : ''}`}>
            <div className="flex items-center gap-3">
              {doc.uploaded ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <FileText className={`h-5 w-5 ${doc.required ? 'text-red-400' : 'text-gray-400'}`} />
              )}
              <div>
                <p className="font-medium">{doc.name}</p>
                {doc.required && (
                  <Badge variant={doc.uploaded ? "default" : "destructive"} className="text-xs">
                    {doc.uploaded ? 'Uploaded' : 'Required'}
                  </Badge>
                )}
              </div>
            </div>
            
            {doc.uploaded ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-600">{doc.file?.name}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleRemoveDocument(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload(index, file);
                  }}
                />
                <Button size="sm" variant={doc.required ? "default" : "outline"} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </span>
                </Button>
              </label>
            )}
          </div>
        ))}
      </div>
      
      {/* Upload progress indicator */}
      <div className="text-sm text-gray-500">
        {documents.filter(d => d.uploaded).length} of {documents.length} documents uploaded
        {documents.filter(d => d.required && !d.uploaded).length > 0 && (
          <span className="text-red-600 ml-2">
            ({documents.filter(d => d.required && !d.uploaded).length} required remaining)
          </span>
        )}
      </div>
    </div>
  );

  const renderVehicleInfo = () => {
    if (userType !== 'rider') return null;
    
    return (
      <div className="space-y-4">
        {!validateSection('vehicle').valid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vehicle information is required for Smart Boda Riders and Smart Car Drivers.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <FieldWrapper field="vehicleType" label="Vehicle Type">
            <Select value={formData.vehicleType || ''} onValueChange={(v) => handleInputChange('vehicleType', v)}>
              <SelectTrigger className={hasError('vehicleType') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BODA">Motorcycle (Boda)</SelectItem>
                <SelectItem value="CAR">Car</SelectItem>
                <SelectItem value="BICYCLE">Bicycle</SelectItem>
                <SelectItem value="SCOOTER">Scooter</SelectItem>
              </SelectContent>
            </Select>
          </FieldWrapper>
          <FieldWrapper field="plateNumber" label="Plate Number">
            <Input 
              id="plateNumber" 
              placeholder="UAX 123A"
              value={formData.plateNumber || ''}
              onChange={(e) => handleInputChange('plateNumber', e.target.value)}
              onBlur={() => handleBlur('plateNumber')}
              className={hasError('plateNumber') ? 'border-red-500' : ''}
            />
          </FieldWrapper>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleMake">Make</Label>
            <Input 
              id="vehicleMake" 
              placeholder="e.g., Toyota, Honda"
              value={formData.vehicleMake || ''}
              onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleModel">Model</Label>
            <Input 
              id="vehicleModel" 
              placeholder="e.g., Corolla, Bajaj"
              value={formData.vehicleModel || ''}
              onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleYear">Year</Label>
            <Input 
              id="vehicleYear" 
              type="number" 
              placeholder="2020"
              value={formData.vehicleYear || ''}
              onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
            />
          </div>
          <FieldWrapper field="vehicleColor" label="Color">
            <Input 
              id="vehicleColor" 
              placeholder="e.g., White, Black"
              value={formData.vehicleColor || ''}
              onChange={(e) => handleInputChange('vehicleColor', e.target.value)}
              onBlur={() => handleBlur('vehicleColor')}
              className={hasError('vehicleColor') ? 'border-red-500' : ''}
            />
          </FieldWrapper>
        </div>
      </div>
    );
  };

  const renderBankInfo = () => (
    <div className="space-y-4">
      {!validateSection('banking').valid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Bank details are required for payouts. Please fill in all required fields.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="bg-gray-50 border rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Bank details are required for payouts. You can update this information later.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <FieldWrapper field="bankName" label="Bank Name">
          <Select value={formData.bankName || ''} onValueChange={(v) => handleInputChange('bankName', v)}>
            <SelectTrigger className={hasError('bankName') ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STANBIC">Stanbic Bank</SelectItem>
              <SelectItem value="CENTENARY">Centenary Bank</SelectItem>
              <SelectItem value="EQUITY">Equity Bank</SelectItem>
              <SelectItem value="DFCU">DFCU Bank</SelectItem>
              <SelectItem value="ABSA">Absa Bank</SelectItem>
              <SelectItem value="GTBANK">GTBank</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </FieldWrapper>
        <FieldWrapper field="accountName" label="Account Name">
          <Input 
            id="accountName" 
            placeholder="Account holder name"
            value={formData.accountName || ''}
            onChange={(e) => handleInputChange('accountName', e.target.value)}
            onBlur={() => handleBlur('accountName')}
            className={hasError('accountName') ? 'border-red-500' : ''}
          />
        </FieldWrapper>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FieldWrapper field="accountNumber" label="Account Number">
          <Input 
            id="accountNumber" 
            placeholder="Account number"
            value={formData.accountNumber || ''}
            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
            onBlur={() => handleBlur('accountNumber')}
            className={hasError('accountNumber') ? 'border-red-500' : ''}
          />
        </FieldWrapper>
        <div className="space-y-2">
          <Label htmlFor="mobileMoney">Mobile Money Number</Label>
          <Input 
            id="mobileMoney" 
            type="tel" 
            placeholder="+256 7XX XXX XXX"
            value={formData.mobileMoney || ''}
            onChange={(e) => handleInputChange('mobileMoney', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  // Calculate missing items for each tab
  const basicMissing = getMissingCount('basic');
  const vehicleMissing = userType === 'rider' ? getMissingCount('vehicle') : 0;
  const docsMissing = documents.filter(d => d.required && !d.uploaded).length;
  const bankingMissing = getMissingCount('banking');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className={`grid w-full ${userType === 'rider' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="basic" className="flex items-center gap-2">
              Basic Info
              {basicMissing > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {basicMissing}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              Documents
              {docsMissing > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {docsMissing}
                </Badge>
              )}
            </TabsTrigger>
            {userType === 'rider' && (
              <TabsTrigger value="vehicle" className="flex items-center gap-2">
                Vehicle
                {vehicleMissing > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {vehicleMissing}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="banking" className="flex items-center gap-2">
              Banking
              {bankingMissing > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {bankingMissing}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="basic" className="space-y-4">
              {renderBasicInfo()}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              {renderDocuments()}
            </TabsContent>

            {userType === 'rider' && (
              <TabsContent value="vehicle" className="space-y-4">
                {renderVehicleInfo()}
              </TabsContent>
            )}

            <TabsContent value="banking" className="space-y-4">
              {renderBankInfo()}
            </TabsContent>
          </div>
        </Tabs>

        {/* Validation Summary */}
        {!isFormValid && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete all required fields before submitting:
              <ul className="mt-2 text-sm list-disc list-inside">
                {basicMissing > 0 && <li>Basic Info: {basicMissing} field(s) missing</li>}
                {docsMissing > 0 && <li>Documents: {docsMissing} required document(s) missing</li>}
                {vehicleMissing > 0 && <li>Vehicle: {vehicleMissing} field(s) missing</li>}
                {bankingMissing > 0 && <li>Banking: {bankingMissing} field(s) missing</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !isFormValid}
            className={!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add {userType === 'rider' ? 'Rider' : userType === 'merchant' ? 'Merchant' : 'Provider'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

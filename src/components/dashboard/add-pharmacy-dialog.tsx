'use client';

import { useState } from 'react';
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
  Heart,
  Upload,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
  MapPin,
  User,
  Building,
  CreditCard
} from 'lucide-react';

interface AddPharmacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (data: Record<string, unknown>) => void;
}

interface DocumentUpload {
  name: string;
  required: boolean;
  file: File | null;
  uploaded: boolean;
}

export function AddPharmacyDialog({ open, onOpenChange, onSuccess }: AddPharmacyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { name: 'Business License', required: true, file: null, uploaded: false },
    { name: 'NDA Certificate', required: true, file: null, uploaded: false },
    { name: 'National ID (Owner)', required: true, file: null, uploaded: false },
    { name: 'Pharmacist License', required: true, file: null, uploaded: false },
    { name: 'Facility Photo', required: false, file: null, uploaded: false },
  ]);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData({});
      setTouched({});
      setActiveTab('basic');
      setError(null);
      setDocuments([
        { name: 'Business License', required: true, file: null, uploaded: false },
        { name: 'NDA Certificate', required: true, file: null, uploaded: false },
        { name: 'National ID (Owner)', required: true, file: null, uploaded: false },
        { name: 'Pharmacist License', required: true, file: null, uploaded: false },
        { name: 'Facility Photo', required: false, file: null, uploaded: false },
      ]);
    }
    onOpenChange(newOpen);
  };

  // Check if a field is required
  const isFieldRequired = (field: string): boolean => {
    const requiredFields = [
      'businessName', 'providerType', 'licenseNumber', 'issuingAuthority',
      'ownerFullName', 'ownerPhone', 'address'
    ];
    return requiredFields.includes(field);
  };

  // Check if a field has an error
  const hasError = (field: string): boolean => {
    return touched[field] && !formData[field]?.trim();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    setError(null);
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

  const validateForm = (): boolean => {
    const requiredFields = [
      'businessName', 'providerType', 'licenseNumber', 'issuingAuthority',
      'ownerFullName', 'ownerPhone', 'address'
    ];
    
    // Touch all required fields
    const allTouched: Record<string, boolean> = {};
    requiredFields.forEach(field => allTouched[field] = true);
    setTouched(allTouched);

    // Check required fields
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return false;
    }

    // Check required documents
    const missingDocs = documents.filter(d => d.required && !d.uploaded);
    if (missingDocs.length > 0) {
      setError(`Please upload all required documents: ${missingDocs.map(d => d.name).join(', ')}`);
      setActiveTab('documents');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    
    try {
      // First, upload all documents
      const uploadedDocs: Record<string, string> = {};
      
      for (const doc of documents) {
        if (doc.file) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', doc.file);
          uploadFormData.append('type', 'pharmacy');
          uploadFormData.append('documentType', doc.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
          
          const uploadResponse = await fetch('/api/uploads/documents', {
            method: 'POST',
            body: uploadFormData,
          });
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedDocs[doc.name] = uploadData.url;
          }
        }
      }

      const payload = {
        businessName: formData.businessName,
        providerType: formData.providerType,
        licenseNumber: formData.licenseNumber,
        issuingAuthority: formData.issuingAuthority,
        ownerFullName: formData.ownerFullName,
        ownerPhone: formData.ownerPhone,
        ownerEmail: formData.ownerEmail || null,
        ownerNIN: formData.ownerNIN || null,
        address: formData.address,
        city: formData.city || null,
        district: formData.district || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        licenseDocumentUrl: uploadedDocs['Business License'] || null,
        facilityPhotoUrl: uploadedDocs['Facility Photo'] || null,
        bankName: formData.bankName || null,
        bankAccountName: formData.accountName || null,
        bankAccountNumber: formData.accountNumber || null,
        mobileMoneyNumber: formData.mobileMoney || null,
        verificationStatus: formData.verificationStatus || 'PENDING',
      };

      const response = await fetch('/api/admin/health-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok) {
        onSuccess?.(data);
        onOpenChange(false);
      } else {
        setError(data.error || 'Failed to add pharmacy');
      }
    } catch (error) {
      console.error('Failed to add pharmacy:', error);
      setError('Failed to add pharmacy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const documentsValid = documents.filter(d => d.required).every(d => d.uploaded);
  const docsMissing = documents.filter(d => d.required && !d.uploaded).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Heart className="h-5 w-5 text-rose-500" />
            Add New Pharmacy
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Register a new pharmacy partner on the platform
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
            <TabsTrigger value="basic" className="data-[state=active]:bg-gray-700 text-gray-300">
              <User className="h-4 w-4 mr-2" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-gray-700 text-gray-300">
              Documents
              {docsMissing > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {docsMissing}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="banking" className="data-[state=active]:bg-gray-700 text-gray-300">
              <CreditCard className="h-4 w-4 mr-2" />
              Banking
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-gray-300">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="businessName" 
                    placeholder="Enter pharmacy name"
                    value={formData.businessName || ''}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    onBlur={() => handleBlur('businessName')}
                    className={`bg-gray-800 border-gray-700 text-white ${hasError('businessName') ? 'border-red-500' : ''}`}
                  />
                  {hasError('businessName') && (
                    <p className="text-xs text-red-500">Business name is required</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="providerType" className="text-gray-300">
                    Provider Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.providerType || ''} onValueChange={(v) => handleInputChange('providerType', v)}>
                    <SelectTrigger className={`bg-gray-800 border-gray-700 text-white ${hasError('providerType') ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                      <SelectItem value="DRUG_SHOP">Drug Shop</SelectItem>
                      <SelectItem value="CLINIC">Clinic</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasError('providerType') && (
                    <p className="text-xs text-red-500">Provider type is required</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber" className="text-gray-300">
                    License Number <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="licenseNumber" 
                    placeholder="NDA License Number"
                    value={formData.licenseNumber || ''}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    onBlur={() => handleBlur('licenseNumber')}
                    className={`bg-gray-800 border-gray-700 text-white ${hasError('licenseNumber') ? 'border-red-500' : ''}`}
                  />
                  {hasError('licenseNumber') && (
                    <p className="text-xs text-red-500">License number is required</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuingAuthority" className="text-gray-300">
                    Issuing Authority <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.issuingAuthority || ''} onValueChange={(v) => handleInputChange('issuingAuthority', v)}>
                    <SelectTrigger className={`bg-gray-800 border-gray-700 text-white ${hasError('issuingAuthority') ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select authority" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="NDA">NDA (National Drug Authority)</SelectItem>
                      <SelectItem value="MINISTRY_OF_HEALTH">Ministry of Health</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasError('issuingAuthority') && (
                    <p className="text-xs text-red-500">Issuing authority is required</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h4 className="font-medium mb-3 text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  Owner Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerFullName" className="text-gray-300">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="ownerFullName" 
                      placeholder="Owner/Manager name"
                      value={formData.ownerFullName || ''}
                      onChange={(e) => handleInputChange('ownerFullName', e.target.value)}
                      onBlur={() => handleBlur('ownerFullName')}
                      className={`bg-gray-800 border-gray-700 text-white ${hasError('ownerFullName') ? 'border-red-500' : ''}`}
                    />
                    {hasError('ownerFullName') && (
                      <p className="text-xs text-red-500">Owner name is required</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone" className="text-gray-300">
                      Phone <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="ownerPhone" 
                      type="tel" 
                      placeholder="+256 7XX XXX XXX"
                      value={formData.ownerPhone || ''}
                      onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                      onBlur={() => handleBlur('ownerPhone')}
                      className={`bg-gray-800 border-gray-700 text-white ${hasError('ownerPhone') ? 'border-red-500' : ''}`}
                    />
                    {hasError('ownerPhone') && (
                      <p className="text-xs text-red-500">Owner phone is required</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail" className="text-gray-300">Email</Label>
                    <Input 
                      id="ownerEmail" 
                      type="email" 
                      placeholder="email@example.com"
                      value={formData.ownerEmail || ''}
                      onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerNIN" className="text-gray-300">National ID Number</Label>
                    <Input 
                      id="ownerNIN" 
                      placeholder="NIN"
                      value={formData.ownerNIN || ''}
                      onChange={(e) => handleInputChange('ownerNIN', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h4 className="font-medium mb-3 text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Location
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-300">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea 
                    id="address" 
                    placeholder="Street address"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                    className={`bg-gray-800 border-gray-700 text-white ${hasError('address') ? 'border-red-500' : ''}`}
                  />
                  {hasError('address') && (
                    <p className="text-xs text-red-500">Address is required</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-300">City</Label>
                    <Input 
                      id="city" 
                      placeholder="City"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district" className="text-gray-300">District</Label>
                    <Input 
                      id="district" 
                      placeholder="District"
                      value={formData.district || ''}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h4 className="font-medium mb-3 text-white flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-400" />
                  Verification Status
                </h4>
                <div className="space-y-2">
                  <Select value={formData.verificationStatus || 'PENDING'} onValueChange={(v) => handleInputChange('verificationStatus', v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="PENDING">Pending Review</SelectItem>
                      <SelectItem value="VERIFIED">Verified (Skip Review)</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              {!documentsValid && (
                <Alert className="bg-amber-500/10 border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-amber-400">
                    All required documents must be uploaded before submission.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">
                  <strong className="text-gray-300">Important:</strong> All documents will be verified before approval. 
                  Upload clear, readable copies of original documents.
                </p>
              </div>
              
              <div className="space-y-3">
                {documents.map((doc, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${doc.required && !doc.uploaded ? 'border-red-500/50 bg-red-500/5' : 'border-gray-700 bg-gray-800/30'}`}>
                    <div className="flex items-center gap-3">
                      {doc.uploaded ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <AlertCircle className={`h-5 w-5 ${doc.required ? 'text-red-400' : 'text-gray-500'}`} />
                      )}
                      <div>
                        <p className="font-medium text-white">{doc.name}</p>
                        {doc.required && (
                          <Badge variant={doc.uploaded ? "default" : "destructive"} className="text-xs mt-1">
                            {doc.uploaded ? 'Uploaded' : 'Required'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {doc.uploaded ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-emerald-400">{doc.file?.name}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleRemoveDocument(index)}
                          className="text-gray-400 hover:text-white"
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
                        <Button size="sm" variant={doc.required ? "default" : "outline"} asChild className={doc.required ? "bg-rose-600 hover:bg-rose-700" : "border-gray-600 text-gray-300"}>
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
              
              <div className="text-sm text-gray-500">
                {documents.filter(d => d.uploaded).length} of {documents.length} documents uploaded
                {docsMissing > 0 && (
                  <span className="text-red-400 ml-2">
                    ({docsMissing} required remaining)
                  </span>
                )}
              </div>
            </TabsContent>

            {/* Banking Tab */}
            <TabsContent value="banking" className="space-y-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">
                  Bank details are required for payouts. You can update this information later.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-gray-300">Bank Name</Label>
                  <Select value={formData.bankName || ''} onValueChange={(v) => handleInputChange('bankName', v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="STANBIC">Stanbic Bank</SelectItem>
                      <SelectItem value="CENTENARY">Centenary Bank</SelectItem>
                      <SelectItem value="EQUITY">Equity Bank</SelectItem>
                      <SelectItem value="DFCU">DFCU Bank</SelectItem>
                      <SelectItem value="ABSA">Absa Bank</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountName" className="text-gray-300">Account Name</Label>
                  <Input 
                    id="accountName" 
                    placeholder="Account holder name"
                    value={formData.accountName || ''}
                    onChange={(e) => handleInputChange('accountName', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber" className="text-gray-300">Account Number</Label>
                  <Input 
                    id="accountNumber" 
                    placeholder="Account number"
                    value={formData.accountNumber || ''}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobileMoney" className="text-gray-300">Mobile Money Number</Label>
                  <Input 
                    id="mobileMoney" 
                    type="tel" 
                    placeholder="+256 7XX XXX XXX"
                    value={formData.mobileMoney || ''}
                    onChange={(e) => handleInputChange('mobileMoney', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-6 gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Add Pharmacy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

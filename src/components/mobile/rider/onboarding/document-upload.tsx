'use client';

import { useState, useRef } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Image as ImageIcon,
  User,
  CreditCard,
} from 'lucide-react';

type RiderRole = 'SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' | 'DELIVERY_PERSONNEL';

interface DocumentUploadScreenProps {
  role: RiderRole;
  onSubmit: (data: DocumentData) => void;
  onBack: () => void;
}

export interface DocumentData {
  facePhotoUrl: string | null;
  nationalIdFrontUrl: string | null;
  nationalIdBackUrl: string | null;
  driverLicenseUrl: string | null;
}

interface DocumentItem {
  id: keyof DocumentData;
  title: string;
  description: string;
  required: boolean;
  icon: typeof Camera;
}

export function DocumentUploadScreen({ role, onSubmit, onBack }: DocumentUploadScreenProps) {
  const [documents, setDocuments] = useState<DocumentData>({
    facePhotoUrl: null,
    nationalIdFrontUrl: null,
    nationalIdBackUrl: null,
    driverLicenseUrl: null,
  });

  const fileInputRefs = {
    facePhotoUrl: useRef<HTMLInputElement>(null),
    nationalIdFrontUrl: useRef<HTMLInputElement>(null),
    nationalIdBackUrl: useRef<HTMLInputElement>(null),
    driverLicenseUrl: useRef<HTMLInputElement>(null),
  };

  // Driver's license is required for Boda and Car roles
  const needsDriversLicense = role === 'SMART_BODA_RIDER' || role === 'SMART_CAR_DRIVER';

  const documentItems: DocumentItem[] = [
    {
      id: 'facePhotoUrl',
      title: 'Face Photo',
      description: 'Clear photo of your face for identification',
      required: true,
      icon: User,
    },
    {
      id: 'nationalIdFrontUrl',
      title: 'National ID (Front)',
      description: 'Front side of your National ID card',
      required: true,
      icon: CreditCard,
    },
    {
      id: 'nationalIdBackUrl',
      title: 'National ID (Back)',
      description: 'Back side of your National ID card',
      required: true,
      icon: CreditCard,
    },
    {
      id: 'driverLicenseUrl',
      title: "Driver's License",
      description: 'Valid driving license (required for passenger transport)',
      required: needsDriversLicense,
      icon: FileText,
    },
  ];

  const handleFileSelect = (docId: keyof DocumentData, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, we would upload to a server
      // For demo, we'll use a local URL
      const url = URL.createObjectURL(file);
      setDocuments(prev => ({ ...prev, [docId]: url }));
    }
  };

  const handleRemove = (docId: keyof DocumentData) => {
    setDocuments(prev => ({ ...prev, [docId]: null }));
  };

  const handleCapture = (docId: keyof DocumentData) => {
    const input = fileInputRefs[docId].current;
    if (input) {
      input.click();
    }
  };

  const canProceed = () => {
    const requiredDocs = documentItems.filter(d => d.required);
    return requiredDocs.every(doc => documents[doc.id] !== null);
  };

  const handleSubmit = () => {
    if (canProceed()) {
      onSubmit(documents);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader title="Upload Documents" showBack onBack={onBack} />

      <div className="px-4 pt-4 pb-32">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Documents</h1>
          <p className="text-gray-500 text-sm">
            Upload clear photos of your documents for verification
          </p>
        </div>

        {/* Important Notice */}
        <MobileCard className="p-4 mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 text-sm">Photo Requirements</p>
              <ul className="text-amber-700 text-xs mt-1 space-y-1">
                <li>• All documents must be clearly readable</li>
                <li>• Face photo should show your full face clearly</li>
                <li>• No blurry or dark photos</li>
                <li>• Documents must not be expired</li>
              </ul>
            </div>
          </div>
        </MobileCard>

        {/* Document Upload Items */}
        <div className="space-y-4">
          {documentItems.map((doc) => {
            const Icon = doc.icon;
            const hasDocument = documents[doc.id] !== null;

            return (
              <MobileCard key={doc.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Preview or Icon */}
                  <div className="w-16 h-16 flex-shrink-0">
                    {hasDocument ? (
                      <div className="relative w-full h-full">
                        <img
                          src={documents[doc.id]!}
                          alt={doc.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleRemove(doc.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      {doc.required && (
                        <span className="text-red-500 text-xs">*</span>
                      )}
                      {hasDocument && (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{doc.description}</p>

                    {/* Upload Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCapture(doc.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </button>
                      <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Upload
                        <input
                          ref={fileInputRefs[doc.id]}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(doc.id, e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>Verification Process:</strong> Our team will verify your documents during the physical inspection. Make sure to bring the original documents.
          </p>
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
            disabled={!canProceed()}
            className={`flex-1 py-4 ${canProceed() ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            Continue
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Upload,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  PartyPopper,
  Store,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProviderPendingScreenProps {
  onBack?: () => void;
  providerId: string | null;
  onNavigate: (screen: any) => void;
  onApproved?: () => void; // Callback when provider is approved
}

export function ProviderPendingScreen({ onBack, providerId, onNavigate, onApproved }: ProviderPendingScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showApprovedView, setShowApprovedView] = useState(false);
  
  // Mock data - in real app, fetch from API
  const [provider, setProvider] = useState({
    businessName: 'Kampala Central Pharmacy',
    providerType: 'PHARMACY',
    verificationStatus: 'PENDING',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    estimatedReviewTime: '1-3 business days',
    documentsRequested: false,
    requestedDocuments: [],
  });

  // Simulate checking for status updates
  const checkForUpdates = async () => {
    setIsRefreshing(true);
    
    // In real app, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo: Toggle between PENDING and APPROVED
    // In production, this would fetch the actual status from the backend
    const mockStatusUpdate = localStorage.getItem('provider_verification_status');
    if (mockStatusUpdate === 'APPROVED') {
      setProvider(prev => ({ ...prev, verificationStatus: 'APPROVED' }));
      setShowApprovedView(true);
    }
    
    setIsRefreshing(false);
  };

  // Poll for status updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, [providerId]);

  // Check on mount
  useEffect(() => {
    checkForUpdates();
  }, []);

  const handleStartWorking = () => {
    if (onApproved) {
      onApproved();
    }
  };

  // Demo: Simulate approval (remove in production)
  const simulateApproval = () => {
    localStorage.setItem('provider_verification_status', 'APPROVED');
    setProvider(prev => ({ ...prev, verificationStatus: 'APPROVED' }));
    setShowApprovedView(true);
  };

  const getStatusInfo = () => {
    switch (provider.verificationStatus) {
      case 'PENDING':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          title: 'Application Under Review',
          description: 'Our team is reviewing your application. This typically takes 1-3 business days.',
        };
      case 'DOCUMENTS_REQUESTED':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          title: 'Additional Documents Required',
          description: 'Please upload the requested documents to continue the verification process.',
        };
      case 'UNDER_REVIEW':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          title: 'Final Review in Progress',
          description: 'Your documents are being verified. We\'ll notify you once approved.',
        };
      case 'APPROVED':
        return {
          icon: CheckCircle,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-100',
          title: 'Congratulations! You\'re Approved',
          description: 'Your pharmacy has been verified. You can now start accepting orders.',
        };
      case 'REJECTED':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          title: 'Application Rejected',
          description: 'Unfortunately, your application was not approved. Please review the feedback.',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          title: 'Status Unknown',
          description: 'Please contact support.',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const timeline = [
    { step: 'Application Submitted', completed: true, date: provider.submittedAt },
    { step: 'Initial Review', completed: true, date: new Date(provider.submittedAt.getTime() + 4 * 60 * 60 * 1000) },
    { step: 'Document Verification', completed: provider.verificationStatus === 'APPROVED', current: provider.verificationStatus === 'UNDER_REVIEW' },
    { step: 'Final Approval', completed: provider.verificationStatus === 'APPROVED' },
  ];

  // Show approved view with transition to Pharmacy App
  if (showApprovedView || provider.verificationStatus === 'APPROVED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="px-4 pt-12 pb-8">
          {/* Celebration Animation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-4 animate-bounce">
              <PartyPopper className="h-12 w-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">You're Approved!</h1>
            <p className="text-emerald-100 text-lg">Your pharmacy is now verified and ready</p>
          </div>

          {/* Provider Info Card */}
          <MobileCard className="p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <Store className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{provider.businessName}</h2>
                <p className="text-gray-500">{provider.providerType.replace(/_/g, ' ')}</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>License verified</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Documents approved</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Ready to accept orders</span>
              </div>
            </div>
          </MobileCard>

          {/* What's Next */}
          <MobileCard className="p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">What's Next?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-blue-600 text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Set up your medicine catalog</p>
                  <p className="text-sm text-gray-500">Add medicines you sell to your catalog</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-blue-600 text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Set your operating hours</p>
                  <p className="text-sm text-gray-500">Configure when you're open for orders</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-blue-600 text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Start receiving orders</p>
                  <p className="text-sm text-gray-500">Turn on your availability to get orders</p>
                </div>
              </div>
            </div>
          </MobileCard>

          {/* Start Working Button */}
          <Button
            onClick={handleStartWorking}
            className="w-full py-6 text-lg font-bold bg-white text-emerald-600 hover:bg-gray-50 shadow-lg rounded-2xl"
          >
            <Store className="h-6 w-6 mr-2" />
            Open Pharmacy App
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          <p className="text-center text-emerald-100 text-sm mt-4">
            You can always access your pharmacy dashboard from the main menu
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <MobileHeader title="Application Status" showBack onBack={onBack} />

      <div className="px-4 pt-6">
        {/* Status Banner */}
        <div className={`${statusInfo.bgColor} rounded-2xl p-6 text-center mb-6`}>
          <div className={`${statusInfo.bgColor} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
            <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">{statusInfo.title}</h2>
          <p className="text-gray-600 text-sm">{statusInfo.description}</p>
          
          {provider.verificationStatus === 'PENDING' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Estimated: {provider.estimatedReviewTime}</span>
            </div>
          )}
        </div>

        {/* Application Details */}
        <MobileCard className="p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Application Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Business Name</span>
              <span className="font-medium text-gray-900">{provider.businessName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Provider Type</span>
              <span className="font-medium text-gray-900">{provider.providerType.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Submitted</span>
              <span className="font-medium text-gray-900">
                {provider.submittedAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        </MobileCard>

        {/* Timeline */}
        <MobileCard className="p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Review Progress</h3>
          <div className="space-y-4">
            {timeline.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    item.completed 
                      ? 'bg-emerald-500' 
                      : item.current 
                        ? 'bg-blue-500' 
                        : 'bg-gray-200'
                  }`}>
                    {item.completed && <CheckCircle className="h-4 w-4 text-white" />}
                    {item.current && <Clock className="h-4 w-4 text-white" />}
                  </div>
                  {index < timeline.length - 1 && (
                    <div className={`w-0.5 h-8 ${
                      item.completed ? 'bg-emerald-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`font-medium ${item.completed || item.current ? 'text-gray-900' : 'text-gray-400'}`}>
                    {item.step}
                  </p>
                  {item.date && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.date.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </MobileCard>

        {/* Documents Requested */}
        {provider.verificationStatus === 'DOCUMENTS_REQUESTED' && (
          <MobileCard className="p-4 mb-4 border-orange-200 bg-orange-50">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Requested Documents
            </h3>
            <div className="space-y-3">
              {provider.requestedDocuments.map((doc: string, index: number) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{doc}</span>
                  </div>
                  <button className="text-emerald-600 font-medium text-sm">Upload</button>
                </div>
              ))}
            </div>
          </MobileCard>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button 
            onClick={checkForUpdates}
            disabled={isRefreshing}
            className="w-full flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className={`h-5 w-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-medium text-gray-700">
                {isRefreshing ? 'Checking for Updates...' : 'Check for Updates'}
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Contact Support</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">FAQs</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Demo Button - Remove in production */}
          <button 
            onClick={simulateApproval}
            className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 rounded-xl p-3 text-sm font-medium"
          >
            <CheckCircle className="h-4 w-4" />
            [Demo] Simulate Approval
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
          <p className="text-sm text-blue-800">
            <strong>Need help?</strong> Contact our verification team at{' '}
            <a href="mailto:verification@smartride.ug" className="underline">
              verification@smartride.ug
            </a>{' '}
            or call <a href="tel:+256700123456" className="underline">+256 700 123 456</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

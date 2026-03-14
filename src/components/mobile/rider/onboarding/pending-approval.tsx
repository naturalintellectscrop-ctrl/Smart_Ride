'use client';

import { useState, useEffect } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { Button } from '@/components/ui/button';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  PartyPopper,
  Bike,
  Car,
  Package,
  ArrowRight,
  Truck,
  Shield,
} from 'lucide-react';

type RiderRole = 'SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' | 'DELIVERY_PERSONNEL';
type RiderStatus = 'PENDING_APPROVAL' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

interface PendingApprovalScreenProps {
  riderId: string | null;
  onNavigate: (screen: string) => void;
  onApproved?: () => void;
}

export function PendingApprovalScreen({ riderId, onNavigate, onApproved }: PendingApprovalScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showApprovedView, setShowApprovedView] = useState(false);

  // Get stored rider data
  const getStoredRole = (): RiderRole => {
    if (typeof window === 'undefined') return 'SMART_BODA_RIDER';
    return (localStorage.getItem('rider_role') as RiderRole) || 'SMART_BODA_RIDER';
  };

  const [rider, setRider] = useState({
    fullName: 'John Doe',
    role: getStoredRole(),
    status: 'PENDING_APPROVAL' as RiderStatus,
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    estimatedReviewTime: '1-3 business days',
    phone: '+256 700 123 456',
    vehicleMake: 'Bajaj',
    vehicleModel: 'Boxer',
    vehiclePlate: 'UAX 123A',
    hasReflectorVest: false,
    hasHelmet: false,
    hasInsulatedBox: false,
  });

  const checkForUpdates = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockStatusUpdate = localStorage.getItem('rider_verification_status');
    if (mockStatusUpdate === 'APPROVED') {
      setRider(prev => ({ ...prev, status: 'APPROVED' }));
      setShowApprovedView(true);
    }

    setIsRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const handleStartWorking = () => {
    if (onApproved) {
      onApproved();
    }
  };

  const simulateApproval = () => {
    localStorage.setItem('rider_verification_status', 'APPROVED');
    setRider(prev => ({ ...prev, status: 'APPROVED' }));
    setShowApprovedView(true);
  };

  const roleLabels: Record<RiderRole, string> = {
    SMART_BODA_RIDER: 'Smart Boda Rider',
    SMART_CAR_DRIVER: 'Smart Car Driver',
    DELIVERY_PERSONNEL: 'Delivery Personnel',
  };

  const roleIcons: Record<RiderRole, typeof Bike> = {
    SMART_BODA_RIDER: Bike,
    SMART_CAR_DRIVER: Car,
    DELIVERY_PERSONNEL: Package,
  };

  const getStatusInfo = () => {
    switch (rider.status) {
      case 'PENDING_APPROVAL':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          title: 'Application Under Review',
          description: 'Our team is reviewing your application. We will contact you for physical verification.',
        };
      case 'UNDER_REVIEW':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          title: 'Physical Verification in Progress',
          description: 'Your documents are being verified. Please wait for our team to contact you.',
        };
      case 'APPROVED':
        return {
          icon: CheckCircle,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-100',
          title: "Congratulations! You're Approved",
          description: 'Your application has been approved. You can now start accepting tasks.',
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
  const RoleIcon = roleIcons[rider.role];

  const timeline = [
    { step: 'Application Submitted', completed: true, date: rider.submittedAt },
    { step: 'Document Review', completed: rider.status !== 'PENDING_APPROVAL', date: rider.status !== 'PENDING_APPROVAL' ? new Date() : null },
    { step: 'Physical Verification', completed: rider.status === 'APPROVED', current: rider.status === 'UNDER_REVIEW' },
    { step: 'Equipment Issued', completed: rider.status === 'APPROVED' },
  ];

  // Approved Celebration View
  if (showApprovedView || rider.status === 'APPROVED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="px-4 pt-12 pb-8">
          {/* Celebration */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-4 animate-bounce">
              <PartyPopper className="h-12 w-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">You're Approved!</h1>
            <p className="text-emerald-100 text-lg">You're ready to start earning</p>
          </div>

          {/* Info Card */}
          <MobileCard className="p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <RoleIcon className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{rider.fullName}</h2>
                <p className="text-gray-500">{roleLabels[rider.role]}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Documents verified</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Vehicle approved</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Equipment issued (reflect jacket, helmet)</span>
              </div>
              {rider.role === 'DELIVERY_PERSONNEL' && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Insulated delivery box issued</span>
                </div>
              )}
            </div>
          </MobileCard>

          {/* What's Next */}
          <MobileCard className="p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">What's Next?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-emerald-600 text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Go Online</p>
                  <p className="text-sm text-gray-500">Toggle your availability to start receiving tasks</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-emerald-600 text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Accept Tasks</p>
                  <p className="text-sm text-gray-500">Receive tasks based on your role and capabilities</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-emerald-600 text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Get Paid</p>
                  <p className="text-sm text-gray-500">Complete tasks and earn money</p>
                </div>
              </div>
            </div>
          </MobileCard>

          {/* Start Working Button */}
          <Button
            onClick={handleStartWorking}
            className="w-full py-6 text-lg font-bold bg-white text-emerald-600 hover:bg-gray-50 shadow-lg rounded-2xl"
          >
            <RoleIcon className="h-6 w-6 mr-2" />
            Start Working
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <MobileHeader title="Application Status" />

      <div className="px-4 pt-6">
        {/* Status Banner */}
        <div className={`${statusInfo.bgColor} rounded-2xl p-6 text-center mb-6`}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-white/50">
            <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">{statusInfo.title}</h2>
          <p className="text-gray-600 text-sm">{statusInfo.description}</p>

          {rider.status === 'PENDING_APPROVAL' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Estimated: {rider.estimatedReviewTime}</span>
            </div>
          )}
        </div>

        {/* Application Details */}
        <MobileCard className="p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Application Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Full Name</span>
              <span className="font-medium text-gray-900">{rider.fullName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-900">{roleLabels[rider.role]}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Vehicle</span>
              <span className="font-medium text-gray-900">{rider.vehicleMake} {rider.vehicleModel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Plate</span>
              <span className="font-medium text-gray-900">{rider.vehiclePlate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Submitted</span>
              <span className="font-medium text-gray-900">
                {rider.submittedAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        </MobileCard>

        {/* Timeline */}
        <MobileCard className="p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Verification Progress</h3>
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

        {/* Equipment Status */}
        <MobileCard className="p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-500" />
            Equipment to be Issued
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Reflector Vest</span>
              {rider.hasReflectorVest ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <span className="text-xs text-gray-400">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Helmet</span>
              {rider.hasHelmet ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <span className="text-xs text-gray-400">Pending</span>
              )}
            </div>
            {rider.role === 'DELIVERY_PERSONNEL' && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Insulated Box</span>
                {rider.hasInsulatedBox ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <span className="text-xs text-gray-400">Pending</span>
                )}
              </div>
            )}
          </div>
        </MobileCard>

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

          {/* Demo Button */}
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
            <a href="mailto:riders@smartride.ug" className="underline">
              riders@smartride.ug
            </a>{' '}
            or call <a href="tel:+256700123456" className="underline">+256 700 123 456</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

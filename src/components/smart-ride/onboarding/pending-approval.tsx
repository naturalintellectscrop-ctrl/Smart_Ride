'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock,
  FileCheck,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle,
  Headphones,
  Store,
  Heart,
  Bike,
  LogOut
} from 'lucide-react';
import { User, RiderRoleType, RIDER_ROLE_DESCRIPTIONS } from '../types';
import { MaskedCallButton } from '@/components/shared/masked-call-button';
import { useUser } from '../context/user-context';

interface PendingApprovalProps {
  user: User;
}

export function PendingApproval({ user }: PendingApprovalProps) {
  const { logout } = useUser();

  // Determine user type and status
  const getUserTypeInfo = () => {
    if (user.role === 'RIDER') {
      return {
        label: getRiderRoleLabel(),
        icon: Bike,
        status: user.verificationStatus,
        statusField: 'verificationStatus'
      };
    }
    if (user.role === 'MERCHANT') {
      return {
        label: user.businessName || 'Merchant',
        icon: Store,
        status: user.merchantStatus,
        statusField: 'merchantStatus'
      };
    }
    if (user.role === 'PHARMACIST') {
      return {
        label: user.businessName || 'Health Provider',
        icon: Heart,
        status: user.providerStatus,
        statusField: 'providerStatus'
      };
    }
    return {
      label: 'User',
      icon: CheckCircle,
      status: undefined,
      statusField: undefined
    };
  };

  const userInfo = getUserTypeInfo();
  const UserIcon = userInfo.icon;

  const getRiderRoleLabel = () => {
    switch (user.riderRoleType) {
      case 'SMART_BODA': return 'Smart Boda Rider';
      case 'SMART_CAR': return 'Smart Car Driver';
      case 'DELIVERY_PERSONNEL': return 'Delivery Personnel';
      default: return 'Rider';
    }
  };

  const getStatusColor = () => {
    const status = userInfo.status;
    if (status === 'APPROVED') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (status === 'REJECTED' || status === 'SUSPENDED') return 'bg-red-500/15 text-red-400 border-red-500/30';
    if (status === 'DOCUMENTS_REQUESTED') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  const getStatusLabel = () => {
    const status = userInfo.status;
    if (status === 'APPROVED') return 'Approved';
    if (status === 'REJECTED') return 'Rejected';
    if (status === 'SUSPENDED') return 'Suspended';
    if (status === 'DOCUMENTS_REQUESTED') return 'Documents Needed';
    return 'Pending Review';
  };

  const getStepsForRole = () => {
    if (user.role === 'RIDER') {
      return [
        { label: 'Application Submitted', completed: true },
        { label: 'Document Verification', completed: true },
        { label: 'Physical Inspection', completed: false },
        { label: 'Equipment Issuance', completed: false },
        { label: 'Account Activated', completed: false },
      ];
    }
    if (user.role === 'MERCHANT' || user.role === 'PHARMACIST') {
      return [
        { label: 'Application Submitted', completed: true },
        { label: 'Business Verification', completed: false },
        { label: 'Location Inspection', completed: false },
        { label: 'Account Activated', completed: false },
      ];
    }
    return [];
  };

  const steps = getStepsForRole();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-6 pt-8 pb-12 text-center rounded-b-3xl">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ 
            backgroundColor: userInfo.status === 'REJECTED' || userInfo.status === 'SUSPENDED' 
              ? 'rgba(255, 59, 92, 0.15)' 
              : userInfo.status === 'APPROVED'
                ? 'rgba(0, 255, 136, 0.15)'
                : 'rgba(255, 184, 0, 0.15)',
            boxShadow: userInfo.status === 'REJECTED' || userInfo.status === 'SUSPENDED' 
              ? '0 0 30px rgba(255, 59, 92, 0.3)' 
              : userInfo.status === 'APPROVED'
                ? '0 0 30px rgba(0, 255, 136, 0.3)'
                : '0 0 30px rgba(255, 184, 0, 0.3)'
          }}
        >
          {userInfo.status === 'APPROVED' ? (
            <CheckCircle className="h-10 w-10 text-[#00FF88]" />
          ) : (
            <Clock 
              className="h-10 w-10" 
              style={{ color: userInfo.status === 'REJECTED' || userInfo.status === 'SUSPENDED' ? '#FF3B5C' : '#FFB800' }} 
            />
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {userInfo.status === 'APPROVED' 
            ? 'Congratulations!' 
            : userInfo.status === 'REJECTED' || userInfo.status === 'SUSPENDED'
              ? 'Application Status' 
              : 'Application Under Review'}
        </h1>
        <p className="text-gray-400">
          {userInfo.status === 'APPROVED' 
            ? 'Your account has been approved'
            : userInfo.status === 'REJECTED' || userInfo.status === 'SUSPENDED'
              ? 'Your application needs attention' 
              : 'We\'re reviewing your application'}
        </p>
      </div>

      <div className="px-6 -mt-6">
        {/* Status Card */}
        <Card className="mb-4 bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-[#00FF88]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Application Type</p>
                  <p className="font-bold text-lg text-white">{userInfo.label}</p>
                </div>
              </div>
              <Badge className={getStatusColor()}>
                {getStatusLabel()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Rejection/Suspension Notice */}
        {(userInfo.status === 'REJECTED' || userInfo.status === 'SUSPENDED') && (
          <Card className="mb-4 bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-300 mb-1">
                    {userInfo.status === 'SUSPENDED' ? 'Account Suspended' : 'Action Required'}
                  </p>
                  <p className="text-sm text-red-200/70">
                    {userInfo.status === 'SUSPENDED' 
                      ? 'Your account has been suspended. Please contact support for more information.'
                      : 'Your application was not approved. Please contact support for more information or reapply with updated documents.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Requested Notice */}
        {userInfo.status === 'DOCUMENTS_REQUESTED' && (
          <Card className="mb-4 bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-300 mb-1">Additional Documents Needed</p>
                  <p className="text-sm text-blue-200/70">
                    We need some additional documents to complete your verification. 
                    Please check your email or contact support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Steps */}
        {userInfo.status !== 'REJECTED' && userInfo.status !== 'SUSPENDED' && steps.length > 0 && (
          <Card className="mb-4 bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-4">Verification Progress</h3>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      step.completed 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-white/5 text-gray-500"
                    )}>
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "font-medium",
                        step.completed ? "text-white" : "text-gray-500"
                      )}>
                        {step.label}
                      </p>
                    </div>
                    {step.completed && (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* What's Next */}
        {(userInfo.status === 'PENDING_APPROVAL' || userInfo.status === 'PENDING') && (
          <Card className="mb-4 bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3">What Happens Next?</h3>
              <div className="space-y-3 text-sm text-gray-400">
                {user.role === 'RIDER' ? (
                  <>
                    <p>1. Our team will review your submitted documents</p>
                    <p>2. You&apos;ll receive a call to schedule a physical inspection</p>
                    <p>3. During inspection, we&apos;ll verify your identity and vehicle</p>
                    <p>4. Upon approval, you&apos;ll receive your equipment</p>
                    <p>5. Your account will be activated!</p>
                  </>
                ) : (
                  <>
                    <p>1. Our team will review your business details</p>
                    <p>2. We&apos;ll verify your business location</p>
                    <p>3. You&apos;ll be contacted for any additional requirements</p>
                    <p>4. Upon approval, your account will be activated!</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Support */}
        <Card className="mb-4 bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <h3 className="font-semibold text-white mb-3">Need Help?</h3>
            <p className="text-sm text-gray-400 mb-4">
              If you have questions about your application status, our support team is here to help.
            </p>
            <MaskedCallButton
              userId={user.id}
              userType={user.role || 'CLIENT'}
              calleeId="SUPPORT_TEAM"
              calleeType="SUPPORT"
              calleeDisplayName="Smart Ride Support"
              variant="outline"
              className="w-full h-12 rounded-xl bg-[#1A1A24] border-white/10 text-white hover:bg-[#1E1E28] hover:border-[#00FF88]/30"
            />
          </CardContent>
        </Card>

        {/* Expected Timeline */}
        <Card className="bg-blue-500/10 border-blue-500/30 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-400" />
              <div>
                <p className="font-medium text-blue-300">Processing Time</p>
                <p className="text-sm text-blue-200/70">
                  Applications are typically processed within 1-3 business days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full h-12 text-gray-400 hover:text-white hover:bg-white/5 mb-8"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

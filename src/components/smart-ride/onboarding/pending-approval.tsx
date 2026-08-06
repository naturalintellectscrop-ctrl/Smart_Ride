'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Headphones,
  Store,
  Heart
} from 'lucide-react';
import { User, RIDER_ROLE_DESCRIPTIONS } from '../types';
import { MaskedCallButton } from '@/components/shared/masked-call-button';

interface PendingApprovalProps {
  user: User;
}

export function PendingApproval({ user }: PendingApprovalProps) {
  // Get role label based on user type
  const getRoleLabel = () => {
    switch (user.role) {
      case 'RIDER':
        switch (user.riderRoleType) {
          case 'SMART_BODA': return 'Smart Boda Rider';
          case 'SMART_CAR': return 'Smart Car Driver';
          case 'DELIVERY_PERSONNEL': return 'Delivery Personnel';
          default: return 'Rider';
        }
      case 'MERCHANT':
        return user.businessType ? `${user.businessType} Merchant` : 'Merchant';
      case 'PHARMACIST':
      case 'HEALTH_PROVIDER':
        return user.providerType ? `${user.providerType} Provider` : 'Health Provider';
      default:
        return 'User';
    }
  };

  // Get verification status
  const getVerificationStatus = () => {
    if (user.role === 'MERCHANT') {
      return user.merchantStatus || 'PENDING_APPROVAL';
    }
    if (user.role === 'PHARMACIST' || user.role === 'HEALTH_PROVIDER') {
      return user.providerStatus || 'PENDING';
    }
    return user.verificationStatus || 'PENDING_APPROVAL';
  };

  const status = getVerificationStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'APPROVED': return 'bg-[#98f6be]/20 text-[#005f3a] border-[#005f3a]/20';
      case 'REJECTED': return 'bg-red-50 text-red-600 border-red-200';
      case 'SUSPENDED': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'DOCUMENTS_REQUESTED': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-amber-50 text-amber-600 border-amber-200';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'SUSPENDED': return 'Suspended';
      case 'DOCUMENTS_REQUESTED': return 'Documents Required';
      default: return 'Pending Review';
    }
  };

  // Get role icon
  const getRoleIcon = () => {
    switch (user.role) {
      case 'MERCHANT':
        return <Store className="h-8 w-8 text-[#005f3a]" />;
      case 'PHARMACIST':
      case 'HEALTH_PROVIDER':
        return <Heart className="h-8 w-8 text-rose-600" />;
      default:
        return <Clock className="h-8 w-8 text-amber-600" />;
    }
  };

  // Steps based on role
  const getSteps = () => {
    if (user.role === 'MERCHANT') {
      return [
        { label: 'Application Submitted', completed: true },
        { label: 'Document Verification', completed: status === 'PENDING_APPROVAL' },
        { label: 'Business Verification', completed: false },
        { label: 'Account Activated', completed: status === 'APPROVED' },
      ];
    }
    if (user.role === 'PHARMACIST' || user.role === 'HEALTH_PROVIDER') {
      return [
        { label: 'Application Submitted', completed: true },
        { label: 'License Verification', completed: status === 'PENDING' },
        { label: 'Facility Inspection', completed: false },
        { label: 'Account Activated', completed: status === 'APPROVED' },
      ];
    }
    // Rider steps
    return [
      { label: 'Application Submitted', completed: true },
      { label: 'Document Verification', completed: true },
      { label: 'Physical Inspection', completed: false },
      { label: 'Equipment Issuance', completed: false },
      { label: 'Account Activated', completed: false },
    ];
  };

  const steps = getSteps();

  return (
    <div className="min-h-screen bg-[#f8f9fa] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white px-6 pt-8 pb-12 text-center rounded-b-3xl shadow-sm">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ 
            backgroundColor: status === 'REJECTED' ? '#fef2f2' : 
                           status === 'APPROVED' ? '#f0fdf4' :
                           '#fffbeb',
            boxShadow: status === 'REJECTED' ? '0 0 30px rgba(220, 38, 38, 0.1)' : 
                       status === 'APPROVED' ? '0 0 30px rgba(0, 95, 58, 0.1)' :
                       '0 0 30px rgba(217, 119, 6, 0.1)'
          }}
        >
          {status === 'APPROVED' ? (
            <CheckCircle className="h-10 w-10 text-[#005f3a]" />
          ) : status === 'REJECTED' ? (
            <AlertCircle className="h-10 w-10 text-red-500" />
          ) : (
            getRoleIcon()
          )}
        </div>
        <h1 className="text-2xl font-bold text-[#191c1d] mb-2 font-[family-name:var(--font-plus-jakarta)]">
          {status === 'APPROVED' ? 'Verification Complete!' : 
           status === 'REJECTED' ? 'Application Rejected' :
           status === 'DOCUMENTS_REQUESTED' ? 'Additional Documents Required' :
           'Application Under Review'}
        </h1>
        <p className="text-[#3f4941]">
          {status === 'APPROVED' ? 'Your account is now active' :
           status === 'REJECTED' ? 'Your application needs attention' :
           status === 'DOCUMENTS_REQUESTED' ? 'Please upload the required documents' :
           'We\'re reviewing your application'}
        </p>
      </div>

      <div className="px-6 -mt-6">
        {/* Status Card */}
        <Card className="mb-4 bg-white border border-[#bec9bf]/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f7a71]">Application Status</p>
                <p className="font-bold text-lg text-[#191c1d]">{getRoleLabel()}</p>
              </div>
              <Badge className={getStatusColor()}>
                {getStatusLabel()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Rejection Notice */}
        {status === 'REJECTED' && (
          <Card className="mb-4 bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-600 mb-1">Action Required</p>
                  <p className="text-sm text-red-500">
                    Your application was not approved. Please contact support for more information 
                    or reapply with updated documents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Requested Notice */}
        {status === 'DOCUMENTS_REQUESTED' && (
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileCheck className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-600 mb-1">Additional Documents Needed</p>
                  <p className="text-sm text-blue-500">
                    Please check your email or contact support for the list of required documents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved Notice */}
        {status === 'APPROVED' && (
          <Card className="mb-4 bg-[#f0fdf4] border-[#005f3a]/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-[#005f3a] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-[#005f3a] mb-1">You're All Set!</p>
                  <p className="text-sm text-[#3f4941]">
                    Your account has been verified. You can now start offering your services!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Steps */}
        {status !== 'REJECTED' && status !== 'APPROVED' && (
          <Card className="mb-4 bg-white border border-[#bec9bf]/30 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#191c1d] mb-4">Verification Progress</h3>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      step.completed 
                        ? "bg-[#98f6be]/20 text-[#005f3a]" 
                        : "bg-[#f3f4f5] text-[#6f7a71]"
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
                        step.completed ? "text-[#191c1d]" : "text-[#6f7a71]"
                      )}>
                        {step.label}
                      </p>
                    </div>
                    {step.completed && (
                      <CheckCircle className="h-5 w-5 text-[#005f3a]" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* What's Next */}
        {(status === 'PENDING_APPROVAL' || status === 'PENDING') && (
          <Card className="mb-4 bg-white border border-[#bec9bf]/30 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-[#191c1d] mb-3">What Happens Next?</h3>
              <div className="space-y-3 text-sm text-[#3f4941]">
                <p>1. Our team will review your submitted documents</p>
                <p>2. You&apos;ll receive a call to schedule verification</p>
                <p>3. Upon approval, you&apos;ll receive access to the platform</p>
                <p>4. Start offering your services!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Support */}
        <Card className="mb-4 bg-white border border-[#bec9bf]/30 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#191c1d] mb-3">Need Help?</h3>
            <p className="text-sm text-[#3f4941] mb-4">
              If you have questions about your application status, our support team is here to help.
            </p>
            <MaskedCallButton
              userId={user.id}
              // MaskedCallButton accepts only the three caller roles.
              userType={
                user.role === 'RIDER' || user.role === 'MERCHANT' ? user.role : 'CLIENT'
              }
              calleeId="SUPPORT_TEAM"
              calleeType="SUPPORT"
              calleeDisplayName="Smart Ride Support"
              variant="outline"
              className="w-full h-12 rounded-xl bg-white border border-[#bec9bf] text-[#191c1d] hover:bg-[#f3f4f5] hover:border-[#005f3a]/30"
            />
          </CardContent>
        </Card>

        {/* Expected Timeline */}
        <Card className="bg-blue-50 border-blue-200 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-600">Processing Time</p>
                <p className="text-sm text-blue-500">
                  Applications are typically processed within 1-3 business days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
      case 'APPROVED': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'REJECTED': return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'SUSPENDED': return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
      case 'DOCUMENTS_REQUESTED': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default: return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
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
        return <Store className="h-8 w-8 text-[#00FF88]" />;
      case 'PHARMACIST':
      case 'HEALTH_PROVIDER':
        return <Heart className="h-8 w-8 text-rose-400" />;
      default:
        return <Clock className="h-8 w-8 text-amber-400" />;
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
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#13131A] to-[#1A1A24] px-6 pt-8 pb-12 text-center rounded-b-3xl">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ 
            backgroundColor: status === 'REJECTED' ? 'rgba(255, 59, 92, 0.15)' : 
                           status === 'APPROVED' ? 'rgba(0, 255, 136, 0.15)' :
                           'rgba(255, 184, 0, 0.15)',
            boxShadow: status === 'REJECTED' ? '0 0 30px rgba(255, 59, 92, 0.3)' : 
                       status === 'APPROVED' ? '0 0 30px rgba(0, 255, 136, 0.3)' :
                       '0 0 30px rgba(255, 184, 0, 0.3)'
          }}
        >
          {status === 'APPROVED' ? (
            <CheckCircle className="h-10 w-10 text-[#00FF88]" />
          ) : status === 'REJECTED' ? (
            <AlertCircle className="h-10 w-10 text-red-400" />
          ) : (
            getRoleIcon()
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {status === 'APPROVED' ? 'Verification Complete!' : 
           status === 'REJECTED' ? 'Application Rejected' :
           status === 'DOCUMENTS_REQUESTED' ? 'Additional Documents Required' :
           'Application Under Review'}
        </h1>
        <p className="text-gray-400">
          {status === 'APPROVED' ? 'Your account is now active' :
           status === 'REJECTED' ? 'Your application needs attention' :
           status === 'DOCUMENTS_REQUESTED' ? 'Please upload the required documents' :
           'We\'re reviewing your application'}
        </p>
      </div>

      <div className="px-6 -mt-6">
        {/* Status Card */}
        <Card className="mb-4 bg-[#13131A] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Application Status</p>
                <p className="font-bold text-lg text-white">{getRoleLabel()}</p>
              </div>
              <Badge className={getStatusColor()}>
                {getStatusLabel()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Rejection Notice */}
        {status === 'REJECTED' && (
          <Card className="mb-4 bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-300 mb-1">Action Required</p>
                  <p className="text-sm text-red-200/70">
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
          <Card className="mb-4 bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-300 mb-1">Additional Documents Needed</p>
                  <p className="text-sm text-blue-200/70">
                    Please check your email or contact support for the list of required documents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved Notice */}
        {status === 'APPROVED' && (
          <Card className="mb-4 bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-300 mb-1">You're All Set!</p>
                  <p className="text-sm text-emerald-200/70">
                    Your account has been verified. You can now start offering your services!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Steps */}
        {status !== 'REJECTED' && status !== 'APPROVED' && (
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
        {(status === 'PENDING_APPROVAL' || status === 'PENDING') && (
          <Card className="mb-4 bg-[#13131A] border-white/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3">What Happens Next?</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>1. Our team will review your submitted documents</p>
                <p>2. You&apos;ll receive a call to schedule verification</p>
                <p>3. Upon approval, you&apos;ll receive access to the platform</p>
                <p>4. Start offering your services!</p>
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
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useUser } from './context/user-context';
import { WelcomeScreen } from './onboarding/welcome-screen';
import { MobileAuthScreen } from './onboarding/mobile-auth-screen';
import { RoleSelectionScreen } from './onboarding/role-selection-screen';
import { RiderRoleSelection } from './onboarding/rider-role-selection';
import { RiderRegistration } from './onboarding/rider-registration';
import { PendingApproval } from './onboarding/pending-approval';
import { ClientDashboard } from './dashboards/client-dashboard';
import { RiderDashboard } from './dashboards/rider-dashboard';
import { MerchantDashboard } from './dashboards/merchant-dashboard';
import { PharmacistDashboard } from './dashboards/pharmacist-dashboard';
import { UserRole, OnboardingStep, RiderRoleType, User } from './types';
import { MOBILE_APP_CONFIG, isMobileRole } from '@/lib/config/mobile-access';

/**
 * Smart Ride Mobile Application
 * 
 * This is the PUBLIC mobile application available on Google Play Store.
 * 
 * IMPORTANT: Admin access is NOT available in this app.
 * Admins must use admin.smartride.com
 */
export function SmartRideApp() {
  const { 
    user, 
    isLoading, 
    onboardingStep, 
    setUser, 
    setRole, 
    setOnboardingStep,
    setRiderRoleType,
    completeRiderRegistration,
    updateUser,
  } = useUser();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto flex items-center justify-center">
        <div className="text-center">
          <div 
            className="w-16 h-16 bg-[#00FF88]/15 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
            style={{ boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)' }}
          >
            <svg className="h-8 w-8 text-[#00FF88]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <p className="text-gray-400">Loading Smart Ride...</p>
        </div>
      </div>
    );
  }

  // Handle welcome screen -> auth transition
  const handleGetStarted = () => {
    setOnboardingStep('auth');
  };

  // Handle auth back button
  const handleAuthBack = () => {
    setOnboardingStep('welcome');
  };

  // Handle auth success (PHONE NUMBER AUTH ONLY)
  const handleAuthSuccess = (userData: { phone?: string; name: string; email?: string; photoURL?: string; uid?: string; idToken?: string }) => {
    const newUser: User = {
      id: userData.uid || `user_${Date.now()}`,
      phone: userData.phone,
      email: userData.email,
      name: userData.name,
      avatarUrl: userData.photoURL,
      role: null,
      isNewUser: true,
    };
    setUser(newUser);
    setOnboardingStep('role-selection');
  };

  // Handle role selection back
  const handleRoleBack = () => {
    setOnboardingStep('auth');
  };

  // Handle role selection - ONLY MOBILE ROLES ALLOWED
  const handleRoleSelect = (role: UserRole) => {
    // Prevent admin roles in mobile app
    if (!isMobileRole(role)) {
      console.error('Admin roles are not available in mobile app');
      return;
    }
    
    if (role === 'RIDER') {
      // For riders, go to rider role selection first
      setRole(role);
      setOnboardingStep('rider-role-selection');
    } else if (role === 'MERCHANT') {
      // For merchants, set status to pending and show pending approval
      setRole(role);
      updateUser({ merchantStatus: 'PENDING_APPROVAL' });
      setOnboardingStep('pending-approval');
    } else if (role === 'PHARMACIST') {
      // For pharmacists/health providers, set status to pending
      setRole(role);
      updateUser({ providerStatus: 'PENDING' });
      setOnboardingStep('pending-approval');
    } else {
      // For clients, go directly to dashboard
      setRole(role);
      setOnboardingStep('dashboard');
    }
  };

  // Handle rider role type selection back
  const handleRiderRoleTypeBack = () => {
    setOnboardingStep('role-selection');
  };

  // Handle rider role type selection
  const handleRiderRoleTypeSelect = (roleType: RiderRoleType) => {
    setRiderRoleType(roleType);
  };

  // Handle rider registration complete
  const handleRiderRegistrationComplete = (userData: Partial<User>) => {
    completeRiderRegistration(userData);
  };

  // Handle rider registration back
  const handleRiderRegistrationBack = () => {
    setOnboardingStep('rider-role-selection');
  };

  // Render based on onboarding step
  const renderScreen = () => {
    switch (onboardingStep) {
      case 'welcome':
        return <WelcomeScreen onGetStarted={handleGetStarted} />;
      
      case 'auth':
        return (
          <MobileAuthScreen 
            onBack={handleAuthBack} 
            onAuthSuccess={handleAuthSuccess} 
          />
        );
      
      case 'role-selection':
        return (
          <RoleSelectionScreen 
            onBack={handleRoleBack} 
            onRoleSelect={handleRoleSelect}
            currentRole={user?.role}
          />
        );
      
      case 'rider-role-selection':
        return (
          <RiderRoleSelection 
            onBack={handleRiderRoleTypeBack}
            onRoleSelect={handleRiderRoleTypeSelect}
          />
        );

      case 'rider-registration':
        return (
          <RiderRegistration 
            riderRole={user?.riderRoleType || 'DELIVERY_PERSONNEL'}
            onBack={handleRiderRegistrationBack}
            onComplete={handleRiderRegistrationComplete}
          />
        );

      case 'pending-approval':
        return (
          <PendingApproval 
            user={user!}
          />
        );
      
      case 'dashboard':
        if (!user?.role) {
          return (
            <RoleSelectionScreen 
              onBack={handleRoleBack} 
              onRoleSelect={handleRoleSelect}
              currentRole={null}
            />
          );
        }
        
        // Render the appropriate dashboard based on role
        // ONLY MOBILE ROLES - NO ADMIN DASHBOARD
        switch (user.role) {
          case 'CLIENT':
            return <ClientDashboard user={user} />;
          case 'RIDER':
            // Check if rider is approved
            if (user.verificationStatus !== 'APPROVED') {
              return (
                <PendingApproval 
                  user={user}
                />
              );
            }
            return <RiderDashboard user={user} />;
          case 'MERCHANT':
            // Check if merchant is approved
            if (user.merchantStatus !== 'APPROVED') {
              return (
                <PendingApproval 
                  user={user}
                />
              );
            }
            return <MerchantDashboard user={user} />;
          case 'PHARMACIST':
            // Check if health provider is approved
            if (user.providerStatus !== 'APPROVED') {
              return (
                <PendingApproval 
                  user={user}
                />
              );
            }
            return <PharmacistDashboard user={user} />;
          default:
            // Admin roles should never reach here in mobile app
            return (
              <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-white mb-4">Admin access is not available in the mobile app.</p>
                  <p className="text-gray-400 text-sm">
                    Please use admin.smartride.com
                  </p>
                </div>
              </div>
            );
        }
      
      default:
        return <WelcomeScreen onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {renderScreen()}
    </div>
  );
}

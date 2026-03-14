'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { User, UserRole, OnboardingStep, RiderRoleType, RiderVerificationStatus, MerchantVerificationStatus, HealthProviderVerificationStatus } from '../types';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  onboardingStep: OnboardingStep;
  isAuthenticated: boolean;
  hasRole: boolean;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  switchRole: (role: UserRole) => void;
  setRiderRoleType: (roleType: RiderRoleType) => void;
  setVerificationStatus: (status: RiderVerificationStatus) => void;
  setMerchantStatus: (status: MerchantVerificationStatus) => void;
  setProviderStatus: (status: HealthProviderVerificationStatus) => void;
  completeRiderRegistration: (data: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'smart_ride_user';

// Lazy initialization function to avoid React cascading render issues
const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    
    // Validate that the stored user has required fields
    if (!parsed || !parsed.id || !parsed.name) {
      // Invalid data, clear it
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

// Determine onboarding step from user state
const getOnboardingStep = (user: User | null): OnboardingStep => {
  if (!user) return 'welcome';
  if (!user.role) return 'role-selection';
  
  // Rider flow
  if (user.role === 'RIDER') {
    if (!user.riderRoleType) return 'rider-role-selection';
    if (user.verificationStatus === 'PENDING_APPROVAL') return 'pending-approval';
    if (user.verificationStatus === 'PENDING_REGISTRATION') return 'rider-registration';
    if (user.verificationStatus !== 'APPROVED') return 'pending-approval';
    return 'dashboard';
  }
  
  // Merchant flow - check verification status
  if (user.role === 'MERCHANT') {
    if (!user.merchantStatus || user.merchantStatus === 'PENDING_APPROVAL') {
      return 'pending-approval';
    }
    if (user.merchantStatus === 'REJECTED' || user.merchantStatus === 'SUSPENDED') {
      return 'pending-approval';
    }
    return 'dashboard';
  }
  
  // Health Provider / Pharmacist flow - check verification status
  if (user.role === 'PHARMACIST') {
    if (!user.providerStatus || user.providerStatus === 'PENDING') {
      return 'pending-approval';
    }
    if (user.providerStatus === 'REJECTED' || user.providerStatus === 'SUSPENDED') {
      return 'pending-approval';
    }
    return 'dashboard';
  }
  
  // Client - goes directly to dashboard
  return 'dashboard';
};

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  // Use lazy initialization for both state values to avoid cascading renders
  const [user, setUserState] = useState<User | null>(getInitialUser);
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(() => 
    getOnboardingStep(getInitialUser())
  );

  // Persist user to localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    setOnboardingStep(getOnboardingStep(newUser));
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      return updated;
    });
  }, []);

  const setRole = useCallback((role: UserRole) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, role, isNewUser: false };
      setOnboardingStep(getOnboardingStep(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    localStorage.removeItem(STORAGE_KEY);
    setOnboardingStep('welcome');
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    setUserState(prev => {
      if (!prev) return prev;
      // Reset role-specific fields when switching roles
      return { 
        ...prev, 
        role: newRole,
        riderRoleType: undefined,
        verificationStatus: undefined,
        merchantStatus: undefined,
        providerStatus: undefined,
        vehicleType: undefined,
        documents: undefined,
      };
    });
  }, []);

  const setRiderRoleType = useCallback((roleType: RiderRoleType) => {
    setUserState(prev => {
      if (!prev) return prev;
      return { ...prev, riderRoleType: roleType };
    });
    setOnboardingStep('rider-registration');
  }, []);

  const setVerificationStatus = useCallback((status: RiderVerificationStatus) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, verificationStatus: status };
      setOnboardingStep(getOnboardingStep(updated));
      return updated;
    });
  }, []);

  const setMerchantStatus = useCallback((status: MerchantVerificationStatus) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, merchantStatus: status };
      setOnboardingStep(getOnboardingStep(updated));
      return updated;
    });
  }, []);

  const setProviderStatus = useCallback((status: HealthProviderVerificationStatus) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, providerStatus: status };
      setOnboardingStep(getOnboardingStep(updated));
      return updated;
    });
  }, []);

  const completeRiderRegistration = useCallback((data: Partial<User>) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...data, verificationStatus: 'PENDING_APPROVAL' as RiderVerificationStatus };
      setOnboardingStep('pending-approval');
      return updated;
    });
  }, []);

  const value: UserContextType = useMemo(() => ({
    user,
    isLoading,
    onboardingStep,
    isAuthenticated: !!user,
    hasRole: !!user?.role,
    setUser,
    updateUser,
    setRole,
    logout,
    setOnboardingStep,
    switchRole,
    setRiderRoleType,
    setVerificationStatus,
    setMerchantStatus,
    setProviderStatus,
    completeRiderRegistration,
  }), [user, isLoading, onboardingStep, setUser, updateUser, setRole, logout, switchRole, setRiderRoleType, setVerificationStatus, setMerchantStatus, setProviderStatus, completeRiderRegistration]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { User, UserRole, OnboardingStep, RiderRoleType, RiderVerificationStatus } from '../types';

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
  completeRiderRegistration: (data: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'smart_ride_user';

// Lazy initialization function to avoid React cascading render issues
const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Determine onboarding step from user state
const getOnboardingStep = (user: User | null): OnboardingStep => {
  if (!user) return 'welcome';
  if (!user.role) return 'role-selection';
  // If rider hasn't selected their role type yet
  if (user.role === 'RIDER' && !user.riderRoleType) return 'rider-role-selection';
  // If rider is pending approval
  if (user.role === 'RIDER' && user.verificationStatus === 'PENDING_APPROVAL') return 'pending-approval';
  return 'dashboard';
};

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  // Use lazy initialization for both state values to avoid cascading renders
  const [user, setUserState] = useState<User | null>(getInitialUser);
  const [isLoading, setIsLoading] = useState(false); // No longer need loading state with lazy init
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
      setOnboardingStep('dashboard');
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
      // Reset rider-specific fields when switching away from rider
      if (prev.role === 'RIDER' && newRole !== 'RIDER') {
        return { 
          ...prev, 
          role: newRole,
          riderRoleType: undefined,
          verificationStatus: undefined,
          vehicleType: undefined,
          documents: undefined,
        };
      }
      return { ...prev, role: newRole };
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
      return { ...prev, verificationStatus: status };
    });
  }, []);

  const completeRiderRegistration = useCallback((data: Partial<User>) => {
    setUserState(prev => {
      if (!prev) return prev;
      return { ...prev, ...data, isNewUser: false };
    });
    setOnboardingStep('pending-approval');
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
    completeRiderRegistration,
  }), [user, isLoading, onboardingStep, setUser, updateUser, setRole, logout, switchRole, setRiderRoleType, setVerificationStatus, completeRiderRegistration]);

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

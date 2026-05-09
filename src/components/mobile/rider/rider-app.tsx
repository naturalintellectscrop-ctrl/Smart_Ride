'use client';

import { useState, useCallback } from 'react';
import { RiderDashboard } from './screens/rider-dashboard';
import { RiderTasks } from './screens/rider-tasks';
import { RiderEarnings } from './screens/rider-earnings';
import { RiderProfile } from './screens/rider-profile';
import { RoleSelectionScreen } from './onboarding/role-selection';
import { PersonalInfoScreen } from './onboarding/personal-info';
import { DocumentUploadScreen } from './onboarding/document-upload';
import { VehicleInfoScreen } from './onboarding/vehicle-info';
import { PendingApprovalScreen } from './onboarding/pending-approval';
import { Home, ClipboardList, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileCard } from '../shared/mobile-components';
import type { PersonalInfoData } from './onboarding/personal-info';
import type { DocumentData } from './onboarding/document-upload';
import type { VehicleData } from './onboarding/vehicle-info';

type RiderScreen = 'home' | 'tasks' | 'earnings' | 'profile';
type OnboardingStep = 'role-selection' | 'personal-info' | 'documents' | 'vehicle' | 'pending' | 'dashboard';
type RiderRole = 'SMART_BODA_RIDER' | 'SMART_CAR_DRIVER' | 'DELIVERY_PERSONNEL';
type RiderStatus = 'NONE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

// Helper functions to get initial values from localStorage
const getInitialRiderStatus = (): RiderStatus => {
  if (typeof window === 'undefined') return 'NONE';
  return (localStorage.getItem('rider_verification_status') as RiderStatus) || 'NONE';
};

const getInitialRiderId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rider_id');
};

const getInitialRole = (): RiderRole | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rider_role') as RiderRole;
};

const getInitialOnboardingStep = (status: RiderStatus): OnboardingStep => {
  switch (status) {
    case 'PENDING_APPROVAL':
    case 'SUSPENDED':
      return 'pending';
    case 'APPROVED':
      return 'dashboard';
    default:
      return 'role-selection';
  }
};

export function RiderApp() {
  const [activeTab, setActiveTab] = useState<RiderScreen>('home');
  const [riderStatus, setRiderStatus] = useState<RiderStatus>(getInitialRiderStatus);
  const [riderId, setRiderId] = useState<string | null>(getInitialRiderId);
  const [selectedRole, setSelectedRole] = useState<RiderRole | null>(getInitialRole);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(() => 
    getInitialOnboardingStep(getInitialRiderStatus())
  );
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData | null>(null);
  const [documents, setDocuments] = useState<DocumentData | null>(null);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);

  // Handle role selection
  const handleRoleSelected = useCallback((role: RiderRole) => {
    setSelectedRole(role);
    localStorage.setItem('rider_role', role);
    setOnboardingStep('personal-info');
  }, []);

  // Handle personal info completion
  const handlePersonalInfoComplete = useCallback((info: PersonalInfoData) => {
    setPersonalInfo(info);
    setOnboardingStep('documents');
  }, []);

  // Submit registration
  const submitRegistration = useCallback(() => {
    const mockRiderId = 'rider_' + Date.now().getTime();
    
    setRiderId(mockRiderId);
    localStorage.setItem('rider_id', mockRiderId);
    localStorage.setItem('rider_verification_status', 'PENDING_APPROVAL');
    
    setRiderStatus('PENDING_APPROVAL');
    setOnboardingStep('pending');
  }, []);

  // Handle documents completion
  const handleDocumentsComplete = useCallback((docs: DocumentData) => {
    setDocuments(docs);
    setOnboardingStep('vehicle');
  }, []);

  // Handle vehicle completion
  const handleVehicleComplete = useCallback((vehicleData: VehicleData) => {
    setVehicle(vehicleData);
    submitRegistration();
  }, [submitRegistration]);

  // Handle approval
  const handleApproved = useCallback(() => {
    setRiderStatus('APPROVED');
    localStorage.setItem('rider_verification_status', 'APPROVED');
    setOnboardingStep('dashboard');
  }, []);

  const tabs = [
    { id: 'home' as RiderScreen, label: 'Home', icon: <Home className="h-5 w-5" /> },
    { id: 'tasks' as RiderScreen, label: 'Tasks', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'earnings' as RiderScreen, label: 'Earnings', icon: <Wallet className="h-5 w-5" /> },
    { id: 'profile' as RiderScreen, label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];

  // Render onboarding screens
  if (onboardingStep === 'role-selection') {
    return <RoleSelectionScreen onSelectRole={handleRoleSelected} />;
  }

  if (onboardingStep === 'personal-info' && selectedRole) {
    return (
      <PersonalInfoScreen
        role={selectedRole}
        onSubmit={handlePersonalInfoComplete}
        onBack={() => setOnboardingStep('role-selection')}
      />
    );
  }

  if (onboardingStep === 'documents' && selectedRole) {
    return (
      <DocumentUploadScreen
        role={selectedRole}
        onSubmit={handleDocumentsComplete}
        onBack={() => setOnboardingStep('personal-info')}
      />
    );
  }

  if (onboardingStep === 'vehicle' && selectedRole) {
    return (
      <VehicleInfoScreen
        role={selectedRole}
        onSubmit={handleVehicleComplete}
        onBack={() => setOnboardingStep('documents')}
      />
    );
  }

  if (onboardingStep === 'pending') {
    return (
      <PendingApprovalScreen
        riderId={riderId}
        onNavigate={(screen: string) => {
          if (screen === 'dashboard') {
            handleApproved();
          }
        }}
        onApproved={handleApproved}
      />
    );
  }

  // Main dashboard
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <RiderDashboard />;
      case 'tasks':
        return <RiderTasks />;
      case 'earnings':
        return <RiderEarnings />;
      case 'profile':
        return <RiderProfile />;
      default:
        return <RiderDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Status Bar Simulation */}
      <div className="bg-emerald-600 h-6 flex items-center justify-center">
        <span className="text-white text-xs font-medium">Smart Rider</span>
      </div>

      {/* Main Content */}
      <main className="pb-20">
        {renderScreen()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50 max-w-md mx-auto safe-area-bottom">
        <div className="flex justify-around items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[64px]",
                activeTab === tab.id
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

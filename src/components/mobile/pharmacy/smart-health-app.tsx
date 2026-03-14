'use client';

import { useState, useCallback } from 'react';
import { PharmacyHome } from './screens/pharmacy-home';
import { PharmacyOrders } from './screens/pharmacy-orders';
import { PharmacyPrescriptions } from './screens/pharmacy-prescriptions';
import { PharmacyCatalog } from './screens/pharmacy-catalog';
import { PharmacyProfile } from './screens/pharmacy-profile';
import { PharmacySettings } from './screens/pharmacy-settings';
import { ProviderRegistrationScreen } from '../health-provider/screens/provider-registration';
import { ProviderPendingScreen } from '../health-provider/screens/provider-pending';
import { 
  Home, 
  Package, 
  FileText, 
  Pill, 
  User,
  Heart,
  Settings,
  Download,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PharmacyScreen = 'home' | 'orders' | 'prescriptions' | 'catalog' | 'profile' | 'settings';
type OnboardingStep = 'registration' | 'pending' | 'completed';

type ProviderStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'UNDER_REVIEW' | 'DOCUMENTS_REQUESTED';

const navItems = [
  { id: 'home' as PharmacyScreen, label: 'Home', icon: Home },
  { id: 'orders' as PharmacyScreen, label: 'Orders', icon: Package },
  { id: 'prescriptions' as PharmacyScreen, label: 'Rx', icon: FileText },
  { id: 'catalog' as PharmacyScreen, label: 'Catalog', icon: Pill },
  { id: 'profile' as PharmacyScreen, label: 'Profile', icon: User },
];

// Get initial provider status from localStorage
const getInitialProviderStatus = (): ProviderStatus => {
  if (typeof window === 'undefined') return 'NONE';
  return (localStorage.getItem('provider_verification_status') as ProviderStatus) || 'NONE';
};

// Get initial provider ID from localStorage
const getInitialProviderId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('provider_id');
};

// Determine onboarding step based on status
const getOnboardingStep = (status: ProviderStatus): OnboardingStep => {
  switch (status) {
    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'DOCUMENTS_REQUESTED':
    case 'SUSPENDED':
      return 'pending';
    case 'APPROVED':
      return 'completed';
    default:
      return 'registration';
  }
};

export function SmartHealthApp() {
  const [activeScreen, setActiveScreen] = useState<PharmacyScreen>('home');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>(getInitialProviderStatus);
  const [providerId, setProviderId] = useState<string | null>(getInitialProviderId);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(true);

  // Determine which onboarding step to show
  const onboardingStep = getOnboardingStep(providerStatus);

  // Handle registration completion
  const handleRegistrationComplete = useCallback((status: string, id: string) => {
    setProviderStatus(status as ProviderStatus);
    setProviderId(id);
    localStorage.setItem('provider_verification_status', status);
    localStorage.setItem('provider_id', id);
  }, []);

  // Handle approval - transition to pharmacy dashboard
  const handleApproved = useCallback(() => {
    setProviderStatus('APPROVED');
    localStorage.setItem('provider_verification_status', 'APPROVED');
  }, []);

  // Navigate within pending screen
  const handlePendingNavigate = useCallback((screen: string) => {
    // When navigating from pending screen, it means approved
    if (screen === 'dashboard') {
      handleApproved();
    }
  }, [handleApproved]);

  // REGISTRATION STEP - Show registration form
  if (onboardingStep === 'registration') {
    return (
      <ProviderRegistrationScreen
        onComplete={handleRegistrationComplete}
      />
    );
  }

  // PENDING STEP - Show verification status
  if (onboardingStep === 'pending') {
    return (
      <ProviderPendingScreen
        providerId={providerId}
        onNavigate={handlePendingNavigate}
        onApproved={handleApproved}
      />
    );
  }

  // COMPLETED STEP - Show main pharmacy dashboard
  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Status Bar */}
      <div className="bg-rose-600 h-6 flex items-center justify-between px-4">
        <span className="text-white text-xs font-medium flex items-center gap-1">
          <Heart className="h-3 w-3" />
          Smart Health - Pharmacy Partner
        </span>
        <span className="text-white/80 text-xs">v1.0.0</span>
      </div>
      
      {/* Download Prompt Banner */}
      {showDownloadPrompt && (
        <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Download the App</p>
            <p className="text-rose-100 text-xs truncate">Get notifications and faster performance</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-white text-rose-600 rounded-lg text-xs font-medium">
              Install
            </button>
            <button 
              onClick={() => setShowDownloadPrompt(false)}
              className="w-6 h-6 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-white/80" />
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="pb-20">
        {activeScreen === 'home' && <PharmacyHome onNavigate={setActiveScreen} />}
        {activeScreen === 'orders' && <PharmacyOrders />}
        {activeScreen === 'prescriptions' && <PharmacyPrescriptions />}
        {activeScreen === 'catalog' && <PharmacyCatalog />}
        {activeScreen === 'profile' && <PharmacyProfile />}
        {activeScreen === 'settings' && <PharmacySettings />}
      </main>

      {/* Floating Settings Button */}
      <button
        onClick={() => setActiveScreen('settings')}
        className={cn(
          "fixed bottom-24 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 z-40",
          activeScreen === 'settings' && "bg-rose-100 border-rose-300"
        )}
      >
        <Settings className={cn(
          "h-5 w-5 text-gray-600",
          activeScreen === 'settings' && "text-rose-600"
        )} />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-2 py-2 z-50 safe-area-bottom">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={cn(
                  "flex flex-col items-center py-2 px-3 rounded-xl transition-all",
                  isActive 
                    ? "bg-rose-50 text-rose-600" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className={cn("h-6 w-6", isActive && "text-rose-600")} />
                <span className={cn("text-xs mt-1 font-medium", isActive && "text-rose-600")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

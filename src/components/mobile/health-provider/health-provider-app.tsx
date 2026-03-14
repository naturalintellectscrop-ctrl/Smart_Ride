'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProviderRegistrationScreen } from './screens/provider-registration';
import { ProviderPendingScreen } from './screens/provider-pending';
import { ProviderDashboardScreen } from './screens/provider-dashboard';
import { ProviderOrdersScreen } from './screens/provider-orders';
import { ProviderCatalogScreen } from './screens/provider-catalog';
import { ProviderSettingsScreen } from './screens/provider-settings';
import { ProviderProfileScreen } from './screens/provider-profile';

type Screen = 
  | 'register' 
  | 'pending' 
  | 'dashboard' 
  | 'orders' 
  | 'catalog' 
  | 'settings'
  | 'profile';

type ProviderStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'UNDER_REVIEW' | 'DOCUMENTS_REQUESTED';

// Helper functions to get initial values from localStorage
function getStoredProviderStatus(): ProviderStatus {
  if (typeof window === 'undefined') return 'NONE';
  return (localStorage.getItem('provider_verification_status') as ProviderStatus) || 'NONE';
}

function getStoredProviderId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('provider_id');
}

function getInitialScreen(status: ProviderStatus): Screen {
  switch (status) {
    case 'PENDING':
    case 'DOCUMENTS_REQUESTED':
    case 'UNDER_REVIEW':
      return 'pending';
    case 'APPROVED':
      return 'dashboard';
    case 'REJECTED':
      return 'register';
    case 'SUSPENDED':
      return 'pending';
    default:
      return 'register';
  }
}

interface HealthProviderAppProps {
  onBack?: () => void;
  initialProviderStatus?: ProviderStatus;
  onOpenPharmacyApp?: () => void; // Callback to open pharmacy app
}

export function HealthProviderApp({ 
  onBack, 
  initialProviderStatus,
  onOpenPharmacyApp 
}: HealthProviderAppProps) {
  // Use stored status if no initial status provided
  const effectiveStatus = initialProviderStatus || getStoredProviderStatus();
  
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => getInitialScreen(effectiveStatus));
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>(effectiveStatus);
  const [providerId, setProviderId] = useState<string | null>(() => getStoredProviderId());

  const handleRegistrationComplete = useCallback((status: string, id: string) => {
    setProviderStatus(status as ProviderStatus);
    setProviderId(id);
    
    // Store in localStorage for persistence
    localStorage.setItem('provider_verification_status', status);
    localStorage.setItem('provider_id', id);
    
    if (status === 'PENDING' || status === 'UNDER_REVIEW' || status === 'DOCUMENTS_REQUESTED') {
      setCurrentScreen('pending');
    } else if (status === 'APPROVED') {
      setCurrentScreen('dashboard');
    }
  }, []);

  const handleNavigate = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
  }, []);

  // Handler for when provider is approved and wants to open pharmacy app
  const handleApproved = useCallback(() => {
    setProviderStatus('APPROVED');
    localStorage.setItem('provider_verification_status', 'APPROVED');
    
    // If callback provided, use it to open pharmacy app
    if (onOpenPharmacyApp) {
      onOpenPharmacyApp();
    } else {
      // Default behavior: go to dashboard
      setCurrentScreen('dashboard');
    }
  }, [onOpenPharmacyApp]);

  // Registration Screen
  if (currentScreen === 'register') {
    return (
      <ProviderRegistrationScreen
        onBack={onBack}
        onComplete={handleRegistrationComplete}
      />
    );
  }

  // Pending Verification Screen
  if (currentScreen === 'pending') {
    return (
      <ProviderPendingScreen
        onBack={onBack}
        providerId={providerId}
        onNavigate={handleNavigate}
        onApproved={handleApproved}
      />
    );
  }

  // Main Provider Dashboard (Logged In)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bottom Navigation */}
      <ProviderBottomNav 
        currentScreen={currentScreen} 
        onNavigate={handleNavigate}
        onOpenPharmacyApp={onOpenPharmacyApp}
      />

      {/* Main Content */}
      <main className="pb-20">
        {currentScreen === 'dashboard' && (
          <ProviderDashboardScreen 
            providerId={providerId} 
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen === 'orders' && (
          <ProviderOrdersScreen providerId={providerId} />
        )}
        {currentScreen === 'catalog' && (
          <ProviderCatalogScreen providerId={providerId} />
        )}
        {currentScreen === 'settings' && (
          <ProviderSettingsScreen 
            providerId={providerId}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen === 'profile' && (
          <ProviderProfileScreen 
            providerId={providerId}
            onNavigate={handleNavigate}
          />
        )}
      </main>
    </div>
  );
}

// Bottom Navigation Component
function ProviderBottomNav({ 
  currentScreen, 
  onNavigate,
  onOpenPharmacyApp
}: { 
  currentScreen: Screen; 
  onNavigate: (screen: Screen) => void;
  onOpenPharmacyApp?: () => void;
}) {
  const navItems = [
    { id: 'dashboard' as Screen, label: 'Home', icon: '🏠' },
    { id: 'orders' as Screen, label: 'Orders', icon: '📋' },
    { id: 'catalog' as Screen, label: 'Catalog', icon: '💊' },
    { id: 'settings' as Screen, label: 'Settings', icon: '⚙️' },
    { id: 'profile' as Screen, label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto px-2">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                currentScreen === item.id
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

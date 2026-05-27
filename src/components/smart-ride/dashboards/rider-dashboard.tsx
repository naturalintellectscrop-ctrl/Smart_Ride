'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { fetchWithRetry } from '@/lib/api/client-retry';
import { socketService } from '@/services/socket';
import { User } from '../types';
import { NotificationProvider, useNotifications } from '../context/notification-context';
import { RiderHome } from './tabs/rider-home';
import { RiderTasks } from './tabs/rider-tasks';
import { RiderEarnings } from './tabs/rider-earnings';
import { RiderMessages } from './tabs/rider-messages';
import { RiderProfile } from './tabs/rider-profile';
import {
  Home,
  ClipboardList,
  Wallet,
  MessageSquare,
  User as UserIcon,
  Bike
} from 'lucide-react';

interface RiderDashboardProps {
  user: User;
}

type RiderTab = 'home' | 'tasks' | 'earnings' | 'messages' | 'profile';

const tabs: { id: RiderTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { id: 'tasks', label: 'Tasks', icon: <ClipboardList className="h-5 w-5" /> },
  { id: 'earnings', label: 'Earnings', icon: <Wallet className="h-5 w-5" /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
  { id: 'profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" /> },
];

// Helper to get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function RiderDashboardContent({ user }: RiderDashboardProps) {
  const [activeTab, setActiveTab] = useState<RiderTab>('home');
  const [isOnline, setIsOnline] = useState(false);
  const { unreadCount, setUnreadCount } = useNotifications();

  // Fetch unread notification count on mount (with retry)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const result = await fetchWithRetry('/api/notifications?unreadOnly=true&limit=0&XTransformPort=3000', {
          headers: getAuthHeaders(),
          maxRetries: 3,
        });
        if (result.ok) {
          const data = result.data as { pagination?: { total?: number } } | null;
          // The pagination total gives us the unread count
          const total = data?.pagination?.total || 0;
          setUnreadCount(total);
        }
      } catch (err) {
        console.error('Error fetching unread notification count:', err);
      }
    };

    fetchUnreadCount();
  }, [setUnreadCount]);

  // Task state restoration on socket reconnect
  // When the socket reconnects, refresh notification count.
  // Each tab (RiderHome, RiderTasks, RiderEarnings) has its own socket-driven
  // refresh + fallback polling logic that will auto-update their data.
  useEffect(() => {
    const handleReconnect = () => {
      console.log('[RiderDashboard] Socket reconnected, refreshing data');
      // Refetch notification count on reconnect
      const fetchUnreadCount = async () => {
        try {
          const result = await fetchWithRetry('/api/notifications?unreadOnly=true&limit=0&XTransformPort=3000', {
            headers: getAuthHeaders(),
            maxRetries: 3,
          });
          if (result.ok) {
            const data = result.data as { pagination?: { total?: number } } | null;
            const total = data?.pagination?.total || 0;
            setUnreadCount(total);
          }
        } catch {
          // Silently fail — tabs handle their own refresh
        }
      };
      fetchUnreadCount();
    };

    const unsubscribe = socketService.on('connect', handleReconnect);
    return () => {
      unsubscribe();
    };
  }, [setUnreadCount]);

  const handleBellClick = () => {
    setActiveTab('messages');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <RiderHome isOnline={isOnline} onToggleOnline={() => setIsOnline(!isOnline)} onBellClick={handleBellClick} riderName={user.name} />;
      case 'tasks':
        return <RiderTasks />;
      case 'earnings':
        return <RiderEarnings />;
      case 'messages':
        return <RiderMessages />;
      case 'profile':
        return <RiderProfile />;
      default:
        return <RiderHome isOnline={isOnline} onToggleOnline={() => setIsOnline(!isOnline)} onBellClick={handleBellClick} riderName={user.name} />;
    }
  };

  const getRoleGradient = () => {
    switch (user.riderRoleType) {
      case 'SMART_BODA': return 'from-emerald-500 to-teal-600';
      case 'SMART_CAR': return 'from-blue-500 to-indigo-600';
      case 'DELIVERY_PERSONNEL': return 'from-orange-500 to-red-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D12] max-w-md mx-auto relative">
      {/* Status Bar */}
      <div className={cn("h-6 flex items-center justify-center sticky top-0 z-50 bg-gradient-to-r", getRoleGradient())}>
        <div className="flex items-center gap-2">
          <Bike className="h-3 w-3 text-white" />
          <span className="text-white text-xs font-medium">Smart Ride - Rider</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#13131A]/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 z-50 max-w-md mx-auto">
        <div className="flex justify-around items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[56px] relative",
                activeTab === tab.id
                  ? "text-[#00FF88] bg-[#00FF88]/15"
                  : "text-gray-500 hover:bg-white/5"
              )}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-1 right-1 w-5 h-5 bg-[#FF3B5C] rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function RiderDashboard({ user }: RiderDashboardProps) {
  return (
    <NotificationProvider initialUnreadCount={0}>
      <RiderDashboardContent user={user} />
    </NotificationProvider>
  );
}

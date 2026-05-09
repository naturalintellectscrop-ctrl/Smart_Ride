'use client';

import { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Cloud, 
  Check, 
  Clock,
  ChevronDown,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: number | null;
  pendingActionsCount: number;
  isSyncing: boolean;
  lastError?: string;
}

// Simple hook for sync status
function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(() => ({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    lastSyncAt: null,
    pendingActionsCount: 0,
    isSyncing: false,
  }));

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

// ==========================================
// Connection Status Banner
// ==========================================

export function ConnectionStatusBanner() {
  const syncStatus = useSyncStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show banner when offline or when there are pending actions
  const showBanner = (!syncStatus.isOnline || syncStatus.pendingActionsCount > 0) && !dismissed;

  if (!showBanner) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-[60] max-w-md mx-auto transition-all duration-300",
      isExpanded ? "bg-white shadow-lg" : "bg-amber-500"
    )}>
      {!isExpanded ? (
        // Collapsed banner
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-4 py-2 flex items-center justify-between text-white"
        >
          <div className="flex items-center gap-2">
            {!syncStatus.isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">You're offline</span>
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {syncStatus.pendingActionsCount} action{syncStatus.pendingActionsCount !== 1 ? 's' : ''} pending sync
                </span>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </button>
      ) : (
        // Expanded banner
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Connection Status</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="h-5 w-5 rotate-180" />
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Status Items */}
          <div className="space-y-3">
            {/* Online Status */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                syncStatus.isOnline ? "bg-green-100" : "bg-amber-100"
              )}>
                {syncStatus.isOnline ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {syncStatus.isOnline ? 'Connected' : 'Offline'}
                </p>
                <p className="text-xs text-gray-500">
                  {syncStatus.isOnline 
                    ? 'Your actions will sync automatically'
                    : 'Your data is saved locally and will sync when connected'
                  }
                </p>
              </div>
            </div>

            {/* Pending Actions */}
            {syncStatus.pendingActionsCount > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {syncStatus.pendingActionsCount} pending action{syncStatus.pendingActionsCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    Will sync automatically when online
                  </p>
                </div>
              </div>
            )}

            {/* Last Sync */}
            {syncStatus.lastSyncAt && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Last synced</p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(syncStatus.lastSyncAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sync Button */}
          {syncStatus.isOnline && syncStatus.pendingActionsCount > 0 && (
            <button
              onClick={() => {/* trigger manual sync */}}
              className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Compact Status Indicator
// ==========================================

interface OfflineIndicatorProps {
  variant?: 'badge' | 'icon' | 'full';
  className?: string;
}

export function OfflineIndicator({ variant = 'badge', className }: OfflineIndicatorProps) {
  const syncStatus = useSyncStatus();

  if (syncStatus.isOnline && syncStatus.pendingActionsCount === 0) {
    return null;
  }

  if (variant === 'icon') {
    return (
      <div className={cn("relative", className)}>
        {!syncStatus.isOnline ? (
          <WifiOff className="h-5 w-5 text-amber-500" />
        ) : (
          <Cloud className="h-5 w-5 text-blue-500" />
        )}
        {syncStatus.pendingActionsCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">{syncStatus.pendingActionsCount}</span>
          </span>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        !syncStatus.isOnline 
          ? "bg-amber-100 text-amber-700"
          : "bg-blue-100 text-blue-700",
        className
      )}>
        {!syncStatus.isOnline ? (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-3 w-3" />
            <span>{syncStatus.pendingActionsCount} pending</span>
          </>
        )}
      </div>
    );
  }

  // Badge variant (default)
  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
      !syncStatus.isOnline 
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-blue-700",
      className
    )}>
      {!syncStatus.isOnline ? (
        <WifiOff className="h-3 w-3" />
      ) : (
        <Cloud className="h-3 w-3" />
      )}
    </div>
  );
}

// ==========================================
// Sync Success Toast
// ==========================================

export function SyncSuccessToast({ 
  count, 
  onClose 
}: { 
  count: number; 
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-sm mx-auto bg-green-600 text-white rounded-xl p-4 shadow-lg z-50 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Synced successfully</p>
          <p className="text-sm text-green-100">{count} action{count !== 1 ? 's' : ''} synced</p>
        </div>
        <button onClick={onClose} className="text-green-200 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Pending Actions List
// ==========================================

export function PendingActionsList() {
  const syncStatus = useSyncStatus();
  const [isExpanded, setIsExpanded] = useState(false);

  if (syncStatus.pendingActionsCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            {syncStatus.pendingActionsCount} action{syncStatus.pendingActionsCount !== 1 ? 's' : ''} waiting to sync
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-blue-600 transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-700">
            Your actions are saved locally and will be automatically synced when you have a stable internet connection. No data will be lost.
          </p>
          
          {syncStatus.isOnline && (
            <button
              className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Offline Mode Overlay (for critical actions)
// ==========================================

interface OfflineModeOverlayProps {
  show: boolean;
  onRetry?: () => void;
  message?: string;
}

export function OfflineModeOverlay({ 
  show, 
  onRetry,
  message = "You're currently offline. Your action has been saved and will sync when you're back online."
}: OfflineModeOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <WifiOff className="h-8 w-8 text-amber-600" />
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 mb-2">You're Offline</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        
        <div className="flex gap-3">
          <button
            onClick={() => {/* dismiss */}}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
          >
            Got it
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Helper Functions
// ==========================================

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

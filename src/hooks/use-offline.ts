'use client';

import { useState, useEffect, useCallback } from 'react';

// ==========================================
// Types
// ==========================================

export interface CachedTask {
  id: string;
  taskNumber: string;
  type: 'BODA_RIDE' | 'CAR_RIDE' | 'FOOD_DELIVERY' | 'SHOPPING' | 'ITEM_DELIVERY';
  status: string;
  pickup: string;
  dropoff: string;
  fare: number;
  paymentMethod: string;
  clientName?: string;
  riderName?: string;
  createdAt: string;
  updatedAt: string;
  cachedAt: number;
}

export interface PendingAction {
  id: string;
  type: 'TASK_ACCEPT' | 'TASK_START' | 'TASK_COMPLETE' | 'TASK_CANCEL' | 
        'SEND_MESSAGE' | 'UPDATE_LOCATION' | 'UPDATE_STATUS' | 'ORDER_ACTION';
  taskId?: string;
  orderId?: string;
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface CachedMessage {
  id: string;
  taskId: string;
  senderId: string;
  senderRole: 'client' | 'rider' | 'merchant';
  text: string;
  timestamp: number;
  delivered: boolean;
  deliveredAt?: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: number | null;
  pendingActionsCount: number;
  isSyncing: boolean;
  lastError?: string;
}

// ==========================================
// Storage Keys
// ==========================================

const STORAGE_KEYS = {
  TASKS: 'smartride_cached_tasks',
  PENDING_ACTIONS: 'smartride_pending_actions',
  MESSAGES: 'smartride_cached_messages',
  SYNC_STATUS: 'smartride_sync_status',
};

// ==========================================
// Storage Helpers
// ==========================================

function getFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// ==========================================
// Hooks
// ==========================================

/**
 * Hook to subscribe to sync status changes
 */
export function useSyncStatus(): SyncStatus {
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

/**
 * Hook to check if currently online
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for task caching operations
 */
export function useTaskCache() {
  const [tasks, setTasks] = useState<CachedTask[]>(() => {
    return getFromStorage<CachedTask[]>(STORAGE_KEYS.TASKS) || [];
  });

  const cacheTask = useCallback((task: CachedTask) => {
    const existingTasks = getFromStorage<CachedTask[]>(STORAGE_KEYS.TASKS) || [];
    const existingIndex = existingTasks.findIndex(t => t.id === task.id);
    
    let updatedTasks: CachedTask[];
    if (existingIndex >= 0) {
      updatedTasks = [...existingTasks];
      updatedTasks[existingIndex] = { ...task, cachedAt: Date.now() };
    } else {
      updatedTasks = [...existingTasks, { ...task, cachedAt: Date.now() }];
    }
    
    saveToStorage(STORAGE_KEYS.TASKS, updatedTasks);
    setTasks(updatedTasks);
  }, []);

  const updateTaskStatus = useCallback((taskId: string, status: string) => {
    const existingTasks = getFromStorage<CachedTask[]>(STORAGE_KEYS.TASKS) || [];
    const updatedTasks = existingTasks.map(t => 
      t.id === taskId 
        ? { ...t, status, updatedAt: new Date().toISOString() }
        : t
    );
    saveToStorage(STORAGE_KEYS.TASKS, updatedTasks);
    setTasks(updatedTasks);
  }, []);

  const removeTask = useCallback((taskId: string) => {
    const existingTasks = getFromStorage<CachedTask[]>(STORAGE_KEYS.TASKS) || [];
    const updatedTasks = existingTasks.filter(t => t.id !== taskId);
    saveToStorage(STORAGE_KEYS.TASKS, updatedTasks);
    setTasks(updatedTasks);
  }, []);

  const getTask = useCallback((taskId: string) => {
    return tasks.find(t => t.id === taskId);
  }, [tasks]);

  return {
    tasks,
    cacheTask,
    updateTaskStatus,
    removeTask,
    getTask,
  };
}

/**
 * Hook for pending actions queue
 */
export function usePendingActions() {
  const [actions, setActions] = useState<PendingAction[]>(() => {
    return getFromStorage<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || [];
  });

  const queueAction = useCallback((
    type: PendingAction['type'],
    data: Record<string, unknown>,
    taskId?: string,
    orderId?: string
  ) => {
    const existingActions = getFromStorage<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || [];
    const newAction: PendingAction = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      taskId,
      orderId,
      createdAt: Date.now(),
      retryCount: 0,
    };
    
    const updatedActions = [...existingActions, newAction];
    saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, updatedActions);
    setActions(updatedActions);
    
    return newAction.id;
  }, []);

  const removePendingAction = useCallback((actionId: string) => {
    const existingActions = getFromStorage<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || [];
    const updatedActions = existingActions.filter(a => a.id !== actionId);
    saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, updatedActions);
    setActions(updatedActions);
  }, []);

  const syncNow = useCallback(async () => {
    // In a real implementation, this would attempt to sync all pending actions
    // For now, we'll just clear them
    const existingActions = getFromStorage<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || [];
    const online = navigator.onLine;
    
    if (online && existingActions.length > 0) {
      // Simulate successful sync
      saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, []);
      setActions([]);
      saveToStorage(STORAGE_KEYS.SYNC_STATUS, { lastSyncAt: Date.now() });
    }
    
    return { success: existingActions.length, failed: 0 };
  }, []);

  return {
    actions,
    queueAction,
    removePendingAction,
    syncNow,
    pendingCount: actions.length,
  };
}

/**
 * Hook for message caching
 */
export function useMessageCache(taskId?: string) {
  const [messages, setMessages] = useState<CachedMessage[]>(() => {
    const allMessages = getFromStorage<CachedMessage[]>(STORAGE_KEYS.MESSAGES) || [];
    if (taskId) {
      return allMessages.filter(m => m.taskId === taskId);
    }
    return allMessages;
  });

  const cacheMessage = useCallback((
    id: string,
    taskId: string,
    senderId: string,
    senderRole: 'client' | 'rider' | 'merchant',
    text: string
  ) => {
    const online = navigator.onLine;
    const existingMessages = getFromStorage<CachedMessage[]>(STORAGE_KEYS.MESSAGES) || [];
    const newMessage: CachedMessage = {
      id,
      taskId,
      senderId,
      senderRole,
      text,
      timestamp: Date.now(),
      delivered: online,
    };
    
    const updatedMessages = [...existingMessages, newMessage];
    saveToStorage(STORAGE_KEYS.MESSAGES, updatedMessages);
    
    // Update local state
    setMessages(updatedMessages.filter(m => taskId ? m.taskId === taskId : true));
  }, []);

  const getUndelivered = useCallback(() => {
    const allMessages = getFromStorage<CachedMessage[]>(STORAGE_KEYS.MESSAGES) || [];
    return allMessages.filter(m => !m.delivered);
  }, []);

  return {
    messages,
    cacheMessage,
    getUndelivered,
  };
}

/**
 * Hook for offline-aware task operations
 * Handles both online and offline scenarios
 */
export function useOfflineTask() {
  const isOnline = useOnlineStatus();
  const { cacheTask, updateTaskStatus, tasks } = useTaskCache();
  const { queueAction, removePendingAction } = usePendingActions();

  const acceptTask = useCallback(async (task: CachedTask) => {
    // Always update local cache immediately
    cacheTask({ ...task, status: 'RIDER_ACCEPTED' });

    if (isOnline) {
      try {
        // Attempt immediate API call
        const response = await fetch(`/api/tasks/${task.id}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error('Failed to accept task');
        
        return { success: true, offline: false };
      } catch {
        // If API fails, queue for later sync
        queueAction('TASK_ACCEPT', { taskId: task.id }, task.id);
        return { success: true, offline: true };
      }
    } else {
      // Offline: queue action for later
      queueAction('TASK_ACCEPT', { taskId: task.id }, task.id);
      return { success: true, offline: true };
    }
  }, [isOnline, cacheTask, queueAction]);

  const startTask = useCallback(async (taskId: string) => {
    updateTaskStatus(taskId, 'IN_PROGRESS');

    if (isOnline) {
      try {
        await fetch(`/api/tasks/${taskId}/start`, { method: 'POST' });
        return { success: true, offline: false };
      } catch {
        queueAction('TASK_START', { taskId }, taskId);
        return { success: true, offline: true };
      }
    } else {
      queueAction('TASK_START', { taskId }, taskId);
      return { success: true, offline: true };
    }
  }, [isOnline, updateTaskStatus, queueAction]);

  const completeTask = useCallback(async (taskId: string) => {
    updateTaskStatus(taskId, 'COMPLETED');

    if (isOnline) {
      try {
        await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' });
        return { success: true, offline: false };
      } catch {
        queueAction('TASK_COMPLETE', { taskId }, taskId);
        return { success: true, offline: true };
      }
    } else {
      queueAction('TASK_COMPLETE', { taskId }, taskId);
      return { success: true, offline: true };
    }
  }, [isOnline, updateTaskStatus, queueAction]);

  const cancelTask = useCallback(async (taskId: string, reason: string) => {
    updateTaskStatus(taskId, 'CANCELLED');

    if (isOnline) {
      try {
        await fetch(`/api/tasks/${taskId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        return { success: true, offline: false };
      } catch {
        queueAction('TASK_CANCEL', { taskId, reason }, taskId);
        return { success: true, offline: true };
      }
    } else {
      queueAction('TASK_CANCEL', { taskId, reason }, taskId);
      return { success: true, offline: true };
    }
  }, [isOnline, updateTaskStatus, queueAction]);

  return {
    tasks,
    acceptTask,
    startTask,
    completeTask,
    cancelTask,
    isOnline,
  };
}

/**
 * Hook for sending messages with offline support
 */
export function useOfflineMessaging(taskId: string) {
  const isOnline = useOnlineStatus();
  const { cacheMessage, messages } = useMessageCache(taskId);
  const { queueAction } = usePendingActions();

  const sendMessage = useCallback(async (
    id: string,
    senderId: string,
    senderRole: 'client' | 'rider' | 'merchant',
    text: string
  ) => {
    // Always cache locally first
    cacheMessage(id, taskId, senderId, senderRole, text);

    if (isOnline) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, senderId, senderRole, text }),
        });
        
        return { success: true, offline: false };
      } catch {
        queueAction('SEND_MESSAGE', { messageId: id, taskId, text }, taskId);
        return { success: true, offline: true };
      }
    } else {
      queueAction('SEND_MESSAGE', { messageId: id, taskId, text }, taskId);
      return { success: true, offline: true };
    }
  }, [taskId, isOnline, cacheMessage, queueAction]);

  return {
    messages,
    sendMessage,
    isOnline,
  };
}

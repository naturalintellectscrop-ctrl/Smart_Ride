/**
 * Smart Ride Offline Manager
 * 
 * Handles offline caching, sync queue, and connection status
 * - Tasks cached locally if internet lost
 * - Sync resumes when connection returns
 * - No penalties for offline behavior
 * - Logs used for audit & reliability index
 */

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

const STORAGE_KEYS = {
  TASKS: 'smartride_cached_tasks',
  PENDING_ACTIONS: 'smartride_pending_actions',
  MESSAGES: 'smartride_cached_messages',
  SYNC_STATUS: 'smartride_sync_status',
  USER_DATA: 'smartride_user_data',
};

class OfflineManager {
  private static instance: OfflineManager;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isOnline: boolean = true;

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.setupEventListeners();
      this.startPeriodicSync();
    }
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onConnectionRestored();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  private startPeriodicSync() {
    // Attempt sync every 30 seconds
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingActions();
      }
    }, 30000);
  }

  private onConnectionRestored() {
    this.notifyListeners();
    // Auto-sync when connection restored
    this.syncPendingActions();
  }

  private notifyListeners() {
    const status = this.getSyncStatus();
    this.listeners.forEach(listener => listener(status));
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(this.getSyncStatus());
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  getSyncStatus(): SyncStatus {
    const pendingActions = this.getPendingActions();
    const storedStatus = this.getFromStorage<SyncStatus>(STORAGE_KEYS.SYNC_STATUS);
    
    return {
      isOnline: this.isOnline,
      lastSyncAt: storedStatus?.lastSyncAt ?? null,
      pendingActionsCount: pendingActions.length,
      isSyncing: false,
      lastError: storedStatus?.lastError,
    };
  }

  // ==========================================
  // Task Caching
  // ==========================================

  cacheTask(task: CachedTask): void {
    const tasks = this.getCachedTasks();
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    
    if (existingIndex >= 0) {
      tasks[existingIndex] = { ...task, cachedAt: Date.now() };
    } else {
      tasks.push({ ...task, cachedAt: Date.now() });
    }
    
    this.saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }

  getCachedTasks(): CachedTask[] {
    return this.getFromStorage<CachedTask[]>(STORAGE_KEYS.TASKS) || [];
  }

  getCachedTask(taskId: string): CachedTask | undefined {
    const tasks = this.getCachedTasks();
    return tasks.find(t => t.id === taskId);
  }

  updateCachedTaskStatus(taskId: string, status: string): void {
    const tasks = this.getCachedTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      task.status = status;
      task.updatedAt = new Date().toISOString();
      this.saveToStorage(STORAGE_KEYS.TASKS, tasks);
    }
  }

  removeCachedTask(taskId: string): void {
    const tasks = this.getCachedTasks().filter(t => t.id !== taskId);
    this.saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }

  // ==========================================
  // Pending Actions Queue
  // ==========================================

  queueAction(action: { type: PendingAction['type']; data: Record<string, unknown>; taskId?: string; orderId?: string }): string {
    const pendingActions = this.getPendingActions();
    const newAction: PendingAction = {
      ...action,
      id: `${action.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retryCount: 0,
    };
    
    pendingActions.push(newAction);
    this.saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, pendingActions);
    this.notifyListeners();
    
    return newAction.id;
  }

  getPendingActions(): PendingAction[] {
    return this.getFromStorage<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || [];
  }

  removePendingAction(actionId: string): void {
    const pendingActions = this.getPendingActions().filter(a => a.id !== actionId);
    this.saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, pendingActions);
    this.notifyListeners();
  }

  updatePendingActionError(actionId: string, error: string): void {
    const pendingActions = this.getPendingActions();
    const action = pendingActions.find(a => a.id === actionId);
    
    if (action) {
      action.lastError = error;
      action.retryCount += 1;
      this.saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, pendingActions);
    }
  }

  // ==========================================
  // Message Caching
  // ==========================================

  cacheMessage(message: Omit<CachedMessage, 'delivered'>): void {
    const messages = this.getCachedMessages();
    messages.push({ ...message, delivered: this.isOnline });
    this.saveToStorage(STORAGE_KEYS.MESSAGES, messages);
  }

  getCachedMessages(): CachedMessage[] {
    return this.getFromStorage<CachedMessage[]>(STORAGE_KEYS.MESSAGES) || [];
  }

  getTaskMessages(taskId: string): CachedMessage[] {
    return this.getCachedMessages().filter(m => m.taskId === taskId);
  }

  markMessageDelivered(messageId: string): void {
    const messages = this.getCachedMessages();
    const message = messages.find(m => m.id === messageId);
    
    if (message) {
      message.delivered = true;
      message.deliveredAt = Date.now();
      this.saveToStorage(STORAGE_KEYS.MESSAGES, messages);
    }
  }

  getUndeliveredMessages(): CachedMessage[] {
    return this.getCachedMessages().filter(m => !m.delivered);
  }

  // ==========================================
  // Sync Operations
  // ==========================================

  async syncPendingActions(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline) {
      return { success: 0, failed: 0 };
    }

    const pendingActions = this.getPendingActions();
    let success = 0;
    let failed = 0;

    // Process actions in order
    for (const action of pendingActions) {
      try {
        await this.executeAction(action);
        this.removePendingAction(action.id);
        success++;
      } catch (error) {
        this.updatePendingActionError(action.id, String(error));
        failed++;
        
        // Stop processing if we hit too many failures
        if (failed >= 3) break;
      }
    }

    // Update sync status
    this.saveToStorage(STORAGE_KEYS.SYNC_STATUS, {
      ...this.getSyncStatus(),
      lastSyncAt: Date.now(),
      isSyncing: false,
    });

    this.notifyListeners();
    return { success, failed };
  }

  private async executeAction(action: PendingAction): Promise<void> {
    // In a real app, these would call actual API endpoints
    const endpoint = this.getEndpointForAction(action);
    
    // Simulate API call - in production, this would make real requests
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Update local cache based on action type
    if (action.taskId) {
      this.updateCachedTaskStatus(action.taskId, this.getNewStatusForAction(action.type));
    }
  }

  private getEndpointForAction(action: PendingAction): { url: string; method: string } {
    switch (action.type) {
      case 'TASK_ACCEPT':
        return { url: `/api/tasks/${action.taskId}/accept`, method: 'POST' };
      case 'TASK_START':
        return { url: `/api/tasks/${action.taskId}/start`, method: 'POST' };
      case 'TASK_COMPLETE':
        return { url: `/api/tasks/${action.taskId}/complete`, method: 'POST' };
      case 'TASK_CANCEL':
        return { url: `/api/tasks/${action.taskId}/cancel`, method: 'POST' };
      case 'SEND_MESSAGE':
        return { url: `/api/messages`, method: 'POST' };
      case 'UPDATE_LOCATION':
        return { url: `/api/location`, method: 'POST' };
      case 'UPDATE_STATUS':
        return { url: `/api/status`, method: 'POST' };
      case 'ORDER_ACTION':
        return { url: `/api/orders/${action.orderId}/action`, method: 'POST' };
      default:
        return { url: '/api/sync', method: 'POST' };
    }
  }

  private getNewStatusForAction(actionType: string): string {
    switch (actionType) {
      case 'TASK_ACCEPT': return 'RIDER_ACCEPTED';
      case 'TASK_START': return 'IN_PROGRESS';
      case 'TASK_COMPLETE': return 'COMPLETED';
      case 'TASK_CANCEL': return 'CANCELLED';
      default: return 'UNKNOWN';
    }
  }

  // ==========================================
  // Storage Helpers
  // ==========================================

  private saveToStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      // If storage is full, try to clear old data
      this.cleanupOldData();
    }
  }

  private getFromStorage<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private cleanupOldData(): void {
    const ONE_WEEK_AGO = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Remove old completed tasks
    const tasks = this.getCachedTasks().filter(t => {
      const isOld = t.cachedAt < ONE_WEEK_AGO;
      const isTerminal = ['COMPLETED', 'CANCELLED', 'FAILED'].includes(t.status);
      return !(isOld && isTerminal);
    });
    this.saveToStorage(STORAGE_KEYS.TASKS, tasks);

    // Remove old delivered messages
    const messages = this.getCachedMessages().filter(m => {
      const isOld = m.timestamp < ONE_WEEK_AGO;
      return !(isOld && m.delivered);
    });
    this.saveToStorage(STORAGE_KEYS.MESSAGES, messages);
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  clearAllCache(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  getStorageUsage(): { used: number; available: boolean } {
    let used = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        used += item.length * 2; // UTF-16 characters
      }
    });
    
    return {
      used,
      available: used < 4 * 1024 * 1024, // 4MB threshold
    };
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance();

// React hook for using offline manager
export function useOfflineManager() {
  return offlineManager;
}

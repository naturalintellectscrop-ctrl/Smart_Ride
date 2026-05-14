// ============================================
// SMART RIDE MOBILE - TASK STORE
// ============================================
// Task store for managing rides and deliveries
// ============================================

import { create } from 'zustand';
import { Task } from '../types';

// Incoming request type for driver
export interface IncomingRequest {
  task: {
    id: string;
    taskNumber: string;
    taskType: string;
    pickupAddress: string;
    dropoffAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffLatitude?: number;
    dropoffLongitude?: number;
    totalAmount: number;
    paymentMethod: string;
    status: string;
  };
  pickup: {
    address: string;
    latitude: number;
    longitude: number;
  };
  expiresAt: string;
  distance?: number;
  estimatedDuration?: number;
}

interface TaskState {
  // Rider state
  pendingTask: Task | null;
  currentTask: Task | null;
  taskHistory: Task[];
  
  // Driver state
  incomingRequest: IncomingRequest | null;
  driverTasks: Task[];
  
  // Rider actions
  setPendingTask: (task: Task | null) => void;
  setCurrentTask: (task: Task | null) => void;
  setTaskHistory: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, status: string) => void;
  clearPendingTask: () => void;
  
  // Driver actions
  setIncomingRequest: (request: IncomingRequest | null) => void;
  clearIncomingRequest: () => void;
  setDriverTasks: (tasks: Task[]) => void;
  addDriverTask: (task: Task) => void;
  updateDriverTask: (taskId: string, updates: Partial<Task>) => void;
  removeDriverTask: (taskId: string) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  pendingTask: null,
  currentTask: null,
  taskHistory: [],
  incomingRequest: null,
  driverTasks: [],
  
  // Rider actions
  setPendingTask: (task) => set({ pendingTask: task }),
  
  setCurrentTask: (task) => set({ currentTask: task }),
  
  setTaskHistory: (tasks) => set({ taskHistory: tasks }),
  
  updateTaskStatus: (taskId, status) => {
    const state = get();
    if (state.pendingTask?.id === taskId) {
      set({ pendingTask: { ...state.pendingTask, status: status as Task['status'] } });
    }
    if (state.currentTask?.id === taskId) {
      set({ currentTask: { ...state.currentTask, status: status as Task['status'] } });
    }
    set({
      taskHistory: state.taskHistory.map(t => 
        t.id === taskId ? { ...t, status: status as Task['status'] } : t
      ),
    });
  },
  
  clearPendingTask: () => set({ pendingTask: null }),
  
  // Driver actions
  setIncomingRequest: (request) => set({ incomingRequest: request }),
  
  clearIncomingRequest: () => set({ incomingRequest: null }),
  
  setDriverTasks: (tasks) => set({ driverTasks: tasks }),
  
  addDriverTask: (task) => set((state) => ({ 
    driverTasks: [...state.driverTasks, task] 
  })),
  
  updateDriverTask: (taskId, updates) => set((state) => ({
    driverTasks: state.driverTasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ),
  })),
  
  removeDriverTask: (taskId) => set((state) => ({
    driverTasks: state.driverTasks.filter(t => t.id !== taskId),
  })),
}));

console.log('[TASK-STORE] Store initialized');

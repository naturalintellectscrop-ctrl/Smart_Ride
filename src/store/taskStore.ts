// ============================================
// SMART RIDE MOBILE - TASK STORE
// ============================================

import { create } from 'zustand';
import { Task, TaskStatus, Location } from '@/src/types';

interface TaskState {
  // State
  currentTask: Task | null;
  pendingTask: Task | null;
  taskHistory: Task[];
  isLoading: boolean;
  error: string | null;
  
  // Driver specific
  incomingRequest: {
    task: Task;
    pickup: Location;
    expiresAt: string;
  } | null;
  isAcceptingRequest: boolean;
  
  // Actions
  setCurrentTask: (task: Task | null) => void;
  setPendingTask: (task: Task | null) => void;
  clearPendingTask: () => void;
  setTaskHistory: (tasks: Task[]) => void;
  addTaskToHistory: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Driver actions
  setIncomingRequest: (request: TaskState['incomingRequest']) => void;
  clearIncomingRequest: () => void;
  setIsAcceptingRequest: (accepting: boolean) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  currentTask: null,
  pendingTask: null,
  taskHistory: [],
  isLoading: false,
  error: null,
  incomingRequest: null,
  isAcceptingRequest: false,

  // Actions
  setCurrentTask: (task) => set({ currentTask: task }),
  
  setPendingTask: (task) => set({ pendingTask: task }),
  
  clearPendingTask: () => set({ pendingTask: null, currentTask: null }),
  
  setTaskHistory: (tasks) => set({ taskHistory: tasks }),
  
  addTaskToHistory: (task) => {
    const history = get().taskHistory;
    set({ taskHistory: [task, ...history] });
  },

  updateTaskStatus: (taskId, status) => {
    const currentTask = get().currentTask;
    if (currentTask && currentTask.id === taskId) {
      set({ currentTask: { ...currentTask, status } });
    }
    
    const pendingTask = get().pendingTask;
    if (pendingTask && pendingTask.id === taskId) {
      set({ pendingTask: { ...pendingTask, status } });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  // Driver actions
  setIncomingRequest: (request) => set({ incomingRequest: request }),
  
  clearIncomingRequest: () => set({ incomingRequest: null }),
  
  setIsAcceptingRequest: (isAcceptingRequest) => set({ isAcceptingRequest }),
}));

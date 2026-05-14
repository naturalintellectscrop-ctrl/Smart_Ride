// ============================================
// SMART RIDE MOBILE - TASK STORE
// ============================================
// Minimal task store for boot
// ============================================

import { create } from 'zustand';
import { Task } from '../types';

interface TaskState {
  pendingTask: Task | null;
  currentTask: Task | null;
  taskHistory: Task[];
  
  setPendingTask: (task: Task | null) => void;
  setCurrentTask: (task: Task | null) => void;
  setTaskHistory: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, status: string) => void;
  clearPendingTask: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  pendingTask: null,
  currentTask: null,
  taskHistory: [],
  
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
}));

console.log('[TASK-STORE] Store initialized');

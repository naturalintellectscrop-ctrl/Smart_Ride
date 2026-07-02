// ============================================
// SMART RIDE MOBILE - FEEDBACK STORE
// ============================================
// Backing state for the global Smart Ride feedback system (branded modals +
// toasts) that replaces native Alert.alert() dialogs. Imperative helpers push
// into this store; <FeedbackHost/> (mounted once at the app root) renders them.
// Using a store means feedback can be triggered from anywhere — components,
// services, utils — without prop-drilling or a provider ref.
// ============================================

import { create } from 'zustand';

export type FeedbackType = 'success' | 'warning' | 'error' | 'info';

/** Mirrors React Native's Alert button shape so the shim is drop-in compatible. */
export interface FeedbackButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface ModalConfig {
  id: number;
  type: FeedbackType;
  title: string;
  message?: string;
  buttons: FeedbackButton[];
  cancelable: boolean;
}

export interface ToastConfig {
  id: number;
  type: FeedbackType;
  title?: string;
  message: string;
  duration: number;
}

interface FeedbackState {
  modals: ModalConfig[]; // FIFO queue — only the first is shown at a time
  toasts: ToastConfig[];
  pushModal: (c: Omit<ModalConfig, 'id'>) => number;
  dismissModal: (id: number) => void;
  pushToast: (c: Omit<ToastConfig, 'id'>) => number;
  dismissToast: (id: number) => void;
}

let counter = 1;

export const useFeedbackStore = create<FeedbackState>((set) => ({
  modals: [],
  toasts: [],
  pushModal: (c) => {
    const id = counter++;
    set((s) => ({ modals: [...s.modals, { ...c, id }] }));
    return id;
  },
  dismissModal: (id) => set((s) => ({ modals: s.modals.filter((m) => m.id !== id) })),
  pushToast: (c) => {
    const id = counter++;
    set((s) => ({ toasts: [...s.toasts, { ...c, id }] }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ============================================
// SMART RIDE MOBILE - MERCHANT STORE
// ============================================
// Zustand store for merchant dashboard state
// ============================================

import { create } from 'zustand';
import { Merchant, MerchantAnalytics, MerchantEarnings, MerchantOrder, MenuItem } from '../types';
import { api } from '../services';

interface MerchantState {
  // Data
  merchant: Merchant | null;
  orders: MerchantOrder[];
  analytics: MerchantAnalytics | null;
  menuItems: MenuItem[];
  earnings: MerchantEarnings | null;

  // Loading states
  isLoadingProfile: boolean;
  isLoadingOrders: boolean;
  isLoadingAnalytics: boolean;
  isLoadingMenu: boolean;
  isLoadingEarnings: boolean;
  isTogglingAvailability: boolean;
  isUpdatingOrder: boolean;

  // Error states
  profileError: string | null;
  ordersError: string | null;
  analyticsError: string | null;
  menuError: string | null;
  earningsError: string | null;

  // Pagination
  ordersPage: number;
  ordersTotalPages: number;

  // Actions
  fetchProfile: (merchantId?: string) => Promise<void>;
  fetchOrders: (merchantId: string, status?: string, page?: number) => Promise<void>;
  fetchAnalytics: (merchantId: string) => Promise<void>;
  fetchMenu: (merchantId: string) => Promise<void>;
  fetchEarnings: (merchantId: string, period?: string) => Promise<void>;
  toggleAvailability: (merchantId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string, reason?: string) => Promise<void>;
  createMenuItem: (merchantId: string, data: any) => Promise<boolean>;
  updateMenuItem: (merchantId: string, itemId: string, data: any) => Promise<boolean>;
  deleteMenuItem: (merchantId: string, itemId: string) => Promise<boolean>;
  clearErrors: () => void;
  reset: () => void;
}

const initialState = {
  merchant: null,
  orders: [],
  analytics: null,
  menuItems: [],
  earnings: null,
  isLoadingProfile: false,
  isLoadingOrders: false,
  isLoadingAnalytics: false,
  isLoadingMenu: false,
  isLoadingEarnings: false,
  isTogglingAvailability: false,
  isUpdatingOrder: false,
  profileError: null,
  ordersError: null,
  analyticsError: null,
  menuError: null,
  earningsError: null,
  ordersPage: 1,
  ordersTotalPages: 1,
};

export const useMerchantStore = create<MerchantState>((set, get) => ({
  ...initialState,

  fetchProfile: async (merchantId?: string) => {
    set({ isLoadingProfile: true, profileError: null });
    try {
      const response = await api.getMerchantProfile(merchantId);
      if (response.success && response.data) {
        set({ merchant: response.data });
      } else {
        set({ profileError: response.error || 'Failed to load merchant profile' });
      }
    } catch (error) {
      console.error('[MerchantStore] fetchProfile error:', error);
      set({ profileError: 'Network error. Please check your connection.' });
    } finally {
      set({ isLoadingProfile: false });
    }
  },

  fetchOrders: async (merchantId: string, status?: string, page: number = 1) => {
    set({ isLoadingOrders: true, ordersError: null });
    try {
      const response = await api.getMerchantOrders(merchantId, status, page);
      if (response.success && response.data) {
        const data = response.data as any;
        const orders = Array.isArray(data) ? data : (data.data || []);
        const pagination = data.pagination || { page: 1, totalPages: 1 };
        set({
          orders: orders as MerchantOrder[],
          ordersPage: pagination.page,
          ordersTotalPages: pagination.totalPages,
        });
      } else {
        set({ ordersError: response.error || 'Failed to load orders' });
      }
    } catch (error) {
      console.error('[MerchantStore] fetchOrders error:', error);
      set({ ordersError: 'Network error. Please check your connection.' });
    } finally {
      set({ isLoadingOrders: false });
    }
  },

  fetchAnalytics: async (merchantId: string) => {
    set({ isLoadingAnalytics: true, analyticsError: null });
    try {
      const response = await api.getMerchantAnalytics(merchantId);
      if (response.success && response.data) {
        set({ analytics: response.data });
      } else {
        set({ analyticsError: response.error || 'Failed to load analytics' });
      }
    } catch (error) {
      console.error('[MerchantStore] fetchAnalytics error:', error);
      set({ analyticsError: 'Network error. Please check your connection.' });
    } finally {
      set({ isLoadingAnalytics: false });
    }
  },

  fetchMenu: async (merchantId: string) => {
    set({ isLoadingMenu: true, menuError: null });
    try {
      const response = await api.getMerchantMenu(merchantId);
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : [];
        set({ menuItems: items as MenuItem[] });
      } else {
        set({ menuError: response.error || 'Failed to load menu' });
      }
    } catch (error) {
      console.error('[MerchantStore] fetchMenu error:', error);
      set({ menuError: 'Network error. Please check your connection.' });
    } finally {
      set({ isLoadingMenu: false });
    }
  },

  fetchEarnings: async (merchantId: string, period?: string) => {
    set({ isLoadingEarnings: true, earningsError: null });
    try {
      const response = await api.getMerchantEarnings(merchantId, period);
      if (response.success && response.data) {
        set({ earnings: response.data });
      } else {
        set({ earningsError: response.error || 'Failed to load earnings' });
      }
    } catch (error) {
      console.error('[MerchantStore] fetchEarnings error:', error);
      set({ earningsError: 'Network error. Please check your connection.' });
    } finally {
      set({ isLoadingEarnings: false });
    }
  },

  toggleAvailability: async (merchantId: string) => {
    const { merchant } = get();
    if (!merchant) return;

    set({ isTogglingAvailability: true });
    try {
      const newIsOpen = !merchant.isOpen;
      const response = await api.updateMerchantAvailability(merchantId, newIsOpen);
      if (response.success) {
        set({ merchant: { ...merchant, isOpen: newIsOpen } });
      } else {
        console.error('[MerchantStore] toggleAvailability failed:', response.error);
      }
    } catch (error) {
      console.error('[MerchantStore] toggleAvailability error:', error);
    } finally {
      set({ isTogglingAvailability: false });
    }
  },

  updateOrderStatus: async (orderId: string, status: string, reason?: string) => {
    set({ isUpdatingOrder: true });
    try {
      // accept/reject/preparing/ready are schema-gated on merchantId, and
      // reject additionally needs a reason. The store already holds the signed-in
      // merchant, so the call sites do not have to thread it through.
      const merchantId = get().merchant?.id;
      const response = await api.updateOrderStatus(orderId, status, { merchantId, reason });
      if (response.success) {
        // Update the order in the local state
        const { orders } = get();
        set({
          orders: orders.map(o =>
            o.id === orderId ? { ...o, status: status as any } : o
          ),
        });
      } else {
        // Previously this only console.error'd, so a failed call left the
        // optimistic local update in place and the merchant watched an order
        // advance that the server never accepted. Surface it and do NOT patch
        // local state on failure.
        console.error('[MerchantStore] updateOrderStatus failed:', response.error);
        set({ ordersError: response.error || 'Could not update the order' });
      }
    } catch (error) {
      console.error('[MerchantStore] updateOrderStatus error:', error);
    } finally {
      set({ isUpdatingOrder: false });
    }
  },

  createMenuItem: async (merchantId: string, data: any) => {
    try {
      const response = await api.createMenuItem(merchantId, data);
      if (response.success) {
        // Refresh menu
        get().fetchMenu(merchantId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[MerchantStore] createMenuItem error:', error);
      return false;
    }
  },

  updateMenuItem: async (merchantId: string, itemId: string, data: any) => {
    try {
      const response = await api.updateMenuItem(merchantId, itemId, data);
      if (response.success) {
        // Refresh menu
        get().fetchMenu(merchantId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[MerchantStore] updateMenuItem error:', error);
      return false;
    }
  },

  deleteMenuItem: async (merchantId: string, itemId: string) => {
    try {
      const response = await api.deleteMenuItem(merchantId, itemId);
      if (response.success) {
        // Remove from local state
        const { menuItems } = get();
        set({ menuItems: menuItems.filter(item => item.id !== itemId) });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[MerchantStore] deleteMenuItem error:', error);
      return false;
    }
  },

  clearErrors: () => {
    set({
      profileError: null,
      ordersError: null,
      analyticsError: null,
      menuError: null,
      earningsError: null,
    });
  },

  reset: () => {
    set(initialState);
  },
}));

console.log('[MERCHANT-STORE] Store initialized');

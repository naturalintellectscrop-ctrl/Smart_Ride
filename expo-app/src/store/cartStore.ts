// ============================================
// SMART RIDE MOBILE - CART STORE
// ============================================
// Shopping cart store for orders
// ============================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  merchantId?: string;
  merchantName?: string;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  merchantId: string | null;
  merchantName: string | null;
  
  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setMerchant: (merchantId: string, merchantName: string) => void;
  
  // Persistence
  loadCart: () => Promise<void>;
  saveCart: () => Promise<void>;
}

const CART_STORAGE_KEY = 'smart_ride_cart';

// ============================================
// CART STORE
// ============================================

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,
  merchantId: null,
  merchantName: null,

  addItem: (item) => {
    const state = get();
    const existingIndex = state.items.findIndex(i => i.productId === item.productId);
    
    let newItems: CartItem[];
    if (existingIndex >= 0) {
      // Update quantity if item exists
      newItems = state.items.map((i, idx) => 
        idx === existingIndex 
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      // Add new item
      newItems = [...state.items, item];
    }
    
    const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    
    set({
      items: newItems,
      totalItems,
      totalPrice,
      merchantId: item.merchantId || state.merchantId,
      merchantName: item.merchantName || state.merchantName,
    });
    
    // Save to storage
    get().saveCart();
  },

  removeItem: (productId) => {
    const state = get();
    const newItems = state.items.filter(i => i.productId !== productId);
    
    const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    
    set({
      items: newItems,
      totalItems,
      totalPrice,
      merchantId: newItems.length > 0 ? state.merchantId : null,
      merchantName: newItems.length > 0 ? state.merchantName : null,
    });
    
    get().saveCart();
  },

  updateQuantity: (productId, quantity) => {
    const state = get();
    
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    
    const newItems = state.items.map(i => 
      i.productId === productId ? { ...i, quantity } : i
    );
    
    const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    
    set({
      items: newItems,
      totalItems,
      totalPrice,
    });
    
    get().saveCart();
  },

  clearCart: () => {
    set({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      merchantId: null,
      merchantName: null,
    });
    
    AsyncStorage.removeItem(CART_STORAGE_KEY);
  },

  setMerchant: (merchantId, merchantName) => {
    set({ merchantId, merchantName });
  },

  loadCart: async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        set({
          items: data.items || [],
          totalItems: data.totalItems || 0,
          totalPrice: data.totalPrice || 0,
          merchantId: data.merchantId || null,
          merchantName: data.merchantName || null,
        });
      }
    } catch (error) {
      console.error('[CART] Error loading cart:', error);
    }
  },

  saveCart: async () => {
    try {
      const state = get();
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
        items: state.items,
        totalItems: state.totalItems,
        totalPrice: state.totalPrice,
        merchantId: state.merchantId,
        merchantName: state.merchantName,
      }));
    } catch (error) {
      console.error('[CART] Error saving cart:', error);
    }
  },
}));

console.log('[CART-STORE] Store initialized');

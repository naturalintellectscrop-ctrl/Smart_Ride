// ============================================
// SMART RIDE MOBILE - CART STORE
// ============================================
// VERSION: DEBUG-TRACE-001
// PURPOSE: Manage shopping cart state
// ============================================

import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  merchantId?: string;
  merchantName?: string;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemsByMerchant: (merchantId: string) => CartItem[];
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,

  addItem: (item) => {
    set((state) => {
      const existingIndex = state.items.findIndex(i => i.id === item.id);
      let newItems: CartItem[];
      
      if (existingIndex > -1) {
        // Update quantity if item exists
        newItems = state.items.map((i, idx) => 
          idx === existingIndex 
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      } else {
        // Add new item
        newItems = [...state.items, { ...item, quantity: item.quantity || 1 }];
      }
      
      const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalPrice = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      
      return { items: newItems, totalItems, totalPrice };
    });
  },

  removeItem: (itemId) => {
    set((state) => {
      const newItems = state.items.filter(i => i.id !== itemId);
      const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalPrice = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      
      return { items: newItems, totalItems, totalPrice };
    });
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const newItems = state.items.filter(i => i.id !== itemId);
        const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
        const totalPrice = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        return { items: newItems, totalItems, totalPrice };
      }
      
      const newItems = state.items.map(i => 
        i.id === itemId ? { ...i, quantity } : i
      );
      const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalPrice = newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      
      return { items: newItems, totalItems, totalPrice };
    });
  },

  clearCart: () => {
    set({ items: [], totalItems: 0, totalPrice: 0 });
  },

  getItemsByMerchant: (merchantId) => {
    return get().items.filter(i => i.merchantId === merchantId);
  },
}));

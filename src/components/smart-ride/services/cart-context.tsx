'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Cart item interface
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
  variant?: string;
}

// Cart type for different services
export type CartType = 'food' | 'grocery' | 'health' | 'shopping';

// Cart state for each service type
interface CartState {
  items: CartItem[];
  deliveryFee: number;
  serviceId?: string;
  serviceName?: string;
}

// Context interface
interface CartContextType {
  // Separate carts for each service type
  foodCart: CartState;
  groceryCart: CartState;
  healthCart: CartState;
  shoppingCart: CartState;
  
  // Current active cart type
  activeCartType: CartType;
  setActiveCartType: (type: CartType) => void;
  
  // Get current active cart
  getActiveCart: () => CartState;
  
  // Cart actions
  addItem: (item: CartItem, cartType: CartType) => void;
  removeItem: (itemId: string, cartType: CartType) => void;
  updateQuantity: (itemId: string, quantity: number, cartType: CartType) => void;
  clearCart: (cartType: CartType) => void;
  setDeliveryFee: (fee: number, cartType: CartType) => void;
  setServiceInfo: (serviceId: string, serviceName: string, cartType: CartType) => void;
  
  // Cart totals
  getCartTotal: (cartType: CartType) => number;
  getCartCount: (cartType: CartType) => number;
  getGrandTotal: (cartType: CartType) => number;
  
  // For checkout
  checkoutCart: CartState | null;
  setCheckoutCart: (cartType: CartType) => void;
  clearCheckoutCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const initialCartState: CartState = {
  items: [],
  deliveryFee: 0,
  serviceId: undefined,
  serviceName: undefined,
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [foodCart, setFoodCart] = useState<CartState>(initialCartState);
  const [groceryCart, setGroceryCart] = useState<CartState>(initialCartState);
  const [healthCart, setHealthCart] = useState<CartState>(initialCartState);
  const [shoppingCart, setShoppingCart] = useState<CartState>(initialCartState);
  const [activeCartType, setActiveCartType] = useState<CartType>('food');
  const [checkoutCart, setCheckoutCartState] = useState<CartState | null>(null);

  // Helper to get cart by type
  const getCartByType = useCallback((type: CartType): CartState => {
    switch (type) {
      case 'food':
        return foodCart;
      case 'grocery':
        return groceryCart;
      case 'health':
        return healthCart;
      case 'shopping':
        return shoppingCart;
      default:
        return foodCart;
    }
  }, [foodCart, groceryCart, healthCart, shoppingCart]);

  // Helper to set cart by type
  const setCartByType = useCallback((type: CartType, cart: CartState) => {
    switch (type) {
      case 'food':
        setFoodCart(cart);
        break;
      case 'grocery':
        setGroceryCart(cart);
        break;
      case 'health':
        setHealthCart(cart);
        break;
      case 'shopping':
        setShoppingCart(cart);
        break;
    }
  }, []);

  // Add item to cart
  const addItem = useCallback((item: CartItem, cartType: CartType) => {
    setCartByType(cartType, (prev: CartState) => {
      const existingItem = prev.items.find(i => i.id === item.id);
      let newItems: CartItem[];
      
      if (existingItem) {
        newItems = prev.items.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      } else {
        newItems = [...prev.items, item];
      }
      
      return { ...prev, items: newItems };
    });
  }, [setCartByType]);

  // Remove item from cart (delete completely)
  const removeItem = useCallback((itemId: string, cartType: CartType) => {
    setCartByType(cartType, (prev: CartState) => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
    }));
  }, [setCartByType]);

  // Update item quantity
  const updateQuantity = useCallback((itemId: string, quantity: number, cartType: CartType) => {
    setCartByType(cartType, (prev: CartState) => {
      if (quantity <= 0) {
        return {
          ...prev,
          items: prev.items.filter(i => i.id !== itemId),
        };
      }
      return {
        ...prev,
        items: prev.items.map(i =>
          i.id === itemId ? { ...i, quantity } : i
        ),
      };
    });
  }, [setCartByType]);

  // Clear cart
  const clearCart = useCallback((cartType: CartType) => {
    setCartByType(cartType, initialCartState);
  }, [setCartByType]);

  // Set delivery fee
  const setDeliveryFee = useCallback((fee: number, cartType: CartType) => {
    setCartByType(cartType, (prev: CartState) => ({
      ...prev,
      deliveryFee: fee,
    }));
  }, [setCartByType]);

  // Set service info
  const setServiceInfo = useCallback((serviceId: string, serviceName: string, cartType: CartType) => {
    setCartByType(cartType, (prev: CartState) => ({
      ...prev,
      serviceId,
      serviceName,
    }));
  }, [setCartByType]);

  // Get cart total (subtotal)
  const getCartTotal = useCallback((cartType: CartType): number => {
    const cart = getCartByType(cartType);
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [getCartByType]);

  // Get cart count
  const getCartCount = useCallback((cartType: CartType): number => {
    const cart = getCartByType(cartType);
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [getCartByType]);

  // Get grand total (subtotal + delivery fee)
  const getGrandTotal = useCallback((cartType: CartType): number => {
    const cart = getCartByType(cartType);
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return subtotal + cart.deliveryFee;
  }, [getCartByType]);

  // Get active cart
  const getActiveCart = useCallback((): CartState => {
    return getCartByType(activeCartType);
  }, [activeCartType, getCartByType]);

  // Set checkout cart
  const setCheckoutCart = useCallback((cartType: CartType) => {
    setCheckoutCartState(getCartByType(cartType));
  }, [getCartByType]);

  // Clear checkout cart
  const clearCheckoutCart = useCallback(() => {
    setCheckoutCartState(null);
  }, []);

  const value = useMemo(() => ({
    foodCart,
    groceryCart,
    healthCart,
    shoppingCart,
    activeCartType,
    setActiveCartType,
    getActiveCart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setDeliveryFee,
    setServiceInfo,
    getCartTotal,
    getCartCount,
    getGrandTotal,
    checkoutCart,
    setCheckoutCart,
    clearCheckoutCart,
  }), [
    foodCart,
    groceryCart,
    healthCart,
    shoppingCart,
    activeCartType,
    getActiveCart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setDeliveryFee,
    setServiceInfo,
    getCartTotal,
    getCartCount,
    getGrandTotal,
    checkoutCart,
    setCheckoutCart,
    clearCheckoutCart,
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// Hook for a specific cart type
export function useCartForType(cartType: CartType) {
  const {
    getCartByType,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setDeliveryFee,
    setServiceInfo,
    getCartTotal,
    getCartCount,
    getGrandTotal,
    setCheckoutCart,
  } = useCart();

  const cart = getCartByType(cartType);
  const total = getCartTotal(cartType);
  const count = getCartCount(cartType);
  const grandTotal = getGrandTotal(cartType);

  return {
    cart,
    total,
    count,
    grandTotal,
    addItem: (item: CartItem) => addItem(item, cartType),
    removeItem: (itemId: string) => removeItem(itemId, cartType),
    updateQuantity: (itemId: string, quantity: number) => updateQuantity(itemId, quantity, cartType),
    clearCart: () => clearCart(cartType),
    setDeliveryFee: (fee: number) => setDeliveryFee(fee, cartType),
    setServiceInfo: (serviceId: string, serviceName: string) => setServiceInfo(serviceId, serviceName, cartType),
    proceedToCheckout: () => setCheckoutCart(cartType),
  };
}

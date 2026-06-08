'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ShoppingCart,
  Store,
  Search,
  Clock,
  ChevronRight,
  Star,
  Plus,
  Minus,
  Trash2,
  Package,
  Check,
  MapPin,
  CreditCard,
  Wallet,
  Smartphone,
  Truck,
  ShoppingBag,
  Home,
  Loader2,
  X,
  MessageSquare,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { getServiceColors } from '@/lib/theme/smart-ride-theme';

// ============================================
// Types - Using real DB models
// ============================================

type ShoppingStep = 'stores' | 'products' | 'cart' | 'checkout' | 'tracking';

interface Merchant {
  id: string;
  name: string;
  type: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isOpen: boolean;
  averagePrepTime: number;
  rating: number;
  totalOrders: number;
  openingTime?: string;
  closingTime?: string;
  logoUrl?: string;
  _count?: { menuItems: number; orders: number };
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable: boolean;
  preparationTime?: number;
}

interface CartItem {
  product: MenuItem;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  merchantName: string;
  items: CartItem[];
  total: number;
  deliveryFee: number;
  status: string;
  estimatedDelivery: string;
  riderName?: string;
  riderPhone?: string;
  deliveryAddress: string;
}

// ============================================
// Helper Components
// ============================================

interface QuantityControlProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  size?: 'sm' | 'md';
}

function QuantityControl({ quantity, onIncrease, onDecrease, size = 'md' }: QuantityControlProps) {
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10';
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDecrease}
        className={cn(
          "rounded-full flex items-center justify-center transition-all",
          sizeClasses,
          quantity <= 0 
            ? "bg-white/10 text-[#bec9bf]" 
            : "bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30"
        )}
      >
        {quantity <= 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className={cn(
        "font-semibold min-w-[2rem] text-center",
        size === 'sm' ? "text-sm" : "text-lg",
        "text-[#191c1d]"
      )}>
        {quantity}
      </span>
      <button
        onClick={onIncrease}
        className={cn(
          "rounded-full bg-[#8B5CF6] flex items-center justify-center hover:bg-[#7C3AED] transition-all",
          sizeClasses,
          "text-[#191c1d]"
        )}
        style={{ boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)' }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

interface ShoppingScreenProps {
  onBack: () => void;
}

export function ShoppingScreen({ onBack }: ShoppingScreenProps) {
  const serviceColors = getServiceColors('shopping');
  
  // State
  const [step, setStep] = useState<ShoppingStep>('stores');
  const [selectedStore, setSelectedStore] = useState<Merchant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [productCategory, setProductCategory] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MTN_MOMO' | 'AIRTEL_MONEY' | 'WALLET'>('CASH');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // API state
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Fetch real merchants from DB
  useEffect(() => {
    const fetchMerchants = async () => {
      setIsLoadingMerchants(true);
      try {
        // Fetch all shopping-relevant merchant types
        const types = ['SUPERMARKET', 'RETAIL_STORE', 'GROCERY'];
        const allMerchants: Merchant[] = [];

        for (const type of types) {
          try {
            const response = await fetch(`/api/merchants?type=${type}&status=APPROVED&limit=50`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                const items = data.data.items || data.data || [];
                allMerchants.push(...items);
              }
            }
          } catch (err) {
            console.error(`[Shopping] Failed to fetch ${type} merchants:`, err);
          }
        }

        setMerchants(allMerchants);
      } catch (err) {
        console.error('[Shopping] Failed to fetch merchants:', err);
      } finally {
        setIsLoadingMerchants(false);
      }
    };

    fetchMerchants();
  }, []);

  // Fetch menu items when store is selected
  const fetchMenuItems = useCallback(async (merchantId: string) => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch(`/api/merchants/${merchantId}/menu`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMenuItems(data.data.menuItems || []);
        }
      }
    } catch (err) {
      console.error('[Shopping] Failed to fetch menu items:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Derived data
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);
  
  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);
  
  const filteredStores = useMemo(() => {
    let stores = merchants;
    if (searchQuery) {
      stores = stores.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return stores;
  }, [merchants, searchQuery]);
  
  const storeProducts = useMemo(() => {
    let products = menuItems.filter(item => item.isAvailable);
    if (productCategory) {
      products = products.filter(p => p.category === productCategory);
    }
    if (searchQuery) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return products;
  }, [menuItems, productCategory, searchQuery]);
  
  const productCategories = useMemo(() => {
    const cats = new Set(menuItems.filter(item => item.isAvailable).map(p => p.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [menuItems]);
  
  // Cart operations
  const addToCart = useCallback((product: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);
  
  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);
  
  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;
      
      const newQuantity = item.quantity + delta;
      
      if (newQuantity <= 0) {
        return prev.filter(i => i.product.id !== productId);
      }
      
      return prev.map(i => 
        i.product.id === productId 
          ? { ...i, quantity: newQuantity }
          : i
      );
    });
  }, []);
  
  const getProductQuantity = useCallback((productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    return item?.quantity || 0;
  }, [cart]);

  // Handle store selection
  const handleSelectStore = useCallback((store: Merchant) => {
    setSelectedStore(store);
    setCart([]);
    setProductCategory(null);
    setSearchQuery('');
    fetchMenuItems(store.id);
    setStep('products');
  }, [fetchMenuItems]);

  // REAL order placement via /api/orders
  const handlePlaceOrder = useCallback(async () => {
    if (!selectedStore || cart.length === 0) return;

    if (!deliveryAddress.trim()) {
      setOrderError('Please enter a delivery address');
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);

    try {
      const orderPayload = {
        clientId: '', // Set server-side from auth
        merchantId: selectedStore.id,
        orderType: 'SHOPPING',
        items: cart.map(item => ({
          menuItemId: item.product.id,
          itemName: item.product.name,
          itemDescription: item.product.description || undefined,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        subtotal: cartTotal,
        deliveryFee: 4000,
        serviceFee: 1000,
        totalAmount: cartTotal + 4000 + 1000,
        paymentMethod: paymentMethod,
        deliveryAddress: deliveryAddress.trim(),
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      const order = data.data;
      setCurrentOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        merchantName: selectedStore.name,
        items: cart,
        total: cartTotal,
        deliveryFee: 4000,
        status: 'ORDER_CREATED',
        estimatedDelivery: `${selectedStore.averagePrepTime + 20}-${selectedStore.averagePrepTime + 40} min`,
        deliveryAddress: deliveryAddress.trim(),
      });
      setCart([]);
      setStep('tracking');
    } catch (err: unknown) {
      console.error('[Shopping] Order creation failed:', err);
      setOrderError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  }, [selectedStore, cart, cartTotal, paymentMethod, deliveryAddress]);

  // Real order tracking via polling
  useEffect(() => {
    if (step !== 'tracking' || !currentOrder) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${currentOrder.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const order = data.data;
            setCurrentOrder(prev => {
              if (!prev) return null;
              return {
                ...prev,
                status: order.status,
                riderName: order.task?.rider?.fullName,
                riderPhone: order.task?.rider?.phone,
              };
            });

            // Stop polling if order is in a terminal state
            if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.status)) {
              clearInterval(pollInterval);
            }
          }
        }
      } catch (err) {
        console.error('[Shopping] Polling error:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [step, currentOrder]);

  // ============================================
  // Render: Order Tracking
  // ============================================

  if (step === 'tracking' && currentOrder) {
    const statusSteps = [
      { id: 'ORDER_CREATED', label: 'Created', icon: Check },
      { id: 'PAYMENT_CONFIRMED', label: 'Confirmed', icon: CreditCard },
      { id: 'PREPARING', label: 'Preparing', icon: Package },
      { id: 'READY_FOR_PICKUP', label: 'Ready', icon: ShoppingBag },
      { id: 'PICKED_UP', label: 'Picked Up', icon: Truck },
      { id: 'DELIVERED', label: 'Delivered', icon: Home },
    ];
    
    const currentStatusIndex = statusSteps.findIndex(s => s.id === currentOrder.status);
    
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-[#191c1d] hover:bg-[#e7e8e9]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#191c1d] ">Order Tracking</h1>
              <p className="text-[#6f7a71] text-sm font-mono">{currentOrder.orderNumber}</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 -mt-4 space-y-4">
          {/* Status Progress */}
          <Card className="p-4 bg-[#f3f4f5]/90 border-[#bec9bf]/20 glass-panel">
            <div className="flex items-center justify-between mb-4">
              {statusSteps.map((status, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const Icon = status.icon;
                
                return (
                  <div key={status.id} className="flex flex-col items-center flex-1">
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isCompleted 
                          ? "bg-[#8B5CF6] text-white" 
                          : "bg-white/10 text-[#bec9bf]"
                      )}
                      style={isCurrent ? { boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' } : undefined}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "text-xs mt-1 text-center",
                      isCompleted ? "text-[#8B5CF6]" : "text-[#bec9bf]"
                    )}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {currentOrder.status !== 'DELIVERED' && (
              <div className="flex items-center gap-2 justify-center text-sm">
                <Clock className="h-4 w-4 text-[#8B5CF6]" />
                <span className="text-[#3f4941]">Estimated delivery: </span>
                <span className="text-[#191c1d] font-semibold">{currentOrder.estimatedDelivery}</span>
              </div>
            )}
          </Card>
          
          {/* Rider Info */}
          {currentOrder.riderName && (
            <Card className="p-4 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-[#8B5CF6]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#191c1d]">{currentOrder.riderName}</p>
                  <p className="text-sm text-[#6f7a71]">Your delivery rider</p>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[#8B5CF6]" />
                  </button>
                  {currentOrder.riderPhone && (
                    <button 
                      className="w-10 h-10 rounded-full bg-[#005f3a]/20 flex items-center justify-center"
                      onClick={() => window.location.href = `tel:${currentOrder.riderPhone}`}
                    >
                      <Phone className="h-5 w-5 text-[#005f3a]" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          )}
          
          {/* Delivery Address */}
          <Card className="p-4 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#8B5CF6] mt-0.5" />
              <div>
                <p className="text-sm text-[#6f7a71]">Delivery Address</p>
                <p className="font-medium text-[#191c1d]">{currentOrder.deliveryAddress}</p>
              </div>
            </div>
          </Card>
          
          {/* Order Items */}
          <Card className="p-4 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
            <p className="text-sm text-[#6f7a71] mb-3">Order from {currentOrder.merchantName}</p>
            <div className="space-y-2">
              {currentOrder.items.map(item => (
                <div key={item.product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[#191c1d]">{item.product.name}</span>
                    <span className="text-[#bec9bf] text-sm">x{item.quantity}</span>
                  </div>
                  <span className="text-[#191c1d] font-medium">
                    UGX {(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#bec9bf]/30 flex justify-between">
              <span className="text-[#6f7a71]">Delivery Fee</span>
              <span className="text-[#191c1d]">UGX {currentOrder.deliveryFee.toLocaleString()}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-[#191c1d] font-semibold">Total</span>
              <span className="text-[#8B5CF6] font-bold text-lg">
                UGX {(currentOrder.total + currentOrder.deliveryFee).toLocaleString()}
              </span>
            </div>
          </Card>
          
          {/* Delivered / Cancelled State */}
          {(currentOrder.status === 'DELIVERED' || currentOrder.status === 'CANCELLED') && (
            <Card className="p-6 bg-[#f3f4f5]/80 border-2 border-[#8B5CF6]/30 glass-panel text-center">
              <div 
                className="w-16 h-16 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)' }}
              >
                <Check className="h-8 w-8 text-[#8B5CF6]" />
              </div>
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#191c1d] mb-2 ">
                {currentOrder.status === 'DELIVERED' ? 'Order Delivered!' : 'Order Cancelled'}
              </h3>
              <p className="text-[#6f7a71] mb-4">
                {currentOrder.status === 'DELIVERED' 
                  ? 'Your order has been delivered successfully' 
                  : 'Your order was cancelled'}
              </p>
              <Button 
                onClick={onBack}
                className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}
              >
                Done
              </Button>
            </Card>
          )}
        </div>
      </div>
    );
  }
  
  // ============================================
  // Render: Checkout
  // ============================================

  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('cart')} className="text-[#191c1d] hover:bg-[#e7e8e9]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#191c1d] ">Checkout</h1>
              <p className="text-[#6f7a71] text-sm">Complete your order</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 -mt-4 space-y-4 pb-32">
          {/* Delivery Address */}
          <Card className="p-4 bg-[#f3f4f5]/90 border-[#bec9bf]/20 glass-panel">
            <p className="text-sm text-[#6f7a71] mb-2">Delivery Address</p>
            <div className="bg-[#edeeef] rounded-xl p-3 flex items-center gap-3 border border-[#bec9bf]/30">
              <MapPin className="h-5 w-5 text-[#8B5CF6]" />
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter delivery address..."
                className="flex-1 bg-transparent outline-none text-[#191c1d] placeholder:text-[#6f7a71]"
              />
            </div>
          </Card>
          
          {/* Store Info */}
          <Card className="p-4 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center">
                <Store className="h-6 w-6 text-[#8B5CF6]" />
              </div>
              <div>
                <p className="font-semibold text-[#191c1d]">{selectedStore?.name}</p>
                <p className="text-sm text-[#6f7a71]">{selectedStore?.address}</p>
              </div>
            </div>
          </Card>
          
          {/* Order Summary */}
          <Card className="p-4 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
            <p className="text-sm text-[#6f7a71] mb-3">Order Summary</p>
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-[#191c1d] text-sm">{item.product.name}</p>
                      <p className="text-[#bec9bf] text-xs">x{item.quantity}</p>
                    </div>
                  </div>
                  <p className="text-[#191c1d] font-medium">
                    UGX {(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#bec9bf]/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#6f7a71]">Subtotal</span>
                <span className="text-[#191c1d]">UGX {cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6f7a71]">Delivery Fee</span>
                <span className="text-[#191c1d]">UGX 4,000</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6f7a71]">Service Fee</span>
                <span className="text-[#191c1d]">UGX 1,000</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#191c1d] font-semibold">Total</span>
                <span className="text-[#8B5CF6] font-bold text-xl">
                  UGX {(cartTotal + 4000 + 1000).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
          
          {/* Payment Method */}
          <Card className="p-4 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
            <p className="text-sm text-[#6f7a71] mb-3">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH' as const, label: 'Cash', icon: 'cash', disabled: false },
                { id: 'MTN_MOMO' as const, label: 'MTN MoMo', icon: 'momo', disabled: true, badge: 'Coming Soon' },
                { id: 'AIRTEL_MONEY' as const, label: 'Airtel', icon: 'momo', disabled: true, badge: 'Coming Soon' },
                { id: 'WALLET' as const, label: 'Wallet', icon: 'wallet', disabled: true, badge: 'Coming Soon' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => !method.disabled && setPaymentMethod(method.id as typeof paymentMethod)}
                  className={cn(
                    "p-3 rounded-xl border flex flex-col items-center gap-1 transition-all relative",
                    paymentMethod === method.id
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/10"
                      : method.disabled
                        ? "border-[#bec9bf]/20 bg-white/[0.02] opacity-50 cursor-not-allowed"
                        : "border-[#bec9bf]/30 bg-white/5 hover:border-[#bec9bf]/40"
                  )}
                >
                  {method.icon === 'cash' && <Wallet className="h-5 w-5 text-[#6f7a71]" />}
                  {method.icon === 'momo' && <Smartphone className="h-5 w-5 text-[#6f7a71]" />}
                  {method.icon === 'wallet' && <CreditCard className="h-5 w-5 text-[#6f7a71]" />}
                  <span className={cn(
                    "text-xs font-medium",
                    paymentMethod === method.id ? "text-[#8B5CF6]" : method.disabled ? "text-[#bec9bf]" : "text-[#6f7a71]"
                  )}>{method.label}</span>
                  {method.badge && (
                    <span className="absolute -top-1 -right-1 text-[8px] bg-white/10 text-[#bec9bf] px-1 rounded">{method.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Error Message */}
          {orderError && (
            <Card className="p-4 bg-red-500/10 border-red-500/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-red-300 text-sm">{orderError}</p>
              </div>
            </Card>
          )}
        </div>
        
        {/* Place Order Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f8f9fa]/90 backdrop-blur-xl border-t border-[#bec9bf]/20">
          <Button 
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder || !deliveryAddress.trim()}
            className="w-full h-14 text-lg font-semibold rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50"
            style={{ boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)' }}
          >
            {isPlacingOrder ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              `Place Order - UGX ${(cartTotal + 4000 + 1000).toLocaleString()}`
            )}
          </Button>
        </div>
      </div>
    );
  }
  
  // ============================================
  // Render: Cart
  // ============================================

  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('products')} className="text-[#191c1d] hover:bg-[#e7e8e9]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#191c1d] ">Your Cart</h1>
              <p className="text-[#6f7a71] text-sm">{cartItemCount} items</p>
            </div>
          </div>
        </div>
        
        {cart.length === 0 ? (
          <div className="px-4 pt-16 text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="h-12 w-12 text-[#bec9bf]" />
            </div>
            <h3 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-semibold text-[#191c1d] mb-2 ">Your cart is empty</h3>
            <p className="text-[#6f7a71] mb-6">Add items from a store to start shopping</p>
            <Button 
              onClick={() => setStep('stores')}
              className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
            >
              Browse Stores
            </Button>
          </div>
        ) : (
          <>
            <div className="px-4 -mt-4 space-y-3 pb-48">
              {/* Store Info */}
              <Card className="p-3 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-[#8B5CF6]" />
                  <span className="text-[#191c1d] font-medium">{selectedStore?.name}</span>
                </div>
              </Card>
              
              {/* Cart Items */}
              {cart.map(item => (
                <Card key={item.product.id} className="p-4 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                      {item.product.imageUrl ? (
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="h-6 w-6 text-[#bec9bf]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#191c1d]">{item.product.name}</p>
                      {item.product.category && <p className="text-sm text-[#6f7a71]">{item.product.category}</p>}
                      <p className="text-[#8B5CF6] font-semibold mt-1">
                        UGX {item.product.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <QuantityControl
                        quantity={item.quantity}
                        onIncrease={() => updateQuantity(item.product.id, 1)}
                        onDecrease={() => updateQuantity(item.product.id, -1)}
                        size="sm"
                      />
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Order Summary */}
              <Card className="p-4 border-2 border-[#8B5CF6]/30 bg-[#f3f4f5]/80 glass-panel">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6f7a71]">Subtotal</span>
                    <span className="text-[#191c1d]">UGX {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6f7a71]">Delivery Fee</span>
                    <span className="text-[#191c1d]">UGX 4,000</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-[#bec9bf]/30 flex justify-between">
                    <span className="text-[#191c1d] font-semibold">Total</span>
                    <span className="text-xl font-bold text-[#8B5CF6]">
                      UGX {(cartTotal + 4000).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Checkout Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f8f9fa]/90 backdrop-blur-xl border-t border-[#bec9bf]/20">
              <Button 
                onClick={() => setStep('checkout')}
                className="w-full h-14 text-lg font-semibold rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                style={{ boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)' }}
              >
                Proceed to Checkout - UGX {(cartTotal + 4000).toLocaleString()}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }
  
  // ============================================
  // Render: Products (Store View)
  // ============================================

  if (step === 'products' && selectedStore) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('stores')} className="text-[#191c1d] hover:bg-[#e7e8e9]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#191c1d] ">{selectedStore.name}</h1>
              <div className="flex items-center gap-2 text-sm text-[#6f7a71]">
                <Clock className="h-3 w-3" />
                <span>{selectedStore.averagePrepTime} min</span>
                <span className="text-[#bec9bf]">|</span>
                <Star className="h-3 w-3 text-yellow-500" />
                <span>{selectedStore.rating.toFixed(1)}</span>
              </div>
            </div>
            {cartItemCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep('cart')}
                className="text-[#191c1d] hover:bg-[#e7e8e9] relative"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8B5CF6] rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              </Button>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#bec9bf]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-12 pl-10 pr-4 bg-[#edeeef] rounded-xl border border-[#bec9bf]/30 text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#8B5CF6]/50 focus:outline-none transition-colors"
            />
          </div>
        </div>
        
        <div className="px-4 -mt-4">
          {isLoadingProducts ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-[#8B5CF6] animate-spin mb-3" />
              <p className="text-[#6f7a71]">Loading products...</p>
            </div>
          ) : (
            <>
              {/* Categories */}
              {productCategories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                  <button
                    onClick={() => setProductCategory(null)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                      !productCategory 
                        ? "bg-[#8B5CF6] text-white" 
                        : "bg-white/5 text-[#6f7a71] hover:bg-[#e7e8e9]"
                    )}
                  >
                    All
                  </button>
                  {productCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setProductCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                        productCategory === cat 
                          ? "bg-[#8B5CF6] text-white" 
                          : "bg-white/5 text-[#6f7a71] hover:bg-[#e7e8e9]"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Products Grid */}
              {storeProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Package className="h-12 w-12 text-[#bec9bf] mb-3" />
                  <p className="text-[#6f7a71]">No products available</p>
                  <p className="text-[#bec9bf] text-sm mt-1">This store has not added products yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pb-32">
                  {storeProducts.map(product => {
                    const quantity = getProductQuantity(product.id);
                    
                    return (
                      <Card key={product.id} className="p-3 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card">
                        <div className="w-full h-20 rounded-lg bg-white/5 flex items-center justify-center mb-2 overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="h-8 w-8 text-[#bec9bf]" />
                          )}
                        </div>
                        <p className="text-[#191c1d] text-sm font-medium truncate">{product.name}</p>
                        {product.category && (
                          <p className="text-[#bec9bf] text-xs">{product.category}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[#8B5CF6] font-semibold text-sm">UGX {product.price.toLocaleString()}</p>
                          {quantity > 0 ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateQuantity(product.id, -1)}
                                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[#191c1d]"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-[#191c1d] text-sm w-5 text-center">{quantity}</span>
                              <button
                                onClick={() => addToCart(product)}
                                className="w-6 h-6 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="w-7 h-7 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center"
                            >
                              <Plus className="h-4 w-4 text-[#8B5CF6]" />
                            </button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Cart Float Button */}
        {cartItemCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#f8f9fa]/90 backdrop-blur-xl border-t border-[#bec9bf]/20">
            <Button 
              onClick={() => setStep('cart')}
              className="w-full h-14 text-lg font-semibold rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
              style={{ boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)' }}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              View Cart ({cartItemCount}) - UGX {cartTotal.toLocaleString()}
            </Button>
          </div>
        )}
      </div>
    );
  }
  
  // ============================================
  // Render: Stores (Default)
  // ============================================

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div 
        className="px-4 pt-4 pb-6"
        style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-[#191c1d] hover:bg-[#e7e8e9]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#191c1d] ">Shopping</h1>
            <p className="text-[#6f7a71] text-sm">Browse stores and order items</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#bec9bf]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores..."
            className="w-full h-12 pl-10 pr-4 bg-[#edeeef] rounded-xl border border-[#bec9bf]/30 text-[#191c1d] placeholder:text-[#6f7a71] focus:border-[#8B5CF6]/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="px-4 -mt-4">
        {isLoadingMerchants ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-[#8B5CF6] animate-spin mb-4" />
            <p className="text-[#6f7a71]">Loading stores...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Store className="h-12 w-12 text-[#bec9bf] mb-4" />
            <p className="text-[#6f7a71] font-medium mb-2">No stores available yet</p>
            <p className="text-[#bec9bf] text-sm text-center">Shopping stores will appear here once they are registered and approved</p>
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {filteredStores.map((store) => (
              <Card
                key={store.id}
                className="p-4 bg-[#f3f4f5]/80 border-[#bec9bf]/20 glass-card cursor-pointer hover:border-[#8B5CF6]/30 transition-all"
                onClick={() => handleSelectStore(store)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="w-full h-full rounded-xl object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Store className="h-7 w-7 text-[#8B5CF6]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[#191c1d] font-semibold truncate">{store.name}</p>
                      {store.isOpen ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Open</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Closed</span>
                      )}
                    </div>
                    <p className="text-[#6f7a71] text-sm truncate">{store.address}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-[#bec9bf] text-xs">{store.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#bec9bf]" />
                        <span className="text-[#bec9bf] text-xs">{store.averagePrepTime} min</span>
                      </div>
                      {store._count && (
                        <span className="text-[#bec9bf] text-xs">{store._count.menuItems} items</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#bec9bf] flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

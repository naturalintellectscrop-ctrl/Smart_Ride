'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
  Tag,
  Loader2,
  X,
  MessageSquare,
  Phone
} from 'lucide-react';
import { getServiceColors } from '@/lib/theme/smart-ride-theme';

// ============================================
// Types
// ============================================

type ShoppingStep = 'stores' | 'products' | 'cart' | 'checkout' | 'tracking';

interface Store {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  image: string;
  isOpen: boolean;
  address: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Product {
  id: string;
  storeId: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  unit: string;
  image: string;
  inStock: boolean;
  description?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  storeName: string;
  items: CartItem[];
  total: number;
  deliveryFee: number;
  status: 'confirmed' | 'preparing' | 'picked_up' | 'on_the_way' | 'delivered';
  estimatedDelivery: string;
  riderName?: string;
  riderPhone?: string;
  deliveryAddress: string;
}

// ============================================
// Mock Data - Kampala Stores & Products
// ============================================

const STORE_CATEGORIES: Category[] = [
  { id: 'supermarket', name: 'Supermarkets', icon: '🏪' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'fashion', name: 'Fashion', icon: '👗' },
  { id: 'home', name: 'Home & Garden', icon: '🏠' },
];

const MOCK_STORES: Store[] = [
  {
    id: 'shoprite-1',
    name: 'Shoprite Kampala',
    category: 'supermarket',
    rating: 4.5,
    reviewCount: 1250,
    deliveryTime: '30-45 min',
    deliveryFee: 3500,
    minOrder: 20000,
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Garden City Mall, Kampala'
  },
  {
    id: 'carrefour-1',
    name: 'Carrefour Acacia',
    category: 'supermarket',
    rating: 4.6,
    reviewCount: 980,
    deliveryTime: '25-40 min',
    deliveryFee: 3000,
    minOrder: 15000,
    image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Acacia Mall, Kololo'
  },
  {
    id: 'umeme-1',
    name: 'Umeme Electronics',
    category: 'electronics',
    rating: 4.3,
    reviewCount: 450,
    deliveryTime: '1-2 hrs',
    deliveryFee: 5000,
    minOrder: 50000,
    image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'William Street, Kampala'
  },
  {
    id: 'ugo-1',
    name: 'Ugo Fashion',
    category: 'fashion',
    rating: 4.4,
    reviewCount: 320,
    deliveryTime: '45-60 min',
    deliveryFee: 4000,
    minOrder: 30000,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
    isOpen: false,
    address: 'Bugolobi, Kampala'
  },
  {
    id: 'nakumatt-1',
    name: 'Nakumatt Oasis',
    category: 'supermarket',
    rating: 4.2,
    reviewCount: 760,
    deliveryTime: '35-50 min',
    deliveryFee: 4000,
    minOrder: 25000,
    image: 'https://images.unsplash.com/photo-1601599963565-b7f49dfffc14?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Oasis Mall, Kampala'
  },
];

const MOCK_PRODUCTS: Product[] = [
  // Shoprite Products
  { id: 'p1', storeId: 'shoprite-1', name: 'Rice (Basmati) 2kg', category: 'Grains', price: 18500, unit: 'pack', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop', inStock: true },
  { id: 'p2', storeId: 'shoprite-1', name: 'Cooking Oil 3L', category: 'Oils', price: 28000, originalPrice: 32000, unit: 'bottle', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop', inStock: true },
  { id: 'p3', storeId: 'shoprite-1', name: 'Sugar 2kg', category: 'Sugar', price: 12000, unit: 'pack', image: 'https://images.unsplash.com/photo-1558736842-e8f2c9b2a2b0?w=200&h=200&fit=crop', inStock: true },
  { id: 'p4', storeId: 'shoprite-1', name: 'Milk (Fresh) 1L', category: 'Dairy', price: 4500, unit: 'bottle', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop', inStock: true },
  { id: 'p5', storeId: 'shoprite-1', name: 'Bread (Whole Wheat)', category: 'Bakery', price: 5500, unit: 'loaf', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop', inStock: true },
  { id: 'p6', storeId: 'shoprite-1', name: 'Eggs (Tray of 30)', category: 'Dairy', price: 18000, unit: 'tray', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop', inStock: true },
  { id: 'p7', storeId: 'shoprite-1', name: 'Flour (Wheat) 2kg', category: 'Grains', price: 9500, unit: 'pack', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop', inStock: true },
  { id: 'p8', storeId: 'shoprite-1', name: 'Salt 1kg', category: 'Spices', price: 2000, unit: 'pack', image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=200&h=200&fit=crop', inStock: true },
  { id: 'p9', storeId: 'shoprite-1', name: 'Soap (Bar) Pack of 6', category: 'Household', price: 15000, unit: 'pack', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=200&h=200&fit=crop', inStock: true },
  { id: 'p10', storeId: 'shoprite-1', name: 'Toothpaste', category: 'Personal Care', price: 8500, unit: 'tube', image: 'https://images.unsplash.com/photo-1559056199-5c5fa3b92a06?w=200&h=200&fit=crop', inStock: true },
  
  // Carrefour Products
  { id: 'p11', storeId: 'carrefour-1', name: 'Chicken (Whole)', category: 'Meat', price: 25000, unit: 'kg', image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=200&h=200&fit=crop', inStock: true },
  { id: 'p12', storeId: 'carrefour-1', name: 'Tomatoes 1kg', category: 'Vegetables', price: 5000, unit: 'kg', image: 'https://images.unsplash.com/photo-1546470427-f5cd9683e2eb?w=200&h=200&fit=crop', inStock: true },
  { id: 'p13', storeId: 'carrefour-1', name: 'Onions 1kg', category: 'Vegetables', price: 3500, unit: 'kg', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=200&h=200&fit=crop', inStock: true },
  { id: 'p14', storeId: 'carrefour-1', name: 'Potatoes 2kg', category: 'Vegetables', price: 8000, unit: 'pack', image: 'https://images.unsplash.com/photo-1518977676601-b53f82ber9f?w=200&h=200&fit=crop', inStock: true },
  { id: 'p15', storeId: 'carrefour-1', name: 'Bananas (Bunch)', category: 'Fruits', price: 6000, unit: 'bunch', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop', inStock: true },
  { id: 'p16', storeId: 'carrefour-1', name: 'Apples 1kg', category: 'Fruits', price: 12000, unit: 'kg', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200&h=200&fit=crop', inStock: true },
  { id: 'p17', storeId: 'carrefour-1', name: 'Juice (Orange) 1L', category: 'Beverages', price: 7500, unit: 'bottle', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=200&h=200&fit=crop', inStock: true },
  { id: 'p18', storeId: 'carrefour-1', name: 'Water (Pack 12)', category: 'Beverages', price: 10000, unit: 'pack', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200&h=200&fit=crop', inStock: true },
  
  // Electronics Products
  { id: 'p19', storeId: 'umeme-1', name: 'Phone Charger (USB-C)', category: 'Accessories', price: 25000, unit: 'piece', image: 'https://images.unsplash.com/photo-1583863788434-e62bd6bd8b4d?w=200&h=200&fit=crop', inStock: true },
  { id: 'p20', storeId: 'umeme-1', name: 'Power Bank 10000mAh', category: 'Accessories', price: 85000, originalPrice: 100000, unit: 'piece', image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=200&h=200&fit=crop', inStock: true },
  { id: 'p21', storeId: 'umeme-1', name: 'Earphones (Wireless)', category: 'Audio', price: 45000, unit: 'piece', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop', inStock: true },
  { id: 'p22', storeId: 'umeme-1', name: 'LED Bulb (5W)', category: 'Lighting', price: 8000, unit: 'piece', image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200&h=200&fit=crop', inStock: true },
  
  // Fashion Products
  { id: 'p27', storeId: 'ugo-1', name: 'Cotton T-Shirt', category: 'Clothing', price: 35000, unit: 'piece', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop', inStock: true },
  { id: 'p28', storeId: 'ugo-1', name: 'Jeans (Slim Fit)', category: 'Clothing', price: 75000, originalPrice: 90000, unit: 'piece', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&h=200&fit=crop', inStock: true },
  
  // Nakumatt Products
  { id: 'p29', storeId: 'nakumatt-1', name: 'Detergent 2kg', category: 'Household', price: 22000, unit: 'pack', image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=200&h=200&fit=crop', inStock: true },
  { id: 'p30', storeId: 'nakumatt-1', name: 'Dish Soap 750ml', category: 'Household', price: 6500, unit: 'bottle', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=200&h=200&fit=crop', inStock: true },
  { id: 'p31', storeId: 'nakumatt-1', name: 'Tissues (Pack 10)', category: 'Household', price: 12000, unit: 'pack', image: 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=200&h=200&fit=crop', inStock: true },
  { id: 'p32', storeId: 'nakumatt-1', name: 'Maize Flour 5kg', category: 'Grains', price: 18000, unit: 'pack', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop', inStock: true },
];

const DELIVERY_ADDRESS = 'Ntinda, Kampala';

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
            ? "bg-white/10 text-white/30" 
            : "bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30"
        )}
      >
        {quantity <= 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className={cn(
        "font-semibold min-w-[2rem] text-center",
        size === 'sm' ? "text-sm" : "text-lg",
        "text-white"
      )}>
        {quantity}
      </span>
      <button
        onClick={onIncrease}
        className={cn(
          "rounded-full bg-[#8B5CF6] flex items-center justify-center hover:bg-[#7C3AED] transition-all",
          sizeClasses,
          "text-white"
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [productCategory, setProductCategory] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'WALLET'>('MOBILE_MONEY');
  
  // Derived data
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);
  
  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);
  
  const filteredStores = useMemo(() => {
    let stores = MOCK_STORES;
    if (selectedCategory) {
      stores = stores.filter(s => s.category === selectedCategory);
    }
    if (searchQuery) {
      stores = stores.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return stores;
  }, [selectedCategory, searchQuery]);
  
  const storeProducts = useMemo(() => {
    if (!selectedStore) return [];
    let products = MOCK_PRODUCTS.filter(p => p.storeId === selectedStore.id);
    if (productCategory) {
      products = products.filter(p => p.category === productCategory);
    }
    if (searchQuery) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return products;
  }, [selectedStore, productCategory, searchQuery]);
  
  const productCategories = useMemo(() => {
    if (!selectedStore) return [];
    const cats = new Set(MOCK_PRODUCTS.filter(p => p.storeId === selectedStore.id).map(p => p.category));
    return Array.from(cats);
  }, [selectedStore]);
  
  // Cart operations
  const addToCart = useCallback((product: Product) => {
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
      
      // If quantity goes to 0 or below, remove the item
      if (newQuantity <= 0) {
        return prev.filter(i => i.product.id !== productId);
      }
      
      // Otherwise update the quantity
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
  
  // Place order
  const handlePlaceOrder = useCallback(() => {
    if (!selectedStore || cart.length === 0) return;
    
    const order: Order = {
      id: `order_${Date.now()}`,
      orderNumber: `SH${Date.now().toString().slice(-8)}`,
      storeName: selectedStore.name,
      items: cart,
      total: cartTotal,
      deliveryFee: selectedStore.deliveryFee,
      status: 'confirmed',
      estimatedDelivery: '45-60 min',
      riderName: 'David Mukasa',
      riderPhone: '+256 701 234 567',
      deliveryAddress: DELIVERY_ADDRESS
    };
    
    setCurrentOrder(order);
    setCart([]);
    setStep('tracking');
    
    // Simulate order progression
    setTimeout(() => {
      setCurrentOrder(prev => prev ? { ...prev, status: 'preparing' } : null);
    }, 3000);
    
    setTimeout(() => {
      setCurrentOrder(prev => prev ? { ...prev, status: 'picked_up' } : null);
    }, 8000);
    
    setTimeout(() => {
      setCurrentOrder(prev => prev ? { ...prev, status: 'on_the_way' } : null);
    }, 12000);
    
    setTimeout(() => {
      setCurrentOrder(prev => prev ? { ...prev, status: 'delivered' } : null);
    }, 20000);
  }, [selectedStore, cart, cartTotal]);
  
  // ============================================
  // Render: Order Tracking
  // ============================================
  
  if (step === 'tracking' && currentOrder) {
    const statusSteps = [
      { id: 'confirmed', label: 'Confirmed', icon: Check },
      { id: 'preparing', label: 'Preparing', icon: Package },
      { id: 'picked_up', label: 'Picked Up', icon: ShoppingBag },
      { id: 'on_the_way', label: 'On The Way', icon: Truck },
      { id: 'delivered', label: 'Delivered', icon: Home },
    ];
    
    const currentStatusIndex = statusSteps.findIndex(s => s.id === currentOrder.status);
    
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Order Tracking</h1>
              <p className="text-white/60 text-sm font-mono">{currentOrder.orderNumber}</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 -mt-4 space-y-4">
          {/* Status Progress */}
          <Card className="p-4 bg-[#1A1A24]/90 border-white/5 glass-panel">
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
                          : "bg-white/10 text-white/30"
                      )}
                      style={isCurrent ? { boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' } : undefined}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "text-xs mt-1 text-center",
                      isCompleted ? "text-[#8B5CF6]" : "text-white/30"
                    )}>
                      {status.label}
                    </span>
                    {index < statusSteps.length - 1 && (
                      <div 
                        className={cn(
                          "absolute h-0.5 w-full left-1/2 top-5",
                          index < currentStatusIndex ? "bg-[#8B5CF6]" : "bg-white/10"
                        )}
                        style={{ width: 'calc(100% - 2.5rem)' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            {currentOrder.status !== 'delivered' && (
              <div className="flex items-center gap-2 justify-center text-sm">
                <Clock className="h-4 w-4 text-[#8B5CF6]" />
                <span className="text-white/70">Estimated delivery: </span>
                <span className="text-white font-semibold">{currentOrder.estimatedDelivery}</span>
              </div>
            )}
          </Card>
          
          {/* Rider Info */}
          {currentOrder.status !== 'delivered' && currentOrder.riderName && (
            <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-[#8B5CF6]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{currentOrder.riderName}</p>
                  <p className="text-sm text-white/50">Your delivery rider</p>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[#8B5CF6]" />
                  </button>
                  <button 
                    className="w-10 h-10 rounded-full bg-[#00FF88]/20 flex items-center justify-center"
                    onClick={() => window.location.href = `tel:${currentOrder.riderPhone}`}
                  >
                    <Phone className="h-5 w-5 text-[#00FF88]" />
                  </button>
                </div>
              </div>
            </Card>
          )}
          
          {/* Delivery Address */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#8B5CF6] mt-0.5" />
              <div>
                <p className="text-sm text-white/50">Delivery Address</p>
                <p className="font-medium text-white">{currentOrder.deliveryAddress}</p>
              </div>
            </div>
          </Card>
          
          {/* Order Items */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <p className="text-sm text-white/50 mb-3">Order from {currentOrder.storeName}</p>
            <div className="space-y-2">
              {currentOrder.items.map(item => (
                <div key={item.product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.product.image}</span>
                    <span className="text-white">{item.product.name}</span>
                    <span className="text-white/40 text-sm">×{item.quantity}</span>
                  </div>
                  <span className="text-white font-medium">
                    UGX {(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
              <span className="text-white/50">Delivery Fee</span>
              <span className="text-white">UGX {currentOrder.deliveryFee.toLocaleString()}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-[#8B5CF6] font-bold text-lg">
                UGX {(currentOrder.total + currentOrder.deliveryFee).toLocaleString()}
              </span>
            </div>
          </Card>
          
          {/* Delivered State */}
          {currentOrder.status === 'delivered' && (
            <Card className="p-6 bg-[#1A1A24]/80 border-2 border-[#8B5CF6]/30 glass-panel text-center">
              <div 
                className="w-16 h-16 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center mx-auto mb-4"
                style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)' }}
              >
                <Check className="h-8 w-8 text-[#8B5CF6]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Order Delivered!</h3>
              <p className="text-white/60 mb-4">Your order has been delivered successfully</p>
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
      <div className="min-h-screen bg-[#0D0D12]">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('cart')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Checkout</h1>
              <p className="text-white/60 text-sm">Complete your order</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 -mt-4 space-y-4 pb-32">
          {/* Delivery Address */}
          <Card className="p-4 bg-[#1A1A24]/90 border-white/5 glass-panel">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white/50">Delivery Address</p>
              <button className="text-[#8B5CF6] text-sm font-medium">Change</button>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#8B5CF6] mt-0.5" />
              <p className="font-medium text-white">{DELIVERY_ADDRESS}</p>
            </div>
          </Card>
          
          {/* Store Info */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center text-2xl">
                {selectedStore?.image}
              </div>
              <div>
                <p className="font-semibold text-white">{selectedStore?.name}</p>
                <p className="text-sm text-white/50">{selectedStore?.deliveryTime} • UGX {selectedStore?.deliveryFee.toLocaleString()} delivery</p>
              </div>
            </div>
          </Card>
          
          {/* Order Summary */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <p className="text-sm text-white/50 mb-3">Order Summary</p>
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.product.image}</span>
                    <div>
                      <p className="text-white text-sm">{item.product.name}</p>
                      <p className="text-white/40 text-xs">×{item.quantity}</p>
                    </div>
                  </div>
                  <p className="text-white font-medium">
                    UGX {(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white">UGX {cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Delivery Fee</span>
                <span className="text-white">UGX {selectedStore?.deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-white font-semibold">Total</span>
                <span className="text-[#8B5CF6] font-bold text-xl">
                  UGX {(cartTotal + (selectedStore?.deliveryFee || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
          
          {/* Payment Method */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
            <p className="text-sm text-white/50 mb-3">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: '💵' },
                { id: 'MOBILE_MONEY', label: 'MoMo', icon: '📱' },
                { id: 'WALLET', label: 'Wallet', icon: '💳' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                  className={cn(
                    "p-3 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    paymentMethod === method.id
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    paymentMethod === method.id ? "text-[#8B5CF6]" : "text-white/60"
                  )}>{method.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
        
        {/* Place Order Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12]/90 backdrop-blur-xl border-t border-white/5">
          <Button 
            onClick={handlePlaceOrder}
            className="w-full h-14 text-lg font-semibold rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
            style={{ boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)' }}
          >
            Place Order • UGX {(cartTotal + (selectedStore?.deliveryFee || 0)).toLocaleString()}
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
      <div className="min-h-screen bg-[#0D0D12]">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('products')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Your Cart</h1>
              <p className="text-white/60 text-sm">{cartItemCount} items</p>
            </div>
          </div>
        </div>
        
        {cart.length === 0 ? (
          <div className="px-4 pt-16 text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="h-12 w-12 text-white/20" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Your cart is empty</h3>
            <p className="text-white/50 mb-6">Add items from a store to start shopping</p>
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
              <Card className="p-3 bg-[#1A1A24]/80 border-white/5 glass-card">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-[#8B5CF6]" />
                  <span className="text-white font-medium">{selectedStore?.name}</span>
                </div>
              </Card>
              
              {/* Cart Items */}
              {cart.map(item => (
                <Card key={item.product.id} className="p-4 bg-[#1A1A24]/80 border-white/5 glass-card">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                      <img 
                        src={item.product.image} 
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.product.name}</p>
                      <p className="text-sm text-white/50">{item.product.unit}</p>
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
              <Card className="p-4 border-2 border-[#8B5CF6]/30 bg-[#1A1A24]/80 glass-panel">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Subtotal</span>
                    <span className="text-white">UGX {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Delivery Fee</span>
                    <span className="text-white">UGX {selectedStore?.deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-white/10 flex justify-between">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-xl font-bold text-[#8B5CF6]">
                      UGX {(cartTotal + (selectedStore?.deliveryFee || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Checkout Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12]/90 backdrop-blur-xl border-t border-white/5">
              <Button 
                onClick={() => setStep('checkout')}
                className="w-full h-14 text-lg font-semibold rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                style={{ boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)' }}
              >
                Proceed to Checkout • UGX {(cartTotal + (selectedStore?.deliveryFee || 0)).toLocaleString()}
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
      <div className="min-h-screen bg-[#0D0D12]">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('stores')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{selectedStore.name}</h1>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Clock className="h-3 w-3" />
                <span>{selectedStore.deliveryTime}</span>
                <span className="text-white/30">•</span>
                <span>UGX {selectedStore.deliveryFee.toLocaleString()} delivery</span>
              </div>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-12 pl-10 pr-4 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#8B5CF6]/50 focus:outline-none transition-colors"
            />
          </div>
        </div>
        
        <div className="px-4 -mt-4">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <button
              onClick={() => setProductCategory(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                !productCategory 
                  ? "bg-[#8B5CF6] text-white" 
                  : "bg-white/5 text-white/60 hover:bg-white/10"
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
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          
          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-3 pb-32">
            {storeProducts.map(product => {
              const quantity = getProductQuantity(product.id);
              
              return (
                <Card key={product.id} className="p-3 bg-[#1A1A24]/80 border-white/5 glass-card">
                  <div className="w-full h-20 rounded-lg bg-white/5 flex items-center justify-center mb-2 overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="font-medium text-white text-sm line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-white/40">{product.unit}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-[#8B5CF6] font-bold">UGX {product.price.toLocaleString()}</p>
                      {product.originalPrice && (
                        <p className="text-xs text-white/40 line-through">UGX {product.originalPrice.toLocaleString()}</p>
                      )}
                    </div>
                    {quantity > 0 ? (
                      <QuantityControl
                        quantity={quantity}
                        onIncrease={() => addToCart(product)}
                        onDecrease={() => updateQuantity(product.id, -1)}
                        size="sm"
                      />
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="w-10 h-10 rounded-full bg-[#8B5CF6] flex items-center justify-center hover:bg-[#7C3AED] transition-all"
                        style={{ boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)' }}
                      >
                        <Plus className="h-5 w-5 text-white" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
        
        {/* Cart Button - Mobile-friendly width */}
        {cartItemCount > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
            <button
              onClick={() => setStep('cart')}
              className="w-full h-12 rounded-xl flex items-center justify-between px-4 font-semibold transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <span className="text-white text-sm">{cartItemCount} items</span>
              </div>
              <span className="text-white text-sm">UGX {(cartTotal + (selectedStore?.deliveryFee || 0)).toLocaleString()}</span>
            </button>
          </div>
        )}
      </div>
    );
  }
  
  // ============================================
  // Render: Stores (Default)
  // ============================================
  
  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header */}
      <div 
        className="px-4 pt-4 pb-6"
        style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">Smart Grocery</h1>
            <p className="text-white/60 text-sm">Supermarkets & groceries near you</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores..."
            className="w-full h-12 pl-10 pr-4 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#8B5CF6]/50 focus:outline-none transition-colors"
          />
        </div>
      </div>
      
      <div className="px-4 -mt-4">
        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "flex flex-col items-center gap-2 min-w-[70px]",
              !selectedCategory ? "opacity-100" : "opacity-60"
            )}
          >
            <div 
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all",
                !selectedCategory 
                  ? "bg-[#8B5CF6]/20 border-2 border-[#8B5CF6]" 
                  : "bg-white/5 border border-white/10"
              )}
            >
              🏪
            </div>
            <span className={cn(
              "text-xs font-medium",
              !selectedCategory ? "text-[#8B5CF6]" : "text-white/60"
            )}>
              All
            </span>
          </button>
          {STORE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={cn(
                "flex flex-col items-center gap-2 min-w-[70px]",
                selectedCategory === cat.id ? "opacity-100" : "opacity-60"
              )}
            >
              <div 
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all",
                  selectedCategory === cat.id 
                    ? "bg-[#8B5CF6]/20 border-2 border-[#8B5CF6]" 
                    : "bg-white/5 border border-white/10"
                )}
              >
                {cat.icon}
              </div>
              <span className={cn(
                "text-xs font-medium",
                selectedCategory === cat.id ? "text-[#8B5CF6]" : "text-white/60"
              )}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
        
        {/* Stores List */}
        <div className="space-y-3 pb-24">
          {filteredStores.map(store => (
            <Card 
              key={store.id}
              className={cn(
                "p-4 transition-all cursor-pointer glass-card",
                store.isOpen 
                  ? "bg-[#1A1A24]/80 border-white/5 hover:border-[#8B5CF6]/30" 
                  : "bg-[#1A1A24]/40 border-white/5 opacity-60"
              )}
              onClick={() => {
                if (store.isOpen) {
                  setSelectedStore(store);
                  setSearchQuery('');
                  setStep('products');
                }
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-3xl">
                  {store.image}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{store.name}</h3>
                    {!store.isOpen && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Closed</span>
                    )}
                  </div>
                  <p className="text-sm text-white/50">{store.address}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-white/70">{store.rating}</span>
                      <span className="text-xs text-white/40">({store.reviewCount})</span>
                    </div>
                    <span className="text-white/30">•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-white/40" />
                      <span className="text-xs text-white/60">{store.deliveryTime}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#8B5CF6]">UGX {store.deliveryFee.toLocaleString()}</p>
                  <p className="text-xs text-white/40">delivery</p>
                  <ChevronRight className="h-5 w-5 text-white/30 ml-auto mt-2" />
                </div>
              </div>
            </Card>
          ))}
          
          {filteredStores.length === 0 && (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">No stores found</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Cart FAB */}
      {cartItemCount > 0 && (
        <button
          onClick={() => setStep('cart')}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{ 
            background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)'
          }}
        >
          <ShoppingCart className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {cartItemCount}
          </span>
        </button>
      )}
    </div>
  );
}

export default ShoppingScreen;

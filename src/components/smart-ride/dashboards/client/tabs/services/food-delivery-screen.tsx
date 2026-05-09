'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  ChevronRight,
  CreditCard,
  Wallet,
  Smartphone,
  ChefHat,
  Bike,
  Check,
  Package,
  Utensils,
  Phone,
  MessageSquare,
  Timer,
  Store,
  Navigation,
  ShoppingBag
} from 'lucide-react';
import { getServiceColors } from '@/lib/theme/smart-ride-theme';

// ============================================
// Types
// ============================================

type FlowStep = 'merchants' | 'menu' | 'cart' | 'checkout' | 'confirming' | 'preparing' | 'tracking';

type OrderStatus = 'PLACED' | 'CONFIRMED' | 'KOT_GENERATED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'RIDER_ASSIGNED' | 'PICKED_UP' | 'DELIVERED';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  preparationTime: number; // minutes
  isPopular?: boolean;
  isSpicy?: boolean;
  isVegetarian?: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  icon: string;
}

interface Merchant {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder: number;
  image: string;
  isOpen: boolean;
  address: string;
  distance: number; // km
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  merchant: Merchant;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: string;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'WALLET';
  estimatedDelivery: Date;
  kotGenerated?: boolean;
  rider?: {
    name: string;
    phone: string;
    rating: number;
  };
}

// ============================================
// Mock Data - Kampala Restaurants
// ============================================

const KAMPALA_MERCHANTS: Merchant[] = [
  {
    id: 'm1',
    name: "Mama's Kitchen",
    description: 'Authentic Ugandan cuisine with a modern twist',
    cuisine: ['Ugandan', 'African', 'Traditional'],
    rating: 4.8,
    reviewCount: 342,
    deliveryTime: '25-35 min',
    deliveryFee: 3000,
    minOrder: 15000,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Nakasero, Kampala',
    distance: 2.5
  },
  {
    id: 'm2',
    name: 'Java House',
    description: 'Premium coffee and continental breakfast',
    cuisine: ['Coffee', 'Continental', 'Breakfast'],
    rating: 4.6,
    reviewCount: 567,
    deliveryTime: '20-30 min',
    deliveryFee: 4000,
    minOrder: 20000,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Kololo, Kampala',
    distance: 3.2
  },
  {
    id: 'm3',
    name: 'Cafe Javas',
    description: 'Fresh juices, smoothies, and light meals',
    cuisine: ['Cafe', 'Healthy', 'Juices'],
    rating: 4.7,
    reviewCount: 891,
    deliveryTime: '15-25 min',
    deliveryFee: 2500,
    minOrder: 10000,
    image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Kampala CBD',
    distance: 1.8
  },
  {
    id: 'm4',
    name: 'Nando\'s Kampala',
    description: 'Flame-grilled PERi-PERi chicken',
    cuisine: ['Portuguese', 'Chicken', 'Grilled'],
    rating: 4.5,
    reviewCount: 423,
    deliveryTime: '30-40 min',
    deliveryFee: 5000,
    minOrder: 25000,
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Garden City, Kampala',
    distance: 4.1
  },
  {
    id: 'm5',
    name: 'Street Food Hub',
    description: 'Local street favorites - Rolex, Gonja, muchomo',
    cuisine: ['Street Food', 'Local', 'Fast Food'],
    rating: 4.4,
    reviewCount: 215,
    deliveryTime: '15-20 min',
    deliveryFee: 2000,
    minOrder: 8000,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Wandegeya, Kampala',
    distance: 2.0
  },
  {
    id: 'm6',
    name: 'Zhong Hua',
    description: 'Authentic Chinese cuisine',
    cuisine: ['Chinese', 'Asian', 'Noodles'],
    rating: 4.3,
    reviewCount: 178,
    deliveryTime: '35-45 min',
    deliveryFee: 4500,
    minOrder: 30000,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&h=200&fit=crop',
    isOpen: false,
    address: 'Kampala Road',
    distance: 3.5
  },
  {
    id: 'm7',
    name: 'Pizza Hut Uganda',
    description: 'Hot and fresh pizzas delivered to your door',
    cuisine: ['Pizza', 'Italian', 'Fast Food'],
    rating: 4.4,
    reviewCount: 612,
    deliveryTime: '25-35 min',
    deliveryFee: 4000,
    minOrder: 20000,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Kisementi, Kampala',
    distance: 2.8
  },
  {
    id: 'm8',
    name: 'Healthy Bites',
    description: 'Nutritious salads, bowls, and smoothies',
    cuisine: ['Healthy', 'Salads', 'Vegan'],
    rating: 4.6,
    reviewCount: 189,
    deliveryTime: '20-30 min',
    deliveryFee: 3000,
    minOrder: 15000,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop',
    isOpen: true,
    address: 'Ntinda, Kampala',
    distance: 4.5
  }
];

const MENU_CATEGORIES: MenuCategory[] = [
  { id: 'popular', name: 'Popular', icon: '🔥' },
  { id: 'main', name: 'Main Dishes', icon: '🍽️' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'desserts', name: 'Desserts', icon: '🍰' },
];

const MERCHANT_MENUS: Record<string, MenuItem[]> = {
  'm1': [
    { id: 'i1', name: 'Matooke & Beef Stew', description: 'Steamed green bananas with rich beef stew', price: 18000, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', category: 'main', preparationTime: 15, isPopular: true },
    { id: 'i2', name: 'Luwombo (Chicken)', description: 'Traditional chicken stew steamed in banana leaves', price: 25000, image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop', category: 'main', preparationTime: 20, isPopular: true },
    { id: 'i3', name: 'Kikomando', description: 'Beans and chapati combo', price: 8000, image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200&h=200&fit=crop', category: 'main', preparationTime: 10 },
    { id: 'i4', name: 'Rolex', description: 'Chapati rolled with eggs and vegetables', price: 6000, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop', category: 'snacks', preparationTime: 8, isPopular: true },
    { id: 'i5', name: 'Fresh Passion Juice', description: 'Freshly squeezed passion fruit juice', price: 4000, image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=200&h=200&fit=crop', category: 'drinks', preparationTime: 5 },
    { id: 'i6', name: 'Gonja (Fried Plantain)', description: 'Crispy fried sweet plantains', price: 5000, image: 'https://images.unsplash.com/photo-1600326145456-6e8b7c7c0d5e?w=200&h=200&fit=crop', category: 'snacks', preparationTime: 8 },
  ],
  'm2': [
    { id: 'i7', name: 'English Breakfast', description: 'Eggs, bacon, sausage, beans, toast', price: 22000, image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=200&h=200&fit=crop', category: 'main', preparationTime: 15, isPopular: true },
    { id: 'i8', name: 'Cappuccino', description: 'Rich espresso with steamed milk foam', price: 8000, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=200&h=200&fit=crop', category: 'drinks', preparationTime: 5, isPopular: true },
    { id: 'i9', name: 'Croissant', description: 'Buttery flaky pastry', price: 5000, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&h=200&fit=crop', category: 'snacks', preparationTime: 3 },
    { id: 'i10', name: 'Iced Latte', description: 'Espresso with cold milk over ice', price: 10000, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&h=200&fit=crop', category: 'drinks', preparationTime: 5 },
    { id: 'i11', name: 'Club Sandwich', description: 'Triple-decker chicken bacon sandwich', price: 18000, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&h=200&fit=crop', category: 'main', preparationTime: 12 },
    { id: 'i12', name: 'Chocolate Cake Slice', description: 'Rich chocolate layer cake', price: 8000, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop', category: 'desserts', preparationTime: 3, isVegetarian: true },
  ],
  'm3': [
    { id: 'i13', name: 'Berry Blast Smoothie', description: 'Mixed berries, banana, yogurt blend', price: 12000, image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=200&h=200&fit=crop', category: 'drinks', preparationTime: 5, isPopular: true },
    { id: 'i14', name: 'Mango Tango', description: 'Fresh mango smoothie with a hint of lime', price: 10000, image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=200&h=200&fit=crop', category: 'drinks', preparationTime: 5, isPopular: true },
    { id: 'i15', name: 'Caesar Salad', description: 'Romaine lettuce, parmesan, croutons', price: 15000, image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=200&h=200&fit=crop', category: 'main', preparationTime: 10, isVegetarian: true },
    { id: 'i16', name: 'Avocado Toast', description: 'Smashed avocado on sourdough', price: 12000, image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=200&h=200&fit=crop', category: 'main', preparationTime: 8, isVegetarian: true },
    { id: 'i17', name: 'Fresh Coconut Water', description: 'Natural coconut water served in the nut', price: 5000, image: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?w=200&h=200&fit=crop', category: 'drinks', preparationTime: 3 },
  ],
  'm4': [
    { id: 'i18', name: 'Half Chicken', description: 'PERi-PERi half chicken with two sides', price: 32000, image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop', category: 'main', preparationTime: 25, isPopular: true, isSpicy: true },
    { id: 'i19', name: 'Quarter Chicken', description: 'PERi-PERi quarter chicken with one side', price: 20000, image: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=200&h=200&fit=crop', category: 'main', preparationTime: 20, isSpicy: true },
    { id: 'i20', name: 'Chicken Wings (6pc)', description: 'Flame-grilled wings with PERi-PERi sauce', price: 18000, image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=200&h=200&fit=crop', category: 'snacks', preparationTime: 15, isPopular: true, isSpicy: true },
    { id: 'i21', name: 'Espetada', description: 'Skewered beef with PERi-PERi', price: 35000, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=200&fit=crop', category: 'main', preparationTime: 20, isSpicy: true },
    { id: 'i22', name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 6000, image: 'https://images.unsplash.com/photo-1619531040576-f9416740661b?w=200&h=200&fit=crop', category: 'snacks', preparationTime: 8, isVegetarian: true },
  ],
  'm5': [
    { id: 'i23', name: 'Classic Rolex', description: 'Chapati with 2 eggs and vegetables', price: 4000, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop', category: 'main', preparationTime: 5, isPopular: true },
    { id: 'i24', name: 'Double Rolex', description: 'Double chapati, 3 eggs, extra veggies', price: 6000, image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200&h=200&fit=crop', category: 'main', preparationTime: 7, isPopular: true },
    { id: 'i25', name: 'Muchomo (Skewered Meat)', description: 'Grilled beef skewers with onion', price: 5000, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=200&fit=crop', category: 'main', preparationTime: 10 },
    { id: 'i26', name: 'Samosa (3pc)', description: 'Crispy filled pastries', price: 3000, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop', category: 'snacks', preparationTime: 5 },
    { id: 'i27', name: 'Mandazi (3pc)', description: 'Sweet fried dough snacks', price: 2000, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&h=200&fit=crop', category: 'snacks', preparationTime: 5, isVegetarian: true },
  ],
  'm7': [
    { id: 'i28', name: 'Margherita Pizza (Medium)', description: 'Classic tomato, mozzarella, and basil', price: 28000, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&h=200&fit=crop', category: 'main', preparationTime: 20, isPopular: true, isVegetarian: true },
    { id: 'i29', name: 'Pepperoni Pizza (Medium)', description: 'Loaded with pepperoni slices', price: 32000, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&h=200&fit=crop', category: 'main', preparationTime: 20, isPopular: true },
    { id: 'i30', name: 'Meat Lovers (Medium)', description: 'Beef, pepperoni, sausage, bacon', price: 38000, image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=200&h=200&fit=crop', category: 'main', preparationTime: 25 },
    { id: 'i31', name: 'Garlic Bread Sticks', description: '6 pieces of garlic bread', price: 8000, image: 'https://images.unsplash.com/photo-1619531040576-f9416740661b?w=200&h=200&fit=crop', category: 'snacks', preparationTime: 10, isVegetarian: true },
    { id: 'i32', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with gooey center', price: 10000, image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=200&h=200&fit=crop', category: 'desserts', preparationTime: 8, isVegetarian: true },
  ],
  'm8': [
    { id: 'i33', name: 'Quinoa Power Bowl', description: 'Quinoa, grilled chicken, avocado, veggies', price: 25000, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', category: 'main', preparationTime: 15, isPopular: true },
    { id: 'i34', name: 'Greek Salad', description: 'Feta, olives, cucumber, tomato, onion', price: 16000, image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&h=200&fit=crop', category: 'main', preparationTime: 10, isVegetarian: true },
    { id: 'i35', name: 'Green Detox Smoothie', description: 'Spinach, kale, apple, ginger', price: 12000, image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=200&h=200&fit=crop', category: 'drinks', preparationTime: 5, isVegetarian: true },
    { id: 'i36', name: 'Grilled Salmon Salad', description: 'Fresh salmon with mixed greens', price: 35000, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=200&h=200&fit=crop', category: 'main', preparationTime: 18 },
    { id: 'i37', name: 'Acai Bowl', description: 'Acai blend with granola and fresh fruits', price: 22000, image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=200&h=200&fit=crop', category: 'main', preparationTime: 10, isVegetarian: true },
  ],
};

const KAMPALA_DELIVERY_ADDRESSES = [
  'Nakasero Hill, Kampala',
  'Kololo, Kampala',
  'Ntinda, Kampala',
  'Kampala CBD',
  'Makindye, Kampala',
  'Wandegeya, Kampala',
  'Kamwokya, Kampala',
  'Kabalagala, Kampala',
];

// ============================================
// KOT (Kitchen Order Ticket) Helper
// ============================================

interface KOT {
  id: string;
  orderId: string;
  merchantId: string;
  items: { name: string; quantity: number; notes?: string }[];
  createdAt: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'READY';
  estimatedPrepTime: number;
}

function generateKOT(order: Order): KOT {
  const totalPrepTime = Math.max(...order.items.map(i => i.menuItem.preparationTime));
  return {
    id: `KOT-${Date.now()}`,
    orderId: order.id,
    merchantId: order.merchant.id,
    items: order.items.map(i => ({
      name: i.menuItem.name,
      quantity: i.quantity,
      notes: i.specialInstructions
    })),
    createdAt: new Date(),
    status: 'PENDING',
    estimatedPrepTime: totalPrepTime
  };
}

// ============================================
// Main Component
// ============================================

interface FoodDeliveryScreenProps {
  onBack: () => void;
}

export function FoodDeliveryScreen({ onBack }: FoodDeliveryScreenProps) {
  const serviceColors = getServiceColors('food');
  
  // Flow state
  const [step, setStep] = useState<FlowStep>('merchants');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'WALLET'>('CASH');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderKOT, setOrderKOT] = useState<KOT | null>(null);
  
  // Derived values
  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // ============================================
  // Cart Functions
  // ============================================
  
  const addToCart = useCallback((menuItem: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  }, []);
  
  const removeFromCart = useCallback((menuItem: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.menuItem.id !== menuItem.id);
    });
  }, []);
  
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);
  
  const getCartItemQuantity = useCallback((menuItemId: string) => {
    return cart.find(item => item.menuItem.id === menuItemId)?.quantity || 0;
  }, [cart]);
  
  // ============================================
  // Order Functions
  // ============================================
  
  const placeOrder = useCallback(async () => {
    if (!selectedMerchant || cart.length === 0 || !deliveryAddress) return;
    
    const subtotal = cartTotal;
    const deliveryFee = selectedMerchant.deliveryFee;
    const serviceFee = Math.round(subtotal * 0.05); // 5% service fee
    const total = subtotal + deliveryFee + serviceFee;
    
    const order: Order = {
      id: `order-${Date.now()}`,
      orderNumber: `FD${String(Date.now()).slice(-6)}`,
      merchant: selectedMerchant,
      items: [...cart],
      subtotal,
      deliveryFee,
      serviceFee,
      total,
      status: 'PLACED',
      deliveryAddress,
      paymentMethod,
      estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000) // 45 min estimate
    };
    
    setCurrentOrder(order);
    setStep('confirming');
    
    // Simulate KOT generation and merchant confirmation
    setTimeout(() => {
      const kot = generateKOT(order);
      setOrderKOT(kot);
      setCurrentOrder(prev => prev ? { ...prev, status: 'CONFIRMED' } : null);
      
      // Simulate KOT processing
      setTimeout(() => {
        setStep('preparing');
        setCurrentOrder(prev => prev ? { ...prev, status: 'KOT_GENERATED' } : null);
        
        // Simulate preparation
        setTimeout(() => {
          setCurrentOrder(prev => prev ? { ...prev, status: 'PREPARING' } : null);
          
          // Simulate ready for pickup
          setTimeout(() => {
            setCurrentOrder(prev => prev ? { 
              ...prev, 
              status: 'READY_FOR_PICKUP',
              rider: {
                name: 'James Okello',
                phone: '+256 700 234 567',
                rating: 4.7
              }
            } : null);
            
            // Simulate rider assigned
            setTimeout(() => {
              setCurrentOrder(prev => prev ? { ...prev, status: 'RIDER_ASSIGNED' } : null);
              
              // Simulate picked up
              setTimeout(() => {
                setCurrentOrder(prev => prev ? { ...prev, status: 'PICKED_UP' } : null);
                setStep('tracking');
              }, 3000);
            }, 2000);
          }, 5000);
        }, 2000);
      }, 2000);
    }, 2000);
  }, [selectedMerchant, cart, cartTotal, deliveryAddress, paymentMethod]);
  
  // ============================================
  // Render: Merchant List
  // ============================================
  
  const renderMerchants = () => {
    const filteredMerchants = KAMPALA_MERCHANTS.filter(m => 
      m.isOpen && (
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.cuisine.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
    
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
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Food Delivery</h1>
              <p className="text-white/60 text-sm">Discover restaurants near you</p>
            </div>
            <button 
              onClick={() => cart.length > 0 && setStep('cart')}
              className="relative p-2 rounded-xl bg-[#1A1A24]"
            >
              <ShoppingCart className="h-5 w-5 text-white" />
              {cartCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-[#0D0D12]"
                  style={{ backgroundColor: serviceColors.primary }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants or cuisines..."
              className="w-full h-12 pl-10 pr-4 bg-[#1A1A24] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#F97316]/50 focus:outline-none transition-colors"
            />
          </div>
        </div>
        
        {/* Categories Quick Filter */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {['All', 'Ugandan', 'Coffee', 'Chicken', 'Pizza', 'Healthy'].map((cat) => (
            <button
              key={cat}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                cat === 'All'
                  ? "text-[#0D0D12]"
                  : "bg-[#1A1A24] text-white/70 hover:text-white"
              )}
              style={cat === 'All' ? { backgroundColor: serviceColors.primary } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {/* Restaurant List */}
        <div className="px-4 space-y-3 pb-6">
          {filteredMerchants.map((merchant) => (
            <Card
              key={merchant.id}
              className="p-4 bg-[#1A1A24]/80 border-white/5 cursor-pointer hover:border-white/10 transition-all"
              onClick={() => {
                setSelectedMerchant(merchant);
                setStep('menu');
              }}
            >
              <div className="flex gap-3">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: `${serviceColors.primary}20` }}
                >
                  <img 
                    src={merchant.image} 
                    alt={merchant.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white truncate">{merchant.name}</h3>
                    <div className="flex items-center gap-1 text-sm flex-shrink-0">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-medium">{merchant.rating}</span>
                      <span className="text-white/40">({merchant.reviewCount})</span>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 mt-0.5 truncate">{merchant.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <div className="flex items-center gap-1 text-white/60">
                      <Clock className="h-3 w-3" />
                      <span>{merchant.deliveryTime}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/60">
                      <Bike className="h-3 w-3" />
                      <span>UGX {merchant.deliveryFee.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/60">
                      <MapPin className="h-3 w-3" />
                      <span>{merchant.distance} km</span>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {merchant.cuisine.slice(0, 3).map((c) => (
                      <span 
                        key={c}
                        className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {filteredMerchants.length === 0 && (
            <div className="text-center py-12">
              <Store className="h-12 w-12 mx-auto text-white/20 mb-3" />
              <p className="text-white/50">No restaurants found</p>
              <p className="text-white/30 text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ============================================
  // Render: Menu View
  // ============================================
  
  const renderMenu = () => {
    if (!selectedMerchant) return null;
    
    const menuItems = MERCHANT_MENUS[selectedMerchant.id] || [];
    const categories = ['popular', ...new Set(menuItems.map(i => i.category))];
    
    const filteredItems = selectedCategory === 'popular'
      ? menuItems.filter(i => i.isPopular)
      : menuItems.filter(i => i.category === selectedCategory);
    
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-24">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('merchants')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{selectedMerchant.name}</h1>
              <p className="text-white/60 text-sm">{selectedMerchant.cuisine.join(' • ')}</p>
            </div>
            <button 
              onClick={() => cart.length > 0 && setStep('cart')}
              className="relative p-2 rounded-xl bg-[#1A1A24]"
            >
              <ShoppingCart className="h-5 w-5 text-white" />
              {cartCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-[#0D0D12]"
                  style={{ backgroundColor: serviceColors.primary }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Restaurant Info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-medium">{selectedMerchant.rating}</span>
              <span className="text-white/40">({selectedMerchant.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <Clock className="h-4 w-4" />
              <span>{selectedMerchant.deliveryTime}</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <Bike className="h-4 w-4" />
              <span>UGX {selectedMerchant.deliveryFee.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* Categories */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide sticky top-0 bg-[#0D0D12] z-10">
          {categories.map((cat) => {
            const categoryInfo = MENU_CATEGORIES.find(c => c.id === cat) || { name: cat.charAt(0).toUpperCase() + cat.slice(1), icon: '🍽️' };
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                  selectedCategory === cat
                    ? "text-[#0D0D12]"
                    : "bg-[#1A1A24] text-white/70 hover:text-white"
                )}
                style={selectedCategory === cat ? { backgroundColor: serviceColors.primary } : undefined}
              >
                <span>{categoryInfo.icon}</span>
                <span>{categoryInfo.name}</span>
              </button>
            );
          })}
        </div>
        
        {/* Menu Items */}
        <div className="px-4 space-y-3 mt-2">
          {filteredItems.map((item) => {
            const quantity = getCartItemQuantity(item.id);
            return (
              <Card
                key={item.id}
                className="p-4 bg-[#1A1A24]/80 border-white/5"
              >
                <div className="flex gap-3">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                    style={{ backgroundColor: `${serviceColors.primary}10` }}
                  >
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {item.isPopular && (
                      <span className="absolute -top-1 -right-1 text-sm">🔥</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-white flex items-center gap-1">
                          {item.name}
                          {item.isSpicy && <span className="text-red-400">🌶️</span>}
                          {item.isVegetarian && <span className="text-green-400">🌱</span>}
                        </h3>
                        <p className="text-sm text-white/50 mt-0.5 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold" style={{ color: serviceColors.primary }}>
                        UGX {item.price.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {quantity > 0 && (
                          <button
                            onClick={() => removeFromCart(item)}
                            className="w-8 h-8 rounded-lg bg-[#252530] flex items-center justify-center text-white hover:bg-[#303040] transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                        {quantity > 0 && (
                          <span className="w-6 text-center text-white font-medium">{quantity}</span>
                        )}
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
                          style={{ backgroundColor: serviceColors.primary }}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Utensils className="h-12 w-12 mx-auto text-white/20 mb-3" />
              <p className="text-white/50">No items in this category</p>
            </div>
          )}
        </div>
        
        {/* Floating Cart Button */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-20">
            <button
              onClick={() => setStep('cart')}
              className="w-full h-14 rounded-xl flex items-center justify-between px-4 text-white font-semibold"
              style={{ backgroundColor: serviceColors.primary, boxShadow: `0 0 20px ${serviceColors.glow}` }}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <span>{cartCount} items</span>
              </div>
              <span>UGX {cartTotal.toLocaleString()}</span>
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // ============================================
  // Render: Cart View
  // ============================================
  
  const renderCart = () => {
    if (!selectedMerchant) return null;
    
    const subtotal = cartTotal;
    const deliveryFee = selectedMerchant.deliveryFee;
    const serviceFee = Math.round(subtotal * 0.05);
    const total = subtotal + deliveryFee + serviceFee;
    
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-32">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep('menu')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Your Cart</h1>
              <p className="text-white/60 text-sm">{selectedMerchant.name}</p>
            </div>
          </div>
        </div>
        
        {/* Cart Items */}
        <div className="px-4 space-y-3">
          {cart.map((item) => (
            <Card
              key={item.menuItem.id}
              className="p-4 bg-[#1A1A24]/80 border-white/5"
            >
              <div className="flex gap-3">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: `${serviceColors.primary}10` }}
                >
                  {item.menuItem.image}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white">{item.menuItem.name}</h3>
                  <p className="text-sm text-white/50">{item.menuItem.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-medium" style={{ color: serviceColors.primary }}>
                      UGX {(item.menuItem.price * item.quantity).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.menuItem)}
                        className="w-8 h-8 rounded-lg bg-[#252530] flex items-center justify-center text-white hover:bg-[#303040] transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-white font-medium">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item.menuItem)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
                        style={{ backgroundColor: serviceColors.primary }}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {cart.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-white/20 mb-3" />
              <p className="text-white/50">Your cart is empty</p>
              <button
                onClick={() => setStep('menu')}
                className="mt-4 text-sm font-medium"
                style={{ color: serviceColors.primary }}
              >
                Browse menu
              </button>
            </div>
          )}
        </div>
        
        {/* Order Summary */}
        {cart.length > 0 && (
          <div className="px-4 mt-4">
            <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
              <h3 className="font-semibold text-white mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Subtotal</span>
                  <span className="text-white">UGX {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Delivery Fee</span>
                  <span className="text-white">UGX {deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Service Fee</span>
                  <span className="text-white">UGX {serviceFee.toLocaleString()}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-white/10 flex justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-lg font-bold" style={{ color: serviceColors.primary }}>
                    UGX {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {/* Checkout Button */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-20">
            <button
              onClick={() => setStep('checkout')}
              className="w-full h-14 rounded-xl flex items-center justify-center gap-2 text-white font-semibold"
              style={{ backgroundColor: serviceColors.primary, boxShadow: `0 0 20px ${serviceColors.glow}` }}
            >
              <span>Proceed to Checkout</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // ============================================
  // Render: Checkout View
  // ============================================
  
  const renderCheckout = () => {
    if (!selectedMerchant || cart.length === 0) return null;
    
    const subtotal = cartTotal;
    const deliveryFee = selectedMerchant.deliveryFee;
    const serviceFee = Math.round(subtotal * 0.05);
    const total = subtotal + deliveryFee + serviceFee;
    
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-32">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setStep('cart')} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Checkout</h1>
              <p className="text-white/60 text-sm">Complete your order</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 space-y-4">
          {/* Delivery Address */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: serviceColors.primary }} />
                Delivery Address
              </h3>
            </div>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter your delivery address"
              className="w-full h-12 px-4 bg-[#252530] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#F97316]/50 focus:outline-none transition-colors"
            />
            <div className="flex gap-2 mt-3 flex-wrap">
              {KAMPALA_DELIVERY_ADDRESSES.slice(0, 4).map((addr) => (
                <button
                  key={addr}
                  onClick={() => setDeliveryAddress(addr)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    deliveryAddress === addr
                      ? "text-[#0D0D12]"
                      : "bg-white/5 text-white/60 hover:text-white"
                  )}
                  style={deliveryAddress === addr ? { backgroundColor: serviceColors.primary } : undefined}
                >
                  {addr.split(',')[0]}
                </button>
              ))}
            </div>
          </Card>
          
          {/* Payment Method */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <h3 className="font-semibold text-white mb-3">Payment Method</h3>
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
                    "p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all",
                    paymentMethod === method.id
                      ? "border-[#00FF88] bg-[#00FF88]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <span className="text-xl">{method.icon}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    paymentMethod === method.id ? "text-[#00FF88]" : "text-white/60"
                  )}>{method.label}</span>
                </button>
              ))}
            </div>
          </Card>
          
          {/* Order Items Summary */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Order Items</h3>
              <button 
                onClick={() => setStep('cart')}
                className="text-sm"
                style={{ color: serviceColors.primary }}
              >
                Edit
              </button>
            </div>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.menuItem.id} className="flex justify-between text-sm">
                  <span className="text-white/70">
                    {item.quantity}x {item.menuItem.name}
                  </span>
                  <span className="text-white">
                    UGX {(item.menuItem.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Total */}
          <Card className="p-4 border-2 bg-[#1A1A24]/80" style={{ borderColor: `${serviceColors.primary}30` }}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white">UGX {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Delivery Fee</span>
                <span className="text-white">UGX {deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Service Fee</span>
                <span className="text-white">UGX {serviceFee.toLocaleString()}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-white/10 flex justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-xl font-bold text-[#00FF88]">
                  UGX {total.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Place Order Button */}
        <div className="fixed bottom-4 left-4 right-4 z-20">
          <button
            onClick={placeOrder}
            disabled={!deliveryAddress || cart.length === 0}
            className={cn(
              "w-full h-14 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all",
              deliveryAddress && cart.length > 0
                ? "text-white"
                : "bg-[#252530] text-white/40 cursor-not-allowed"
            )}
            style={deliveryAddress && cart.length > 0 ? 
              { backgroundColor: serviceColors.primary, boxShadow: `0 0 20px ${serviceColors.glow}` } : undefined
            }
          >
            <span>Place Order • UGX {total.toLocaleString()}</span>
          </button>
        </div>
      </div>
    );
  };
  
  // ============================================
  // Render: Confirming / Preparing
  // ============================================
  
  const renderOrderStatus = () => {
    if (!currentOrder) return null;
    
    const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
      PLACED: { label: 'Order Placed', icon: Check, color: '#8B5CF6' },
      CONFIRMED: { label: 'Order Confirmed', icon: Check, color: '#00FF88' },
      KOT_GENERATED: { label: 'KOT Generated', icon: ChefHat, color: '#F97316' },
      PREPARING: { label: 'Preparing Your Order', icon: ChefHat, color: '#F97316' },
      READY_FOR_PICKUP: { label: 'Ready for Pickup', icon: Package, color: '#00FF88' },
      RIDER_ASSIGNED: { label: 'Rider Assigned', icon: Bike, color: '#3B82F6' },
      PICKED_UP: { label: 'Order Picked Up', icon: Bike, color: '#3B82F6' },
      DELIVERED: { label: 'Delivered', icon: Check, color: '#00FF88' },
    };
    
    const currentStatus = statusConfig[currentOrder.status];
    const StatusIcon = currentStatus.icon;
    
    return (
      <div className="min-h-screen bg-[#0D0D12]">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {step === 'preparing' ? 'Preparing Your Order' : 'Confirming Order'}
              </h1>
              <p className="text-white/60 text-sm">Order #{currentOrder.orderNumber}</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 space-y-4">
          {/* Status Animation */}
          <Card 
            className="p-8 bg-[#1A1A24]/80 border-white/5 flex flex-col items-center"
            style={{ borderColor: `${currentStatus.color}30` }}
          >
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4 animate-pulse"
              style={{ backgroundColor: `${currentStatus.color}20` }}
            >
              <StatusIcon className="h-10 w-10" style={{ color: currentStatus.color }} />
            </div>
            <h2 className="text-xl font-bold text-white text-center">{currentStatus.label}</h2>
            <p className="text-white/50 text-sm mt-1">
              {currentOrder.status === 'PREPARING' && 'The restaurant is preparing your food'}
              {currentOrder.status === 'READY_FOR_PICKUP' && 'Your food is ready! Assigning a rider...'}
              {currentOrder.status === 'RIDER_ASSIGNED' && 'A rider is on the way to pick up your order'}
            </p>
          </Card>
          
          {/* KOT Info */}
          {orderKOT && (
            <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <ChefHat className="h-4 w-4" style={{ color: serviceColors.primary }} />
                  Kitchen Order Ticket
                </h3>
                <span 
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${serviceColors.primary}20`, color: serviceColors.primary }}
                >
                  {orderKOT.status}
                </span>
              </div>
              <div className="text-xs text-white/50 mb-2">KOT ID: {orderKOT.id}</div>
              <div className="space-y-1">
                {orderKOT.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-white/70">{item.quantity}x {item.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                <Timer className="h-4 w-4 text-white/50" />
                <span className="text-sm text-white/50">Est. prep time: {orderKOT.estimatedPrepTime} min</span>
              </div>
            </Card>
          )}
          
          {/* Order Timeline */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <h3 className="font-semibold text-white mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {[
                { status: 'PLACED', label: 'Order Placed', time: 'Just now' },
                { status: 'CONFIRMED', label: 'Confirmed by Restaurant', time: '' },
                { status: 'KOT_GENERATED', label: 'KOT Generated', time: '' },
                { status: 'PREPARING', label: 'Preparing', time: '' },
                { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', time: '' },
                { status: 'RIDER_ASSIGNED', label: 'Rider Assigned', time: '' },
                { status: 'PICKED_UP', label: 'Picked Up', time: '' },
                { status: 'DELIVERED', label: 'Delivered', time: '' },
              ].map((step, idx, arr) => {
                const statusOrder = ['PLACED', 'CONFIRMED', 'KOT_GENERATED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'PICKED_UP', 'DELIVERED'];
                const currentIndex = statusOrder.indexOf(currentOrder.status);
                const stepIndex = statusOrder.indexOf(step.status as OrderStatus);
                const isCompleted = stepIndex <= currentIndex;
                const isCurrent = step.status === currentOrder.status;
                
                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div 
                        className={cn(
                          "w-3 h-3 rounded-full transition-all",
                          isCompleted ? "" : "bg-white/20"
                        )}
                        style={isCompleted ? { backgroundColor: isCurrent ? serviceColors.primary : '#00FF88' } : undefined}
                      />
                      {idx < arr.length - 1 && (
                        <div className={cn(
                          "w-0.5 h-6 mt-1",
                          stepIndex < currentIndex ? "bg-[#00FF88]" : "bg-white/10"
                        )} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium",
                        isCompleted ? "text-white" : "text-white/40"
                      )}>
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-xs text-white/30">{step.time}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          
          {/* Restaurant Info */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${serviceColors.primary}20` }}
              >
                {currentOrder.merchant.image}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{currentOrder.merchant.name}</h4>
                <p className="text-sm text-white/50">{currentOrder.merchant.address}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };
  
  // ============================================
  // Render: Tracking View
  // ============================================
  
  const renderTracking = () => {
    if (!currentOrder) return null;
    
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-24">
        {/* Header */}
        <div 
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Track Order</h1>
              <p className="text-white/60 text-sm">Order #{currentOrder.orderNumber}</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 space-y-4">
          {/* Map Placeholder */}
          <Card 
            className="h-48 bg-[#1A1A24]/80 border-white/5 flex items-center justify-center relative overflow-hidden"
            style={{ borderColor: `${serviceColors.primary}30` }}
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/4 left-1/3 w-4 h-4 rounded-full animate-ping" style={{ backgroundColor: serviceColors.primary }} />
              <div className="absolute top-1/2 right-1/4 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#3B82F6' }} />
            </div>
            <div className="text-center z-10">
              <Navigation className="h-8 w-8 mx-auto mb-2" style={{ color: serviceColors.primary }} />
              <p className="text-white/60 text-sm">Live tracking map</p>
            </div>
          </Card>
          
          {/* Rider Info */}
          {currentOrder.rider && (
            <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${serviceColors.primary}20` }}
                >
                  <Bike className="h-7 w-7" style={{ color: serviceColors.primary }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{currentOrder.rider.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm text-white">{currentOrder.rider.rating}</span>
                    <span className="text-white/30">•</span>
                    <span className="text-sm text-white/50">Your rider</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${serviceColors.primary}20` }}
                  >
                    <Phone className="h-5 w-5" style={{ color: serviceColors.primary }} />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[#3B82F6]" />
                  </button>
                </div>
              </div>
            </Card>
          )}
          
          {/* ETA */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm">Estimated arrival</p>
                <p className="text-2xl font-bold text-white">12-15 min</p>
              </div>
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${serviceColors.primary}20` }}
              >
                <Clock className="h-7 w-7" style={{ color: serviceColors.primary }} />
              </div>
            </div>
          </Card>
          
          {/* Status Timeline */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <h3 className="font-semibold text-white mb-4">Delivery Status</h3>
            <div className="space-y-3">
              {[
                { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: Package, completed: true },
                { status: 'RIDER_ASSIGNED', label: 'Rider Assigned', icon: Bike, completed: true },
                { status: 'PICKED_UP', label: 'Picked Up', icon: ShoppingBag, completed: currentOrder.status === 'PICKED_UP' },
                { status: 'DELIVERED', label: 'Delivered', icon: Check, completed: false },
              ].map((step, idx, arr) => {
                const StatusIcon = step.icon;
                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div 
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          step.completed ? "" : "bg-white/10"
                        )}
                        style={step.completed ? { backgroundColor: `${serviceColors.primary}20` } : undefined}
                      >
                        <StatusIcon 
                          className="h-4 w-4" 
                          style={{ color: step.completed ? serviceColors.primary : 'rgba(255,255,255,0.3)' }} 
                        />
                      </div>
                      {idx < arr.length - 1 && (
                        <div className={cn(
                          "w-0.5 h-6 mt-1",
                          step.completed ? "" : "bg-white/10"
                        )}
                        style={step.completed ? { backgroundColor: serviceColors.primary } : undefined}
                        />
                      )}
                    </div>
                    <div className="flex-1 py-1">
                      <p className={cn(
                        "text-sm font-medium",
                        step.completed ? "text-white" : "text-white/40"
                      )}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          
          {/* Delivery Address */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00FF88]/20 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-[#00FF88]" />
              </div>
              <div>
                <p className="text-xs text-white/50">Delivery Address</p>
                <p className="text-white font-medium">{currentOrder.deliveryAddress}</p>
              </div>
            </div>
          </Card>
          
          {/* Order Summary */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <h3 className="font-semibold text-white mb-3">Order Summary</h3>
            <div className="space-y-2">
              {currentOrder.items.map((item) => (
                <div key={item.menuItem.id} className="flex justify-between text-sm">
                  <span className="text-white/70">{item.quantity}x {item.menuItem.name}</span>
                  <span className="text-white">UGX {(item.menuItem.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-white/10 flex justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="font-bold" style={{ color: serviceColors.primary }}>
                  UGX {currentOrder.total.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Complete Button */}
        <div className="fixed bottom-4 left-4 right-4 z-20">
          <button
            onClick={onBack}
            className="w-full h-14 rounded-xl flex items-center justify-center gap-2 text-white font-semibold"
            style={{ backgroundColor: '#00FF88', boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)' }}
          >
            <Check className="h-5 w-5" />
            <span>Mark as Delivered</span>
          </button>
        </div>
      </div>
    );
  };
  
  // ============================================
  // Main Render
  // ============================================
  
  switch (step) {
    case 'merchants':
      return renderMerchants();
    case 'menu':
      return renderMenu();
    case 'cart':
      return renderCart();
    case 'checkout':
      return renderCheckout();
    case 'confirming':
    case 'preparing':
      return renderOrderStatus();
    case 'tracking':
      return renderTracking();
    default:
      return renderMerchants();
  }
}

export default FoodDeliveryScreen;

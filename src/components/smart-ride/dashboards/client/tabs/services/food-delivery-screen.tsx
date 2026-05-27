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
  ShoppingCart,
  Search,
  CreditCard,
  Wallet,
  Smartphone,
  ChefHat,
  Bike,
  Check,
  Package,
  Utensils,
  Store,
  Navigation,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getServiceColors } from '@/lib/theme/smart-ride-theme';

// ============================================
// Types
// ============================================

type FlowStep = 'merchants' | 'menu' | 'cart' | 'checkout' | 'confirming' | 'preparing' | 'tracking';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  preparationTime: number;
  isAvailable: boolean;
}

interface Merchant {
  id: string;
  name: string;
  description: string;
  type: string;
  rating: number;
  totalOrders: number;
  averagePrepTime: number;
  deliveryFee: number;
  minOrder: number;
  image: string;
  isOpen: boolean;
  address: string;
  latitude: number;
  longitude: number;
  openingTime: string | null;
  closingTime: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

interface OrderResult {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  totalAmount: number;
  task?: {
    id: string;
    taskNumber: string;
    status: string;
    rider?: {
      id: string;
      fullName: string;
      phone: string;
      rating: number;
    };
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY_MTN' | 'MOBILE_MONEY_AIRTEL'>('CASH');
  const [currentOrder, setCurrentOrder] = useState<OrderResult | null>(null);

  // API state
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<string[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderPolling, setOrderPolling] = useState(false);

  // Derived values
  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ============================================
  // Fetch Merchants from API
  // ============================================

  useEffect(() => {
    async function fetchMerchants() {
      setLoadingMerchants(true);
      setError(null);
      try {
        const response = await fetch('/api/merchants?type=RESTAURANT&status=APPROVED&isOpen=true&limit=50');
        const data = await response.json();
        if (data.success !== false && data.data) {
          const mapped = (Array.isArray(data.data) ? data.data : []).map((m: Record<string, unknown>) => ({
            id: m.id,
            name: m.name,
            description: m.description || '',
            type: m.type,
            rating: m.rating || 5.0,
            totalOrders: m.totalOrders || 0,
            averagePrepTime: m.averagePrepTime || 15,
            deliveryFee: 3000, // Default delivery fee - can be calculated based on distance
            minOrder: 0,
            image: m.coverImageUrl || m.logoUrl || '',
            isOpen: m.isOpen,
            address: m.address || '',
            latitude: m.latitude || 0,
            longitude: m.longitude || 0,
            openingTime: m.openingTime || null,
            closingTime: m.closingTime || null,
            logoUrl: m.logoUrl || null,
            coverImageUrl: m.coverImageUrl || null,
          }));
          setMerchants(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch merchants:', err);
        setError('Failed to load restaurants. Please try again.');
      } finally {
        setLoadingMerchants(false);
      }
    }
    fetchMerchants();
  }, []);

  // ============================================
  // Fetch Menu for selected merchant
  // ============================================

  const fetchMenu = useCallback(async (merchantId: string) => {
    setLoadingMenu(true);
    setError(null);
    try {
      const response = await fetch(`/api/merchants/${merchantId}/menu`);
      const data = await response.json();
      if (data.success !== false && data.data) {
        const items: MenuItem[] = (data.data.menuItems || []).map((item: Record<string, unknown>) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: item.price || 0,
          image: item.imageUrl || '',
          category: item.category || 'Main',
          preparationTime: item.preparationTime || 15,
          isAvailable: item.isAvailable !== false,
        }));
        setMenuItems(items);
        setMenuCategories(data.data.categories || []);
        setSelectedCategory('all');
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
      setError('Failed to load menu. Please try again.');
    } finally {
      setLoadingMenu(false);
    }
  }, []);

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

    setPlacingOrder(true);
    setError(null);

    try {
      const subtotal = cartTotal;
      const deliveryFee = selectedMerchant.deliveryFee;
      const serviceFee = Math.round(subtotal * 0.03); // 3% service fee
      const totalAmount = subtotal + deliveryFee + serviceFee;

      // Step 1: Create the order
      const createResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'current', // Will be overridden by auth
          merchantId: selectedMerchant.id,
          orderType: 'FOOD_DELIVERY',
          items: cart.map(item => ({
            menuItemId: item.menuItem.id,
            itemName: item.menuItem.name,
            itemDescription: item.menuItem.description,
            quantity: item.quantity,
            unitPrice: item.menuItem.price,
            specialInstructions: item.specialInstructions,
          })),
          subtotal,
          deliveryFee,
          serviceFee,
          totalAmount,
          paymentMethod: paymentMethod === 'MOBILE_MONEY_MTN' ? 'MTN_MOMO'
            : paymentMethod === 'MOBILE_MONEY_AIRTEL' ? 'AIRTEL_MONEY'
            : 'CASH',
          deliveryAddress,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok || createData.success === false) {
        throw new Error(createData.error || 'Failed to create order');
      }

      const orderId = createData.data?.id || createData.data?.orderId;
      const orderNumber = createData.data?.orderNumber;

      // Step 2: Confirm payment (this also creates KOT and notifies merchant)
      const confirmResponse = await fetch(`/api/orders/${orderId}?action=confirm-payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentReference: `PAY-${Date.now()}`,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok || confirmData.success === false) {
        throw new Error(confirmData.error || 'Failed to confirm payment');
      }

      // Order is now in PAYMENT_CONFIRMED, move to confirming step
      setCurrentOrder({
        id: orderId,
        orderNumber: orderNumber || `FD-${Date.now().toString().slice(-6)}`,
        status: 'PAYMENT_CONFIRMED',
        subtotal,
        deliveryFee,
        serviceFee,
        totalAmount,
      });

      setStep('confirming');
      setCart([]);

      // Start polling for order status updates
      startOrderPolling(orderId);
    } catch (err) {
      console.error('Failed to place order:', err);
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  }, [selectedMerchant, cart, cartTotal, deliveryAddress, paymentMethod]);

  // ============================================
  // Order Status Polling
  // ============================================

  const startOrderPolling = useCallback((orderId: string) => {
    setOrderPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();
        if (data.data) {
          const order = data.data;
          setCurrentOrder(prev => prev ? { ...prev, status: order.status, task: order.task } : null);

          // Auto-advance steps based on order status
          if (['MERCHANT_ACCEPTED', 'PREPARING'].includes(order.status)) {
            setStep('preparing');
          } else if (['READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status)) {
            setStep('tracking');
          } else if (['DELIVERED', 'COMPLETED'].includes(order.status)) {
            setStep('tracking');
            clearInterval(pollInterval);
            setOrderPolling(false);
          } else if (['CANCELLED', 'REJECTED'].includes(order.status)) {
            clearInterval(pollInterval);
            setOrderPolling(false);
            setError(`Order was ${order.status === 'CANCELLED' ? 'cancelled' : 'rejected'}.`);
          }
        }
      } catch {
        // Silently continue polling
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setOrderPolling(false);
    }, 30 * 60 * 1000);
  }, []);

  // ============================================
  // Merchant selection handler
  // ============================================

  const handleSelectMerchant = useCallback((merchant: Merchant) => {
    setSelectedMerchant(merchant);
    fetchMenu(merchant.id);
    setStep('menu');
  }, [fetchMenu]);

  // ============================================
  // Render: Merchant List
  // ============================================

  const renderMerchants = () => {
    const filteredMerchants = merchants.filter(m =>
      m.isOpen && (
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.address && m.address.toLowerCase().includes(searchQuery.toLowerCase()))
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

        {/* Error state */}
        {error && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">x</button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loadingMerchants ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-white/30 mb-4" />
            <p className="text-white/50">Loading restaurants...</p>
          </div>
        ) : (
          <>
            {/* Restaurant List */}
            <div className="px-4 space-y-3 pb-6">
              {filteredMerchants.map((merchant) => (
                <Card
                  key={merchant.id}
                  className="p-4 bg-[#1A1A24]/80 border-white/5 cursor-pointer hover:border-white/10 transition-all"
                  onClick={() => handleSelectMerchant(merchant)}
                >
                  <div className="flex gap-3">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: `${serviceColors.primary}20` }}
                    >
                      {merchant.logoUrl || merchant.coverImageUrl ? (
                        <img
                          src={merchant.logoUrl || merchant.coverImageUrl || ''}
                          alt={merchant.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Store className="h-6 w-6 text-white/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white truncate">{merchant.name}</h3>
                        <div className="flex items-center gap-1 text-sm flex-shrink-0">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white font-medium">{merchant.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-white/50 mt-0.5 truncate">{merchant.description || merchant.address}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <div className="flex items-center gap-1 text-white/60">
                          <Clock className="h-3 w-3" />
                          <span>{merchant.averagePrepTime || 15}-{(merchant.averagePrepTime || 15) + 10} min</span>
                        </div>
                        <div className="flex items-center gap-1 text-white/60">
                          <Bike className="h-3 w-3" />
                          <span>UGX {merchant.deliveryFee.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-white/60">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{merchant.address}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredMerchants.length === 0 && !loadingMerchants && (
                <div className="text-center py-12">
                  <Store className="h-12 w-12 mx-auto text-white/20 mb-3" />
                  <p className="text-white/50">No restaurants found</p>
                  <p className="text-white/30 text-sm mt-1">
                    {merchants.length === 0
                      ? 'No restaurants are currently available'
                      : 'Try a different search term'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Menu View
  // ============================================

  const renderMenu = () => {
    if (!selectedMerchant) return null;

    const filteredItems = selectedCategory === 'all'
      ? menuItems.filter(i => i.isAvailable)
      : menuItems.filter(i => i.category === selectedCategory && i.isAvailable);

    return (
      <div className="min-h-screen bg-[#0D0D12] pb-24">
        {/* Header */}
        <div
          className="px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, transparent)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => { setStep('merchants'); setMenuItems([]); }} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{selectedMerchant.name}</h1>
              <p className="text-white/60 text-sm">{selectedMerchant.address}</p>
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
              <span className="text-white font-medium">{selectedMerchant.rating.toFixed(1)}</span>
              <span className="text-white/40">({selectedMerchant.totalOrders})</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <Clock className="h-4 w-4" />
              <span>{selectedMerchant.averagePrepTime || 15}-{(selectedMerchant.averagePrepTime || 15) + 10} min</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <Bike className="h-4 w-4" />
              <span>UGX {selectedMerchant.deliveryFee.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loadingMenu ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-white/30 mb-4" />
            <p className="text-white/50">Loading menu...</p>
          </div>
        ) : (
          <>
            {/* Categories */}
            {menuCategories.length > 0 && (
              <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide sticky top-0 bg-[#0D0D12] z-10">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategory === 'all'
                      ? "text-[#0D0D12]"
                      : "bg-[#1A1A24] text-white/70 hover:text-white"
                  )}
                  style={selectedCategory === 'all' ? { backgroundColor: serviceColors.primary } : undefined}
                >
                  All
                </button>
                {menuCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                      selectedCategory === cat
                        ? "text-[#0D0D12]"
                        : "bg-[#1A1A24] text-white/70 hover:text-white"
                    )}
                    style={selectedCategory === cat ? { backgroundColor: serviceColors.primary } : undefined}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

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
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Utensils className="h-5 w-5 text-white/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div>
                          <h3 className="font-semibold text-white">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-white/50 mt-0.5 line-clamp-2">{item.description}</p>
                          )}
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

              {filteredItems.length === 0 && !loadingMenu && (
                <div className="text-center py-12">
                  <Utensils className="h-12 w-12 mx-auto text-white/20 mb-3" />
                  <p className="text-white/50">No items in this category</p>
                </div>
              )}
            </div>
          </>
        )}

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
    const serviceFee = Math.round(subtotal * 0.03);
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

        {/* Error state */}
        {error && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">x</button>
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="px-4 space-y-3">
          {cart.map((item) => (
            <Card
              key={item.menuItem.id}
              className="p-4 bg-[#1A1A24]/80 border-white/5"
            >
              <div className="flex gap-3">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: `${serviceColors.primary}10` }}
                >
                  {item.menuItem.image ? (
                    <img src={item.menuItem.image} alt={item.menuItem.name} className="w-full h-full object-cover" />
                  ) : (
                    <Utensils className="h-4 w-4 text-white/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white">{item.menuItem.name}</h3>
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
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span>UGX {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Delivery Fee</span>
                  <span>UGX {deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Service Fee</span>
                  <span>UGX {serviceFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold">
                  <span>Total</span>
                  <span>UGX {total.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Checkout Section */}
        {cart.length > 0 && (
          <div className="px-4 mt-4 space-y-3">
            {/* Delivery Address */}
            <div>
              <label className="text-white/60 text-sm mb-1 block">Delivery Address</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your delivery address..."
                className="w-full h-12 px-4 bg-[#1A1A24] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#F97316]/50 focus:outline-none"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">Payment Method</label>
              <div className="flex gap-2">
                {[
                  { id: 'CASH' as const, label: 'Cash', icon: Wallet },
                  { id: 'MOBILE_MONEY_MTN' as const, label: 'MTN MoMo', icon: Smartphone },
                  { id: 'MOBILE_MONEY_AIRTEL' as const, label: 'Airtel', icon: Smartphone },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 transition-all",
                      paymentMethod === method.id
                        ? "text-[#0D0D12] border-transparent"
                        : "bg-[#1A1A24] text-white/70 border border-white/10 hover:text-white"
                    )}
                    style={paymentMethod === method.id ? { backgroundColor: serviceColors.primary } : undefined}
                  >
                    <method.icon className="h-4 w-4" />
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={placeOrder}
              disabled={placingOrder || !deliveryAddress || cart.length === 0}
              className={cn(
                "w-full h-14 rounded-xl flex items-center justify-center gap-2 text-white font-semibold transition-all",
                placingOrder || !deliveryAddress ? "opacity-50 cursor-not-allowed" : ""
              )}
              style={{ backgroundColor: serviceColors.primary }}
            >
              {placingOrder ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  <span>Place Order - UGX {total.toLocaleString()}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Confirming / Preparing / Tracking
  // ============================================

  const renderOrderStatus = () => {
    const statusConfig: Record<string, { label: string; description: string; icon: React.ElementType; color: string }> = {
      PAYMENT_CONFIRMED: { label: 'Order Confirmed', description: 'Waiting for merchant to accept your order', icon: Check, color: 'text-blue-400' },
      MERCHANT_ACCEPTED: { label: 'Order Accepted', description: 'The merchant has accepted your order', icon: ChefHat, color: 'text-purple-400' },
      PREPARING: { label: 'Preparing', description: 'Your order is being prepared', icon: ChefHat, color: 'text-purple-400' },
      READY_FOR_PICKUP: { label: 'Ready for Pickup', description: 'Your order is ready. Searching for a rider...', icon: Package, color: 'text-green-400' },
      PICKED_UP: { label: 'Picked Up', description: 'Rider has picked up your order', icon: Bike, color: 'text-teal-400' },
      DELIVERED: { label: 'Delivered', description: 'Your order has been delivered!', icon: Check, color: 'text-green-400' },
      CANCELLED: { label: 'Cancelled', description: 'Your order has been cancelled', icon: AlertCircle, color: 'text-red-400' },
      REJECTED: { label: 'Rejected', description: 'The merchant rejected your order', icon: AlertCircle, color: 'text-red-400' },
    };

    const config = statusConfig[currentOrder?.status || 'PAYMENT_CONFIRMED'] || statusConfig.PAYMENT_CONFIRMED;
    const StatusIcon = config.icon;

    return (
      <div className="min-h-screen bg-[#0D0D12] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Order Tracking</h1>
              <p className="text-white/60 text-sm">{currentOrder?.orderNumber}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: `${serviceColors.primary}20` }}>
            {orderPolling && currentOrder?.status !== 'DELIVERED' ? (
              <Loader2 className={`h-10 w-10 animate-spin ${config.color}`} />
            ) : (
              <StatusIcon className={`h-10 w-10 ${config.color}`} />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{config.label}</h2>
          <p className="text-white/60 text-center mb-8">{config.description}</p>

          {/* Order Details Card */}
          {currentOrder && (
            <Card className="w-full p-4 bg-[#1A1A24]/80 border-white/5 mb-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Order Number</span>
                  <span className="text-white font-medium">{currentOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Status</span>
                  <span className={config.color + ' font-medium'}>{config.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Total Amount</span>
                  <span className="text-white font-bold">UGX {currentOrder.totalAmount?.toLocaleString()}</span>
                </div>

                {/* Rider info */}
                {currentOrder.task?.rider && (
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                        <Bike className="h-5 w-5 text-teal-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{currentOrder.task.rider.fullName}</p>
                        <p className="text-white/50 text-xs">{currentOrder.task.rider.phone}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-sm">{currentOrder.task.rider.rating}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-6">
          {['DELIVERED', 'CANCELLED', 'REJECTED'].includes(currentOrder?.status || '') ? (
            <button
              onClick={onBack}
              className="w-full h-14 rounded-xl flex items-center justify-center gap-2 text-white font-semibold"
              style={{ backgroundColor: serviceColors.primary }}
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Restaurants</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 justify-center text-white/40 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Tracking your order...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Render Router
  // ============================================

  switch (step) {
    case 'merchants':
      return renderMerchants();
    case 'menu':
      return renderMenu();
    case 'cart':
    case 'checkout':
      return renderCart();
    case 'confirming':
    case 'preparing':
    case 'tracking':
      return renderOrderStatus();
    default:
      return renderMerchants();
  }
}

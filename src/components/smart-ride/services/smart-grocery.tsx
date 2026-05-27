'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Package,
  Grid,
  List,
  Store,
  Loader2,
  AlertCircle,
  Clock,
  Star,
} from 'lucide-react';
import { useCart, CartType, CartItem } from './cart-context';
import { CheckoutScreen } from './checkout-screen';

interface SmartGroceryProps {
  onBack: () => void;
}

// Real merchant from DB
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

// Real menu item from DB
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

type ViewType = 'merchants' | 'products' | 'checkout';

const CART_TYPE: CartType = 'grocery';
const SERVICE_FEE = 1000;

export function SmartGrocery({ onBack }: SmartGroceryProps) {
  const {
    getCartByType, addItem, removeItem, updateQuantity,
    setDeliveryFee, getCartCount, setCheckoutCart,
    setMerchantInfo, setOrderType, clearCart
  } = useCart();

  const [view, setView] = useState<ViewType>('merchants');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Merchant state
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Products state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const cart = getCartByType(CART_TYPE);
  const cartCount = getCartCount(CART_TYPE);
  const cartTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Set delivery fee and order type on mount
  useEffect(() => {
    setDeliveryFee(6000, CART_TYPE);
    setOrderType('SHOPPING', CART_TYPE);
  }, [setDeliveryFee, setOrderType]);

  // Fetch real merchants (SUPERMARKET + GROCERY types)
  useEffect(() => {
    const fetchMerchants = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/merchants?type=SUPERMARKET&status=APPROVED&limit=50');
        const groceryRes = await fetch('/api/merchants?type=GROCERY&status=APPROVED&limit=50');

        let allMerchants: Merchant[] = [];

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            allMerchants = [...allMerchants, ...(data.data.items || data.data || [])];
          }
        }

        if (groceryRes.ok) {
          const data = await groceryRes.json();
          if (data.success && data.data) {
            allMerchants = [...allMerchants, ...(data.data.items || data.data || [])];
          }
        }

        // Also fetch RETAIL_STORE types for broader shopping
        const retailRes = await fetch('/api/merchants?type=RETAIL_STORE&status=APPROVED&limit=50');
        if (retailRes.ok) {
          const data = await retailRes.json();
          if (data.success && data.data) {
            allMerchants = [...allMerchants, ...(data.data.items || data.data || [])];
          }
        }

        setMerchants(allMerchants);
      } catch (err) {
        console.error('[SmartGrocery] Failed to fetch merchants:', err);
        setError('Failed to load stores. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchants();
  }, []);

  // Fetch menu items when a merchant is selected
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
      console.error('[SmartGrocery] Failed to fetch menu items:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Handle merchant selection
  const handleSelectMerchant = useCallback((merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setMerchantInfo({
      id: merchant.id,
      name: merchant.name,
      address: merchant.address,
      latitude: merchant.latitude,
      longitude: merchant.longitude,
    }, CART_TYPE);
    setSelectedCategory(null);
    fetchMenuItems(merchant.id);
    setView('products');
  }, [fetchMenuItems, setMerchantInfo]);

  // Cart operations
  const handleAddToCart = useCallback((item: MenuItem) => {
    const cartItem: CartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      description: item.description || undefined,
      image: item.imageUrl || undefined,
      menuItemId: item.id,
    };
    addItem(cartItem, CART_TYPE);
  }, [addItem]);

  const handleRemoveFromCart = useCallback((itemId: string) => {
    const cartItem = cart.items.find(i => i.id === itemId);
    if (cartItem && cartItem.quantity > 1) {
      updateQuantity(itemId, cartItem.quantity - 1, CART_TYPE);
    } else {
      removeItem(itemId, CART_TYPE);
    }
  }, [cart.items, updateQuantity, removeItem]);

  const handleDeleteItem = useCallback((itemId: string) => {
    removeItem(itemId, CART_TYPE);
  }, [removeItem]);

  const handleContinue = useCallback(() => {
    if (cartCount > 0) {
      setCheckoutCart(CART_TYPE);
      setView('checkout');
    }
  }, [cartCount, setCheckoutCart]);

  // Filtered merchants
  const filteredMerchants = useMemo(() => {
    if (!searchQuery) return merchants;
    return merchants.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [merchants, searchQuery]);

  // Filtered products by category
  const categories = useMemo(() => {
    const cats = new Set(menuItems.map(item => item.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    let items = menuItems.filter(item => item.isAvailable);
    if (selectedCategory) {
      items = items.filter(item => item.category === selectedCategory);
    }
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  // Checkout view
  if (view === 'checkout') {
    return (
      <CheckoutScreen
        cartType={CART_TYPE}
        onBack={() => setView('products')}
        onOrderComplete={() => {
          clearCart(CART_TYPE);
          setSelectedMerchant(null);
          setMenuItems([]);
          onBack();
        }}
      />
    );
  }

  // Products view (merchant selected)
  if (view === 'products' && selectedMerchant) {
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-28">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setView('merchants');
                setMenuItems([]);
                setSelectedCategory(null);
              }}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">{selectedMerchant.name}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{selectedMerchant.averagePrepTime} min</span>
                <span className="text-gray-600">|</span>
                <Star className="h-3 w-3 text-yellow-500" />
                <span>{selectedMerchant.rating.toFixed(1)}</span>
              </div>
            </div>
            <button
              onClick={() => setIsGridView(!isGridView)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1A1A24]"
            >
              {isGridView ? (
                <List className="h-5 w-5 text-gray-400" />
              ) : (
                <Grid className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="px-4 pt-4">
          <div className="bg-[#13131A] rounded-xl p-3 flex items-center gap-3 border border-white/5 mb-4">
            <Search className="h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  !selectedCategory
                    ? "bg-purple-600 text-white"
                    : "bg-[#13131A] text-gray-400 border border-white/5 hover:border-purple-500/30"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategory === cat
                      ? "bg-purple-600 text-white"
                      : "bg-[#13131A] text-gray-400 border border-white/5 hover:border-purple-500/30"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Loading Products */}
          {isLoadingProducts ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Loading products...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-gray-600 mb-3" />
              <p className="text-gray-400">No products available</p>
              <p className="text-gray-500 text-sm mt-1">This store has not added products yet</p>
            </div>
          ) : isGridView ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const cartItem = cart.items.find(c => c.id === item.id);
                return (
                  <Card key={item.id} className="bg-[#13131A] border-white/5">
                    <CardContent className="p-3">
                      <div className="w-full h-24 bg-[#1A1A24] rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-600" />
                        )}
                      </div>
                      <p className="text-white font-medium text-sm truncate">{item.name}</p>
                      {item.category && (
                        <p className="text-gray-500 text-xs">{item.category}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-purple-400 font-semibold text-sm">UGX {item.price.toLocaleString()}</p>
                        {cartItem ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="w-6 h-6 rounded-full bg-[#1A1A24] flex items-center justify-center"
                            >
                              <Minus className="h-3 w-3 text-white" />
                            </button>
                            <span className="text-white text-sm w-5 text-center">{cartItem.quantity}</span>
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center"
                            >
                              <Plus className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center"
                          >
                            <Plus className="h-4 w-4 text-purple-400" />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const cartItem = cart.items.find(c => c.id === item.id);
                return (
                  <Card key={item.id} className="bg-[#13131A] border-white/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-[#1A1A24] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="h-6 w-6 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-gray-500 text-sm truncate">{item.description}</p>
                          )}
                          <p className="text-purple-400 font-semibold mt-1">UGX {item.price.toLocaleString()}</p>
                        </div>
                        {cartItem ? (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center"
                            >
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRemoveFromCart(item.id)}
                                className="w-8 h-8 rounded-full bg-[#1A1A24] flex items-center justify-center"
                              >
                                <Minus className="h-4 w-4 text-white" />
                              </button>
                              <span className="text-white font-medium w-6 text-center">{cartItem.quantity}</span>
                              <button
                                onClick={() => handleAddToCart(item)}
                                className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center"
                              >
                                <Plus className="h-4 w-4 text-white" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"
                          >
                            <Plus className="h-5 w-5 text-purple-400" />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12]/95 backdrop-blur-lg border-t border-white/5 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-purple-400" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full text-white text-xs flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs">{cartCount} item{cartCount > 1 ? 's' : ''} in cart</p>
                <p className="text-white font-semibold">UGX {cartTotal.toLocaleString()}</p>
              </div>
              <Button
                onClick={handleContinue}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-xl"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Merchants view (store browsing)
  return (
    <div className="min-h-screen bg-[#0D0D12]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">Smart Grocery</h1>
            <p className="text-sm text-gray-500">Fresh groceries delivered to you</p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="bg-[#13131A] rounded-xl p-3 flex items-center gap-3 border border-white/5 mb-4">
          <Search className="h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin mb-4" />
          <p className="text-gray-400">Loading stores...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <p className="text-white font-medium mb-2">Failed to load stores</p>
          <p className="text-gray-500 text-sm text-center mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-purple-500/30 text-purple-400"
          >
            Retry
          </Button>
        </div>
      ) : filteredMerchants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <Store className="h-12 w-12 text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium mb-2">No stores available yet</p>
          <p className="text-gray-500 text-sm text-center">Grocery stores will appear here once they are registered and approved</p>
        </div>
      ) : (
        <div className="px-4 space-y-3 pb-6">
          {filteredMerchants.map((merchant) => (
            <Card
              key={merchant.id}
              className="bg-[#13131A] border-white/5 cursor-pointer hover:border-purple-500/30 transition-all"
              onClick={() => handleSelectMerchant(merchant)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    {merchant.logoUrl ? (
                      <img
                        src={merchant.logoUrl}
                        alt={merchant.name}
                        className="w-full h-full rounded-xl object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Store className="h-7 w-7 text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold truncate">{merchant.name}</p>
                      {merchant.isOpen ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Open</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Closed</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm truncate">{merchant.address}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-gray-400 text-xs">{merchant.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-400 text-xs">{merchant.averagePrepTime} min</span>
                      </div>
                      {merchant._count && (
                        <span className="text-gray-500 text-xs">{merchant._count.menuItems} items</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

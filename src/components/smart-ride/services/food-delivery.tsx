'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Search,
  MapPin,
  Star,
  Clock,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Trash2,
  UtensilsCrossed,
  Loader2,
  Store,
} from 'lucide-react';
import { useCart, CartType } from './cart-context';
import { CheckoutScreen } from './checkout-screen';

interface FoodDeliveryProps {
  onBack: () => void;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  deliveryTime: string;
  deliveryFee: number;
  image: string;
  description: string;
  isOpen: boolean;
  address: string;
}

interface MenuItemData {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string | null;
  preparationTime: number | null;
  isAvailable: boolean;
  image?: string;
}

const CART_TYPE: CartType = 'food';

export function FoodDelivery({ onBack }: FoodDeliveryProps) {
  const { getCartByType, addItem, removeItem, updateQuantity, setDeliveryFee, setServiceInfo, getCartCount, setCheckoutCart } = useCart();
  const [view, setView] = useState<'restaurants' | 'menu' | 'checkout'>('restaurants');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cart = getCartByType(CART_TYPE);
  const cartCount = getCartCount(CART_TYPE);

  // Fetch restaurants from API
  useEffect(() => {
    async function fetchRestaurants() {
      setLoadingRestaurants(true);
      try {
        const response = await fetch('/api/merchants?type=RESTAURANT&status=APPROVED&isOpen=true&limit=50');
        const data = await response.json();
        if (data.data) {
          const mapped = (Array.isArray(data.data) ? data.data : []).map((m: Record<string, unknown>) => ({
            id: m.id,
            name: m.name,
            cuisine: m.description || 'Restaurant',
            rating: m.rating || 5.0,
            reviews: m.totalOrders || 0,
            deliveryTime: `${m.averagePrepTime || 15}-${(m.averagePrepTime || 15) + 10} min`,
            deliveryFee: 3000,
            image: m.coverImageUrl || m.logoUrl || '',
            description: m.description || '',
            isOpen: m.isOpen,
            address: m.address || '',
          }));
          setRestaurants(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch restaurants:', err);
        setRestaurants([]);
      } finally {
        setLoadingRestaurants(false);
      }
    }
    fetchRestaurants();
  }, []);

  // Fetch menu for selected restaurant
  const fetchMenu = async (merchantId: string) => {
    setLoadingMenu(true);
    try {
      const response = await fetch(`/api/merchants/${merchantId}/menu`);
      const data = await response.json();
      if (data.data) {
        setMenuItems((data.data.menuItems || []).map((item: Record<string, unknown>) => ({
          id: item.id,
          name: item.name,
          price: item.price || 0,
          description: item.description || '',
          category: item.category || null,
          preparationTime: item.preparationTime || null,
          isAvailable: item.isAvailable !== false,
          image: item.imageUrl || undefined,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleAddToCart = (item: MenuItemData) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      description: item.description,
    }, CART_TYPE);
  };

  const handleRemoveFromCart = (itemId: string) => {
    const cartItem = cart.items.find(i => i.id === itemId);
    if (cartItem && cartItem.quantity > 1) {
      updateQuantity(itemId, cartItem.quantity - 1, CART_TYPE);
    } else {
      removeItem(itemId, CART_TYPE);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    removeItem(itemId, CART_TYPE);
  };

  const selectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setDeliveryFee(restaurant.deliveryFee, CART_TYPE);
    setServiceInfo(restaurant.id, restaurant.name, CART_TYPE);
    fetchMenu(restaurant.id);
    setView('menu');
  };

  const handleContinue = () => {
    if (cartCount > 0) {
      setCheckoutCart(CART_TYPE);
      setView('checkout');
    }
  };

  // Checkout view
  if (view === 'checkout') {
    return (
      <CheckoutScreen
        cartType={CART_TYPE}
        onBack={() => setView('menu')}
        onOrderComplete={onBack}
      />
    );
  }

  // Menu view
  if (view === 'menu' && selectedRestaurant) {
    const availableItems = menuItems.filter(i => i.isAvailable);
    const cartTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
      <div className="min-h-screen bg-[#0D0D12] pb-28">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('restaurants'); setMenuItems([]); }}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">{selectedRestaurant.name}</h1>
              <p className="text-sm text-gray-500 truncate">{selectedRestaurant.cuisine}</p>
            </div>
          </div>
        </header>

        {/* Restaurant Info */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1 bg-[#13131A] px-3 py-1.5 rounded-full">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-white font-medium">{selectedRestaurant.rating}</span>
              <span className="text-gray-500 text-sm">({selectedRestaurant.reviews})</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{selectedRestaurant.deliveryTime}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">UGX {selectedRestaurant.deliveryFee.toLocaleString()}</span>
            </div>
          </div>

          {/* Loading */}
          {loadingMenu ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400 mb-4" />
              <p className="text-gray-500">Loading menu...</p>
            </div>
          ) : (
            <>
              {/* Menu Items */}
              <h3 className="text-white font-semibold mb-3">Menu</h3>
              <div className="space-y-3">
                {availableItems.map((item) => {
                  const cartItem = cart.items.find(c => c.id === item.id);
                  return (
                    <Card key={item.id} className="bg-[#13131A] border-white/5">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium">{item.name}</p>
                            <p className="text-gray-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-orange-400 font-semibold">UGX {item.price.toLocaleString()}</p>
                              {item.preparationTime && (
                                <span className="text-gray-600 text-xs">{item.preparationTime} min</span>
                              )}
                            </div>
                          </div>

                          {/* Quantity Controls or Add Button */}
                          {cartItem ? (
                            <div className="flex flex-col items-end gap-2">
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 className="h-3 w-3 text-red-400" />
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="w-8 h-8 rounded-full bg-[#1A1A24] flex items-center justify-center hover:bg-white/10 transition-colors"
                                >
                                  <Minus className="h-4 w-4 text-white" />
                                </button>
                                <span className="text-white font-medium w-6 text-center">{cartItem.quantity}</span>
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center"
                                >
                                  <Plus className="h-4 w-4 text-white" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center hover:bg-orange-500/30 transition-colors"
                            >
                              <Plus className="h-5 w-5 text-orange-400" />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {availableItems.length === 0 && !loadingMenu && (
                  <div className="text-center py-12">
                    <UtensilsCrossed className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No menu items available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Cart Bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12]/95 backdrop-blur-lg border-t border-white/5 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center relative">
                <ShoppingCart className="h-6 w-6 text-orange-400" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 rounded-full text-white text-xs flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs">{cartCount} item{cartCount > 1 ? 's' : ''} in cart</p>
                <p className="text-white font-semibold">UGX {cartTotal.toLocaleString()}</p>
              </div>
              <Button
                onClick={handleContinue}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-6 py-3 rounded-xl"
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

  // Restaurants list view
  return (
    <div className="min-h-screen bg-[#0D0D12] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">Smart Food</h1>
            <p className="text-sm text-gray-500">Order from your favorite restaurants</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* Search */}
        <div className="bg-[#13131A] rounded-xl p-3 flex items-center gap-3 border border-white/5 mb-4">
          <Search className="h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search restaurants or cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
          />
        </div>

        {/* Loading */}
        {loadingRestaurants ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400 mb-4" />
            <p className="text-gray-500">Loading restaurants...</p>
          </div>
        ) : (
          <>
            {/* Restaurants */}
            <h3 className="text-white font-semibold mb-3">Nearby Restaurants</h3>
            <div className="space-y-4">
              {restaurants
                .filter(r =>
                  r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((restaurant) => (
                  <Card
                    key={restaurant.id}
                    className="bg-[#13131A] border-white/5 overflow-hidden cursor-pointer hover:border-orange-500/30 transition-all active:scale-[0.98]"
                    onClick={() => selectRestaurant(restaurant)}
                  >
                    {restaurant.image ? (
                      <div
                        className="h-32 bg-cover bg-center"
                        style={{ backgroundImage: `url(${restaurant.image})` }}
                      />
                    ) : (
                      <div className="h-32 bg-[#1A1A24] flex items-center justify-center">
                        <Store className="h-12 w-12 text-gray-600" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-semibold">{restaurant.name}</h3>
                          <p className="text-gray-500 text-sm">{restaurant.cuisine}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-[#00FF88]/10 px-2 py-1 rounded">
                          <Star className="h-3 w-3 text-[#00FF88] fill-[#00FF88]" />
                          <span className="text-sm font-medium text-[#00FF88]">{restaurant.rating}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{restaurant.deliveryTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>UGX {restaurant.deliveryFee.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {restaurants.length === 0 && !loadingRestaurants && (
                <div className="text-center py-12">
                  <Store className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No restaurants available</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

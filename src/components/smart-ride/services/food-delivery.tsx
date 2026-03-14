'use client';

import React, { useState } from 'react';
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
  UtensilsCrossed
} from 'lucide-react';
import { useCart, CartType } from './cart-context';
import { CheckoutScreen } from './checkout-screen';

interface FoodDeliveryProps {
  onBack: () => void;
}

// Sample restaurants data
const restaurants = [
  {
    id: '1',
    name: 'Cafe Java',
    cuisine: 'International • Coffee',
    rating: 4.5,
    reviews: 234,
    deliveryTime: '20-30 min',
    deliveryFee: 5000,
    image: '/images/restaurants/cafe-java.png',
  },
  {
    id: '2',
    name: 'Ugandan Kitchen',
    cuisine: 'Local • African',
    rating: 4.3,
    reviews: 189,
    deliveryTime: '30-45 min',
    deliveryFee: 6000,
    image: '/images/restaurants/ugandan-kitchen.png',
  },
  {
    id: '3',
    name: 'Nandos Uganda',
    cuisine: 'Portuguese • Chicken',
    rating: 4.7,
    reviews: 312,
    deliveryTime: '25-35 min',
    deliveryFee: 5000,
    image: '/images/restaurants/cafe-java.png',
  },
  {
    id: '4',
    name: 'Javas House',
    cuisine: 'African • Local',
    rating: 4.6,
    reviews: 456,
    deliveryTime: '15-25 min',
    deliveryFee: 4000,
    image: '/images/restaurants/ugandan-kitchen.png',
  },
];

// Sample menu items for each restaurant
const menuItemsByRestaurant: Record<string, Array<{ id: string; name: string; price: number; description: string; image?: string }>> = {
  '1': [
    { id: 'm1', name: 'Margherita Pizza', price: 35000, description: 'Classic tomato sauce, mozzarella, and basil' },
    { id: 'm2', name: 'Pepperoni Pizza', price: 42000, description: 'Pepperoni with mozzarella cheese' },
    { id: 'm3', name: 'Chicken Wings', price: 25000, description: 'Crispy wings with your choice of sauce' },
    { id: 'm4', name: 'Caesar Salad', price: 18000, description: 'Fresh romaine lettuce with caesar dressing' },
    { id: 'm5', name: 'Fish & Chips', price: 38000, description: 'Battered fish with french fries' },
    { id: 'm6', name: 'Iced Coffee', price: 12000, description: 'Refreshing cold brew coffee' },
  ],
  '2': [
    { id: 'p1', name: 'Margherita Large', price: 45000, description: '12" pizza with tomato and cheese' },
    { id: 'p2', name: 'Meat Lovers', price: 55000, description: 'Loaded with pepperoni, sausage, ham' },
    { id: 'p3', name: 'Hawaiian', price: 48000, description: 'Ham and pineapple topping' },
    { id: 'p4', name: 'Veggie Supreme', price: 42000, description: 'Fresh vegetables and cheese' },
  ],
  '3': [
    { id: 'n1', name: 'Half Chicken', price: 32000, description: 'Flame-grilled peri-peri chicken' },
    { id: 'n2', name: 'Full Chicken', price: 58000, description: 'Whole peri-peri grilled chicken' },
    { id: 'n3', name: 'Chicken Burger', price: 28000, description: 'Crispy chicken burger with chips' },
    { id: 'n4', name: 'Peri Fries', price: 15000, description: 'Fries with peri-peri seasoning' },
  ],
  '4': [
    { id: 'j1', name: 'Luwombo', price: 35000, description: 'Traditional Ugandan dish' },
    { id: 'j2', name: 'Matooke & Groundnuts', price: 22000, description: 'Steamed bananas with peanut sauce' },
    { id: 'j3', name: 'Rolex', price: 12000, description: 'Chapati with eggs and vegetables' },
    { id: 'j4', name: 'Kikomando', price: 10000, description: 'Chapati with beans' },
  ],
};

type ViewType = 'restaurants' | 'menu' | 'checkout';

const CART_TYPE: CartType = 'food';

export function FoodDelivery({ onBack }: FoodDeliveryProps) {
  const { getCartByType, addItem, removeItem, updateQuantity, setDeliveryFee, setServiceInfo, getCartCount, setCheckoutCart } = useCart();
  const [view, setView] = useState<ViewType>('restaurants');
  const [selectedRestaurant, setSelectedRestaurant] = useState<typeof restaurants[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const cart = getCartByType(CART_TYPE);
  const cartCount = getCartCount(CART_TYPE);

  const handleAddToCart = (item: { id: string; name: string; price: number; description: string }) => {
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

  const selectRestaurant = (restaurant: typeof restaurants[0]) => {
    setSelectedRestaurant(restaurant);
    setDeliveryFee(restaurant.deliveryFee, CART_TYPE);
    setServiceInfo(restaurant.id, restaurant.name, CART_TYPE);
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
    const menuItems = menuItemsByRestaurant[selectedRestaurant.id] || [];
    const cartTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
      <div className="min-h-screen bg-[#0D0D12] pb-28">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('restaurants')}
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

        {/* Restaurant Image & Info */}
        <div 
          className="h-40 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${selectedRestaurant.image})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] to-transparent" />
        </div>

        <div className="px-4 -mt-8 relative z-10">
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

          {/* Menu Items */}
          <h3 className="text-white font-semibold mb-3">Menu</h3>
          <div className="space-y-3">
            {menuItems.map((item) => {
              const cartItem = cart.items.find(c => c.id === item.id);
              return (
                <Card key={item.id} className="bg-[#13131A] border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                        <p className="text-orange-400 font-semibold mt-2">UGX {item.price.toLocaleString()}</p>
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
          </div>
        </div>

        {/* Cart Bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12]/95 backdrop-blur-lg border-t border-white/5 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
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

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
          {['All', 'Pizza', 'Coffee', 'Chicken', 'Fast Food', 'African'].map((cat) => (
            <button
              key={cat}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                cat === 'All'
                  ? "bg-orange-600 text-white"
                  : "bg-[#13131A] text-gray-400 border border-white/5 hover:border-orange-500/30"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Restaurants */}
        <h3 className="text-white font-semibold mb-3">Nearby Restaurants</h3>
        <div className="space-y-4">
          {restaurants.map((restaurant) => (
            <Card
              key={restaurant.id}
              className="bg-[#13131A] border-white/5 overflow-hidden cursor-pointer hover:border-orange-500/30 transition-all active:scale-[0.98]"
              onClick={() => selectRestaurant(restaurant)}
            >
              <div
                className="h-32 bg-cover bg-center"
                style={{ backgroundImage: `url(${restaurant.image})` }}
              />
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
        </div>
      </div>
    </div>
  );
}

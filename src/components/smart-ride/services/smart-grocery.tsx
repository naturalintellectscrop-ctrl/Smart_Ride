'use client';

import React, { useState } from 'react';
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
  List
} from 'lucide-react';
import { useCart, CartType } from './cart-context';
import { CheckoutScreen } from './checkout-screen';

interface SmartGroceryProps {
  onBack: () => void;
}

// Grocery categories
const categories = [
  { id: 'all', name: 'All', icon: '🛒' },
  { id: 'fruits', name: 'Fruits', icon: '🍎' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬' },
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'bakery', name: 'Bakery', icon: '🍞' },
  { id: 'meat', name: 'Meat', icon: '🥩' },
  { id: 'beverages', name: 'Beverages', icon: '🧃' },
  { id: 'snacks', name: 'Snacks', icon: '🍪' },
  { id: 'household', name: 'Household', icon: '🧹' },
];

// Sample grocery items
const groceryItems = [
  { id: 'g1', name: 'Fresh Apples (1kg)', price: 8000, category: 'fruits', unit: 'kg', inStock: true },
  { id: 'g2', name: 'Bananas (1 bunch)', price: 4000, category: 'fruits', unit: 'bunch', inStock: true },
  { id: 'g3', name: 'Oranges (1kg)', price: 6000, category: 'fruits', unit: 'kg', inStock: true },
  { id: 'g4', name: 'Fresh Spinach', price: 3000, category: 'vegetables', unit: 'bunch', inStock: true },
  { id: 'g5', name: 'Tomatoes (1kg)', price: 5000, category: 'vegetables', unit: 'kg', inStock: true },
  { id: 'g6', name: 'Onions (1kg)', price: 4000, category: 'vegetables', unit: 'kg', inStock: true },
  { id: 'g7', name: 'Fresh Milk (1L)', price: 4500, category: 'dairy', unit: 'liter', inStock: true },
  { id: 'g8', name: 'Yogurt (500ml)', price: 5500, category: 'dairy', unit: 'cup', inStock: true },
  { id: 'g9', name: 'Cheddar Cheese (200g)', price: 12000, category: 'dairy', unit: 'pack', inStock: true },
  { id: 'g10', name: 'White Bread', price: 5000, category: 'bakery', unit: 'loaf', inStock: true },
  { id: 'g11', name: 'Croissants (3 pack)', price: 8000, category: 'bakery', unit: 'pack', inStock: true },
  { id: 'g12', name: 'Chicken Breast (1kg)', price: 25000, category: 'meat', unit: 'kg', inStock: true },
  { id: 'g13', name: 'Ground Beef (500g)', price: 18000, category: 'meat', unit: 'pack', inStock: true },
  { id: 'g14', name: 'Coca Cola (500ml)', price: 2500, category: 'beverages', unit: 'bottle', inStock: true },
  { id: 'g15', name: 'Orange Juice (1L)', price: 7000, category: 'beverages', unit: 'carton', inStock: true },
  { id: 'g16', name: 'Potato Chips', price: 4000, category: 'snacks', unit: 'pack', inStock: true },
  { id: 'g17', name: 'Chocolate Bar', price: 5000, category: 'snacks', unit: 'bar', inStock: true },
  { id: 'g18', name: 'Dish Soap', price: 6000, category: 'household', unit: 'bottle', inStock: true },
  { id: 'g19', name: 'Laundry Detergent', price: 15000, category: 'household', unit: 'pack', inStock: true },
  { id: 'g20', name: 'Avocados (2 pack)', price: 5000, category: 'fruits', unit: 'pack', inStock: true },
];

const CART_TYPE: CartType = 'grocery';
const DELIVERY_FEE = 6000;

type ViewType = 'shop' | 'checkout';

export function SmartGrocery({ onBack }: SmartGroceryProps) {
  const { getCartByType, addItem, removeItem, updateQuantity, setDeliveryFee, getCartCount, setCheckoutCart } = useCart();
  const [view, setView] = useState<ViewType>('shop');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(true);

  const cart = getCartByType(CART_TYPE);
  const cartCount = getCartCount(CART_TYPE);
  const cartTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Set delivery fee on mount
  React.useEffect(() => {
    setDeliveryFee(DELIVERY_FEE, CART_TYPE);
  }, [setDeliveryFee]);

  const filteredItems = groceryItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (item: typeof groceryItems[0]) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      description: `Per ${item.unit}`,
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
        onBack={() => setView('shop')}
        onOrderComplete={onBack}
      />
    );
  }

  // Shop view
  return (
    <div className="min-h-screen bg-[#0D0D12] pb-28">
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
            placeholder="Search groceries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                selectedCategory === cat.id
                  ? "bg-purple-600 text-white"
                  : "bg-[#13131A] text-gray-400 border border-white/5 hover:border-purple-500/30"
              )}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Grid/List */}
        {isGridView ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const cartItem = cart.items.find(c => c.id === item.id);
              return (
                <Card key={item.id} className="bg-[#13131A] border-white/5">
                  <CardContent className="p-3">
                    <div className="w-full h-24 bg-[#1A1A24] rounded-lg flex items-center justify-center mb-2">
                      <span className="text-3xl">
                        {item.category === 'fruits' && '🍎'}
                        {item.category === 'vegetables' && '🥬'}
                        {item.category === 'dairy' && '🥛'}
                        {item.category === 'bakery' && '🍞'}
                        {item.category === 'meat' && '🥩'}
                        {item.category === 'beverages' && '🧃'}
                        {item.category === 'snacks' && '🍪'}
                        {item.category === 'household' && '🧹'}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm truncate">{item.name}</p>
                    <p className="text-gray-500 text-xs">{item.unit}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-purple-400 font-semibold">UGX {item.price.toLocaleString()}</p>
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
                      <div className="w-14 h-14 bg-[#1A1A24] rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">
                          {item.category === 'fruits' && '🍎'}
                          {item.category === 'vegetables' && '🥬'}
                          {item.category === 'dairy' && '🥛'}
                          {item.category === 'bakery' && '🍞'}
                          {item.category === 'meat' && '🥩'}
                          {item.category === 'beverages' && '🧃'}
                          {item.category === 'snacks' && '🍪'}
                          {item.category === 'household' && '🧹'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.name}</p>
                        <p className="text-gray-500 text-sm">Per {item.unit}</p>
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

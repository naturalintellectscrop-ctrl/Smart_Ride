'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { 
  Search, 
  MapPin, 
  ShoppingCart,
  Plus,
  Minus,
  Package,
  ArrowRight,
  Store
} from 'lucide-react';

interface ShoppingScreenProps {
  onBack: () => void;
}

const supermarkets = [
  {
    id: '1',
    name: 'Uchumi Supermarket',
    type: 'Supermarket',
    deliveryTime: '30-45 min',
    deliveryFee: 8000,
  },
  {
    id: '2',
    name: 'Carrefour Uganda',
    type: 'Supermarket',
    deliveryTime: '25-40 min',
    deliveryFee: 7000,
  },
  {
    id: '3',
    name: 'Shoprite Kampala',
    type: 'Supermarket',
    deliveryTime: '35-50 min',
    deliveryFee: 6000,
  },
];

const products = [
  { id: '1', name: 'Rice (1kg)', price: 8000, category: 'Food' },
  { id: '2', name: 'Cooking Oil (1L)', price: 12000, category: 'Food' },
  { id: '3', name: 'Sugar (1kg)', price: 6500, category: 'Food' },
  { id: '4', name: 'Milk (1L)', price: 4500, category: 'Dairy' },
  { id: '5', name: 'Bread', price: 5000, category: 'Bakery' },
  { id: '6', name: 'Eggs (tray)', price: 15000, category: 'Dairy' },
];

export function ShoppingScreen({ onBack }: ShoppingScreenProps) {
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; quantity: number }>>([]);
  const [selectedStore, setSelectedStore] = useState<typeof supermarkets[0] | null>(null);
  const [view, setView] = useState<'stores' | 'products' | 'cart'>('stores');

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (item: typeof products[0]) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    const existing = cart.find(c => c.id === itemId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c));
    } else {
      setCart(cart.filter(c => c.id !== itemId));
    }
  };

  if (view === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <MobileHeader 
          title="Your Cart" 
          showBack 
          onBack={() => setView('products')}
        />
        
        <div className="px-4 pt-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <MobileCard key={item.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">UGX {item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="font-medium w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => addToCart(products.find(p => p.id === item.id)!)}
                          className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4 text-purple-600" />
                        </button>
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>

              <MobileCard className="mt-4 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>UGX {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>UGX {selectedStore?.deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>UGX {(cartTotal + (selectedStore?.deliveryFee || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </MobileCard>

              <button className="mt-6 w-full bg-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                Place Order
                <ArrowRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (view === 'products' && selectedStore) {
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <MobileHeader 
          title={selectedStore.name} 
          showBack 
          onBack={() => setView('stores')}
        />
        
        <div className="px-4 pt-4">
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span>{selectedStore.deliveryTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>UGX {selectedStore.deliveryFee.toLocaleString()} delivery</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {products.map((product) => {
              const cartItem = cart.find(c => c.id === product.id);
              return (
                <MobileCard key={product.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.category}</p>
                        <p className="font-semibold text-purple-600">UGX {product.price.toLocaleString()}</p>
                      </div>
                    </div>
                    {cartItem ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeFromCart(product.id)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="font-medium w-6 text-center">{cartItem.quantity}</span>
                        <button 
                          onClick={() => addToCart(product)}
                          className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(product)}
                        className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"
                      >
                        <Plus className="h-5 w-5 text-purple-600" />
                      </button>
                    )}
                  </div>
                </MobileCard>
              );
            })}
          </div>
        </div>

        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-md mx-auto">
            <button 
              onClick={() => setView('cart')}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              View Cart ({cartCount}) • UGX {cartTotal.toLocaleString()}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader 
        title="Smart Grocery" 
        subtitle="Groceries & household items"
        showBack 
        onBack={onBack}
      />
      
      <div className="px-4 pt-4">
        {/* Search */}
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-200">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products or stores..."
            className="flex-1 outline-none"
          />
        </div>

        {/* Categories */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {['All', 'Groceries', 'Dairy', 'Bakery', 'Household', 'Personal Care'].map((cat) => (
            <button 
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                cat === 'All' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Stores */}
        <h3 className="font-semibold text-gray-900 mt-6 mb-3">Nearby Stores</h3>
        <div className="space-y-3">
          {supermarkets.map((store) => (
            <MobileCard 
              key={store.id}
              className="p-4"
              onClick={() => {
                setSelectedStore(store);
                setView('products');
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Store className="h-7 w-7 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{store.name}</h3>
                  <p className="text-sm text-gray-500">{store.type}</p>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span>{store.deliveryTime}</span>
                    <span>•</span>
                    <span>UGX {store.deliveryFee.toLocaleString()} delivery</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </MobileCard>
          ))}
        </div>
      </div>
    </div>
  );
}

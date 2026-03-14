'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import { PaymentMethodSelector, PaymentMethod, paymentMethodLabels } from '../../shared/payment-method-selector';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock,
  Plus,
  Minus,
  ShoppingCart,
  UtensilsCrossed,
  ArrowRight
} from 'lucide-react';

interface FoodDeliveryScreenProps {
  onBack: () => void;
}

const restaurants = [
  {
    id: '1',
    name: 'Cafe Java',
    cuisine: 'International • Coffee',
    rating: 4.5,
    reviews: 234,
    deliveryTime: '20-30 min',
    deliveryFee: 5000,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
  },
  {
    id: '2',
    name: 'Pizza Hut',
    cuisine: 'Pizza • Italian',
    rating: 4.3,
    reviews: 189,
    deliveryTime: '30-45 min',
    deliveryFee: 6000,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
  },
  {
    id: '3',
    name: 'Nandos Uganda',
    cuisine: 'Portuguese • Chicken',
    rating: 4.7,
    reviews: 312,
    deliveryTime: '25-35 min',
    deliveryFee: 5000,
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400',
  },
];

const menuItems = [
  { id: '1', name: 'Margherita Pizza', price: 35000, description: 'Classic tomato sauce, mozzarella, and basil' },
  { id: '2', name: 'Pepperoni Pizza', price: 42000, description: 'Pepperoni with mozzarella cheese' },
  { id: '3', name: 'Chicken Wings', price: 25000, description: 'Crispy wings with your choice of sauce' },
  { id: '4', name: 'Caesar Salad', price: 18000, description: 'Fresh romaine lettuce with caesar dressing' },
  { id: '5', name: 'Fish & Chips', price: 38000, description: 'Battered fish with french fries' },
];

export function FoodDeliveryScreen({ onBack }: FoodDeliveryScreenProps) {
  const [view, setView] = useState<'restaurants' | 'menu' | 'cart'>('restaurants');
  const [selectedRestaurant, setSelectedRestaurant] = useState<typeof restaurants[0] | null>(null);
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; quantity: number }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (item: typeof menuItems[0]) => {
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

  const selectRestaurant = (restaurant: typeof restaurants[0]) => {
    setSelectedRestaurant(restaurant);
    setView('menu');
  };

  if (view === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <MobileHeader 
          title="Your Cart" 
          showBack 
          onBack={() => setView('menu')}
        />
        
        <div className="px-4 pt-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
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
                          onClick={() => addToCart(menuItems.find(m => m.id === item.id)!)}
                          className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4 text-orange-600" />
                        </button>
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>

              {/* Payment Method */}
              <div className="mt-4">
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onSelect={setPaymentMethod}
                  themeColor="orange"
                />
              </div>

              {/* Summary */}
              <MobileCard className="mt-4 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>UGX {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>UGX {selectedRestaurant?.deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>UGX {(cartTotal + (selectedRestaurant?.deliveryFee || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </MobileCard>
            </>
          )}
        </div>

        {/* Checkout Button */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-md mx-auto">
            <div className="text-center mb-2">
              <span className="text-xs text-gray-500">Pay with {paymentMethodLabels[paymentMethod]}</span>
            </div>
            <button className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
              Place Order • UGX {(cartTotal + (selectedRestaurant?.deliveryFee || 0)).toLocaleString()}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'menu' && selectedRestaurant) {
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <MobileHeader 
          title={selectedRestaurant.name} 
          showBack 
          onBack={() => setView('restaurants')}
        />
        
        <div className="px-4 pt-4">
          {/* Restaurant Info */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{selectedRestaurant.rating}</span>
              <span className="text-sm text-gray-500">({selectedRestaurant.reviews})</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{selectedRestaurant.deliveryTime}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">UGX {selectedRestaurant.deliveryFee.toLocaleString()}</span>
            </div>
          </div>

          {/* Menu Items */}
          <h3 className="font-semibold text-gray-900 mb-3">Menu</h3>
          <div className="space-y-3">
            {menuItems.map((item) => {
              const cartItem = cart.find(c => c.id === item.id);
              return (
                <MobileCard key={item.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      <p className="font-semibold text-orange-600 mt-2">UGX {item.price.toLocaleString()}</p>
                    </div>
                    {cartItem ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="font-medium w-6 text-center">{cartItem.quantity}</span>
                        <button 
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(item)}
                        className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"
                      >
                        <Plus className="h-5 w-5 text-orange-600" />
                      </button>
                    )}
                  </div>
                </MobileCard>
              );
            })}
          </div>
        </div>

        {/* Cart Button */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-md mx-auto">
            <button 
              onClick={() => setView('cart')}
              className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              View Cart ({cartCount})
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
        title="Smart Food" 
        subtitle="Order from your favorite restaurants"
        showBack 
        onBack={onBack}
      />
      
      <div className="px-4 pt-4">
        {/* Search */}
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-200">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search restaurants or cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {/* Categories */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {['All', 'Pizza', 'Coffee', 'Chicken', 'Fast Food', 'African'].map((cat) => (
            <button 
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                cat === 'All' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Restaurants */}
        <h3 className="font-semibold text-gray-900 mt-6 mb-3">Nearby Restaurants</h3>
        <div className="space-y-4">
          {restaurants.map((restaurant) => (
            <MobileCard 
              key={restaurant.id} 
              className="overflow-hidden"
              onClick={() => selectRestaurant(restaurant)}
            >
              <div 
                className="h-32 bg-cover bg-center"
                style={{ backgroundImage: `url(${restaurant.image})` }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                    <p className="text-sm text-gray-500">{restaurant.cuisine}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                    <Star className="h-3 w-3 text-green-600 fill-green-600" />
                    <span className="text-sm font-medium text-green-700">{restaurant.rating}</span>
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
              </div>
            </MobileCard>
          ))}
        </div>
      </div>
    </div>
  );
}

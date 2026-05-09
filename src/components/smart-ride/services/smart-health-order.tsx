'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Search,
  MapPin,
  Clock,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Trash2,
  Heart,
  Pill,
  FileText,
  Check
} from 'lucide-react';
import { useCart, CartType } from './cart-context';
import { CheckoutScreen } from './checkout-screen';

interface SmartHealthOrderProps {
  onBack: () => void;
}

// Sample health facilities/pharmacies
const healthFacilities = [
  {
    id: '1',
    name: 'HealthCare Pharmacy',
    type: 'Pharmacy',
    rating: 4.8,
    reviews: 156,
    deliveryTime: '15-25 min',
    deliveryFee: 3000,
    isOpen: true,
  },
  {
    id: '2',
    name: 'MediCare Plus',
    type: 'Pharmacy',
    rating: 4.6,
    reviews: 89,
    deliveryTime: '20-30 min',
    deliveryFee: 4000,
    isOpen: true,
  },
  {
    id: '3',
    name: 'City Hospital Pharmacy',
    type: 'Hospital Pharmacy',
    rating: 4.9,
    reviews: 234,
    deliveryTime: '25-35 min',
    deliveryFee: 5000,
    isOpen: true,
  },
  {
    id: '4',
    name: 'Community Drug Store',
    type: 'Drug Store',
    rating: 4.4,
    reviews: 67,
    deliveryTime: '10-20 min',
    deliveryFee: 2500,
    isOpen: false,
  },
];

// Sample medicines/products
const medicinesByFacility: Record<string, Array<{ id: string; name: string; price: number; description: string; requiresPrescription: boolean; category: string }>> = {
  '1': [
    { id: 'm1', name: 'Paracetamol 500mg', price: 5000, description: 'Pain relief & fever reducer', requiresPrescription: false, category: 'Pain Relief' },
    { id: 'm2', name: 'Amoxicillin 250mg', price: 15000, description: 'Antibiotic for infections', requiresPrescription: true, category: 'Antibiotics' },
    { id: 'm3', name: 'Ibuprofen 400mg', price: 8000, description: 'Anti-inflammatory pain relief', requiresPrescription: false, category: 'Pain Relief' },
    { id: 'm4', name: 'ORS Sachets', price: 2000, description: 'Oral rehydration salts', requiresPrescription: false, category: 'Hydration' },
    { id: 'm5', name: 'Vitamin C 1000mg', price: 12000, description: 'Immune system support', requiresPrescription: false, category: 'Vitamins' },
    { id: 'm6', name: 'Omeprazole 20mg', price: 25000, description: 'Acid reducer for heartburn', requiresPrescription: false, category: 'Digestive' },
  ],
  '2': [
    { id: 'm1', name: 'Cetirizine 10mg', price: 6000, description: 'Allergy relief', requiresPrescription: false, category: 'Allergy' },
    { id: 'm2', name: 'Metformin 500mg', price: 18000, description: 'Diabetes management', requiresPrescription: true, category: 'Diabetes' },
    { id: 'm3', name: 'Loratadine 10mg', price: 7000, description: 'Non-drowsy allergy relief', requiresPrescription: false, category: 'Allergy' },
    { id: 'm4', name: 'Multivitamins', price: 25000, description: 'Daily vitamin supplement', requiresPrescription: false, category: 'Vitamins' },
  ],
  '3': [
    { id: 'm1', name: 'Artemether/Lumefantrine', price: 12000, description: 'Malaria treatment', requiresPrescription: true, category: 'Malaria' },
    { id: 'm2', name: 'Panadol Extra', price: 6000, description: 'Strong pain relief', requiresPrescription: false, category: 'Pain Relief' },
    { id: 'm3', name: 'Diclofenac 50mg', price: 10000, description: 'Anti-inflammatory', requiresPrescription: true, category: 'Pain Relief' },
  ],
  '4': [
    { id: 'm1', name: 'Cold & Flu Tablets', price: 8000, description: 'Cold symptom relief', requiresPrescription: false, category: 'Cold & Flu' },
    { id: 'm2', name: 'Cough Syrup 100ml', price: 15000, description: 'Cough suppressant', requiresPrescription: false, category: 'Cold & Flu' },
  ],
};

type ViewType = 'facilities' | 'products' | 'checkout';

const CART_TYPE: CartType = 'health';

export function SmartHealthOrder({ onBack }: SmartHealthOrderProps) {
  const { getCartByType, addItem, removeItem, updateQuantity, setDeliveryFee, setServiceInfo, getCartCount, setCheckoutCart } = useCart();
  const [view, setView] = useState<ViewType>('facilities');
  const [selectedFacility, setSelectedFacility] = useState<typeof healthFacilities[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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

  const selectFacility = (facility: typeof healthFacilities[0]) => {
    setSelectedFacility(facility);
    setDeliveryFee(facility.deliveryFee, CART_TYPE);
    setServiceInfo(facility.id, facility.name, CART_TYPE);
    setView('products');
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
        onBack={() => setView('products')}
        onOrderComplete={onBack}
      />
    );
  }

  // Products view
  if (view === 'products' && selectedFacility) {
    const products = medicinesByFacility[selectedFacility.id] || [];
    const categories = ['All', ...new Set(products.map(p => p.category))];
    const filteredProducts = selectedCategory === 'All' 
      ? products 
      : products.filter(p => p.category === selectedCategory);
    const cartTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
      <div className="min-h-screen bg-[#0D0D12] pb-28">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#13131A] border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('facilities')}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-transform"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">{selectedFacility.name}</h1>
              <p className="text-sm text-gray-500 truncate">{selectedFacility.type}</p>
            </div>
          </div>
        </header>

        <div className="px-4 pt-4">
          {/* Facility Info */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1 bg-[#13131A] px-3 py-1.5 rounded-full">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              <span className="text-white font-medium">{selectedFacility.rating}</span>
              <span className="text-gray-500 text-sm">({selectedFacility.reviews})</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{selectedFacility.deliveryTime}</span>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  selectedCategory === cat
                    ? "bg-rose-600 text-white"
                    : "bg-[#13131A] text-gray-400 border border-white/5 hover:border-rose-500/30"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products */}
          <h3 className="text-white font-semibold mb-3">Available Products</h3>
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const cartItem = cart.items.find(c => c.id === product.id);
              return (
                <Card key={product.id} className="bg-[#13131A] border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{product.name}</p>
                          {product.requiresPrescription && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Rx
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{product.description}</p>
                        <p className="text-rose-400 font-semibold mt-2">UGX {product.price.toLocaleString()}</p>
                      </div>
                      
                      {/* Quantity Controls or Add Button */}
                      {cartItem ? (
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => handleDeleteItem(product.id)}
                            className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemoveFromCart(product.id)}
                              className="w-8 h-8 rounded-full bg-[#1A1A24] flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                              <Minus className="h-4 w-4 text-white" />
                            </button>
                            <span className="text-white font-medium w-6 text-center">{cartItem.quantity}</span>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center"
                            >
                              <Plus className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center hover:bg-rose-500/30 transition-colors"
                        >
                          <Plus className="h-5 w-5 text-rose-400" />
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
              <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center relative">
                <Pill className="h-6 w-6 text-rose-400" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 rounded-full text-white text-xs flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs">{cartCount} item{cartCount > 1 ? 's' : ''} in cart</p>
                <p className="text-white font-semibold">UGX {cartTotal.toLocaleString()}</p>
              </div>
              <Button
                onClick={handleContinue}
                className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-xl"
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

  // Facilities list view
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
            <h1 className="text-lg font-semibold text-white">Smart Health</h1>
            <p className="text-sm text-gray-500">Order medicines & healthcare products</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* Search */}
        <div className="bg-[#13131A] rounded-xl p-3 flex items-center gap-3 border border-white/5 mb-4">
          <Search className="h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search medicines or facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
          />
        </div>

        {/* Info Banner */}
        <Card className="bg-rose-500/10 border-rose-500/30 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-rose-300 font-medium text-sm">Prescription Required?</p>
                <p className="text-rose-200/70 text-xs">Some medicines require a valid prescription. Upload it during checkout.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facilities */}
        <h3 className="text-white font-semibold mb-3">Health Facilities</h3>
        <div className="space-y-4">
          {healthFacilities.map((facility) => (
            <Card
              key={facility.id}
              className={cn(
                "bg-[#13131A] border-white/5 overflow-hidden cursor-pointer transition-all active:scale-[0.98]",
                facility.isOpen ? "hover:border-rose-500/30" : "opacity-50"
              )}
              onClick={() => facility.isOpen && selectFacility(facility)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{facility.name}</h3>
                      {!facility.isOpen && (
                        <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">Closed</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{facility.type}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded">
                    <Heart className="h-3 w-3 text-rose-400 fill-rose-400" />
                    <span className="text-sm font-medium text-rose-400">{facility.rating}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{facility.deliveryTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>UGX {facility.deliveryFee.toLocaleString()}</span>
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

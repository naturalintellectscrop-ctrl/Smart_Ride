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
  Pill,
  ArrowRight,
  Upload,
  FileText,
  AlertCircle,
  Thermometer,
  Package,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface SmartHealthScreenProps {
  onBack: () => void;
}

// Sample pharmacies
const pharmacies = [
  {
    id: '1',
    name: 'HealthFirst Pharmacy',
    address: 'Kampala Central',
    rating: 4.7,
    reviews: 156,
    isOpen: true,
    deliveryTime: '30-45 min',
    deliveryFee: 4000,
    supportsPrescription: true,
    supportsOTC: true,
  },
  {
    id: '3',
    name: 'MediCare Plus',
    address: 'Nakasero',
    rating: 4.5,
    reviews: 98,
    isOpen: true,
    deliveryTime: '25-40 min',
    deliveryFee: 5000,
    supportsPrescription: true,
    supportsOTC: true,
  },
];

// Sample medicine categories
const medicineCategories = [
  { id: 'PAINKILLERS', name: 'Pain Relief', icon: '💊' },
  { id: 'VITAMINS', name: 'Vitamins', icon: '🍊' },
  { id: 'COLD_FLU', name: 'Cold & Flu', icon: '🤧' },
  { id: 'DIGESTIVE', name: 'Digestive', icon: '💊' },
  { id: 'HYGIENE', name: 'Hygiene', icon: '🧴' },
  { id: 'FIRST_AID', name: 'First Aid', icon: '🩹' },
];

// Sample OTC medicines
const otcMedicines = [
  { id: '1', name: 'Paracetamol 500mg', genericName: 'Acetaminophen', price: 5000, category: 'PAINKILLERS', description: 'For pain relief and fever', requiresPrescription: false },
  { id: '2', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', price: 8000, category: 'PAINKILLERS', description: 'Anti-inflammatory pain reliever', requiresPrescription: false },
  { id: '3', name: 'Vitamin C 1000mg', genericName: 'Ascorbic Acid', price: 15000, category: 'VITAMINS', description: 'Immune system support', requiresPrescription: false },
  { id: '4', name: 'Cold & Flu Relief', genericName: 'Multi-symptom', price: 12000, category: 'COLD_FLU', description: 'Relieves cold and flu symptoms', requiresPrescription: false },
  { id: '5', name: 'Antacid Tablets', genericName: 'Calcium Carbonate', price: 8000, category: 'DIGESTIVE', description: 'For heartburn relief', requiresPrescription: false },
  { id: '6', name: 'Hand Sanitizer 500ml', genericName: 'Alcohol-based', price: 10000, category: 'HYGIENE', description: 'Kills 99.9% of germs', requiresPrescription: false },
  { id: '7', name: 'Bandages Pack', genericName: 'Adhesive bandages', price: 5000, category: 'FIRST_AID', description: 'Assorted sizes', requiresPrescription: false },
];

type ViewType = 'order-type' | 'prescription' | 'otc' | 'pharmacies' | 'cart' | 'tracking';

export function SmartHealthScreen({ onBack }: SmartHealthScreenProps) {
  const [view, setView] = useState<ViewType>('order-type');
  const [selectedPharmacy, setSelectedPharmacy] = useState<typeof pharmacies[0] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('PAINKILLERS');
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; quantity: number }>>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Prescription state
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MTN_MOMO');

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (item: typeof otcMedicines[0]) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { id: item.id, name: item.name, price: item.price, quantity: 1 }]);
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

  const filteredMedicines = otcMedicines.filter(m => 
    selectedCategory === 'ALL' || m.category === selectedCategory
  );

  // Order Type Selection
  if (view === 'order-type') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader 
          title="Smart Health" 
          subtitle="Order medicines from pharmacies"
          showBack 
          onBack={onBack}
        />
        
        <div className="px-4 pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Select Order Type</h3>
          
          {/* Prescription Order Card */}
          <MobileCard 
            className="p-4 mb-4 cursor-pointer active:bg-gray-100"
            onClick={() => setView('prescription')}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-rose-100 rounded-xl flex items-center justify-center">
                <FileText className="h-7 w-7 text-rose-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Prescription Medicine</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Upload your prescription and order prescribed medicines
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full">
                    Requires prescription
                  </span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </MobileCard>

          {/* OTC Order Card */}
          <MobileCard 
            className="p-4 cursor-pointer active:bg-gray-100"
            onClick={() => setView('otc')}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Pill className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Over-the-Counter Medicine</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Order common medicines without a prescription
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    No prescription needed
                  </span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </MobileCard>

          {/* Quick Actions */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <MobileCard className="p-4 text-center">
                <span className="text-2xl">📋</span>
                <p className="text-sm font-medium mt-2">My Prescriptions</p>
              </MobileCard>
              <MobileCard className="p-4 text-center">
                <span className="text-2xl">📦</span>
                <p className="text-sm font-medium mt-2">Order History</p>
              </MobileCard>
            </div>
          </div>

          {/* Popular Medicines */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Popular OTC Medicines</h3>
            <div className="grid grid-cols-2 gap-3">
              {otcMedicines.slice(0, 4).map((medicine) => (
                <MobileCard key={medicine.id} className="p-3">
                  <p className="font-medium text-gray-900 text-sm">{medicine.name}</p>
                  <p className="text-xs text-gray-500">{medicine.genericName}</p>
                  <p className="text-emerald-600 font-semibold mt-2">UGX {medicine.price.toLocaleString()}</p>
                </MobileCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prescription Upload View
  if (view === 'prescription') {
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <MobileHeader 
          title="Prescription Order" 
          showBack 
          onBack={() => setView('order-type')}
        />
        
        <div className="px-4 pt-4">
          {/* Upload Prescription */}
          <MobileCard className="p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">Upload Prescription</h4>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              {prescriptionFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-emerald-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{prescriptionFile.name}</p>
                    <p className="text-sm text-gray-500">Click to change</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Tap to upload prescription image</p>
                  <p className="text-sm text-gray-400 mt-1">JPG, PNG up to 10MB</p>
                </>
              )}
              <input 
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)}
              />
            </div>
          </MobileCard>

          {/* Doctor Info */}
          <MobileCard className="p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">Doctor Information</h4>
            <input
              type="text"
              placeholder="Doctor's Name (Optional)"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 mb-3"
            />
            <textarea
              placeholder="Notes for pharmacy (Optional)"
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 h-24 resize-none"
            />
          </MobileCard>

          {/* Delivery Address */}
          <MobileCard className="p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">Delivery Address</h4>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <input
                type="text"
                placeholder="Enter delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="flex-1 bg-transparent outline-none"
              />
            </div>
          </MobileCard>

          {/* Payment Method */}
          <div className="mb-4">
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelect={setPaymentMethod}
              themeColor="emerald"
            />
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Important</p>
                <p className="text-sm text-amber-700 mt-1">
                  Your prescription will be verified by the pharmacy before order preparation.
                  Invalid prescriptions may be rejected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-md mx-auto">
          <button 
            disabled={!prescriptionFile || !deliveryAddress}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              prescriptionFile && deliveryAddress
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            Submit Prescription Order
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // OTC Medicine Selection View
  if (view === 'otc') {
    const currentMedicine = filteredMedicines.find(m => cart.some(c => c.id === m.id));
    
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <MobileHeader 
          title="OTC Medicines" 
          showBack 
          onBack={() => setView('order-type')}
        />
        
        <div className="px-4 pt-4">
          {/* Search */}
          <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-200 mb-4">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
            {medicineCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Medicines List */}
          <div className="space-y-3">
            {filteredMedicines.map((medicine) => {
              const cartItem = cart.find(c => c.id === medicine.id);
              return (
                <MobileCard key={medicine.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{medicine.name}</p>
                        {medicine.requiresPrescription && (
                          <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                            Rx
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{medicine.genericName}</p>
                      <p className="text-sm text-gray-400 mt-1">{medicine.description}</p>
                      <p className="font-semibold text-emerald-600 mt-2">UGX {medicine.price.toLocaleString()}</p>
                    </div>
                    {cartItem ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeFromCart(medicine.id)}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="font-medium w-6 text-center">{cartItem.quantity}</span>
                        <button 
                          onClick={() => addToCart(medicine)}
                          className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(medicine)}
                        className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"
                      >
                        <Plus className="h-5 w-5 text-emerald-600" />
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
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
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

  // Cart View
  if (view === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <MobileHeader 
          title="Your Cart" 
          showBack 
          onBack={() => setView('otc')}
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
                          onClick={() => addToCart(otcMedicines.find(m => m.id === item.id)!)}
                          className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>

              {/* Delivery Address */}
              <MobileCard className="mt-4 p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Delivery Address</h4>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <input
                    type="text"
                    placeholder="Enter delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="flex-1 bg-transparent outline-none"
                  />
                </div>
              </MobileCard>

              {/* Payment Method */}
              <div className="mt-4">
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onSelect={setPaymentMethod}
                  themeColor="emerald"
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
                    <span>UGX 4,000</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>UGX {(cartTotal + 4000).toLocaleString()}</span>
                  </div>
                </div>
              </MobileCard>

              {/* Handling Instructions */}
              <MobileCard className="mt-4 p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Handling Instructions</h4>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Fragile</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <Thermometer className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Temperature Sensitive</span>
                  </label>
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
            <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
              Place Order • UGX {(cartTotal + 4000).toLocaleString()}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

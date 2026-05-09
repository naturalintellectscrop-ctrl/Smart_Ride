'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Pill,
  Heart,
  Bandage,
  Baby,
  Eye,
  Activity,
  Stethoscope,
  Plus,
  Minus,
  Trash2,
  Upload,
  Camera,
  FileText,
  Check,
  Clock,
  Truck,
  Package,
  MapPin,
  CreditCard,
  Wallet,
  Smartphone,
  Filter,
  Star,
  Info,
  AlertCircle,
  ChevronRight,
  X,
  Image as ImageIcon,
  Loader2,
  Phone,
  MessageSquare,
  Building2,
  BadgeCheck,
  Navigation
} from 'lucide-react';
import { getServiceColors } from '@/lib/theme/smart-ride-theme';

// ============================================
// Types
// ============================================

type HealthFlowStep = 'facilities' | 'browse' | 'cart' | 'checkout' | 'tracking';

interface HealthFacility {
  id: string;
  name: string;
  type: 'pharmacy' | 'clinic' | 'hospital';
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  distance: string;
  isOpen: boolean;
  address: string;
  phone: string;
  logo: string;
  verified: boolean;
}

interface Medicine {
  id: string;
  facilityId: string;
  name: string;
  genericName: string;
  brand: string;
  category: MedicineCategory;
  price: number;
  originalPrice?: number;
  unit: string;
  inStock: boolean;
  stockCount: number;
  requiresPrescription: boolean; // Changed: now just an indicator, not a requirement
  rating: number;
  reviews: number;
  description: string;
  dosage: string;
  image?: string;
}

type MedicineCategory = 
  | 'pain-relief'
  | 'vitamins'
  | 'first-aid'
  | 'digestive'
  | 'respiratory'
  | 'skincare'
  | 'baby-care'
  | 'eye-care'
  | 'chronic'
  | 'personal-care';

interface CartItem extends Medicine {
  quantity: number;
}

interface Prescription {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  preview?: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'dispensing' | 'on-the-way' | 'delivered';
  createdAt: Date;
  estimatedDelivery: string;
  deliveryAddress: string;
  facility: {
    name: string;
    phone: string;
    type: string;
  };
  hasPrescriptionItems: boolean;
  prescriptionRequired: boolean; // Optional - user choice
}

// ============================================
// Constants - Mock Data
// ============================================

const FACILITY_TYPES = [
  { id: 'pharmacy', name: 'Pharmacy', icon: Pill },
  { id: 'clinic', name: 'Clinic', icon: Stethoscope },
  { id: 'hospital', name: 'Hospital', icon: Building2 },
];

const MOCK_FACILITIES: HealthFacility[] = [
  {
    id: 'facility-001',
    name: 'HealthCare Pharmacy',
    type: 'pharmacy',
    rating: 4.8,
    reviewCount: 1250,
    deliveryTime: '15-25 min',
    deliveryFee: 3000,
    distance: '1.2 km',
    isOpen: true,
    address: 'Nakasero, Kampala',
    phone: '+256 700 123 456',
    logo: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=200&h=200&fit=crop',
    verified: true,
  },
  {
    id: 'facility-002',
    name: 'MediPlus Pharmacy',
    type: 'pharmacy',
    rating: 4.6,
    reviewCount: 890,
    deliveryTime: '20-30 min',
    deliveryFee: 2500,
    distance: '2.1 km',
    isOpen: true,
    address: 'Kololo, Kampala',
    phone: '+256 701 234 567',
    logo: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop',
    verified: true,
  },
  {
    id: 'facility-003',
    name: 'Kampala City Pharmacy',
    type: 'pharmacy',
    rating: 4.5,
    reviewCount: 567,
    deliveryTime: '25-35 min',
    deliveryFee: 2000,
    distance: '3.0 km',
    isOpen: true,
    address: 'Kampala CBD',
    phone: '+256 702 345 678',
    logo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop',
    verified: false,
  },
  {
    id: 'facility-004',
    name: 'Ntinda Drug Store',
    type: 'pharmacy',
    rating: 4.4,
    reviewCount: 340,
    deliveryTime: '30-45 min',
    deliveryFee: 3500,
    distance: '4.2 km',
    isOpen: false,
    address: 'Ntinda, Kampala',
    phone: '+256 703 456 789',
    logo: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop',
    verified: true,
  },
];

// Medicines linked to facilities (simulating provider inventory connection)
const FACILITY_INVENTORY: Medicine[] = [
  // HealthCare Pharmacy inventory
  {
    id: 'med-001',
    facilityId: 'facility-001',
    name: 'Paracetamol 500mg',
    genericName: 'Acetaminophen',
    brand: 'Panadol',
    category: 'pain-relief',
    price: 3500,
    originalPrice: 4000,
    unit: 'strip of 10 tablets',
    inStock: true,
    stockCount: 150,
    requiresPrescription: false,
    rating: 4.8,
    reviews: 234,
    description: 'Fast-acting pain relief for headaches, fever, and mild pain.',
    dosage: '1-2 tablets every 4-6 hours. Max 8 tablets in 24 hours.',
  },
  {
    id: 'med-002',
    facilityId: 'facility-001',
    name: 'Ibuprofen 400mg',
    genericName: 'Ibuprofen',
    brand: 'Brufen',
    category: 'pain-relief',
    price: 5000,
    unit: 'strip of 10 tablets',
    inStock: true,
    stockCount: 80,
    requiresPrescription: false,
    rating: 4.7,
    reviews: 189,
    description: 'Anti-inflammatory pain relief for muscle aches.',
    dosage: '1 tablet every 6-8 hours with food.',
  },
  {
    id: 'med-003',
    facilityId: 'facility-001',
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin',
    brand: 'Amoxil',
    category: 'pain-relief',
    price: 12000,
    unit: 'capsule',
    inStock: true,
    stockCount: 45,
    requiresPrescription: true, // Indicates it's a prescription drug
    rating: 4.6,
    reviews: 156,
    description: 'Antibiotic for bacterial infections.',
    dosage: '1 capsule 3 times daily.',
  },
  {
    id: 'med-004',
    facilityId: 'facility-001',
    name: 'Vitamin C 1000mg',
    genericName: 'Ascorbic Acid',
    brand: 'Redoxon',
    category: 'vitamins',
    price: 12000,
    originalPrice: 15000,
    unit: 'tube of 10 effervescent tablets',
    inStock: true,
    stockCount: 200,
    requiresPrescription: false,
    rating: 4.9,
    reviews: 412,
    description: 'Immune system support and antioxidant protection.',
    dosage: '1 tablet dissolved in water daily.',
  },
  {
    id: 'med-005',
    facilityId: 'facility-001',
    name: 'ORS Sachets',
    genericName: 'Oral Rehydration Salts',
    brand: 'WHO Formula',
    category: 'digestive',
    price: 2000,
    unit: 'pack of 4 sachets',
    inStock: true,
    stockCount: 300,
    requiresPrescription: false,
    rating: 4.9,
    reviews: 456,
    description: 'Rehydration therapy for diarrhea and dehydration.',
    dosage: 'Dissolve 1 sachet in 200ml clean water.',
  },
  // MediPlus Pharmacy inventory
  {
    id: 'med-006',
    facilityId: 'facility-002',
    name: 'Paracetamol 500mg',
    genericName: 'Acetaminophen',
    brand: 'Panadol',
    category: 'pain-relief',
    price: 3200,
    unit: 'strip of 10 tablets',
    inStock: true,
    stockCount: 200,
    requiresPrescription: false,
    rating: 4.8,
    reviews: 180,
    description: 'Pain and fever relief.',
    dosage: '1-2 tablets every 4-6 hours.',
  },
  {
    id: 'med-007',
    facilityId: 'facility-002',
    name: 'Multivitamin Complete',
    genericName: 'Multivitamin',
    brand: 'Centrum',
    category: 'vitamins',
    price: 45000,
    unit: 'bottle of 30 tablets',
    inStock: true,
    stockCount: 60,
    requiresPrescription: false,
    rating: 4.8,
    reviews: 289,
    description: 'Complete daily nutrition.',
    dosage: '1 tablet daily with breakfast.',
  },
  {
    id: 'med-008',
    facilityId: 'facility-002',
    name: 'Omeprazole 20mg',
    genericName: 'Omeprazole',
    brand: 'Prilosec',
    category: 'digestive',
    price: 15000,
    unit: 'strip of 14 capsules',
    inStock: true,
    stockCount: 85,
    requiresPrescription: true,
    rating: 4.7,
    reviews: 198,
    description: 'Acid reducer for heartburn.',
    dosage: '1 capsule daily before breakfast.',
  },
  // Kampala City Pharmacy inventory
  {
    id: 'med-009',
    facilityId: 'facility-003',
    name: 'Diclofenac 50mg',
    genericName: 'Diclofenac Sodium',
    brand: 'Voltaren',
    category: 'pain-relief',
    price: 8000,
    unit: 'strip of 10 tablets',
    inStock: true,
    stockCount: 45,
    requiresPrescription: true,
    rating: 4.6,
    reviews: 120,
    description: 'Anti-inflammatory for joint pain.',
    dosage: '1 tablet twice daily after meals.',
  },
  {
    id: 'med-010',
    facilityId: 'facility-003',
    name: 'Cough Syrup',
    genericName: 'Dextromethorphan',
    brand: 'Benylin',
    category: 'respiratory',
    price: 12000,
    unit: '100ml bottle',
    inStock: true,
    stockCount: 65,
    requiresPrescription: false,
    rating: 4.6,
    reviews: 145,
    description: 'Dry cough relief.',
    dosage: '10ml every 4-6 hours.',
  },
];

const MEDICINE_CATEGORIES: { id: MedicineCategory; name: string; icon: React.ElementType; description: string }[] = [
  { id: 'pain-relief', name: 'Pain Relief', icon: Activity, description: 'Painkillers & Anti-inflammatory' },
  { id: 'vitamins', name: 'Vitamins', icon: Heart, description: 'Supplements & Minerals' },
  { id: 'first-aid', name: 'First Aid', icon: Bandage, description: 'Bandages & Antiseptics' },
  { id: 'digestive', name: 'Digestive', icon: Pill, description: 'Stomach & Digestion' },
  { id: 'respiratory', name: 'Respiratory', icon: Stethoscope, description: 'Cough & Cold' },
  { id: 'baby-care', name: 'Baby Care', icon: Baby, description: 'Infant & Child Health' },
  { id: 'eye-care', name: 'Eye Care', icon: Eye, description: 'Eye Drops & Vision' },
];

// ============================================
// Main Component
// ============================================

interface HealthScreenProps {
  onBack: () => void;
}

export function HealthScreen({ onBack }: HealthScreenProps) {
  const serviceColors = getServiceColors('health');
  
  // State
  const [step, setStep] = useState<HealthFlowStep>('facilities');
  const [selectedFacility, setSelectedFacility] = useState<HealthFacility | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MedicineCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showMedicineDetail, setShowMedicineDetail] = useState<Medicine | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('Nakasero, Kampala');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'WALLET'>('MOBILE_MONEY');
  const [loading, setLoading] = useState(false);
  const [askPrescription, setAskPrescription] = useState(false); // Optional prescription ask

  // Get facility's inventory (connection to health provider's data)
  const facilityMedicines = useMemo(() => {
    if (!selectedFacility) return [];
    
    let medicines = FACILITY_INVENTORY.filter(m => m.facilityId === selectedFacility.id);
    
    if (selectedCategory !== 'all') {
      medicines = medicines.filter(m => m.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      medicines = medicines.filter(
        m => m.name.toLowerCase().includes(query) ||
             m.genericName.toLowerCase().includes(query) ||
             m.brand.toLowerCase().includes(query)
      );
    }
    
    return medicines;
  }, [selectedFacility, selectedCategory, searchQuery]);

  // Cart calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const hasPrescriptionItems = useMemo(() => {
    return cart.some(item => item.requiresPrescription);
  }, [cart]);

  const deliveryFee = selectedFacility?.deliveryFee || 3000;
  const serviceFee = Math.round(cartTotal * 0.02);
  const orderTotal = cartTotal + deliveryFee + serviceFee;

  // Cart actions
  const addToCart = useCallback((medicine: Medicine) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === medicine.id);
      if (existing) {
        return prev.map(item =>
          item.id === medicine.id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stockCount) }
            : item
        );
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((medicineId: string) => {
    setCart(prev => prev.filter(item => item.id !== medicineId));
  }, []);

  const updateQuantity = useCallback((medicineId: string, delta: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === medicineId) {
          const newQty = Math.max(0, Math.min(item.quantity + delta, item.stockCount));
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  }, []);

  // Prescription upload
  const handlePrescriptionUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newPrescription: Prescription = {
        id: `rx-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date(),
        status: 'pending',
      };
      setPrescriptions(prev => [...prev, newPrescription]);
      
      // Simulate verification
      setTimeout(() => {
        setPrescriptions(prev =>
          prev.map(p => p.id === newPrescription.id ? { ...p, status: 'verified' } : p)
        );
      }, 2000);
    }
  }, []);

  const removePrescription = useCallback((id: string) => {
    setPrescriptions(prev => prev.filter(p => p.id !== id));
  }, []);

  // Checkout
  const handleCheckout = useCallback(async () => {
    setLoading(true);
    
    // Simulate order creation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const order: Order = {
      id: `order-${Date.now()}`,
      orderNumber: `RX${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      items: cart,
      total: orderTotal,
      status: 'pending',
      createdAt: new Date(),
      estimatedDelivery: '30-45 min',
      deliveryAddress,
      facility: {
        name: selectedFacility?.name || 'Health Facility',
        phone: selectedFacility?.phone || '',
        type: selectedFacility?.type || 'pharmacy',
      },
      hasPrescriptionItems,
      prescriptionRequired: askPrescription,
    };
    
    setCurrentOrder(order);
    setStep('tracking');
    setLoading(false);
  }, [cart, orderTotal, deliveryAddress, selectedFacility, hasPrescriptionItems, askPrescription]);

  // ============================================
  // Render: Facility Selection
  // ============================================

  if (step === 'facilities') {
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-24">
        {/* Header */}
        <div 
          className="px-4 py-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, ${serviceColors.primary}10)` }}
        >
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Smart Health</h1>
            <p className="text-white/60 text-sm">Select a health facility</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pharmacies..."
              className="w-full h-12 pl-10 pr-4 bg-[#1A1A24] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#F43F5E]/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Facility Type Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {FACILITY_TYPES.map((type) => (
              <button
                key={type.id}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:border-[#F43F5E]/30 transition-all whitespace-nowrap"
              >
                <type.icon className="h-4 w-4" />
                <span className="text-sm">{type.name}</span>
              </button>
            ))}
          </div>

          {/* Facilities List */}
          <div className="space-y-3">
            {MOCK_FACILITIES.filter(f => 
              f.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((facility) => (
              <Card 
                key={facility.id}
                className={cn(
                  "p-4 bg-[#1A1A24]/80 border-white/5 cursor-pointer transition-all hover:border-[#F43F5E]/30",
                  !facility.isOpen && "opacity-50"
                )}
                onClick={() => {
                  if (facility.isOpen) {
                    setSelectedFacility(facility);
                    setStep('browse');
                    setSearchQuery('');
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Facility Logo */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                    <img 
                      src={facility.logo}
                      alt={facility.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Rx';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{facility.name}</h3>
                      {facility.verified && (
                        <BadgeCheck className="h-4 w-4 text-[#00FF88] flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm text-white/70">{facility.rating}</span>
                      <span className="text-white/30">•</span>
                      <Navigation className="h-3 w-3 text-white/40" />
                      <span className="text-sm text-white/50">{facility.distance}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-white/40" />
                      <span className="text-xs text-white/50">{facility.deliveryTime}</span>
                      <span className="text-white/30">•</span>
                      <span className="text-xs text-[#F43F5E]">UGX {facility.deliveryFee.toLocaleString()} delivery</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {!facility.isOpen ? (
                      <span className="text-xs bg-white/10 text-white/50 px-2 py-1 rounded-full">Closed</span>
                    ) : (
                      <ChevronRight className="h-5 w-5 text-white/30" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Browse Medicines
  // ============================================

  if (step === 'browse' && selectedFacility) {
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-32">
        {/* Header */}
        <div 
          className="px-4 py-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, ${serviceColors.primary}10)` }}
        >
          <button onClick={() => setStep('facilities')} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{selectedFacility.name}</h1>
              {selectedFacility.verified && (
                <BadgeCheck className="h-4 w-4 text-[#00FF88]" />
              )}
            </div>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Clock className="h-3 w-3" />
              <span>{selectedFacility.deliveryTime}</span>
              <span className="text-white/30">•</span>
              <span>UGX {selectedFacility.deliveryFee.toLocaleString()} delivery</span>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicines..."
              className="w-full h-12 pl-10 pr-4 bg-[#1A1A24] rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:border-[#F43F5E]/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                selectedCategory === 'all'
                  ? "bg-[#F43F5E] text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              )}
            >
              All
            </button>
            {MEDICINE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
                    selectedCategory === cat.id
                      ? "bg-[#F43F5E] text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Medicines Grid */}
          <div className="grid grid-cols-2 gap-3">
            {facilityMedicines.map((medicine) => {
              const cartItem = cart.find(c => c.id === medicine.id);
              const quantity = cartItem?.quantity || 0;
              
              return (
                <Card 
                  key={medicine.id} 
                  className="p-3 bg-[#1A1A24]/80 border-white/5 hover:border-white/10 transition-all cursor-pointer"
                  onClick={() => setShowMedicineDetail(medicine)}
                >
                  {/* Medicine Image Placeholder */}
                  <div 
                    className="w-full h-20 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${serviceColors.primary}10` }}
                  >
                    <Pill className="h-8 w-8" style={{ color: serviceColors.primary }} />
                  </div>
                  
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-medium text-white text-sm line-clamp-2">{medicine.name}</h3>
                    {medicine.requiresPrescription && (
                      <FileText className="h-4 w-4 text-[#F59E0B] flex-shrink-0" />
                    )}
                  </div>
                  
                  <p className="text-xs text-white/40 mt-0.5">{medicine.unit}</p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="font-bold" style={{ color: serviceColors.primary }}>
                        UGX {medicine.price.toLocaleString()}
                      </p>
                      {medicine.originalPrice && (
                        <p className="text-xs text-white/40 line-through">
                          UGX {medicine.originalPrice.toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    {quantity > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(medicine.id, -1);
                          }}
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-white text-sm font-medium">{quantity}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(medicine);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: `${serviceColors.primary}30` }}
                        >
                          <Plus className="h-3 w-3" style={{ color: serviceColors.primary }} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(medicine);
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ 
                          backgroundColor: serviceColors.primary,
                          boxShadow: `0 0 15px ${serviceColors.glow}`
                        }}
                      >
                        <Plus className="h-4 w-4 text-white" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {facilityMedicines.length === 0 && (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/50">No medicines found</p>
              <p className="text-white/30 text-sm mt-1">Try a different search or category</p>
            </div>
          )}
        </div>

        {/* Cart Button - Mobile-friendly width */}
        {cartItemCount > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
            <button
              onClick={() => setStep('cart')}
              className="w-full h-12 rounded-xl flex items-center justify-between px-4 font-semibold transition-all"
              style={{ 
                background: `linear-gradient(135deg, ${serviceColors.primary}, #E11D48)`,
                boxShadow: `0 0 20px ${serviceColors.glow}`
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <span className="text-white text-sm">{cartItemCount} items</span>
              </div>
              <span className="text-white text-sm">UGX {cartTotal.toLocaleString()}</span>
            </button>
          </div>
        )}

        {/* Medicine Detail Modal */}
        <Dialog open={!!showMedicineDetail} onOpenChange={() => setShowMedicineDetail(null)}>
          <DialogContent className="max-w-sm bg-[#1A1A24] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">{showMedicineDetail?.name}</DialogTitle>
            </DialogHeader>
            {showMedicineDetail && (
              <div className="space-y-4 pt-4">
                <div 
                  className="w-full h-32 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${serviceColors.primary}10` }}
                >
                  <Pill className="h-12 w-12" style={{ color: serviceColors.primary }} />
                </div>
                
                <div>
                  <p className="text-white/50 text-sm">{showMedicineDetail.genericName}</p>
                  <p className="text-white text-lg font-bold mt-1">
                    UGX {showMedicineDetail.price.toLocaleString()}
                  </p>
                  <p className="text-white/40 text-xs">{showMedicineDetail.unit}</p>
                </div>
                
                <p className="text-white/70 text-sm">{showMedicineDetail.description}</p>
                
                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-xs text-white/50 mb-1">Dosage</p>
                  <p className="text-sm text-white">{showMedicineDetail.dosage}</p>
                </div>
                
                {showMedicineDetail.requiresPrescription && (
                  <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#F59E0B]" />
                      <p className="text-[#F59E0B] text-sm font-medium">
                        Prescription Recommended
                      </p>
                    </div>
                    <p className="text-white/50 text-xs mt-1">
                      This medicine is best used with a prescription. You can still proceed without one.
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={() => {
                    addToCart(showMedicineDetail);
                    setShowMedicineDetail(null);
                  }}
                  className="w-full h-12 font-semibold"
                  style={{ backgroundColor: serviceColors.primary, color: '#0D0D12' }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============================================
  // Render: Cart
  // ============================================

  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-32">
        {/* Header */}
        <div 
          className="px-4 py-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, ${serviceColors.primary}10)` }}
        >
          <button onClick={() => setStep('browse')} className="text-white/80 hover:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Your Cart</h1>
            <p className="text-white/60 text-sm">{cart.length} items from {selectedFacility?.name}</p>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-red-400 text-sm font-medium">
              Clear
            </button>
          )}
        </div>

        <div className="px-4 pt-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto text-white/20 mb-4" />
              <p className="text-white/50 text-lg">Your cart is empty</p>
              <Button 
                onClick={() => setStep('browse')}
                className="mt-4 text-[#0D0D12]"
                style={{ backgroundColor: serviceColors.primary }}
              >
                Browse Medicines
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <Card key={item.id} className="p-4 bg-[#1A1A24]/80 border-white/5">
                  <div className="flex gap-3">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${serviceColors.primary}10` }}
                    >
                      <Pill className="h-7 w-7" style={{ color: serviceColors.primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white truncate">{item.name}</p>
                          <p className="text-xs text-white/50">{item.unit}</p>
                          {item.requiresPrescription && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] mt-1 inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Rx Recommended
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)} 
                          className="text-white/40 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-bold" style={{ color: serviceColors.primary }}>
                          UGX {item.price.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-white font-medium">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${serviceColors.primary}30` }}
                          >
                            <Plus className="h-3 w-3" style={{ color: serviceColors.primary }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Continue Button */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12]/90 backdrop-blur-xl border-t border-white/5">
            {/* Prescription Ask - Optional */}
            {hasPrescriptionItems && !askPrescription && prescriptions.length === 0 && (
              <Card className="p-3 mb-3 bg-[#F59E0B]/10 border-[#F59E0B]/20 border">
                <p className="text-sm text-white mb-2">
                  Some items in your cart are prescription recommended. Would you like to upload a prescription?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAskPrescription(false)}
                    className="flex-1 border-white/10 text-white/70"
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowPrescriptionModal(true)}
                    className="flex-1 bg-[#F59E0B] text-[#0D0D12]"
                  >
                    Upload Rx
                  </Button>
                </div>
              </Card>
            )}
            
            <Button 
              onClick={() => setStep('checkout')}
              className="w-full h-14 text-lg font-semibold rounded-xl"
              style={{ 
                backgroundColor: serviceColors.primary,
                color: '#0D0D12'
              }}
            >
              Continue to Pricing • UGX {cartTotal.toLocaleString()}
            </Button>
          </div>
        )}

        {/* Prescription Upload Modal */}
        {showPrescriptionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
            <div className="w-full max-w-md bg-[#1A1A24] rounded-t-3xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Upload Prescription (Optional)</h3>
                <button onClick={() => setShowPrescriptionModal(false)} className="text-white/60 hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-white/50 text-sm mb-4">
                Upload a prescription for faster processing. You can still order without one.
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-4 p-4 bg-[#252530] rounded-xl cursor-pointer hover:bg-[#303040] transition-colors">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${serviceColors.primary}20` }}>
                    <Camera className="h-6 w-6" style={{ color: serviceColors.primary }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Take Photo</p>
                    <p className="text-sm text-white/50">Use camera to capture prescription</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePrescriptionUpload}
                    className="hidden"
                  />
                </label>
                
                <label className="flex items-center gap-4 p-4 bg-[#252530] rounded-xl cursor-pointer hover:bg-[#303040] transition-colors">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${serviceColors.primary}20` }}>
                    <Upload className="h-6 w-6" style={{ color: serviceColors.primary }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Upload File</p>
                    <p className="text-sm text-white/50">Choose from gallery or files</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handlePrescriptionUpload}
                    className="hidden"
                  />
                </label>
              </div>
              
              {prescriptions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {prescriptions.map(rx => (
                    <div key={rx.id} className="flex items-center justify-between p-3 bg-[#252530] rounded-xl">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="h-5 w-5 text-white/40" />
                        <div>
                          <p className="text-sm text-white truncate max-w-[150px]">{rx.fileName}</p>
                          <p className="text-xs text-white/40">{(rx.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          rx.status === 'verified' ? "bg-[#00FF88]/20 text-[#00FF88]" :
                          rx.status === 'rejected' ? "bg-[#EF4444]/20 text-[#EF4444]" :
                          "bg-yellow-500/20 text-yellow-500"
                        )}>
                          {rx.status === 'verified' ? 'Verified' : rx.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                        <button onClick={() => removePrescription(rx.id)} className="text-white/40 hover:text-red-400">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Button
                onClick={() => {
                  setShowPrescriptionModal(false);
                  setAskPrescription(true);
                }}
                className="w-full h-12 mt-4 font-semibold"
                style={{ backgroundColor: serviceColors.primary, color: '#0D0D12' }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // Render: Checkout
  // ============================================

  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-[#0D0D12] pb-32">
        {/* Header */}
        <div 
          className="px-4 py-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, ${serviceColors.primary}10)` }}
        >
          <button onClick={() => setStep('cart')} className="text-white/80 hover:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Checkout</h1>
            <p className="text-white/60 text-sm">Review your order</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Delivery Address */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <p className="text-sm text-white/50 mb-2">Delivery Address</p>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5" style={{ color: serviceColors.primary }} />
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="flex-1 bg-transparent text-white outline-none"
                placeholder="Enter delivery address"
              />
            </div>
          </Card>

          {/* Facility Info */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                <img 
                  src={selectedFacility?.logo}
                  alt={selectedFacility?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium text-white">{selectedFacility?.name}</p>
                <p className="text-sm text-white/50">{selectedFacility?.address}</p>
              </div>
            </div>
          </Card>

          {/* Prescription Status */}
          {hasPrescriptionItems && (
            <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[#F59E0B]" />
                  <div>
                    <p className="text-sm text-white">Prescription</p>
                    <p className="text-xs text-white/50">
                      {prescriptions.length > 0 
                        ? `${prescriptions.length} uploaded` 
                        : askPrescription 
                          ? 'Skipped (optional)' 
                          : 'Not required'}
                    </p>
                  </div>
                </div>
                {prescriptions.length === 0 && !askPrescription && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPrescriptionModal(true)}
                    className="border-white/10 text-white/70"
                  >
                    Add Rx
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Order Summary */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <p className="text-sm text-white/50 mb-3">Order Summary ({cart.length} items)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white">UGX {cartTotal.toLocaleString()}</span>
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
                <span className="font-medium text-white">Total</span>
                <span className="text-lg font-bold" style={{ color: serviceColors.primary }}>
                  UGX {orderTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <p className="text-sm text-white/50 mb-3">Payment Method</p>
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
                    "p-3 rounded-xl border flex flex-col items-center gap-1 transition-all",
                    paymentMethod === method.id
                      ? "border-[#F43F5E] bg-[#F43F5E]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    paymentMethod === method.id ? "text-[#F43F5E]" : "text-white/60"
                  )}>{method.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Place Order Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0D0D12]/90 backdrop-blur-xl border-t border-white/5">
          <Button 
            onClick={handleCheckout}
            disabled={loading}
            className="w-full h-14 text-lg font-semibold rounded-xl"
            style={{ 
              backgroundColor: serviceColors.primary,
              color: '#0D0D12'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              `Place Order • UGX ${orderTotal.toLocaleString()}`
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Order Tracking
  // ============================================

  if (step === 'tracking' && currentOrder) {
    const statusSteps = [
      { id: 'pending', label: 'Order Placed', icon: Check },
      { id: 'confirmed', label: 'Confirmed', icon: Check },
      { id: 'dispensing', label: 'Dispensing', icon: Pill },
      { id: 'on-the-way', label: 'On the Way', icon: Truck },
      { id: 'delivered', label: 'Delivered', icon: Package },
    ];

    const currentStatusIndex = statusSteps.findIndex(s => s.id === currentOrder.status);

    return (
      <div className="min-h-screen bg-[#0D0D12] pb-24">
        {/* Header */}
        <div 
          className="px-4 py-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${serviceColors.primary}20, ${serviceColors.primary}10)` }}
        >
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Order Tracking</h1>
            <p className="text-white/60 text-sm font-mono">{currentOrder.orderNumber}</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Status Progress */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center justify-between mb-4">
              {statusSteps.map((status, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const Icon = status.icon;
                
                return (
                  <div key={status.id} className="flex flex-col items-center flex-1">
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isCompleted ? "text-white" : "bg-[#252530] text-white/30"
                      )}
                      style={isCompleted ? { 
                        backgroundColor: serviceColors.primary,
                        boxShadow: isCurrent ? `0 0 20px ${serviceColors.glow}` : 'none'
                      } : {}}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "text-xs mt-1 text-center",
                      isCurrent ? "text-white font-medium" : "text-white/50"
                    )}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Estimated Delivery */}
          <Card 
            className="p-6 border-2 bg-[#1A1A24]/80 text-center"
            style={{ borderColor: `${serviceColors.primary}40` }}
          >
            <Clock className="h-8 w-8 mx-auto mb-2" style={{ color: serviceColors.primary }} />
            <p className="text-white/50 text-sm">Estimated Delivery</p>
            <p className="text-2xl font-bold text-white">{currentOrder.estimatedDelivery}</p>
          </Card>

          {/* Facility Info */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${serviceColors.primary}20` }}
              >
                <Pill className="h-6 w-6" style={{ color: serviceColors.primary }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{currentOrder.facility.name}</p>
                <p className="text-sm text-white/50">Preparing your order</p>
              </div>
              <button 
                className="p-2 rounded-full"
                style={{ backgroundColor: `${serviceColors.primary}20` }}
              >
                <Phone className="h-5 w-5" style={{ color: serviceColors.primary }} />
              </button>
            </div>
          </Card>

          {/* Delivery Address */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 mt-0.5" style={{ color: serviceColors.primary }} />
              <div>
                <p className="text-sm text-white/50">Delivery Address</p>
                <p className="text-white">{currentOrder.deliveryAddress}</p>
              </div>
            </div>
          </Card>

          {/* Order Items */}
          <Card className="p-4 bg-[#1A1A24]/80 border-white/5">
            <p className="text-sm text-white/50 mb-3">Order Items ({currentOrder.items.length})</p>
            <div className="space-y-2">
              {currentOrder.items.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{item.name}</span>
                    <span className="text-white/40">x{item.quantity}</span>
                  </div>
                  <span className="text-white">UGX {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
              <span className="font-medium text-white">Total</span>
              <span className="font-bold" style={{ color: serviceColors.primary }}>
                UGX {currentOrder.total.toLocaleString()}
              </span>
            </div>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-white"
              style={{ backgroundColor: `${serviceColors.primary}20`, color: serviceColors.primary }}
            >
              <Phone className="h-5 w-5" />
              Call
            </button>
            <button className="bg-[#3B82F6] text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message
            </button>
          </div>

          {currentOrder.status === 'delivered' && (
            <Button 
              onClick={onBack}
              className="w-full h-12 text-lg font-semibold rounded-xl text-[#0D0D12]"
              style={{ backgroundColor: serviceColors.primary }}
            >
              Order Complete - Back to Home
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

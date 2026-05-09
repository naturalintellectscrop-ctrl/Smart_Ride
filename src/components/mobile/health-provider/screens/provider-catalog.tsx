'use client';

import { useState } from 'react';
import { MobileHeader, MobileCard } from '../../shared/mobile-components';
import {
  Pill,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  DollarSign,
  Barcode,
  MoreVertical,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderCatalogScreenProps {
  providerId: string | null;
}

export function ProviderCatalogScreen({ providerId }: ProviderCatalogScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: 'PAINKILLERS', label: 'Pain Relief' },
    { id: 'ANTIBIOTICS', label: 'Antibiotics' },
    { id: 'VITAMINS', label: 'Vitamins' },
    { id: 'COLD_FLU', label: 'Cold & Flu' },
    { id: 'DIGESTIVE', label: 'Digestive' },
  ];

  const medicines = [
    {
      id: '1',
      name: 'Paracetamol 500mg',
      genericName: 'Acetaminophen',
      category: 'PAINKILLERS',
      price: 5000,
      stock: 150,
      lowStock: false,
      requiresPrescription: false,
      isAvailable: true,
    },
    {
      id: '2',
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      category: 'ANTIBIOTICS',
      price: 12000,
      stock: 8,
      lowStock: true,
      requiresPrescription: true,
      isAvailable: true,
    },
    {
      id: '3',
      name: 'Vitamin C 1000mg',
      genericName: 'Ascorbic Acid',
      category: 'VITAMINS',
      price: 15000,
      stock: 80,
      lowStock: false,
      requiresPrescription: false,
      isAvailable: true,
    },
    {
      id: '4',
      name: 'Cold & Flu Relief',
      genericName: 'Multi-symptom',
      category: 'COLD_FLU',
      price: 12000,
      stock: 45,
      lowStock: false,
      requiresPrescription: false,
      isAvailable: true,
    },
    {
      id: '5',
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole',
      category: 'DIGESTIVE',
      price: 18000,
      stock: 0,
      lowStock: true,
      requiresPrescription: false,
      isAvailable: false,
    },
  ];

  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         med.genericName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || med.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = medicines.filter(m => m.lowStock).length;
  const outOfStockCount = medicines.filter(m => m.stock === 0).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <MobileHeader title="Medicine Catalog">
        <button className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
          <Plus className="h-5 w-5 text-white" />
        </button>
      </MobileHeader>

      <div className="px-4 pt-4">
        {/* Alerts */}
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Stock Alerts</span>
            </div>
            <div className="flex gap-3">
              {lowStockCount > 0 && (
                <span className="text-sm text-amber-700">{lowStockCount} low stock</span>
              )}
              {outOfStockCount > 0 && (
                <span className="text-sm text-red-600">{outOfStockCount} out of stock</span>
              )}
            </div>
          </div>
        )}

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
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{medicines.length}</p>
            <p className="text-xs text-gray-500">Total Items</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{medicines.filter(m => m.isAvailable).length}</p>
            <p className="text-xs text-gray-500">Available</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{medicines.filter(m => m.requiresPrescription).length}</p>
            <p className="text-xs text-gray-500">Rx Required</p>
          </div>
        </div>

        {/* Medicine List */}
        <div className="space-y-3">
          {filteredMedicines.map((medicine) => (
            <MobileCard key={medicine.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{medicine.name}</h3>
                    {medicine.requiresPrescription && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Rx
                      </span>
                    )}
                  </div>
                  {medicine.genericName && (
                    <p className="text-sm text-gray-500">{medicine.genericName}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="font-bold text-emerald-600">UGX {medicine.price.toLocaleString()}</span>
                    <span className={cn(
                      'text-sm',
                      medicine.stock === 0 ? 'text-red-600' :
                      medicine.lowStock ? 'text-amber-600' : 'text-gray-500'
                    )}>
                      Stock: {medicine.stock}
                    </span>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {!medicine.isAvailable && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                    Unavailable
                  </span>
                </div>
              )}
            </MobileCard>
          ))}
        </div>

        {filteredMedicines.length === 0 && (
          <div className="text-center py-12">
            <Pill className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No medicines found</p>
          </div>
        )}
      </div>

      {/* Add Medicine FAB */}
      <button className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

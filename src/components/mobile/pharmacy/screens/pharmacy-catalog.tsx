'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import {
  Pill,
  Search,
  Plus,
  Edit,
  ToggleLeft,
  ToggleRight,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  DollarSign
} from 'lucide-react';

type CategoryFilter = 'all' | 'painkillers' | 'antibiotics' | 'vitamins' | 'cold_flu' | 'other';

export function PharmacyCatalog() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const medicines = [
    {
      id: '1',
      name: 'Paracetamol 500mg',
      genericName: 'Acetaminophen',
      category: 'painkillers',
      price: 5000,
      stock: 150,
      requiresPrescription: false,
      isAvailable: true,
      storageCondition: 'Store at room temperature',
    },
    {
      id: '2',
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      category: 'painkillers',
      price: 8000,
      stock: 80,
      requiresPrescription: false,
      isAvailable: true,
      storageCondition: 'Store in cool dry place',
    },
    {
      id: '3',
      name: 'Amoxicillin 250mg',
      genericName: 'Amoxicillin',
      category: 'antibiotics',
      price: 15000,
      stock: 45,
      requiresPrescription: true,
      isAvailable: true,
      storageCondition: 'Store in refrigerator',
    },
    {
      id: '4',
      name: 'Vitamin C 1000mg',
      genericName: 'Ascorbic Acid',
      category: 'vitamins',
      price: 15000,
      stock: 200,
      requiresPrescription: false,
      isAvailable: true,
      storageCondition: 'Store at room temperature',
    },
    {
      id: '5',
      name: 'Cold & Flu Relief',
      genericName: 'Multi-symptom relief',
      category: 'cold_flu',
      price: 12000,
      stock: 5,
      requiresPrescription: false,
      isAvailable: true,
      storageCondition: 'Store in cool dry place',
    },
    {
      id: '6',
      name: 'Ciprofloxacin 500mg',
      genericName: 'Ciprofloxacin',
      category: 'antibiotics',
      price: 25000,
      stock: 0,
      requiresPrescription: true,
      isAvailable: false,
      storageCondition: 'Store in refrigerator',
    },
  ];

  const categories: { id: CategoryFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: '💊' },
    { id: 'painkillers', label: 'Pain Relief', icon: '💊' },
    { id: 'antibiotics', label: 'Antibiotics', icon: '💉' },
    { id: 'vitamins', label: 'Vitamins', icon: '🍊' },
    { id: 'cold_flu', label: 'Cold & Flu', icon: '🤧' },
    { id: 'other', label: 'Other', icon: '📋' },
  ];

  const filteredMedicines = medicines.filter((med) => {
    const matchesCategory = activeCategory === 'all' || med.category === activeCategory;
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'text-red-600', bg: 'bg-red-50', label: 'Out of Stock' };
    if (stock < 20) return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Low Stock' };
    return { color: 'text-green-600', bg: 'bg-green-50', label: 'In Stock' };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Medicine Catalog</h1>
            <p className="text-sm text-gray-500">Manage your inventory</p>
          </div>
          <button className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center">
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

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
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 ${
                activeCategory === cat.id
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MobileCard className="p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{medicines.length}</p>
            <p className="text-xs text-gray-500">Total Items</p>
          </MobileCard>
          <MobileCard className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {medicines.filter(m => m.stock >= 20).length}
            </p>
            <p className="text-xs text-gray-500">In Stock</p>
          </MobileCard>
          <MobileCard className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {medicines.filter(m => m.stock > 0 && m.stock < 20).length}
            </p>
            <p className="text-xs text-gray-500">Low Stock</p>
          </MobileCard>
        </div>

        {/* Medicines List */}
        <div className="space-y-3">
          {filteredMedicines.map((medicine) => {
            const stockStatus = getStockStatus(medicine.stock);
            return (
              <MobileCard key={medicine.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      medicine.isAvailable ? 'bg-rose-100' : 'bg-gray-100'
                    }`}>
                      <Pill className={`h-6 w-6 ${medicine.isAvailable ? 'text-rose-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{medicine.name}</h3>
                        {medicine.requiresPrescription && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            Rx
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{medicine.genericName}</p>
                    </div>
                  </div>
                  <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Edit className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                {/* Price & Stock */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-bold text-gray-900">UGX {medicine.price.toLocaleString()}</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${stockStatus.bg}`}>
                    <Package className={`h-3 w-3 ${stockStatus.color}`} />
                    <span className={`text-xs font-medium ${stockStatus.color}`}>
                      {medicine.stock} units
                    </span>
                  </div>
                </div>

                {/* Storage Condition */}
                <p className="text-xs text-gray-500 mb-3">{medicine.storageCondition}</p>

                {/* Availability Toggle */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    {medicine.isAvailable ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Available</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">Unavailable</span>
                      </>
                    )}
                  </div>
                  <button className={`w-12 h-6 rounded-full flex items-center ${
                    medicine.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      medicine.isAvailable ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Low Stock Warning */}
                {medicine.stock > 0 && medicine.stock < 20 && (
                  <div className="mt-3 p-2 bg-amber-50 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-amber-700">Low stock - consider restocking</span>
                  </div>
                )}
              </MobileCard>
            );
          })}
        </div>

        {filteredMedicines.length === 0 && (
          <div className="text-center py-12">
            <Pill className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No medicines found</p>
          </div>
        )}
      </div>
    </div>
  );
}

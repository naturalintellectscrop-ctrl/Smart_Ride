'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Pill,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  TrendingDown,
  Package,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { ProductModal } from '../../../shared/product-modal';

type InventoryFilter = 'all' | 'low_stock' | 'out_of_stock' | 'available';

interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  description: string | null;
  category: string;
  price: number;
  stockQuantity: number | null;
  isAvailable: boolean;
  requiresPrescription: boolean;
  manufacturer: string | null;
  storageCondition: string | null;
  imageUrl: string | null;
  createdAt: string;
}

const MEDICINE_CATEGORIES = [
  { id: 'PAINKILLERS', label: 'Painkillers' },
  { id: 'ANTIBIOTICS', label: 'Antibiotics' },
  { id: 'VITAMINS', label: 'Vitamins' },
  { id: 'COLD_FLU', label: 'Cold & Flu' },
  { id: 'DIGESTIVE', label: 'Digestive' },
  { id: 'CARDIOVASCULAR', label: 'Cardiovascular' },
  { id: 'DIABETES', label: 'Diabetes' },
  { id: 'HYGIENE', label: 'Hygiene' },
  { id: 'FIRST_AID', label: 'First Aid' },
  { id: 'MOTHER_BABY', label: 'Mother & Baby' },
  { id: 'OTHER', label: 'Other' },
];

export function PharmacistInventory() {
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>('all');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Fetch medicines from API
  const fetchMedicines = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/health-providers/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMedicines(data.medicines || []);
      } else {
        // No mock data - show empty state
        setMedicines([]);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const filters: { id: InventoryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'available', label: 'In Stock' },
    { id: 'low_stock', label: 'Low Stock' },
    { id: 'out_of_stock', label: 'Out of Stock' },
  ];

  const getStockStatus = (medicine: Medicine) => {
    const stock = medicine.stockQuantity ?? 0;
    if (stock === 0) return { status: 'out_of_stock', label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    if (stock < 50) return { status: 'low_stock', label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' };
    return { status: 'available', label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  const filteredMedicines = medicines.filter(m => {
    // Filter by search
    const matchesSearch = searchQuery === '' || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.genericName?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by stock status
    if (activeFilter === 'all') return matchesSearch;
    const stockStatus = getStockStatus(m);
    return matchesSearch && stockStatus.status === activeFilter;
  });

  const lowStockCount = medicines.filter(m => {
    const stock = m.stockQuantity ?? 0;
    return stock > 0 && stock < 50;
  }).length;
  const outOfStockCount = medicines.filter(m => (m.stockQuantity ?? 0) === 0).length;

  const handleAddMedicine = () => {
    setSelectedMedicine(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleEditMedicine = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setModalMode('edit');
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDeleteMedicine = async (medicineId: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/health-providers/inventory?medicineId=${medicineId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMedicines(medicines.filter(m => m.id !== medicineId));
      }
    } catch (err) {
      console.error('Error deleting medicine:', err);
    }
    setActiveDropdown(null);
  };

  const handleSaveMedicine = async (data: Record<string, unknown>) => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = '/api/health-providers/inventory';
      const method = modalMode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.medicine) {
        if (modalMode === 'add') {
          setMedicines([result.medicine, ...medicines]);
        } else {
          setMedicines(medicines.map(m => 
            m.id === result.medicine.id ? result.medicine : m
          ));
        }
      }
    } catch (err) {
      console.error('Error saving medicine:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-6 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500">{medicines.length} medicines listed</p>
          </div>
          <button 
            onClick={handleAddMedicine}
            className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center text-white hover:bg-rose-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="px-4 pt-4">
          {outOfStockCount > 0 && (
            <Card className="p-4 bg-red-50 border-red-200 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-800">{outOfStockCount} items out of stock</p>
                  <p className="text-sm text-red-600">Reorder immediately</p>
                </div>
              </div>
            </Card>
          )}
          {lowStockCount > 0 && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800">{lowStockCount} items running low</p>
                  <p className="text-sm text-yellow-600">Consider reordering soon</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeFilter === filter.id
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List */}
      <div className="px-4 mt-4 pb-6">
        <div className="space-y-3">
          {filteredMedicines.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No medicines found</p>
              <Button
                onClick={handleAddMedicine}
                className="mt-4 bg-rose-600 hover:bg-rose-700"
              >
                Add Your First Medicine
              </Button>
            </div>
          ) : (
            filteredMedicines.map((medicine) => {
              const stockStatus = getStockStatus(medicine);
              return (
                <Card key={medicine.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      stockStatus.status === 'available' 
                        ? "bg-green-100" 
                        : stockStatus.status === 'low_stock' 
                          ? "bg-yellow-100" 
                          : "bg-red-100"
                    )}>
                      <Pill className={cn(
                        "h-6 w-6",
                        stockStatus.status === 'available' 
                          ? "text-green-600" 
                          : stockStatus.status === 'low_stock' 
                            ? "text-yellow-600" 
                            : "text-red-600"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{medicine.name}</h3>
                          {medicine.genericName && (
                            <p className="text-xs text-gray-400">{medicine.genericName}</p>
                          )}
                          <p className="text-sm text-gray-500">{medicine.description}</p>
                        </div>
                        <div className="relative">
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === medicine.id ? null : medicine.id)}
                            className="text-gray-400 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          
                          {activeDropdown === medicine.id && (
                            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                              <button
                                onClick={() => handleEditMedicine(medicine)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMedicine(medicine.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={cn("text-xs", stockStatus.color)}>
                          {stockStatus.label}
                        </Badge>
                        {medicine.requiresPrescription && (
                          <Badge className="text-xs bg-purple-100 text-purple-700">
                            Rx Required
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Stock</p>
                            <p className={cn(
                              "font-medium",
                              (medicine.stockQuantity ?? 0) === 0 ? "text-red-600" : 
                              (medicine.stockQuantity ?? 0) < 50 ? "text-yellow-600" : "text-gray-900"
                            )}>
                              {medicine.stockQuantity ?? 0} units
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Price</p>
                            <p className="font-medium text-gray-900">UGX {medicine.price.toLocaleString()}</p>
                          </div>
                          {medicine.manufacturer && (
                            <div className="hidden sm:block">
                              <p className="text-gray-500">Mfr</p>
                              <p className="font-medium text-gray-900 text-xs">{medicine.manufacturer}</p>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleEditMedicine(medicine)}
                          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <Edit className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMedicine}
        product={selectedMedicine ? {
          id: selectedMedicine.id,
          name: selectedMedicine.name,
          description: selectedMedicine.description,
          price: selectedMedicine.price,
          category: selectedMedicine.category,
          imageUrl: selectedMedicine.imageUrl,
          isAvailable: selectedMedicine.isAvailable,
          requiresPrescription: selectedMedicine.requiresPrescription,
          genericName: selectedMedicine.genericName,
          manufacturer: selectedMedicine.manufacturer,
          storageCondition: selectedMedicine.storageCondition,
          stockQuantity: selectedMedicine.stockQuantity ?? undefined,
        } : null}
        mode={modalMode}
        type="health-provider"
        categories={MEDICINE_CATEGORIES}
      />
    </div>
  );
}

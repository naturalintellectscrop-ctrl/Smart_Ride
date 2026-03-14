'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Pill,
  Search,
  Plus,
  Edit,
  AlertCircle,
  TrendingDown,
  Package
} from 'lucide-react';

type InventoryFilter = 'all' | 'low_stock' | 'out_of_stock' | 'available';

export function PharmacistInventory() {
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>('all');

  const medicines = [
    {
      id: 'MED-001',
      name: 'Paracetamol 500mg',
      category: 'Pain Relief',
      stock: 150,
      minStock: 50,
      price: 15000,
      expiry: '2025-06',
      status: 'available',
    },
    {
      id: 'MED-002',
      name: 'Amoxicillin 250mg',
      category: 'Antibiotics',
      stock: 25,
      minStock: 50,
      price: 45000,
      expiry: '2025-03',
      status: 'low_stock',
    },
    {
      id: 'MED-003',
      name: 'Ibuprofen 400mg',
      category: 'Pain Relief',
      stock: 0,
      minStock: 30,
      price: 20000,
      expiry: '2025-08',
      status: 'out_of_stock',
    },
    {
      id: 'MED-004',
      name: 'ORS Sachets',
      category: 'Rehydration',
      stock: 200,
      minStock: 100,
      price: 5000,
      expiry: '2025-12',
      status: 'available',
    },
    {
      id: 'MED-005',
      name: 'Vitamin C 1000mg',
      category: 'Vitamins',
      stock: 45,
      minStock: 50,
      price: 25000,
      expiry: '2025-09',
      status: 'low_stock',
    },
    {
      id: 'MED-006',
      name: 'Ciprofloxacin 500mg',
      category: 'Antibiotics',
      stock: 80,
      minStock: 40,
      price: 35000,
      expiry: '2025-07',
      status: 'available',
    },
  ];

  const filters: { id: InventoryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'available', label: 'In Stock' },
    { id: 'low_stock', label: 'Low Stock' },
    { id: 'out_of_stock', label: 'Out of Stock' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-700';
      case 'out_of_stock':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'In Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return status;
    }
  };

  const filteredMedicines = activeFilter === 'all'
    ? medicines
    : medicines.filter(m => m.status === activeFilter);

  const lowStockCount = medicines.filter(m => m.status === 'low_stock').length;
  const outOfStockCount = medicines.filter(m => m.status === 'out_of_stock').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-6 z-40">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <button className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center text-white">
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
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeFilter === filter.id
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
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
          {filteredMedicines.map((medicine) => (
            <Card key={medicine.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  medicine.status === 'available' 
                    ? "bg-green-100" 
                    : medicine.status === 'low_stock' 
                      ? "bg-yellow-100" 
                      : "bg-red-100"
                )}>
                  <Pill className={cn(
                    "h-6 w-6",
                    medicine.status === 'available' 
                      ? "text-green-600" 
                      : medicine.status === 'low_stock' 
                        ? "text-yellow-600" 
                        : "text-red-600"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{medicine.name}</p>
                      <p className="text-sm text-gray-500">{medicine.category}</p>
                    </div>
                    <Badge className={cn("text-xs", getStatusColor(medicine.status))}>
                      {getStatusLabel(medicine.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Stock</p>
                        <p className={cn(
                          "font-medium",
                          medicine.stock === 0 ? "text-red-600" : 
                          medicine.stock < medicine.minStock ? "text-yellow-600" : "text-gray-900"
                        )}>
                          {medicine.stock} units
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Price</p>
                        <p className="font-medium text-gray-900">UGX {medicine.price.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Expiry</p>
                        <p className="font-medium text-gray-900">{medicine.expiry}</p>
                      </div>
                    </div>
                    <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <Edit className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

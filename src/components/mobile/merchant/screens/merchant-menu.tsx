'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  UtensilsCrossed,
  DollarSign,
  Clock,
  MoreVertical
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  preparationTime: string;
}

export function MerchantMenu() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'pizza', label: 'Pizza' },
    { id: 'main', label: 'Main Course' },
    { id: 'salads', label: 'Salads' },
    { id: 'drinks', label: 'Drinks' },
  ];

  const menuItems: MenuItem[] = [
    {
      id: '1',
      name: 'Margherita Pizza',
      description: 'Classic tomato sauce, mozzarella, and fresh basil',
      price: 35000,
      category: 'pizza',
      available: true,
      preparationTime: '15-20 min',
    },
    {
      id: '2',
      name: 'Pepperoni Pizza',
      description: 'Pepperoni with mozzarella cheese on tomato sauce',
      price: 42000,
      category: 'pizza',
      available: true,
      preparationTime: '15-20 min',
    },
    {
      id: '3',
      name: 'Chicken Wings',
      description: 'Crispy wings with your choice of sauce',
      price: 25000,
      category: 'main',
      available: true,
      preparationTime: '10-15 min',
    },
    {
      id: '4',
      name: 'Fish & Chips',
      description: 'Battered fish with golden french fries',
      price: 38000,
      category: 'main',
      available: false,
      preparationTime: '20-25 min',
    },
    {
      id: '5',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with caesar dressing',
      price: 18000,
      category: 'salads',
      available: true,
      preparationTime: '5-10 min',
    },
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const availableCount = menuItems.filter((item) => item.available).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Menu</h1>
            <p className="text-sm text-gray-500">{availableCount} of {menuItems.length} items available</p>
          </div>
          <button className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
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
            placeholder="Search menu items..."
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
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <MobileCard
              key={item.id}
              className={`p-4 ${!item.available ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="h-6 w-6 text-gray-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                    </div>
                    <button className="text-gray-400">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-bold text-orange-600">UGX {item.price.toLocaleString()}</span>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{item.preparationTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                    <button className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                      item.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.available ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Available
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Hidden
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>

        {/* Add New Item Button */}
        <button className="mt-6 w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Menu Item
        </button>
      </div>
    </div>
  );
}

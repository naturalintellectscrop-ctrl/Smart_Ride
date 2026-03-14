'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  UtensilsCrossed,
  Pill,
  ShoppingCart,
  DollarSign,
  Clock,
  MoreVertical,
  Package,
  AlertTriangle,
  Tag
} from 'lucide-react';

type BusinessType = 'restaurant' | 'pharmacy' | 'supermarket' | 'retail';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  preparationTime?: string;
  stock?: number;
  unit?: string;
  requiresPrescription?: boolean;
  sku?: string;
  lowStockThreshold?: number;
}

export function MerchantMenu() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [businessType] = useState<BusinessType>('restaurant');
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Margherita Pizza',
      description: 'Classic tomato sauce, mozzarella, and fresh basil',
      price: 35000,
      category: 'pizza',
      available: true,
      preparationTime: '15-20 min',
      stock: 50,
    },
    {
      id: '2',
      name: 'Pepperoni Pizza',
      description: 'Pepperoni with mozzarella cheese on tomato sauce',
      price: 42000,
      category: 'pizza',
      available: true,
      preparationTime: '15-20 min',
      stock: 45,
    },
    {
      id: '3',
      name: 'Chicken Wings',
      description: 'Crispy wings with your choice of sauce',
      price: 25000,
      category: 'main',
      available: true,
      preparationTime: '10-15 min',
      stock: 30,
    },
    {
      id: '4',
      name: 'Fish & Chips',
      description: 'Battered fish with golden french fries',
      price: 38000,
      category: 'main',
      available: false,
      preparationTime: '20-25 min',
      stock: 0,
    },
    {
      id: '5',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with caesar dressing',
      price: 18000,
      category: 'salads',
      available: true,
      preparationTime: '5-10 min',
      stock: 25,
    },
    {
      id: '6',
      name: 'Coca Cola',
      description: 'Classic soft drink - 500ml',
      price: 5000,
      category: 'drinks',
      available: true,
      stock: 100,
    },
    {
      id: '7',
      name: 'Fresh Juice',
      description: 'Mixed fruit juice - freshly squeezed',
      price: 8000,
      category: 'drinks',
      available: true,
      preparationTime: '5 min',
      stock: 20,
    },
  ]);

  const getCategories = () => {
    switch (businessType) {
      case 'restaurant':
        return [
          { id: 'all', label: 'All' },
          { id: 'pizza', label: 'Pizza' },
          { id: 'main', label: 'Main Course' },
          { id: 'salads', label: 'Salads' },
          { id: 'drinks', label: 'Drinks' },
        ];
      case 'pharmacy':
        return [
          { id: 'all', label: 'All' },
          { id: 'prescription', label: 'Prescription' },
          { id: 'otc', label: 'Over-the-Counter' },
          { id: 'supplements', label: 'Supplements' },
          { id: 'first-aid', label: 'First Aid' },
        ];
      case 'supermarket':
        return [
          { id: 'all', label: 'All' },
          { id: 'groceries', label: 'Groceries' },
          { id: 'dairy', label: 'Dairy' },
          { id: 'beverages', label: 'Beverages' },
          { id: 'household', label: 'Household' },
        ];
      default:
        return [{ id: 'all', label: 'All' }];
    }
  };

  const categories = getCategories();

  const filteredItems = products.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const availableCount = products.filter((item) => item.available).length;
  const lowStockCount = products.filter((item) => item.stock && item.stock < 10 && item.stock > 0).length;
  const outOfStockCount = products.filter((item) => !item.stock || item.stock === 0).length;

  const toggleAvailability = (productId: string) => {
    setProducts(products.map(p =>
      p.id === productId ? { ...p, available: !p.available } : p
    ));
  };

  const getStockStatus = (product: Product) => {
    if (!product.stock || product.stock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    }
    if (product.stock < 10) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  const getBusinessIcon = () => {
    switch (businessType) {
      case 'pharmacy':
        return Pill;
      case 'supermarket':
        return ShoppingCart;
      default:
        return UtensilsCrossed;
    }
  };

  const BusinessIcon = getBusinessIcon();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {businessType === 'restaurant' ? 'Menu' : businessType === 'pharmacy' ? 'Medicine Inventory' : 'Products'}
            </h1>
            <p className="text-sm text-gray-500">{availableCount} of {products.length} items available</p>
          </div>
          <button className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center hover:bg-orange-700 transition-colors">
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Stock Alerts */}
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <Card className="p-4 mb-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                {outOfStockCount > 0 && (
                  <p className="text-sm font-medium text-yellow-800">{outOfStockCount} items out of stock</p>
                )}
                {lowStockCount > 0 && (
                  <p className="text-sm text-yellow-700">{lowStockCount} items running low</p>
                )}
              </div>
              <button className="text-yellow-700 text-sm font-medium">View</button>
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-200 mb-4">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-gray-900"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeCategory === cat.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products List */}
        <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
          {filteredItems.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <Card
                key={item.id}
                className={cn("p-4", !item.available && "opacity-60")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BusinessIcon className="h-6 w-6 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                      </div>
                      <button className="text-gray-400 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="font-bold text-orange-600">UGX {item.price.toLocaleString()}</span>
                      {item.preparationTime && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{item.preparationTime}</span>
                        </div>
                      )}
                      {item.stock !== undefined && (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", stockStatus.color)}>
                          {stockStatus.label}: {item.stock}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 hover:bg-gray-200 transition-colors">
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleAvailability(item.id)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors",
                          item.available
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
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
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 hover:bg-gray-200 transition-colors">
                        <Tag className="h-3 w-3" />
                        Price
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Add New Item Button */}
        <button className="mt-6 mb-6 w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-orange-300 hover:text-orange-600 transition-colors">
          <Plus className="h-5 w-5" />
          Add New {businessType === 'restaurant' ? 'Menu Item' : businessType === 'pharmacy' ? 'Medicine' : 'Product'}
        </button>
      </div>
    </div>
  );
}

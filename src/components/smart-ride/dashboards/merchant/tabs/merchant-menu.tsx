'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Clock,
  MoreVertical,
  Package,
  AlertTriangle,
  Tag,
  Loader2
} from 'lucide-react';
import { ProductModal } from '../../../shared/product-modal';

type BusinessType = 'RESTAURANT' | 'PHARMACY' | 'SUPERMARKET' | 'RETAIL_STORE';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  preparationTime: number | null;
  isAvailable: boolean;
  createdAt: string;
}

export function MerchantMenu() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [merchantStatus, setMerchantStatus] = useState<string | null>(null);
  const [merchantType, setMerchantType] = useState<BusinessType>('RESTAURANT');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSaving, setIsSaving] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Fetch products from API
  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/merchants/menu', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProducts(data.menuItems || []);
      } else {
        // No mock data - show empty state
        setProducts([]);
        setError(data.error || 'Failed to load menu items');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getCategories = () => {
    switch (merchantType) {
      case 'RESTAURANT':
        return [
          { id: 'all', label: 'All' },
          { id: 'pizza', label: 'Pizza' },
          { id: 'main', label: 'Main Course' },
          { id: 'salads', label: 'Salads' },
          { id: 'drinks', label: 'Drinks' },
        ];
      case 'PHARMACY':
        return [
          { id: 'all', label: 'All' },
          { id: 'prescription', label: 'Prescription' },
          { id: 'otc', label: 'Over-the-Counter' },
          { id: 'supplements', label: 'Supplements' },
          { id: 'first-aid', label: 'First Aid' },
        ];
      case 'SUPERMARKET':
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

  const availableCount = products.filter((item) => item.isAvailable).length;
  const unavailableCount = products.filter((item) => !item.isAvailable).length;

  const toggleAvailability = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newAvailability = !product.isAvailable;

    // Optimistic update
    setProducts(products.map(p =>
      p.id === productId ? { ...p, isAvailable: newAvailability } : p
    ));

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/merchants/menu', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: productId,
          isAvailable: newAvailability,
        }),
      });

      if (!response.ok) {
        // Revert on error
        setProducts(products.map(p =>
          p.id === productId ? { ...p, isAvailable: !newAvailability } : p
        ));
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
      // Revert on error
      setProducts(products.map(p =>
        p.id === productId ? { ...p, isAvailable: !newAvailability } : p
      ));
    }
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setModalMode('edit');
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchants/menu?itemId=${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setProducts(products.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.error('Error deleting product:', err);
    }
    setActiveDropdown(null);
  };

  const handleSaveProduct = async (data: Record<string, unknown>) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = '/api/merchants/menu';
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

      if (response.ok && result.menuItem) {
        if (modalMode === 'add') {
          setProducts([result.menuItem, ...products]);
        } else {
          setProducts(products.map(p => 
            p.id === result.menuItem.id ? result.menuItem : p
          ));
        }
      }
    } catch (err) {
      console.error('Error saving product:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const getBusinessIcon = () => {
    switch (merchantType) {
      case 'PHARMACY':
        return Pill;
      case 'SUPERMARKET':
        return ShoppingCart;
      default:
        return UtensilsCrossed;
    }
  };

  const BusinessIcon = getBusinessIcon();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {merchantType === 'RESTAURANT' ? 'Menu' : merchantType === 'PHARMACY' ? 'Medicine Inventory' : 'Products'}
            </h1>
            <p className="text-sm text-gray-500">{availableCount} of {products.length} items available</p>
          </div>
          <button 
            onClick={handleAddProduct}
            className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Stock Alerts */}
        {unavailableCount > 0 && (
          <Card className="p-4 mb-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">{unavailableCount} items hidden from customers</p>
              </div>
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
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No items found</p>
              <Button
                onClick={handleAddProduct}
                className="mt-4 bg-orange-600 hover:bg-orange-700"
              >
                Add Your First Item
              </Button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <Card
                key={item.id}
                className={cn("p-4", !item.isAvailable && "opacity-60")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <BusinessIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                          className="text-gray-400 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {activeDropdown === item.id && (
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                            <button
                              onClick={() => handleEditProduct(item)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(item.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="font-bold text-orange-600">UGX {item.price.toLocaleString()}</span>
                      {item.preparationTime && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{item.preparationTime} min</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <button 
                        onClick={() => handleEditProduct(item)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleAvailability(item.id)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors",
                          item.isAvailable
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {item.isAvailable ? (
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
              </Card>
            ))
          )}
        </div>

        {/* Add New Item Button */}
        <button 
          onClick={handleAddProduct}
          className="mt-6 mb-6 w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add New {merchantType === 'RESTAURANT' ? 'Menu Item' : merchantType === 'PHARMACY' ? 'Medicine' : 'Product'}
        </button>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        product={selectedProduct}
        mode={modalMode}
        type="merchant"
        categories={categories.filter(c => c.id !== 'all')}
      />
    </div>
  );
}

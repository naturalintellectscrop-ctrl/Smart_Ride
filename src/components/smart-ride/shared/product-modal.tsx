'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  preparationTime?: number | null;
  stockQuantity?: number | null;
  isAvailable: boolean;
  requiresPrescription?: boolean;
  genericName?: string | null;
  manufacturer?: string | null;
  storageCondition?: string | null;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  product?: Product | null;
  mode: 'add' | 'edit';
  type: 'merchant' | 'health-provider';
  categories: { id: string; label: string }[];
}

export function ProductModal({
  isOpen,
  onClose,
  onSave,
  product,
  mode,
  type,
  categories,
}: ProductModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    preparationTime: '',
    stockQuantity: '',
    isAvailable: true,
    requiresPrescription: false,
    genericName: '',
    manufacturer: '',
    storageCondition: '',
  });

  useEffect(() => {
    if (product && mode === 'edit') {
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        category: product.category || '',
        imageUrl: product.imageUrl || '',
        preparationTime: product.preparationTime?.toString() || '',
        stockQuantity: product.stockQuantity?.toString() || '',
        isAvailable: product.isAvailable,
        requiresPrescription: product.requiresPrescription || false,
        genericName: product.genericName || '',
        manufacturer: product.manufacturer || '',
        storageCondition: product.storageCondition || '',
      });
    } else {
      // Reset for add mode
      setFormData({
        name: '',
        description: '',
        price: '',
        category: categories[0]?.id || '',
        imageUrl: '',
        preparationTime: '',
        stockQuantity: '',
        isAvailable: true,
        requiresPrescription: false,
        genericName: '',
        manufacturer: '',
        storageCondition: '',
      });
    }
  }, [product, mode, categories]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      alert('Name and price are required');
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave: Record<string, unknown> = {
        ...formData,
        itemId: product?.id,
      };
      
      // Remove empty values
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === '' || dataToSave[key] === null) {
          delete dataToSave[key];
        }
      });

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'add') {
      return type === 'merchant' ? 'Add Menu Item' : 'Add Medicine';
    }
    return type === 'merchant' ? 'Edit Menu Item' : 'Edit Medicine';
  };

  const isHealthProvider = type === 'health-provider';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#13131A] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">
              {isHealthProvider ? 'Medicine Name' : 'Item Name'} *
            </Label>
            <Input
              id="name"
              value={formData.name as string}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isHealthProvider ? 'e.g., Paracetamol 500mg' : 'e.g., Margherita Pizza'}
              className="bg-[#1A1A24] border-white/10 text-white"
            />
          </div>

          {/* Generic Name (Health Provider only) */}
          {isHealthProvider && (
            <div className="space-y-2">
              <Label htmlFor="genericName" className="text-gray-300">
                Generic Name
              </Label>
              <Input
                id="genericName"
                value={formData.genericName as string}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                placeholder="e.g., Acetaminophen"
                className="bg-[#1A1A24] border-white/10 text-white"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">
              Description
            </Label>
            <Input
              id="description"
              value={formData.description as string}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description"
              className="bg-[#1A1A24] border-white/10 text-white"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-gray-300">
              Category
            </Label>
            <Select
              value={formData.category as string}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="bg-[#1A1A24] border-white/10 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A24] border-white/10">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-white/10">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-gray-300">
              Price (UGX) *
            </Label>
            <Input
              id="price"
              type="number"
              value={formData.price as string}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
              className="bg-[#1A1A24] border-white/10 text-white"
            />
          </div>

          {/* Preparation Time (Merchant only) */}
          {!isHealthProvider && (
            <div className="space-y-2">
              <Label htmlFor="preparationTime" className="text-gray-300">
                Preparation Time (minutes)
              </Label>
              <Input
                id="preparationTime"
                type="number"
                value={formData.preparationTime as string}
                onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                placeholder="e.g., 15"
                className="bg-[#1A1A24] border-white/10 text-white"
              />
            </div>
          )}

          {/* Stock Quantity */}
          <div className="space-y-2">
            <Label htmlFor="stockQuantity" className="text-gray-300">
              Stock Quantity
            </Label>
            <Input
              id="stockQuantity"
              type="number"
              value={formData.stockQuantity as string}
              onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
              placeholder="Available units"
              className="bg-[#1A1A24] border-white/10 text-white"
            />
          </div>

          {/* Manufacturer (Health Provider only) */}
          {isHealthProvider && (
            <div className="space-y-2">
              <Label htmlFor="manufacturer" className="text-gray-300">
                Manufacturer
              </Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer as string}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., J Healthcare"
                className="bg-[#1A1A24] border-white/10 text-white"
              />
            </div>
          )}

          {/* Storage Condition (Health Provider only) */}
          {isHealthProvider && (
            <div className="space-y-2">
              <Label htmlFor="storageCondition" className="text-gray-300">
                Storage Condition
              </Label>
              <Input
                id="storageCondition"
                value={formData.storageCondition as string}
                onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value })}
                placeholder="e.g., Store below 25°C"
                className="bg-[#1A1A24] border-white/10 text-white"
              />
            </div>
          )}

          {/* Requires Prescription (Health Provider only) */}
          {isHealthProvider && (
            <div className="flex items-center justify-between">
              <Label htmlFor="requiresPrescription" className="text-gray-300">
                Requires Prescription
              </Label>
              <Switch
                id="requiresPrescription"
                checked={formData.requiresPrescription as boolean}
                onCheckedChange={(checked) => setFormData({ ...formData, requiresPrescription: checked })}
              />
            </div>
          )}

          {/* Is Available */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isAvailable" className="text-gray-300">
              Available for Sale
            </Label>
            <Switch
              id="isAvailable"
              checked={formData.isAvailable as boolean}
              onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="text-gray-300">
              Image URL
            </Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl as string}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
              className="bg-[#1A1A24] border-white/10 text-white"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/10 text-white hover:bg-white/10"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              mode === 'add' ? 'Add Item' : 'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

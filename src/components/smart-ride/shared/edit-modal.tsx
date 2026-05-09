/**
 * Smart Ride Edit Modal Component
 * 
 * A reusable modal for editing various types of data:
 * - Business names
 * - Profile information
 * - Location details
 * - Operating hours
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  X,
  Check,
  Edit,
  Store,
  User,
  MapPin,
  Clock,
  Phone,
  Mail,
  FileText,
  Camera,
  Save,
  AlertCircle,
} from 'lucide-react';

// ==========================================
// Types
// ==========================================

export type EditFieldType = 
  | 'business_name'
  | 'business_type'
  | 'business_address'
  | 'phone'
  | 'email'
  | 'name'
  | 'location'
  | 'operating_hours'
  | 'description';

export interface EditField {
  id: string;
  type: EditFieldType;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  icon?: React.ReactNode;
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fieldId: string, value: string) => Promise<void>;
  fields: EditField[];
  title?: string;
  subtitle?: string;
}

// ==========================================
// Field Configuration
// ==========================================

const fieldConfig: Record<EditFieldType, {
  icon: React.ReactNode;
  placeholder: string;
  inputType: string;
}> = {
  business_name: {
    icon: <Store className="h-5 w-5" />,
    placeholder: 'Enter business name',
    inputType: 'text',
  },
  business_type: {
    icon: <Store className="h-5 w-5" />,
    placeholder: 'e.g., Restaurant, Pharmacy, Grocery',
    inputType: 'text',
  },
  business_address: {
    icon: <MapPin className="h-5 w-5" />,
    placeholder: 'Enter business address',
    inputType: 'text',
  },
  phone: {
    icon: <Phone className="h-5 w-5" />,
    placeholder: '+256 700 000 000',
    inputType: 'tel',
  },
  email: {
    icon: <Mail className="h-5 w-5" />,
    placeholder: 'email@example.com',
    inputType: 'email',
  },
  name: {
    icon: <User className="h-5 w-5" />,
    placeholder: 'Enter your name',
    inputType: 'text',
  },
  location: {
    icon: <MapPin className="h-5 w-5" />,
    placeholder: 'Enter location',
    inputType: 'text',
  },
  operating_hours: {
    icon: <Clock className="h-5 w-5" />,
    placeholder: 'e.g., 08:00 - 22:00',
    inputType: 'text',
  },
  description: {
    icon: <FileText className="h-5 w-5" />,
    placeholder: 'Enter description',
    inputType: 'text',
  },
};

// ==========================================
// Edit Modal Component
// ==========================================

export function EditModal({ 
  isOpen, 
  onClose, 
  onSave, 
  fields, 
  title = 'Edit Information',
  subtitle = 'Make changes to your information'
}: EditModalProps) {
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize values when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialValues: Record<string, string> = {};
      fields.forEach(field => {
        initialValues[field.id] = field.value;
      });
      setEditedValues(initialValues);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, fields]);

  const handleValueChange = (fieldId: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [fieldId]: value }));
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Validate required fields
      for (const field of fields) {
        if (field.required && !editedValues[field.id]?.trim()) {
          setError(`${field.label} is required`);
          setIsSaving(false);
          return;
        }
      }

      // Save all changed fields
      for (const field of fields) {
        if (editedValues[field.id] !== field.value) {
          await onSave(field.id, editedValues[field.id]);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center max-w-md mx-auto">
      <Card className="w-full bg-[#13131A] border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-gray-400">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-4 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {fields.map((field) => {
            const config = fieldConfig[field.type];
            const isEditing = activeField === field.id;
            
            return (
              <div key={field.id}>
                <label className="block text-sm text-gray-400 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                
                {isEditing ? (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {config.icon}
                    </div>
                    <Input
                      type={config.inputType}
                      value={editedValues[field.id] || ''}
                      onChange={(e) => handleValueChange(field.id, e.target.value)}
                      placeholder={field.placeholder || config.placeholder}
                      maxLength={field.maxLength}
                      className="pl-11 h-12 bg-[#1A1A24] border-white/10 text-white focus:border-[#00FF88]/30 rounded-xl"
                      autoFocus
                    />
                    <button
                      onClick={() => setActiveField(null)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[#00FF88]/20"
                    >
                      <Check className="h-4 w-4 text-[#00FF88]" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveField(field.id)}
                    className="w-full flex items-center gap-3 p-3 bg-[#1A1A24] border border-white/5 rounded-xl hover:border-[#00FF88]/30 transition-colors text-left"
                  >
                    <div className="text-gray-500">
                      {config.icon}
                    </div>
                    <span className="flex-1 text-white truncate">
                      {editedValues[field.id] || field.placeholder || config.placeholder}
                    </span>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 text-[#00FF88] text-sm bg-[#00FF88]/10 px-3 py-2 rounded-lg">
              <Check className="h-4 w-4" />
              Changes saved successfully!
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/5 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/10 bg-transparent text-gray-300 hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#00FF88] text-[#0D0D12] hover:bg-[#00CC6E]"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0D0D12]/30 border-t-[#0D0D12] rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// Edit Button Component
// ==========================================

interface EditButtonProps {
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dark' | 'light';
}

export function EditButton({ onClick, size = 'md', variant = 'default' }: EditButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full flex items-center justify-center transition-all",
        sizeClasses[size],
        variant === 'dark' && "bg-white/10 hover:bg-white/20 text-white",
        variant === 'light' && "bg-[#0D0D12]/10 hover:bg-[#0D0D12]/20 text-[#0D0D12]",
        variant === 'default' && "bg-[#1A1A24] hover:bg-[#1E1E28] text-[#00FF88]"
      )}
    >
      <Edit className={iconSizes[size]} />
    </button>
  );
}

// ==========================================
// Hook for Edit Modal
// ==========================================

export function useEditModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [fields, setFields] = useState<EditField[]>([]);
  const [title, setTitle] = useState('Edit Information');
  const [subtitle, setSubtitle] = useState('Make changes to your information');

  const openModal = (newFields: EditField[], options?: { title?: string; subtitle?: string }) => {
    setFields(newFields);
    if (options?.title) setTitle(options.title);
    if (options?.subtitle) setSubtitle(options.subtitle);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    fields,
    title,
    subtitle,
    openModal,
    closeModal,
  };
}

export default EditModal;

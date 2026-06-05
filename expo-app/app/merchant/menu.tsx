// ============================================
// SMART RIDE MOBILE - MERCHANT MENU MANAGEMENT
// ============================================
// Menu item list with add, edit, delete, availability
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMerchantStore } from '@/src/store';
import { COLORS } from '@/src/constants';
import { MenuItem } from '@/src/types';

export default function MerchantMenuScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const merchantId = params.merchantId as string;

  const {
    menuItems,
    isLoadingMenu,
    menuError,
    fetchMenu,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  } = useMerchantStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);

  useEffect(() => {
    if (merchantId) {
      fetchMenu(merchantId);
    }
  }, [merchantId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (merchantId) {
      await fetchMenu(merchantId);
    }
    setRefreshing(false);
  }, [merchantId]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormCategory('');
    setFormAvailable(true);
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormDescription(item.description || '');
    setFormPrice(String(item.price || ''));
    setFormCategory(item.category || '');
    setFormAvailable(item.isAvailable);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPrice.trim()) {
      Alert.alert('Validation', 'Name and price are required');
      return;
    }

    const price = parseFloat(formPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Validation', 'Please enter a valid price');
      return;
    }

    setIsSaving(true);
    const data = {
      name: formName.trim(),
      description: formDescription.trim(),
      price,
      category: formCategory.trim(),
      isAvailable: formAvailable,
    };

    let success: boolean;
    if (editingItem) {
      success = await updateMenuItem(merchantId, editingItem.id, data);
    } else {
      success = await createMenuItem(merchantId, data);
    }

    setIsSaving(false);
    if (success) {
      setShowAddModal(false);
      resetForm();
      setEditingItem(null);
    } else {
      Alert.alert('Error', 'Failed to save item. Please try again.');
    }
  };

  const handleDelete = (item: MenuItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMenuItem(merchantId, item.id);
            if (!success) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const data = {
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      isAvailable: !item.isAvailable,
    };
    const success = await updateMenuItem(merchantId, item.id, data);
    if (!success) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;

  // Group items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const categories = Object.keys(groupedItems);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Menu</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.listContent}
      >
        {isLoadingMenu && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading menu...</Text>
          </View>
        ) : menuError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{menuError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => merchantId && fetchMenu(merchantId)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : menuItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>No Menu Items</Text>
            <Text style={styles.emptySubtitle}>Add your first menu item to get started</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Text style={styles.emptyButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          categories.map(category => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {groupedItems[category].map(item => (
                <View key={item.id} style={styles.menuItemCard}>
                  <View style={styles.menuItemInfo}>
                    <View style={styles.menuItemRow}>
                      <Text style={[styles.menuItemName, !item.isAvailable && styles.menuItemNameDisabled]}>
                        {item.name}
                      </Text>
                      <Switch
                        value={item.isAvailable}
                        onValueChange={() => handleToggleAvailability(item)}
                        trackColor={{ false: '#374151', true: COLORS.primary }}
                        thumbColor={item.isAvailable ? '#FFFFFF' : '#6B7280'}
                        style={styles.availabilitySwitch}
                      />
                    </View>
                    {item.description ? (
                      <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                    {!item.isAvailable && (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableText}>Unavailable</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.menuItemActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditModal(item)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(item)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Item name"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Item description"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.formLabel}>Price (UGX) *</Text>
              <TextInput
                style={styles.formInput}
                value={formPrice}
                onChangeText={setFormPrice}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Category</Text>
              <TextInput
                style={styles.formInput}
                value={formCategory}
                onChangeText={setFormCategory}
                placeholder="e.g., Main Dish, Drinks"
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.formToggleRow}>
                <Text style={styles.formLabel}>Available</Text>
                <Switch
                  value={formAvailable}
                  onValueChange={setFormAvailable}
                  trackColor={{ false: '#374151', true: COLORS.primary }}
                  thumbColor={formAvailable ? '#FFFFFF' : '#6B7280'}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItemCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  menuItemInfo: {
    marginBottom: 10,
  },
  menuItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuItemName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  menuItemNameDisabled: {
    color: COLORS.textDisabled,
  },
  availabilitySwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  menuItemDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  menuItemPrice: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  unavailableBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  unavailableText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: '600',
  },
  menuItemActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSurface,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    color: COLORS.textMuted,
    fontSize: 20,
  },
  modalForm: {
    padding: 20,
  },
  formLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  formToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

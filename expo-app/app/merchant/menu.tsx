// ============================================
// SMART RIDE MOBILE - MERCHANT MENU MANAGEMENT
// ============================================
// Menu item list with add, edit, delete, availability
// ============================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMerchantStore } from '@/src/store';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  GradientButton,
  IconInput,
  ListSkeleton,
  SmartBottomSheet,
  Toggle,
} from '@/src/components';
import { MenuItem } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

export default function MerchantMenuScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
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
      <AppHeader
        title="Menu"
        onBack={() => router.back()}
        rightActions={[{ icon: 'add', onPress: openAddModal, label: 'Add item' }]}
      />

      {/* Menu Items */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.listContent}
      >
        {isLoadingMenu && !refreshing ? (
          <ListSkeleton rows={4} />
        ) : menuError ? (
          <ErrorState
            title="Couldn't load your menu"
            subtitle={menuError}
            onRetry={() => merchantId && fetchMenu(merchantId)}
          />
        ) : menuItems.length === 0 ? (
          <EmptyState
            icon="restaurant-outline"
            title="No menu items"
            subtitle="Add your first item so customers can order."
            actionLabel="Add item"
            onAction={openAddModal}
          />
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
                      <Toggle
                        value={item.isAvailable}
                        onValueChange={() => handleToggleAvailability(item)}
                        accessibilityLabel={`${item.name} available`}
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
      {/* Add/edit item. Was a bespoke <Modal> with its own scrim, header,
          close glyph and four raw TextInputs. */}
      <SmartBottomSheet
        visible={showAddModal}
        title={editingItem ? 'Edit item' : 'Add new item'}
        onDismiss={() => setShowAddModal(false)}
        dismissOnBackdrop={!isSaving}
      >
        <View>
          <IconInput
            label="Name *"
            placeholder="Item name"
            value={formName}
            onChangeText={setFormName}
            icon="fast-food-outline"
          />
          <IconInput
            label="Description"
            placeholder="Item description"
            value={formDescription}
            onChangeText={setFormDescription}
            icon="document-text-outline"
            multiline
          />
          <IconInput
            label="Price (UGX) *"
            placeholder="0"
            value={formPrice}
            onChangeText={setFormPrice}
            icon="cash-outline"
            keyboardType="numeric"
          />
          <IconInput
            label="Category"
            placeholder="e.g. Main Dish, Drinks"
            value={formCategory}
            onChangeText={setFormCategory}
            icon="pricetag-outline"
          />

          <View style={styles.formToggleRow}>
            <Text style={styles.formLabel}>Available</Text>
            <Toggle
              value={formAvailable}
              onValueChange={setFormAvailable}
              accessibilityLabel="Item available"
            />
          </View>

          <GradientButton
            title={editingItem ? 'Update item' : 'Add item'}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            size="lg"
            fullWidth
          />
        </View>
      </SmartBottomSheet>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: SPACING.md + 4,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  addButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
    ...TYPOGRAPHY.bodySm,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: SPACING.md - 4,
  },
  errorText: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    textAlign: 'center',
    marginBottom: SPACING.md + 4,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md - 4,
    borderRadius: RADIUS.lg,
  },
  emptyButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: SPACING.md + 4,
  },
  categoryTitle: {
    color: COLORS.primary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: 'bold',
    marginBottom: SPACING.sm + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItemCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: SPACING.sm + 2,
    ...SHADOWS.card,
  },
  menuItemInfo: {
    marginBottom: SPACING.sm + 2,
  },
  menuItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  menuItemName: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
    flex: 1,
  },
  menuItemNameDisabled: {
    color: COLORS.outlineVariant,
  },
  availabilitySwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  menuItemDesc: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    lineHeight: 18,
    marginBottom: SPACING.sm - 2,
  },
  menuItemPrice: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  unavailableBadge: {
    backgroundColor: `${COLORS.error}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm - 2,
  },
  unavailableText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: '600',
  },
  menuItemActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  editButtonText: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: `${COLORS.error}15`,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  deleteButtonText: {
    color: COLORS.error,
    ...TYPOGRAPHY.labelMd,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md + 4,
    paddingTop: SPACING.md + 4,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  modalTitle: {
    color: COLORS.onSurface,
    ...TYPOGRAPHY.headlineMd,
  },
  modalClose: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.headlineMd,
  },
  modalForm: {
    padding: SPACING.md + 4,
  },
  formLabel: {
    color: COLORS.onSurfaceVariant,
    ...TYPOGRAPHY.bodySm,
    fontWeight: '600',
    marginBottom: SPACING.sm - 2,
    marginTop: SPACING.md - 4,
  },
  formInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.md - 4,
    color: COLORS.onSurface,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.md - 4,
  },
  formToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md - 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.onPrimary,
    ...TYPOGRAPHY.bodyMd,
    fontWeight: '600',
  },
});

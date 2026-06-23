// ============================================
// SMART RIDE MOBILE - SAVED ADDRESSES SCREEN
// ============================================
// Full CRUD screen for managing user's saved addresses
// Stitch MD3 Design System — Light theme, primary #005f3a
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { useLocationStore } from '@/src/store/locationStore';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';

// ============================================
// TYPES
// ============================================
interface SavedAddress {
  id: string;
  label: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const PRESET_LABELS = [
  { label: 'Home', icon: 'home-outline' as const },
  { label: 'Work', icon: 'briefcase-outline' as const },
  { label: 'Other', icon: 'location-outline' as const },
];

// ============================================
// MAIN SCREEN
// ============================================
let COLORS: ThemedColors;
let styles: any;

export default function SavedAddressesScreen() {
  { const t = useTheme(); COLORS = makeThemedColors(t.isDark); styles = createStyles(COLORS); }
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const locationStore = useLocationStore();

  // Load saved addresses on mount
  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getSavedAddresses();
      if (response.success && response.data) {
        setAddresses(response.data.addresses || []);
      } else {
        Alert.alert('Error', response.error || 'Failed to load addresses');
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const resetForm = useCallback(() => {
    setLabel('');
    setAddress('');
    setLatitude(null);
    setLongitude(null);
    setIsDefault(false);
    setFormError(null);
    setEditingAddress(null);
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const openEditModal = useCallback((addr: SavedAddress) => {
    setEditingAddress(addr);
    setLabel(addr.label);
    setAddress(addr.address);
    setLatitude(addr.latitude ?? null);
    setLongitude(addr.longitude ?? null);
    setIsDefault(addr.isDefault);
    setFormError(null);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    resetForm();
  }, [resetForm]);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      // Ensure we have permission and current location
      await locationStore.getCurrentLocation();

      // Small delay to let state settle
      const { latitude: lat, longitude: lng, address: addr } = useLocationStore.getState();
      if (lat && lng) {
        setLatitude(lat);
        setLongitude(lng);
        if (addr && !address) {
          setAddress(addr);
        }
      } else {
        Alert.alert('Location Unavailable', 'Could not get your current location. Please check permissions.');
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  }, [address, locationStore]);

  const handleSave = useCallback(async () => {
    setFormError(null);

    if (!label.trim()) {
      setFormError('Label is required');
      return;
    }
    if (!address.trim()) {
      setFormError('Address is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        label: label.trim(),
        address: address.trim(),
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        isDefault,
      };

      let response;
      if (editingAddress) {
        response = await api.updateSavedAddress(editingAddress.id, payload);
      } else {
        response = await api.addSavedAddress(payload);
      }

      if (response.success) {
        closeModal();
        await loadAddresses();
        Alert.alert(
          'Success',
          editingAddress ? 'Address updated successfully' : 'Address saved successfully'
        );
      } else {
        setFormError(response.error || 'Failed to save address');
      }
    } catch (error) {
      console.error('Save address error:', error);
      setFormError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [label, address, latitude, longitude, isDefault, editingAddress, closeModal, loadAddresses]);

  const handleDelete = useCallback((addr: SavedAddress) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${addr.label}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteSavedAddress(addr.id);
              if (response.success) {
                await loadAddresses();
                Alert.alert('Success', 'Address deleted successfully');
              } else {
                Alert.alert('Error', response.error || 'Failed to delete address');
              }
            } catch (error) {
              console.error('Delete address error:', error);
              Alert.alert('Error', 'Failed to delete address');
            }
          },
        },
      ]
    );
  }, [loadAddresses]);

  const handleSetDefault = useCallback(async (addr: SavedAddress) => {
    try {
      const response = await api.updateSavedAddress(addr.id, { isDefault: true });
      if (response.success) {
        await loadAddresses();
      } else {
        Alert.alert('Error', response.error || 'Failed to set default address');
      }
    } catch (error) {
      console.error('Set default error:', error);
      Alert.alert('Error', 'Failed to set default address');
    }
  }, [loadAddresses]);

  const getLabelIcon = useCallback((labelText: string): keyof typeof Ionicons.glyphMap => {
    const lower = labelText.toLowerCase();
    if (lower === 'home') return 'home';
    if (lower === 'work') return 'briefcase';
    if (lower === 'gym') return 'barbell-outline';
    if (lower === 'school') return 'school-outline';
    return 'location';
  }, []);

  // Render
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/profile');
              }
            }}
            style={styles.headerBtn}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Saved Addresses</Text>

          <TouchableOpacity
            onPress={openAddModal}
            style={styles.headerBtn}
            activeOpacity={0.7}
            accessibilityLabel="Add address"
          >
            <Ionicons name="add" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      ) : addresses.length === 0 ? (
        <EmptyState onAdd={openAddModal} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHint}>
            {addresses.length} saved {addresses.length === 1 ? 'address' : 'addresses'}
          </Text>
          {addresses.map((addr, index) => (
            <Animated.View
              key={addr.id}
              entering={SlideInRight.duration(300).delay(index * 50).springify()}
            >
              <AddressCard
                address={addr}
                icon={getLabelIcon(addr.label)}
                onEdit={() => openEditModal(addr)}
                onDelete={() => handleDelete(addr)}
                onSetDefault={() => handleSetDefault(addr)}
              />
            </Animated.View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Label Field */}
              <Text style={styles.fieldLabel}>Label</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="pricetag-outline"
                  size={16}
                  color={COLORS.outline}
                  style={{ paddingLeft: 12 }}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Home, Work, Gym"
                  placeholderTextColor={COLORS.outline}
                  value={label}
                  onChangeText={setLabel}
                  maxLength={32}
                />
              </View>

              {/* Quick Label Picks */}
              <View style={styles.presetRow}>
                {PRESET_LABELS.map((preset) => {
                  const active = label === preset.label;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, active && styles.presetChipActive]}
                      onPress={() => setLabel(preset.label)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={preset.icon}
                        size={14}
                        color={active ? COLORS.onPrimary : COLORS.primary}
                      />
                      <Text
                        style={[
                          styles.presetChipText,
                          active && styles.presetChipTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Address Field */}
              <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Address</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter the address"
                  placeholderTextColor={COLORS.outline}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={280}
                />
              </View>

              {/* Use Current Location Button */}
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={handleUseCurrentLocation}
                activeOpacity={0.7}
                disabled={locationStore.isLocating}
              >
                {locationStore.isLocating ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="locate-outline" size={18} color={COLORS.primary} />
                )}
                <Text style={styles.locationBtnText}>
                  {locationStore.isLocating
                    ? 'Locating...'
                    : latitude !== null && longitude !== null
                    ? 'Location captured'
                    : 'Use Current Location'}
                </Text>
              </TouchableOpacity>

              {/* Coordinates hint */}
              {latitude !== null && longitude !== null && (
                <Text style={styles.coordHint}>
                  Coordinates: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </Text>
              )}

              {/* Default Toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelContainer}>
                  <Ionicons name="star-outline" size={18} color={COLORS.primary} />
                  <View>
                    <Text style={styles.toggleLabel}>Set as default</Text>
                    <Text style={styles.toggleSubtext}>
                      Use this address by default for new rides
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: '#374151', true: COLORS.primary }}
                  thumbColor={isDefault ? COLORS.onPrimary : '#6B7280'}
                />
              </View>

              {/* Error */}
              {formError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={closeModal}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator color={COLORS.onPrimary} size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingAddress ? 'Update' : 'Save'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.centerContainer}>
      <Animated.View entering={ZoomIn.duration(400).springify()}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="location-outline" size={48} color={COLORS.primary} />
        </View>
      </Animated.View>
      <Animated.Text
        entering={FadeInUp.duration(400).delay(100).springify()}
        style={styles.emptyTitle}
      >
        No Saved Addresses Yet
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.duration(400).delay(200).springify()}
        style={styles.emptySubtitle}
      >
        Save your favorite locations like Home, Work, or Gym for faster booking.
      </Animated.Text>
      <Animated.View
        entering={FadeInUp.duration(400).delay(300).springify()}
        style={styles.emptyBtnContainer}
      >
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={onAdd}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={COLORS.onPrimary} />
          <Text style={styles.emptyBtnText}>Add Address</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ============================================
// ADDRESS CARD COMPONENT
// ============================================
interface AddressCardProps {
  address: SavedAddress;
  icon: keyof typeof Ionicons.glyphMap;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

function AddressCard({ address, icon, onEdit, onDelete, onSetDefault }: AddressCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardIconContainer}>
          <Ionicons name={icon} size={22} color={COLORS.primary} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardLabel} numberOfLines={1}>
              {address.label}
            </Text>
            {address.isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="star" size={10} color={COLORS.onPrimary} />
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardAddress} numberOfLines={2}>
            {address.address}
          </Text>
          {address.latitude !== null && address.latitude !== undefined && (
            <Text style={styles.cardCoords}>
              {address.latitude.toFixed(4)}, {address.longitude?.toFixed(4)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        {!address.isDefault && (
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={onSetDefault}
            activeOpacity={0.7}
            accessibilityLabel="Set as default"
          >
            <Ionicons name="star-outline" size={18} color={COLORS.outline} />
            <Text style={styles.cardActionText}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={onEdit}
          activeOpacity={0.7}
          accessibilityLabel="Edit address"
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.cardActionText, { color: COLORS.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={onDelete}
          activeOpacity={0.7}
          accessibilityLabel="Delete address"
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={[styles.cardActionText, { color: COLORS.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...TYPOGRAPHY.headlineLgMobile,
    color: COLORS.onSurface,
    letterSpacing: -0.5,
  },

  // Center / Loading
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    color: COLORS.outline,
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    marginTop: SPACING.md,
  },

  // Empty State
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0, 95, 58, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  emptyBtnContainer: {
    width: '100%',
    maxWidth: 240,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.button,
  },
  emptyBtnText: {
    color: COLORS.onPrimary,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
  },

  // Scroll List
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  sectionHint: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.outline,
    marginBottom: SPACING.md,
  },

  // Address Card
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    ...SHADOWS.card,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0, 95, 58, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  cardLabel: {
    ...TYPOGRAPHY.bodyLg,
    fontWeight: '700',
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    color: COLORS.onPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardAddress: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
  cardCoords: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.outline,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '92%',
    paddingBottom: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  modalTitle: {
    ...TYPOGRAPHY.headlineMd,
    color: COLORS.onSurface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  modalScrollContent: {
    padding: SPACING.md,
  },

  // Form
  fieldLabel: {
    ...TYPOGRAPHY.labelMd,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
    color: COLORS.onSurface,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  textArea: {
    minHeight: 80,
    paddingVertical: 10,
  },

  // Preset Chips
  presetRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: TYPOGRAPHY.bodySm.fontSize,
    color: COLORS.primary,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: COLORS.onPrimary,
  },

  // Location Button
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  locationBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: TYPOGRAPHY.bodySm.fontSize,
  },
  coordHint: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: SPACING.xs,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    paddingRight: SPACING.md,
  },
  toggleLabel: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  toggleSubtext: {
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
  },

  // Error
  errorContainer: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    borderColor: 'rgba(186, 26, 26, 0.2)',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    flex: 1,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  cancelBtnText: {
    color: COLORS.onSurface,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.button,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: COLORS.onPrimary,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.bodyMd.fontSize,
  },
});

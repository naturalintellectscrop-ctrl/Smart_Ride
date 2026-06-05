// ============================================
// SMART RIDE MOBILE - PHARMACIST MEDICINE CATALOG
// ============================================
// Medicine catalog management with stock/availability
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';
import { GlassCard, GradientButton } from '@/src/components';
import { LinearGradient } from 'expo-linear-gradient';

export default function CatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add medicine modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    genericName: '',
    category: '',
    price: '',
    stockQuantity: '',
    unit: '',
    description: '',
    requiresPrescription: false,
  });

  // Edit stock modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [editStock, setEditStock] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const response = await api.getHealthProviderCatalog();
      if (response.success && response.data) {
        const catalogData = response.data.medicines || response.data.catalog || response.data.data || response.data;
        setMedicines(Array.isArray(catalogData) ? catalogData : []);
      } else {
        setMedicines([]);
      }
    } catch (error) {
      console.error('Failed to load catalog:', error);
      setMedicines([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCatalog();
    setRefreshing(false);
  };

  const toggleAvailability = async (medicine: any) => {
    try {
      const response = await api.updateMedicineAvailability(medicine.id, {
        isAvailable: !medicine.isAvailable,
      });
      if (response.success) {
        setMedicines(prev =>
          prev.map(m => m.id === medicine.id ? { ...m, isAvailable: !m.isAvailable } : m)
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to update availability');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const handleAddMedicine = async () => {
    if (!newMedicine.name.trim()) {
      Alert.alert('Error', 'Medicine name is required');
      return;
    }
    if (!newMedicine.price.trim()) {
      Alert.alert('Error', 'Price is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.addMedicineToCatalog({
        name: newMedicine.name,
        genericName: newMedicine.genericName || undefined,
        category: newMedicine.category || undefined,
        price: parseFloat(newMedicine.price),
        stockQuantity: parseInt(newMedicine.stockQuantity) || 0,
        unit: newMedicine.unit || undefined,
        description: newMedicine.description || undefined,
        isAvailable: true,
        requiresPrescription: newMedicine.requiresPrescription,
      });
      if (response.success) {
        Alert.alert('Success', 'Medicine added to catalog');
        setAddModalVisible(false);
        setNewMedicine({
          name: '',
          genericName: '',
          category: '',
          price: '',
          stockQuantity: '',
          unit: '',
          description: '',
          requiresPrescription: false,
        });
        await loadCatalog();
      } else {
        Alert.alert('Error', response.error || 'Failed to add medicine');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!editingMedicine) return;
    setIsSubmitting(true);
    try {
      const response = await api.updateMedicineCatalog(editingMedicine.id, {
        stockQuantity: parseInt(editStock) || 0,
      });
      if (response.success) {
        Alert.alert('Success', 'Stock updated');
        setEditModalVisible(false);
        setEditingMedicine(null);
        setEditStock('');
        await loadCatalog();
      } else {
        Alert.alert('Error', response.error || 'Failed to update stock');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;

  const filteredMedicines = searchQuery.trim()
    ? medicines.filter(m =>
        (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.genericName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.category || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : medicines;

  const availableCount = medicines.filter(m => m.isAvailable).length;
  const lowStockCount = medicines.filter(m => m.stockQuantity <= 5 && m.stockQuantity > 0).length;
  const outOfStockCount = medicines.filter(m => m.stockQuantity === 0).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundElevated]}
        style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medicine Catalog</Text>
          <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <LinearGradient
          colors={['rgba(0, 255, 136, 0.3)', 'rgba(0, 212, 255, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowBorder}
        />
      </LinearGradient>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { borderColor: `${COLORS.primary}20` }]}>
          <Text style={[styles.summaryNumber, { color: COLORS.primary }]}>{medicines.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={[styles.summaryItem, { borderColor: `${COLORS.success}20` }]}>
          <Text style={[styles.summaryNumber, { color: COLORS.success }]}>{availableCount}</Text>
          <Text style={styles.summaryLabel}>Available</Text>
        </View>
        <View style={[styles.summaryItem, { borderColor: `${COLORS.warning}20` }]}>
          <Text style={[styles.summaryNumber, { color: COLORS.warning }]}>{lowStockCount}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={[styles.summaryItem, { borderColor: `${COLORS.error}20` }]}>
          <Text style={[styles.summaryNumber, { color: COLORS.error }]}>{outOfStockCount}</Text>
          <Text style={styles.summaryLabel}>Out</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Medicine List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading catalog...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {filteredMedicines.length > 0 ? (
            filteredMedicines.map((medicine) => (
              <GlassCard key={medicine.id} style={styles.medicineCard}>
                <View style={styles.medicineHeader}>
                  <View style={styles.medicineTitleRow}>
                    <Text style={styles.medicineName}>{medicine.name || 'Unknown Medicine'}</Text>
                    {medicine.requiresPrescription && (
                      <View style={styles.rxBadge}>
                        <Text style={styles.rxText}>Rx</Text>
                      </View>
                    )}
                  </View>
                  <Switch
                    value={medicine.isAvailable}
                    onValueChange={() => toggleAvailability(medicine)}
                    trackColor={{ false: COLORS.backgroundSurface, true: `${COLORS.primary}40` }}
                    thumbColor={medicine.isAvailable ? COLORS.primary : COLORS.textMuted}
                    style={styles.availabilitySwitch}
                  />
                </View>

                {medicine.genericName ? (
                  <Text style={styles.medicineGeneric}>{medicine.genericName}</Text>
                ) : null}

                {medicine.category ? (
                  <Text style={styles.medicineCategory}>{medicine.category}</Text>
                ) : null}

                <View style={styles.medicineDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Price</Text>
                    <Text style={styles.detailValue}>{formatCurrency(medicine.price)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Stock</Text>
                    <Text style={[
                      styles.detailValue,
                      medicine.stockQuantity <= 5 && medicine.stockQuantity > 0 && { color: COLORS.warning },
                      medicine.stockQuantity === 0 && { color: COLORS.error },
                    ]}>
                      {medicine.stockQuantity || 0} {medicine.unit || 'units'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[
                      styles.detailValue,
                      medicine.isAvailable ? { color: COLORS.success } : { color: COLORS.error },
                    ]}>
                      {medicine.isAvailable ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.editStockBtn}
                  onPress={() => {
                    setEditingMedicine(medicine);
                    setEditStock(String(medicine.stockQuantity || 0));
                    setEditModalVisible(true);
                  }}
                >
                  <Text style={styles.editStockText}>Update Stock</Text>
                </TouchableOpacity>
              </GlassCard>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💊</Text>
              <Text style={styles.emptyTitle}>No medicines found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'Add medicines to your catalog'}
              </Text>
              {!searchQuery && (
                <GradientButton
                  title="Add Medicine"
                  onPress={() => setAddModalVisible(true)}
                  size="sm"
                  style={{ marginTop: 16, width: 180 }}
                />
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Medicine Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add Medicine</Text>

              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Medicine name"
                placeholderTextColor={COLORS.textMuted}
                value={newMedicine.name}
                onChangeText={t => setNewMedicine(p => ({ ...p, name: t }))}
              />

              <Text style={styles.fieldLabel}>Generic Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Generic name"
                placeholderTextColor={COLORS.textMuted}
                value={newMedicine.genericName}
                onChangeText={t => setNewMedicine(p => ({ ...p, genericName: t }))}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., Pain Relief, Antibiotics"
                placeholderTextColor={COLORS.textMuted}
                value={newMedicine.category}
                onChangeText={t => setNewMedicine(p => ({ ...p, category: t }))}
              />

              <Text style={styles.fieldLabel}>Price (UGX) *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                value={newMedicine.price}
                onChangeText={t => setNewMedicine(p => ({ ...p, price: t }))}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Stock Quantity</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                value={newMedicine.stockQuantity}
                onChangeText={t => setNewMedicine(p => ({ ...p, stockQuantity: t }))}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Unit</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., tablets, bottles, strips"
                placeholderTextColor={COLORS.textMuted}
                value={newMedicine.unit}
                onChangeText={t => setNewMedicine(p => ({ ...p, unit: t }))}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.fieldInput, { minHeight: 60 }]}
                placeholder="Medicine description"
                placeholderTextColor={COLORS.textMuted}
                value={newMedicine.description}
                onChangeText={t => setNewMedicine(p => ({ ...p, description: t }))}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.prescriptionToggle}>
                <Text style={styles.fieldLabel}>Requires Prescription</Text>
                <Switch
                  value={newMedicine.requiresPrescription}
                  onValueChange={v => setNewMedicine(p => ({ ...p, requiresPrescription: v }))}
                  trackColor={{ false: COLORS.backgroundSurface, true: `${COLORS.primary}40` }}
                  thumbColor={newMedicine.requiresPrescription ? COLORS.primary : COLORS.textMuted}
                />
              </View>

              <View style={styles.modalButtons}>
                <GradientButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setAddModalVisible(false);
                    setNewMedicine({
                      name: '',
                      genericName: '',
                      category: '',
                      price: '',
                      stockQuantity: '',
                      unit: '',
                      description: '',
                      requiresPrescription: false,
                    });
                  }}
                  size="sm"
                  style={styles.modalBtn}
                />
                <GradientButton
                  title="Add Medicine"
                  onPress={handleAddMedicine}
                  loading={isSubmitting}
                  size="sm"
                  style={styles.modalBtn}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Stock Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Stock</Text>
            <Text style={styles.modalSubtitle}>
              {editingMedicine?.name || 'Medicine'}
            </Text>
            <Text style={styles.fieldLabel}>New Stock Quantity</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              value={editStock}
              onChangeText={setEditStock}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <GradientButton
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingMedicine(null);
                  setEditStock('');
                }}
                size="sm"
                style={styles.modalBtn}
              />
              <GradientButton
                title="Update"
                onPress={handleUpdateStock}
                loading={isSubmitting}
                size="sm"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addBtn: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  glowBorder: {
    height: 1,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  medicineCard: {
    marginBottom: 10,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medicineTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  rxBadge: {
    backgroundColor: `${COLORS.warning}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rxText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  availabilitySwitch: {
    marginLeft: 8,
  },
  medicineGeneric: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  medicineCategory: {
    fontSize: 11,
    color: COLORS.info,
    marginTop: 2,
  },
  medicineDetails: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 2,
  },
  editStockBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 8,
  },
  editStockText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  fieldInput: {
    backgroundColor: COLORS.backgroundSurface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  prescriptionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
  },
});

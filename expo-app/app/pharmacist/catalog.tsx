// ============================================
// SMART RIDE MOBILE - MEDICINE CATALOGUE
// ============================================
// What the pharmacy stocks, what it costs, and how much is left.
//
// Nothing on this screen worked before: the list asked for a catalogue without
// the provider id the server demanded and got a 400 it rendered as "empty", and
// adding a medicine failed validation because the category box was free text
// while the server wanted one of eleven exact values. The server now resolves
// the pharmacy from the token, and the category is picked from the real list
// instead of typed — so the form can only produce something the server accepts.
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Switch,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter } from 'expo-router';
import { api } from '@/src/services';
import { SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  ListSkeleton,
  EmptyState,
  SearchInput,
  SmartBottomSheet,
  ConfirmDialog,
} from '@/src/components';
import { Panel, SectionTitle, TonePill, StatTile, toneColors } from '@/src/components/pharmacy';
import { Ionicons } from '@expo/vector-icons';

/**
 * The server's MedicineCategory enum, exactly. A free text box here is what
 * made "add medicine" fail — a pharmacist typing "painkillers" produced a value
 * Prisma rejected, and the screen only said "Failed to add medicine".
 */
const CATEGORIES = [
  { value: 'PAINKILLERS', label: 'Painkillers' },
  { value: 'ANTIBIOTICS', label: 'Antibiotics' },
  { value: 'VITAMINS', label: 'Vitamins & supplements' },
  { value: 'COLD_FLU', label: 'Cold & flu' },
  { value: 'DIGESTIVE', label: 'Digestive' },
  { value: 'CARDIOVASCULAR', label: 'Heart & blood pressure' },
  { value: 'DIABETES', label: 'Diabetes' },
  { value: 'HYGIENE', label: 'Hygiene' },
  { value: 'FIRST_AID', label: 'First aid' },
  { value: 'MOTHER_BABY', label: 'Mother & baby' },
  { value: 'OTHER', label: 'Other' },
] as const;

const categoryLabel = (value?: string) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? 'Uncategorised';

const UGX = (n: unknown) => `UGX ${Number(n || 0).toLocaleString()}`;

const EMPTY_FORM = {
  name: '',
  genericName: '',
  category: 'OTHER' as string,
  price: '',
  stockQuantity: '',
  strength: '',
  packSize: '',
  description: '',
  requiresPrescription: false,
};

export default function MedicineCatalogScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();

  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [sheet, setSheet] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const loadCatalog = useCallback(async () => {
    try {
      const response = await api.getHealthProviderCatalog();
      if (response.success && response.data) {
        const payload: any = response.data;
        const catalogData = payload.medicines || payload.catalog || payload.data || payload;
        setMedicines(Array.isArray(catalogData) ? catalogData : []);
        setLoadError(null);
      } else {
        // Say what went wrong rather than showing an empty shelf. An empty
        // catalogue and a failed request look identical to a pharmacist, and
        // this screen showed the second as the first for as long as it existed.
        setMedicines([]);
        setLoadError(response.error || 'We could not load your catalogue.');
      }
    } catch (error) {
      console.error('Failed to load catalog:', error);
      setMedicines([]);
      setLoadError('We could not reach the server. Check your connection and pull to refresh.');
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

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setSheet('add');
  };

  const openEdit = (medicine: any) => {
    setEditing(medicine);
    setForm({
      name: medicine.name ?? '',
      genericName: medicine.genericName ?? '',
      category: medicine.category ?? 'OTHER',
      price: String(medicine.price ?? ''),
      stockQuantity: medicine.stockQuantity == null ? '' : String(medicine.stockQuantity),
      strength: medicine.strength ?? '',
      packSize: medicine.packSize ?? '',
      description: medicine.description ?? '',
      requiresPrescription: !!medicine.requiresPrescription,
    });
    setSheet('edit');
  };

  const submit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Name needed', 'Give the medicine a name so your customers can find it.');
      return;
    }
    const price = parseFloat(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Price needed', 'Enter what one unit of this medicine costs, in UGX.');
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      category: form.category,
      price,
      requiresPrescription: form.requiresPrescription,
      isAvailable: true,
    };
    if (form.genericName.trim()) payload.genericName = form.genericName.trim();
    if (form.strength.trim()) payload.strength = form.strength.trim();
    if (form.packSize.trim()) payload.packSize = form.packSize.trim();
    if (form.description.trim()) payload.description = form.description.trim();
    const stock = parseInt(form.stockQuantity, 10);
    if (Number.isFinite(stock)) payload.stockQuantity = Math.max(0, stock);

    setIsSubmitting(true);
    try {
      const response = editing
        ? await api.updateMedicineCatalog(editing.id, payload)
        : await api.addMedicineToCatalog(payload);

      if (response.success) {
        setSheet(null);
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        await loadCatalog();
      } else {
        Alert.alert(
          editing ? 'Could not save the change' : 'Could not add this medicine',
          response.error || 'Please try again.'
        );
      }
    } catch {
      Alert.alert('Something went wrong', 'Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAvailability = async (medicine: any) => {
    const next = !medicine.isAvailable;
    // Optimistic, then reconciled — a stock toggle that waits on the network
    // feels broken, but a failure must put it back rather than lie.
    setMedicines((prev) =>
      prev.map((m) => (m.id === medicine.id ? { ...m, isAvailable: next } : m))
    );
    const response = await api.updateMedicineAvailability(medicine.id, next);
    if (!response.success) {
      setMedicines((prev) =>
        prev.map((m) => (m.id === medicine.id ? { ...m, isAvailable: !next } : m))
      );
      Alert.alert('Could not update', response.error || 'The medicine was not changed.');
    }
  };

  const remove = async (medicine: any) => {
    setConfirmDelete(null);
    const response = await api.deleteMedicineFromCatalog(medicine.id);
    if (response.success) {
      setMedicines((prev) => prev.filter((m) => m.id !== medicine.id));
    } else {
      Alert.alert(
        'Could not remove it',
        response.error ||
          'If this medicine is on an active order it cannot be deleted. Mark it unavailable instead.'
      );
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter((m) =>
      [m.name, m.genericName, categoryLabel(m.category), m.strength]
        .filter(Boolean)
        .some((f: string) => String(f).toLowerCase().includes(q))
    );
  }, [medicines, searchQuery]);

  const lowStock = medicines.filter(
    (m) => typeof m.stockQuantity === 'number' && m.stockQuantity > 0 && m.stockQuantity <= 5
  ).length;
  const outOfStock = medicines.filter((m) => m.stockQuantity === 0).length;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Catalogue"
        subtitle={`${medicines.length} medicine${medicines.length === 1 ? '' : 's'}`}
        onBack={() => router.back()}
        rightActions={[{ icon: 'add', onPress: openAdd, label: 'Add medicine' }]}
      />

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            <View>
              {loadError ? (
                <TouchableOpacity style={styles.errorBox} onPress={onRefresh} activeOpacity={0.85}>
                  <Ionicons name="cloud-offline-outline" size={18} color={COLORS.error} />
                  <Text style={styles.errorText}>{loadError}</Text>
                  <Text style={styles.errorRetry}>Retry</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.statRow}>
                <StatTile tone="green" icon="cube" value={medicines.length} label="In catalogue" />
                <StatTile tone="amber" icon="trending-down" value={lowStock} label="Low stock" />
                <StatTile tone="slate" icon="close-circle" value={outOfStock} label="Out of stock" />
              </View>

              <View style={styles.searchWrap}>
                <SearchInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search your medicines"
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={searchQuery ? 'search-outline' : 'medkit-outline'}
              title={searchQuery ? 'Nothing matched that' : 'Your catalogue is empty'}
              subtitle={
                searchQuery
                  ? `No medicine matches "${searchQuery.trim()}".`
                  : 'Add the medicines you stock so customers can order them from you.'
              }
              actionLabel={searchQuery ? undefined : 'Add your first medicine'}
              onAction={searchQuery ? undefined : openAdd}
            />
          }
          renderItem={({ item }) => {
            const stock = typeof item.stockQuantity === 'number' ? item.stockQuantity : null;
            const stockTone = stock === 0 ? 'slate' : stock !== null && stock <= 5 ? 'amber' : 'green';
            const t = toneColors(stockTone, isDark);

            return (
              <Panel style={styles.card} padding={SPACING.md}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardChip, { backgroundColor: t.chip }]}>
                    <Ionicons name="medkit" size={17} color={t.ink} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                      {item.strength ? ` ${item.strength}` : ''}
                    </Text>
                    <Text style={styles.generic} numberOfLines={1}>
                      {item.genericName ? `${item.genericName} · ` : ''}
                      {categoryLabel(item.category)}
                    </Text>
                  </View>
                  <Text style={styles.price}>{UGX(item.price)}</Text>
                </View>

                <View style={styles.cardMeta}>
                  <TonePill
                    label={
                      stock === null
                        ? 'Stock not tracked'
                        : stock === 0
                          ? 'Out of stock'
                          : `${stock} in stock`
                    }
                    tone={stockTone}
                  />
                  {item.requiresPrescription ? (
                    <TonePill label="PRESCRIPTION" tone="violet" icon="document-text" />
                  ) : null}
                  {!item.isAvailable ? <TonePill label="HIDDEN" tone="slate" icon="eye-off" /> : null}
                </View>

                <View style={styles.cardActions}>
                  <View style={styles.availability}>
                    <Text style={styles.availabilityLabel}>
                      {item.isAvailable ? 'Customers can order this' : 'Hidden from customers'}
                    </Text>
                    <Switch
                      value={!!item.isAvailable}
                      onValueChange={() => toggleAvailability(item)}
                      trackColor={{ false: COLORS.outlineVariant, true: COLORS.primary }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel={`Toggle availability for ${item.name}`}
                    />
                  </View>
                  <View style={styles.cardButtons}>
                    <TouchableOpacity
                      style={styles.cardButton}
                      onPress={() => openEdit(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.name}`}
                    >
                      <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.cardButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cardButton}
                      onPress={() => setConfirmDelete(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name}`}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                      <Text style={[styles.cardButtonText, { color: COLORS.error }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Panel>
            );
          }}
        />
      )}

      {!isLoading && medicines.length > 0 ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={openAdd}
          accessibilityRole="button"
          accessibilityLabel="Add a medicine"
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      <SmartBottomSheet
        visible={sheet !== null}
        onDismiss={() => {
          setSheet(null);
          setEditing(null);
        }}
        title={sheet === 'edit' ? 'Edit medicine' : 'Add a medicine'}
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Name" required>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              placeholder="Paracetamol"
              placeholderTextColor={COLORS.outline}
            />
          </Field>

          <View style={styles.fieldRow}>
            <Field label="Strength" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={form.strength}
                onChangeText={(strength) => setForm((f) => ({ ...f, strength }))}
                placeholder="500mg"
                placeholderTextColor={COLORS.outline}
              />
            </Field>
            <Field label="Pack size" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={form.packSize}
                onChangeText={(packSize) => setForm((f) => ({ ...f, packSize }))}
                placeholder="20 tablets"
                placeholderTextColor={COLORS.outline}
              />
            </Field>
          </View>

          <Field label="Generic name">
            <TextInput
              style={styles.input}
              value={form.genericName}
              onChangeText={(genericName) => setForm((f) => ({ ...f, genericName }))}
              placeholder="Acetaminophen"
              placeholderTextColor={COLORS.outline}
            />
          </Field>

          <Field label="Category">
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const active = form.category === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, category: c.value }))}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <View style={styles.fieldRow}>
            <Field label="Price (UGX)" required style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={form.price}
                onChangeText={(price) => setForm((f) => ({ ...f, price }))}
                placeholder="3500"
                keyboardType="numeric"
                placeholderTextColor={COLORS.outline}
              />
            </Field>
            <Field label="Units in stock" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={form.stockQuantity}
                onChangeText={(stockQuantity) => setForm((f) => ({ ...f, stockQuantity }))}
                placeholder="40"
                keyboardType="numeric"
                placeholderTextColor={COLORS.outline}
              />
            </Field>
          </View>

          <Field label="Notes for customers">
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.description}
              onChangeText={(description) => setForm((f) => ({ ...f, description }))}
              placeholder="How it is taken, what it treats"
              multiline
              placeholderTextColor={COLORS.outline}
            />
          </Field>

          <TouchableOpacity
            style={styles.rxToggle}
            onPress={() => setForm((f) => ({ ...f, requiresPrescription: !f.requiresPrescription }))}
            activeOpacity={0.8}
            accessibilityRole="switch"
            accessibilityState={{ checked: form.requiresPrescription }}
          >
            <View style={styles.rxToggleText}>
              <Text style={styles.rxToggleTitle}>Requires a prescription</Text>
              <Text style={styles.rxToggleSub}>
                Customers must upload a prescription before they can order it.
              </Text>
            </View>
            <Switch
              value={form.requiresPrescription}
              onValueChange={(requiresPrescription) =>
                setForm((f) => ({ ...f, requiresPrescription }))
              }
              trackColor={{ false: COLORS.outlineVariant, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submit, isSubmitting && { opacity: 0.6 }]}
            onPress={submit}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={sheet === 'edit' ? 'Save changes' : 'Add medicine'}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {sheet === 'edit' ? 'Save changes' : 'Add to catalogue'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SmartBottomSheet>

      <ConfirmDialog
        visible={confirmDelete !== null}
        title={`Remove ${confirmDelete?.name ?? 'this medicine'}?`}
        message="It will no longer be in your catalogue. If it is on an active order, mark it unavailable instead."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </View>
  );
}

function Field({
  label,
  required,
  children,
  style,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  style?: object;
}) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  return (
    <View style={[{ marginBottom: SPACING.gutter }, style]}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.onSurfaceVariant, marginBottom: 6 }}>
        {label}
        {required ? <Text style={{ color: COLORS.error }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    list: { flex: 1 },
    listContent: { padding: SPACING.md, paddingBottom: 96, gap: SPACING.gutter },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.error,
      marginBottom: SPACING.md,
    },
    errorText: { flex: 1, fontSize: 12.5, color: COLORS.onSurface, lineHeight: 17 },
    errorRetry: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

    statRow: { flexDirection: 'row', gap: SPACING.sm },
    searchWrap: { marginTop: SPACING.md, marginBottom: SPACING.xs },

    card: {},
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardChip: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    cardText: { flex: 1, minWidth: 0 },
    name: { fontSize: 15, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.2 },
    generic: { fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 1 },
    price: { fontSize: 16, fontWeight: '800', color: COLORS.onSurface },

    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.gutter },

    cardActions: {
      marginTop: SPACING.gutter,
      paddingTop: SPACING.gutter,
      borderTopWidth: 1,
      borderTopColor: COLORS.outlineVariant,
      gap: SPACING.sm,
    },
    availability: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
    availabilityLabel: { flex: 1, fontSize: 12.5, color: COLORS.onSurfaceVariant },
    cardButtons: { flexDirection: 'row', gap: SPACING.sm },
    cardButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
    },
    cardButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

    fab: {
      position: 'absolute',
      right: SPACING.md,
      bottom: SPACING.lg,
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },

    sheetScroll: { maxHeight: '100%' },
    sheetContent: { paddingBottom: SPACING.xl },
    fieldRow: { flexDirection: 'row', gap: SPACING.sm },
    input: {
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 14.5,
      color: COLORS.onSurface,
      backgroundColor: COLORS.backgroundSurface,
    },
    textarea: { minHeight: 74, textAlignVertical: 'top' },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.onSurfaceVariant },
    chipTextActive: { color: '#FFFFFF' },

    rxToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: 13,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.outlineVariant,
      marginBottom: SPACING.md,
    },
    rxToggleText: { flex: 1, minWidth: 0 },
    rxToggleTitle: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
    rxToggleSub: { fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2, lineHeight: 16 },

    submit: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 999,
      backgroundColor: COLORS.primary,
    },
    submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  });

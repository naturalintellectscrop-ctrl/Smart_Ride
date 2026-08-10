// ============================================
// SMART RIDE MOBILE - PHARMACIST ORDER DETAIL
// ============================================
// Detailed view of a health order with actions
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/src/services';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import {
  AppHeader,
  Card,
  DetailSkeleton,
  GradientButton,
} from '@/src/components';
import { firstName } from '@/src/utils/formatName';

// Status colours resolve through the shared semantic mapping rather than a
// local hex table — this was one of several near-identical copies.

const STATUS_TIMELINE: Record<string, number> = {
  ORDER_CREATED: 1,
  PENDING: 1,
  PAYMENT_CONFIRMED: 2,
  PROCESSING: 3,
  PREPARING: 3,
  READY_FOR_PICKUP: 4,
  PICKED_UP: 5,
  DELIVERED: 6,
  COMPLETED: 6,
  CANCELLED: 0,
};


export default function OrderDetailScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.getHealthOrder(id);
      if (response.success && response.data) {
        setOrder(response.data.order || response.data);
      }
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await api.updateHealthOrderStatus(id, newStatus);
      if (response.success) {
        Alert.alert('Success', `Order status updated to ${newStatus}`);
        await loadOrder();
      } else {
        Alert.alert('Error', response.error || 'Failed to update order');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <DetailSkeleton />
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = STATUS_TIMELINE[order.status] || 0;
  const items = order.items || order.medicines || [];
  const timelineSteps = [
    { label: 'Order Placed', step: 1 },
    { label: 'Payment Confirmed', step: 2 },
    { label: 'Processing', step: 3 },
    { label: 'Ready for Pickup', step: 4 },
    { label: 'Picked Up', step: 5 },
    { label: 'Delivered', step: 6 },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader title="Order" onBack={() => router.back()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Patient Info */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Patient Information</Text>
          {/* First name only — patient phone/full identity stays admin-only */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{firstName(order.patientName || order.customerName || order.client?.name, 'Patient')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
          {order.prescriptionId && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prescription</Text>
              <Text style={[styles.infoValue, { color: COLORS.primary }]}>#{order.prescriptionId?.slice(-6)}</Text>
            </View>
          )}
        </Card>

        {/* Medicine Items */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Medicines</Text>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((item: any, index: number) => (
              <View key={item.id || index} style={styles.medicineItem}>
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{item.name || item.medicineName || 'Medicine'}</Text>
                  <Text style={styles.medicineQty}>Qty: {item.quantity || 1}</Text>
                </View>
                <Text style={styles.medicinePrice}>{formatCurrency(item.totalPrice || item.price || 0)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noItemsText}>No medicine items</Text>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.totalAmount || order.amount || 0)}</Text>
          </View>
        </Card>

        {/* Status Timeline */}
        {order.status !== 'CANCELLED' && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Order Progress</Text>
            {timelineSteps.map((step, index) => (
              <View key={step.step} style={styles.timelineItem}>
                <View style={styles.timelineIndicator}>
                  <View style={[
                    styles.timelineDot,
                    currentStep >= step.step && styles.timelineDotActive,
                  ]} />
                  {index < timelineSteps.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      currentStep > step.step && styles.timelineLineActive,
                    ]} />
                  )}
                </View>
                <Text style={[
                  styles.timelineLabel,
                  currentStep >= step.step && styles.timelineLabelActive,
                ]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Delivery Info */}
        {order.deliveryAddress && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Delivery</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment</Text>
              <Text style={styles.infoValue}>{order.paymentMethod || 'N/A'}</Text>
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {order.status === 'PENDING' || order.status === 'ORDER_CREATED' ? (
            <GradientButton
              title="Start Processing"
              onPress={() => updateStatus('PROCESSING')}
              loading={isUpdating}
            />
          ) : order.status === 'PROCESSING' || order.status === 'PREPARING' ? (
            <GradientButton
              title="Mark Ready for Pickup"
              onPress={() => updateStatus('READY_FOR_PICKUP')}
              loading={isUpdating}
            />
          ) : order.status === 'READY_FOR_PICKUP' ? (
            <GradientButton
              title="Complete Order"
              onPress={() => updateStatus('COMPLETED')}
              loading={isUpdating}
            />
          ) : null}

          {(order.status === 'PENDING' || order.status === 'ORDER_CREATED' || order.status === 'PROCESSING') && (
            <GradientButton
              title="Cancel Order"
              variant="danger"
              onPress={() => {
                Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', style: 'destructive', onPress: () => updateStatus('CANCELLED') },
                ]);
              }}
              loading={isUpdating}
              style={{ marginTop: 8 }}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  emptyText: {
    color: COLORS.outline,
    fontSize: 16,
    marginBottom: 12,
  },
  backLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSurface,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.outline,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    flex: 2,
    textAlign: 'right',
  },
  medicineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 14,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  medicineQty: {
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 2,
  },
  medicinePrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  noItemsText: {
    fontSize: 13,
    color: COLORS.outline,
    fontStyle: 'italic',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: 40,
  },
  timelineIndicator: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
  },
  timelineDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.outlineVariant,
  },
  timelineLineActive: {
    backgroundColor: COLORS.primary,
  },
  timelineLabel: {
    fontSize: 13,
    color: COLORS.outline,
    marginTop: 0,
  },
  timelineLabelActive: {
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
});

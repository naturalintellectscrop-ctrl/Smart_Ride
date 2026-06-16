// ============================================
// SMART RIDE MOBILE - MERCHANT ORDER DETAIL
// ============================================
// Full order detail with status timeline & actions
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMerchantStore } from '@/src/store';
import { api } from '@/src/services';
import { COLORS, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/src/constants';
import { MerchantOrder, OrderItem } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

const STATUS_FLOW = [
  'ORDER_CREATED',
  'PAYMENT_CONFIRMED',
  'MERCHANT_ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERED',
];

export default function MerchantOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const orderId = params.id as string;
  const merchantId = params.merchantId as string;

  const { updateOrderStatus, isUpdatingOrder } = useMerchantStore();

  const [order, setOrder] = useState<MerchantOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getMerchantOrder(orderId);
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        setError(response.error || 'Failed to load order');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingAction(newStatus);
    await updateOrderStatus(orderId, newStatus);
    setUpdatingAction(null);
    // Reload order to get updated data
    await loadOrder();
  };

  const handleRejectOrder = () => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => handleUpdateStatus('CANCELLED'),
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => `UGX ${(amount || 0).toLocaleString()}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIndex = (status: string) => {
    const idx = STATUS_FLOW.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const getAvailableActions = (status: string) => {
    switch (status) {
      case 'ORDER_CREATED':
      case 'PAYMENT_CONFIRMED':
        return [
          { label: 'Accept Order', status: 'MERCHANT_ACCEPTED', variant: 'primary' as const },
          { label: 'Reject Order', status: 'CANCELLED', variant: 'danger' as const },
        ];
      case 'MERCHANT_ACCEPTED':
        return [
          { label: 'Start Preparing', status: 'PREPARING', variant: 'primary' as const },
        ];
      case 'PREPARING':
        return [
          { label: 'Mark as Ready', status: 'READY_FOR_PICKUP', variant: 'primary' as const },
        ];
      case 'READY_FOR_PICKUP':
        return [];
      case 'CANCELLED':
        return [];
      case 'DELIVERED':
        return [];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorText}>{error || 'Could not load order details'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrder}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const actions = getAvailableActions(order.status);
  const statusColor = ORDER_STATUS_COLORS[order.status] || COLORS.outline;
  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 || 56 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Order #{order.orderNumber || order.id.slice(-6)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}30` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </Text>
              </View>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="calendar-outline" label="Date" value={formatDate(order.createdAt)} />
            <InfoRow icon="person-outline" label="Customer" value={(order as any).customerName ?? 'Customer'} />
            {(order as any).customerPhone && (
              <InfoRow icon="call-outline" label="Phone" value={(order as any).customerPhone ?? 'N/A'} />
            )}
            <InfoRow icon="location-outline" label="Delivery" value={order.deliveryAddress || 'N/A'} />
            <InfoRow icon="card-outline" label="Payment" value={order.paymentMethod || 'N/A'} />
            <InfoRow icon="wallet-outline" label="Payment Status" value={order.paymentStatus || 'N/A'} />
          </View>
        </View>

        {/* Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          <View style={styles.timelineCard}>
            {STATUS_FLOW.map((status, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = status === order.status;
              const color = isCompleted ? ORDER_STATUS_COLORS[status] || COLORS.outline : COLORS.outlineVariant;

              return (
                <View key={status} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: isCompleted ? color : 'transparent', borderColor: color }]}>
                      {isCurrent && <View style={styles.timelineDotInner} />}
                    </View>
                    {index < STATUS_FLOW.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: index < currentStatusIndex ? COLORS.primary : COLORS.outlineVariant }]} />
                    )}
                  </View>
                  <Text style={[styles.timelineLabel, { color: isCompleted ? COLORS.onSurface : COLORS.outlineVariant }]}>
                    {ORDER_STATUS_LABELS[status] || status}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
          <View style={styles.itemsCard}>
            {order.items?.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>{formatCurrency(item.totalPrice)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
            <SummaryRow label="Delivery Fee" value={formatCurrency(order.deliveryFee)} />
            <View style={styles.summaryDivider} />
            <SummaryRow label="Total" value={formatCurrency(order.totalAmount)} isBold />
          </View>
        </View>

        {/* KOT Reference */}
        {(order as any).kotReference && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kitchen Reference</Text>
            <View style={styles.kotCard}>
              <Ionicons name="print-outline" size={18} color={COLORS.primary} />
              <Text style={styles.kotText}>KOT: {(order as any).kotReference ?? 'N/A'}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {(order as any).notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{(order as any).notes ?? ''}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      {actions.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 || 24 }]}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.status}
              style={[
                styles.bottomButton,
                action.variant === 'primary' && styles.bottomPrimary,
                action.variant === 'danger' && styles.bottomDanger,
                (isUpdatingOrder || updatingAction) && styles.bottomDisabled,
              ]}
              onPress={action.variant === 'danger' ? handleRejectOrder : () => handleUpdateStatus(action.status)}
              disabled={isUpdatingOrder || !!updatingAction}
            >
              {(updatingAction === action.status) ? (
                <ActivityIndicator size="small" color={action.variant === 'primary' ? COLORS.onPrimary : COLORS.onSurface} />
              ) : (
                <Text style={[
                  styles.bottomButtonText,
                  action.variant === 'primary' && styles.bottomPrimaryText,
                  action.variant === 'danger' && styles.bottomDangerText,
                ]}>
                  {action.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={16} color={COLORS.onSurfaceVariant} />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value, isBold }: { label: string; value: string; isBold?: boolean }) {
  return (
    <View style={summaryStyles.row}>
      <Text style={[summaryStyles.label, isBold && summaryStyles.boldLabel]}>{label}</Text>
      <Text style={[summaryStyles.value, isBold && summaryStyles.boldValue, isBold && { color: COLORS.primary }]}>{value}</Text>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.outline,
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    color: COLORS.error,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    color: COLORS.outline,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.onSurface,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 36,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: 12,
  },
  timelineCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 40,
  },
  timelineLeft: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surface,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  itemsCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemName: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  itemQty: {
    color: COLORS.outline,
    fontSize: 14,
  },
  itemPrice: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    gap: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    marginVertical: 4,
  },
  kotCard: {
    backgroundColor: 'rgba(0, 95, 58, 0.05)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 95, 58, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kotIcon: {
    fontSize: 22,
  },
  kotText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  notesText: {
    color: COLORS.onSurfaceSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    flexDirection: 'row',
    gap: 10,
  },
  bottomButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPrimary: {
    backgroundColor: COLORS.primary,
  },
  bottomDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bottomDisabled: {
    opacity: 0.5,
  },
  bottomButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  bottomPrimaryText: {
    color: COLORS.onPrimary,
  },
  bottomDangerText: {
    color: '#EF4444',
  },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 16,
    width: 24,
  },
  label: {
    color: COLORS.outline,
    fontSize: 13,
    width: 80,
  },
  value: {
    color: COLORS.onSurface,
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
});

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: COLORS.outline,
    fontSize: 14,
  },
  value: {
    color: COLORS.onSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  boldLabel: {
    color: COLORS.onSurface,
    fontWeight: 'bold',
    fontSize: 16,
  },
  boldValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

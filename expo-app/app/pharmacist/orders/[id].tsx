// ============================================
// SMART RIDE MOBILE - PHARMACIST ORDER DETAIL
// ============================================
// One order, everything about it, and the single action the server will accept
// from where it currently is.
//
// The payment panel is not decoration. A pharmacy handing medicine to a courier
// needs to know whether the customer has already paid or whether the courier is
// collecting cash at the door, and that is not derivable from the order's
// status — it comes from the order's own paymentMethod and paymentStatus, which
// this screen previously showed as a bare enum in the delivery card, if at all.
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Alert } from '@/src/components/feedback';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/src/services';
import { SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';
import { AppHeader, DetailSkeleton, ConfirmDialog } from '@/src/components';
import {
  Panel,
  SectionTitle,
  TonePill,
  toneColors,
  statusMeta,
  paymentMeta,
  actionsFor,
  parseItems,
  ORDER_RAIL,
} from '@/src/components/pharmacy';
import { Ionicons } from '@expo/vector-icons';
import { firstName } from '@/src/utils/formatName';

const UGX = (n: unknown) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function OrderDetailScreen() {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'REJECT' | 'CANCEL'>(null);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.getHealthOrder(id);
      if (response.success && response.data) {
        setOrder((response.data as any).order || response.data);
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

  /**
   * Every action goes through here so one place handles the answer.
   *
   * The server refuses an illegal move with 409 and says why (PHARM-2). That
   * sentence is written for a person, so it is shown rather than replaced with
   * a generic failure — and the order is reloaded either way, because a 409
   * usually means somebody else already moved it.
   */
  const act = useCallback(
    async (action: string, opts?: { rejectionReason?: string }) => {
      if (!id) return;
      setBusy(action);
      try {
        const res = await api.providerOrderAction(id, action, opts);
        if (res.success) {
          const task = (res.data as any)?.deliveryTask;
          if (action === 'REDISPATCH') {
            const searching = (res.data as any)?.searching;
            Alert.alert(
              searching ? 'Looking for a courier' : 'No courier available',
              (res.data as any)?.message ??
                (searching
                  ? 'We are asking nearby couriers now.'
                  : 'Nobody is available right now. Try again shortly.')
            );
          } else if (action === 'READY') {
            Alert.alert(
              'Ready for pickup',
              task?.taskNumber
                ? `We are finding a courier now. Delivery ${task.taskNumber}.`
                : 'We are looking for a courier to collect this order.'
            );
          }
        } else {
          Alert.alert('Could not update this order', res.error || 'Please try again.');
        }
      } catch {
        Alert.alert('Could not update this order', 'Please check your connection and try again.');
      } finally {
        setBusy(null);
        await loadOrder();
      }
    },
    [id, loadOrder]
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) return <DetailSkeleton />;

  if (!order) {
    return (
      <View style={styles.container}>
        <AppHeader title="Order" onBack={() => router.back()} />
        <View style={styles.missing}>
          <Ionicons name="help-circle-outline" size={44} color={COLORS.outline} />
          <Text style={styles.missingTitle}>We could not find this order</Text>
          <Text style={styles.missingText}>
            It may have been removed, or it belongs to a different pharmacy.
          </Text>
          <TouchableOpacity style={styles.missingButton} onPress={() => router.back()}>
            <Text style={styles.missingButtonText}>Back to orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const meta = statusMeta(order.status);
  const pay = paymentMeta(order.paymentMethod, order.paymentStatus);
  const acts = actionsFor(order.status, !!order.riderId);
  const items = parseItems(order.items);
  const tone = toneColors(meta.tone, isDark);
  const isRx = order.orderType === 'PRESCRIPTION_MEDICINE';
  const rxBlocking = isRx && !order.prescriptionVerified;

  return (
    <View style={styles.container}>
      <AppHeader
        title={order.orderNumber || 'Order'}
        subtitle={meta.label}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Where this order is, and what that means */}
        <View style={[styles.stateCard, { backgroundColor: tone.fill, borderColor: tone.border }]}>
          <View style={styles.stateTop}>
            <View style={[styles.stateChip, { backgroundColor: tone.chip }]}>
              <Ionicons name="pulse" size={17} color={tone.ink} />
            </View>
            <View style={styles.stateText}>
              <Text style={[styles.stateLabel, { color: tone.ink }]}>{meta.label}</Text>
              <Text style={[styles.stateHint, { color: tone.ink }]}>{meta.hint}</Text>
            </View>
          </View>

          {meta.step > 0 ? (
            <View style={styles.rail}>
              {ORDER_RAIL.map((s, i) => {
                const done = meta.step >= s.step;
                return (
                  <View key={s.step} style={styles.railStep}>
                    <View style={styles.railRow}>
                      <View
                        style={[
                          styles.railDot,
                          { borderColor: tone.ink },
                          done && { backgroundColor: tone.ink },
                        ]}
                      />
                      {i < ORDER_RAIL.length - 1 ? (
                        <View
                          style={[
                            styles.railLine,
                            { backgroundColor: meta.step > s.step ? tone.ink : tone.chip },
                          ]}
                        />
                      ) : null}
                    </View>
                    <Text
                      style={[styles.railLabel, { color: tone.ink, opacity: done ? 1 : 0.45 }]}
                      numberOfLines={2}
                    >
                      {s.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Money — the thing a pharmacy could not see */}
        <SectionTitle title="Payment" />
        <Panel padding={SPACING.md}>
          <View style={styles.payHeader}>
            <View style={styles.payTotals}>
              <Text style={styles.payTotalLabel}>Customer pays</Text>
              <Text style={styles.payTotal}>{UGX(order.totalAmount)}</Text>
            </View>
            <TonePill label={pay.statusLabel} tone={pay.tone} icon="card" />
          </View>

          <Text style={styles.payNote}>{pay.note}</Text>

          <View style={styles.payDivider} />

          <PayLine label="Method" value={pay.method} />
          <PayLine
            label="Collected"
            value={
              pay.statusLabel === 'Paid'
                ? pay.collectedOnDelivery
                  ? 'Yes — by the courier at handover'
                  : 'Yes — paid up front'
                : pay.collectedOnDelivery
                  ? 'No — the courier collects it at the door'
                  : 'No — still outstanding'
            }
          />
          <PayLine label="Medicines" value={UGX(order.subtotal)} />
          <PayLine label="Delivery" value={UGX(order.deliveryFee)} />
          {Number(order.serviceFee || 0) > 0 ? (
            <PayLine label="Service fee" value={UGX(order.serviceFee)} />
          ) : null}
          <View style={styles.payDivider} />
          <PayLine label="Your earnings" value={UGX(order.providerEarnings)} strong />
        </Panel>

        {/* What is in it */}
        <SectionTitle title={`Medicines (${items.length})`} />
        <Panel padding={SPACING.md}>
          {items.length > 0 ? (
            items.map((item: any, index: number) => (
              <View key={index} style={[styles.item, index > 0 && styles.itemBorder]}>
                <View style={styles.itemText}>
                  <Text style={styles.itemName}>{item.name || 'Medicine'}</Text>
                  <Text style={styles.itemQty}>Quantity: {item.quantity || 1}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {UGX((item.price || 0) * (item.quantity || 1))}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyItems}>
              No medicines were itemised on this order. Contact the customer before dispensing.
            </Text>
          )}
        </Panel>

        {/* Prescription — a gate, not a note */}
        {isRx ? (
          <>
            <SectionTitle title="Prescription" />
            <Panel padding={SPACING.md}>
              <View style={styles.rxRow}>
                <Ionicons
                  name={order.prescriptionVerified ? 'shield-checkmark' : 'alert-circle'}
                  size={20}
                  color={order.prescriptionVerified ? COLORS.success : COLORS.warning}
                />
                <View style={styles.rxText}>
                  <Text style={styles.rxTitle}>
                    {order.prescriptionVerified ? 'Verified' : 'Not yet verified'}
                  </Text>
                  <Text style={styles.rxSub}>
                    {order.prescriptionVerified
                      ? `Checked ${formatDate(order.prescriptionVerifiedAt)}`
                      : 'A prescription must be checked before this medicine is dispensed.'}
                  </Text>
                </View>
              </View>
              {!order.prescriptionVerified ? (
                <TouchableOpacity
                  style={styles.rxButton}
                  onPress={() => act('VERIFY_PRESCRIPTION')}
                  disabled={busy !== null}
                  accessibilityRole="button"
                  accessibilityLabel="Mark this prescription as verified"
                >
                  {busy === 'VERIFY_PRESCRIPTION' ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.rxButtonText}>Mark prescription verified</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </Panel>
          </>
        ) : null}

        {/* Where it goes */}
        <SectionTitle title="Delivery" />
        <Panel padding={SPACING.md}>
          <PayLine
            label="Customer"
            value={firstName(order.customerName, 'Customer')}
          />
          <PayLine label="Address" value={order.deliveryAddress || '—'} />
          {order.deliveryInstructions ? (
            <PayLine label="Instructions" value={order.deliveryInstructions} />
          ) : null}
          <PayLine label="Placed" value={formatDate(order.createdAt)} />
          {order.readyAt ? <PayLine label="Marked ready" value={formatDate(order.readyAt)} /> : null}
          {order.pickedUpAt ? (
            <PayLine label="Collected by courier" value={formatDate(order.pickedUpAt)} />
          ) : null}
          {order.deliveredAt ? (
            <PayLine label="Delivered" value={formatDate(order.deliveredAt)} />
          ) : null}
          {order.riderId ? (
            <View style={styles.courierRow}>
              <Ionicons name="bicycle" size={16} color={COLORS.primary} />
              <Text style={styles.courierText}>A courier has been assigned to this order.</Text>
            </View>
          ) : order.status === 'READY_FOR_PICKUP' ? (
            <View style={styles.courierRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.courierText}>Finding a courier to collect this order…</Text>
            </View>
          ) : null}
        </Panel>

        {order.cancellationReason ? (
          <Panel padding={SPACING.md} style={{ marginTop: SPACING.md }}>
            <Text style={styles.cancelTitle}>Reason</Text>
            <Text style={styles.cancelText}>{order.cancellationReason}</Text>
          </Panel>
        ) : null}
      </ScrollView>

      {/* The one action the server will accept from here */}
      {acts.primary || acts.canDecline || acts.canCancel || acts.canRedispatch ? (
        <View style={styles.actionBar}>
          {rxBlocking && acts.primary?.action === 'ACCEPT' ? (
            <Text style={styles.actionWarning}>
              Verify the prescription above before dispensing this order.
            </Text>
          ) : null}

          {acts.primary ? (
            <TouchableOpacity
              style={[styles.primaryButton, busy !== null && styles.buttonBusy]}
              onPress={() => act(acts.primary!.action)}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel={acts.primary.label}
            >
              {busy === acts.primary.action ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name={acts.primary.icon as never} size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>{acts.primary.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {acts.canRedispatch ? (
            <TouchableOpacity
              style={[styles.primaryButton, busy !== null && styles.buttonBusy]}
              onPress={() => act('REDISPATCH')}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel="Look for a courier again"
            >
              {busy === 'REDISPATCH' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Find a courier</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {acts.canDecline ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setConfirm('REJECT')}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel="Decline this order"
            >
              <Text style={styles.secondaryButtonText}>Decline order</Text>
            </TouchableOpacity>
          ) : null}

          {acts.canCancel ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setConfirm('CANCEL')}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel="Cancel this order"
            >
              <Text style={styles.secondaryButtonText}>Cancel order</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirm !== null}
        title={confirm === 'REJECT' ? 'Decline this order?' : 'Cancel this order?'}
        message={
          confirm === 'REJECT'
            ? 'The customer will be told you cannot fill it. This cannot be undone.'
            : 'The customer will be told the order will not arrive. This cannot be undone.'
        }
        confirmLabel={confirm === 'REJECT' ? 'Decline' : 'Cancel order'}
        cancelLabel="Keep it"
        destructive
        onConfirm={() => {
          const action = confirm;
          setConfirm(null);
          if (action) {
            act(action, {
              rejectionReason:
                action === 'REJECT'
                  ? 'Declined by the pharmacy'
                  : 'Cancelled by the pharmacy',
            });
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

function PayLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: COLORS.onSurfaceVariant, flexShrink: 0 }}>{label}</Text>
      <Text
        style={{
          fontSize: strong ? 15 : 13,
          fontWeight: strong ? '800' : '600',
          color: COLORS.onSurface,
          flex: 1,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxxl },

    missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 8 },
    missingTitle: { fontSize: 17, fontWeight: '700', color: COLORS.onSurface, marginTop: 8 },
    missingText: { fontSize: 13, color: COLORS.onSurfaceVariant, textAlign: 'center', lineHeight: 19 },
    missingButton: {
      marginTop: SPACING.md,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 999,
      backgroundColor: COLORS.primary,
    },
    missingButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

    stateCard: { borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.md },
    stateTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    stateChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    stateText: { flex: 1, minWidth: 0 },
    stateLabel: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    stateHint: { fontSize: 12.5, marginTop: 2, lineHeight: 17, opacity: 0.85 },

    rail: { flexDirection: 'row', marginTop: SPACING.md },
    railStep: { flex: 1 },
    railRow: { flexDirection: 'row', alignItems: 'center' },
    railDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, backgroundColor: 'transparent' },
    railLine: { flex: 1, height: 2, marginLeft: 2 },
    railLabel: { fontSize: 9.5, fontWeight: '700', marginTop: 5, paddingRight: 4, lineHeight: 12 },

    payHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
    payTotals: { flexShrink: 1, minWidth: 0 },
    payTotalLabel: { fontSize: 12, color: COLORS.onSurfaceVariant },
    payTotal: { fontSize: 25, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.6 },
    payNote: { fontSize: 12.5, color: COLORS.onSurfaceVariant, marginTop: 10, lineHeight: 17 },
    payDivider: { height: 1, backgroundColor: COLORS.outlineVariant, marginVertical: SPACING.gutter },

    item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    itemBorder: { borderTopWidth: 1, borderTopColor: COLORS.outlineVariant },
    itemText: { flex: 1, minWidth: 0 },
    itemName: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
    itemQty: { fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 1 },
    itemPrice: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
    emptyItems: { fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 18 },

    rxRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    rxText: { flex: 1, minWidth: 0 },
    rxTitle: { fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
    rxSub: { fontSize: 12.5, color: COLORS.onSurfaceVariant, marginTop: 2, lineHeight: 17 },
    rxButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: SPACING.gutter,
      paddingVertical: 11,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.primary,
    },
    rxButtonText: { fontSize: 13.5, fontWeight: '700', color: COLORS.primary },

    courierRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: SPACING.gutter,
      paddingTop: SPACING.gutter,
      borderTopWidth: 1,
      borderTopColor: COLORS.outlineVariant,
    },
    courierText: { flex: 1, fontSize: 12.5, color: COLORS.onSurfaceVariant },

    cancelTitle: { fontSize: 12, color: COLORS.onSurfaceVariant },
    cancelText: { fontSize: 14, color: COLORS.onSurface, marginTop: 3, lineHeight: 19 },

    actionBar: {
      padding: SPACING.md,
      paddingBottom: SPACING.lg,
      gap: SPACING.sm,
      backgroundColor: COLORS.backgroundElevated,
      borderTopWidth: 1,
      borderTopColor: COLORS.outlineVariant,
    },
    actionWarning: { fontSize: 12, color: COLORS.warning, textAlign: 'center' },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 15,
      borderRadius: 999,
      backgroundColor: COLORS.primary,
    },
    buttonBusy: { opacity: 0.6 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    secondaryButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
    secondaryButtonText: { fontSize: 13.5, fontWeight: '700', color: COLORS.error },
  });

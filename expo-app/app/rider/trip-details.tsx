// ============================================
// SMART RIDE MOBILE - TRIP / DELIVERY DETAILS (historical)
// ============================================
// Opens from the History screen. Reuses GET /api/tasks/[id] — first-name
// redacted, no phone numbers (privacy is enforced server-side). Shows the
// route, distance/duration, fare breakdown, commission, net earnings, payment
// method and status. Read-only.
// ============================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services';
import { TYPOGRAPHY, SPACING, RADIUS } from '@/src/constants';
import { useTheme } from '@/src/context/theme-context';
import { makeThemedColors, ThemedColors } from '@/src/theme/themedColors';

const SERVICE_LABEL: Record<string, string> = {
  SMART_BODA_RIDE: 'Boda Ride',
  SMART_CAR_RIDE: 'Car Ride',
  FOOD_DELIVERY: 'Food Delivery',
  SHOPPING: 'Shopping',
  ITEM_DELIVERY: 'Item Delivery',
  SMART_HEALTH_DELIVERY: 'Pharmacy Delivery',
};
const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Cash', MTN_MOMO: 'MTN Mobile Money', AIRTEL_MONEY: 'Airtel Money',
  CARD: 'Card', VISA: 'Visa / Card', WALLET: 'Smart Ride Wallet', NYLON_PAY: 'Mobile Money',
};
const num = (v: unknown) => Number(v) || 0;
const money = (v: unknown) => `UGX ${Math.round(num(v)).toLocaleString()}`;
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export default function TripDetailsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const COLORS = useMemo(() => makeThemedColors(isDark), [isDark]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!taskId) { setError('Missing trip reference.'); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.getTask(taskId);
      if (res.success && res.data) setTask(res.data);
      else setError((res as any).error || 'Trip not found.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );

  const body = () => {
    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    if (error || !task) {
      return (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.onSurfaceVariant} />
          <Text style={styles.hint}>{error || 'Trip not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Ionicons name="refresh" size={16} color={COLORS.onPrimary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const fare = num(task.totalAmount);
    const commission = num(task.platformCommission);
    const net = task.riderEarnings != null ? num(task.riderEarnings) : Math.max(0, fare - commission);
    const duration = task.actualDuration ?? task.estimatedDuration;
    const breakdown = ([
      ['Base Fare', task.baseFare],
      ['Distance Charge', task.distanceFare],
      ['Time Charge', task.timeFare],
      ['Delivery Fee', task.deliveryFee],
      ['Waiting Charge', task.waitingCharge],
      ['Service Fee', task.serviceFee],
    ] as Array<[string, unknown]>).filter(([, v]) => num(v) > 0);

    return (
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.service}>{SERVICE_LABEL[task.taskType] || task.taskType}</Text>
            <Text style={styles.taskNumber}>{task.taskNumber}</Text>
          </View>
          <Text style={styles.date}>{fmtDateTime(task.completedAt || task.createdAt)}</Text>
          <View style={[styles.statusPill, { backgroundColor: `${COLORS.primary}18`, alignSelf: 'flex-start', marginTop: SPACING.sm }]}>
            <Text style={[styles.statusText, { color: COLORS.primary }]}>{String(task.status).replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.routeRow}>
            <View style={styles.dots}>
              <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
              <View style={styles.dotLine} />
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>PICKUP</Text>
              <Text style={styles.addr}>{task.pickupAddress || '—'}</Text>
              <Text style={[styles.miniLabel, { marginTop: 10 }]}>DROPOFF</Text>
              <Text style={styles.addr}>{task.dropoffAddress || '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {task.distanceKm ? <Row label="Distance" value={`${Number(task.distanceKm).toFixed(1)} km`} /> : null}
          {duration ? <Row label="Duration" value={`${duration} min`} /> : null}
        </View>

        {/* Fare / earnings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fare & Earnings</Text>
          {breakdown.map(([label, v]) => <Row key={label} label={label} value={money(v)} />)}
          <View style={styles.divider} />
          <Row label="Total Fare" value={money(fare)} strong />
          {commission > 0 ? <Row label="Platform Commission" value={`- ${money(commission)}`} /> : null}
          <Row label="Your Net Earnings" value={money(net)} strong />
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <Row label="Method" value={PAYMENT_LABEL[task.paymentMethod] || task.paymentMethod || '—'} />
          <Row label="Status" value={String(task.paymentStatus || '—').replace(/_/g, ' ')} />
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.appbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appbarTitle}>Trip Details</Text>
        <View style={{ width: 24 }} />
      </View>
      {body()}
    </View>
  );
}

const createStyles = (COLORS: ThemedColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  appbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  appbarTitle: { ...TYPOGRAPHY.headlineMd, color: COLORS.onSurface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.sm },
  hint: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurfaceVariant, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.lg, marginTop: SPACING.sm },
  retryText: { ...TYPOGRAPHY.bodyMd, color: COLORS.onPrimary, fontWeight: '600' },
  card: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.outlineVariant },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  service: { ...TYPOGRAPHY.headlineMd, color: COLORS.onSurface, fontWeight: '700' },
  taskNumber: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant },
  date: { ...TYPOGRAPHY.bodySm, color: COLORS.onSurfaceVariant, marginTop: 2 },
  statusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { ...TYPOGRAPHY.labelMd, fontWeight: '700' },
  sectionTitle: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  routeRow: { flexDirection: 'row', gap: SPACING.sm },
  dots: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: COLORS.outlineVariant, marginVertical: 2 },
  miniLabel: { ...TYPOGRAPHY.labelMd, color: COLORS.onSurfaceVariant },
  addr: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.outlineVariant, marginVertical: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurfaceVariant },
  rowValue: { ...TYPOGRAPHY.bodyMd, color: COLORS.onSurface },
  rowValueStrong: { fontWeight: '700' },
});
